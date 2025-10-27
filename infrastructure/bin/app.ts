#!/usr/bin/env node
import 'source-map-support/register';
import * as cdk from 'aws-cdk-lib';
import { NetworkStack } from '../lib/network-stack';
import { ContainerStack } from '../lib/container-stack';
import { LoadBalancerStack } from '../lib/loadbalancer-stack';
import * as dotenv from 'dotenv';
import * as path from 'path';

// Load environment variables
dotenv.config({ path: path.join(__dirname, '../../.env.production') });

const app = new cdk.App();

// Get configuration from environment or use defaults
const env = {
  account: process.env.AWS_ACCOUNT_ID || process.env.CDK_DEFAULT_ACCOUNT,
  region: process.env.AWS_REGION || process.env.CDK_DEFAULT_REGION || 'us-east-1',
};

const config = {
  appName: 'yoga-go',
  environment: process.env.ENVIRONMENT || 'production',
  vpcCidr: '10.0.0.0/16',
  containerPort: 3000,
  cpu: 256, // 0.25 vCPU (free tier eligible)
  memory: 512, // 512 MB (free tier eligible)
  desiredCount: parseInt(process.env.DESIRED_COUNT || '0'), // Start with 0 for initial deployment
  domains: {
    primary: process.env.PRIMARY_DOMAIN || 'yogago.com',
    expertKavitha: process.env.EXPERT_DOMAIN_KAVITHA || 'kavithayoga.com',
  },
};

console.log('[DBG][cdk-app] Environment:', env);
console.log('[DBG][cdk-app] Config:', config);

// Create stacks
const networkStack = new NetworkStack(app, 'YogaGoNetworkStack', {
  env,
  config,
  description: 'Network infrastructure for Yoga-GO application',
});

const loadBalancerStack = new LoadBalancerStack(app, 'YogaGoLoadBalancerStack', {
  env,
  config,
  vpc: networkStack.vpc,
  description: 'Application Load Balancer with domain-based routing for Yoga-GO',
});

const containerStack = new ContainerStack(app, 'YogaGoContainerStack', {
  env,
  config,
  vpc: networkStack.vpc,
  targetGroup: loadBalancerStack.targetGroup,
  description: 'ECS Fargate container infrastructure for Yoga-GO application',
});

// Add dependencies
loadBalancerStack.addDependency(networkStack);
containerStack.addDependency(networkStack);
containerStack.addDependency(loadBalancerStack); // Container needs target group from LB

// Tag all resources
cdk.Tags.of(app).add('Project', 'yoga-go');
cdk.Tags.of(app).add('Environment', config.environment);
cdk.Tags.of(app).add('ManagedBy', 'CDK');

app.synth();
