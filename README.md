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

### Domain Configuration

Two domains are managed, each with a Cognito custom domain for authentication:

| Domain        | App     | Cognito Subdomain (Dev) | Cognito Subdomain (Prod) |
| ------------- | ------- | ----------------------- | ------------------------ |
| `myyoga.guru` | Yoga Go | `login.myyoga.guru`     | `secure.myyoga.guru`     |
| `callygo.com` | Cally   | `login.callygo.com`     | `secure.callygo.com`     |

The subdomain is controlled via context params:

```bash
# Dev (profile: myg)
-c cognitoSubdomain=login -c callySubdomain=login

# Prod (profile: myg-prod) - defaults to "secure", no override needed
```

DNS for both domains is managed in Vercel.

### Context Parameters (always required)

CDK synthesizes ALL stacks even when deploying just one. Some stacks throw errors if context params are missing. Always pass all required context params (use `placeholder` for values you don't have yet):

```bash
# Required for every cdk command (deploy, synth, diff, etc.)
-c cognitoCertificateArn=<ARN_or_placeholder> \
-c callyCertificateArn=<ARN_or_placeholder> \
-c emailsStreamArn=<ARN_or_placeholder> \
-c cognitoSubdomain=login \
-c callySubdomain=login
```

### CDK Stacks Overview

| Stack              | Region         | Purpose                                        | Depends on                                  |
| ------------------ | -------------- | ---------------------------------------------- | ------------------------------------------- |
| `CognitoCertStack` | us-east-1      | ACM certificate for `login.myyoga.guru`        | -                                           |
| `CallyCertStack`   | us-east-1      | ACM certificate for `login.callygo.com`        | -                                           |
| `YogaGoStack`      | ap-southeast-2 | Yoga Go: Cognito, DynamoDB, Lambdas            | CognitoCertStack, SES identity in us-west-2 |
| `YogaGoSesStack`   | us-west-2      | SES email sending and receiving (both domains) | YogaGoStack                                 |
| `CalelStack`       | ap-southeast-2 | Calendar & scheduling service (standalone)     | -                                           |
| `CallyStack`       | ap-southeast-2 | Cally: Cognito, DynamoDB, Lambdas              | CallyCertStack, YogaGoStack (emails stream) |

### Fresh AWS Account Setup

**Prerequisites:**

- AWS CLI configured with appropriate credentials
- Node.js and npm installed
- CDK CLI installed (`npm install -g aws-cdk`)
- Both domains (`myyoga.guru`, `callygo.com`) DNS managed in Vercel

**Step 1: Bootstrap CDK (one-time per account/region)**

```bash
npx cdk bootstrap \
  aws://<ACCOUNT_ID>/ap-southeast-2 \
  aws://<ACCOUNT_ID>/us-east-1 \
  aws://<ACCOUNT_ID>/us-west-2 \
  -c cognitoCertificateArn=placeholder \
  -c callyCertificateArn=placeholder \
  -c emailsStreamArn=placeholder \
  -c cognitoSubdomain=login -c callySubdomain=login \
  --profile myg
```

**Step 2: Pre-create SES email identity in us-west-2**

Cognito User Pool requires a verified SES identity in us-west-2 (for sending verification emails). This must exist BEFORE deploying YogaGoStack, but the SesStack that normally manages it depends on YogaGoStack's tables. Break the chicken-and-egg by creating it manually first:

```bash
aws sesv2 create-email-identity \
  --email-identity myyoga.guru --region us-west-2 --profile myg
```

If DKIM DNS records for `myyoga.guru` already exist in Vercel DNS (from a previous deployment), the identity will auto-verify. Otherwise, add the 3 CNAME records:

```bash
aws sesv2 get-email-identity \
  --email-identity myyoga.guru --region us-west-2 --profile myg \
  --query 'DkimAttributes.Tokens'
```

Each token becomes a CNAME: `<token>._domainkey.myyoga.guru` -> `<token>.dkim.amazonses.com`

**Step 3: Deploy Certificate Stacks (us-east-1)**

Both Cognito custom domains require ACM certificates in us-east-1. Deploy them together:

```bash
# Deploy both cert stacks (use --output to avoid lock conflicts)
npx cdk deploy CognitoCertStack \
  -c cognitoCertificateArn=placeholder \
  -c callyCertificateArn=placeholder \
  -c emailsStreamArn=placeholder \
  -c cognitoSubdomain=login -c callySubdomain=login \
  --require-approval never --profile myg

npx cdk deploy CallyCertStack \
  -c cognitoCertificateArn=placeholder \
  -c callyCertificateArn=placeholder \
  -c emailsStreamArn=placeholder \
  -c cognitoSubdomain=login -c callySubdomain=login \
  --require-approval never --profile myg \
  --output cdk-cally-cert.out
```

After deployment:

1. Note the Certificate ARN and DNS validation CNAME from each stack's output
2. Add both DNS validation CNAMEs to Vercel DNS
3. Wait for both certificates to show "Issued" (can take 5-30 minutes)

> **CAA Record Required**: If deploying to `callygo.com` for the first time, add a CAA record: `CAA 0 issue "amazon.com"`. Without this, ACM certificate issuance will fail immediately. `myyoga.guru` typically doesn't need this if it already has permissive CAA records.

**Step 4: Deploy YogaGoStack (ap-southeast-2)**

Creates Cognito User Pool (with `login.myyoga.guru` custom domain), DynamoDB tables, Lambdas. The `yoga-go/production` secret is auto-created with placeholder values.

```bash
npx cdk deploy YogaGoStack \
  -c cognitoCertificateArn=<COGNITO_CERT_ARN> \
  -c callyCertificateArn=placeholder \
  -c emailsStreamArn=placeholder \
  -c cognitoSubdomain=login -c callySubdomain=login \
  --require-approval never --profile myg
```

After deployment:

1. Note `CognitoCloudFrontDomain` from stack output
2. Add CNAME to Vercel DNS: `login` (under myyoga.guru) -> `<cloudfront-domain>.cloudfront.net`
3. Update the secret with real values:

```bash
aws secretsmanager put-secret-value \
  --secret-id yoga-go/production \
  --region ap-southeast-2 --profile myg \
  --secret-string '{"GOOGLE_CLIENT_ID":"...","GOOGLE_CLIENT_SECRET":"...","FACEBOOK_APP_ID":"...","FACEBOOK_APP_SECRET":"...","DEBOUNCE_API_KEY":"..."}'
```

**Step 5: Delete pre-created SES identity, then deploy SES Stack (us-west-2)**

IMPORTANT: Delete the manually-created identity first so CDK can manage it:

```bash
aws sesv2 delete-email-identity \
  --email-identity myyoga.guru --region us-west-2 --profile myg
```

Then deploy (SesStack creates SES identities for both `myyoga.guru` and `callygo.com`):

```bash
npx cdk deploy YogaGoSesStack \
  -c cognitoCertificateArn=<COGNITO_CERT_ARN> \
  -c callyCertificateArn=placeholder \
  -c emailsStreamArn=placeholder \
  -c cognitoSubdomain=login -c callySubdomain=login \
  --require-approval never --profile myg
```

After deployment:

1. Add DKIM CNAME records for `callygo.com` to Vercel DNS (3 records, same pattern as myyoga.guru)
2. Activate the receipt rule set:

```bash
aws ses set-active-receipt-rule-set \
  --rule-set-name yoga-go-inbound --region us-west-2 --profile myg
```

**Step 6: Deploy CalelStack (ap-southeast-2, standalone)**

```bash
npx cdk deploy CalelStack \
  -c cognitoCertificateArn=placeholder \
  -c callyCertificateArn=placeholder \
  -c emailsStreamArn=placeholder \
  -c cognitoSubdomain=login -c callySubdomain=login \
  --require-approval never --profile myg
```

**Step 7: Deploy CallyStack (ap-southeast-2)**

Depends on CallyCertStack (for `login.callygo.com` cert) and YogaGoStack (for `yoga-go-emails` stream).

```bash
# 1. Get the yoga-go-emails stream ARN
aws dynamodb describe-table \
  --table-name yoga-go-emails \
  --query 'Table.LatestStreamArn' \
  --output text \
  --region ap-southeast-2 --profile myg

# 2. Deploy with both cert ARN and stream ARN
npx cdk deploy CallyStack \
  -c cognitoCertificateArn=<COGNITO_CERT_ARN> \
  -c callyCertificateArn=<CALLY_CERT_ARN> \
  -c emailsStreamArn=<STREAM_ARN> \
  -c cognitoSubdomain=login -c callySubdomain=login \
  --require-approval never --profile myg
```

After deployment:

1. Note `CognitoCloudFrontDomain` from stack output
2. Add CNAME to Vercel DNS: `login` (under callygo.com) -> `<cloudfront-domain>.cloudfront.net`
3. Update secret:

```bash
aws secretsmanager put-secret-value \
  --secret-id cally/production \
  --region ap-southeast-2 --profile myg \
  --secret-string '{"GOOGLE_CLIENT_ID":"...","GOOGLE_CLIENT_SECRET":"..."}'
```

**Step 8: Post-deployment setup**

1. Create IAM access keys for `yoga-go-vercel`, `cally-vercel`, and `calel-vercel` users
2. Update Vercel environment variables with Cognito User Pool IDs, Client IDs, and domain
3. Update Google OAuth redirect URIs to include `login.callygo.com/oauth2/idpresponse`
4. Verify both domains' SES DKIM records and email identities are verified
5. **Update Cognito Google Identity Provider** - CDK creates the Google IdP with placeholder values from the secret. Updating the secret does NOT retroactively update the Cognito IdP. After setting real values in the secret, run:

```bash
# For each user pool, update the Google IdP with real credentials:
CREDS=$(aws secretsmanager get-secret-value --secret-id <secret-name> --region ap-southeast-2 --profile myg --query 'SecretString' --output text)
GCID=$(echo "$CREDS" | python3 -c "import sys,json; print(json.load(sys.stdin)['GOOGLE_CLIENT_ID'])")
GCSECRET=$(echo "$CREDS" | python3 -c "import sys,json; print(json.load(sys.stdin)['GOOGLE_CLIENT_SECRET'])")

aws cognito-idp update-identity-provider \
  --user-pool-id <POOL_ID> --provider-name Google \
  --provider-details "{\"client_id\":\"$GCID\",\"client_secret\":\"$GCSECRET\",\"authorize_scopes\":\"email profile openid\",\"authorize_url\":\"https://accounts.google.com/o/oauth2/v2/auth\",\"token_url\":\"https://www.googleapis.com/oauth2/v4/token\",\"token_request_method\":\"POST\",\"oidc_issuer\":\"https://accounts.google.com\",\"attributes_url\":\"https://people.googleapis.com/v1/people/me?personFields=\",\"attributes_url_add_attributes\":\"true\"}" \
  --region ap-southeast-2 --profile myg
```

### Troubleshooting & Lessons Learned

**Cognito custom domain stuck after failed deploy:**
When a Cognito custom domain (e.g., `login.myyoga.guru`) is created, it provisions a CloudFront distribution under the hood. If the stack rolls back, the user pool is deleted (RETAIN) but the domain-to-CloudFront association persists globally for 30-60+ minutes. Each failed retry creates a NEW user pool that briefly grabs the domain, potentially resetting the release timer. **Fix**: Use a different subdomain (e.g., switch from `auth` to `login`), or wait 60+ minutes without retrying.

**Failed deployments leave orphaned resources:**
DynamoDB tables and Cognito user pools with `RETAIN` removal policy survive stack rollback. After a `ROLLBACK_COMPLETE`:

1. Delete the failed CloudFormation stack
2. Manually delete all orphaned DynamoDB tables and Cognito user pools
3. Only then redeploy

```bash
# Delete failed stack
aws cloudformation delete-stack --stack-name YogaGoStack --region ap-southeast-2 --profile myg
aws cloudformation wait stack-delete-complete --stack-name YogaGoStack --region ap-southeast-2 --profile myg

# Find and delete orphaned resources
aws dynamodb list-tables --region ap-southeast-2 --profile myg
aws dynamodb delete-table --table-name <orphaned-table> --region ap-southeast-2 --profile myg
aws cognito-idp list-user-pools --max-results 20 --region ap-southeast-2 --profile myg
aws cognito-idp delete-user-pool --user-pool-id <orphaned-pool-id> --region ap-southeast-2 --profile myg
```

**ACM certificate fails immediately for callygo.com:**
Symptom: `DNS Record Set is not available. Certificate is in FAILED status.`
Cause: Missing CAA (Certificate Authority Authorization) DNS record.
Fix: Add `CAA 0 issue "amazon.com"` to callygo.com DNS in Vercel before deploying CallyCertStack.

**SES receipt rule set can't be deleted:**
Symptom: `Cannot delete active rule set: yoga-go-inbound`
Fix: Deactivate the rule set first (pass no name), then delete individual rules, then the rule set:

```bash
aws ses set-active-receipt-rule-set --region us-west-2 --profile myg  # deactivate
aws ses delete-receipt-rule --rule-set-name yoga-go-inbound --rule-name <rule-name> --region us-west-2 --profile myg
aws ses delete-receipt-rule-set --rule-set-name yoga-go-inbound --region us-west-2 --profile myg
```

**CDK lock conflict when deploying two stacks simultaneously:**
Symptom: `Other CLIs are currently reading from cdk.out`
Fix: Use `--output cdk-other.out` for the second deploy command.

**SES identity chicken-and-egg:**
YogaGoStack needs a verified SES identity in us-west-2, but SesStack (which manages it) depends on YogaGoStack's DynamoDB tables. Solution: Pre-create the SES identity manually (Step 2), deploy YogaGoStack, delete the manual identity, then deploy SesStack so CDK can manage it going forward.

### Important Notes

- **Context parameters are always required** - CDK synths all stacks, so always pass all `-c` params (use `placeholder` for values you don't have yet)
- **S3 bucket names and Cognito domain prefixes are globally unique** - The CDK code uses account ID suffixes to avoid conflicts
- All AWS resources are managed via CDK - avoid creating resources manually via CLI or Console (except the SES pre-creation in Step 2)
- For dev environment, use profile `myg` with `-c cognitoSubdomain=login -c callySubdomain=login`
- For prod environment, use profile `myg-prod` (defaults to `secure` subdomain)

### AWS Secrets

Two secrets are auto-created by CDK with placeholder values. Update them with real credentials after deployment:

| Secret                     | Region         | Keys                                                           |
| -------------------------- | -------------- | -------------------------------------------------------------- |
| `yoga-go/production`       | ap-southeast-2 | `GOOGLE_CLIENT_ID`, `GOOGLE_CLIENT_SECRET`, `DEBOUNCE_API_KEY` |
| `cally/production`         | ap-southeast-2 | `GOOGLE_CLIENT_ID`, `GOOGLE_CLIENT_SECRET`                     |
| `yoga-go/smtp-credentials` | us-west-2      | Auto-populated by CDK (SMTP user for SES)                      |

```bash
# Update a secret
aws secretsmanager put-secret-value \
  --secret-id yoga-go/production \
  --region ap-southeast-2 --profile myg \
  --secret-string '{"GOOGLE_CLIENT_ID":"...","GOOGLE_CLIENT_SECRET":"...","DEBOUNCE_API_KEY":"..."}'
```

### Vercel Deployment

Both apps (yoga, cally) are deployed to Vercel. Each Vercel project needs these environment variables:

**Common (both apps):**

| Variable                     | Value                     | Notes                                                     |
| ---------------------------- | ------------------------- | --------------------------------------------------------- |
| `EDGE_AWS_ACCESS_KEY_ID`     | From IAM access key       | CDK creates `yoga-go-vercel` and `cally-vercel` IAM users |
| `EDGE_AWS_SECRET_ACCESS_KEY` | From IAM access key       |                                                           |
| `EDGE_AWS_REGION`            | `ap-southeast-2`          |                                                           |
| `COGNITO_USER_POOL_ID`       | From stack output         | e.g., `ap-southeast-2_xxxxx`                              |
| `COGNITO_CLIENT_ID`          | From stack output         |                                                           |
| `COGNITO_CLIENT_SECRET`      | From Cognito console      | Retrieve via `aws cognito-idp describe-user-pool-client`  |
| `COGNITO_DOMAIN`             | Custom domain             | `login.myyoga.guru` or `login.callygo.com`                |
| `GOOGLE_CLIENT_ID`           | From Google Cloud Console |                                                           |
| `GOOGLE_CLIENT_SECRET`       | From Google Cloud Console |                                                           |

```bash
# Create IAM access keys for Vercel users
aws iam create-access-key --user-name yoga-go-vercel --profile myg
aws iam create-access-key --user-name cally-vercel --profile myg

# Get Cognito client secret
aws cognito-idp describe-user-pool-client \
  --user-pool-id <POOL_ID> --client-id <CLIENT_ID> \
  --region ap-southeast-2 --profile myg \
  --query 'UserPoolClient.ClientSecret' --output text
```

### Google Cloud Console

After deploying Cognito with custom domains, update OAuth clients in Google Cloud Console:

1. Go to **APIs & Credentials > OAuth 2.0 Client IDs**
2. For each OAuth client (yoga, cally), update:

**Authorized JavaScript origins:**

- `https://login.myyoga.guru` (yoga) / `https://login.callygo.com` (cally)

**Authorized redirect URIs:**

- `https://login.myyoga.guru/oauth2/idpresponse` (yoga)
- `https://login.callygo.com/oauth2/idpresponse` (cally)
- Keep existing localhost and Vercel preview URLs

### Tearing Down Stacks

When destroying stacks, follow reverse deployment order. Key gotchas:

1. **Deactivate SES receipt rule set before deleting SesStack:**

   ```bash
   aws ses set-active-receipt-rule-set --region us-west-2 --profile myg
   ```

2. **Cognito custom domains take 30-60+ min to release globally** after stack deletion (CloudFront teardown). Wait before redeploying with the same domain.

3. **RETAIN resources survive stack deletion** - manually delete orphaned DynamoDB tables, Cognito pools, and S3 buckets between teardown and redeploy.
