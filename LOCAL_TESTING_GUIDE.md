# 🧪 Local Testing Guide for Lambda Functions

This guide shows you how to test all Lambda functions locally before deploying to AWS.

---

## 📋 Prerequisites

### 1. Install Python Dependencies
```powershell
# Install all required packages
pip install boto3 openai stripe requests PyPDF2

# Or use requirements.txt
pip install -r requirements.txt
```

### 2. Set Environment Variables
Create a `.env` file or set them in PowerShell:

```powershell
# PowerShell - Set environment variables
$env:OPENAI_API_KEY = "sk-your-openai-key"
$env:STRIPE_SECRET_KEY = "sk_test_your-stripe-key"
$env:STRIPE_WEBHOOK_SECRET = "whsec_your-webhook-secret"
$env:ADMIN_SECRET_KEY = "your-admin-secret-key"
$env:STRIPE_PRICE_ID_STARTER = "price_starter_id"
$env:STRIPE_PRICE_ID_PROFESSIONAL = "price_professional_id"
$env:STRIPE_PRICE_ID_ENTERPRISE = "price_enterprise_id"

# Verify they're set
echo $env:OPENAI_API_KEY
```

---

## 🎯 Method 1: Direct Python Testing

### Test Admin Authentication

Create `test_admin_auth_local.py`:

```python
import sys
sys.path.append('./lambda_functions')

from admin_auth import lambda_handler

# Test Login
print("=== Testing Admin Login ===")
login_event = {
    'body': '{"action":"login","email":"admin@threatalyticsai.com","password":"admin123"}'
}
response = lambda_handler(login_event, None)
print(f"Status: {response['statusCode']}")
print(f"Response: {response['body']}")

# Extract token for next test
import json
token = json.loads(response['body'])['token']
print(f"\nToken: {token[:50]}...")

# Test Verify Token
print("\n=== Testing Token Verification ===")
verify_event = {
    'body': f'{{"action":"verify_token","token":"{token}"}}'
}
response = lambda_handler(verify_event, None)
print(f"Status: {response['statusCode']}")
print(f"Response: {response['body']}")

# Test Logout
print("\n=== Testing Logout ===")
logout_event = {
    'body': f'{{"action":"logout","token":"{token}"}}'
}
response = lambda_handler(logout_event, None)
print(f"Status: {response['statusCode']}")
print(f"Response: {response['body']}")

# Test Invalid Login
print("\n=== Testing Invalid Credentials ===")
invalid_event = {
    'body': '{"action":"login","email":"admin@threatalyticsai.com","password":"wrongpassword"}'
}
response = lambda_handler(invalid_event, None)
print(f"Status: {response['statusCode']}")
print(f"Response: {response['body']}")
```

Run it:
```powershell
python test_admin_auth_local.py
```

---

### Test Threat Analysis

Create `test_analyze_local.py`:

```python
import sys
sys.path.append('./lambda_functions')
import os

# Set OpenAI API key
os.environ['OPENAI_API_KEY'] = 'sk-your-key-here'

from analyze import lambda_handler

print("=== Testing Threat Analysis ===")
event = {
    'body': '{"text":"Multiple failed login attempts detected from IP 192.168.1.100 within 5 minutes."}'
}

response = lambda_handler(event, None)
print(f"Status: {response['statusCode']}")

import json
body = json.loads(response['body'])
print(f"\nAnalysis:\n{body.get('analysis', body)}")
```

Run it:
```powershell
python test_analyze_local.py
```

---

### Test PII Redaction

Create `test_redact_local.py`:

```python
import sys
sys.path.append('./lambda_functions')
import os

os.environ['OPENAI_API_KEY'] = 'sk-your-key-here'

from redact import lambda_handler

print("=== Testing PII Redaction ===")
event = {
    'body': '{"text":"Contact John Smith at john.smith@email.com or call 555-123-4567. His SSN is 123-45-6789."}'
}

response = lambda_handler(event, None)
print(f"Status: {response['statusCode']}")

import json
body = json.loads(response['body'])
print(f"\nOriginal: {event['body']}")
print(f"Redacted: {body.get('redacted', body)}")
```

Run it:
```powershell
python test_redact_local.py
```

---

### Test Usage Tracker

Create `test_usage_local.py`:

```python
import sys
sys.path.append('./lambda_functions')

from usage_tracker import lambda_handler

# Test Track Usage
print("=== Testing Track Usage ===")
track_event = {
    'body': '{"action":"track","user_id":"test-user-123","endpoint":"/analyze"}'
}
response = lambda_handler(track_event, None)
print(f"Status: {response['statusCode']}")
print(f"Response: {response['body']}")

# Test Get Usage
print("\n=== Testing Get Usage ===")
get_event = {
    'body': '{"action":"get","user_id":"test-user-123"}'
}
response = lambda_handler(get_event, None)
print(f"Status: {response['statusCode']}")
print(f"Response: {response['body']}")

# Test Check Limit
print("\n=== Testing Check Limit ===")
check_event = {
    'body': '{"action":"check","user_id":"test-user-123"}'
}
response = lambda_handler(check_event, None)
print(f"Status: {response['statusCode']}")
print(f"Response: {response['body']}")
```

Run it:
```powershell
python test_usage_local.py
```

---

### Test Subscription Manager

Create `test_subscription_local.py`:

```python
import sys
sys.path.append('./lambda_functions')
import os

os.environ['STRIPE_SECRET_KEY'] = 'sk_test_your-key'
os.environ['STRIPE_PRICE_ID_STARTER'] = 'price_starter'

from subscription_manager import lambda_handler

# Test Create Checkout Session
print("=== Testing Create Checkout Session ===")
create_event = {
    'body': '{"action":"create_checkout","user_id":"test-user-123","email":"test@example.com","plan":"starter"}'
}
response = lambda_handler(create_event, None)
print(f"Status: {response['statusCode']}")
print(f"Response: {response['body']}")

# Test Get Subscription Status
print("\n=== Testing Get Subscription Status ===")
status_event = {
    'body': '{"action":"get_status","user_id":"test-user-123"}'
}
response = lambda_handler(status_event, None)
print(f"Status: {response['statusCode']}")
print(f"Response: {response['body']}")
```

Run it:
```powershell
python test_subscription_local.py
```

---

## 🚀 Method 2: Using Python HTTP Server

Test with actual HTTP requests like production:

### Step 1: Create Local API Server

Create `local_api_server.py`:

```python
from http.server import HTTPServer, BaseHTTPRequestHandler
import json
import sys
sys.path.append('./lambda_functions')

# Import all lambda handlers
from admin_auth import lambda_handler as admin_auth_handler
from analyze import lambda_handler as analyze_handler
from redact import lambda_handler as redact_handler
from report import lambda_handler as report_handler
from drill import lambda_handler as drill_handler
from usage_tracker import lambda_handler as usage_handler
from subscription_manager import lambda_handler as subscription_handler

class LocalAPIHandler(BaseHTTPRequestHandler):
    def do_POST(self):
        content_length = int(self.headers['Content-Length'])
        body = self.rfile.read(content_length).decode('utf-8')
        
        # Create Lambda event
        event = {
            'body': body,
            'headers': dict(self.headers)
        }
        
        # Route to correct handler
        handlers = {
            '/admin/auth': admin_auth_handler,
            '/analyze': analyze_handler,
            '/redact': redact_handler,
            '/report': report_handler,
            '/drill': drill_handler,
            '/usage': usage_handler,
            '/subscription': subscription_handler
        }
        
        handler = handlers.get(self.path)
        
        if handler:
            try:
                response = handler(event, None)
                self.send_response(response['statusCode'])
                
                # Send CORS headers
                self.send_header('Access-Control-Allow-Origin', '*')
                self.send_header('Content-Type', 'application/json')
                self.end_headers()
                
                self.wfile.write(response['body'].encode())
            except Exception as e:
                self.send_error(500, str(e))
        else:
            self.send_error(404, 'Endpoint not found')
    
    def do_OPTIONS(self):
        self.send_response(200)
        self.send_header('Access-Control-Allow-Origin', '*')
        self.send_header('Access-Control-Allow-Methods', 'POST, GET, OPTIONS')
        self.send_header('Access-Control-Allow-Headers', 'Content-Type, Authorization, x-api-key')
        self.end_headers()

if __name__ == '__main__':
    server = HTTPServer(('localhost', 8000), LocalAPIHandler)
    print('🚀 Local API server running on http://localhost:8000')
    print('\nAvailable endpoints:')
    print('  POST http://localhost:8000/admin/auth')
    print('  POST http://localhost:8000/analyze')
    print('  POST http://localhost:8000/redact')
    print('  POST http://localhost:8000/report')
    print('  POST http://localhost:8000/drill')
    print('  POST http://localhost:8000/usage')
    print('  POST http://localhost:8000/subscription')
    print('\nPress Ctrl+C to stop')
    server.serve_forever()
```

### Step 2: Start the Server

```powershell
python local_api_server.py
```

### Step 3: Test with cURL or PowerShell

**Test Admin Login:**
```powershell
$body = @{
    action = "login"
    email = "admin@threatalyticsai.com"
    password = "admin123"
} | ConvertTo-Json

Invoke-RestMethod -Uri "http://localhost:8000/admin/auth" -Method POST -Body $body -ContentType "application/json"
```

**Test Threat Analysis:**
```powershell
$body = @{
    text = "Multiple failed login attempts from IP 192.168.1.100"
} | ConvertTo-Json

Invoke-RestMethod -Uri "http://localhost:8000/analyze" -Method POST -Body $body -ContentType "application/json"
```

**Test PII Redaction:**
```powershell
$body = @{
    text = "John Smith's email is john@example.com and phone is 555-1234"
} | ConvertTo-Json

Invoke-RestMethod -Uri "http://localhost:8000/redact" -Method POST -Body $body -ContentType "application/json"
```

**Test Usage Tracking:**
```powershell
$body = @{
    action = "track"
    user_id = "test-user-123"
    endpoint = "/analyze"
} | ConvertTo-Json

Invoke-RestMethod -Uri "http://localhost:8000/usage" -Method POST -Body $body -ContentType "application/json"
```

**Test Subscription:**
```powershell
$body = @{
    action = "create_checkout"
    user_id = "test-user-123"
    email = "test@example.com"
    plan = "starter"
} | ConvertTo-Json

Invoke-RestMethod -Uri "http://localhost:8000/subscription" -Method POST -Body $body -ContentType "application/json"
```

---

## 🔧 Method 3: Using AWS SAM CLI (Optional)

If you want to test with AWS SAM for a more production-like environment:

### Install SAM CLI
```powershell
# Using Chocolatey
choco install aws-sam-cli

# Or download from: https://aws.amazon.com/serverless/sam/
```

### Create sam-template.yaml

```yaml
AWSTemplateFormatVersion: '2010-09-09'
Transform: AWS::Serverless-2016-10-31

Resources:
  AdminAuthFunction:
    Type: AWS::Serverless::Function
    Properties:
      Handler: admin_auth.lambda_handler
      Runtime: python3.9
      CodeUri: lambda_functions/
      Events:
        Api:
          Type: Api
          Properties:
            Path: /admin/auth
            Method: POST

  AnalyzeFunction:
    Type: AWS::Serverless::Function
    Properties:
      Handler: analyze.lambda_handler
      Runtime: python3.9
      CodeUri: lambda_functions/
      Events:
        Api:
          Type: Api
          Properties:
            Path: /analyze
            Method: POST
```

### Run SAM Local
```powershell
# Start local API
sam local start-api

# Test specific function
sam local invoke AdminAuthFunction --event test-events/login.json
```

---

## 📊 Quick Test Script

Create `quick_test.ps1`:

```powershell
# Quick Test Script for All Lambda Functions

Write-Host "🧪 Starting Lambda Function Tests" -ForegroundColor Green

# Set environment variables
$env:ADMIN_SECRET_KEY = "test-secret-key"
$env:OPENAI_API_KEY = "sk-test-key"  # Replace with real key
$env:STRIPE_SECRET_KEY = "sk_test_key"  # Replace with real key

Write-Host "`n=== Test 1: Admin Authentication ===" -ForegroundColor Yellow
python -c "
import sys
sys.path.append('./lambda_functions')
from admin_auth import lambda_handler
event = {'body': '{\"action\":\"login\",\"email\":\"admin@threatalyticsai.com\",\"password\":\"admin123\"}'}
print(lambda_handler(event, None)['body'])
"

Write-Host "`n=== Test 2: Usage Tracker ===" -ForegroundColor Yellow
python -c "
import sys
sys.path.append('./lambda_functions')
from usage_tracker import lambda_handler
event = {'body': '{\"action\":\"get\",\"user_id\":\"test-123\"}'}
print(lambda_handler(event, None)['body'])
"

Write-Host "`n✅ Tests Complete!" -ForegroundColor Green
```

Run it:
```powershell
.\quick_test.ps1
```

---

## 🐛 Debugging Tips

### 1. Enable Detailed Logging
Add this to any Lambda function:
```python
import logging
logging.basicConfig(level=logging.DEBUG)
logger = logging.getLogger()
logger.setLevel(logging.DEBUG)
```

### 2. Mock DynamoDB Locally
Install moto for DynamoDB mocking:
```powershell
pip install moto[dynamodb]
```

Use it in tests:
```python
from moto import mock_dynamodb
import boto3

@mock_dynamodb
def test_with_dynamodb():
    dynamodb = boto3.resource('dynamodb', region_name='us-east-1')
    table = dynamodb.create_table(
        TableName='ThreatalyticsUsers',
        KeySchema=[{'AttributeName': 'user_id', 'KeyType': 'HASH'}],
        AttributeDefinitions=[{'AttributeName': 'user_id', 'AttributeType': 'S'}],
        BillingMode='PAY_PER_REQUEST'
    )
    # Now test your function
```

### 3. Test Error Handling
```python
# Test with invalid input
event = {'body': 'invalid json}
response = lambda_handler(event, None)
print(f"Error handling: {response['statusCode']} - {response['body']}")
```

---

## ✅ Checklist Before Deploying

- [ ] All environment variables are set
- [ ] All functions return proper status codes (200, 400, 500)
- [ ] CORS headers are included in responses
- [ ] Error messages are user-friendly
- [ ] Sensitive data is not logged
- [ ] API keys are not hardcoded
- [ ] Response times are acceptable
- [ ] Functions handle missing/invalid input gracefully

---

## 🎯 Next Steps

1. **Test locally** using one of the methods above
2. **Fix any issues** found during testing
3. **Deploy to AWS** with `serverless deploy`
4. **Test on AWS** with actual API Gateway URLs
5. **Monitor CloudWatch** logs for any production issues

---

## 📞 Common Issues

**Issue: ModuleNotFoundError**
```powershell
# Solution: Install missing package
pip install <package-name>
```

**Issue: OpenAI API Error**
```powershell
# Solution: Check API key
echo $env:OPENAI_API_KEY
```

**Issue: Stripe Error**
```powershell
# Solution: Use test mode keys
$env:STRIPE_SECRET_KEY = "sk_test_..."
```

**Issue: DynamoDB Access Denied**
```powershell
# Solution: Use local mocking (moto) or configure AWS credentials
aws configure
```

---

**Happy Testing! 🚀**
