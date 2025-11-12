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

def get_all_subscriptions(event):
    """
    Get all subscriptions across all users.
    Supports ?limit=N (default 50).
    """
    limit = 50
    qs = get_qs(event)
    try:
        if qs.get('limit'):
            limit = max(1, min(int(qs['limit']), 200))
    except Exception:
        pass

    try:
        resp = subscriptions_table.scan(Limit=limit)
        subscriptions = resp.get('Items', [])
        
        # Format subscriptions for frontend
        formatted_subs = []
        for sub in subscriptions:
            formatted_subs.append({
                'subscription_id': sub.get('subscription_id', sub.get('id', 'unknown')),
                'user_id': sub.get('user_id', 'unknown'),
                'plan': sub.get('plan', 'free'),
                'status': sub.get('status', 'inactive'),
                'amount': float(sub.get('amount', 0)),
                'created_at': sub.get('created_at', datetime.utcnow().isoformat())
            })
        
        return {'subscriptions': formatted_subs, 'count': len(formatted_subs)}
    except Exception as e:
        print(f"/admin/subscriptions scan failed: {e}")
        return {'subscriptions': [], 'count': 0, 'error': str(e)}

def get_api_usage_analytics(event):
    """
    Get aggregated API usage by endpoint.
    Supports ?days=N (default 7).
    """
    days = 7
    qs = get_qs(event)
    try:
        if qs.get('days'):
            days = max(1, min(int(qs['days']), 90))
    except Exception:
        pass

    try:
        now = datetime.utcnow()
        since = (now - timedelta(days=days)).isoformat()
        
        usage_items = usage_table.scan(
            FilterExpression=Attr('timestamp').gte(since)
        )['Items']
        
        # Aggregate by endpoint
        endpoint_stats = {}
        for item in usage_items:
            endpoint = item.get('endpoint', 'unknown')
            timestamp = item.get('timestamp', '')
            
            if endpoint not in endpoint_stats:
                endpoint_stats[endpoint] = {
                    'endpoint': endpoint,
                    'total_calls': 0,
                    'success_count': 0,
                    'error_count': 0,
                    'response_times': [],
                    'last_called': timestamp
                }
            
            endpoint_stats[endpoint]['total_calls'] += 1
            endpoint_stats[endpoint]['last_called'] = max(
                endpoint_stats[endpoint]['last_called'], 
                timestamp
            )
            
            # Track success/errors if available
            if item.get('status') == 'success':
                endpoint_stats[endpoint]['success_count'] += 1
            elif item.get('status') == 'error':
                endpoint_stats[endpoint]['error_count'] += 1
            
            # Track response time if available
            if 'response_time' in item:
                endpoint_stats[endpoint]['response_times'].append(float(item['response_time']))
        
        # Calculate final stats
        usage_data = []
        for endpoint, stats in endpoint_stats.items():
            total = stats['total_calls']
            success = stats['success_count']
            errors = stats['error_count']
            
            # Calculate averages
            avg_response = 0
            if stats['response_times']:
                avg_response = sum(stats['response_times']) / len(stats['response_times'])
            
            success_rate = (success / total * 100) if total > 0 else 100
            
            usage_data.append({
                'endpoint': endpoint,
                'total_calls': total,
                'success_rate': round(success_rate, 1),
                'avg_response_time': round(avg_response, 0),
                'error_count': errors,
                'last_called': stats['last_called']
            })
        
        # Sort by total calls descending
        usage_data.sort(key=lambda x: x['total_calls'], reverse=True)
        
        return {'usage': usage_data, 'count': len(usage_data), 'days': days}
    except Exception as e:
        print(f"/admin/api-usage failed: {e}")
        return {'usage': [], 'count': 0, 'error': str(e)}

def get_revenue_data(event):
    """
    Get revenue data with date/amount/subscriptions breakdown.
    Supports ?days=N (default 30).
    """
    days = 30
    qs = get_qs(event)
    try:
        if qs.get('days'):
            days = max(1, min(int(qs['days']), 365))
    except Exception:
        pass

    if not stripe.api_key:
        # Return dummy data if Stripe not configured
        dummy_data = []
        for i in range(min(days, 30)):
            date = (datetime.utcnow() - timedelta(days=i)).strftime('%Y-%m-%d')
            dummy_data.append({
                'date': date,
                'revenue': round(100 + (i * 10), 2),
                'subscriptions': 5 + (i % 3)
            })
        return {'revenue': dummy_data, 'count': len(dummy_data)}

    try:
        now = datetime.utcnow()
        since = now - timedelta(days=days)
        
        # Get transactions from Stripe
        transactions = stripe.BalanceTransaction.list(
            created={'gte': int(since.timestamp())},
            type='charge',
            limit=100
        )
        
        # Aggregate by date
        daily_revenue = {}
        for txn in transactions.auto_paging_iter():
            date = datetime.fromtimestamp(txn.created).strftime('%Y-%m-%d')
            if date not in daily_revenue:
                daily_revenue[date] = {
                    'date': date,
                    'revenue': 0,
                    'subscriptions': 0
                }
            daily_revenue[date]['revenue'] += txn.amount / 100
            daily_revenue[date]['subscriptions'] += 1
        
        # Convert to array and sort by date
        revenue_array = list(daily_revenue.values())
        revenue_array.sort(key=lambda x: x['date'], reverse=True)
        
        return {'revenue': revenue_array, 'count': len(revenue_array)}
    except Exception as e:
        print(f"/admin/revenue failed: {e}")
        return {'revenue': [], 'count': 0, 'error': str(e)}

def delete_user(event):
    """
    Delete a user by user_id.
    Path: /admin/users/{user_id}
    """
    path = event.get('path', '')
    user_id = path.split('/').pop()
    
    if not user_id or user_id == 'users':
        return create_response(400, {'error': 'User ID required'}, event)
    
    try:
        # Check if user exists
        user_response = users_table.get_item(Key={'user_id': user_id})
        if 'Item' not in user_response:
            return create_response(404, {'error': 'User not found'}, event)
        
        user = user_response['Item']
        
        # Delete from Stripe if customer exists
        if stripe.api_key and 'stripe_customer_id' in user:
            try:
                stripe.Customer.delete(user['stripe_customer_id'])
            except Exception as e:
                print(f"Stripe customer deletion failed: {e}")
        
        # Delete user from DynamoDB
        users_table.delete_item(Key={'user_id': user_id})
        
        # Optionally delete related subscriptions
        try:
            sub_response = subscriptions_table.query(
                KeyConditionExpression='user_id = :uid',
                ExpressionAttributeValues={':uid': user_id}
            )
            for sub in sub_response.get('Items', []):
                subscriptions_table.delete_item(
                    Key={'user_id': user_id, 'subscription_id': sub.get('subscription_id')}
                )
        except Exception as e:
            print(f"Subscription cleanup failed: {e}")
        
        return create_response(200, {
            'message': 'User deleted successfully',
            'user_id': user_id
        }, event)
    except Exception as e:
        print(f"Delete user failed: {e}")
        return create_response(500, {'error': str(e)}, event)

def cancel_subscription(event):
    """
    Cancel a subscription by subscription_id.
    Path: /admin/subscriptions/{subscription_id}
    """
    path = event.get('path', '')
    subscription_id = path.split('/').pop()
    
    if not subscription_id or subscription_id == 'subscriptions':
        return create_response(400, {'error': 'Subscription ID required'}, event)
    
    try:
        # Get subscription from DynamoDB
        sub_response = subscriptions_table.scan(
            FilterExpression=Attr('subscription_id').eq(subscription_id)
        )
        
        subscriptions = sub_response.get('Items', [])
        if not subscriptions:
            return create_response(404, {'error': 'Subscription not found'}, event)
        
        subscription = subscriptions[0]
        
        # Cancel in Stripe if available
        if stripe.api_key:
            try:
                # Try to cancel the Stripe subscription
                stripe.Subscription.delete(subscription_id)
            except Exception as e:
                print(f"Stripe cancellation failed (may not exist): {e}")
        
        # Update status in DynamoDB
        subscriptions_table.update_item(
            Key={
                'user_id': subscription.get('user_id'),
                'subscription_id': subscription_id
            },
            UpdateExpression='SET #status = :status, updated_at = :updated',
            ExpressionAttributeNames={'#status': 'status'},
            ExpressionAttributeValues={
                ':status': 'cancelled',
                ':updated': datetime.utcnow().isoformat()
            }
        )
        
        return create_response(200, {
            'message': 'Subscription cancelled successfully',
            'subscription_id': subscription_id
        }, event)
    except Exception as e:
        print(f"Cancel subscription failed: {e}")
        return create_response(500, {'error': str(e)}, event)

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
        method = event.get('httpMethod', 'GET')
        
        # Dashboard stats
        if path == '/admin/dashboard/stats' or path == '/admin/stats':
            data = get_dashboard_stats()
        
        # Users endpoints
        elif path == '/admin/users/recent':
            data = get_recent_users()
        elif path == '/admin/users/export':
            return export_users_data(event)
        elif path == '/admin/users' and method == 'GET':
            data = get_all_users(event)
        elif path.startswith('/admin/users/') and method == 'DELETE':
            return delete_user(event)
        
        # Subscriptions endpoints
        elif path == '/admin/subscriptions' and method == 'GET':
            data = get_all_subscriptions(event)
        elif path.startswith('/admin/subscriptions/') and method == 'DELETE':
            return cancel_subscription(event)
        
        # API Usage endpoint
        elif path == '/admin/api-usage' and method == 'GET':
            data = get_api_usage_analytics(event)
        
        # Revenue endpoint
        elif path == '/admin/revenue' and method == 'GET':
            data = get_revenue_data(event)
        
        # Charts endpoints (legacy)
        elif path == '/admin/charts/revenue':
            data = get_revenue_chart_data()
        elif path == '/admin/charts/usage':
            data = get_usage_chart_data()
        
        else:
            return create_response(404, {'error': f'Path not found: {path}'}, event)

        return create_response(200, data, event)

    except Exception as e:
        print(f"Unhandled error: {e}")
        return create_response(500, {'error': str(e)}, event)