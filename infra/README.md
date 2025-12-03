# Infrastructure (CDK)

AWS CDK infrastructure for the monorepo applications.

## Architecture

```
                    ┌─────────────────────────────────────────────────────────────┐
                    │                     ALB (Shared)                            │
                    │   HTTPS :443 with host-based routing                        │
                    └─────────────┬─────────────────────────────┬─────────────────┘
                                  │                             │
           myyoga.guru            │                             │  app-two.example.com
                                  ▼                             ▼
                    ┌─────────────────────────┐   ┌─────────────────────────┐
                    │  Target Group: yoga-go  │   │  Target Group: app-two  │
                    │  Port: 3000             │   │  Port: 3001             │
                    └──────────┬──────────────┘   └──────────┬──────────────┘
                               │                             │
                               ▼                             ▼
                    ┌──────────────────────────────────────────────────────────────┐
                    │              EC2 Instance (t3.micro - shared)                 │
                    │  ┌────────────────────┐    ┌────────────────────────────┐    │
                    │  │ ECS Task: yoga-go  │    │     ECS Task: app-two      │    │
                    │  │ Port: 3000         │    │     Port: 3001             │    │
                    │  └────────────────────┘    └────────────────────────────┘    │
                    └──────────────────────────────────────────────────────────────┘
```

## Stacks

| Stack | Description |
|-------|-------------|
| **SharedInfraStack** | VPC, ALB, ECS Cluster, EC2, Security Groups, ACM Certificates |
| **YogaGoStack** | ECR, ECS Service, Cognito, DynamoDB, SES, Route53 |
| **AppTwoStack** | ECR, ECS Service (minimal placeholder) |

## Prerequisites

- Node.js 20+
- AWS CLI configured with `myg` profile
- AWS CDK CLI installed globally: `npm install -g aws-cdk`

## Setup

```bash
cd infra
npm install
```

## Commands

```bash
# From monorepo root
npm run infra:synth              # Synth all stacks
npm run infra:synth:shared       # Synth SharedInfraStack only
npm run infra:synth:yoga-go      # Synth YogaGoStack only
npm run infra:synth:app-two      # Synth AppTwoStack only

npm run infra:diff               # Show changes
npm run infra:deploy:shared      # Deploy SharedInfraStack
npm run infra:deploy:yoga-go     # Deploy YogaGoStack
npm run infra:deploy:app-two     # Deploy AppTwoStack
```

## Deployment Order

**Important**: SharedInfraStack must be deployed first.

```bash
npm run infra:deploy:shared      # First
npm run infra:deploy:yoga-go     # Then app stacks
npm run infra:deploy:app-two
```

---

## Adding a New App

### Step 1: Add domain to SharedInfraStack

Edit `infra/bin/app.ts` and add your domain:

```typescript
appDomains: [
  { domain: 'myyoga.guru', alternativeDomains: ['*.myyoga.guru'] },
  { domain: 'app-two.example.com', alternativeDomains: ['*.app-two.example.com'] },
  // Add your new app domain:
  { domain: 'newapp.com', alternativeDomains: ['*.newapp.com'] },
],
```

### Step 2: Create app stack

Copy `infra/lib/app-two-stack.ts` to `infra/lib/newapp-stack.ts` and modify:

- Change class name to `NewAppStack`
- Update ECR repository name
- Update ECS service name, task family
- Update container port if needed
- Add any app-specific resources (Cognito, DynamoDB, etc.)

### Step 3: Add stack to bin/app.ts

```typescript
import { NewAppStack } from '../lib/newapp-stack';

const newAppStack = new NewAppStack(app, 'NewAppStack', {
  description: 'New App infrastructure',
  env,
  tags: { Application: 'NewApp', Environment: 'production', ManagedBy: 'CDK' },
  sharedInfra,
  listenerRulePriority: 30, // Must be unique (yoga-go=10, app-two=20)
  hostHeaders: ['newapp.com', 'www.newapp.com'],
});

newAppStack.addDependency(sharedInfra);
```

### Step 4: Create Next.js app

```bash
mkdir -p apps/newapp
# Copy apps/app-two as template
cp -r apps/app-two/* apps/newapp/
# Update package.json: name, port
# Update Dockerfile: port, paths
```

### Step 5: Add root scripts

Edit root `package.json`:

```json
{
  "scripts": {
    "dev:newapp": "npm run dev -w newapp",
    "build:newapp": "npm run build -w newapp",
    "infra:synth:newapp": "cd infra && npx cdk synth NewAppStack --profile myg",
    "infra:deploy:newapp": "cd infra && npx cdk deploy NewAppStack --profile myg"
  }
}
```

### Step 6: Create GitHub Actions workflow

Copy `.github/workflows/deploy-app-two.yml` to `.github/workflows/deploy-newapp.yml` and update:
- Workflow name
- Path filters (`apps/newapp/**`)
- ECR_REPOSITORY, CLUSTER_NAME, SERVICE_NAME

### Step 7: Deploy

```bash
# First, update shared infra (adds new certificate)
npm run infra:deploy:shared

# Then deploy the new app
npm run infra:deploy:newapp
```

### Step 8: Configure DNS

After deployment, update your domain registrar's nameservers to point to Route53.
Or create CNAME/ALIAS records pointing to the shared ALB DNS name.

---

## Listener Rule Priorities

| App | Priority |
|-----|----------|
| yoga-go | 10 |
| app-two | 20 |
| (new apps) | 30, 40, 50... |

Lower number = higher precedence. Keep gaps for flexibility.

## Free Tier Considerations

- **EC2**: Single t3.micro shared by all apps (750 hours/month)
- **ALB**: Single ALB shared by all apps (750 hours/month, 15 LCUs)
- **ECR**: 500 MB per repo, lifecycle policies limit images
- **DynamoDB**: On-demand billing (pay per request)
- **CloudWatch Logs**: 1-week retention

## Security

- **Image scanning**: Automatically scans for CVEs on push
- **HTTPS**: All traffic via ACM certificates
- **IAM**: Least-privilege roles for ECS tasks
- **Security Groups**: Traffic restricted to ALB and SSH only
