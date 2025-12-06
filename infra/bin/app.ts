#!/usr/bin/env node
import 'source-map-support/register';
import * as cdk from 'aws-cdk-lib';
import { SharedInfraStack } from '../lib/shared-infra-stack';
import { YogaGoStack } from '../lib/yoga-go-stack';

const app = new cdk.App();

const env = {
  account: process.env.CDK_DEFAULT_ACCOUNT,
  region: process.env.CDK_DEFAULT_REGION || 'ap-southeast-2',
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
  env,
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
// Contains: Cognito, DynamoDB, SES, Lambda
//
// Note: Since we use Vercel for hosting, we no longer need:
// - ECR, ECS Service, Task Definition, ALB Target Group/Rules
const yogaGoStack = new YogaGoStack(app, 'YogaGoStack', {
  description: 'Yoga Go - Cognito, DynamoDB, SES (hosted on Vercel)',
  env,
  tags: {
    Application: 'YogaGo',
    Environment: 'production',
    ManagedBy: 'CDK',
  },
  sharedInfra,
});

yogaGoStack.addDependency(sharedInfra);
