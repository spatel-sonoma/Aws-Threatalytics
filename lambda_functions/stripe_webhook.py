import os
import json
import stripe
import boto3
import uuid
from datetime import datetime
import logging

# Configure logging
logger = logging.getLogger()
logger.setLevel(logging.INFO)

# Initialize Stripe
stripe.api_key = os.environ.get('STRIPE_SECRET_KEY', '')

# Webhook endpoint URL will be:
# https://km8gnz77e8.execute-api.us-east-1.amazonaws.com/dev/stripe/webhook
# Configure this in Stripe Dashboard > Developers > Webhooks
# Events to configure:
# - customer.subscription.created
# - customer.subscription.updated
# - customer.subscription.deleted
# - invoice.payment_succeeded
# - invoice.payment_failed

def generate_api_key():
    """Generate a unique API key"""
    return f"ta_live_{uuid.uuid4().hex}"

def handle_subscription_created(subscription):
    """Handle new subscription creation"""
    try:
        customer_id = subscription['customer']
        plan_id = subscription['items']['data'][0]['plan']['id']

        dynamodb = boto3.resource('dynamodb')
        table = dynamodb.Table('ThreatalyticsPlans')
        table.put_item(Item={
        'user_id': customer_id,
        'plan_id': plan_id,
        'api_key': generate_api_key(),
        'status': 'active',
        'created_at': datetime.utcnow().isoformat()
    })
        logger.info("Subscription created for %s, plan %s", customer_id, plan_id)
    except Exception as e:
        logger.error("Failed to create subscription: %s", str(e))
        raise

def handle_subscription_updated(subscription):
    """Handle subscription updates"""
    customer_id = subscription['customer']
    plan_id = subscription['items']['data'][0]['plan']['id']

    dynamodb = boto3.resource('dynamodb')
    table = dynamodb.Table('ThreatalyticsPlans')
    table.update_item(
        Key={'user_id': customer_id},
        UpdateExpression='SET plan_id = :plan_id, updated_at = :updated_at',
        ExpressionAttributeValues={
            ':plan_id': plan_id,
            ':updated_at': datetime.utcnow().isoformat()
        }
    )
    logger.info("Subscription updated for %s, plan %s", customer_id, plan_id)

def handle_subscription_deleted(subscription):
    """Handle subscription cancellation"""
    customer_id = subscription['customer']

    dynamodb = boto3.resource('dynamodb')
    plans_table = dynamodb.Table('ThreatalyticsPlans')
    users_table = dynamodb.Table('ThreatalyticsUsers')

    plans_table.update_item(
        Key={'user_id': customer_id},
        UpdateExpression='SET #status = :status, cancelled_at = :cancelled_at',
        ExpressionAttributeNames={'#status': 'status'},
        ExpressionAttributeValues={
            ':status': 'cancelled',
            ':cancelled_at': datetime.utcnow().isoformat()
        }
    )

    users_table.update_item(
        Key={'user_id': customer_id},
        UpdateExpression='SET plan = :plan',
        ExpressionAttributeValues={
            ':plan': 'free'
        }
    )
    logger.info("Subscription cancelled for %s", customer_id)

def handle_payment_succeeded(invoice):
    """Handle successful payment"""
    customer_id = invoice['customer']
    amount_paid = invoice.get('amount_paid', 0)

    dynamodb = boto3.resource('dynamodb')
    payments_table = dynamodb.Table('ThreatalyticsPayments')
    payments_table.put_item(Item={
        'payment_id': invoice['id'],
        'user_id': customer_id,
        'amount': amount_paid,
        'status': 'succeeded',
        'created_at': datetime.utcnow().isoformat()
    })
    logger.info("Payment succeeded for %s amount %s", customer_id, amount_paid)

def handle_payment_failed(invoice):
    """Handle failed payment"""
    customer_id = invoice['customer']

    dynamodb = boto3.resource('dynamodb')
    payments_table = dynamodb.Table('ThreatalyticsPayments')
    plans_table = dynamodb.Table('ThreatalyticsPlans')

    payments_table.put_item(Item={
        'payment_id': invoice['id'],
        'user_id': customer_id,
        'amount': invoice.get('amount_due', 0),
        'status': 'failed',
        'created_at': datetime.utcnow().isoformat()
    })

    plans_table.update_item(
        Key={'user_id': customer_id},
        UpdateExpression='SET #status = :status',
        ExpressionAttributeNames={'#status': 'status'},
        ExpressionAttributeValues={
            ':status': 'payment_failed'
        }
    )
    logger.info("Payment failed for %s", customer_id)

def lambda_handler(event, context):
    """Single entrypoint for Stripe webhook events with proper error handling"""
    try:
        payload = event.get('body', '')
        headers = event.get('headers') or {}
        sig_header = headers.get('stripe-signature')
        endpoint_secret = os.environ.get('STRIPE_WEBHOOK_SECRET')

        try:
            event_stripe = stripe.Webhook.construct_event(payload, sig_header, endpoint_secret)
        except ValueError:
            logger.warning("Invalid payload received")
            return {
                'statusCode': 400,
                'body': json.dumps({'error': 'Invalid payload'}),
                'headers': {
                    'Access-Control-Allow-Origin': '*',
                    'Access-Control-Allow-Credentials': 'true'
                }
            }
        except stripe.error.SignatureVerificationError:
            logger.warning("Invalid signature on webhook")
            return {
                'statusCode': 400,
                'body': json.dumps({'error': 'Invalid signature'}),
                'headers': {
                    'Access-Control-Allow-Origin': '*',
                    'Access-Control-Allow-Credentials': 'true'
                }
            }

        event_type = event_stripe.get('type')
        event_data = event_stripe.get('data', {}).get('object', {})

        if event_type == 'customer.subscription.created':
            handle_subscription_created(event_data)
        elif event_type == 'customer.subscription.updated':
            handle_subscription_updated(event_data)
        elif event_type == 'customer.subscription.deleted':
            handle_subscription_deleted(event_data)
        elif event_type == 'invoice.payment_succeeded':
            handle_payment_succeeded(event_data)
        elif event_type == 'invoice.payment_failed':
            handle_payment_failed(event_data)
        else:
            logger.info("Unhandled Stripe event type: %s", event_type)

        return {
            'statusCode': 200,
            'body': json.dumps({'received': True}),
            'headers': {
                'Access-Control-Allow-Origin': '*',
                'Access-Control-Allow-Credentials': 'true'
            }
        }

    except Exception as e:
        logger.exception("Error processing webhook")
        return {
            'statusCode': 500,
            'body': json.dumps({'error': str(e)}),
            'headers': {
                'Access-Control-Allow-Origin': '*',
                'Access-Control-Allow-Credentials': 'true'
            }
        }