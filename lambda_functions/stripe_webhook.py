import os
import json
import stripe
import boto3

stripe.api_key = os.environ['STRIPE_SECRET_KEY']

def lambda_handler(event, context):
    # Parse Stripe webhook
    payload = event['body']
    sig_header = event['headers'].get('stripe-signature')
    endpoint_secret = os.environ['STRIPE_WEBHOOK_SECRET']
    
    try:
        event_stripe = stripe.Webhook.construct_event(payload, sig_header, endpoint_secret)
    except ValueError as e:
        return {'statusCode': 400, 'body': 'Invalid payload'}
    except stripe.error.SignatureVerificationError as e:
        return {'statusCode': 400, 'body': 'Invalid signature'}
    
    # Handle the event
    if event_stripe['type'] == 'customer.subscription.created':
        subscription = event_stripe['data']['object']
        customer_id = subscription['customer']
        plan_id = subscription['items']['data'][0]['plan']['id']
        
        # Assign API key and plan
        dynamodb = boto3.resource('dynamodb')
        table = dynamodb.Table('ThreatalyticsPlans')
        table.put_item(Item={
            'user_id': customer_id,
            'plan_id': plan_id,
            'api_key': generate_api_key(),  # Implement this
            'status': 'active'
        })
        
    elif event_stripe['type'] == 'customer.subscription.updated':
        # Handle updates
        pass
    elif event_stripe['type'] == 'customer.subscription.deleted':
        # Revoke API key
        subscription = event_stripe['data']['object']
        customer_id = subscription['customer']
        
        dynamodb = boto3.resource('dynamodb')
        table = dynamodb.Table('ThreatalyticsPlans')
        table.update_item(
            Key={'user_id': customer_id},
            UpdateExpression='SET #status = :status',
            ExpressionAttributeNames={'#status': 'status'},
            ExpressionAttributeValues={':status': 'revoked'}
        )
    
    return {'statusCode': 200, 'body': 'Webhook handled'}

def generate_api_key():
    # Simple API key generation - in production, use a better method
    import uuid
    return str(uuid.uuid4())