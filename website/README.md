# Threatalytics AI Website - Deployment Guide for AWS Developer

## 📁 Project Structure

```
website/
├── index.html          # Main website file
├── proxy-server.js     # CORS proxy (for local dev only)
├── package.json        # Node.js dependencies
└── README.md          # This file
```

## 🚨 CRITICAL: Fix CORS in API Gateway First

**Before deploying the website**, the AWS developer MUST enable CORS on API Gateway:

### Step 1: Enable CORS in API Gateway Console
1. Go to AWS API Gateway Console
2. Select API: `threatalytics-gpt-api`
3. For EACH resource (`/analyze`, `/redact`, `/generate-report`, `/simulate-drill`):
   - Click the resource
   - Actions → Enable CORS
   - Check all methods (POST, OPTIONS)
   - Click "Enable CORS and replace existing CORS headers"
4. **Deploy to `dev` stage**

### Step 2: Update Lambda Response Headers (Already Done)
The Lambda functions already have CORS headers in responses:
```python
'headers': {
    'Access-Control-Allow-Origin': '*',
    'Access-Control-Allow-Headers': 'Content-Type,X-Api-Key',
    'Access-Control-Allow-Methods': 'POST,OPTIONS'
}
```

### Step 3: Update Custom Domain Mapping
Ensure `api.threatalyticsai.com` correctly maps to the API Gateway stage with CORS enabled.

---

## 🚀 Deployment Options (After CORS is Fixed)

### Option 1: AWS S3 + CloudFront (Recommended for Production)

#### Step 1: Update API URL in index.html
**IMPORTANT**: Before deploying, update line 427 in `index.html`:
```javascript
// Change from local proxy
const API_BASE_URL = 'http://localhost:3000/api';

// To production API (after CORS is fixed)
const API_BASE_URL = 'https://api.threatalyticsai.com';
```

Also update the endpoint URLs (lines 473-489) back to actual endpoints:
```javascript
case 'report':
    url = `${API_BASE_URL}/generate-report`;  // Not /report
    body = { data: inputText };
    break;
case 'drill':
    url = `${API_BASE_URL}/simulate-drill`;   // Not /drill
    body = { scenario: inputText };
    break;
```

#### Step 2: Create S3 Bucket
```bash
# Create bucket
aws s3 mb s3://threatalyticsai-website

# Enable static website hosting
aws s3 website s3://threatalyticsai-website --index-document index.html --error-document index.html

# Create bucket policy for public access
cat > bucket-policy.json << EOF
{
  "Version": "2012-10-17",
  "Statement": [{
    "Sid": "PublicReadGetObject",
    "Effect": "Allow",
    "Principal": "*",
    "Action": "s3:GetObject",
    "Resource": "arn:aws:s3:::threatalyticsai-website/*"
  }]
}
EOF

aws s3api put-bucket-policy --bucket threatalyticsai-website --policy file://bucket-policy.json
```

#### Step 3: Upload Website
```bash
cd website
# Only upload index.html (proxy-server.js not needed in production)
aws s3 cp index.html s3://threatalyticsai-website/ --content-type "text/html"
```

#### Step 4: Configure CloudFront
```bash
# Create CloudFront distribution
aws cloudfront create-distribution \
  --origin-domain-name threatalyticsai-website.s3-website-us-east-1.amazonaws.com \
  --default-root-object index.html

# Note the Distribution Domain Name (e.g., d1234abcd.cloudfront.net)
```

#### Step 5: Configure SSL Certificate
1. Go to AWS Certificate Manager (ACM) in **us-east-1** region
2. Request certificate for `www.threatalyticsai.com` and `threatalyticsai.com`
3. Validate via DNS (add CNAME records to Route 53)
4. Attach certificate to CloudFront distribution

#### Step 6: Update Route 53
```bash
# Add CNAME record for www
aws route53 change-resource-record-sets --hosted-zone-id YOUR_ZONE_ID --change-batch '{
  "Changes": [{
    "Action": "CREATE",
    "ResourceRecordSet": {
      "Name": "www.threatalyticsai.com",
      "Type": "CNAME",
      "TTL": 300,
      "ResourceRecords": [{"Value": "d1234abcd.cloudfront.net"}]
    }
  }]
}'
```

### Option 2: Netlify (Fastest for Quick Demo)

#### Step 1: Update API URL
Same as Option 1 - change from `localhost:3000` to `https://api.threatalyticsai.com`

#### Step 2: Deploy to Netlify
```bash
# Install Netlify CLI
npm install -g netlify-cli

# Login
netlify login

# Deploy
cd website
netlify deploy --prod

# Follow prompts:
# - Create new site? Yes
# - Publish directory: .
```

#### Step 3: Configure Custom Domain
1. Go to Netlify dashboard
2. Site settings → Domain management
3. Add custom domain: `www.threatalyticsai.com`
4. Update DNS in Route 53 with Netlify's nameservers or CNAME

#### Benefits:
- ✅ Auto SSL (Let's Encrypt)
- ✅ Global CDN
- ✅ Automatic deployments
- ✅ Free tier available

### Option 3: GitHub Pages

1. Create repo: `threatalyticsai-website`
2. Push `website/index.html` to repo
3. Enable GitHub Pages in settings
4. Configure custom domain

### Option 4: Vercel

1. Install Vercel CLI: `npm install -g vercel`
2. Run: `cd website && vercel`
3. Configure custom domain in Vercel dashboard

### Option 3: AWS Amplify (Integrated AWS Solution)

#### Step 1: Update API URL (same as above)

#### Step 2: Deploy with Amplify
```bash
# Install Amplify CLI
npm install -g @aws-amplify/cli

# Initialize
cd website
amplify init

# Add hosting
amplify add hosting
# Select: Hosting with Amplify Console
# Select: Manual deployment

# Publish
amplify publish
```

#### Step 3: Configure Custom Domain
1. Go to AWS Amplify Console
2. App settings → Domain management
3. Add domain: `www.threatalyticsai.com`
4. Amplify will automatically configure SSL and CloudFront

---

## 🔑 Configuration Changes Required

### 1. Update API URL
**File**: `index.html`, Line ~427
```javascript
// LOCAL DEVELOPMENT (with proxy)
const API_BASE_URL = 'http://localhost:3000/api';

// PRODUCTION (after CORS is fixed)
const API_BASE_URL = 'https://api.threatalyticsai.com';
```

### 2. Update API Endpoints
**File**: `index.html`, Lines ~473-489

Change simplified endpoints back to actual API paths:
```javascript
case 'report':
    url = `${API_BASE_URL}/generate-report`;  // Not /report
    break;
case 'drill':
    url = `${API_BASE_URL}/simulate-drill`;   // Not /drill
    break;
```

### 3. Update API Key (Optional)
**File**: `index.html`, Line ~428
```javascript
const API_KEY = 'YOUR_PRODUCTION_API_KEY'; // Replace demo key
```

## 🎨 Customization

### Change Colors
Edit CSS variables around line 15-20:
```css
background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
```

### Update Pricing
Edit lines 250-300 for pricing cards

### Add Stripe Integration
Replace `purchase()` function (line 445) with Stripe Checkout:
```javascript
function purchase(plan) {
    window.location.href = 'https://checkout.stripe.com/...';
}
```

## 🧪 Test Locally

Open `website/index.html` in browser to test before deploying.

## 📊 Features Included

✅ Live demo of all 4 endpoints
✅ Beautiful gradient design
✅ Responsive (mobile-friendly)
✅ Pricing cards with CTAs
✅ Real-time API integration
✅ Error handling
✅ Loading states
✅ FERPA compliance messaging

---

## 🧪 Local Development & Testing

### Option A: Using Live Server (Recommended)

**If CORS is fixed on API Gateway**:
```bash
# Install Live Server globally
npm install -g live-server

# Update index.html to use production API
# Then start server
cd website
live-server --port=8000
```

Open: http://localhost:8000

### Option B: Using Proxy Server (Current Setup)

**If CORS is NOT fixed yet**:
```bash
# Terminal 1: Start proxy
cd website
npm install
node proxy-server.js

# Terminal 2: Start web server
python -m http.server 8000
```

Open: http://localhost:8000

**Note**: Proxy server is ONLY for local development. Do NOT deploy `proxy-server.js` to production.

---

## ✅ Pre-Deployment Checklist

- [ ] **CORS enabled** in API Gateway for all endpoints
- [ ] **API Gateway deployed** to dev/prod stage
- [ ] **Custom domain** `api.threatalyticsai.com` working
- [ ] **Updated** `API_BASE_URL` in index.html to production URL
- [ ] **Updated** endpoint paths (`/generate-report`, `/simulate-drill`)
- [ ] **Replaced** demo API key with production key (optional)
- [ ] **Tested** all 4 endpoints locally
- [ ] **SSL certificate** configured for www.threatalyticsai.com
- [ ] **DNS records** updated in Route 53

---

## 🐛 Troubleshooting

### CORS Errors After Deployment

**Symptom**: "No 'Access-Control-Allow-Origin' header"

**Fix**:
1. Verify OPTIONS method exists for each endpoint in API Gateway
2. Redeploy API Gateway to dev/prod stage
3. Clear browser cache (Ctrl+Shift+R)
4. Check Lambda function returns CORS headers

### API Returns 502 Bad Gateway

**Symptom**: "Internal server error" from API

**Fix**:
1. Check CloudWatch logs: `/aws/lambda/threatalytics-gpt-api-dev-analyze`
2. Verify Lambda has `OPENAI_SECRET` environment variable
3. Check Lambda execution role has Secrets Manager permissions
4. Increase Lambda timeout (current might be too short for GPT-4)

### Website Shows Blank Page

**Fix**:
1. Check browser console for JavaScript errors
2. Verify API_BASE_URL is correct
3. Test API endpoints manually with curl
4. Check CloudFront/CDN cache settings

---

## � Security Best Practices

### For Production:
1. **Replace demo API key** with production key
2. **Restrict API key usage** in API Gateway (usage plans)
3. **Enable AWS WAF** on CloudFront to block malicious requests
4. **Monitor usage** via CloudWatch and DynamoDB
5. **Set up alerts** for high usage or errors (SNS)
6. **Enable CloudTrail** for audit logging

### API Key Management:
```javascript
// Option 1: Hardcode (simple, less secure)
const API_KEY = 'your-key-here';

// Option 2: Environment variable (recommended for server-side)
// Not applicable for pure frontend deployment

// Option 3: User authentication (most secure)
// Implement user login, API key per user from backend
```

---

## 📊 Monitoring & Analytics

### CloudWatch Dashboards
Create dashboard to monitor:
- API Gateway request count
- Lambda invocations
- Lambda errors and duration
- DynamoDB usage tracking

### Google Analytics (Optional)
Add to `index.html` before `</head>`:
```html
<script async src="https://www.googletagmanager.com/gtag/js?id=GA_TRACKING_ID"></script>
<script>
  window.dataLayer = window.dataLayer || [];
  function gtag(){dataLayer.push(arguments);}
  gtag('js', new Date());
  gtag('config', 'GA_TRACKING_ID');
</script>
```

---

## 📞 Support & Contact

**For AWS Developer**:
- API Gateway CORS configuration required
- Lambda function CloudWatch logs path: `/aws/lambda/threatalytics-gpt-api-dev-*`
- S3 bucket for logs: `threatalytics-logs-{account-id}`

**For Website Issues**:
- Check browser console for errors
- Verify API endpoints are accessible
- Test with curl before deploying

---

## 🚀 Quick Deployment Summary

```bash
# 1. Fix CORS in API Gateway Console (manual step)

# 2. Update index.html
# Change API_BASE_URL to https://api.threatalyticsai.com
# Change endpoint paths back to actual names

# 3. Deploy to S3
aws s3 cp index.html s3://threatalyticsai-website/ --content-type "text/html"

# 4. Invalidate CloudFront cache (if using CloudFront)
aws cloudfront create-invalidation --distribution-id YOUR_DIST_ID --paths "/*"

# 5. Test
curl https://www.threatalyticsai.com
```

**The website is ready to showcase Threatalytics GPT-powered threat analysis to clients!** 🎉