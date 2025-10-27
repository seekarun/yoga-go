# Yoga-GO AWS Infrastructure

This directory contains AWS CDK infrastructure code for deploying the Yoga-GO application to AWS.

## Quick Start

### Prerequisites

- AWS CLI configured with credentials
- Node.js 20+ installed
- AWS CDK CLI installed globally: `npm install -g aws-cdk`

### Installation

```bash
cd infrastructure
npm install
```

### Build

```bash
npm run build
```

### Deploy

```bash
# Bootstrap CDK (first time only)
npx cdk bootstrap

# Deploy all stacks
npm run deploy

# Or deploy individual stacks
npm run deploy:network
npm run deploy:container
npm run deploy:loadbalancer
```

### View Changes

```bash
npm run diff
```

### Synthesize CloudFormation

```bash
npm run synth
```

### Destroy

```bash
npm run destroy
```

## Project Structure

```
infrastructure/
├── bin/
│   └── app.ts              # CDK app entry point
├── lib/
│   ├── config.ts           # Configuration interface
│   ├── network-stack.ts    # VPC, subnets, VPC endpoints
│   ├── container-stack.ts  # ECS, ECR, task definitions
│   └── loadbalancer-stack.ts # ALB, listeners, routing rules
├── cdk.json               # CDK configuration
├── package.json           # Dependencies and scripts
└── tsconfig.json          # TypeScript configuration
```

## Stacks

### 1. NetworkStack

Creates VPC infrastructure:

- VPC with public and private subnets (2 AZs)
- Internet Gateway
- NAT Gateway (1 for cost optimization)
- VPC Endpoints (S3, ECR, CloudWatch Logs, Secrets Manager)

### 2. ContainerStack

Creates container infrastructure:

- ECR repository for Docker images
- ECS Fargate cluster
- Task definition with environment variables
- Fargate service with health checks
- CloudWatch log groups
- Secrets Manager integration
- IAM roles and policies

### 3. LoadBalancerStack

Creates load balancer and routing:

- Application Load Balancer (ALB)
- HTTP listener (port 80)
- HTTPS listener (port 443) - optional, requires certificate
- Host-based routing rules for multiple domains
- Target group with health checks
- Security groups

## Configuration

Edit `bin/app.ts` to configure:

```typescript
const config = {
  appName: 'yoga-go',
  environment: 'production',
  vpcCidr: '10.0.0.0/16',
  containerPort: 3000,
  cpu: 256, // 0.25 vCPU
  memory: 512, // 512 MB
  desiredCount: 1, // Number of tasks
  domains: {
    primary: 'yogago.com',
    expertKavitha: 'kavithayoga.com',
  },
};
```

Or use environment variables:

- `AWS_REGION`
- `AWS_ACCOUNT_ID`
- `ENVIRONMENT`
- `PRIMARY_DOMAIN`
- `EXPERT_DOMAIN_KAVITHA`

## Outputs

After deployment, CDK will output:

- **VPC ID**: VPC identifier
- **ECR Repository URI**: Docker image repository URL
- **ECS Cluster Name**: ECS cluster identifier
- **ECS Service Name**: ECS service identifier
- **Load Balancer DNS**: ALB public DNS name
- **Secrets Manager ARN**: Application secrets ARN

## Stack Dependencies

```
NetworkStack
    ↓
ContainerStack
    ↓
LoadBalancerStack
```

Stacks must be deployed in order, but CDK handles this automatically.

## Cost Considerations

### Free Tier Eligible

- VPC and subnets
- ECS Fargate: 20GB storage + 10GB transfer/month
- ALB: 750 hours/month (first 12 months)
- ECR: 500MB storage (first 12 months)
- CloudWatch Logs: 5GB ingestion

### Not Free Tier

- NAT Gateway: ~$32/month
- VPC Endpoints: ~$7/month each
- Secrets Manager: $0.40/secret/month

### Cost Optimization

To reduce costs for development:

1. **Remove NAT Gateway**: Edit `network-stack.ts`:

   ```typescript
   natGateways: 0,
   ```

   Then use public subnets for Fargate tasks.

2. **Use SSM Parameter Store**: Replace Secrets Manager in `container-stack.ts`

3. **Remove VPC Endpoints**: Comment out in `network-stack.ts`

## SSL/TLS Configuration

To enable HTTPS:

1. Request certificate in ACM
2. Uncomment HTTPS listener code in `loadbalancer-stack.ts`
3. Update certificate ARN
4. Redeploy stack

## Domain Routing

The ALB routes traffic based on the `Host` header:

- `yogago.com` → Default route, serves application root
- `kavithayoga.com` → Next.js middleware rewrites to `/experts/kavitha`

To add more expert domains, edit `loadbalancer-stack.ts` and add new listener rules.

## Monitoring

### CloudWatch Logs

Application logs are sent to `/ecs/yoga-go` log group.

View logs:

```bash
aws logs tail /ecs/yoga-go --follow
```

### Container Insights

Disabled by default to reduce costs. To enable, edit `container-stack.ts`:

```typescript
containerInsights: true;
```

## Troubleshooting

### CDK Deploy Fails

1. Verify AWS credentials:

   ```bash
   aws sts get-caller-identity
   ```

2. Ensure CDK is bootstrapped:

   ```bash
   npx cdk bootstrap
   ```

3. Check for IAM permission errors

### Stack Update Fails

1. View CloudFormation events:

   ```bash
   aws cloudformation describe-stack-events \
     --stack-name YogaGoNetworkStack
   ```

2. Check for resource conflicts or quota limits

### Resource Already Exists

Some resources (like ECR repositories) have `RETAIN` deletion policy. To delete:

```bash
aws ecr delete-repository \
  --repository-name yoga-go \
  --force
```

## Development

### Local Testing

The infrastructure can be tested locally using CDK synth:

```bash
npm run synth
```

This generates CloudFormation templates in `cdk.out/`.

### Type Checking

```bash
npm run build
```

### Watch Mode

```bash
npm run watch
```

## Additional Resources

- [AWS CDK Documentation](https://docs.aws.amazon.com/cdk/)
- [CDK TypeScript Reference](https://docs.aws.amazon.com/cdk/api/v2/docs/aws-construct-library.html)
- [ECS Best Practices](https://docs.aws.amazon.com/AmazonECS/latest/bestpracticesguide/)
