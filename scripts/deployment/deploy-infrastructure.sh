#!/bin/bash

# Deploy AWS Infrastructure using CDK
# This script deploys or updates the AWS infrastructure

set -e

# Set AWS profile
export AWS_PROFILE=yoga

echo "[INFO] Starting AWS CDK deployment..."
echo "[INFO] Using AWS profile: $AWS_PROFILE"

# Navigate to infrastructure directory
cd infrastructure

# Check if node_modules exists, install if not
if [ ! -d "node_modules" ]; then
    echo "[INFO] Installing CDK dependencies..."
    npm install
else
    echo "[INFO] CDK dependencies already installed"
fi

# Build CDK TypeScript code
echo "[INFO] Building CDK project..."
npm run build

# Bootstrap CDK (only needed once per account/region)
# Uncomment the line below if this is your first CDK deployment
# npm run cdk bootstrap

# Deploy all stacks
echo "[INFO] Deploying CDK stacks..."
npm run deploy

echo "[SUCCESS] Infrastructure deployment complete!"

# Return to root directory
cd ..
