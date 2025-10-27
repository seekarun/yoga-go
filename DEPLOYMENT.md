# Yoga-GO AWS Deployment Guide

This guide covers deploying the Yoga-GO Next.js application to AWS using Docker containers, ECS Fargate, and Application Load Balancer with domain-based routing.

## Architecture Overview

```
┌─────────────────┐     ┌─────────────────┐
│  yogago.com     │────▶│                 │
│  (Route 53)     │     │  Application    │
└─────────────────┘     │  Load Balancer  │
                        │  (Port 80/443)  │
┌─────────────────┐     │                 │
│ kavithayoga.com │────▶│                 │
│  (Route 53)     │     └────────┬────────┘
└─────────────────┘              │
                                 │
                        ┌────────▼────────┐
                        │  ECS Fargate    │
                        │  Service        │
                        │  (Next.js App)  │
                        └────────┬────────┘
                                 │
                    ┌────────────┼────────────┐
                    │            │            │
            ┌───────▼──────┐ ┌──▼──────┐ ┌──▼──────┐
            │  MongoDB     │ │  Auth0  │ │Cloudflare│
            │  Atlas       │ │         │ │ Stream   │
            └──────────────┘ └─────────┘ └──────────┘
```

### Key Components

1. **Application Load Balancer (ALB)**: Routes traffic based on domain
   - `yogago.com` → serves default routes (/)
   - `kavithayoga.com` → Next.js middleware rewrites to /experts/kavitha

2. **ECS Fargate**: Runs containerized Next.js application
   - 0.25 vCPU, 512 MB RAM (free tier eligible)
   - Auto-scaling capabilities

3. **ECR**: Stores Docker images
   - Private repository with image scanning

4. **VPC**: Network isolation with public/private subnets
   - 2 Availability Zones for high availability

## Prerequisites

### Required

1. **AWS Account** with appropriate permissions
2. **AWS CLI** installed and configured

   ```bash
   aws configure
   ```

3. **Docker** installed and running

   ```bash
   docker --version
   ```

4. **Node.js 20+** and npm

   ```bash
   node --version
   npm --version
   ```

5. **AWS CDK** installed globally
   ```bash
   npm install -g aws-cdk
   cdk --version
   ```

### External Services

1. **MongoDB Atlas** (free tier available)
   - Create cluster at https://www.mongodb.com/cloud/atlas
   - Get connection string

2. **Auth0** account
   - Create application at https://manage.auth0.com/
   - Configure callback URLs

3. **Cloudflare** account (for video hosting)
   - API token from https://dash.cloudflare.com/

4. **Domain names** registered
   - yogago.com
   - kavithayoga.com

## Deployment Steps

### Step 1: Environment Configuration

1. Copy the production environment template:

   ```bash
   cp .env.production.example .env.production
   ```

2. Edit `.env.production` and fill in all values:

   ```bash
   # MongoDB Atlas connection string
   MONGODB_URI=mongodb+srv://...

   # Auth0 credentials
   AUTH0_SECRET=...
   AUTH0_BASE_URL=https://yogago.com
   AUTH0_ISSUER_BASE_URL=https://...
   AUTH0_CLIENT_ID=...
   AUTH0_CLIENT_SECRET=...

   # Cloudflare
   CLOUDFLARE_ACCOUNT_ID=...
   CLOUDFLARE_API_TOKEN=...
   CLOUDFLARE_IMAGES_ACCOUNT_HASH=...

   # Payment gateways
   STRIPE_SECRET_KEY=...
   RAZORPAY_KEY_SECRET=...

   # AWS configuration
   AWS_REGION=us-east-1
   AWS_ACCOUNT_ID=123456789012
   ECR_REPOSITORY_NAME=yoga-go
   ECS_CLUSTER_NAME=yoga-go-cluster
   ECS_SERVICE_NAME=yoga-go-service

   # Domains
   PRIMARY_DOMAIN=yogago.com
   EXPERT_DOMAIN_KAVITHA=kavithayoga.com
   ```

3. Verify your AWS credentials:
   ```bash
   aws sts get-caller-identity
   ```

### Step 2: Deploy Infrastructure

1. Bootstrap CDK (first time only):

   ```bash
   cd infrastructure
   npm install
   npx cdk bootstrap
   cd ..
   ```

2. Deploy all infrastructure stacks:

   ```bash
   ./scripts/deployment/deploy-infrastructure.sh
   ```

   This will create:
   - VPC with public/private subnets
   - ECR repository
   - ECS cluster and service
   - Application Load Balancer
   - Security groups
   - IAM roles
   - CloudWatch log groups
   - Secrets Manager secret

3. Note the outputs from CDK deployment:
   - Load Balancer DNS name
   - ECR repository URI
   - ECS cluster and service names

### Step 3: Update Secrets

1. Update AWS Secrets Manager with your actual secrets:

   ```bash
   ./scripts/deployment/update-secrets.sh
   ```

   This stores sensitive environment variables in AWS Secrets Manager.

### Step 4: Build and Deploy Application

1. Build Docker image and push to ECR:

   ```bash
   ./scripts/deployment/build-and-push.sh
   ```

2. Update ECS service to use the new image:

   ```bash
   ./scripts/deployment/update-ecs-service.sh
   ```

   Or use the combined script:

   ```bash
   ./scripts/deployment/deploy-app.sh
   ```

3. Wait for deployment to complete (2-5 minutes)

### Step 5: DNS Configuration

#### Option A: Using Route 53

1. Create hosted zone in Route 53 (if not exists)
2. Uncomment Route 53 code in `infrastructure/lib/loadbalancer-stack.ts`
3. Redeploy infrastructure:
   ```bash
   ./scripts/deployment/deploy-infrastructure.sh
   ```

#### Option B: External DNS Provider

1. Get the Load Balancer DNS name from CDK outputs:

   ```bash
   aws cloudformation describe-stacks \
     --stack-name YogaGoLoadBalancerStack \
     --query 'Stacks[0].Outputs'
   ```

2. Create CNAME records in your DNS provider:
   - `yogago.com` → `<alb-dns-name>`
   - `kavithayoga.com` → `<alb-dns-name>`

### Step 6: SSL/TLS Certificate Setup

1. Request certificate in AWS Certificate Manager:

   ```bash
   aws acm request-certificate \
     --domain-name yogago.com \
     --subject-alternative-names kavithayoga.com \
     --validation-method DNS \
     --region us-east-1
   ```

2. Add DNS validation records provided by ACM to your DNS

3. Wait for certificate validation (can take up to 30 minutes)

4. Uncomment HTTPS listener code in `infrastructure/lib/loadbalancer-stack.ts`

5. Update the certificate ARN and redeploy:
   ```bash
   ./scripts/deployment/deploy-infrastructure.sh
   ```

## Testing

### Test Load Balancer

1. Get Load Balancer DNS:

   ```bash
   aws elbv2 describe-load-balancers \
     --query 'LoadBalancers[0].DNSName' \
     --output text
   ```

2. Test HTTP endpoint:

   ```bash
   curl http://<alb-dns-name>/api/health
   ```

3. Test with host headers:

   ```bash
   # Primary domain
   curl -H "Host: yogago.com" http://<alb-dns-name>/

   # Expert domain
   curl -H "Host: kavithayoga.com" http://<alb-dns-name>/
   ```

### Test Domain Routing

Once DNS is configured:

```bash
# Should show main landing page
curl https://yogago.com/

# Should show Kavitha's expert page
curl https://kavithayoga.com/
```

## Monitoring

### CloudWatch Logs

View application logs:

```bash
aws logs tail /ecs/yoga-go --follow
```

### ECS Service Status

Check service health:

```bash
aws ecs describe-services \
  --cluster yoga-go-cluster \
  --services yoga-go-service
```

### Load Balancer Health Checks

View target health:

```bash
aws elbv2 describe-target-health \
  --target-group-arn <target-group-arn>
```

## Updating the Application

### Deploy New Version

1. Make code changes
2. Run deployment script:
   ```bash
   ./scripts/deployment/deploy-app.sh v1.2.3
   ```

This will:

- Build new Docker image with tag `v1.2.3`
- Push to ECR
- Force new ECS deployment
- Wait for deployment to stabilize

### Rollback

To rollback to a previous version:

1. Find previous image tag:

   ```bash
   aws ecr list-images \
     --repository-name yoga-go \
     --query 'imageIds[*].imageTag'
   ```

2. Update task definition to use old image
3. Force new deployment

## Cost Optimization

### Free Tier Eligible

- ECS Fargate: 20GB storage + 10GB transfer/month
- ALB: 750 hours/month (first 12 months)
- ECR: 500MB storage (first 12 months)
- CloudWatch Logs: 5GB ingestion

### Not Free Tier

- NAT Gateway: ~$32/month ($0.045/hour)
- Secrets Manager: $0.40/secret/month
- Route 53 hosted zone: $0.50/month

### Cost Reduction Tips

1. **Remove NAT Gateway for dev**: Use public subnets
2. **Use SSM Parameter Store**: Instead of Secrets Manager (free)
3. **Reduce log retention**: Use 1 week instead of longer periods
4. **Stop services when not in use**: Delete ECS service for dev environments

## Troubleshooting

### Container Won't Start

1. Check CloudWatch logs:

   ```bash
   aws logs tail /ecs/yoga-go --follow
   ```

2. Verify environment variables in Secrets Manager

3. Check security groups allow outbound traffic

### Load Balancer Health Check Failing

1. Verify `/api/health` endpoint is accessible
2. Check security group rules
3. Verify container port mapping (3000)

### DNS Not Resolving

1. Check DNS propagation (can take up to 48 hours)
2. Verify CNAME/A records are correct
3. Test with `dig` or `nslookup`:
   ```bash
   dig yogago.com
   nslookup kavithayoga.com
   ```

### HTTPS Not Working

1. Verify certificate is validated in ACM
2. Check HTTPS listener is configured
3. Verify security group allows port 443

## Cleanup

To delete all AWS resources:

```bash
cd infrastructure
npm run destroy
```

⚠️ **Warning**: This will delete all resources including the ECR repository and container images!

## Additional Resources

- [AWS ECS Documentation](https://docs.aws.amazon.com/ecs/)
- [AWS CDK Documentation](https://docs.aws.amazon.com/cdk/)
- [Next.js Deployment](https://nextjs.org/docs/deployment)
- [Docker Best Practices](https://docs.docker.com/develop/dev-best-practices/)

## Support

For issues or questions:

1. Check CloudWatch logs
2. Review AWS service status
3. Verify all environment variables are set correctly
4. Check security group and network configurations
