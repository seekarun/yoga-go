#!/bin/bash
# Retrieve SES SMTP credentials from Secrets Manager and convert to SMTP password
# Usage: ./get-smtp-credentials.sh

set -e

REGION="us-west-2"
SECRET_NAME="yoga-go/smtp-credentials"
AWS_PROFILE="${AWS_PROFILE:-myg}"

echo "Retrieving SMTP credentials from Secrets Manager..."
echo ""

# Get the secret
SECRET=$(aws secretsmanager get-secret-value \
  --secret-id "$SECRET_NAME" \
  --region "$REGION" \
  --profile "$AWS_PROFILE" \
  --query 'SecretString' \
  --output text)

ACCESS_KEY_ID=$(echo "$SECRET" | jq -r '.accessKeyId')
SECRET_ACCESS_KEY=$(echo "$SECRET" | jq -r '.secretAccessKey')
SMTP_SERVER=$(echo "$SECRET" | jq -r '.smtpServer')
SMTP_PORT=$(echo "$SECRET" | jq -r '.smtpPort')

# Convert IAM secret access key to SES SMTP password
# See: https://docs.aws.amazon.com/ses/latest/dg/smtp-credentials.html
convert_to_smtp_password() {
  local secret_key="$1"
  local region="$2"

  # The algorithm: HMAC-SHA256 with specific message and key derivation
  # Message = 0x02 (version) + "SendRawEmail"
  # Key is derived from secret access key

  # Use Python for the conversion (most reliable)
  python3 << EOF
import hmac
import hashlib
import base64

SMTP_REGIONS = [
    "us-east-2",
    "us-east-1",
    "us-west-2",
    "ap-south-1",
    "ap-northeast-2",
    "ap-southeast-1",
    "ap-southeast-2",
    "ap-northeast-1",
    "ca-central-1",
    "eu-central-1",
    "eu-west-1",
    "eu-west-2",
    "eu-south-1",
    "eu-north-1",
    "sa-east-1",
    "us-gov-west-1",
]

DATE = "11111111"
SERVICE = "ses"
MESSAGE = "SendRawEmail"
TERMINAL = "aws4_request"
VERSION = 0x04

def sign(key, msg):
    return hmac.new(key, msg.encode("utf-8"), hashlib.sha256).digest()

def calculate_key(secret_access_key, region):
    if region not in SMTP_REGIONS:
        raise ValueError(f"Region {region} is not supported")

    signature = sign(("AWS4" + secret_access_key).encode("utf-8"), DATE)
    signature = sign(signature, region)
    signature = sign(signature, SERVICE)
    signature = sign(signature, TERMINAL)
    signature = sign(signature, MESSAGE)
    signature_and_version = bytes([VERSION]) + signature
    smtp_password = base64.b64encode(signature_and_version)
    return smtp_password.decode("utf-8")

secret_key = "${secret_key}"
region = "${region}"
print(calculate_key(secret_key, region))
EOF
}

SMTP_PASSWORD=$(convert_to_smtp_password "$SECRET_ACCESS_KEY" "$REGION")

echo "============================================"
echo "SES SMTP Credentials for Gmail"
echo "============================================"
echo ""
echo "SMTP Server:   $SMTP_SERVER"
echo "SMTP Port:     $SMTP_PORT (TLS)"
echo "Username:      $ACCESS_KEY_ID"
echo "Password:      $SMTP_PASSWORD"
echo ""
echo "============================================"
echo "Gmail Setup Instructions:"
echo "============================================"
echo "1. Go to Gmail -> Settings -> See all settings"
echo "2. Go to 'Accounts and Import' tab"
echo "3. Under 'Send mail as', click 'Add another email address'"
echo "4. Enter: hi@myyoga.guru"
echo "5. Uncheck 'Treat as an alias'"
echo "6. Click 'Next Step'"
echo "7. Enter the SMTP settings above"
echo "8. Gmail will send a verification email to hi@myyoga.guru"
echo "   (it will forward to your hi@arun.au inbox)"
echo "9. Click the verification link and you're done!"
echo ""
