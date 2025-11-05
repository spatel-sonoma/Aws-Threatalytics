import json
import boto3
import os
import stripe
from datetime import datetime, timedelta
from decimal import Decimal
from boto3.dynamodb.conditions import Key, Attr

# --- Initialization ---
dynamodb = boto3.resource('dynamodb')
secrets_client = boto3.client('secretsmanager')

# Get table names from environment variables
USERS_TABLE = os.environ.get('USERS_TABLE')
SUBSCRIPTIONS_TABLE = os.environ.get('SUBSCRIPTIONS_TABLE')
USAGE_TABLE = os.environ.get('USAGE_TABLE')
STRIPE_SECRET_NAME = os.environ.get('STRIPE_SECRET_NAME')

# Global tables
users_table = dynamodb.Table(USERS_TABLE)
subscriptions_table = dynamodb.Table(SUBSCRIPTIONS_TABLE)
usage_table = dynamodb.Table(USAGE_TABLE)

# --- Fetch Stripe Secret ---
try:
    secret_value = secrets_client.get_secret_value(SecretId=STRIPE_SECRET_NAME)
    stripe.api_key = json.loads(secret_value['SecretString'])['STRIPE_SECRET_KEY']
except Exception as e:
    print(f"CRITICAL: Could not fetch Stripe secret: {e}")
    stripe.api_key = None

# --- Helper Function ---
def decimal_default(obj):
    if isinstance(obj, Decimal):
        return str(obj)
    raise TypeError

# --- Admin Dashboard Functions ---

def get_dashboard_stats():
    """Get overview statistics for the admin dashboard"""
    total_users = users_table.scan(Select='COUNT')['Count']

    active_subs = subscriptions_table.scan(
        FilterExpression=Attr('status').eq('active'),
        Select='COUNT'
    )['Count']

    now = datetime.utcnow()
    month_start = now.replace(day=1, hour=0, minute=0, second=0, microsecond=0)

    monthly_revenue = stripe.BalanceTransaction.list(
        created={'gte': int(month_start.timestamp())},
        type='charge'
    )
    total_revenue = sum(txn.amount for txn in monthly_revenue.auto_paging_iter()) / 100

    yesterday = (now - timedelta(days=1)).isoformat()
    api_calls = usage_table.scan(
        FilterExpression=Attr('timestamp').gte(yesterday)
    )['Items']
    total_api_calls = len(api_calls)

    return {
        'total_users': total_users,
        'monthly_revenue': total_revenue,
        'active_subscriptions': active_subs,
        'api_calls_24h': total_api_calls
    }

def get_recent_users():
    """Get list of recent users with their subscription status"""
    users_response = users_table.scan()
    users = sorted(
        users_response.get('Items', []),
        key=lambda x: x.get('created_at', ''),
        reverse=True
    )[:10]

    for user in users:
        if 'stripe_customer_id' in user:
            subscription = stripe.Subscription.list(
                customer=user['stripe_customer_id'],
                limit=1
            ).data
            if subscription:
                user['subscription'] = {
                    'status': subscription[0].status,
                    'plan': subscription[0].plan.nickname or subscription[0].plan.id
                }
    return {'users': users}

def get_revenue_chart_data():
    """Get revenue data for the chart"""
    now = datetime.utcnow()
    six_months_ago = now - timedelta(days=180)
    revenue_data = stripe.BalanceTransaction.list(
        created={'gte': int(six_months_ago.timestamp())},
        type='charge'
    )

    monthly_revenue = {}
    for txn in revenue_data.auto_paging_iter():
        date = datetime.fromtimestamp(txn.created)
        month_key = date.strftime('%Y-%m')
        if month_key not in monthly_revenue:
            monthly_revenue[month_key] = 0
        monthly_revenue[month_key] += txn.amount / 100

    return {'revenue_data': monthly_revenue}

def get_usage_chart_data():
    """Get API usage data for the chart"""
    now = datetime.utcnow()
    seven_days_ago = (now - timedelta(days=7)).isoformat()
    usage_data = usage_table.scan(
        FilterExpression=Attr('timestamp').gte(seven_days_ago)
    )['Items']

    daily_usage = {}
    for usage in usage_data:
        date = usage['timestamp'].split('T')[0]
        if date not in daily_usage:
            daily_usage[date] = 0
        daily_usage[date] += 1

    return {'usage_data': daily_usage}

def export_users_data(event):
    """Export all users data as CSV"""
    users = users_table.scan()['Items']

    csv_data = "Email,Joined,Last Active,Plan,Status\n"
    for user in users:
        joined = user.get('created_at', '')
        last_active = user.get('last_active', '')
        plan = 'Free'
        status = 'Inactive'
        if 'stripe_customer_id' in user:
            subscription = stripe.Subscription.list(
                customer=user['stripe_customer_id'],
                limit=1
            ).data
            if subscription:
                plan = subscription[0].plan.nickname or subscription[0].plan.id
                status = subscription[0].status
        csv_data += f"{user.get('email', '')},{joined},{last_active},{plan},{status}\n"

    headers = get_cors_headers(event)
    headers.update({
        'Content-Type': 'text/csv',
        'Content-Disposition': 'attachment; filename=users.csv'
    })
    
    return {
        'statusCode': 200,
        'body': csv_data,
        'headers': headers
    }

# --- Helper Functions ---
def get_cors_headers(event=None):
    """Return standardized CORS headers"""
    # List of allowed origins
    allowed_origins = [
        'http://d2hmjlz5x1eh26.cloudfront.net',  # Production CloudFront URL
        'http://localhost:8000',                   # Local development
        'http://127.0.0.1:8000'                   # Local development alternative
    ]
    
    # Get the origin from the event if provided
    origin = None
    if event and event.get('headers'):
        origin = event['headers'].get('origin') or event['headers'].get('Origin')
    
    # Set the appropriate origin or default to '*' during development
    actual_origin = origin if origin in allowed_origins else allowed_origins[0]
    
    return {
        'Access-Control-Allow-Origin': actual_origin,
        'Access-Control-Allow-Methods': 'GET,POST,OPTIONS,PUT,DELETE',
        'Access-Control-Allow-Headers': 'Content-Type,Authorization,X-Api-Key',
        'Access-Control-Allow-Credentials': 'true',
        'Access-Control-Expose-Headers': 'Content-Disposition'
    }

def create_response(status_code, body, event=None):
    """Create a standardized response with CORS headers"""
    return {
        'statusCode': status_code,
        'headers': get_cors_headers(event),
        'body': json.dumps(body, default=decimal_default)
    }

# --- MAIN ROUTER ---
def lambda_handler(event, context):
    # ✅ Handle CORS preflight (OPTIONS) requests
    if event.get('httpMethod') == 'OPTIONS':
        return {
            'statusCode': 200,
            'headers': get_cors_headers(event),
            'body': json.dumps({'message': 'CORS preflight OK'})
        }

    if not stripe.api_key:
        return create_response(500, {'error': 'Stripe API key is not configured'}, event)

    try:
        # ✅ Safely get path, fallback if missing
        path = event.get('path')
        if not path:
            return create_response(400, {'error': 'Missing path in request event'}, event)

        if path == '/admin/dashboard/stats':
            data = get_dashboard_stats()
        elif path == '/admin/users/recent':
            data = get_recent_users()
        elif path == '/admin/charts/revenue':
            data = get_revenue_chart_data()
        elif path == '/admin/charts/usage':
            data = get_usage_chart_data()
        elif path == '/admin/users/export':
            return export_users_data(event)
        else:
            return create_response(404, {'error': f'Path not found: {path}'}, event)

        return create_response(200, data, event)

    except Exception as e:
        return create_response(500, {'error': str(e)}, event)
