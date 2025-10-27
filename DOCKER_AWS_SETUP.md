# Docker & AWS Deployment - Quick Reference

## What Was Created

### 1. Docker Configuration

- **Dockerfile** - Multi-stage production build
- **.dockerignore** - Optimized build context
- **docker-compose.yml** - Local testing with MongoDB
- **next.config.ts** - Updated with `output: 'standalone'`
- **src/app/api/health/route.ts** - Health check endpoint

### 2. AWS Infrastructure (CDK)

Located in `infrastructure/`:

- **network-stack.ts** - VPC, subnets, VPC endpoints
- **container-stack.ts** - ECS Fargate, ECR, task definitions
- **loadbalancer-stack.ts** - ALB with domain-based routing

### 3. Deployment Scripts

Located in `scripts/deployment/`:

- **build-and-push.sh** - Build Docker image and push to ECR
- **deploy-infrastructure.sh** - Deploy AWS infrastructure
- **update-ecs-service.sh** - Update running ECS service
- **update-secrets.sh** - Update AWS Secrets Manager
- **deploy-app.sh** - Full deployment (build + deploy)

### 4. Domain Routing

- **src/middleware.ts** - Updated with domain-based routing logic
  - `yogago.com` → serves default routes (/)
  - `kavithayoga.com` → rewrites to /experts/kavitha

## Quick Start

### Local Docker Testing

```bash
# Build and run with docker-compose
docker-compose up --build

# Access app at http://localhost:3111
# MongoDB runs at localhost:27017
```

### AWS Deployment

#### Prerequisites

```bash
# Install AWS CLI and configure
aws configure

# Install AWS CDK globally
npm install -g aws-cdk

# Verify Docker is running
docker --version
```

#### One-Time Setup

1. **Configure environment**:

   ```bash
   cp .env.production.example .env.production
   # Edit .env.production with your values
   ```

2. **Bootstrap CDK** (first time only):

   ```bash
   cd infrastructure
   npm install
   npx cdk bootstrap
   cd ..
   ```

3. **Deploy infrastructure**:

   ```bash
   ./scripts/deployment/deploy-infrastructure.sh
   ```

4. **Update secrets**:

   ```bash
   ./scripts/deployment/update-secrets.sh
   ```

5. **Deploy application**:
   ```bash
   ./scripts/deployment/deploy-app.sh
   ```

#### Regular Deployments

After making code changes:

```bash
./scripts/deployment/deploy-app.sh
```

This will:

- Build Docker image
- Push to ECR
- Update ECS service
- Wait for deployment to complete

## Architecture

```
Internet
    │
    ├─── yogago.com ────────┐
    │                       │
    └─── kavithayoga.com ───┤
                            ▼
                    ┌───────────────┐
                    │      ALB      │  (Port 80/443)
                    │  (Host-based  │
                    │   routing)    │
                    └───────┬───────┘
                            │
                    ┌───────▼───────┐
                    │  ECS Fargate  │  (0.25 vCPU, 512 MB)
                    │   Service     │
                    │  (Next.js)    │
                    └───────┬───────┘
                            │
        ┌───────────────────┼───────────────────┐
        │                   │                   │
    ┌───▼────┐      ┌──────▼──────┐    ┌──────▼──────┐
    │MongoDB │      │    Auth0    │    │ Cloudflare  │
    │ Atlas  │      │             │    │   Stream    │
    └────────┘      └─────────────┘    └─────────────┘
```

## Environment Variables

### Required in .env.production

```bash
# AWS
AWS_REGION=us-east-1
AWS_ACCOUNT_ID=123456789012
ECR_REPOSITORY_NAME=yoga-go
ECS_CLUSTER_NAME=yoga-go-cluster
ECS_SERVICE_NAME=yoga-go-service

# Domains
PRIMARY_DOMAIN=yogago.com
EXPERT_DOMAIN_KAVITHA=kavithayoga.com

# MongoDB Atlas
MONGODB_URI=mongodb+srv://...

# Auth0
AUTH0_SECRET=...
AUTH0_BASE_URL=https://yogago.com
AUTH0_ISSUER_BASE_URL=https://...
AUTH0_CLIENT_ID=...
AUTH0_CLIENT_SECRET=...

# Cloudflare
CLOUDFLARE_ACCOUNT_ID=...
CLOUDFLARE_API_TOKEN=...
CLOUDFLARE_IMAGES_ACCOUNT_HASH=...

# Stripe
NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY=pk_live_...
STRIPE_SECRET_KEY=sk_live_...

# Razorpay
NEXT_PUBLIC_RAZORPAY_KEY_ID=rzp_live_...
RAZORPAY_KEY_SECRET=...
```

## Domain Setup

### DNS Configuration

After deploying infrastructure, get the ALB DNS name:

```bash
aws cloudformation describe-stacks \
  --stack-name YogaGoLoadBalancerStack \
  --query 'Stacks[0].Outputs[?OutputKey==`LoadBalancerDnsName`].OutputValue' \
  --output text
```

Create CNAME records:

- `yogago.com` → `<alb-dns-name>`
- `kavithayoga.com` → `<alb-dns-name>`

### SSL Certificate

1. Request certificate in ACM:

   ```bash
   aws acm request-certificate \
     --domain-name yogago.com \
     --subject-alternative-names kavithayoga.com \
     --validation-method DNS
   ```

2. Add DNS validation records

3. Uncomment HTTPS listener code in `infrastructure/lib/loadbalancer-stack.ts`

4. Redeploy:
   ```bash
   ./scripts/deployment/deploy-infrastructure.sh
   ```

## Monitoring

### View Logs

```bash
# Application logs
aws logs tail /ecs/yoga-go --follow

# ECS service status
aws ecs describe-services \
  --cluster yoga-go-cluster \
  --services yoga-go-service
```

### Health Check

```bash
# Get ALB DNS
ALB_DNS=$(aws cloudformation describe-stacks \
  --stack-name YogaGoLoadBalancerStack \
  --query 'Stacks[0].Outputs[?OutputKey==`LoadBalancerDnsName`].OutputValue' \
  --output text)

# Test health endpoint
curl http://$ALB_DNS/api/health
```

## Common Tasks

### Update Application Code

```bash
./scripts/deployment/deploy-app.sh v1.2.3
```

### Update Environment Variables

```bash
# Edit .env.production
./scripts/deployment/update-secrets.sh
./scripts/deployment/update-ecs-service.sh
```

### View Infrastructure Costs

```bash
# Estimated monthly cost
aws ce get-cost-and-usage \
  --time-period Start=2025-01-01,End=2025-01-31 \
  --granularity MONTHLY \
  --metrics BlendedCost \
  --group-by Type=TAG,Key=Project
```

### Scale ECS Service

```bash
aws ecs update-service \
  --cluster yoga-go-cluster \
  --service yoga-go-service \
  --desired-count 2
```

### Destroy Infrastructure

```bash
cd infrastructure
npm run destroy
```

## File Structure

```
yoga-go/
├── Dockerfile                          # Multi-stage production build
├── .dockerignore                       # Build context exclusions
├── docker-compose.yml                  # Local testing setup
├── .env.production.example             # Environment template
├── DEPLOYMENT.md                       # Detailed deployment guide
├── DOCKER_AWS_SETUP.md                # This file
│
├── infrastructure/                     # AWS CDK code
│   ├── bin/
│   │   └── app.ts                     # CDK app entry point
│   ├── lib/
│   │   ├── config.ts                  # Configuration types
│   │   ├── network-stack.ts           # VPC infrastructure
│   │   ├── container-stack.ts         # ECS/ECR infrastructure
│   │   └── loadbalancer-stack.ts      # ALB infrastructure
│   ├── package.json                   # CDK dependencies
│   ├── tsconfig.json                  # TypeScript config
│   ├── cdk.json                       # CDK configuration
│   └── README.md                      # Infrastructure docs
│
├── scripts/deployment/                 # Deployment scripts
│   ├── build-and-push.sh              # Build and push Docker image
│   ├── deploy-infrastructure.sh       # Deploy AWS infrastructure
│   ├── update-ecs-service.sh          # Update ECS service
│   ├── update-secrets.sh              # Update AWS Secrets Manager
│   └── deploy-app.sh                  # Full deployment
│
├── src/
│   ├── middleware.ts                  # Domain routing logic
│   └── app/api/health/route.ts        # Health check endpoint
│
└── next.config.ts                     # Next.js config (standalone output)
```

## Cost Breakdown

### Free Tier (First 12 months)

- ECS Fargate: 20GB storage + 10GB transfer
- ALB: 750 hours/month
- ECR: 500MB storage
- CloudWatch Logs: 5GB ingestion
- Data Transfer: 100GB/month

### Paid (After Free Tier)

- NAT Gateway: ~$32/month
- VPC Endpoints: ~$7/month each
- Secrets Manager: $0.40/secret/month
- Route 53 hosted zone: $0.50/month
- ECS Fargate: $0.04048/vCPU-hour + $0.004445/GB-hour

### Estimated Monthly Cost

- **With Free Tier**: ~$8/month (NAT + VPC endpoints)
- **After Free Tier**: ~$40/month (including ECS compute)

## Troubleshooting

### Build Fails

- Check Docker is running
- Verify Node.js version (20+)
- Check for TypeScript errors: `npm run build`

### Container Won't Start

- Check CloudWatch logs: `aws logs tail /ecs/yoga-go --follow`
- Verify environment variables in Secrets Manager
- Check security groups allow outbound traffic

### Health Check Failing

- Test locally: `docker-compose up`
- Verify health endpoint: `curl http://localhost:3111/api/health`
- Check container port mapping (3000)

### Domain Not Working

- Verify DNS records propagated: `dig yogago.com`
- Check ALB listeners and target groups
- Test with host header: `curl -H "Host: yogago.com" http://<alb-dns>`

## Next Steps

1. ✅ Set up DNS records
2. ✅ Request and validate SSL certificate
3. ✅ Enable HTTPS on ALB
4. ✅ Configure MongoDB Atlas IP whitelist
5. ✅ Update Auth0 callback URLs
6. ✅ Test domain routing
7. ✅ Set up monitoring and alerts
8. ✅ Configure auto-scaling (optional)

## Support

For detailed information, see:

- **DEPLOYMENT.md** - Comprehensive deployment guide
- **infrastructure/README.md** - Infrastructure details
- **README.md** - Application documentation
