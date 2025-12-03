#!/usr/bin/env node
import 'source-map-support/register';
import * as cdk from 'aws-cdk-lib';
import { SharedInfraStack } from '../lib/shared-infra-stack';
import { YogaGoStack } from '../lib/yoga-go-stack';
import { AppTwoStack } from '../lib/app-two-stack';

const app = new cdk.App();

const env = {
  account: process.env.CDK_DEFAULT_ACCOUNT,
  region: process.env.CDK_DEFAULT_REGION || 'ap-southeast-2',
};

// ========================================
// Shared Infrastructure Stack
// ========================================
// Contains: VPC, ALB, ECS Cluster, EC2, Security Groups, ACM Certificates
//
// To add a new app:
// 1. Add its domain to appDomains below
// 2. Create a new app stack (use AppTwoStack as template)
// 3. Add the stack below with dependency on sharedInfra
// 4. Deploy: cdk deploy SharedInfraStack then cdk deploy NewAppStack
const sharedInfra = new SharedInfraStack(app, 'SharedInfraStack', {
  description: 'Shared infrastructure for all applications',
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
    // Add more apps here (when you have a real domain):
    // { domain: 'app-two.yourdomian.com', alternativeDomains: ['*.app-two.yourdomain.com'] },
  ],
});

// ========================================
// Yoga-Go Application Stack
// ========================================
// Contains: ECR, ECS Service, Cognito, DynamoDB, SES, Route53
const yogaGoStack = new YogaGoStack(app, 'YogaGoStack', {
  description: 'Yoga Go application infrastructure',
  env,
  tags: {
    Application: 'YogaGo',
    Environment: 'production',
    ManagedBy: 'CDK',
  },
  sharedInfra,
  listenerRulePriority: 10, // Lower = higher priority
});

yogaGoStack.addDependency(sharedInfra);

// ========================================
// App Two Application Stack (UNCOMMENT WHEN YOU HAVE A REAL DOMAIN)
// ========================================
// Contains: ECR, ECS Service (minimal placeholder app)
// To enable:
// 1. Add domain to appDomains above
// 2. Uncomment below
// 3. Deploy SharedInfraStack first, then AppTwoStack
//
// const appTwoStack = new AppTwoStack(app, 'AppTwoStack', {
//   description: 'App Two application infrastructure',
//   env,
//   tags: {
//     Application: 'AppTwo',
//     Environment: 'production',
//     ManagedBy: 'CDK',
//   },
//   sharedInfra,
//   listenerRulePriority: 20,
//   hostHeaders: ['app-two.yourdomain.com', 'www.app-two.yourdomain.com'],
// });
//
// appTwoStack.addDependency(sharedInfra);

// ========================================
// To add a new app (e.g., app-three):
// ========================================
// 1. Add domain to appDomains in SharedInfraStack above
// 2. Create infra/lib/app-three-stack.ts (copy app-two-stack.ts)
// 3. Uncomment and modify below:
//
// import { AppThreeStack } from '../lib/app-three-stack';
//
// const appThreeStack = new AppThreeStack(app, 'AppThreeStack', {
//   description: 'App Three application infrastructure',
//   env,
//   tags: { Application: 'AppThree', Environment: 'production', ManagedBy: 'CDK' },
//   sharedInfra,
//   listenerRulePriority: 30, // Must be unique
//   hostHeaders: ['app-three.com', 'www.app-three.com'],
// });
// appThreeStack.addDependency(sharedInfra);
//
// 4. Create apps/app-three/ with Next.js app
// 5. Deploy:
//    npm run infra:deploy:shared  # Update shared infra with new cert
//    npm run infra:deploy:app-three  # Deploy the new app
