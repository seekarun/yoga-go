#!/bin/bash

# Full Application Deployment Script
# This script orchestrates the complete deployment process:
# 1. Build and push Docker image
# 2. Update ECS service

set -e

echo "========================================="
echo "  Yoga-GO Application Deployment"
echo "========================================="

# Get image tag from argument or use timestamp
IMAGE_TAG="${1:-$(date +%Y%m%d-%H%M%S)}"

echo "[INFO] Deployment started at $(date)"
echo "[INFO] Image tag: $IMAGE_TAG"

# Step 1: Build and push Docker image
echo ""
echo "[STEP 1/2] Building and pushing Docker image..."
./scripts/deployment/build-and-push.sh $IMAGE_TAG

# Step 2: Update ECS service
echo ""
echo "[STEP 2/2] Updating ECS service..."
./scripts/deployment/update-ecs-service.sh

echo ""
echo "========================================="
echo "[SUCCESS] Deployment completed successfully!"
echo "========================================="
echo "Deployed at: $(date)"
echo "Image tag: $IMAGE_TAG"
