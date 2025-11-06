# 🚀 Quick Start: Run & Test Local Backend

## Easiest Way (Recommended)

Just run this one command:

```powershell
.\simple_test.ps1
```

This will:
- ✅ Start the local API server
- ✅ Run automated tests
- ✅ Show you all available endpoints
- ✅ Keep the server running

**Press any key to stop the server when done.**

---

## Manual Way

### Step 1: Start the Server

```powershell
# Set environment variables
$env:AWS_DEFAULT_REGION = "us-east-1"
$env:ADMIN_SECRET_KEY = "threatalytics-admin-secret-2025"

# Start server
python local_api_server.py
```

Server runs on: `http://localhost:8000`

### Step 2: Test in Another Terminal

Open a new PowerShell window and run:

```powershell
# Test Admin Login
$body = @{
    action = "login"
    email = "admin@threatalyticsai.com"
    password = "admin123"
} | ConvertTo-Json

Invoke-RestMethod -Uri "http://localhost:8000/admin/auth" `
    -Method POST `
    -Body $body `
    -ContentType "application/json"
```

**Expected Response:**
```json
{
  "message": "Login successful",
  "token": "eyJ...",
  "user": {
    "email": "admin@threatalyticsai.com",
    "name": "Admin User",
    "role": "super_admin"
  }
}
```

---

## Test Individual Functions

### Without Server (Direct Python):

```powershell
# Test admin auth only
python test_admin_auth_local.py

# Test usage tracker (needs AWS)
python test_usage_local.py
```

---

## Available Test Endpoints

### ✅ Works Without External Services:

**Admin Authentication:**
```powershell
# Login
$body = @{action="login";email="admin@threatalyticsai.com";password="admin123"} | ConvertTo-Json
Invoke-RestMethod -Uri "http://localhost:8000/admin/auth" -Method POST -Body $body -ContentType "application/json"

# Verify Token
$body = @{action="verify_token";token="YOUR_TOKEN_HERE"} | ConvertTo-Json
Invoke-RestMethod -Uri "http://localhost:8000/admin/auth" -Method POST -Body $body -ContentType "application/json"

# Logout
$body = @{action="logout";token="YOUR_TOKEN_HERE"} | ConvertTo-Json
Invoke-RestMethod -Uri "http://localhost:8000/admin/auth" -Method POST -Body $body -ContentType "application/json"
```

### ⚠️ Needs OpenAI API Key:

Set your key first:
```powershell
$env:OPENAI_API_KEY = "sk-your-key-here"
```

**Threat Analysis:**
```powershell
$body = @{text="Multiple failed login attempts from IP 192.168.1.100"} | ConvertTo-Json
Invoke-RestMethod -Uri "http://localhost:8000/analyze" -Method POST -Body $body -ContentType "application/json"
```

**PII Redaction:**
```powershell
$body = @{text="John Smith's email is john@example.com and phone is 555-1234"} | ConvertTo-Json
Invoke-RestMethod -Uri "http://localhost:8000/redact" -Method POST -Body $body -ContentType "application/json"
```

**Generate Report:**
```powershell
$body = @{data="Security incident on Nov 5, 2025"} | ConvertTo-Json
Invoke-RestMethod -Uri "http://localhost:8000/report" -Method POST -Body $body -ContentType "application/json"
```

**Simulate Drill:**
```powershell
$body = @{scenario="Ransomware attack simulation"} | ConvertTo-Json
Invoke-RestMethod -Uri "http://localhost:8000/drill" -Method POST -Body $body -ContentType "application/json"
```

### ⚠️ Needs AWS DynamoDB:

Configure AWS first:
```powershell
aws configure
# Or use moto for mocking: pip install moto[dynamodb]
```

**Usage Tracking:**
```powershell
# Track usage
$body = @{action="track";user_id="test-123";endpoint="/analyze"} | ConvertTo-Json
Invoke-RestMethod -Uri "http://localhost:8000/usage" -Method POST -Body $body -ContentType "application/json"

# Get usage
$body = @{action="get";user_id="test-123"} | ConvertTo-Json
Invoke-RestMethod -Uri "http://localhost:8000/usage" -Method POST -Body $body -ContentType "application/json"

# Check limit
$body = @{action="check";user_id="test-123"} | ConvertTo-Json
Invoke-RestMethod -Uri "http://localhost:8000/usage" -Method POST -Body $body -ContentType "application/json"
```

### ⚠️ Needs Stripe + DynamoDB:

Set Stripe key:
```powershell
$env:STRIPE_SECRET_KEY = "sk_test_your-key"
$env:STRIPE_PRICE_ID_STARTER = "price_xxxxx"
```

**Subscription Management:**
```powershell
# Create checkout session
$body = @{action="create_checkout";user_id="test-123";email="test@example.com";plan="starter"} | ConvertTo-Json
Invoke-RestMethod -Uri "http://localhost:8000/subscription" -Method POST -Body $body -ContentType "application/json"

# Get subscription status
$body = @{action="get_status";user_id="test-123"} | ConvertTo-Json
Invoke-RestMethod -Uri "http://localhost:8000/subscription" -Method POST -Body $body -ContentType "application/json"
```

---

## Test in Browser

Visit: `http://localhost:8000`

You'll see a web interface with all endpoints and test commands.

---

## Default Credentials

**Admin Account:**
- Email: `admin@threatalyticsai.com`
- Password: `admin123`

**Support Account:**
- Email: `support@threatalyticsai.com`
- Password: `password`

---

## Troubleshooting

**Server won't start:**
```powershell
# Check if port 8000 is already in use
netstat -ano | findstr :8000

# Kill the process if needed
taskkill /PID <PID> /F
```

**Import errors:**
```powershell
# Install dependencies
pip install boto3 openai stripe requests
```

**AWS region error:**
```powershell
$env:AWS_DEFAULT_REGION = "us-east-1"
```

**DynamoDB errors:**
```powershell
# Either configure AWS
aws configure

# Or use moto for local testing
pip install moto[dynamodb]
```

---

## Quick Commands Summary

| Command | Purpose |
|---------|---------|
| `.\simple_test.ps1` | **Start server + auto test** (recommended) |
| `python local_api_server.py` | Start server manually |
| `python test_admin_auth_local.py` | Test admin auth only |
| `.\quick_test.ps1` | Run all available tests |
| `start http://localhost:8000` | Open in browser |

---

## Next Steps

1. ✅ **Test locally** - Use `.\simple_test.ps1`
2. ✅ **Fix any issues** - Check logs and troubleshoot
3. 🚀 **Deploy to AWS** - Run `serverless deploy`
4. 🧪 **Test live API** - Use deployed API Gateway URLs
5. 📊 **Monitor logs** - Check CloudWatch for issues

---

**You're all set! Run `.\simple_test.ps1` to get started! 🚀**
