#!/usr/bin/env node
import "source-map-support/register";
import * as cdk from "aws-cdk-lib";
import { YogaGoStack } from "../lib/yoga-go-stack";
import { SesStack } from "../lib/ses-stack";
import { CalelStack } from "../lib/calel-stack";
import { CognitoCertStack } from "../lib/cognito-cert-stack";

const app = new cdk.App();

const account = process.env.CDK_DEFAULT_ACCOUNT;

// ========================================
// Domain Configuration
// ========================================
// Deploy with: npx cdk deploy -c domain=reelzai.com (for dev)
// Default: myyoga.guru (prod)
const appDomain = app.node.tryGetContext("domain") || "myyoga.guru";
const cognitoDomain = `signin.${appDomain}`;

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
// 5. Add CNAME for signin.<domain> -> CloudFront domain (from YogaGoStack output)
// 6. Update COGNITO_DOMAIN env var in Vercel to signin.<domain>
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
