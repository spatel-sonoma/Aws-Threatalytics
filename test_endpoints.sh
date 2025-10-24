#!/bin/bash
# Threatalytics API Testing Script

API_URL=$1
API_KEY=$2

if [ -z "$API_URL" ] || [ -z "$API_KEY" ]; then
    echo "Usage: $0 <api-url> <api-key>"
    echo "Example: $0 https://abc123.execute-api.us-east-1.amazonaws.com/dev your-api-key"
    exit 1
fi

echo "🧪 Testing Threatalytics API Endpoints"
echo "API URL: $API_URL"
echo "API Key: $API_KEY"
echo

# Test /analyze endpoint
echo "🔍 Testing /analyze endpoint..."
RESPONSE=$(curl -s -X POST "$API_URL/analyze" \
  -H "x-api-key: $API_KEY" \
  -H "Content-Type: application/json" \
  -d '{"text": "User john.doe@email.com accessed restricted files 5 times in one hour"}')

if echo "$RESPONSE" | jq -e '.analysis' > /dev/null 2>&1; then
    echo "✅ /analyze: SUCCESS"
else
    echo "❌ /analyze: FAILED"
    echo "Response: $RESPONSE"
fi

echo

# Test /redact endpoint
echo "🔒 Testing /redact endpoint..."
RESPONSE=$(curl -s -X POST "$API_URL/redact" \
  -H "x-api-key: $API_KEY" \
  -H "Content-Type: application/json" \
  -d '{"text": "Contact John Smith at 555-123-4567 or email john.smith@company.com"}')

if echo "$RESPONSE" | jq -e '.redacted' > /dev/null 2>&1; then
    echo "✅ /redact: SUCCESS"
else
    echo "❌ /redact: FAILED"
    echo "Response: $RESPONSE"
fi

echo

# Test /report endpoint
echo "📊 Testing /report endpoint..."
RESPONSE=$(curl -s -X POST "$API_URL/report" \
  -H "x-api-key: $API_KEY" \
  -H "Content-Type: application/json" \
  -d '{"data": "Multiple failed login attempts from IP 192.168.1.100"}')

if echo "$RESPONSE" | jq -e '.report' > /dev/null 2>&1; then
    echo "✅ /report: SUCCESS"
else
    echo "❌ /report: FAILED"
    echo "Response: $RESPONSE"
fi

echo

# Test /drill endpoint
echo "🎯 Testing /drill endpoint..."
RESPONSE=$(curl -s -X POST "$API_URL/drill" \
  -H "x-api-key: $API_KEY" \
  -H "Content-Type: application/json" \
  -d '{"scenario": "Simulate ransomware attack on employee workstations"}')

if echo "$RESPONSE" | jq -e '.simulation' > /dev/null 2>&1; then
    echo "✅ /drill: SUCCESS"
else
    echo "❌ /drill: FAILED"
    echo "Response: $RESPONSE"
fi

echo
echo "🎉 API Testing completed!"
echo "Check CloudWatch logs for detailed execution logs"
echo "Check S3 bucket threatalytics-logs-{account-id} for structured logs"