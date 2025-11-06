"""
Quick Test Script for Admin Authentication Lambda
Run: python test_admin_auth_local.py
"""

import sys
sys.path.append('./lambda_functions')

from admin_auth import lambda_handler
import json

print("=" * 60)
print("🔐 Testing Admin Authentication Lambda")
print("=" * 60)

# Test 1: Valid Login
print("\n✅ Test 1: Valid Admin Login")
print("-" * 60)
login_event = {
    'body': json.dumps({
        "action": "login",
        "email": "admin@threatalyticsai.com",
        "password": "admin123"
    })
}
response = lambda_handler(login_event, None)
print(f"Status Code: {response['statusCode']}")
body = json.loads(response['body'])
print(f"Response: {json.dumps(body, indent=2)}")

if response['statusCode'] == 200:
    token = body.get('token')
    print(f"\n🔑 Token Generated: {token[:50]}...")
    
    # Test 2: Verify Token
    print("\n✅ Test 2: Verify Token")
    print("-" * 60)
    verify_event = {
        'body': json.dumps({
            "action": "verify_token",
            "token": token
        })
    }
    response = lambda_handler(verify_event, None)
    print(f"Status Code: {response['statusCode']}")
    print(f"Response: {json.loads(response['body'])}")
    
    # Test 3: Logout
    print("\n✅ Test 3: Logout")
    print("-" * 60)
    logout_event = {
        'body': json.dumps({
            "action": "logout",
            "token": token
        })
    }
    response = lambda_handler(logout_event, None)
    print(f"Status Code: {response['statusCode']}")
    print(f"Response: {json.loads(response['body'])}")

# Test 4: Invalid Login
print("\n❌ Test 4: Invalid Credentials")
print("-" * 60)
invalid_event = {
    'body': json.dumps({
        "action": "login",
        "email": "admin@threatalyticsai.com",
        "password": "wrongpassword"
    })
}
response = lambda_handler(invalid_event, None)
print(f"Status Code: {response['statusCode']}")
print(f"Response: {json.loads(response['body'])}")

# Test 5: Support User Login
print("\n✅ Test 5: Support User Login")
print("-" * 60)
support_event = {
    'body': json.dumps({
        "action": "login",
        "email": "support@threatalyticsai.com",
        "password": "password"
    })
}
response = lambda_handler(support_event, None)
print(f"Status Code: {response['statusCode']}")
body = json.loads(response['body'])
print(f"Response: {json.dumps(body, indent=2)}")

print("\n" + "=" * 60)
print("✅ All Admin Auth Tests Complete!")
print("=" * 60)
