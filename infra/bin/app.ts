#!/usr/bin/env node
import 'source-map-support/register';
import * as cdk from 'aws-cdk-lib';
import { SharedInfraStack } from '../lib/shared-infra-stack';
import { YogaGoStack } from '../lib/yoga-go-stack';
import { SesStack } from '../lib/ses-stack';

const app = new cdk.App();

const account = process.env.CDK_DEFAULT_ACCOUNT;

const envSydney = {
  account,
  region: 'ap-southeast-2',
};

const envOregon = {
  account,
  region: 'us-west-2',
};

// ========================================
// Shared Infrastructure Stack (Vercel-optimized)
// ========================================
// Contains: Route53 Hosted Zones (for DNS and SES)
//
// Note: Since we use Vercel for hosting, we no longer need:
// - VPC, ALB, ECS Cluster, EC2, Security Groups, ACM Certificates
//
// Vercel handles hosting, SSL, CDN, and wildcard subdomains
const sharedInfra = new SharedInfraStack(app, 'SharedInfraStack', {
  description: 'Shared infrastructure - Route53 for DNS/SES',
  env: envSydney,
  tags: {
    Application: 'Shared',
    Environment: 'production',
    ManagedBy: 'CDK',
  },
  // ========================================
  // APP DOMAINS - Add new app domains here
  // ========================================
  appDomains: [
    // yoga-go
    { domain: 'myyoga.guru', alternativeDomains: ['*.myyoga.guru'] },
  ],
});

// ========================================
// Yoga-Go Application Stack (Vercel-optimized)
// ========================================
// Contains: Cognito, DynamoDB, Lambda
//
// Note: Since we use Vercel for hosting, we no longer need:
// - ECR, ECS Service, Task Definition, ALB Target Group/Rules
//
// SES has been moved to SesStack in us-west-2 for email receiving support
const yogaGoStack = new YogaGoStack(app, 'YogaGoStack', {
  description: 'Yoga Go - Cognito, DynamoDB (hosted on Vercel)',
  env: envSydney,
  tags: {
    Application: 'YogaGo',
    Environment: 'production',
    ManagedBy: 'CDK',
  },
  sharedInfra,
});

yogaGoStack.addDependency(sharedInfra);

// ========================================
// SES Stack (us-west-2 for email receiving)
// ========================================
// Contains: SES Email Identity, Config Set, Templates, Receipt Rules, Lambda
//
// Note: SES email receiving is only available in us-east-1, us-west-2, eu-west-1
// We use us-west-2 for both sending and receiving emails
const sesStack = new SesStack(app, 'YogaGoSesStack', {
  description: 'Yoga Go SES - Email sending and receiving (us-west-2)',
  env: envOregon,
  crossRegionReferences: true,
  tags: {
    Application: 'YogaGo',
    Environment: 'production',
    ManagedBy: 'CDK',
  },
  hostedZoneId: sharedInfra.hostedZones.get('myyoga.guru')?.hostedZoneId || '',
  hostedZoneName: 'myyoga.guru',
  coreTableArn: `arn:aws:dynamodb:ap-southeast-2:${account}:table/yoga-go-core`,
  coreTableName: 'yoga-go-core',
});

sesStack.addDependency(sharedInfra);
