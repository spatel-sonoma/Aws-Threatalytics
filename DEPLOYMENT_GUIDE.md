# 🚀 Complete Deployment Guide - Admin Auth, Stripe & Usage Tracking

## 📋 Overview
This guide covers deploying:
1. Admin Authentication System
2. Stripe Subscription Management
3. Usage Tracking & Limits
4. Upgrade UI

---

## 🔐 Admin Credentials

### Default Admin Accounts

**Super Admin:**
- Email: `admin@threatalyticsai.com`
- Password: `admin123`
- Role: `super_admin`

**Support User:**
- Email: `support@threatalyticsai.com`
- Password: `password`
- Role: `support`

⚠️ **IMPORTANT**: Change these passwords in production by updating the password hashes in `lambda_functions/admin_auth.py`

---

## 🛠️ Backend Setup (AWS Lambda)

### Step 1: Create Required DynamoDB Tables

```bash
# Usage Table (if not exists)
aws dynamodb create-table \
    --table-name ThreatalyticsUsage \
    --attribute-definitions \
        AttributeName=user_id,AttributeType=S \
        AttributeName=timestamp,AttributeType=S \
    --key-schema \
        AttributeName=user_id,KeyType=HASH \
        AttributeName=timestamp,AttributeType=RANGE \
    --billing-mode PAY_PER_REQUEST \
    --region us-east-1

# Subscriptions Table (if not exists)
aws dynamodb create-table \
    --table-name ThreatalyticsPlans \
    --attribute-definitions \
        AttributeName=user_id,AttributeType=S \
        AttributeName=subscription_id,AttributeType=S \
    --key-schema \
        AttributeName=user_id,KeyType=HASH \
        AttributeName=subscription_id,KeyType=RANGE \
    --billing-mode PAY_PER_REQUEST \
    --region us-east-1
```

### Step 2: Configure Stripe

1. **Create Stripe Products & Prices:**
```bash
# Login to Stripe Dashboard: https://dashboard.stripe.com/

# Create Products:
- Starter Plan: $9.99/month
- Professional Plan: $49.99/month
- Enterprise Plan: Custom pricing

# Copy Price IDs (format: price_xxxxxxxxxxxx)
```

2. **Get Stripe API Keys:**
```bash
# Test Keys (for development):
- Publishable Key: pk_test_xxxxx
- Secret Key: sk_test_xxxxx

# Live Keys (for production):
- Publishable Key: pk_live_xxxxx
- Secret Key: sk_live_xxxxx
```

3. **Create Webhook Endpoint:**
```bash
# URL: https://km8gnz77e8.execute-api.us-east-1.amazonaws.com/dev/stripe/webhook

# Events to subscribe:
- customer.subscription.created
- customer.subscription.updated
- customer.subscription.deleted
- invoice.payment_succeeded
- invoice.payment_failed

# Copy Webhook Secret: whsec_xxxxx
```

### Step 3: Store Secrets in AWS Secrets Manager

```bash
# Store Stripe Secret Key
aws secretsmanager create-secret \
    --name threatalytics/stripe \
    --secret-string '{"STRIPE_SECRET_KEY":"sk_live_xxxxx"}' \
    --region us-east-1

# Store Admin Secret Key
aws secretsmanager create-secret \
    --name threatalytics/admin \
    --secret-string '{"ADMIN_SECRET_KEY":"your-secure-random-key-here"}' \
    --region us-east-1
```

### Step 4: Update serverless.yml

Add these functions and environment variables:

```yaml
provider:
  name: aws
  runtime: python3.9
  region: us-east-1
  environment:
    USERS_TABLE: ThreatalyticsUsers
    SUBSCRIPTIONS_TABLE: ThreatalyticsPlans
    USAGE_TABLE: ThreatalyticsUsage
    STRIPE_SECRET_NAME: threatalytics/stripe
    ADMIN_SECRET_KEY: ${env:ADMIN_SECRET_KEY}
    STRIPE_PRICE_ID_STARTER: price_xxxxx  # Replace with your Stripe price ID
    STRIPE_PRICE_ID_PROFESSIONAL: price_xxxxx
    STRIPE_PRICE_ID_ENTERPRISE: price_xxxxx
  iam:
    role:
      statements:
        - Effect: Allow
          Action:
            - dynamodb:Query
            - dynamodb:Scan
            - dynamodb:GetItem
            - dynamodb:PutItem
            - dynamodb:UpdateItem
            - dynamodb:DeleteItem
          Resource:
            - "arn:aws:dynamodb:${self:provider.region}:*:table/ThreatalyticsUsers"
            - "arn:aws:dynamodb:${self:provider.region}:*:table/ThreatalyticsPlans"
            - "arn:aws:dynamodb:${self:provider.region}:*:table/ThreatalyticsUsage"
        - Effect: Allow
          Action:
            - secretsmanager:GetSecretValue
          Resource:
            - "arn:aws:secretsmanager:${self:provider.region}:*:secret:threatalytics/*"

functions:
  # Admin Authentication
  adminAuth:
    handler: lambda_functions/admin_auth.lambda_handler
    events:
      - http:
          path: /admin/auth
          method: post
          cors: true
      - http:
          path: /admin/auth
          method: options
          cors: true

  # Usage Tracking
  usageTracker:
    handler: lambda_functions/usage_tracker.lambda_handler
    events:
      - http:
          path: /usage
          method: get
          cors: true
      - http:
          path: /usage/track
          method: post
          cors: true
      - http:
          path: /usage/check
          method: get
          cors: true

  # Subscription Management
  subscriptionManager:
    handler: lambda_functions/subscription_manager.lambda_handler
    events:
      - http:
          path: /subscription/create
          method: post
          cors: true
      - http:
          path: /subscription/status
          method: get
          cors: true
      - http:
          path: /subscription/cancel
          method: post
          cors: true
      - http:
          path: /subscription/portal
          method: get
          cors: true
```

### Step 5: Deploy Backend

```bash
# Install dependencies
npm install

# Deploy to AWS
serverless deploy

# Note the API endpoints from the output
```

---

## 🌐 Frontend Setup

### Step 1: Update Admin Dashboard URLs

In `admin/login.html` and `admin/index.html`, update:

```javascript
const API_BASE_URL = 'https://api.threatalyticsai.com';  // Your API Gateway URL
```

### Step 2: Update Website URLs

In `website/upgrade.html` and `website/index.html`, update:

```javascript
const API_BASE_URL = 'https://authapi.threatalyticsai.com';  // Your API Gateway URL
```

### Step 3: Deploy Frontend to S3

```bash
# Upload admin dashboard
aws s3 sync admin/ s3://your-admin-bucket/ --exclude "*.py"

# Upload website
aws s3 sync website/ s3://your-website-bucket/ --exclude "node_modules/*"

# Invalidate CloudFront cache
aws cloudfront create-invalidation \
    --distribution-id YOUR_DISTRIBUTION_ID \
    --paths "/*"
```

---

## 🧪 Testing

### Test Admin Login

1. Navigate to: `https://your-admin-url/login.html`
2. Login with:
   - Email: `admin@threatalyticsai.com`
   - Password: `admin123`
3. Should redirect to admin dashboard

### Test Usage Tracking

```bash
# Get usage (requires user token)
curl -X GET https://api.threatalyticsai.com/usage \
  -H "Authorization: Bearer YOUR_USER_TOKEN"

# Expected response:
{
  "user_id": "xxx",
  "plan": "free",
  "current": 45,
  "limit": 100,
  "remaining": 55,
  "percentage": 45
}
```

### Test Stripe Subscription

1. Navigate to: `https://your-site-url/upgrade.html`
2. Click "Subscribe" on Starter plan
3. Should redirect to Stripe Checkout
4. Use test card: `4242 4242 4242 4242`
5. After payment, verify subscription in database

---

## 📊 Database Schema

### ThreatalyticsUsage Table

```json
{
  "user_id": "cognito-user-id",
  "timestamp": "2025-11-05T10:30:00Z",
  "endpoint": "analyze",
  "usage": 1
}
```

### ThreatalyticsPlans Table

```json
{
  "user_id": "cognito-user-id",
  "subscription_id": "sub_xxxxx",
  "plan": "professional",
  "status": "active",
  "stripe_customer_id": "cus_xxxxx",
  "current_period_start": "2025-11-01T00:00:00Z",
  "current_period_end": "2025-12-01T00:00:00Z",
  "created_at": "2025-11-01T10:00:00Z"
}
```

---

## 🔒 Security Checklist

- [ ] Change default admin passwords
- [ ] Store Stripe keys in AWS Secrets Manager
- [ ] Enable HTTPS for all endpoints
- [ ] Configure CORS properly
- [ ] Set up CloudTrail for audit logging
- [ ] Enable MFA for AWS console
- [ ] Rotate API keys regularly
- [ ] Monitor Stripe webhook signatures
- [ ] Set up rate limiting
- [ ] Enable WAF on API Gateway

---

## 📈 Monitoring

### CloudWatch Metrics to Track

- Lambda invocation count
- Lambda errors
- API Gateway 4xx/5xx errors
- DynamoDB read/write capacity
- Stripe webhook failures

### CloudWatch Alarms

```bash
# Create alarm for high error rate
aws cloudwatch put-metric-alarm \
    --alarm-name threatalytics-high-error-rate \
    --alarm-description "Alert when error rate exceeds 5%" \
    --metric-name Errors \
    --namespace AWS/Lambda \
    --statistic Sum \
    --period 300 \
    --evaluation-periods 1 \
    --threshold 5 \
    --comparison-operator GreaterThanThreshold
```

---

## 🐛 Troubleshooting

### Admin Login Not Working

1. Check Lambda logs in CloudWatch
2. Verify API Gateway endpoint is correct
3. Check CORS headers
4. Verify credentials in `admin_auth.py`

### Usage Not Tracking

1. Check DynamoDB table exists
2. Verify IAM permissions for Lambda
3. Check user token is valid
4. Verify timestamp format

### Stripe Checkout Not Working

1. Check Stripe API keys are correct
2. Verify webhook endpoint is configured
3. Check price IDs match your Stripe products
4. Test with Stripe test mode first

---

## 📝 API Endpoints Summary

### Admin Endpoints
- `POST /admin/auth` - Admin login
- `GET /admin/users` - List users
- `GET /admin/dashboard/stats` - Dashboard stats

### Usage Endpoints
- `GET /usage` - Get user usage
- `POST /usage/track` - Track API call
- `GET /usage/check` - Check usage limit

### Subscription Endpoints
- `POST /subscription/create` - Create Stripe checkout
- `GET /subscription/status` - Get subscription status
- `POST /subscription/cancel` - Cancel subscription
- `GET /subscription/portal` - Get billing portal URL

---

## ✅ Post-Deployment Checklist

- [ ] Admin login working
- [ ] User registration working
- [ ] Usage tracking enabled
- [ ] Stripe checkout functional
- [ ] Webhook receiving events
- [ ] CloudWatch logging enabled
- [ ] Error alerts configured
- [ ] Database backups enabled
- [ ] SSL certificates valid
- [ ] DNS records configured

---

## 📞 Support

For issues or questions:
- Email: support@threatalyticsai.com
- Documentation: https://docs.threatalyticsai.com
- Status Page: https://status.threatalyticsai.com

---

**Deployment Date:** November 5, 2025
**Version:** 1.0.0
**Author:** Threatalytics Team
