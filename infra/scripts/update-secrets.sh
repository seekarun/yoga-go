#!/bin/bash

# Script to update AWS Secrets Manager with environment variables
# Usage: ./update-secrets.sh [path-to-env-file]

set -e

# Colors for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
NC='\033[0m' # No Color

SECRET_NAME="yoga-go/production"
AWS_REGION="ap-southeast-2"
AWS_PROFILE="myg"

ENV_FILE="${1:-.env.production}"

echo -e "${YELLOW}🔐 Yoga Go Secrets Manager Updater${NC}"
echo ""

# Check if env file exists
if [ ! -f "$ENV_FILE" ]; then
    echo -e "${RED}❌ Error: Environment file not found: $ENV_FILE${NC}"
    echo ""
    echo "Please create $ENV_FILE with your production environment variables."
    echo "Example format:"
    echo ""
    echo "MONGODB_URI=mongodb+srv://..."
    echo "AUTH0_SECRET=..."
    echo "AUTH0_BASE_URL=..."
    echo "AUTH0_ISSUER_BASE_URL=..."
    echo "AUTH0_CLIENT_ID=..."
    echo "AUTH0_CLIENT_SECRET=..."
    echo "CLOUDFLARE_ACCOUNT_ID=..."
    echo "CLOUDFLARE_API_TOKEN=..."
    echo "STRIPE_SECRET_KEY=..."
    echo "RAZORPAY_KEY_SECRET=..."
    exit 1
fi

echo -e "📁 Reading environment variables from: ${GREEN}$ENV_FILE${NC}"
echo ""

# Parse .env file and build JSON
echo -e "📦 Building JSON payload..."

# Read env file and convert to JSON
SECRET_JSON=$(cat "$ENV_FILE" | grep -v '^#' | grep -v '^$' | while IFS='=' read -r key value; do
    # Remove quotes from value if present
    value="${value%\"}"
    value="${value#\"}"
    # Escape special characters for JSON
    value=$(echo "$value" | sed 's/\\/\\\\/g' | sed 's/"/\\"/g')
    echo "\"$key\": \"$value\","
done | sed '$ s/,$//')

SECRET_JSON="{$SECRET_JSON}"

echo -e "${GREEN}✓${NC} JSON payload created"
echo ""

# Update secret in AWS Secrets Manager
echo -e "☁️  Updating secret in AWS Secrets Manager..."
echo -e "   Secret Name: ${GREEN}$SECRET_NAME${NC}"
echo -e "   AWS Region:  ${GREEN}$AWS_REGION${NC}"
echo -e "   AWS Profile: ${GREEN}$AWS_PROFILE${NC}"
echo ""

aws secretsmanager put-secret-value \
    --secret-id "$SECRET_NAME" \
    --secret-string "$SECRET_JSON" \
    --region "$AWS_REGION" \
    --profile "$AWS_PROFILE" \
    > /dev/null 2>&1

if [ $? -eq 0 ]; then
    echo -e "${GREEN}✅ Success!${NC} Secrets updated in AWS Secrets Manager"
    echo ""
    echo -e "🔄 ${YELLOW}Important:${NC} You must restart your ECS service for changes to take effect:"
    echo ""
    echo -e "   ${GREEN}aws ecs update-service \\${NC}"
    echo -e "   ${GREEN}  --cluster yoga-go-cluster \\${NC}"
    echo -e "   ${GREEN}  --service yoga-go-service \\${NC}"
    echo -e "   ${GREEN}  --force-new-deployment \\${NC}"
    echo -e "   ${GREEN}  --region $AWS_REGION \\${NC}"
    echo -e "   ${GREEN}  --profile $AWS_PROFILE${NC}"
    echo ""
else
    echo -e "${RED}❌ Failed to update secrets${NC}"
    echo ""
    echo "Common issues:"
    echo "  1. AWS CLI not configured with 'myg' profile"
    echo "  2. Insufficient IAM permissions"
    echo "  3. Secret does not exist (deploy CDK stack first)"
    exit 1
fi
