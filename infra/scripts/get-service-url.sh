#!/bin/bash

# Script to get the public URL of the Yoga Go application
# Usage: ./get-service-url.sh

set -e

# Colors for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m' # No Color

AWS_REGION="ap-southeast-2"
AWS_PROFILE="myg"
CLUSTER_NAME="yoga-go-cluster"
SERVICE_NAME="yoga-go-service"

echo -e "${BLUE}🔍 Yoga Go Service URL Finder${NC}"
echo ""

# Get the Auto Scaling Group name
echo -e "📊 Finding Auto Scaling Group..."
ASG_NAME=$(aws cloudformation describe-stack-resources \
    --stack-name YogaGoStack \
    --query "StackResources[?ResourceType=='AWS::AutoScaling::AutoScalingGroup'].PhysicalResourceId" \
    --output text \
    --region "$AWS_REGION" \
    --profile "$AWS_PROFILE" 2>/dev/null)

if [ -z "$ASG_NAME" ]; then
    echo -e "${RED}❌ Error: Could not find Auto Scaling Group${NC}"
    echo ""
    echo "Make sure you have deployed the CDK stack:"
    echo -e "   ${GREEN}cd infra && cdk deploy --profile $AWS_PROFILE${NC}"
    exit 1
fi

echo -e "${GREEN}✓${NC} Found ASG: $ASG_NAME"
echo ""

# Get EC2 instance public IP
echo -e "🖥️  Finding EC2 instance..."
PUBLIC_IP=$(aws ec2 describe-instances \
    --filters "Name=tag:aws:autoscaling:groupName,Values=$ASG_NAME" \
              "Name=instance-state-name,Values=running" \
    --query "Reservations[*].Instances[*].PublicIpAddress" \
    --output text \
    --region "$AWS_REGION" \
    --profile "$AWS_PROFILE" 2>/dev/null)

if [ -z "$PUBLIC_IP" ]; then
    echo -e "${YELLOW}⚠️  Warning: No running EC2 instances found${NC}"
    echo ""
    echo "Possible reasons:"
    echo "  1. ECS service is starting up (wait 2-3 minutes)"
    echo "  2. Instance is stopped or terminating"
    echo "  3. Deployment failed"
    echo ""
    echo "Check ECS service status:"
    echo -e "   ${GREEN}aws ecs describe-services --cluster $CLUSTER_NAME --services $SERVICE_NAME --region $AWS_REGION --profile $AWS_PROFILE${NC}"
    exit 1
fi

echo -e "${GREEN}✓${NC} Found instance: $PUBLIC_IP"
echo ""

# Check ECS service status
echo -e "🐳 Checking ECS service status..."
SERVICE_STATUS=$(aws ecs describe-services \
    --cluster "$CLUSTER_NAME" \
    --services "$SERVICE_NAME" \
    --query "services[0].{desired:desiredCount,running:runningCount,pending:pendingCount}" \
    --output json \
    --region "$AWS_REGION" \
    --profile "$AWS_PROFILE" 2>/dev/null)

DESIRED=$(echo "$SERVICE_STATUS" | grep -o '"desired":[0-9]*' | cut -d':' -f2)
RUNNING=$(echo "$SERVICE_STATUS" | grep -o '"running":[0-9]*' | cut -d':' -f2)
PENDING=$(echo "$SERVICE_STATUS" | grep -o '"pending":[0-9]*' | cut -d':' -f2)

echo -e "   Desired: ${GREEN}$DESIRED${NC}"
echo -e "   Running: ${GREEN}$RUNNING${NC}"
echo -e "   Pending: ${YELLOW}$PENDING${NC}"
echo ""

if [ "$RUNNING" -eq 0 ]; then
    echo -e "${YELLOW}⚠️  Warning: No containers are running yet${NC}"
    echo -e "   Wait a few minutes for the service to start, then run this script again."
    echo ""
fi

# Display service URLs
echo -e "${BLUE}═══════════════════════════════════════════${NC}"
echo -e "${GREEN}✅ Your Yoga Go application is accessible at:${NC}"
echo -e "${BLUE}═══════════════════════════════════════════${NC}"
echo ""
echo -e "🌐 Application URL:"
echo -e "   ${GREEN}http://$PUBLIC_IP${NC}"
echo ""
echo -e "🏥 Health Check:"
echo -e "   ${GREEN}http://$PUBLIC_IP/api/health${NC}"
echo ""
echo -e "📋 Test it:"
echo -e "   ${GREEN}curl http://$PUBLIC_IP/api/health${NC}"
echo ""

# Check if health endpoint is accessible
echo -e "🔍 Testing health endpoint..."
HTTP_STATUS=$(curl -s -o /dev/null -w "%{http_code}" "http://$PUBLIC_IP/api/health" 2>/dev/null || echo "000")

if [ "$HTTP_STATUS" = "200" ]; then
    echo -e "${GREEN}✅ Health check passed!${NC} Application is running correctly."
elif [ "$HTTP_STATUS" = "000" ]; then
    echo -e "${YELLOW}⚠️  Could not connect to the application${NC}"
    echo -e "   The container may still be starting. Wait 1-2 minutes and try again."
else
    echo -e "${YELLOW}⚠️  Health check returned HTTP $HTTP_STATUS${NC}"
    echo -e "   The application may have issues. Check CloudWatch logs:"
    echo -e "   ${GREEN}aws logs tail /ecs/yoga-go --follow --region $AWS_REGION --profile $AWS_PROFILE${NC}"
fi

echo ""
echo -e "${BLUE}═══════════════════════════════════════════${NC}"
echo ""

# Show CloudWatch logs command
echo -e "📊 View application logs:"
echo -e "   ${GREEN}aws logs tail /ecs/yoga-go --follow --region $AWS_REGION --profile $AWS_PROFILE${NC}"
echo ""

# Show how to update secrets
echo -e "🔐 Update secrets:"
echo -e "   ${GREEN}./infra/scripts/update-secrets.sh .env.production${NC}"
echo ""

# Show how to deploy new version
echo -e "🚀 Deploy new version:"
echo -e "   ${GREEN}git push origin main${NC} (GitHub Actions will deploy automatically)"
echo ""
