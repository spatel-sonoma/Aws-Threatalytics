# ✅ Stripe Integration - Deployment Checklist

## 📋 Pre-Deployment

### 1. Stripe Configuration
- [ ] Create Stripe account (or use existing)
- [ ] Create products in Stripe Dashboard:
  - [ ] Starter Plan ($29/month)
  - [ ] Professional Plan ($99/month)
  - [ ] Enterprise Plan ($499/month)
- [ ] Copy Price IDs for each product
- [ ] Update `.env` file with Price IDs:
  ```bash
  VITE_STRIPE_PRICE_ID_STARTER=price_xxxxx
  VITE_STRIPE_PRICE_ID_PROFESSIONAL=price_xxxxx
  VITE_STRIPE_PRICE_ID_ENTERPRISE=price_xxxxx
  ```
- [ ] Configure webhook endpoint in Stripe Dashboard
- [ ] Copy webhook secret to backend `.env`

### 2. Backend Setup
- [ ] Verify DynamoDB tables exist:
  - [ ] `ThreatalyticsUsage` (usage tracking)
  - [ ] `ThreatalyticsUsers` (user data)
  - [ ] `ThreatalyticsPlans` (subscriptions)
- [ ] Deploy Lambda functions:
  ```bash
  serverless deploy function -f usageTracker
  serverless deploy function -f subscriptionManager
  ```
- [ ] Test endpoints manually:
  - [ ] `GET /usage` returns data
  - [ ] `POST /usage/track` increments count
  - [ ] `POST /subscription/create` returns checkout URL
  - [ ] `GET /subscription/status` returns status

### 3. Frontend Build
- [ ] Install dependencies:
  ```bash
  cd reactapp-main
  npm install
  ```
- [ ] Build frontend:
  ```bash
  npm run build
  ```
- [ ] Check for TypeScript errors: ✅ (Already done - no errors)
- [ ] Deploy to hosting (Vercel/Netlify/S3)

## 🧪 Testing

### Manual Testing
- [ ] **Sign up** for free account
- [ ] **Make API calls** (analyze, redact, etc.)
- [ ] **Check usage display** updates correctly
- [ ] **Hit usage limit** (100 calls for free)
- [ ] **Verify blocking** when limit reached
- [ ] **Click upgrade** button
- [ ] **Select plan** (use Stripe test card)
- [ ] **Complete checkout**
- [ ] **Verify redirect** back to dashboard
- [ ] **Check plan updated** in UI
- [ ] **Make more API calls** with new limit
- [ ] **Access billing portal**
- [ ] **Cancel subscription** (test)

### Test Cards (Stripe)
```
Success: 4242 4242 4242 4242
Decline: 4000 0000 0000 0002
Requires Auth: 4000 0025 0000 3155
```

### Automated Testing
- [ ] Test usage service:
  ```typescript
  const usage = await usageService.getUsage();
  console.log(usage); // Should return current usage
  ```
- [ ] Test subscription service:
  ```typescript
  const session = await subscriptionService.createCheckoutSession('starter');
  console.log(session.url); // Should return Stripe URL
  ```

## 🚀 Deployment Steps

### Step 1: Backend
```bash
# Navigate to project root
cd e:\SONOMA\Aws-Threatalytics

# Deploy all functions
serverless deploy

# Or deploy specific functions
serverless deploy function -f usageTracker
serverless deploy function -f subscriptionManager
serverless deploy function -f documentProcessor
```

### Step 2: Frontend
```bash
# Navigate to React app
cd reactapp-main

# Install dependencies
npm install

# Build production bundle
npm run build

# Deploy to hosting
# (Upload dist/ folder to your hosting provider)
```

### Step 3: Verify
- [ ] Visit deployed URL
- [ ] Check browser console for errors
- [ ] Test login/signup
- [ ] Test API calls
- [ ] Test usage tracking
- [ ] Test upgrade flow

## 🔍 Post-Deployment Verification

### Check CloudWatch Logs
```bash
# Usage tracker logs
aws logs tail /aws/lambda/usage-tracker --follow

# Subscription manager logs
aws logs tail /aws/lambda/subscription-manager --follow
```

### Check DynamoDB
```bash
# View usage table
aws dynamodb scan --table-name ThreatalyticsUsage --limit 10

# View subscriptions
aws dynamodb scan --table-name ThreatalyticsPlans --limit 10
```

### Monitor Stripe Dashboard
- [ ] Check for test charges
- [ ] Verify webhooks receiving events
- [ ] Check subscription creation
- [ ] Monitor payment success rate

## 📊 Success Metrics

After successful deployment, you should see:
- ✅ Usage stats updating in real-time
- ✅ Progress bars showing correct percentages
- ✅ Warnings when approaching limits
- ✅ Blocks when limits exceeded
- ✅ Stripe checkout working
- ✅ Plan upgrades reflected immediately
- ✅ Billing portal accessible

## 🐛 Troubleshooting

### Issue: Usage not tracking
**Solution:**
- Check Lambda logs for errors
- Verify DynamoDB permissions
- Check authentication token

### Issue: Stripe checkout fails
**Solution:**
- Verify Stripe API keys
- Check price IDs match products
- Review webhook configuration

### Issue: Usage display shows 0
**Solution:**
- Check `/usage` endpoint returns data
- Verify user authentication
- Clear browser cache

### Issue: Upgrade button doesn't work
**Solution:**
- Check Stripe price IDs in `.env`
- Verify `subscriptionService` API calls
- Check browser console for errors

## 📝 Environment Variables Checklist

### Frontend (.env)
```bash
✅ VITE_OPENAI_KEY
✅ VITE_STRIPE_PRICE_ID_STARTER
✅ VITE_STRIPE_PRICE_ID_PROFESSIONAL
✅ VITE_STRIPE_PRICE_ID_ENTERPRISE
```

### Backend (serverless.yml / AWS)
```bash
✅ STRIPE_SECRET_KEY
✅ STRIPE_WEBHOOK_SECRET
✅ OPENAI_SECRET
✅ USAGE_TABLE (ThreatalyticsUsage)
✅ USERS_TABLE (ThreatalyticsUsers)
✅ SUBSCRIPTIONS_TABLE (ThreatalyticsPlans)
```

## 🎉 Go-Live Checklist

- [ ] All tests passing
- [ ] No console errors
- [ ] Stripe products configured
- [ ] Webhooks working
- [ ] Usage tracking functional
- [ ] Plan upgrades working
- [ ] Billing portal accessible
- [ ] Documentation updated
- [ ] Team trained on features
- [ ] Support ready for issues
- [ ] Monitoring alerts configured
- [ ] Backup strategy in place

## 📞 Support Contacts

- Stripe Dashboard: https://dashboard.stripe.com
- AWS Console: https://console.aws.amazon.com
- CloudWatch Logs: Check Lambda function logs
- DynamoDB Tables: Check usage/subscription data

## 🔄 Rollback Plan

If issues occur:
1. Revert frontend deployment
2. Roll back Lambda functions:
   ```bash
   serverless rollback -t <timestamp>
   ```
3. Disable Stripe webhook temporarily
4. Restore from backup if needed

## 📚 Documentation Links

- [Stripe Integration Guide](./STRIPE_INTEGRATION_GUIDE.md)
- [Implementation Summary](./STRIPE_IMPLEMENTATION_SUMMARY.md)
- [Quick Reference](./QUICK_REFERENCE.md)
- [Backend Documentation](../lambda_functions/README.md)

---

**Last Updated:** $(date)
**Status:** Ready for Deployment ✅
