#!/bin/bash

# Update ECS Service with New Task Definition
# This script forces a new deployment of the ECS service to pick up the latest Docker image

set -e

# Set AWS profile
export AWS_PROFILE=yoga

echo "[INFO] Updating ECS service..."
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
if [ -z "$AWS_REGION" ] || [ -z "$ECS_CLUSTER_NAME" ] || [ -z "$ECS_SERVICE_NAME" ]; then
    echo "[ERROR] Missing required environment variables:"
    echo "  AWS_REGION: $AWS_REGION"
    echo "  ECS_CLUSTER_NAME: $ECS_CLUSTER_NAME"
    echo "  ECS_SERVICE_NAME: $ECS_SERVICE_NAME"
    exit 1
fi

echo "[INFO] Configuration:"
echo "  AWS Region: $AWS_REGION"
echo "  ECS Cluster: $ECS_CLUSTER_NAME"
echo "  ECS Service: $ECS_SERVICE_NAME"

# Force new deployment
echo "[INFO] Forcing new deployment..."
aws ecs update-service \
    --cluster $ECS_CLUSTER_NAME \
    --service $ECS_SERVICE_NAME \
    --force-new-deployment \
    --region $AWS_REGION

# Wait for service to become stable (optional)
echo "[INFO] Waiting for service to stabilize (this may take a few minutes)..."
aws ecs wait services-stable \
    --cluster $ECS_CLUSTER_NAME \
    --services $ECS_SERVICE_NAME \
    --region $AWS_REGION

echo "[SUCCESS] ECS service updated successfully!"
