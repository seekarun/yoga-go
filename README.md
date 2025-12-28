## Yoga-GO

##API Routes

### GUEST ROUTES

- GET /data/experts/
- GET /data/experts/{expertId}
- GET /data/courses/
- GET /data/courses/{courseId}
- GET /data/courses/{courseId}/progress/{savePoint}
- GET /data/courses/{courseId}/items
- GET /data/courses/{courseId}/items/{itemId}

### AUTH ROUTES

- GET /data/app/courses/
- GET /data/app/courses/{courseId}
- GET /data/app/courses/{courseId}/progress/{savePoint}
- GET /data/app/user/{userId}/details

## UI Routes

### Guest Routes

- / (guest)
  - Home
  - landing page
  - header
  - hero section
  - carousel with courses
  - carousel with experts
  - testimonials section
  - pricing details
  - footer section
- /experts
  - Expert listing page
- /experts/{expertId}
  - Expert profile page

### Student Routes (Authenticated)

- /app
  - User dashboard
  - Course progress section
  - New courses upsell section
- /app/courses/{id}
  - Course content player

### Expert Portal (Public - Auth to be added)

- /srv
  - Expert portal home
  - List of all experts with dashboard access
- /srv/{expertId}
  - Expert dashboard
  - Course engagement metrics
  - Subscriber statistics
  - Revenue analytics
  - Recent activity feed
  - Student demographics
- /srv/{expertId}/courses/{courseId}
  - Course management interface
  - Upload course items (videos)
  - Manage item metadata (title, description, duration)
  - Order course items
  - Edit/delete course items

## Getting Started

### Development

```bash
npm run dev        # Start development server on port 3111
npm run build      # Build production bundle
npm run start      # Start production server
```

Open [http://localhost:3111](http://localhost:3111) with your browser to see the result.

You can start editing the page by modifying `app/page.tsx`. The page auto-updates as you edit the file.

### Code Quality

```bash
npm run lint           # Run ESLint
npm run lint:fix       # Fix ESLint issues automatically
npm run format         # Format all files with Prettier
npm run format:check   # Check if files are formatted
```

**Pre-commit Hook**: The project uses Husky to automatically lint and format code before each commit.

This project uses [`next/font`](https://nextjs.org/docs/app/building-your-application/optimizing/fonts) to automatically optimize and load [Geist](https://vercel.com/font), a new font family for Vercel.

## AWS Deployment

This application uses AWS CDK for infrastructure management. All resources are defined as code in the `infra/` directory.

### Fresh AWS Account Setup

To deploy to a new AWS account, follow these steps:

**Prerequisites:**
- AWS CLI configured with appropriate credentials
- Node.js and npm installed
- CDK CLI installed (`npm install -g aws-cdk`)

**Step 1: Bootstrap CDK (one-time per account/region)**

```bash
# Bootstrap ap-southeast-2 (main region)
AWS_PROFILE=myg npx cdk bootstrap aws://<ACCOUNT_ID>/ap-southeast-2

# Bootstrap us-east-1 (required for Cognito certificate)
AWS_PROFILE=myg npx cdk bootstrap aws://<ACCOUNT_ID>/us-east-1
```

**Step 2: Deploy Certificate Stack (us-east-1)**

Cognito custom domains require ACM certificates in us-east-1.

```bash
cd infra
AWS_PROFILE=myg npx cdk deploy CognitoCertStack
```

After deployment:
1. Go to AWS ACM Console in us-east-1
2. Find the certificate for `signin.myyoga.guru`
3. Copy the DNS validation CNAME record
4. Add the CNAME to Vercel DNS
5. Wait for certificate status to change to "Issued" (can take 5-30 minutes)
6. Note the Certificate ARN from the stack output

**Step 3: Deploy Main Stack (ap-southeast-2)**

```bash
AWS_PROFILE=myg npx cdk deploy YogaGoStack -c cognitoCertificateArn=<CERTIFICATE_ARN>
```

Example:
```bash
AWS_PROFILE=myg npx cdk deploy YogaGoStack -c cognitoCertificateArn=arn:aws:acm:us-east-1:123456789:certificate/abc-123-def
```

After deployment:
1. Note the `CognitoCloudFrontDomain` from the stack output
2. Add CNAME to Vercel DNS: `signin` -> `<cloudfront-domain>.cloudfront.net`

**Step 4: Deploy Other Stacks (if needed)**

```bash
# SES Stack for email
AWS_PROFILE=myg npx cdk deploy YogaGoSesStack

# Calel Stack (if applicable)
AWS_PROFILE=myg npx cdk deploy CalelStack
```

### CDK Stacks Overview

| Stack | Region | Purpose |
|-------|--------|---------|
| `CognitoCertStack` | us-east-1 | ACM certificate for Cognito custom domain |
| `YogaGoStack` | ap-southeast-2 | Main infrastructure (Cognito, DynamoDB, S3, etc.) |
| `YogaGoSesStack` | ap-southeast-2 | SES email configuration |
| `CalelStack` | ap-southeast-2 | Additional services |

### Important Notes

- **Certificate ARN is required** when deploying `YogaGoStack` - always include the `-c cognitoCertificateArn=<ARN>` parameter
- All AWS resources are managed via CDK - avoid creating resources manually via CLI or Console
- The AWS profile `myg` is used for all commands (configured in `~/.aws/credentials`)

---

This application is also deployed to AWS using ECS on EC2 with automated CI/CD via GitHub Actions.

### Architecture

- **Container Registry**: AWS ECR (Elastic Container Registry)
- **Compute**: ECS on EC2 (single t3.micro instance - free tier eligible)
- **Infrastructure**: AWS CDK (TypeScript) in `infra/` directory
- **Secrets**: AWS Secrets Manager
- **Logging**: CloudWatch Logs
- **CI/CD**: GitHub Actions (automatic on push to main)

### Quick Commands

```bash
# Infrastructure management
npm run infra:deploy    # Deploy/update AWS infrastructure
npm run infra:diff      # Preview infrastructure changes
npm run infra:synth     # Generate CloudFormation template

# View available Docker images in ECR
./infra/scripts/list-images.sh

# Deploy specific image tag (rollback capability)
./infra/scripts/deploy-tag.sh <tag>      # Deploy specific tag
./infra/scripts/deploy-tag.sh b727c7a   # Example: deploy commit SHA
./infra/scripts/deploy-tag.sh latest    # Deploy latest image

# Get application URL
./infra/scripts/get-service-url.sh

# View application logs
aws logs tail /ecs/yoga-go --follow --region ap-southeast-2 --profile myg
```

### Automatic Deployment

Every push to `main` branch automatically:

1. Builds Docker image
2. Pushes to ECR with tags:
   - Git commit SHA (e.g., `b727c7a`)
   - `latest`
3. Deploys to ECS (forces service update)
4. Deployment takes 2-3 minutes

### Rollback & Tag Deployment

You can deploy any previous version from ECR:

**View available versions:**

```bash
./infra/scripts/list-images.sh
```

**Deploy specific version:**

```bash
# List available tags
./infra/scripts/deploy-tag.sh

# Deploy specific commit
./infra/scripts/deploy-tag.sh b727c7a

# Or use GitHub Actions manual workflow:
# Go to Actions → "Deploy Specific Tag to ECS" → Run workflow
```

**Quick rollback example:**

```bash
# 1. List available images
./infra/scripts/list-images.sh

# 2. Deploy previous version
./infra/scripts/deploy-tag.sh <previous-tag>

# 3. Verify deployment
curl http://YOUR_IP/api/health
```

### Image Tagging Strategy

- **Commit SHA tags** (e.g., `b727c7a`) - Use for production deployments (traceable)
- **`latest` tag** - Always points to most recent build
- **Lifecycle policy** - Keeps last 10 images, removes untagged after 1 day

### Monitoring

```bash
# Check service status
aws ecs describe-services \
  --cluster yoga-go-cluster \
  --services yoga-go-service \
  --region ap-southeast-2 \
  --profile myg

# View application logs
aws logs tail /ecs/yoga-go --follow \
  --region ap-southeast-2 \
  --profile myg

# Get EC2 instance public IP
./infra/scripts/get-service-url.sh
```

### Secrets Management

Application secrets are stored in AWS Secrets Manager:

```bash
# Update secrets from .env.production file
./infra/scripts/update-secrets.sh .env.production

# Restart service to apply new secrets
aws ecs update-service \
  --cluster yoga-go-cluster \
  --service yoga-go-service \
  --force-new-deployment \
  --region ap-southeast-2 \
  --profile myg
```

### Detailed Documentation

For comprehensive deployment documentation, troubleshooting, and best practices, see:

📖 **[DEPLOYMENT.md](./DEPLOYMENT.md)**

Topics covered:

- Complete infrastructure setup guide
- GitHub Actions configuration
- Secrets management
- Rollback procedures and scenarios
- Deployment verification checklist
- Troubleshooting common issues
- Cost optimization tips

## Learn More

To learn more about Next.js, take a look at the following resources:

- [Next.js Documentation](https://nextjs.org/docs) - learn about Next.js features and API.
- [Learn Next.js](https://nextjs.org/learn) - an interactive Next.js tutorial.

You can check out [the Next.js GitHub repository](https://github.com/vercel/next.js) - your feedback and contributions are welcome!

## Deploy on Vercel

The easiest way to deploy your Next.js app is to use the [Vercel Platform](https://vercel.com/new?utm_medium=default-template&filter=next.js&utm_source=create-next-app&utm_campaign=create-next-app-readme) from the creators of Next.js.

Check out our [Next.js deployment documentation](https://nextjs.org/docs/app/building-your-application/deploying) for more details.
