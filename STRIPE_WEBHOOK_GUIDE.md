# Stripe Webhook Endpoint Configuration Guide

## Endpoint Information
- **URL**: `https://gqcz28l0t2.execute-api.us-east-1.amazonaws.com/dev/stripe/webhook`
- **Method**: POST
- **Authentication**: Stripe signature verification (no API key required)

## What It Does
The Stripe webhook endpoint handles subscription lifecycle events:

1. **customer.subscription.created**: Generates and assigns API key to new subscriber
2. **customer.subscription.updated**: Updates subscription tier/limits
3. **customer.subscription.deleted**: Revokes API key on cancellation
4. **invoice.payment_failed**: Handles payment failures

## Setup Instructions for Client

### 1. Configure Stripe Webhook
1. Go to Stripe Dashboard: https://dashboard.stripe.com/webhooks
2. Click "Add endpoint"
3. Enter URL: `https://gqcz28l0t2.execute-api.us-east-1.amazonaws.com/dev/stripe/webhook`
4. Select events to listen for:
   - `customer.subscription.created`
   - `customer.subscription.updated`
   - `customer.subscription.deleted`
   - `invoice.payment_failed`
5. Copy the **Webhook signing secret** (starts with `whsec_...`)

### 2. Update Lambda Environment Variables
Add the webhook secret to your Lambda function:
```bash
aws lambda update-function-configuration \
  --function-name threatalytics-gpt-api-dev-stripe_webhook \
  --environment Variables="{STRIPE_SECRET_KEY=sk_live_...,STRIPE_WEBHOOK_SECRET=whsec_...}"
```

### 3. Test Webhook
Stripe provides a test mode to simulate events:
```bash
# Send test webhook from Stripe CLI
stripe trigger customer.subscription.created
```

## How Subscription Flow Works

### New Subscription
1. User subscribes via Stripe Checkout
2. Stripe sends `customer.subscription.created` webhook
3. Lambda generates unique API key
4. API key stored in DynamoDB `ThreatalyticsPlans` table
5. User receives API key (via email or dashboard)

### Subscription Cancellation
1. User cancels subscription
2. Stripe sends `customer.subscription.deleted` webhook
3. Lambda revokes API key in DynamoDB
4. User can no longer access API

### Payment Failure
1. Payment fails
2. Stripe sends `invoice.payment_failed` webhook
3. Lambda can optionally suspend access (add grace period logic)

## Testing the Webhook

### Manual Test (Not Recommended - Use Stripe CLI)
```powershell
# This won't work without valid Stripe signature
Invoke-RestMethod -Uri "https://gqcz28l0t2.execute-api.us-east-1.amazonaws.com/dev/stripe/webhook" -Method Post -Body '{"type":"test"}' -ContentType "application/json"
```

### Proper Test with Stripe CLI
```bash
# Install Stripe CLI
# Forward webhooks to local endpoint for testing
stripe listen --forward-to https://gqcz28l0t2.execute-api.us-east-1.amazonaws.com/dev/stripe/webhook

# Trigger test event
stripe trigger customer.subscription.created
```

## Verify Webhook is Working

### Check CloudWatch Logs
```bash
aws logs tail /aws/lambda/threatalytics-gpt-api-dev-stripe_webhook --follow
```

### Check DynamoDB for New Records
```bash
aws dynamodb scan --table-name ThreatalyticsPlans
```

## Current Status
- ✅ Endpoint deployed: `/stripe/webhook`
- ⚠️ Requires Stripe webhook secret configuration
- ⚠️ Requires STRIPE_SECRET_KEY environment variable
- ⚠️ Client must configure webhook in Stripe Dashboard

## Next Steps for Client
1. **Get Stripe API keys** (Dashboard → Developers → API keys)
2. **Create webhook endpoint** in Stripe Dashboard
3. **Copy webhook secret** (whsec_...)
4. **Update Lambda environment variables** with both keys
5. **Test webhook** using Stripe CLI or Dashboard
6. **Verify DynamoDB** entries after test subscription

## Security Notes
- Webhook validates Stripe signature before processing
- No API key required (Stripe handles authentication)
- Endpoint is public but secured via signature verification
- All secrets stored in environment variables (should use Secrets Manager)

## Troubleshooting
- **400 Invalid signature**: Webhook secret mismatch
- **500 Error**: Missing environment variables or DynamoDB permissions
- **No response**: Check CloudWatch logs for Lambda errors