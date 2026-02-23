#!/usr/bin/env node
import "source-map-support/register";
import * as cdk from "aws-cdk-lib";
import { YogaGoStack } from "../lib/yoga-go-stack";
import { SesStack } from "../lib/ses-stack";
import { CalelStack } from "../lib/calel-stack";
import { CallyStack } from "../lib/cally-stack";
import { CognitoCertStack } from "../lib/cognito-cert-stack";
import { CallyCertStack } from "../lib/cally-cert-stack";

const app = new cdk.App();

const account = process.env.CDK_DEFAULT_ACCOUNT;

// ========================================
// Domain Configuration
// ========================================
// Environments:
//   Dev  (myg):      login.myyoga.guru, login.callygo.com
//   Prod (myg-prod): secure.myyoga.guru, secure.callygo.com
//
// Override subdomain with: -c cognitoSubdomain=login
const appDomain = app.node.tryGetContext("domain") || "myyoga.guru";
const cognitoSubdomain =
  app.node.tryGetContext("cognitoSubdomain") || "secure";
const cognitoDomain = `${cognitoSubdomain}.${appDomain}`;

// Cally domain configuration
const callyDomain = app.node.tryGetContext("callyDomain") || "callygo.com";
const callySubdomain =
  app.node.tryGetContext("callySubdomain") || "secure";
const callyCognitoDomain = `${callySubdomain}.${callyDomain}`;

const envSydney = {
  account,
  region: "ap-southeast-2",
};

const envOregon = {
  account,
  region: "us-west-2",
};

const envVirginia = {
  account,
  region: "us-east-1",
};

// ========================================
// Yoga-Go Application Stack (Vercel-optimized)
// ========================================
// Contains: Cognito, DynamoDB, SES, Lambda
//
// Note: Since we use Vercel for hosting, we no longer need:
// - ECR, ECS Service, Task Definition, ALB Target Group/Rules
// - Route53 Hosted Zone (DNS is managed by Vercel)
//
// SES has been moved to SesStack in us-west-2 for email receiving support
new YogaGoStack(app, "YogaGoStack", {
  description: "Yoga Go - Cognito, DynamoDB (hosted on Vercel)",
  env: envSydney,
  tags: {
    Application: "YogaGo",
    Environment: "production",
    ManagedBy: "CDK",
  },
});

// ========================================
// SES Stack (us-west-2 for email receiving)
// ========================================
// Contains: SES Email Identity, Config Set, Templates, Receipt Rules, Lambda
//
// Note: SES email receiving is only available in us-east-1, us-west-2, eu-west-1
// We use us-west-2 for both sending and receiving emails
// DNS (DKIM, MX records) is managed in Vercel DNS
new SesStack(app, "YogaGoSesStack", {
  description: "Yoga Go SES - Email sending and receiving (us-west-2)",
  env: envOregon,
  crossRegionReferences: true,
  tags: {
    Application: "YogaGo",
    Environment: "production",
    ManagedBy: "CDK",
  },
  coreTableArn: `arn:aws:dynamodb:ap-southeast-2:${account}:table/yoga-go-core`,
  coreTableName: "yoga-go-core",
  emailsTableArn: `arn:aws:dynamodb:ap-southeast-2:${account}:table/yoga-go-emails`,
  emailsTableName: "yoga-go-emails",
  callyDomain,
});

// ========================================
// Calel Stack (Standalone Scheduling Service)
// ========================================
// Contains: DynamoDB (calel-core), SQS Queues, IAM User
//
// This is a standalone service that can be used by yoga-go
// and other future apps for calendar/scheduling functionality.
new CalelStack(app, "CalelStack", {
  description: "Calel - Calendar & Scheduling Service",
  env: envSydney,
  tags: {
    Application: "Calel",
    Environment: "production",
    ManagedBy: "CDK",
  },
});

// ========================================
// Cally Stack (Landing Pages, Calendar, Sessions)
// ========================================
// Contains: Cognito User Pool (with Google OAuth), DynamoDB (cally-main), IAM User
//
// Prerequisites:
// 1. Create Google OAuth credentials in Google Cloud Console
// 2. Store in AWS Secrets Manager as "cally/production":
//    { "GOOGLE_CLIENT_ID": "<id>", "GOOGLE_CLIENT_SECRET": "<secret>" }
//
// Deployment:
// 1. Get the stream ARN: aws dynamodb describe-table --table-name yoga-go-emails --query 'Table.LatestStreamArn' --output text --profile myg-prod
// 2. Deploy: npx cdk deploy CallyStack -c emailsStreamArn=<ARN> --profile myg-prod
new CallyStack(app, "CallyStack", {
  description: "Cally - Landing pages, calendar, live sessions",
  env: envSydney,
  tags: {
    Application: "Cally",
    Environment: "production",
    ManagedBy: "CDK",
  },
  callyDomain,
  callyCognitoDomain,
});

// ========================================
// Cognito Certificate Stack (us-east-1)
// ========================================
// Creates ACM certificate for Cognito custom domain
// Must be in us-east-1 as required by Cognito custom domains.
//
// Deployment steps:
// 1. Deploy this stack: cdk deploy CognitoCertStack -c domain=<domain>
// 2. Add DNS validation CNAME to Vercel (check ACM console)
// 3. Wait for certificate to show "Issued"
// 4. Deploy YogaGoStack with: cdk deploy YogaGoStack -c cognitoCertificateArn=<ARN> -c domain=<domain>
// 5. Add CNAME for auth.<domain> -> CloudFront domain (from YogaGoStack output)
// 6. Update COGNITO_DOMAIN env var in Vercel to auth.<domain>
// ========================================
// Cally Certificate Stack (us-east-1)
// ========================================
// Creates ACM certificate for Cally Cognito custom domain
// Must be in us-east-1 as required by Cognito custom domains.
//
// Deployment steps:
// 1. Deploy this stack: cdk deploy CallyCertStack -c callySubdomain=login
// 2. Add DNS validation CNAME to Vercel (check ACM console)
// 3. Wait for certificate to show "Issued"
// 4. Deploy CallyStack with: cdk deploy CallyStack -c callyCertificateArn=<ARN> -c emailsStreamArn=<ARN>
// 5. Add CNAME for login.callygo.com -> CloudFront domain (from CallyStack output)
new CallyCertStack(app, "CallyCertStack", {
  description: `Cally Certificate for ${callyCognitoDomain} (us-east-1)`,
  env: envVirginia,
  crossRegionReferences: true,
  tags: {
    Application: "Cally",
    Environment: "production",
    ManagedBy: "CDK",
  },
  domainName: callyCognitoDomain,
});

new CognitoCertStack(app, "CognitoCertStack", {
  description: `Cognito Certificate for ${cognitoDomain} (us-east-1)`,
  env: envVirginia,
  crossRegionReferences: true,
  tags: {
    Application: "YogaGo",
    Environment: "production",
    ManagedBy: "CDK",
  },
  domainName: cognitoDomain,
});
