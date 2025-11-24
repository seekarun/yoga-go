#!/bin/bash

# Script to list all available Docker images in ECR
# Usage: ./list-images.sh

set -e

# Colors for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
CYAN='\033[0;36m'
NC='\033[0m' # No Color

# Configuration
AWS_REGION="ap-southeast-2"
AWS_PROFILE="myg"
CLUSTER_NAME="yoga-go-cluster"
SERVICE_NAME="yoga-go-service"
ECR_REPOSITORY="yoga-go"

echo -e "${BLUE}📦 Yoga Go - ECR Image Repository${NC}"
echo ""

# Get images from ECR
echo -e "${CYAN}Fetching images from ECR...${NC}"
IMAGES=$(aws ecr describe-images \
    --repository-name "$ECR_REPOSITORY" \
    --region "$AWS_REGION" \
    --profile "$AWS_PROFILE" \
    --query 'sort_by(imageDetails,& imagePushedAt) | reverse(@)' \
    --output json 2>/dev/null)

if [ -z "$IMAGES" ] || [ "$IMAGES" = "[]" ]; then
    echo -e "${RED}❌ Error: No images found in ECR${NC}"
    exit 1
fi

# Get currently deployed tag
echo -e "${CYAN}Checking currently deployed version...${NC}"
TASK_DEF=$(aws ecs describe-services \
    --cluster "$CLUSTER_NAME" \
    --services "$SERVICE_NAME" \
    --region "$AWS_REGION" \
    --profile "$AWS_PROFILE" \
    --query 'services[0].taskDefinition' \
    --output text 2>/dev/null)

CURRENT_TAG="unknown"
if [ -n "$TASK_DEF" ] && [ "$TASK_DEF" != "None" ]; then
    IMAGE=$(aws ecs describe-task-definition \
        --task-definition "$TASK_DEF" \
        --region "$AWS_REGION" \
        --profile "$AWS_PROFILE" \
        --query 'taskDefinition.containerDefinitions[0].image' \
        --output text 2>/dev/null)

    # Extract tag from image URI (using awk for macOS compatibility)
    CURRENT_TAG=$(echo "$IMAGE" | awk -F: '{print $NF}')
fi

echo ""
echo -e "${BLUE}═══════════════════════════════════════════════════════════════════════${NC}"
echo -e "${GREEN}✅ Available Images in ECR Repository: $ECR_REPOSITORY${NC}"
echo -e "${BLUE}═══════════════════════════════════════════════════════════════════════${NC}"
echo ""

printf "%-20s %-25s %-12s %-15s\n" "TAG" "PUSHED" "SIZE" "STATUS"
echo "──────────────────────────────────────────────────────────────────────────"

# Track if we found the latest tag
FOUND_LATEST=false

echo "$IMAGES" | jq -r '.[] |
    "\(.imageTags // ["<untagged>"] | join(","))\t\(.imagePushedAt)\t\(.imageSizeInBytes)\t\(.imageDigest)"' |
while IFS=$'\t' read -r tags pushed size digest; do
    # Format size
    size_mb=$((size / 1024 / 1024))

    # Format date and time
    date=$(echo "$pushed" | cut -d'T' -f1)
    time=$(echo "$pushed" | cut -d'T' -f2 | cut -d'.' -f1)
    datetime="$date $time"

    # Determine status
    status=""
    tag_color="$NC"

    # Check for currently deployed tag
    if [[ "$tags" == *"$CURRENT_TAG"* ]] && [ "$CURRENT_TAG" != "unknown" ]; then
        status="${GREEN}← DEPLOYED${NC}"
        tag_color="$GREEN"
    fi

    # Check for latest tag
    if [[ "$tags" == "latest" ]] || [[ "$tags" == *",latest"* ]] || [[ "$tags" == "latest,"* ]]; then
        if [ -z "$status" ]; then
            status="${CYAN}(latest)${NC}"
        else
            status="$status ${CYAN}(latest)${NC}"
        fi
        FOUND_LATEST=true
    fi

    # Print row with colors
    printf "${tag_color}%-20s${NC} %-25s %3d MB      %b\n" \
        "$(echo "$tags" | cut -c1-19)" \
        "$datetime" \
        "$size_mb" \
        "$status"
done

echo ""
echo -e "${BLUE}═══════════════════════════════════════════════════════════════════════${NC}"
echo ""

# Show currently deployed version
if [ "$CURRENT_TAG" != "unknown" ]; then
    echo -e "${YELLOW}🏷️  Currently Deployed:${NC} ${GREEN}$CURRENT_TAG${NC}"
else
    echo -e "${YELLOW}⚠️  Could not determine currently deployed version${NC}"
fi

echo ""

# Count images
IMAGE_COUNT=$(echo "$IMAGES" | jq 'length')
echo -e "${CYAN}📊 Total images:${NC} $IMAGE_COUNT"

# Calculate total size
TOTAL_SIZE=$(echo "$IMAGES" | jq '[.[].imageSizeInBytes] | add')
TOTAL_SIZE_MB=$((TOTAL_SIZE / 1024 / 1024))
echo -e "${CYAN}💾 Total size:${NC} $TOTAL_SIZE_MB MB"

# Show free tier info
FREE_TIER_MB=500
if [ $TOTAL_SIZE_MB -lt $FREE_TIER_MB ]; then
    REMAINING=$((FREE_TIER_MB - TOTAL_SIZE_MB))
    echo -e "${GREEN}✓${NC} Within free tier limit (500 MB/month)"
    echo -e "${CYAN}📈 Free tier remaining:${NC} $REMAINING MB"
else
    OVERAGE=$((TOTAL_SIZE_MB - FREE_TIER_MB))
    echo -e "${YELLOW}⚠️  Exceeding free tier by $OVERAGE MB${NC}"
    COST=$(echo "scale=2; $OVERAGE * 0.10" | bc)
    echo -e "${CYAN}💰 Estimated cost:${NC} \$$COST/month"
fi

echo ""
echo -e "${BLUE}═══════════════════════════════════════════════════════════════════════${NC}"
echo ""

echo -e "${YELLOW}💡 Commands:${NC}"
echo ""
echo "  # Deploy a specific tag"
echo -e "  ${GREEN}./infra/scripts/deploy-tag.sh <TAG>${NC}"
echo ""
echo "  # Deploy latest"
echo -e "  ${GREEN}./infra/scripts/deploy-tag.sh latest${NC}"
echo ""
echo "  # View deployment logs"
echo -e "  ${GREEN}aws logs tail /ecs/yoga-go --follow --region $AWS_REGION --profile $AWS_PROFILE${NC}"
echo ""
echo "  # Check service status"
echo -e "  ${GREEN}aws ecs describe-services --cluster $CLUSTER_NAME --services $SERVICE_NAME --region $AWS_REGION --profile $AWS_PROFILE${NC}"
echo ""
