# Yoga Go Infrastructure

AWS CDK infrastructure code for the Yoga Go application.

## Prerequisites

- Node.js 20+
- AWS CLI configured with `myg` profile
- AWS CDK CLI installed globally: `npm install -g aws-cdk`

## Setup

```bash
cd infra
npm install
```

## Bootstrap CDK (first time only)

```bash
cdk bootstrap --profile myg
```

## Deploy Infrastructure

```bash
npm run deploy
```

This will create:

- ECR repository (`yoga-go`) with lifecycle policies
- Image scanning enabled for security
- Retention: Last 10 tagged images

## Useful Commands

- `npm run build` - Compile TypeScript to JavaScript
- `npm run synth` - Synthesize CloudFormation template
- `npm run deploy` - Deploy stack to AWS
- `npm run destroy` - Remove all resources (use with caution)
- `npm run diff` - Compare deployed stack with current state

## Stack Outputs

After deployment, you'll see:

- **RepositoryUri**: Full ECR repository URI (use for docker push)
- **RepositoryName**: Repository name (`yoga-go`)
- **RepositoryArn**: Full ARN for IAM policies

## GitHub Actions Integration

The ECR repository is used by `.github/workflows/deploy-ecr.yml` to:

1. Build Docker image from application code
2. Tag with git SHA and `latest`
3. Push to ECR automatically on push to `main` branch

## Free Tier

ECR offers:

- **500 MB** storage per month (free for 12 months)
- **500 GB** data transfer out to internet per month
- Lifecycle policies automatically clean up old images

## Security

- **Image scanning**: Automatically scans for CVEs on push
- **Tag mutability**: Allows updating `latest` tag
- **Removal policy**: RETAIN (prevents accidental deletion)
