import json
import boto3
import os
import stripe
from datetime import datetime, timedelta
from decimal import Decimal
from boto3.dynamodb.conditions import Attr

# --- Initialization ---
dynamodb = boto3.resource('dynamodb')
secrets_client = boto3.client('secretsmanager')

USERS_TABLE = os.environ.get('USERS_TABLE')
SUBSCRIPTIONS_TABLE = os.environ.get('SUBSCRIPTIONS_TABLE')
USAGE_TABLE = os.environ.get('USAGE_TABLE')
STRIPE_SECRET_NAME = os.environ.get('STRIPE_SECRET_NAME')

users_table = dynamodb.Table(USERS_TABLE)
subscriptions_table = dynamodb.Table(SUBSCRIPTIONS_TABLE)
usage_table = dynamodb.Table(USAGE_TABLE)

# --- Stripe Initialization (non-fatal) ---
try:
    secret_value = secrets_client.get_secret_value(SecretId=STRIPE_SECRET_NAME)
    stripe.api_key = json.loads(secret_value['SecretString'])['STRIPE_SECRET_KEY']
except Exception as e:
    print(f"CRITICAL: Could not fetch Stripe secret: {e}")
    stripe.api_key = None  # allow non-Stripe endpoints to work

# --- Helpers ---
def decimal_default(obj):
    if isinstance(obj, Decimal):
        return str(obj)
    raise TypeError

def get_qs(event):
    return event.get("queryStringParameters") or {}

# --- Admin Functions ---
def get_dashboard_stats():
    total_users = users_table.scan(Select='COUNT')['Count']

    active_subs = subscriptions_table.scan(
        FilterExpression=Attr('status').eq('active'),
        Select='COUNT'
    )['Count']

    # Revenue (safe if stripe not configured)
    total_revenue = 0.0
    if stripe.api_key:
        now = datetime.utcnow()
        month_start = now.replace(day=1, hour=0, minute=0, second=0, microsecond=0)
        monthly_revenue = stripe.BalanceTransaction.list(
            created={'gte': int(month_start.timestamp())},
            type='charge'
        )
        total_revenue = sum(txn.amount for txn in monthly_revenue.auto_paging_iter()) / 100

    # Usage (last 24h)
    now = datetime.utcnow()
    yesterday = (now - timedelta(days=1)).isoformat()
    api_calls = usage_table.scan(FilterExpression=Attr('timestamp').gte(yesterday))['Items']
    total_api_calls = len(api_calls)

    return {
        'total_users': total_users,
        'monthly_revenue': total_revenue,
        'active_subscriptions': active_subs,
        'api_calls_24h': total_api_calls
    }

def get_recent_users():
    users_response = users_table.scan()
    users = sorted(users_response.get('Items', []),
                   key=lambda x: x.get('created_at', ''), reverse=True)[:10]

    # Enrich from Stripe only if available
    if stripe.api_key:
        for user in users:
            if 'stripe_customer_id' in user:
                sub = stripe.Subscription.list(customer=user['stripe_customer_id'], limit=1).data
                if sub:
                    user['subscription'] = {
                        'status': sub[0].status,
                        'plan': (getattr(sub[0].plan, "nickname", None) or sub[0].plan.id)
                    }
    return {'users': users}

def get_all_users(event):
    """
    Return users with a graceful fallback to dummy data for quick testing.
    Supports ?limit=N (default 20).
    """
    limit = 20
    qs = get_qs(event)
    try:
        if qs.get('limit'):
            limit = max(1, min(int(qs['limit']), 100))
    except Exception:
        pass

    try:
        resp = users_table.scan(Limit=limit)
        users = resp.get('Items', [])
        if users:
            return {'users': users, 'source': 'dynamodb', 'count': len(users)}
    except Exception as e:
        print(f"/admin/users scan failed: {e}")

    # Dummy fallback (visible when table empty or error)
    dummy = [
        {
            "id": "u_1001",
            "email": "alice@example.com",
            "plan": "Free",
            "status": "active",
            "created_at": "2025-01-05T10:00:00Z",
            "last_active": "2025-11-05T08:30:00Z"
        },
        {
            "id": "u_1002",
            "email": "bob@example.com",
            "plan": "Pro",
            "status": "active",
            "created_at": "2025-02-10T12:11:00Z",
            "last_active": "2025-11-05T08:15:00Z"
        },
        {
            "id": "u_1003",
            "email": "carol@example.com",
            "plan": "Trial",
            "status": "trial",
            "created_at": "2025-10-20T09:05:00Z",
            "last_active": "2025-11-04T18:42:00Z"
        }
    ]
    return {'users': dummy, 'source': 'dummy', 'count': len(dummy)}

def get_revenue_chart_data():
    if not stripe.api_key:
        return {'revenue_data': {}}
    now = datetime.utcnow()
    six_months_ago = now - timedelta(days=180)
    revenue_data = stripe.BalanceTransaction.list(
        created={'gte': int(six_months_ago.timestamp())},
        type='charge'
    )
    monthly = {}
    for txn in revenue_data.auto_paging_iter():
        date = datetime.fromtimestamp(txn.created)
        key = date.strftime('%Y-%m')
        monthly.setdefault(key, 0)
        monthly[key] += txn.amount / 100
    return {'revenue_data': monthly}

def get_usage_chart_data():
    now = datetime.utcnow()
    seven_days_ago = (now - timedelta(days=7)).isoformat()
    usage_data = usage_table.scan(FilterExpression=Attr('timestamp').gte(seven_days_ago))['Items']
    daily = {}
    for u in usage_data:
        d = u['timestamp'].split('T')[0]
        daily[d] = daily.get(d, 0) + 1
    return {'usage_data': daily}

def export_users_data(event):
    users = users_table.scan()['Items']
    csv_data = "Email,Joined,Last Active,Plan,Status\n"
    for user in users:
        joined = user.get('created_at', '')
        last_active = user.get('last_active', '')
        plan = 'Free'
        status = 'Inactive'
        if stripe.api_key and 'stripe_customer_id' in user:
            sub = stripe.Subscription.list(customer=user['stripe_customer_id'], limit=1).data
            if sub:
                plan = (getattr(sub[0].plan, "nickname", None) or sub[0].plan.id)
                status = sub[0].status
        csv_data += f"{user.get('email','')},{joined},{last_active},{plan},{status}\n"

    headers = get_cors_headers(event)
    headers.update({
        'Content-Type': 'text/csv',
        'Content-Disposition': 'attachment; filename=users.csv'
    })
    return {'statusCode': 200, 'body': csv_data, 'headers': headers}

# --- CORS Helper ---
def get_cors_headers(event=None):
    allowed_origins = [
        'http://d2hmjlz5x1eh26.cloudfront.net',
        'http://localhost:8000',
        'http://127.0.0.1:8000',
        'null',  # for file:// testing
    ]
    origin = None
    if event and event.get('headers'):
        origin = event['headers'].get('origin') or event['headers'].get('Origin')
    actual_origin = origin if origin in allowed_origins else allowed_origins[0]

    # Debug (shows up in CloudWatch)
    print(f"CORS origin received: {origin} -> using: {actual_origin}")

    return {
        'Access-Control-Allow-Origin': actual_origin,
        'Access-Control-Allow-Methods': 'GET,POST,OPTIONS,PUT,DELETE',
        'Access-Control-Allow-Headers': 'Content-Type,Authorization,X-Api-Key',
        'Access-Control-Allow-Credentials': 'true',
        'Access-Control-Expose-Headers': 'Content-Disposition',
        'Vary': 'Origin'
    }

def create_response(status_code, body, event=None):
    return {
        'statusCode': status_code,
        'headers': get_cors_headers(event),
        'body': json.dumps(body, default=decimal_default)
    }

# --- Main Router ---
def lambda_handler(event, context):
    # Preflight
    if event.get('httpMethod') == 'OPTIONS':
        return {'statusCode': 200, 'headers': get_cors_headers(event), 'body': json.dumps({'message': 'CORS preflight OK'})}

    try:
        path = event.get('path', '')
        if path == '/admin/dashboard/stats':
            data = get_dashboard_stats()
        elif path == '/admin/users/recent':
            data = get_recent_users()
        elif path == '/admin/users':                       # <-- new/updated
            data = get_all_users(event)
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
        print(f"Unhandled error: {e}")
        return create_response(500, {'error': str(e)}, event)