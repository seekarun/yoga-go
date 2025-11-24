#!/usr/bin/env node
import 'source-map-support/register';
import * as cdk from 'aws-cdk-lib';
import { YogaGoStack } from '../lib/yoga-go-stack';

const app = new cdk.App();

new YogaGoStack(app, 'YogaGoStack', {
  description: 'Yoga Go application infrastructure - ECR repository',
  env: {
    account: process.env.CDK_DEFAULT_ACCOUNT,
    region: process.env.CDK_DEFAULT_REGION,
  },
  tags: {
    Application: 'YogaGo',
    Environment: 'production',
    ManagedBy: 'CDK',
  },
});
