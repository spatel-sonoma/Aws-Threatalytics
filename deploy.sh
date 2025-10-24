#!/bin/bash
# Threatalytics GPT API Deployment Script

set -e  # Exit on any error

echo "🚀 Starting Threatalytics GPT API Deployment"

# Check AWS credentials
echo "✅ Checking AWS credentials..."
aws sts get-caller-identity

# Install serverless framework if not present
if ! command -v serverless &> /dev/null; then
    echo "📦 Installing Serverless Framework..."
    npm install -g serverless
fi

# Validate serverless.yml
echo "🔍 Validating serverless.yml..."
serverless print

# Deploy to AWS
echo "🏗️  Deploying to AWS..."
serverless deploy

# Get API Gateway URL
API_URL=$(serverless info --verbose | grep "ServiceEndpoint" | awk '{print $2}')
echo "🌐 API Gateway URL: $API_URL"

# Get API Key (if created)
echo "🔑 API Keys created:"
aws apigateway get-api-keys --include-values | jq -r '.items[] | "\(.name): \(.value)"'

echo "📋 Next Steps:"
echo "1. Store OpenAI API key in Secrets Manager: threatalytics-openai-key"
echo "2. Configure Stripe webhooks pointing to: $API_URL/stripe/webhook"
echo "3. Test endpoints using the API keys above"
echo "4. Set up CloudWatch alarms for monitoring"
echo "5. Subscribe to SNS topic for alerts: threatalytics-alerts"

echo "✅ Deployment completed successfully!"