#!/bin/bash

# Create AWS Secrets Manager Secret for Yoga-GO
# This script creates the initial secret with dummy values
# Use update-secrets.sh to update with real credentials

set -e

# Set AWS profile
export AWS_PROFILE=yoga

echo "[INFO] Creating AWS Secrets Manager secret..."
echo "[INFO] Using AWS profile: $AWS_PROFILE"

SECRET_NAME="yoga-go/app-secrets"
AWS_REGION="${AWS_REGION:-ap-southeast-2}"

# Check if secret already exists
if aws secretsmanager describe-secret --secret-id "$SECRET_NAME" --region "$AWS_REGION" 2>/dev/null; then
    echo "[INFO] Secret already exists: $SECRET_NAME"
    echo "[INFO] Use update-secrets.sh to update the secret values"
    exit 0
fi

# Create JSON payload with dummy secrets
SECRET_JSON=$(cat <<EOF
{
  "MONGODB_URI": "REPLACE_WITH_MONGODB_ATLAS_URI",
  "AUTH0_SECRET": "REPLACE_WITH_AUTH0_SECRET",
  "AUTH0_CLIENT_SECRET": "REPLACE_WITH_AUTH0_CLIENT_SECRET",
  "CLOUDFLARE_API_TOKEN": "REPLACE_WITH_CLOUDFLARE_TOKEN",
  "STRIPE_SECRET_KEY": "REPLACE_WITH_STRIPE_SECRET",
  "RAZORPAY_KEY_SECRET": "REPLACE_WITH_RAZORPAY_SECRET"
}
EOF
)

echo "[INFO] Creating secret: $SECRET_NAME"

# Create secret in AWS Secrets Manager
aws secretsmanager create-secret \
    --name "$SECRET_NAME" \
    --description "Application secrets for Yoga-GO (managed manually)" \
    --secret-string "$SECRET_JSON" \
    --region "$AWS_REGION"

echo "[SUCCESS] Secret created successfully!"
echo ""
echo "[IMPORTANT] The secret contains dummy values. Update it with real credentials:"
echo "  1. Create a .env.production file with your real credentials"
echo "  2. Run: ./scripts/deployment/update-secrets.sh"
echo ""
echo "Or update manually in AWS Console:"
echo "  https://ap-southeast-2.console.aws.amazon.com/secretsmanager/secret?name=${SECRET_NAME}&region=${AWS_REGION}"
