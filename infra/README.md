# Infrastructure (CDK)

AWS CDK infrastructure for YogaGo, Cally, and Calel services. Hosted on Vercel, backed by AWS (Cognito, DynamoDB, SES, Lambda, S3).

## Environments

| | Production (`myg-prod`) | Dev (`myg`) |
|---|---|---|
| AWS Account | `439226423565` | `710735877057` |
| Yoga Cognito | `secure.myyoga.guru` | `login.myyoga.guru` |
| Cally Cognito | `secure.callygo.com` | `login.callygo.com` |
| Hosting | Vercel (production domains) | Vercel (preview URLs) |

CDK defaults to `secure.*` subdomains (production). For dev, override with `-c cognitoSubdomain=login -c callySubdomain=login`.

## Stacks

| Stack | Region | Description |
|-------|--------|-------------|
| CognitoCertStack | us-east-1 | ACM certificate for Yoga Cognito custom domain |
| CallyCertStack | us-east-1 | ACM certificate for Cally Cognito custom domain |
| YogaGoStack | ap-southeast-2 | Cognito, DynamoDB, Lambda for yoga app |
| YogaGoSesStack | us-west-2 | SES email sending/receiving, Lambda |
| CalelStack | ap-southeast-2 | Calendar/scheduling service (DynamoDB, SQS) |
| CallyStack | ap-southeast-2 | Cally Cognito, DynamoDB, Lambda, S3 |

## Prerequisites

- Node.js 20+
- AWS CLI configured with `myg` (dev) and `myg-prod` (production) profiles
- AWS CDK CLI: `npm install -g aws-cdk`
- CDK bootstrapped in all 3 regions per account

## Setup

```bash
cd infra
npm install
```

## Deployment Order

Stacks must be deployed in this order due to dependencies:

```
1. CognitoCertStack + CallyCertStack  (parallel, us-east-1)
   | (add DNS validation CNAMEs in Vercel, wait for "Issued")
2. YogaGoStack  (needs cognitoCertificateArn)
   |
3. YogaGoSesStack  (needs yoga-go-emails table to exist)
4. CalelStack  (independent)
5. CallyStack  (needs callyCertificateArn + emailsStreamArn)
```

## Deploying to Production

### Pre-create SES identity (required before YogaGoStack)

```bash
aws sesv2 create-email-identity --email-identity myyoga.guru --region us-west-2 --profile myg-prod
```

### Deploy stacks

```bash
# 1. Certificate stacks (deploy together)
npx cdk deploy CognitoCertStack CallyCertStack --profile myg-prod
# -> Add DNS validation CNAMEs in Vercel, wait for "Issued"

# 2. YogaGoStack
npx cdk deploy YogaGoStack \
  -c cognitoCertificateArn=<ARN> \
  --profile myg-prod

# 3. Delete pre-created SES identity, then deploy SES stack
aws sesv2 delete-email-identity --email-identity myyoga.guru --region us-west-2 --profile myg-prod
npx cdk deploy YogaGoSesStack --profile myg-prod

# 4. CalelStack
npx cdk deploy CalelStack --profile myg-prod

# 5. CallyStack
EMAILS_STREAM_ARN=$(aws dynamodb describe-table --table-name yoga-go-emails \
  --query 'Table.LatestStreamArn' --output text --profile myg-prod)
npx cdk deploy CallyStack \
  -c callyCertificateArn=<ARN> \
  -c emailsStreamArn=$EMAILS_STREAM_ARN \
  --profile myg-prod
```

### Deploying to Dev

```bash
npx cdk deploy <StackName> \
  -c cognitoSubdomain=login \
  -c callySubdomain=login \
  --profile myg
```

## Post-Deployment Checklist

1. **DNS (Vercel)**: Add CNAME records for Cognito custom domains pointing to CloudFront (from stack outputs)
2. **DNS (Vercel)**: Add DKIM CNAMEs for SES email identities
3. **Secrets Manager**: Update `yoga-go/production` and `cally/production` with real OAuth credentials
4. **Cognito IdP**: If secrets were updated after stack deploy, manually update Cognito Google Identity Provider
5. **IAM access keys**: Create keys for `yoga-go-vercel`, `cally-vercel`, `calel-vercel`
6. **Vercel env vars**: Set per-scope (Production vs Preview/Development)
7. **Google Cloud Console**: Add `https://secure.{domain}/oauth2/idpresponse` to authorized redirect URIs
8. **SES**: Request production access if account is in sandbox mode
9. **SES**: Activate receipt rule set in SES console for inbound email

## Vercel Environment Variables

Env vars must be scoped by environment in Vercel:

| Env Var | Production | Preview/Development |
|---------|-----------|-------------------|
| `AWS_ACCESS_KEY_ID` | prod IAM key | dev IAM key |
| `AWS_SECRET_ACCESS_KEY` | prod IAM secret | dev IAM secret |
| `COGNITO_USER_POOL_ID` | prod pool ID | dev pool ID |
| `COGNITO_CLIENT_ID` | prod client ID | dev client ID |
| `COGNITO_CLIENT_SECRET` | prod client secret | dev client secret |
| `COGNITO_DOMAIN` | `secure.{domain}` | `login.{domain}` |
| `EDGE_AWS_*` | prod keys | dev keys |

## Gotchas

### NEXTAUTH_URL must stay as `http://localhost:3113`

Auth.js v5 uses `NEXTAUTH_URL` to determine cookie name prefixes. When set to `https://...`, it prefixes session cookies with `__Secure-`. However, the custom OAuth callback routes (Google login, subscriber signin, Cognito login) set cookies as `authjs.session-token` without the prefix. This mismatch causes 401 errors on all authenticated API calls. Keep `NEXTAUTH_URL=http://localhost:3113` for all Vercel environments. The `trustHost: true` setting in `auth.ts` handles host detection independently.

### NEXT_PUBLIC_* env vars — avoid trailing newlines

When setting Vercel env vars, ensure values don't contain trailing `\n` characters. `NEXT_PUBLIC_*` vars are embedded at build time, so a trailing newline in `NEXT_PUBLIC_DOMAIN` will corrupt URLs (e.g., OAuth redirect URIs) causing `redirect_mismatch` errors from Cognito. Use `printf` instead of `echo` when piping:

```bash
printf 'callygo.com' | npx vercel env add NEXT_PUBLIC_DOMAIN production
```

### SES identity must be pre-created before YogaGoStack

YogaGoStack's Cognito `withSES` configuration requires a verified SES domain. Pre-create it in us-west-2, then delete it before deploying SesStack (which manages it via CDK).

### DynamoDB tables are retained on stack deletion

Tables use `RemovalPolicy.RETAIN`. When redeploying from scratch, manually delete all retained tables first, otherwise CDK will fail with "Table already exists".

### CDK synth lock

Do not run multiple `cdk` commands in parallel from the same directory. CDK locks `cdk.out` during synthesis.

### Cognito custom domain deletion is slow

Deleting a stack with a Cognito custom domain takes ~20 minutes due to CloudFront distribution decommissioning.
