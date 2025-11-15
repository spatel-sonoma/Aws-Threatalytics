import json
import boto3
import os
import stripe
from datetime import datetime
from decimal import Decimal

dynamodb = boto3.resource('dynamodb')
users_table = dynamodb.Table(os.environ.get('USERS_TABLE', 'ThreatalyticsUsers'))
subscriptions_table = dynamodb.Table(os.environ.get('SUBSCRIPTIONS_TABLE', 'ThreatalyticsPlans'))

# --- Load Stripe key from Secrets Manager (preferred) ---
STRIPE_SECRET_NAME = os.environ.get('STRIPE_SECRET_NAME')  # e.g. 'threatalytics/stripe-key'
stripe_api_key = None
if STRIPE_SECRET_NAME:
    try:
        sm = boto3.client('secretsmanager')
        secret_resp = sm.get_secret_value(SecretId=STRIPE_SECRET_NAME)
        secret_str = secret_resp.get('SecretString', '') or ''
        # support both JSON secret ({"STRIPE_SECRET_KEY": "sk_..."} or {"api_key": "sk_..."})
        try:
            parsed = json.loads(secret_str)
            stripe_api_key = parsed.get('STRIPE_SECRET_KEY') or parsed.get('stripe_secret_key') or parsed.get('api_key') or parsed.get('secret')
        except Exception:
            # secret is raw string (the key itself)
            stripe_api_key = secret_str.strip() or None
    except Exception as e:
        print(f"Could not read secret {STRIPE_SECRET_NAME} from Secrets Manager: {e}")

# fallback: direct env var (older config)
if not stripe_api_key:
    stripe_api_key = os.environ.get('STRIPE_SECRET_KEY')

# set stripe api key (or leave None)
stripe.api_key = stripe_api_key

# Stripe Price IDs (update these with your actual Stripe price IDs)
STRIPE_PRICES = {
    'starter': os.environ.get('STRIPE_PRICE_ID_STARTER', 'price_starter_monthly'),
    'professional': os.environ.get('STRIPE_PRICE_ID_PROFESSIONAL', 'price_professional_monthly'),
    'enterprise': os.environ.get('STRIPE_PRICE_ID_ENTERPRISE', 'price_enterprise_monthly')
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
        auth_header = event.get('headers', {}).get('Authorization', '')
        if not auth_header.startswith('Bearer '):
            return None
        
        token = auth_header[7:]
        import base64
        payload = token.split('.')[1]
        payload += '=' * (4 - len(payload) % 4)
        decoded = json.loads(base64.b64decode(payload))
        
        return decoded.get('sub')
    except Exception as e:
        print(f"Error extracting user from token: {e}")
        return None

def lambda_handler(event, context):
    headers = get_cors_headers()

    # quick fail if stripe key missing (so we don't call stripe and get unclear error)
    if not stripe.api_key:
        print("Stripe API key is not configured. Check STRIPE_SECRET_NAME or STRIPE_SECRET_KEY environment.")
        return {
            'statusCode': 500,
            'headers': headers,
            'body': json.dumps({'error': 'Stripe API key not configured on server'})
        }

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

        # Get user data
        user_response = users_table.get_item(Key={'user_id': user_id})
        user = user_response.get('Item', {})
        email = user.get('email')

        # If email missing, try to read from token (some tokens include email)
        if not email:
            try:
                auth_header = event.get('headers', {}).get('Authorization', '')
                token = auth_header.replace('Bearer ', '')
                payload = token.split('.')[1]
                payload += '=' * (4 - len(payload) % 4)
                decoded = json.loads(_import_('base64').b64decode(payload))
                email = decoded.get('email') or decoded.get('username')
            except Exception:
                pass

        if not email:
            return {
                'statusCode': 400,
                'headers': headers,
                'body': json.dumps({'error': 'User email not found'})
            }

        if method == 'POST' and path.endswith('/subscription/create'):
            body = json.loads(event.get('body', '{}'))
            plan = body.get('plan', 'starter')

            if plan not in STRIPE_PRICES:
                return {
                    'statusCode': 400,
                    'headers': headers,
                    'body': json.dumps({'error': 'Invalid plan'})
                }

            # Get or create Stripe customer
            stripe_customer_id = user.get('stripe_customer_id')

            if not stripe_customer_id:
                customer = stripe.Customer.create(
                    email=email,
                    metadata={'user_id': user_id}
                )
                stripe_customer_id = customer.id

                # Update user with Stripe customer ID
                users_table.update_item(
                    Key={'user_id': user_id},
                    UpdateExpression='SET stripe_customer_id = :cid',
                    ExpressionAttributeValues={':cid': stripe_customer_id}
                )

            # Create checkout session
            checkout_session = stripe.checkout.Session.create(
                customer=stripe_customer_id,
                payment_method_types=['card'],
                line_items=[{
                    'price': STRIPE_PRICES[plan],
                    'quantity': 1,
                }],
                mode='subscription',
                success_url='https://d1xoad2p9303mu.cloudfront.net/?session_id={CHECKOUT_SESSION_ID}',
                cancel_url='https://d1xoad2p9303mu.cloudfront.net/',
                metadata={
                    'user_id': user_id,
                    'plan': plan
                }
            )

            return {
                'statusCode': 200,
                'headers': headers,
                'body': json.dumps({
                    'url': checkout_session.url,
                    'sessionId': checkout_session.id
                })
            }

        elif method == 'GET' and path.endswith('/subscription/status'):
            stripe_customer_id = user.get('stripe_customer_id')

            if not stripe_customer_id:
                return {
                    'statusCode': 200,
                    'headers': headers,
                    'body': json.dumps({
                        'active': False,
                        'plan': user.get('plan', 'free'),
                        'message': 'No active subscription'
                    })
                }

            subscriptions = stripe.Subscription.list(
                customer=stripe_customer_id,
                status='active',
                limit=1
            )

            if subscriptions.data:
                sub = subscriptions.data[0]
                return {
                    'statusCode': 200,
                    'headers': headers,
                    'body': json.dumps({
                        'active': True,
                        'plan': sub['items']['data'][0]['price'].get('metadata', {}).get('plan', user.get('plan', 'free')),
                        'status': sub.status,
                        'current_period_end': sub.current_period_end,
                        'cancel_at_period_end': sub.cancel_at_period_end
                    })
                }
            else:
                return {
                    'statusCode': 200,
                    'headers': headers,
                    'body': json.dumps({
                        'active': False,
                        'plan': user.get('plan', 'free'),
                        'message': 'No active subscription'
                    })
                }

        elif method == 'POST' and path.endswith('/subscription/cancel'):
            stripe_customer_id = user.get('stripe_customer_id')

            if not stripe_customer_id:
                return {
                    'statusCode': 400,
                    'headers': headers,
                    'body': json.dumps({'error': 'No subscription found'})
                }

            subscriptions = stripe.Subscription.list(
                customer=stripe_customer_id,
                status='active',
                limit=1
            )

            if subscriptions.data:
                sub = subscriptions.data[0]
                stripe.Subscription.modify(
                    sub.id,
                    cancel_at_period_end=True
                )

                return {
                    'statusCode': 200,
                    'headers': headers,
                    'body': json.dumps({
                        'message': 'Subscription will be cancelled at the end of billing period',
                        'cancel_at': sub.current_period_end
                    })
                }
            else:
                return {
                    'statusCode': 400,
                    'headers': headers,
                    'body': json.dumps({'error': 'No active subscription found'})
                }

        elif method == 'GET' and path.endswith('/subscription/portal'):
            stripe_customer_id = user.get('stripe_customer_id')

            if not stripe_customer_id:
                return {
                    'statusCode': 400,
                    'headers': headers,
                    'body': json.dumps({'error': 'No Stripe customer found'})
                }

            portal_session = stripe.billing_portal.Session.create(
                customer=stripe_customer_id,
                return_url='https://d1xoad2p9303mu.cloudfront.net/'
            )

            return {
                'statusCode': 200,
                'headers': headers,
                'body': json.dumps({
                    'portalUrl': portal_session.url
                })
            }

        else:
            return {
                'statusCode': 404,
                'headers': headers,
                'body': json.dumps({'error': 'Endpoint not found'})
            }

    except Exception as e:
        print(f"Error in subscription management: {e}")
        return {
            'statusCode': 500,
            'headers': headers,
            'body': json.dumps({'error': str(e)})
        }