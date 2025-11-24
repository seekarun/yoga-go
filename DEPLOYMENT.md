# Yoga Go Deployment Guide

This guide covers deploying the Yoga Go Next.js application using Docker containers and AWS ECR for container registry.

## Current Status

**Phase 1: Container Registry** ✅
**Phase 2: ECS on EC2 Deployment** ✅

Currently implemented:

- Docker containerization with optimized multi-stage build
- AWS ECR (Elastic Container Registry) for storing Docker images
- **ECS on EC2** - Container orchestration with health checks and auto-restart
- **Auto Scaling Group** - Single t3.micro instance (free tier eligible)
- **AWS Secrets Manager** - Secure environment variable storage
- **CloudWatch Logs** - Centralized application logging
- GitHub Actions CI/CD pipeline with automatic ECS deployment
- AWS CDK infrastructure as code

**Future Phases:**

- Application Load Balancer with domain routing
- Multiple availability zones for high availability
- Auto-scaling based on traffic
- CloudWatch alarms and monitoring dashboards

## Architecture Overview

```
┌──────────────────┐
│  GitHub Actions  │
│  (on push main)  │
└────────┬─────────┘
         │
         ▼
┌──────────────────┐     ┌─────────────────────┐
│  Build Docker    │────▶│  Push to ECR        │
│  Image           │     │  (SHA + latest tag) │
└──────────────────┘     └────────┬────────────┘
                                  │
                         ┌────────▼────────┐
                         │ Deploy to ECS   │
                         │ (force update)  │
                         └────────┬────────┘
                                  │
                    ┌─────────────▼──────────────┐
                    │  ECS Cluster               │
                    │  ┌──────────────────────┐  │
                    │  │ EC2 Instance         │  │
                    │  │ (t3.micro)           │  │
                    │  │                      │  │
                    │  │  ┌────────────────┐  │  │
                    │  │  │ Next.js App    │  │  │
                    │  │  │ (Docker)       │  │  │
                    │  │  │ Port 3000→80   │  │  │
                    │  │  └────────────────┘  │  │
                    │  └──────────────────────┘  │
                    └─────────────────────────────┘
                              │
                    ┌─────────┼─────────┐
                    │         │         │
              ┌─────▼──┐  ┌──▼────┐ ┌──▼──────────┐
              │MongoDB │  │Auth0  │ │Secrets Mgr  │
              │Atlas   │  │       │ │+ CloudWatch │
              └────────┘  └───────┘ └─────────────┘
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

### Step 2: Deploy Complete Infrastructure

Deploy ECR repository and ECS infrastructure:

```bash
cd infra
cdk deploy --profile myg
```

This creates:

**Container Registry:**

- ECR repository named `yoga-go`
- Image scanning enabled for security
- Lifecycle policy (keeps last 10 images, removes untagged after 1 day)

**Compute Infrastructure:**

- ECS cluster (`yoga-go-cluster`)
- Auto Scaling Group with single t3.micro instance (free tier)
- ECS service (`yoga-go-service`) with health checks
- Security groups (HTTP/HTTPS/SSH access)
- IAM roles for ECS tasks and EC2 instances

**Supporting Services:**

- AWS Secrets Manager secret (`yoga-go/production`)
- CloudWatch log group (`/ecs/yoga-go`)
- VPC configuration (uses default VPC)

**Outputs** (save these):

- `RepositoryUri`: ECR repository URI
- `ClusterName`: `yoga-go-cluster`
- `ServiceName`: `yoga-go-service`
- `SecretArn`: Secrets Manager ARN
- `GetPublicIpCommand`: Command to get EC2 instance public IP

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
5. **Deploys to ECS** - Forces service to pull latest image and restart
6. **Outputs** image URIs and deployment status

### Manual Trigger

You can also trigger the workflow manually from GitHub Actions UI.

## Secrets Management

### Step 3: Configure Application Secrets

After deploying the infrastructure, you need to populate AWS Secrets Manager with your actual environment variables.

1. **Create `.env.production` file** (do NOT commit to git):

```bash
MONGODB_URI=mongodb+srv://user:pass@cluster.mongodb.net/yoga-go
AUTH0_SECRET=your-auth0-secret-from-openssl-rand-hex-32
AUTH0_BASE_URL=http://YOUR_EC2_IP
AUTH0_ISSUER_BASE_URL=https://your-domain.auth0.com
AUTH0_CLIENT_ID=your-auth0-client-id
AUTH0_CLIENT_SECRET=your-auth0-client-secret
CLOUDFLARE_ACCOUNT_ID=your-cloudflare-account-id
CLOUDFLARE_API_TOKEN=your-cloudflare-api-token
CLOUDFLARE_IMAGES_ACCOUNT_HASH=your-images-hash
STRIPE_PUBLISHABLE_KEY=pk_live_...
STRIPE_SECRET_KEY=sk_live_...
STRIPE_WEBHOOK_SECRET=whsec_...
RAZORPAY_KEY_ID=rzp_live_...
RAZORPAY_KEY_SECRET=...
RAZORPAY_WEBHOOK_SECRET=...
SENDGRID_API_KEY=SG...
```

2. **Update secrets in AWS**:

```bash
./infra/scripts/update-secrets.sh .env.production
```

3. **Restart ECS service** to apply new secrets:

```bash
aws ecs update-service \
  --cluster yoga-go-cluster \
  --service yoga-go-service \
  --force-new-deployment \
  --region ap-southeast-2 \
  --profile myg
```

## Accessing Your Application

### Step 4: Get Application URL

After deployment completes (2-3 minutes), get your application's public URL:

```bash
./infra/scripts/get-service-url.sh
```

This will output:

- 🌐 Application URL (e.g., `http://13.210.xxx.xxx`)
- 🏥 Health check endpoint
- 📊 CloudWatch logs command
- ✅ Health check status

You can also manually get the IP:

```bash
# Get EC2 instance public IP
aws ec2 describe-instances \
  --filters "Name=tag:Name,Values=*EcsAutoScalingGroup*" \
            "Name=instance-state-name,Values=running" \
  --query "Reservations[*].Instances[*].PublicIpAddress" \
  --output text \
  --region ap-southeast-2 \
  --profile myg
```

### Test Your Deployment

```bash
# Test health endpoint
curl http://YOUR_EC2_IP/api/health

# Should return: {"status":"ok"}
```

Access your application:

- **Main site**: `http://YOUR_EC2_IP`
- **Health check**: `http://YOUR_EC2_IP/api/health`
- **API endpoints**: `http://YOUR_EC2_IP/api/*`

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
3. GitHub Actions automatically:
   - Builds and pushes Docker image to ECR
   - Deploys to ECS (forces service update)
4. Check Actions tab for deployment status
5. Wait 2-3 minutes for ECS to pull new image and restart containers
6. Verify deployment: `./infra/scripts/get-service-url.sh`

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

### ECS Service Monitoring

**Check service status:**

```bash
aws ecs describe-services \
  --cluster yoga-go-cluster \
  --services yoga-go-service \
  --region ap-southeast-2 \
  --profile myg
```

**View running tasks:**

```bash
aws ecs list-tasks \
  --cluster yoga-go-cluster \
  --service-name yoga-go-service \
  --region ap-southeast-2 \
  --profile myg
```

**View application logs (real-time):**

```bash
aws logs tail /ecs/yoga-go --follow \
  --region ap-southeast-2 \
  --profile myg
```

**View recent logs:**

```bash
aws logs tail /ecs/yoga-go --since 1h \
  --region ap-southeast-2 \
  --profile myg
```

**Check EC2 instance:**

```bash
aws ec2 describe-instances \
  --filters "Name=tag:Name,Values=*EcsAutoScalingGroup*" \
            "Name=instance-state-name,Values=running" \
  --region ap-southeast-2 \
  --profile myg
```

**SSH to EC2 instance (if needed):**

```bash
# Use AWS Systems Manager Session Manager (no SSH key required)
aws ssm start-session \
  --target <instance-id> \
  --region ap-southeast-2 \
  --profile myg
```

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
