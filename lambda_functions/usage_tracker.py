import json
import boto3
import os
from datetime import datetime, timedelta
from decimal import Decimal
from boto3.dynamodb.conditions import Key, Attr

dynamodb = boto3.resource('dynamodb')
usage_table = dynamodb.Table(os.environ.get('USAGE_TABLE', 'ThreatalyticsUsage'))
users_table = dynamodb.Table(os.environ.get('USERS_TABLE', 'ThreatalyticsUsers'))
subscriptions_table = dynamodb.Table(os.environ.get('SUBSCRIPTIONS_TABLE', 'ThreatalyticsPlans'))

# Plan limits
PLAN_LIMITS = {
    'free': {
        'api_calls_per_month': 100,
        'endpoints': ['analyze', 'redact', 'generate-report', 'simulate-drill']
    },
    'starter': {
        'api_calls_per_month': 500,
        'endpoints': ['analyze', 'redact', 'generate-report', 'simulate-drill']
    },
    'professional': {
        'api_calls_per_month': 5000,
        'endpoints': ['analyze', 'redact', 'generate-report', 'simulate-drill']
    },
    'enterprise': {
        'api_calls_per_month': -1,  # Unlimited
        'endpoints': ['analyze', 'redact', 'generate-report', 'simulate-drill']
    }
}

class DecimalEncoder(json.JSONEncoder):
    def default(self, obj):
        if isinstance(obj, Decimal):
            return int(obj) if obj % 1 == 0 else float(obj)
        return super(DecimalEncoder, self).default(obj)

def get_cors_headers():
    return {
        'Access-Control-Allow-Origin': '*',
        'Access-Control-Allow-Methods': 'GET,POST,OPTIONS',
        'Access-Control-Allow-Headers': 'Content-Type,Authorization',
        'Access-Control-Allow-Credentials': 'true'
    }

def get_user_from_token(event):
    """Extract user_id from JWT token"""
    try:
        # Get token from Authorization header
        auth_header = event.get('headers', {}).get('Authorization', '')
        if not auth_header.startswith('Bearer '):
            return None
        
        token = auth_header[7:]
        
        # Decode JWT (simplified - use proper JWT library)
        import base64
        payload = token.split('.')[1]
        # Add padding if needed
        payload += '=' * (4 - len(payload) % 4)
        decoded = json.loads(base64.b64decode(payload))
        
        return decoded.get('sub')  # Cognito user ID
    except Exception as e:
        print(f"Error extracting user from token: {e}")
        return None

def track_usage(user_id, endpoint):
    """Track API usage for a user"""
    try:
        timestamp = datetime.utcnow().isoformat()
        usage_table.put_item(Item={
            'user_id': user_id,
            'timestamp': timestamp,
            'endpoint': endpoint,
            'usage': 1
        })
        return True
    except Exception as e:
        print(f"Error tracking usage: {e}")
        return False

def get_user_usage(user_id):
    """Get current month usage for a user"""
    try:
        # Get user's plan
        user_response = users_table.get_item(Key={'user_id': user_id})
        user = user_response.get('Item', {})
        plan = user.get('plan', 'free')
        
        # Get current month's usage
        now = datetime.utcnow()
        month_start = now.replace(day=1, hour=0, minute=0, second=0, microsecond=0).isoformat()
        
        response = usage_table.query(
            KeyConditionExpression=Key('user_id').eq(user_id) & Key('timestamp').gte(month_start)
        )
        
        usage_items = response.get('Items', [])
        current_usage = len(usage_items)
        
        # Get plan limits
        plan_limits = PLAN_LIMITS.get(plan, PLAN_LIMITS['free'])
        limit = plan_limits['api_calls_per_month']
        
        # Check if user has active subscription
        sub_response = subscriptions_table.query(
            KeyConditionExpression=Key('user_id').eq(user_id),
            FilterExpression=Attr('status').eq('active')
        )
        
        active_subscription = sub_response.get('Items', [])
        
        return {
            'user_id': user_id,
            'plan': plan,
            'current': current_usage,
            'limit': limit if limit != -1 else 'unlimited',
            'remaining': limit - current_usage if limit != -1 else 'unlimited',
            'percentage': (current_usage / limit * 100) if limit != -1 else 0,
            'has_active_subscription': len(active_subscription) > 0,
            'subscription': active_subscription[0] if active_subscription else None
        }
    except Exception as e:
        print(f"Error getting user usage: {e}")
        return {
            'user_id': user_id,
            'plan': 'free',
            'current': 0,
            'limit': 100,
            'remaining': 100,
            'percentage': 0,
            'error': str(e)
        }

def check_usage_limit(user_id):
    """Check if user has exceeded their usage limit"""
    try:
        usage_data = get_user_usage(user_id)
        
        if usage_data.get('limit') == 'unlimited':
            return {
                'allowed': True,
                'usage': usage_data
            }
        
        if usage_data['remaining'] <= 0:
            return {
                'allowed': False,
                'usage': usage_data,
                'message': 'API usage limit exceeded. Please upgrade your plan.'
            }
        
        return {
            'allowed': True,
            'usage': usage_data
        }
    except Exception as e:
        print(f"Error checking usage limit: {e}")
        return {
            'allowed': True,  # Fail open
            'error': str(e)
        }

def lambda_handler(event, context):
    """
    Usage Tracking Lambda
    Endpoints:
    - GET /usage - Get current user's usage
    - POST /usage/track - Track API usage
    - GET /usage/check - Check if user can make API call
    """
    
    headers = get_cors_headers()
    
    # Handle OPTIONS
    if event.get('httpMethod') == 'OPTIONS':
        return {
            'statusCode': 200,
            'headers': headers,
            'body': json.dumps({'message': 'CORS OK'})
        }
    
    try:
        path = event.get('path', '')
        method = event.get('httpMethod', '')
        
        # Get user from token
        user_id = get_user_from_token(event)
        if not user_id:
            return {
                'statusCode': 401,
                'headers': headers,
                'body': json.dumps({'error': 'Unauthorized'})
            }
        
        if method == 'GET' and path.endswith('/usage'):
            # Get user's current usage
            usage_data = get_user_usage(user_id)
            return {
                'statusCode': 200,
                'headers': headers,
                'body': json.dumps(usage_data, cls=DecimalEncoder)
            }
        
        elif method == 'GET' and path.endswith('/usage/check'):
            # Check if user can make API call
            check_result = check_usage_limit(user_id)
            return {
                'statusCode': 200,
                'headers': headers,
                'body': json.dumps(check_result, cls=DecimalEncoder)
            }
        
        elif method == 'POST' and path.endswith('/usage/track'):
            # Track API usage
            body = json.loads(event.get('body', '{}'))
            endpoint = body.get('endpoint', 'unknown')
            
            track_usage(user_id, endpoint)
            usage_data = get_user_usage(user_id)
            
            return {
                'statusCode': 200,
                'headers': headers,
                'body': json.dumps({
                    'message': 'Usage tracked successfully',
                    'usage': usage_data
                }, cls=DecimalEncoder)
            }
        
        else:
            return {
                'statusCode': 404,
                'headers': headers,
                'body': json.dumps({'error': 'Endpoint not found'})
            }
    
    except Exception as e:
        return {
            'statusCode': 500,
            'headers': headers,
            'body': json.dumps({'error': str(e)})
        }
