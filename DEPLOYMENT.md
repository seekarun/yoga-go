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

## Rollback & Tag Deployment

You can deploy any specific image tag from ECR, enabling easy rollbacks to previous versions.

### View Available Images

First, list all available images in ECR to see what tags are available:

```bash
./infra/scripts/list-images.sh
```

This displays:

- All available image tags sorted by push date (newest first)
- Currently deployed tag (highlighted in green with "← DEPLOYED")
- Image size and push timestamp
- Total storage usage and free tier status (500 MB free tier limit)
- Quick commands for deployment and monitoring

**Example output:**

```
═══════════════════════════════════════════════════════════════════════
✅ Available Images in ECR Repository: yoga-go
═══════════════════════════════════════════════════════════════════════

TAG                  PUSHED                    SIZE        STATUS
──────────────────────────────────────────────────────────────────────────
b727c7a              2025-01-24 14:32:15       245 MB      ← DEPLOYED (latest)
a3f9d21              2025-01-24 12:18:43       244 MB
9e2c8f5              2025-01-23 18:45:22       243 MB
latest               2025-01-24 14:32:15       245 MB      (latest)

═══════════════════════════════════════════════════════════════════════

🏷️  Currently Deployed: b727c7a

📊 Total images: 8
💾 Total size: 1,950 MB
⚠️  Exceeding free tier by 1,450 MB
💰 Estimated cost: $14.50/month
```

### Deploy a Specific Tag (Local Script)

Use the deployment script to deploy any tag:

```bash
# List available tags (no argument)
./infra/scripts/deploy-tag.sh

# Deploy a specific commit tag
./infra/scripts/deploy-tag.sh b727c7a

# Deploy latest tag
./infra/scripts/deploy-tag.sh latest
```

**What the script does:**

1. Verifies the image tag exists in ECR
2. Fetches the current task definition
3. Creates a new task definition with the specified image tag
4. Registers the new task definition
5. Updates the ECS service to use the new task definition
6. Provides monitoring commands and deployment status

**Example output:**

```
🚀 Yoga Go Deployment Tool

Deploying image tag: b727c7a

Current deployment: a3f9d21
New deployment:     b727c7a

🔍 Verifying image tag exists...
✓ Image tag verified: b727c7a

📋 Fetching current task definition...
✓ Current task definition: yoga-go:15

🔧 Creating new task definition with image: 710735877057.dkr.ecr.ap-southeast-2.amazonaws.com/yoga-go:b727c7a
✓ New task definition registered: yoga-go:16

🚀 Updating ECS service...
✓ Service update initiated

═══════════════════════════════════════════════
✅ Deployment Started!
═══════════════════════════════════════════════

📦 Image:    710735877057.dkr.ecr.ap-southeast-2.amazonaws.com/yoga-go:b727c7a
🎯 Cluster:  yoga-go-cluster
🔧 Service:  yoga-go-service

⏱️  Deployment in progress...

ECS will:
  1. Stop the current task
  2. Pull the image: b727c7a
  3. Start a new task
  4. Wait for health checks to pass

This typically takes 2-3 minutes.
```

### Deploy via GitHub Actions (Manual Workflow)

You can also deploy specific tags through the GitHub Actions web interface:

1. Go to your GitHub repository → **Actions** tab
2. Select **"Deploy Specific Tag to ECS"** workflow
3. Click **"Run workflow"** button
4. Enter the image tag (e.g., `b727c7a` or `latest`)
5. Click **"Run workflow"** to start deployment

This workflow:

- Verifies the tag exists in ECR
- Creates a new task definition
- Updates the ECS service
- Waits for deployment to stabilize (up to 10 minutes)
- Shows deployment status and recent service events

**When to use:**

- Rolling back from any location without AWS CLI access
- Team members who need deployment access but not AWS console access
- Automated rollback workflows triggered by monitoring alerts

### Rollback Scenarios

#### Scenario 1: Quick Rollback to Previous Version

If the latest deployment has issues, rollback to the previous version:

```bash
# 1. List available images to find previous version
./infra/scripts/list-images.sh

# 2. Deploy the previous tag
./infra/scripts/deploy-tag.sh a3f9d21

# 3. Monitor deployment
aws ecs describe-services \
  --cluster yoga-go-cluster \
  --services yoga-go-service \
  --region ap-southeast-2 \
  --profile myg

# 4. Verify application is working
curl http://$(./infra/scripts/get-service-url.sh | grep "http://" | awk '{print $2}')/api/health
```

#### Scenario 2: Rollback During Incident

If production is broken and you need immediate rollback:

```bash
# Fastest path - deploy known good tag directly
./infra/scripts/deploy-tag.sh <KNOWN_GOOD_TAG>

# Example: Rollback to specific commit from 2 days ago
./infra/scripts/deploy-tag.sh 9e2c8f5
```

The deployment typically takes 2-3 minutes:

- **0-30s**: ECS receives update command, stops current task
- **30-90s**: EC2 pulls new image from ECR
- **90-180s**: Container starts, health checks run, traffic switches

#### Scenario 3: Gradual Rollback Testing

If you want to test a rollback before committing:

```bash
# 1. Note current deployment
CURRENT=$(aws ecs describe-services \
  --cluster yoga-go-cluster \
  --services yoga-go-service \
  --query 'services[0].taskDefinition' \
  --output text \
  --region ap-southeast-2 \
  --profile myg)

echo "Current: $CURRENT"

# 2. Deploy older version
./infra/scripts/deploy-tag.sh <OLDER_TAG>

# 3. Test the deployment
curl http://YOUR_IP/api/health
# ... run more tests ...

# 4. If issues, rollback to original
# Extract tag from task definition and redeploy
```

### Deployment Best Practices

#### Image Tagging Strategy

Every push to `main` creates two tags:

- **Commit SHA** (e.g., `b727c7a`) - immutable reference to specific version
- **`latest`** - always points to most recent build

**Recommendations:**

- Use commit SHA tags for production deployments (traceable)
- Use `latest` tag for quick testing in staging environments
- Never delete commit SHA tags - keep deployment history

#### Monitoring Deployments

**Watch deployment progress:**

```bash
# Real-time ECS service events
watch -n 5 'aws ecs describe-services \
  --cluster yoga-go-cluster \
  --services yoga-go-service \
  --query "services[0].events[0:5]" \
  --region ap-southeast-2 \
  --profile myg'
```

**Watch application logs:**

```bash
# Follow logs in real-time
aws logs tail /ecs/yoga-go --follow \
  --region ap-southeast-2 \
  --profile myg
```

**Check health endpoint:**

```bash
# Continuously check health
while true; do
  curl -s http://YOUR_IP/api/health || echo "FAILED"
  sleep 2
done
```

#### Deployment Verification Checklist

After any deployment or rollback:

1. ✅ **Service is stable**

   ```bash
   aws ecs describe-services \
     --cluster yoga-go-cluster \
     --services yoga-go-service \
     --query 'services[0].{Running:runningCount,Desired:desiredCount}' \
     --region ap-southeast-2 \
     --profile myg
   ```

   Should show: `Running: 1, Desired: 1`

2. ✅ **Health check passes**

   ```bash
   curl http://YOUR_IP/api/health
   # Should return: {"status":"ok"}
   ```

3. ✅ **No errors in logs**

   ```bash
   aws logs tail /ecs/yoga-go --since 5m \
     --filter-pattern "ERROR" \
     --region ap-southeast-2 \
     --profile myg
   ```

4. ✅ **Correct image is deployed**
   ```bash
   ./infra/scripts/list-images.sh
   # Verify "← DEPLOYED" marker is on expected tag
   ```

### Troubleshooting Rollback Issues

#### Issue: "Image tag not found in ECR"

**Symptom:**

```
❌ Error: Image tag 'abc1234' not found in ECR
```

**Solution:**

1. Verify tag exists:

   ```bash
   ./infra/scripts/list-images.sh
   ```

2. Check if lifecycle policy deleted old images (keeps last 10 only)

3. If needed, redeploy from source:
   ```bash
   git checkout <commit-sha>
   # Trigger GitHub Actions or build manually
   ```

#### Issue: Deployment stuck in "CREATE_IN_PROGRESS"

**Symptom:** ECS service update doesn't complete after 10 minutes

**Solution:**

1. Check task health:

   ```bash
   aws ecs describe-tasks \
     --cluster yoga-go-cluster \
     --tasks $(aws ecs list-tasks --cluster yoga-go-cluster --service-name yoga-go-service --query 'taskArns[0]' --output text --region ap-southeast-2 --profile myg) \
     --region ap-southeast-2 \
     --profile myg
   ```

2. Check logs for errors:

   ```bash
   aws logs tail /ecs/yoga-go --since 10m --region ap-southeast-2 --profile myg
   ```

3. Common causes:
   - Health check endpoint failing (check `/api/health`)
   - Missing environment variables (check Secrets Manager)
   - Image pull errors (check ECR permissions)

4. Force stop stuck tasks:
   ```bash
   aws ecs update-service \
     --cluster yoga-go-cluster \
     --service yoga-go-service \
     --force-new-deployment \
     --region ap-southeast-2 \
     --profile myg
   ```

#### Issue: Container keeps restarting

**Symptom:** Task starts then immediately stops, health checks never pass

**Solution:**

1. Check container exit code:

   ```bash
   aws ecs describe-tasks \
     --cluster yoga-go-cluster \
     --tasks <TASK_ARN> \
     --query 'tasks[0].containers[0].{exitCode:exitCode,reason:reason}' \
     --region ap-southeast-2 \
     --profile myg
   ```

2. Check application startup logs:

   ```bash
   aws logs tail /ecs/yoga-go --since 5m --region ap-southeast-2 --profile myg | grep -i error
   ```

3. Common fixes:
   - Update secrets in AWS Secrets Manager
   - Verify MongoDB connection string
   - Check Auth0 configuration (AUTH0_BASE_URL must match public IP)
   - Ensure all required environment variables are set

#### Issue: Old version still serving traffic after deployment

**Symptom:** Deployed new tag but application behavior hasn't changed

**Solution:**

1. Verify task is running new image:

   ```bash
   aws ecs describe-tasks \
     --cluster yoga-go-cluster \
     --tasks $(aws ecs list-tasks --cluster yoga-go-cluster --service-name yoga-go-service --query 'taskArns[0]' --output text --region ap-southeast-2 --profile myg) \
     --query 'tasks[0].containers[0].image' \
     --region ap-southeast-2 \
     --profile myg
   ```

2. Check task definition revision:

   ```bash
   aws ecs describe-services \
     --cluster yoga-go-cluster \
     --services yoga-go-service \
     --query 'services[0].taskDefinition' \
     --region ap-southeast-2 \
     --profile myg
   ```

3. Force new deployment if needed:
   ```bash
   aws ecs update-service \
     --cluster yoga-go-cluster \
     --service yoga-go-service \
     --force-new-deployment \
     --region ap-southeast-2 \
     --profile myg
   ```

### Deployment History

ECS maintains a complete history of task definition revisions. You can view all previous deployments:

```bash
# List all task definition revisions
aws ecs list-task-definitions \
  --family-prefix yoga-go \
  --sort DESC \
  --region ap-southeast-2 \
  --profile myg

# View specific revision details
aws ecs describe-task-definition \
  --task-definition yoga-go:15 \
  --region ap-southeast-2 \
  --profile myg
```

Each revision includes:

- Container image URI with tag
- Environment variables and secrets
- Resource allocations (CPU, memory)
- Health check configuration
- Creation timestamp

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
