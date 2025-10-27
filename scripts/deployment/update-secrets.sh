#!/bin/bash

# Update AWS Secrets Manager with Environment Variables
# This script updates the secrets in AWS Secrets Manager

set -e

# Set AWS profile
export AWS_PROFILE=yoga

echo "[INFO] Updating AWS Secrets Manager..."
echo "[INFO] Using AWS profile: $AWS_PROFILE"

# Load environment variables from .env.production
if [ -f .env.production ]; then
    source .env.production
    echo "[INFO] Loaded environment variables from .env.production"
else
    echo "[ERROR] .env.production file not found!"
    exit 1
fi

# Check required environment variables
if [ -z "$AWS_REGION" ]; then
    echo "[ERROR] AWS_REGION is required"
    exit 1
fi

SECRET_NAME="yoga-go/app-secrets"

# Create JSON payload with secrets
# Map .env variable names to Secrets Manager keys
SECRET_JSON=$(cat <<EOF
{
  "MONGODB_URI": "${MONGODB_URI}",
  "AUTH0_SECRET": "${AUTH0_SECRET}",
  "AUTH0_CLIENT_SECRET": "${AUTH0_CLIENT_SECRET}",
  "CLOUDFLARE_API_TOKEN": "${CF_TOKEN}",
  "STRIPE_SECRET_KEY": "${STRIPE_SECRET_KEY}",
  "RAZORPAY_KEY_SECRET": "${RAZORPAY_KEY_SECRET}",
  "STRIPE_WEBHOOK_SECRET": "${STRIPE_WEBHOOK_SECRET:-}",
  "RAZORPAY_WEBHOOK_SECRET": "${RAZORPAY_WEBHOOK_SECRET:-}"
}
EOF
)

echo "[INFO] Updating secret: $SECRET_NAME"

# Update secret in AWS Secrets Manager
aws secretsmanager update-secret \
    --secret-id "$SECRET_NAME" \
    --secret-string "$SECRET_JSON" \
    --region "$AWS_REGION"

echo "[SUCCESS] Secrets updated successfully!"
echo ""
echo "[NOTE] You may need to restart the ECS service to pick up the new secrets:"
echo "  ./scripts/deployment/update-ecs-service.sh"
