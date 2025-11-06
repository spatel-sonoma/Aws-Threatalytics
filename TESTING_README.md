# 🧪 Testing Lambda Functions Locally

## ✅ Quick Start

### Test Functions That Don't Need AWS

**1. Test Admin Authentication** (No AWS needed):
```powershell
python test_admin_auth_local.py
```

**Expected Output:**
- ✅ Valid admin login works
- ✅ Token generation successful
- ✅ Token verification works
- ✅ Logout works
- ✅ Invalid credentials rejected

**Credentials:**
- Admin: `admin@threatalyticsai.com` / `admin123`
- Support: `support@threatalyticsai.com` / `password`

---

### Test Functions That Need API Keys

**2. Test Threat Analysis** (Needs OpenAI API key):

Set your OpenAI key:
```powershell
$env:OPENAI_API_KEY = "sk-your-key-here"
```

Create test file `test_analyze.py`:
```python
import sys
sys.path.append('./lambda_functions')
import os
os.environ['OPENAI_API_KEY'] = 'sk-your-key'

from analyze import lambda_handler

event = {'body': '{"text":"Multiple failed logins from IP 192.168.1.100"}'}
response = lambda_handler(event, None)
print(response['body'])
```

Run it:
```powershell
python test_analyze.py
```

---

### Test Functions That Need AWS DynamoDB

Functions that require DynamoDB:
- `usage_tracker.py`
- `subscription_manager.py`
- `conversations.py`

**Option 1: Use Mocked DynamoDB** (Recommended for local testing)

Install moto:
```powershell
pip install moto[dynamodb]
```

Create `test_usage_mock.py`:
```python
from moto import mock_dynamodb
import boto3
import sys
sys.path.append('./lambda_functions')

@mock_dynamodb
def test_usage_tracker():
    # Create mock DynamoDB
    dynamodb = boto3.resource('dynamodb', region_name='us-east-1')
    
    # Create tables
    usage_table = dynamodb.create_table(
        TableName='ThreatalyticsUsage',
        KeySchema=[
            {'AttributeName': 'user_id', 'KeyType': 'HASH'},
            {'AttributeName': 'timestamp', 'KeyType': 'RANGE'}
        ],
        AttributeDefinitions=[
            {'AttributeName': 'user_id', 'AttributeType': 'S'},
            {'AttributeName': 'timestamp', 'AttributeType': 'S'}
        ],
        BillingMode='PAY_PER_REQUEST'
    )
    
    plans_table = dynamodb.create_table(
        TableName='ThreatalyticsPlans',
        KeySchema=[
            {'AttributeName': 'user_id', 'KeyType': 'HASH'}
        ],
        AttributeDefinitions=[
            {'AttributeName': 'user_id', 'AttributeType': 'S'}
        ],
        BillingMode='PAY_PER_REQUEST'
    )
    
    # Now test
    from usage_tracker import lambda_handler
    import json
    
    event = {
        'body': json.dumps({
            'action': 'track',
            'user_id': 'test-123',
            'endpoint': '/analyze'
        })
    }
    
    response = lambda_handler(event, None)
    print(f"Status: {response['statusCode']}")
    print(f"Body: {response['body']}")

test_usage_tracker()
```

Run it:
```powershell
python test_usage_mock.py
```

**Option 2: Use AWS Credentials**

Configure AWS:
```powershell
aws configure
# Enter your AWS Access Key ID
# Enter your AWS Secret Access Key
# Region: us-east-1
```

Then run:
```powershell
python test_usage_local.py
```

---

## 🚀 Start Local API Server

**Best way to test all functions together:**

```powershell
# Set environment variables
$env:ADMIN_SECRET_KEY = "test-secret"
$env:OPENAI_API_KEY = "sk-your-key"
$env:STRIPE_SECRET_KEY = "sk_test_your-key"

# Start server
python local_api_server.py
```

Server will start on `http://localhost:8000`

**Test with PowerShell:**

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

**Test with cURL:**

```bash
curl -X POST http://localhost:8000/admin/auth \
  -H "Content-Type: application/json" \
  -d '{"action":"login","email":"admin@threatalyticsai.com","password":"admin123"}'
```

---

## 📋 Test Checklist

| Function | Can Test Without AWS | Needs API Keys | Notes |
|----------|---------------------|----------------|-------|
| ✅ `admin_auth.py` | Yes | No | Works completely offline |
| ✅ `analyze.py` | Yes | OpenAI | Set `OPENAI_API_KEY` |
| ✅ `redact.py` | Yes | OpenAI | Set `OPENAI_API_KEY` |
| ✅ `report.py` | Yes | OpenAI | Set `OPENAI_API_KEY` |
| ✅ `drill.py` | Yes | OpenAI | Set `OPENAI_API_KEY` |
| ⚠️ `usage_tracker.py` | No | No | Needs DynamoDB (use moto) |
| ⚠️ `subscription_manager.py` | No | Stripe | Needs DynamoDB + Stripe key |
| ⚠️ `conversations.py` | No | No | Needs DynamoDB (use moto) |

---

## 🎯 Quick Commands

**Run all basic tests:**
```powershell
.\quick_test.ps1
```

**Test just admin auth:**
```powershell
python test_admin_auth_local.py
```

**Start local API:**
```powershell
python local_api_server.py
```

---

## 🐛 Troubleshooting

**Error: "No module named 'boto3'"**
```powershell
pip install boto3
```

**Error: "No region specified"**
```powershell
# Set AWS region
$env:AWS_DEFAULT_REGION = "us-east-1"

# Or use moto for mocking
pip install moto[dynamodb]
```

**Error: "OpenAI API key not set"**
```powershell
$env:OPENAI_API_KEY = "sk-your-key-here"
```

**Error: "Invalid credentials" for admin login**
- Password is `admin123` (case sensitive)
- Email is `admin@threatalyticsai.com`

---

## ✅ What's Working Now

I just tested `admin_auth.py` successfully:

```
✅ Test 1: Valid Admin Login - Status 200
✅ Test 2: Verify Token - Status 200  
✅ Test 3: Logout - Status 200
✅ Test 4: Invalid Credentials - Status 401 (correct)
✅ Test 5: Support User Login - Status 200
```

**Next:** Start the local API server and test with real HTTP requests!

```powershell
python local_api_server.py
```

Then visit: `http://localhost:8000` in your browser
