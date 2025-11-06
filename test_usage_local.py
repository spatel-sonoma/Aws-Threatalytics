"""
Quick Test Script for Usage Tracker Lambda
Run: python test_usage_local.py
"""

import sys
sys.path.append('./lambda_functions')

from usage_tracker import lambda_handler
import json

print("=" * 60)
print("📊 Testing Usage Tracker Lambda")
print("=" * 60)

# Test 1: Track Usage
print("\n✅ Test 1: Track API Usage")
print("-" * 60)
track_event = {
    'body': json.dumps({
        "action": "track",
        "user_id": "test-user-123",
        "endpoint": "/analyze"
    })
}
response = lambda_handler(track_event, None)
print(f"Status Code: {response['statusCode']}")
print(f"Response: {json.dumps(json.loads(response['body']), indent=2)}")

# Track a few more
for i in range(3):
    lambda_handler(track_event, None)
    print(f"  Tracked usage #{i+2}")

# Test 2: Get Usage
print("\n✅ Test 2: Get User Usage")
print("-" * 60)
get_event = {
    'body': json.dumps({
        "action": "get",
        "user_id": "test-user-123"
    })
}
response = lambda_handler(get_event, None)
print(f"Status Code: {response['statusCode']}")
print(f"Response: {json.dumps(json.loads(response['body']), indent=2)}")

# Test 3: Check Limit
print("\n✅ Test 3: Check Usage Limit")
print("-" * 60)
check_event = {
    'body': json.dumps({
        "action": "check",
        "user_id": "test-user-123"
    })
}
response = lambda_handler(check_event, None)
print(f"Status Code: {response['statusCode']}")
print(f"Response: {json.dumps(json.loads(response['body']), indent=2)}")

# Test 4: Get All Usage
print("\n✅ Test 4: Get All Users Usage")
print("-" * 60)
all_event = {
    'body': json.dumps({
        "action": "get_all"
    })
}
response = lambda_handler(all_event, None)
print(f"Status Code: {response['statusCode']}")
body = json.loads(response['body'])
print(f"Total Users: {len(body.get('usage', []))}")
print(f"Response: {json.dumps(body, indent=2)}")

# Test 5: Invalid Action
print("\n❌ Test 5: Invalid Action")
print("-" * 60)
invalid_event = {
    'body': json.dumps({
        "action": "invalid_action"
    })
}
response = lambda_handler(invalid_event, None)
print(f"Status Code: {response['statusCode']}")
print(f"Response: {json.dumps(json.loads(response['body']), indent=2)}")

print("\n" + "=" * 60)
print("✅ All Usage Tracker Tests Complete!")
print("=" * 60)
