# 🚀 New Endpoints Deployment Guide

## 📋 All Available Endpoints

### **Core Analysis Endpoints** (Existing)
1. **POST /analyze** - Threat analysis with GPT-4
2. **POST /redact** - PII redaction
3. **POST /report** - Generate reports
4. **POST /drill** - Simulate drills
5. **POST /demo** - Demo endpoint
6. **POST /stripe/webhook** - Stripe payment webhooks

### **New Authentication Endpoints** ✨
7. **POST /auth** - User signup, login, token refresh, logout
   - Actions: `signup`, `login`, `refresh`, `logout`

### **New Conversation Endpoints** ✨
8. **GET /conversations** - Get all user conversations
9. **POST /conversations** - Save new conversation
10. **DELETE /conversations/{id}** - Delete conversation

---

## 🚀 Quick Deployment Steps

### **Option 1: Deploy WITHOUT Authentication (Basic)**

If you want to deploy just the existing endpoints without authentication:

```powershell
# Make sure AWS credentials are configured
aws sts get-caller-identity

# Deploy
serverless deploy
```

This will deploy:
- ✅ /analyze
- ✅ /redact
- ✅ /report
- ✅ /drill
- ✅ /demo
- ✅ /stripe/webhook
- ⚠️ /auth (will work but without Cognito - needs setup)
- ⚠️ /conversations (will work but without Cognito - needs setup)

---

### **Option 2: Deploy WITH Authentication (Full Setup)**

To deploy all endpoints including authentication:

#### **Step 1: Create AWS Cognito User Pool**

```powershell
# Create User Pool
aws cognito-idp create-user-pool `
    --pool-name threatalytics-user-pool `
    --policies "PasswordPolicy={MinimumLength=8,RequireUppercase=true,RequireLowercase=true,RequireNumbers=true,RequireSymbols=false}" `
    --auto-verified-attributes email `
    --username-attributes email `
    --mfa-configuration OFF `
    --region us-east-1
```

**Save the UserPoolId from output!** (e.g., `us-east-1_XXXXXXXXX`)

#### **Step 2: Create User Pool Client**

```powershell
# Replace <YOUR_USER_POOL_ID> with the ID from Step 1
aws cognito-idp create-user-pool-client `
    --user-pool-id <YOUR_USER_POOL_ID> `
    --client-name threatalytics-web-client `
    --explicit-auth-flows ALLOW_USER_PASSWORD_AUTH ALLOW_REFRESH_TOKEN_AUTH `
    --prevent-user-existence-errors ENABLED `
    --region us-east-1
```

**Save the ClientId from output!** (e.g., `xxxxxxxxxxxxxxxxxxxxxxxxxx`)

#### **Step 3: Set Environment Variables**

```powershell
# Set environment variables for current session
$env:COGNITO_USER_POOL_ID="us-east-1_XXXXXXXXX"
$env:COGNITO_CLIENT_ID="xxxxxxxxxxxxxxxxxxxxxxxxxx"

# Or create a .env file (copy from .env.example)
# Note: Serverless will read these from environment, not .env file
```

#### **Step 4: Deploy**

```powershell
serverless deploy
```

This will deploy ALL endpoints with full authentication support! ✅

---

## 📊 After Deployment - What You'll Get

After running `serverless deploy`, you'll see output like:

```
endpoints:
  POST - https://xxxxxxxxxx.execute-api.us-east-1.amazonaws.com/dev/analyze
  POST - https://xxxxxxxxxx.execute-api.us-east-1.amazonaws.com/dev/redact
  POST - https://xxxxxxxxxx.execute-api.us-east-1.amazonaws.com/dev/report
  POST - https://xxxxxxxxxx.execute-api.us-east-1.amazonaws.com/dev/drill
  POST - https://xxxxxxxxxx.execute-api.us-east-1.amazonaws.com/dev/demo
  POST - https://xxxxxxxxxx.execute-api.us-east-1.amazonaws.com/dev/stripe/webhook
  POST - https://xxxxxxxxxx.execute-api.us-east-1.amazonaws.com/dev/auth
  GET  - https://xxxxxxxxxx.execute-api.us-east-1.amazonaws.com/dev/conversations
  POST - https://xxxxxxxxxx.execute-api.us-east-1.amazonaws.com/dev/conversations
  DELETE - https://xxxxxxxxxx.execute-api.us-east-1.amazonaws.com/dev/conversations/{id}
```

---

## 🔧 Update Frontend with API URLs

### **Step 1: Update website/index.html**

Find this line (around line 822):
```javascript
const API_BASE_URL = 'https://api.threatalyticsai.com';
```

Replace with your actual API Gateway URL:
```javascript
const API_BASE_URL = 'https://xxxxxxxxxx.execute-api.us-east-1.amazonaws.com/dev';
```

### **Step 2: Update website/auth.js**

Find this line (around line 4):
```javascript
this.API_BASE_URL = 'https://api.threatalyticsai.com';
```

Replace with your actual API Gateway URL:
```javascript
this.API_BASE_URL = 'https://xxxxxxxxxx.execute-api.us-east-1.amazonaws.com/dev';
```

---

## 🧪 Test Your Endpoints

### Test Core Endpoint (No Auth)
```powershell
$apiUrl = "https://xxxxxxxxxx.execute-api.us-east-1.amazonaws.com/dev"
$apiKey = "your-api-key-here"

# Test analyze
Invoke-RestMethod -Uri "$apiUrl/analyze" -Method Post `
    -Headers @{"x-api-key"=$apiKey; "Content-Type"="application/json"} `
    -Body '{"text":"Test threat analysis"}' | ConvertTo-Json
```

### Test Auth Endpoint
```powershell
# Test signup
Invoke-RestMethod -Uri "$apiUrl/auth" -Method Post `
    -Headers @{"Content-Type"="application/json"} `
    -Body '{"action":"signup","email":"test@example.com","password":"SecurePass123","name":"Test User"}' | ConvertTo-Json
```

### Test Conversations Endpoint
```powershell
# First login to get token
$loginResponse = Invoke-RestMethod -Uri "$apiUrl/auth" -Method Post `
    -Headers @{"Content-Type"="application/json"} `
    -Body '{"action":"login","email":"test@example.com","password":"SecurePass123"}'

$token = $loginResponse.tokens.access_token

# Get conversations
Invoke-RestMethod -Uri "$apiUrl/conversations" -Method Get `
    -Headers @{"Authorization"="Bearer $token"} | ConvertTo-Json
```

---

## 📁 Files Updated

### Modified:
- ✅ `serverless.yml` - Added auth & conversations endpoints
- ✅ `serverless.yml` - Added Cognito IAM permissions
- ✅ `serverless.yml` - Added DynamoDB tables (Users, Conversations)

### Created:
- ✅ `.env.example` - Template for environment variables
- ✅ `deploy-endpoints.ps1` - Automated deployment script

### Already Exist (from previous work):
- ✅ `lambda_functions/auth.py` - Authentication handler
- ✅ `lambda_functions/conversations.py` - Conversation manager
- ✅ `website/auth.js` - Frontend authentication
- ✅ `website/index.html` - UI with auth modal

---

## 🎯 Recommended Deployment Path

### **For Quick Testing (5 minutes):**
```powershell
# Just deploy without auth setup
serverless deploy
```
- You'll get all endpoints live
- Auth endpoints won't work fully until Cognito is set up
- Core endpoints (analyze, redact, etc.) work immediately

### **For Production (30 minutes):**
```powershell
# Follow Option 2 above:
# 1. Create Cognito User Pool
# 2. Create User Pool Client  
# 3. Set environment variables
# 4. Deploy
serverless deploy
```
- Full authentication system
- User management
- Conversation history
- Complete production setup

---

## 🆘 Troubleshooting

### Error: "AWS credentials missing"
```powershell
aws configure
```

### Error: "COGNITO_USER_POOL_ID is not defined"
```powershell
# Set it temporarily
$env:COGNITO_USER_POOL_ID="us-east-1_XXXXXXXXX"
$env:COGNITO_CLIENT_ID="xxxxxxxxxxxxxxxxxxxxxxxxxx"

# Then deploy
serverless deploy
```

### Error: "Stack already exists"
```powershell
# Remove existing stack
serverless remove

# Deploy fresh
serverless deploy
```

---

## 🎉 What's Next?

After deployment:

1. ✅ Copy your API Gateway URL
2. ✅ Update `website/index.html` and `website/auth.js` with the URL
3. ✅ Test signup/login flow
4. ✅ Test conversation save/load
5. ✅ Deploy your website to hosting (S3, Netlify, Vercel)

---

## 📞 Quick Commands Reference

```powershell
# Check AWS credentials
aws sts get-caller-identity

# Deploy everything
serverless deploy

# Deploy specific function
serverless deploy function -f auth

# View logs
serverless logs -f auth --tail

# Remove deployment
serverless remove

# Test endpoint locally
serverless invoke local -f auth --data '{"body":"{\"action\":\"login\"}"}'
```

---

**Ready to deploy?** Run:
```powershell
.\deploy-endpoints.ps1
```

Or manually:
```powershell
serverless deploy
```
