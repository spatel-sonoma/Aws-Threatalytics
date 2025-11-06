# 🚀 Quick Deployment Checklist

## ✅ Pre-Deployment

- [ ] **1. Copy `.env.example` to `.env`**
  ```bash
  cp .env.example .env
  ```

- [ ] **2. Create Stripe Products**
  - Go to https://dashboard.stripe.com/products
  - Create 3 products:
    - Starter: $9.99/month
    - Professional: $49.99/month
    - Enterprise: Custom
  - Copy Price IDs (format: `price_xxxxxxxxxxxxx`)

- [ ] **3. Update `.env` file**
  ```bash
  # Add your Stripe keys
  STRIPE_SECRET_KEY=sk_test_xxxxx
  STRIPE_PRICE_ID_STARTER=price_xxxxx
  STRIPE_PRICE_ID_PROFESSIONAL=price_xxxxx
  STRIPE_PRICE_ID_ENTERPRISE=price_xxxxx
  
  # Generate admin secret (use a strong random string)
  ADMIN_SECRET_KEY=$(openssl rand -hex 32)
  ```

- [ ] **4. Store Stripe Secret in AWS**
  ```bash
  aws secretsmanager create-secret \
      --name threatalytics/stripe \
      --secret-string '{"STRIPE_SECRET_KEY":"'$STRIPE_SECRET_KEY'"}' \
      --region us-east-1
  ```

---

## 🎯 Deployment

- [ ] **5. Install Dependencies**
  ```bash
  npm install
  ```

- [ ] **6. Deploy to AWS**
  ```bash
  serverless deploy
  ```

- [ ] **7. Copy API Gateway URL**
  - Look for output like: `https://xxxxxxxxxx.execute-api.us-east-1.amazonaws.com/dev`
  - Save this URL - you'll need it for frontend and Stripe

---

## 🔗 Post-Deployment

- [ ] **8. Configure Stripe Webhook**
  - Go to https://dashboard.stripe.com/webhooks
  - Click "Add endpoint"
  - URL: `YOUR_API_URL/stripe/webhook`
  - Select events:
    - ✅ customer.subscription.created
    - ✅ customer.subscription.updated
    - ✅ customer.subscription.deleted
    - ✅ invoice.payment_succeeded
    - ✅ invoice.payment_failed
  - Copy webhook secret

- [ ] **9. Update Stripe Secret with Webhook**
  ```bash
  aws secretsmanager update-secret \
      --secret-id threatalytics/stripe \
      --secret-string '{"STRIPE_SECRET_KEY":"'$STRIPE_SECRET_KEY'","STRIPE_WEBHOOK_SECRET":"whsec_xxxxx"}' \
      --region us-east-1
  ```

- [ ] **10. Update Frontend URLs**
  - In `admin/login.html`:
    ```javascript
    const API_BASE_URL = 'YOUR_API_URL';
    ```
  - In `admin/index.html`:
    ```javascript
    const API_BASE_URL = 'YOUR_API_URL';
    ```
  - In `website/upgrade.html`:
    ```javascript
    const API_BASE_URL = 'YOUR_API_URL';
    ```
  - In `website/auth.js`:
    ```javascript
    this.API_BASE_URL = 'YOUR_API_URL';
    ```

- [ ] **11. Upload Frontend to S3**
  ```bash
  # Admin Dashboard
  aws s3 sync admin/ s3://your-admin-bucket/ --exclude "*.py"
  
  # Website
  aws s3 sync website/ s3://your-website-bucket/
  ```

- [ ] **12. Invalidate CloudFront Cache**
  ```bash
  aws cloudfront create-invalidation \
      --distribution-id YOUR_DISTRIBUTION_ID \
      --paths "/*"
  ```

---

## 🧪 Testing

- [ ] **13. Test Admin Login**
  ```bash
  curl -X POST YOUR_API_URL/admin/auth \
    -H "Content-Type: application/json" \
    -d '{"action":"login","email":"admin@threatalyticsai.com","password":"admin123"}'
  ```
  - Expected: `{"message":"Login successful","token":"...","user":{...}}`

- [ ] **14. Test Usage Endpoint**
  ```bash
  curl -X GET YOUR_API_URL/usage \
    -H "Authorization: Bearer USER_TOKEN"
  ```
  - Expected: `{"user_id":"...","plan":"free","current":0,"limit":100,...}`

- [ ] **15. Test Stripe Checkout**
  - Go to `https://your-site-url/upgrade.html`
  - Click "Subscribe" on Starter plan
  - Should redirect to Stripe Checkout
  - Use test card: `4242 4242 4242 4242`
  - Expiry: Any future date
  - CVC: Any 3 digits
  - Verify webhook receives event

- [ ] **16. Test Admin Dashboard**
  - Go to `https://your-admin-url/login.html`
  - Login with admin credentials
  - Verify dashboard loads
  - Check users list displays
  - Verify charts render

---

## 📊 Verification

- [ ] **17. Check CloudWatch Logs**
  - Go to AWS Console → CloudWatch → Log Groups
  - Look for `/aws/lambda/threatalytics-gpt-api-dev-*`
  - Verify no errors

- [ ] **18. Check DynamoDB Tables**
  - Go to AWS Console → DynamoDB → Tables
  - Verify tables exist:
    - ThreatalyticsUsers
    - ThreatalyticsUsage
    - ThreatalyticsPlans
    - ThreatalyticsConversations

- [ ] **19. Check Stripe Dashboard**
  - Go to https://dashboard.stripe.com/test/payments
  - Verify test payment appears
  - Check webhook logs for successful events

- [ ] **20. Monitor API Gateway**
  - Go to AWS Console → API Gateway
  - Check request count
  - Verify no errors

---

## ✅ Final Checklist

- [ ] All Lambda functions deployed successfully
- [ ] DynamoDB tables created
- [ ] Stripe webhook configured
- [ ] Frontend uploaded to S3
- [ ] CloudFront cache invalidated
- [ ] Admin login working
- [ ] User subscription working
- [ ] Usage tracking functional
- [ ] All tests passing
- [ ] Documentation updated

---

## 🎉 You're Live!

**Admin Dashboard:** https://your-admin-url/login.html
- Email: `admin@threatalyticsai.com`
- Password: `admin123`

**User Site:** https://your-site-url/
**Upgrade Page:** https://your-site-url/upgrade.html

---

## 📞 Support

If you encounter issues:
1. Check CloudWatch logs
2. Verify environment variables
3. Check Stripe webhook logs
4. Review DEPLOYMENT_GUIDE.md
5. Check SERVERLESS_UPDATED.md

**Everything is ready to go live! 🚀**
