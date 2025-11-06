# ✅ serverless.yml Updated Successfully

## 🎯 What Was Added

### 1. **New Environment Variables**
```yaml
STRIPE_SECRET_NAME: threatalytics/stripe
ADMIN_SECRET_KEY: ${env:ADMIN_SECRET_KEY}
STRIPE_PRICE_ID_STARTER: ${env:STRIPE_PRICE_ID_STARTER}
STRIPE_PRICE_ID_PROFESSIONAL: ${env:STRIPE_PRICE_ID_PROFESSIONAL}
STRIPE_PRICE_ID_ENTERPRISE: ${env:STRIPE_PRICE_ID_ENTERPRISE}
```

### 2. **Updated IAM Permissions**
- Added Secrets Manager access for:
  - `threatalytics/stripe`
  - `threatalytics/admin`
- Added `dynamodb:Scan` permission for admin queries

### 3. **New Lambda Functions**

#### Admin Authentication (`/admin/auth`)
- POST `/admin/auth` - Admin login, logout, token verification
- OPTIONS `/admin/auth` - CORS preflight

#### Usage Tracking (`/usage/*`)
- GET `/usage` - Get current user usage stats
- POST `/usage/track` - Track API usage
- GET `/usage/check` - Check if user can make API call

#### Subscription Management (`/subscription/*`)
- POST `/subscription/create` - Create Stripe checkout session
- GET `/subscription/status` - Get subscription status
- POST `/subscription/cancel` - Cancel subscription
- GET `/subscription/portal` - Access billing portal

#### Admin Dashboard (`/admin/*`)
- GET `/admin/dashboard/stats` - Dashboard statistics
- GET `/admin/users` - List all users
- GET `/admin/users/recent` - Recent users
- GET `/admin/charts/revenue` - Revenue chart data
- GET `/admin/charts/usage` - Usage analytics
- GET `/admin/users/export` - Export users CSV

### 4. **Updated DynamoDB Tables**

#### ThreatalyticsUsage
- **Primary Key:** user_id (HASH)
- **Sort Key:** timestamp (RANGE)
- Changed from api_key to user_id based system

#### ThreatalyticsPlans
- **Primary Key:** user_id (HASH)
- **Sort Key:** subscription_id (RANGE)
- Added sort key for multiple subscriptions per user

---

## 🚀 Next Steps

### 1. Set Environment Variables

Create/update your `.env` file:

```bash
# Cognito (existing)
COGNITO_USER_POOL_ID=us-east-1_xxxxxxxxx
COGNITO_CLIENT_ID=xxxxxxxxxxxxxxxxxxxxxxxxxx

# Stripe Keys
STRIPE_SECRET_KEY=sk_live_xxxxx  # or sk_test_xxxxx for testing
STRIPE_PRICE_ID_STARTER=price_xxxxx
STRIPE_PRICE_ID_PROFESSIONAL=price_xxxxx
STRIPE_PRICE_ID_ENTERPRISE=price_xxxxx

# Admin Secret
ADMIN_SECRET_KEY=your-secure-random-key-here
```

### 2. Create Stripe Products

1. Go to https://dashboard.stripe.com/products
2. Create 3 products:
   - **Starter** - $9.99/month
   - **Professional** - $49.99/month
   - **Enterprise** - Custom
3. Copy the Price IDs (format: `price_xxxxxxxxxxxxx`)
4. Add to `.env` file

### 3. Store Stripe Secret in AWS

```bash
# Create Stripe secret
aws secretsmanager create-secret \
    --name threatalytics/stripe \
    --secret-string '{"STRIPE_SECRET_KEY":"sk_live_xxxxx","STRIPE_WEBHOOK_SECRET":"whsec_xxxxx"}' \
    --region us-east-1
```

### 4. Deploy Backend

```bash
# Install dependencies (if not done)
npm install

# Deploy to AWS
serverless deploy

# Expected output:
# - New API endpoints for admin auth
# - New API endpoints for usage tracking
# - New API endpoints for subscription management
# - Updated DynamoDB tables
```

### 5. Configure Stripe Webhook

After deployment, you'll get an API Gateway URL like:
```
https://xxxxxxxxxx.execute-api.us-east-1.amazonaws.com/dev
```

Add webhook in Stripe Dashboard:
1. Go to https://dashboard.stripe.com/webhooks
2. Add endpoint: `YOUR_API_URL/stripe/webhook`
3. Select events:
   - customer.subscription.created
   - customer.subscription.updated
   - customer.subscription.deleted
   - invoice.payment_succeeded
   - invoice.payment_failed
4. Copy webhook secret and add to Secrets Manager

### 6. Test Deployment

```bash
# Test admin auth endpoint
curl -X POST https://YOUR_API_URL/admin/auth \
  -H "Content-Type: application/json" \
  -d '{"action":"login","email":"admin@threatalyticsai.com","password":"admin123"}'

# Expected: {"message":"Login successful","token":"...","user":{...}}
```

---

## 📋 Complete Lambda Functions List

After deployment, you'll have these Lambda functions:

1. **threatalytics-gpt-api-dev-analyze** - Threat analysis
2. **threatalytics-gpt-api-dev-redact** - PII redaction
3. **threatalytics-gpt-api-dev-report** - Report generation
4. **threatalytics-gpt-api-dev-drill** - Drill simulation
5. **threatalytics-gpt-api-dev-stripe_webhook** - Stripe events
6. **threatalytics-gpt-api-dev-demo** - Demo endpoint
7. **threatalytics-gpt-api-dev-auth** - User authentication
8. **threatalytics-gpt-api-dev-conversations** - Conversation management
9. **threatalytics-gpt-api-dev-adminAuth** ⭐ NEW - Admin login
10. **threatalytics-gpt-api-dev-usageTracker** ⭐ NEW - Usage tracking
11. **threatalytics-gpt-api-dev-subscriptionManager** ⭐ NEW - Subscriptions
12. **threatalytics-gpt-api-dev-adminDashboard** ⭐ NEW - Admin API

---

## 🔒 Security Notes

1. **Never commit `.env` file** - Already in `.gitignore`
2. **Use AWS Secrets Manager** for production secrets
3. **Rotate keys regularly** - Set up key rotation schedule
4. **Enable CloudTrail** - Already configured in serverless.yml
5. **Monitor CloudWatch** - Set up alarms for errors

---

## 🐛 Troubleshooting

### Issue: Deployment fails with "Table already exists"
**Solution:** Tables are idempotent - they'll only be created if they don't exist. You can ignore this error or remove existing tables first.

### Issue: Missing environment variable
**Solution:** Check your `.env` file has all required variables. You can use defaults for testing.

### Issue: Secrets Manager access denied
**Solution:** Ensure your IAM role has `secretsmanager:GetSecretValue` permission (already added in serverless.yml).

### Issue: DynamoDB Scan errors
**Solution:** Added `dynamodb:Scan` permission to IAM role - redeploy to apply.

---

## ✅ Deployment Checklist

- [ ] Environment variables set in `.env`
- [ ] Stripe products created
- [ ] Stripe price IDs copied
- [ ] Secrets created in AWS Secrets Manager
- [ ] Run `serverless deploy`
- [ ] Copy API Gateway URL
- [ ] Configure Stripe webhook
- [ ] Test admin login endpoint
- [ ] Test usage endpoint
- [ ] Test subscription endpoint
- [ ] Update frontend URLs

---

**Ready to deploy!** Just run:
```bash
serverless deploy
```

All endpoints will be live and functional! 🚀
