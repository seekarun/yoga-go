# AWS Infrastructure Setup Guide

This guide documents how to set up the AWS infrastructure for a new environment/domain.

## Prerequisites

1. **AWS Profile**: Configure AWS CLI with a profile (e.g., `myg-prod`)
2. **Domain**: A domain name (e.g., `reelzai.com`) configured in Vercel DNS
3. **OAuth Credentials**: Google and Facebook app credentials

## Pre-Deployment Setup

### 1. Configure Domain in Vercel

1. Add domain to Vercel project
2. Update nameservers at domain registrar to point to Vercel
3. Add CAA record for Amazon (Vercel adds Let's Encrypt by default):
   ```
   CAA  0 issue "amazon.com"
   ```

### 2. Configure OAuth Providers

**Google Cloud Console:**
1. Go to APIs & Services > Credentials
2. Edit your OAuth 2.0 Client
3. Add Authorized redirect URI: `https://signin.<domain>/oauth2/idpresponse`

**Facebook Developer Console:**
1. Go to your app settings
2. Add Valid OAuth Redirect URI: `https://signin.<domain>/oauth2/idpresponse`

### 3. Create Secrets in AWS Secrets Manager

The YogaGoStack requires OAuth credentials stored in Secrets Manager.
**This must be done BEFORE deploying YogaGoStack.**

```bash
AWS_PROFILE=myg-prod aws secretsmanager create-secret \
  --name "yoga-go/production" \
  --region ap-southeast-2 \
  --secret-string '{
    "GOOGLE_CLIENT_ID": "your-google-client-id.apps.googleusercontent.com",
    "GOOGLE_CLIENT_SECRET": "your-google-secret",
    "FACEBOOK_APP_ID": "your-facebook-app-id",
    "FACEBOOK_APP_SECRET": "your-facebook-secret"
  }'
```

## CDK Bootstrap

Bootstrap all required regions before deploying stacks:

```bash
# Get your AWS account ID
AWS_ACCOUNT=$(AWS_PROFILE=myg-prod aws sts get-caller-identity --query Account --output text)

# Bootstrap us-east-1 (for CognitoCertStack - ACM certificates)
AWS_PROFILE=myg-prod npx cdk bootstrap aws://$AWS_ACCOUNT/us-east-1

# Bootstrap ap-southeast-2 (for YogaGoStack, CalelStack)
AWS_PROFILE=myg-prod npx cdk bootstrap aws://$AWS_ACCOUNT/ap-southeast-2

# Bootstrap us-west-2 (for YogaGoSesStack - email receiving)
AWS_PROFILE=myg-prod npx cdk bootstrap aws://$AWS_ACCOUNT/us-west-2
```

## Deployment Order

**IMPORTANT:** Stacks must be deployed in this order due to dependencies.

### Step 1: Deploy CognitoCertStack (us-east-1)

Creates ACM certificate for Cognito custom domain.

```bash
AWS_PROFILE=myg-prod npx cdk deploy CognitoCertStack -c domain=reelzai.com
```

**After deployment:**
1. Go to AWS ACM Console (us-east-1)
2. Copy the CNAME validation record details
3. Add CNAME record in Vercel DNS
4. Wait for certificate status to show "Issued" (can take 5-30 minutes)

**Save the certificate ARN** - you'll need it for YogaGoStack.

### Step 2: Deploy YogaGoSesStack (us-west-2)

Creates SES email identity for sending/receiving emails.
Cognito requires this SES identity to be verified before YogaGoStack can deploy.

```bash
AWS_PROFILE=myg-prod npx cdk deploy YogaGoSesStack -c domain=reelzai.com
```

**After deployment:**
1. Go to AWS SES Console (us-west-2)
2. Find the email identity for your domain
3. Copy the 3 DKIM CNAME records
4. Add all 3 CNAME records in Vercel DNS:
   ```
   Name: <token1>._domainkey
   Value: <token1>.dkim.amazonses.com

   Name: <token2>._domainkey
   Value: <token2>.dkim.amazonses.com

   Name: <token3>._domainkey
   Value: <token3>.dkim.amazonses.com
   ```
5. Add MX record for email receiving:
   ```
   Type: MX
   Name: @ (or leave empty)
   Value: 10 inbound-smtp.us-west-2.amazonaws.com
   ```
6. Wait for SES identity to show "Verified" (can take 5-30 minutes)

### Step 3: Deploy YogaGoStack (ap-southeast-2)

Creates Cognito, DynamoDB, Lambda, and other core resources.

```bash
AWS_PROFILE=myg-prod npx cdk deploy YogaGoStack \
  -c domain=reelzai.com \
  -c cognitoCertificateArn=arn:aws:acm:us-east-1:ACCOUNT:certificate/CERT-ID
```

**After deployment:**
1. Note the `CognitoCloudFrontDomain` output
2. Add CNAME record in Vercel DNS:
   ```
   Type: CNAME
   Name: signin
   Value: <cloudfront-domain-from-output>
   ```
3. Create IAM access keys for the Vercel user (manually in AWS Console or CLI)

### Step 4: Deploy CalelStack (ap-southeast-2) - Optional

Calendar/scheduling service stack.

```bash
AWS_PROFILE=myg-prod npx cdk deploy CalelStack
```

## Post-Deployment Setup

### Create Vercel User Access Keys

The YogaGoStack creates an IAM user (`yoga-go-vercel`) but doesn't create access keys
(for security - keys shouldn't be in CDK outputs).

```bash
# Create access key
AWS_PROFILE=myg-prod aws iam create-access-key --user-name yoga-go-vercel

# Save the AccessKeyId and SecretAccessKey for Vercel environment variables
```

### Update Vercel Environment Variables

Add these environment variables in Vercel project settings:

| Variable | Value |
|----------|-------|
| `AWS_ACCESS_KEY_ID` | From access key creation |
| `AWS_SECRET_ACCESS_KEY` | From access key creation |
| `AWS_REGION` | `ap-southeast-2` |
| `COGNITO_USER_POOL_ID` | From YogaGoStack output |
| `COGNITO_CLIENT_ID` | From YogaGoStack output |
| `COGNITO_DOMAIN` | `signin.<domain>` |
| `SES_REGION` | `us-west-2` |
| `SES_CONFIG_SET` | `yoga-go-emails-west` |

## CDK Gaps / Manual Steps Required

These items must be done manually and cannot be automated via CDK:

1. **Secrets Manager Secret** - OAuth credentials must be created before first deploy
2. **DNS Records** - Certificate validation, DKIM, MX records in Vercel DNS
3. **OAuth Provider Configuration** - Google/Facebook redirect URIs
4. **CAA Record** - Amazon CA must be allowed (Vercel only has Let's Encrypt by default)
5. **IAM Access Keys** - Created manually for security reasons
6. **Certificate Validation Wait** - ACM validation can take time
7. **SES Verification Wait** - DKIM verification can take time

## Troubleshooting

### Certificate Validation Fails
- Ensure CAA record `0 issue "amazon.com"` exists
- Check CNAME record is correct in DNS
- DNS propagation can take time - use `dig` to verify

### YogaGoStack Fails with "Secret not found"
- Create the `yoga-go/production` secret in Secrets Manager first
- Ensure it's in `ap-southeast-2` region

### YogaGoStack Fails with SES Error
- Deploy YogaGoSesStack first
- Wait for SES identity to be verified (check DKIM status in SES console)

### Cognito Custom Domain Fails
- Ensure certificate is "Issued" in ACM
- Ensure SES identity is verified in us-west-2

## Useful Commands

```bash
# List all stacks
AWS_PROFILE=myg-prod npx cdk list -c domain=reelzai.com

# Show what will change (dry run)
AWS_PROFILE=myg-prod npx cdk diff YogaGoStack -c domain=reelzai.com

# Check CloudFormation stack status
AWS_PROFILE=myg-prod aws cloudformation describe-stacks \
  --region ap-southeast-2 \
  --query 'Stacks[*].{Name:StackName,Status:StackStatus}'

# Check SES identity verification status
AWS_PROFILE=myg-prod aws ses get-identity-verification-attributes \
  --region us-west-2 \
  --identities reelzai.com

# Check ACM certificate status
AWS_PROFILE=myg-prod aws acm describe-certificate \
  --region us-east-1 \
  --certificate-arn arn:aws:acm:us-east-1:ACCOUNT:certificate/CERT-ID
```




>>>>>>>>>>>>>>>>>>>>>>>>>>>>> my notes

you need aws profile (myg-prod)
you need a domain name (reelzai.com)

add domain to vercel 
add vercel NS servers to domain on namecheap (or wherever domain is hosted)

vercel by default adds the let's encrypt CAA record
CAA	0 issue "letsencrypt.org" (cannot be deleted on vercel)
so just add new CAA record
CAA	0 issue "amazon.com"

# Bootstrap ap-southeast-2 (for YogaGoStack, CalelStack)
AWS_PROFILE=myg-prod npx cdk bootstrap aws://092568126661/ap-southeast-2

# Bootstrap us-west-2 (for YogaGoSesStack)
AWS_PROFILE=myg-prod npx cdk bootstrap aws://092568126661/us-west-2

# cert for signing in users
AWS_PROFILE=myg-prod npx cdk deploy CognitoCertStack


# Bootstrap us-east-1 (for CognitoCertStack)
AWS_PROFILE=myg-prod npx cdk deploy CognitoCertStack -c domain=reelzai.com

pick ARN from above and input to next step
you'll also need facebook and google app credentials
for google: 
APIs & Services > Auth0 Consent Screen > clients 
    and add URI for new domain e.g. https://signin.reelzai.com/oauth2/idpresponse

add the secrets to AWS Secrets Manager:
  AWS_PROFILE=myg-prod aws secretsmanager create-secret \
    --name "yoga-go/production" \
    --region ap-southeast-2 \
    --secret-string '{
      "GOOGLE_CLIENT_ID": "your-google-client-id",
      "GOOGLE_CLIENT_SECRET": "your-google-secret",
      "FACEBOOK_APP_ID": "your-facebook-app-id",
      "FACEBOOK_APP_SECRET": "your-facebook-secret"
    }'


# Create SES Stack
AWS_PROFILE=myg-prod npx cdk deploy YogaGoSesStack -c domain=reelzai.com

go to SES get the CNAME records and add them to domain records in vercel (3 records)

# get cert ARN 
AWS_PROFILE=myg-prod aws acm list-certificates --region us-east-1 --query 'CertificateSummaryList[?DomainName==`signin.reelzai.com`].CertificateArn' --output text


# RUN CDK DEPLOY
AWS_PROFILE=myg-prod npx cdk deploy YogaGoStack \
  -c domain=reelzai.com \
  -c cognitoCertificateArn=<ARN-FROM-ABOVE>


find user yoga-go-vercel in iam console and create access token
add AWS_ACCESS_KEY_ID and AWS_SECRET_ACCESS_KEY to vercel env vars
(make sure AWS_REGION is as expected region)

see cognito outputs from cdk deploy
  COGNITO_CLIENT_SECRET:
  AWS_PROFILE=myg-prod aws cognito-idp describe-user-pool-client \
    --user-pool-id <USER_POOL_ID> \
    --client-id <CLIENT_ID> \
    --region ap-southeast-2 \
    --query 'UserPoolClient.ClientSecret' \
    --output text

get cognito issuer url:
  https://cognito-idp.ap-southeast-2.amazonaws.com/<USER_POOL_ID>

add cognito env vars (from cdk outputs) to vercel env vars:
COGNITO_USER_POOL_ID
COGNITO_CLIENT_ID
COGNITO_CLIENT_SECRET
COGNITO_DOMAIN
COGNITO_ISSUER

Don't forget to add the CNAME for Cognito signin:
Type: CNAME
Name: signin
Value: <CognitoCloudFrontDomain from stack outputs>
