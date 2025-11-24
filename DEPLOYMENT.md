# Yoga Go Deployment Guide

This guide covers deploying the Yoga Go Next.js application using Docker containers and AWS ECR for container registry.

## Current Status

**Phase 1: Container Registry** ✅

Currently implemented:

- Docker containerization with optimized multi-stage build
- AWS ECR (Elastic Container Registry) for storing Docker images
- GitHub Actions CI/CD pipeline for automatic builds and deployments
- AWS CDK infrastructure as code

**Future Phases:**

- ECS Fargate service deployment
- Application Load Balancer with domain routing
- Auto-scaling and production monitoring

## Architecture Overview (Current)

```
┌──────────────────┐
│  GitHub Actions  │
│  (on push main)  │
└────────┬─────────┘
         │
         ▼
┌──────────────────┐
│  Build Docker    │
│  Image           │
└────────┬─────────┘
         │
         ▼
┌──────────────────┐
│  AWS ECR         │
│  (yoga-go)       │
│  - SHA tag       │
│  - latest tag    │
└──────────────────┘
```

## Prerequisites

### Required Tools

1. **Node.js 20+** and npm

   ```bash
   node --version  # Should be v20+
   npm --version
   ```

2. **AWS CLI** configured with `myg` profile

   ```bash
   aws configure --profile myg
   # Enter your AWS Access Key ID, Secret Access Key, Region (us-east-1)
   ```

3. **AWS CDK** CLI (for infrastructure management)

   ```bash
   npm install -g aws-cdk
   cdk --version
   ```

4. **Docker** (for local testing)
   ```bash
   docker --version
   ```

### AWS Account Setup

1. AWS account with appropriate permissions
2. IAM user with permissions for:
   - ECR (push/pull images)
   - CloudFormation (for CDK)
   - IAM (create roles for CDK bootstrap)

## Infrastructure Setup

### Step 1: Bootstrap AWS CDK (First Time Only)

Bootstrap CDK in your AWS account and region:

```bash
cd infra
npm install
cdk bootstrap --profile myg
cd ..
```

This creates the necessary S3 bucket and IAM roles for CDK deployments.

### Step 2: Deploy ECR Repository

Deploy the container registry:

```bash
npm run infra:deploy
```

This creates:

- ECR repository named `yoga-go`
- Image scanning enabled for security
- Lifecycle policy (keeps last 10 images, removes untagged after 1 day)
- Tag mutability enabled (allows updating `latest` tag)

**Outputs** (save these):

- `RepositoryUri`: Full ECR repository URI (e.g., `123456789012.dkr.ecr.us-east-1.amazonaws.com/yoga-go`)
- `RepositoryName`: `yoga-go`
- `RepositoryArn`: Full ARN for IAM policies

## GitHub Actions Setup

### Configure GitHub Secrets

1. Go to your GitHub repository → Settings → Secrets and variables → Actions
2. Navigate to Environments → Create environment `aws-dev` (if not exists)
3. Add the following secrets to the `aws-dev` environment:

   | Secret Name             | Description         | Example                                    |
   | ----------------------- | ------------------- | ------------------------------------------ |
   | `AWS_ACCESS_KEY_ID`     | IAM user access key | `AKIAIOSFODNN7EXAMPLE`                     |
   | `AWS_SECRET_ACCESS_KEY` | IAM user secret key | `wJalrXUtnFEMI/K7MDENG/bPxRfiCYEXAMPLEKEY` |
   | `AWS_REGION`            | AWS region          | `us-east-1`                                |
   | `AWS_ACCOUNT_ID`        | Your AWS account ID | `123456789012`                             |

### How It Works

The GitHub Actions workflow (`.github/workflows/deploy-ecr.yml`) automatically:

1. **Triggers** on push to `main` branch
2. **Builds** Docker image using optimized Dockerfile
3. **Tags** image with:
   - Git commit SHA (e.g., `abc1234`)
   - `latest`
4. **Pushes** both tags to AWS ECR
5. **Outputs** image URIs for reference

### Manual Trigger

You can also trigger the workflow manually from GitHub Actions UI.

## Local Development

### Build Docker Image Locally

```bash
# Build image
docker build -t yoga-go .

# Run container
docker run -p 3000:3000 --env-file .env.local yoga-go

# Test health endpoint
curl http://localhost:3000/api/health
```

### Test with Docker Compose

```bash
# Start MongoDB + Next.js app
docker-compose up

# App runs on http://localhost:3111
```

## Infrastructure Management

### Available Commands

From project root:

```bash
# Install infrastructure dependencies
npm run infra:install

# Build TypeScript infrastructure code
npm run infra:build

# Preview infrastructure changes
npm run infra:diff

# Synthesize CloudFormation template
npm run infra:synth

# Deploy infrastructure
npm run infra:deploy

# Destroy infrastructure (use with caution!)
npm run infra:destroy
```

From `infra/` directory:

```bash
cd infra

# Deploy with auto-approval
cdk deploy --profile myg --require-approval never

# View stack outputs
cdk list --profile myg

# Destroy stack
cdk destroy --profile myg
```

## Deployment Workflow

### Automatic (Recommended)

1. Make code changes
2. Commit and push to `main` branch:
   ```bash
   git add .
   git commit -m "feat: add new feature"
   git push origin main
   ```
3. GitHub Actions automatically builds and pushes Docker image
4. Check Actions tab for deployment status

### Manual (Alternative)

If you need to build and push manually:

```bash
# Login to ECR
aws ecr get-login-password --region us-east-1 --profile myg | \
  docker login --username AWS --password-stdin <your-account-id>.dkr.ecr.us-east-1.amazonaws.com

# Build image
docker build -t yoga-go .

# Tag image
docker tag yoga-go:latest <repository-uri>:latest
docker tag yoga-go:latest <repository-uri>:v1.0.0

# Push to ECR
docker push <repository-uri>:latest
docker push <repository-uri>:v1.0.0
```

## Monitoring & Troubleshooting

### View Images in ECR

```bash
# List all images
aws ecr list-images \
  --repository-name yoga-go \
  --profile myg

# Describe images with details
aws ecr describe-images \
  --repository-name yoga-go \
  --profile myg
```

### GitHub Actions Logs

1. Go to repository → Actions tab
2. Click on the workflow run
3. View detailed logs for each step

### Common Issues

#### Build Fails

**Symptom**: GitHub Actions build fails
**Solution**:

- Check that all dependencies are in `package.json`
- Verify Next.js config has `output: 'standalone'`
- Review build logs in Actions tab

#### Push to ECR Fails

**Symptom**: "no basic auth credentials" or "denied: access denied"
**Solution**:

- Verify AWS secrets are correctly set in GitHub environment
- Check IAM user has ECR permissions:
  ```json
  {
    "Version": "2012-10-17",
    "Statement": [
      {
        "Effect": "Allow",
        "Action": [
          "ecr:GetAuthorizationToken",
          "ecr:BatchCheckLayerAvailability",
          "ecr:GetDownloadUrlForLayer",
          "ecr:BatchGetImage",
          "ecr:PutImage",
          "ecr:InitiateLayerUpload",
          "ecr:UploadLayerPart",
          "ecr:CompleteLayerUpload"
        ],
        "Resource": "*"
      }
    ]
  }
  ```

#### CDK Bootstrap Fails

**Symptom**: "Bootstrap stack not found"
**Solution**:

```bash
cd infra
cdk bootstrap --profile myg
```

## Cost Optimization

### Free Tier Eligible

AWS ECR Free Tier:

- **500 MB** storage per month (free for 12 months)
- **500 GB** data transfer out to internet per month
- **2,500** GetAuthorizationToken API calls per month

### Cost After Free Tier

- Storage: **$0.10 per GB/month**
- Data transfer: **$0.09 per GB** (to internet)

**Tip**: Lifecycle policy automatically cleans up old images to stay within free tier limits.

## Next Steps

Once ECR is set up and working, the next deployment phases will include:

1. **ECS Fargate Service**: Run the containerized application
2. **Application Load Balancer**: Route traffic to containers
3. **Auto-scaling**: Scale based on traffic
4. **CloudWatch Monitoring**: Application logs and metrics
5. **Domain & SSL**: Custom domain with HTTPS

## Useful Resources

- [AWS ECR Documentation](https://docs.aws.amazon.com/ecr/)
- [AWS CDK Documentation](https://docs.aws.amazon.com/cdk/)
- [Next.js Docker Deployment](https://nextjs.org/docs/deployment#docker-image)
- [GitHub Actions Documentation](https://docs.github.com/actions)

## Infrastructure Code

The infrastructure code is located in the `infra/` directory:

```
infra/
├── bin/
│   └── yoga-go.ts          # CDK app entry point
├── lib/
│   └── yoga-go-stack.ts    # ECR stack definition
├── cdk.json                # CDK configuration (uses 'myg' profile)
├── package.json            # CDK dependencies
└── tsconfig.json           # TypeScript config
```

## Support

For issues:

1. Check GitHub Actions logs for build/deployment errors
2. Verify AWS credentials and permissions
3. Review ECR repository in AWS Console
4. Check CDK stack status in CloudFormation
