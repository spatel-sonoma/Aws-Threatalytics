import json
import boto3
import os
import stripe
from datetime import datetime, timedelta
from decimal import Decimal
from boto3.dynamodb.conditions import Key, Attr

# Initialize AWS services
dynamodb = boto3.resource('dynamodb')
users_table = dynamodb.Table(os.environ.get('USERS_TABLE'))
subscriptions_table = dynamodb.Table(os.environ.get('SUBSCRIPTIONS_TABLE'))
usage_table = dynamodb.Table(os.environ.get('USAGE_TABLE'))

# Initialize Stripe
stripe.api_key = os.environ.get('STRIPE_SECRET_KEY')

def decimal_default(obj):
    if isinstance(obj, Decimal):
        return str(obj)
    raise TypeError

def get_dashboard_stats(event, context):
    """Get overview statistics for the admin dashboard"""
    try:
        # Get total users count
        total_users = users_table.scan(
            Select='COUNT'
        )['Count']

        # Get active subscriptions
        active_subs = subscriptions_table.scan(
            FilterExpression=Attr('status').eq('active'),
            Select='COUNT'
        )['Count']

        # Calculate monthly revenue
        now = datetime.utcnow()
        month_start = now.replace(day=1, hour=0, minute=0, second=0, microsecond=0)
        
        # Get Stripe revenue data
        monthly_revenue = stripe.BalanceTransaction.list(
            created={
                'gte': int(month_start.timestamp())
            },
            type='charge'
        )

        total_revenue = sum(txn.amount for txn in monthly_revenue.auto_paging_iter()) / 100  # Convert cents to dollars

        # Get 24h API usage
        yesterday = now - timedelta(days=1)
        api_calls = usage_table.query(
            KeyConditionExpression=Key('timestamp').gte(yesterday.isoformat())
        )['Items']

        total_api_calls = sum(1 for _ in api_calls)

        return {
            'statusCode': 200,
            'body': json.dumps({
                'total_users': total_users,
                'monthly_revenue': total_revenue,
                'active_subscriptions': active_subs,
                'api_calls_24h': total_api_calls
            }, default=decimal_default),
            'headers': {
                'Access-Control-Allow-Origin': '*',
                'Access-Control-Allow-Credentials': True
            }
        }
    except Exception as e:
        return {
            'statusCode': 500,
            'body': json.dumps({'error': str(e)}),
            'headers': {
                'Access-Control-Allow-Origin': '*',
                'Access-Control-Allow-Credentials': True
            }
        }

def get_recent_users(event, context):
    """Get list of recent users with their subscription status"""
    try:
        users = users_table.scan(
            Limit=10,
            ScanIndexForward=False
        )['Items']

        # Enrich user data with subscription info
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

        return {
            'statusCode': 200,
            'body': json.dumps({'users': users}, default=decimal_default),
            'headers': {
                'Access-Control-Allow-Origin': '*',
                'Access-Control-Allow-Credentials': True
            }
        }
    except Exception as e:
        return {
            'statusCode': 500,
            'body': json.dumps({'error': str(e)}),
            'headers': {
                'Access-Control-Allow-Origin': '*',
                'Access-Control-Allow-Credentials': True
            }
        }

def get_revenue_chart_data(event, context):
    """Get revenue data for the chart"""
    try:
        now = datetime.utcnow()
        six_months_ago = now - timedelta(days=180)

        # Get monthly revenue data from Stripe
        revenue_data = stripe.BalanceTransaction.list(
            created={
                'gte': int(six_months_ago.timestamp())
            },
            type='charge'
        )

        # Aggregate by month
        monthly_revenue = {}
        for txn in revenue_data.auto_paging_iter():
            date = datetime.fromtimestamp(txn.created)
            month_key = date.strftime('%Y-%m')
            if month_key not in monthly_revenue:
                monthly_revenue[month_key] = 0
            monthly_revenue[month_key] += txn.amount / 100  # Convert cents to dollars

        return {
            'statusCode': 200,
            'body': json.dumps({
                'revenue_data': monthly_revenue
            }),
            'headers': {
                'Access-Control-Allow-Origin': '*',
                'Access-Control-Allow-Credentials': True
            }
        }
    except Exception as e:
        return {
            'statusCode': 500,
            'body': json.dumps({'error': str(e)}),
            'headers': {
                'Access-Control-Allow-Origin': '*',
                'Access-Control-Allow-Credentials': True
            }
        }

def get_usage_chart_data(event, context):
    """Get API usage data for the chart"""
    try:
        now = datetime.utcnow()
        seven_days_ago = now - timedelta(days=7)

        usage_data = usage_table.query(
            KeyConditionExpression=Key('timestamp').gte(seven_days_ago.isoformat())
        )['Items']

        # Aggregate by day
        daily_usage = {}
        for usage in usage_data:
            date = usage['timestamp'].split('T')[0]
            if date not in daily_usage:
                daily_usage[date] = 0
            daily_usage[date] += 1

        return {
            'statusCode': 200,
            'body': json.dumps({
                'usage_data': daily_usage
            }, default=decimal_default),
            'headers': {
                'Access-Control-Allow-Origin': '*',
                'Access-Control-Allow-Credentials': True
            }
        }
    except Exception as e:
        return {
            'statusCode': 500,
            'body': json.dumps({'error': str(e)}),
            'headers': {
                'Access-Control-Allow-Origin': '*',
                'Access-Control-Allow-Credentials': True
            }
        }

def export_users_data(event, context):
    """Export all users data as CSV"""
    try:
        users = users_table.scan()['Items']
        
        # Convert to CSV format
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

        return {
            'statusCode': 200,
            'body': csv_data,
            'headers': {
                'Content-Type': 'text/csv',
                'Content-Disposition': 'attachment; filename=users.csv',
                'Access-Control-Allow-Origin': '*',
                'Access-Control-Allow-Credentials': True
            }
        }
    except Exception as e:
        return {
            'statusCode': 500,
            'body': json.dumps({'error': str(e)}),
            'headers': {
                'Access-Control-Allow-Origin': '*',
                'Access-Control-Allow-Credentials': True
            }
        }