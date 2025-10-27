#!/bin/bash

# Build and Push Docker Image to ECR
# This script builds the Docker image and pushes it to AWS ECR

set -e

# Set AWS profile
export AWS_PROFILE=yoga

echo "[INFO] Starting Docker build and push process..."
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
if [ -z "$AWS_REGION" ] || [ -z "$AWS_ACCOUNT_ID" ] || [ -z "$ECR_REPOSITORY_NAME" ]; then
    echo "[ERROR] Missing required environment variables:"
    echo "  AWS_REGION: $AWS_REGION"
    echo "  AWS_ACCOUNT_ID: $AWS_ACCOUNT_ID"
    echo "  ECR_REPOSITORY_NAME: $ECR_REPOSITORY_NAME"
    exit 1
fi

# Construct ECR repository URI
ECR_REPO_URI="${AWS_ACCOUNT_ID}.dkr.ecr.${AWS_REGION}.amazonaws.com/${ECR_REPOSITORY_NAME}"
IMAGE_TAG="${1:-latest}"

echo "[INFO] Configuration:"
echo "  AWS Region: $AWS_REGION"
echo "  AWS Account ID: $AWS_ACCOUNT_ID"
echo "  ECR Repository: $ECR_REPOSITORY_NAME"
echo "  ECR Repository URI: $ECR_REPO_URI"
echo "  Image Tag: $IMAGE_TAG"

# Authenticate Docker to ECR
echo "[INFO] Authenticating Docker to ECR..."
aws ecr get-login-password --region $AWS_REGION | docker login --username AWS --password-stdin $ECR_REPO_URI

# Build Docker image for linux/amd64 (EC2 t3.micro architecture)
echo "[INFO] Building Docker image for linux/amd64 platform..."
docker build --platform linux/amd64 -t $ECR_REPOSITORY_NAME:$IMAGE_TAG .

# Tag image for ECR
echo "[INFO] Tagging image for ECR..."
docker tag $ECR_REPOSITORY_NAME:$IMAGE_TAG $ECR_REPO_URI:$IMAGE_TAG
docker tag $ECR_REPOSITORY_NAME:$IMAGE_TAG $ECR_REPO_URI:latest

# Push image to ECR
echo "[INFO] Pushing image to ECR..."
docker push $ECR_REPO_URI:$IMAGE_TAG
docker push $ECR_REPO_URI:latest

echo "[SUCCESS] Docker image pushed successfully!"
echo "  Image URI: $ECR_REPO_URI:$IMAGE_TAG"
echo "  Latest URI: $ECR_REPO_URI:latest"
