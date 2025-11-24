#!/bin/bash

# Script to deploy a specific Docker image tag to ECS
# Usage: ./deploy-tag.sh [IMAGE_TAG]
# Example: ./deploy-tag.sh b727c7a

set -e

# Colors for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m' # No Color

# Configuration
AWS_REGION="ap-southeast-2"
AWS_PROFILE="myg"
CLUSTER_NAME="yoga-go-cluster"
SERVICE_NAME="yoga-go-service"
TASK_FAMILY="yoga-go"
ECR_REPOSITORY="yoga-go"

echo -e "${BLUE}🚀 Yoga Go Deployment Tool${NC}"
echo ""

# Get AWS account ID
AWS_ACCOUNT_ID=$(aws sts get-caller-identity --query Account --output text --profile "$AWS_PROFILE" 2>/dev/null)
if [ -z "$AWS_ACCOUNT_ID" ]; then
    echo -e "${RED}❌ Error: Could not get AWS account ID${NC}"
    echo "Make sure AWS CLI is configured with the 'myg' profile"
    exit 1
fi

ECR_REGISTRY="$AWS_ACCOUNT_ID.dkr.ecr.$AWS_REGION.amazonaws.com"
IMAGE_URI="$ECR_REGISTRY/$ECR_REPOSITORY"

# Function to list available tags
list_tags() {
    echo -e "${BLUE}📦 Available Image Tags in ECR${NC}"
    echo ""

    IMAGES=$(aws ecr describe-images \
        --repository-name "$ECR_REPOSITORY" \
        --region "$AWS_REGION" \
        --profile "$AWS_PROFILE" \
        --query 'sort_by(imageDetails,& imagePushedAt)' \
        --output json 2>/dev/null)

    if [ -z "$IMAGES" ] || [ "$IMAGES" = "[]" ]; then
        echo -e "${YELLOW}⚠️  No images found in ECR${NC}"
        exit 1
    fi

    # Get currently deployed tag
    CURRENT_TAG=$(get_current_tag)

    echo -e "TAG\t\tPUSHED\t\t\tSIZE\t\tSTATUS"
    echo "────────────────────────────────────────────────────────────────────"

    echo "$IMAGES" | jq -r '.[] |
        "\(.imageTags // ["untagged"] | join(","))\t\(.imagePushedAt)\t\(.imageSizeInBytes)"' |
    while IFS=$'\t' read -r tags pushed size; do
        # Format size
        size_mb=$((size / 1024 / 1024))

        # Format date (remove milliseconds and timezone)
        date=$(echo "$pushed" | cut -d'T' -f1)
        time=$(echo "$pushed" | cut -d'T' -f2 | cut -d'.' -f1)

        # Check if this is the current tag
        status=""
        if [[ "$tags" == *"$CURRENT_TAG"* ]]; then
            status="${GREEN}← DEPLOYED${NC}"
        fi

        printf "%-15s\t%s %s\t%3d MB\t%b\n" "$tags" "$date" "$time" "$size_mb" "$status"
    done

    echo ""
}

# Function to get currently deployed tag
get_current_tag() {
    TASK_DEF=$(aws ecs describe-services \
        --cluster "$CLUSTER_NAME" \
        --services "$SERVICE_NAME" \
        --region "$AWS_REGION" \
        --profile "$AWS_PROFILE" \
        --query 'services[0].taskDefinition' \
        --output text 2>/dev/null)

    if [ -z "$TASK_DEF" ]; then
        echo "unknown"
        return
    fi

    IMAGE=$(aws ecs describe-task-definition \
        --task-definition "$TASK_DEF" \
        --region "$AWS_REGION" \
        --profile "$AWS_PROFILE" \
        --query 'taskDefinition.containerDefinitions[0].image' \
        --output text 2>/dev/null)

    # Extract tag from image URI (using awk for macOS compatibility)
    TAG=$(echo "$IMAGE" | awk -F: '{print $NF}')
    echo "$TAG"
}

# Function to verify tag exists in ECR
verify_tag() {
    local tag=$1

    aws ecr describe-images \
        --repository-name "$ECR_REPOSITORY" \
        --image-ids imageTag="$tag" \
        --region "$AWS_REGION" \
        --profile "$AWS_PROFILE" \
        --output json > /dev/null 2>&1

    return $?
}

# Function to deploy specific tag
deploy_tag() {
    local tag=$1

    echo -e "${BLUE}🔍 Verifying image tag exists...${NC}"
    if ! verify_tag "$tag"; then
        echo -e "${RED}❌ Error: Image tag '$tag' not found in ECR${NC}"
        echo ""
        echo "Run './infra/scripts/list-images.sh' to see available tags"
        exit 1
    fi
    echo -e "${GREEN}✓${NC} Image tag verified: $tag"
    echo ""

    # Get current task definition
    echo -e "${BLUE}📋 Fetching current task definition...${NC}"
    TASK_DEF_ARN=$(aws ecs describe-services \
        --cluster "$CLUSTER_NAME" \
        --services "$SERVICE_NAME" \
        --region "$AWS_REGION" \
        --profile "$AWS_PROFILE" \
        --query 'services[0].taskDefinition' \
        --output text)

    if [ -z "$TASK_DEF_ARN" ]; then
        echo -e "${RED}❌ Error: Could not get current task definition${NC}"
        exit 1
    fi

    echo -e "${GREEN}✓${NC} Current task definition: $TASK_DEF_ARN"
    echo ""

    # Get task definition JSON
    TASK_DEF_JSON=$(aws ecs describe-task-definition \
        --task-definition "$TASK_DEF_ARN" \
        --region "$AWS_REGION" \
        --profile "$AWS_PROFILE" \
        --query 'taskDefinition')

    # Create new task definition with updated image
    echo -e "${BLUE}🔧 Creating new task definition with image: $IMAGE_URI:$tag${NC}"

    NEW_IMAGE="$IMAGE_URI:$tag"

    # Update image in task definition and remove unnecessary fields
    NEW_TASK_DEF=$(echo "$TASK_DEF_JSON" | jq \
        --arg image "$NEW_IMAGE" \
        'del(.taskDefinitionArn, .revision, .status, .requiresAttributes, .compatibilities, .registeredAt, .registeredBy) |
         .containerDefinitions[0].image = $image')

    # Register new task definition
    NEW_TASK_DEF_ARN=$(aws ecs register-task-definition \
        --cli-input-json "$NEW_TASK_DEF" \
        --region "$AWS_REGION" \
        --profile "$AWS_PROFILE" \
        --query 'taskDefinition.taskDefinitionArn' \
        --output text)

    if [ -z "$NEW_TASK_DEF_ARN" ]; then
        echo -e "${RED}❌ Error: Failed to register new task definition${NC}"
        exit 1
    fi

    echo -e "${GREEN}✓${NC} New task definition registered: $NEW_TASK_DEF_ARN"
    echo ""

    # Update service
    echo -e "${BLUE}🚀 Updating ECS service...${NC}"
    aws ecs update-service \
        --cluster "$CLUSTER_NAME" \
        --service "$SERVICE_NAME" \
        --task-definition "$NEW_TASK_DEF_ARN" \
        --region "$AWS_REGION" \
        --profile "$AWS_PROFILE" \
        --output json > /dev/null

    echo -e "${GREEN}✓${NC} Service update initiated"
    echo ""

    # Show deployment info
    echo -e "${BLUE}═══════════════════════════════════════════${NC}"
    echo -e "${GREEN}✅ Deployment Started!${NC}"
    echo -e "${BLUE}═══════════════════════════════════════════${NC}"
    echo ""
    echo -e "📦 Image:    ${GREEN}$IMAGE_URI:$tag${NC}"
    echo -e "🎯 Cluster:  ${GREEN}$CLUSTER_NAME${NC}"
    echo -e "🔧 Service:  ${GREEN}$SERVICE_NAME${NC}"
    echo ""
    echo -e "${YELLOW}⏱️  Deployment in progress...${NC}"
    echo ""
    echo "ECS will:"
    echo "  1. Stop the current task"
    echo "  2. Pull the image: $tag"
    echo "  3. Start a new task"
    echo "  4. Wait for health checks to pass"
    echo ""
    echo "This typically takes 2-3 minutes."
    echo ""
    echo -e "${BLUE}📊 Monitor deployment:${NC}"
    echo -e "   ${GREEN}aws ecs describe-services --cluster $CLUSTER_NAME --services $SERVICE_NAME --region $AWS_REGION --profile $AWS_PROFILE${NC}"
    echo ""
    echo -e "${BLUE}📜 View logs:${NC}"
    echo -e "   ${GREEN}aws logs tail /ecs/yoga-go --follow --region $AWS_REGION --profile $AWS_PROFILE${NC}"
    echo ""
    echo -e "${BLUE}🌐 Get service URL:${NC}"
    echo -e "   ${GREEN}./infra/scripts/get-service-url.sh${NC}"
    echo ""
}

# Main logic
if [ $# -eq 0 ]; then
    # No arguments - list available tags
    list_tags
    echo ""
    echo -e "${YELLOW}💡 Usage:${NC} ./infra/scripts/deploy-tag.sh <IMAGE_TAG>"
    echo ""
    echo "Examples:"
    echo "  ./infra/scripts/deploy-tag.sh latest    # Deploy latest image"
    echo "  ./infra/scripts/deploy-tag.sh b727c7a   # Deploy specific commit"
    echo ""
    CURRENT=$(get_current_tag)
    echo -e "${BLUE}Currently deployed:${NC} ${GREEN}$CURRENT${NC}"
    echo ""
else
    IMAGE_TAG=$1

    echo -e "${YELLOW}Deploying image tag:${NC} ${GREEN}$IMAGE_TAG${NC}"
    echo ""

    CURRENT=$(get_current_tag)
    echo -e "${BLUE}Current deployment:${NC} $CURRENT"
    echo -e "${BLUE}New deployment:${NC}     $IMAGE_TAG"
    echo ""

    if [ "$CURRENT" = "$IMAGE_TAG" ]; then
        echo -e "${YELLOW}⚠️  Warning: This tag is already deployed${NC}"
        echo ""
        read -p "Continue anyway? (y/N): " -n 1 -r
        echo ""
        if [[ ! $REPLY =~ ^[Yy]$ ]]; then
            echo "Deployment cancelled."
            exit 0
        fi
    fi

    deploy_tag "$IMAGE_TAG"
fi
