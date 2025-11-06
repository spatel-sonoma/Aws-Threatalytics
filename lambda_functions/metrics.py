import os
import json
import boto3
from datetime import datetime
import base64
from boto3.dynamodb.conditions import Key

def get_user_id_from_token(event):
    """Extract user_id from JWT token in Authorization header"""
    try:
        if 'requestContext' in event and 'authorizer' in event['requestContext']:
            if 'claims' in event['requestContext']['authorizer']:
                return event['requestContext']['authorizer']['claims']['sub']
        
        auth_header = event.get('headers', {}).get('Authorization') or event.get('headers', {}).get('authorization')
        if not auth_header:
            raise Exception('No Authorization header found')
        
        token = auth_header.replace('Bearer ', '').replace('bearer ', '')
        parts = token.split('.')
        if len(parts) != 3:
            raise Exception('Invalid token format')
        
        payload = parts[1]
        payload += '=' * (4 - len(payload) % 4)
        decoded = base64.urlsafe_b64decode(payload)
        claims = json.loads(decoded)
        
        return claims.get('sub')
    except Exception as e:
        print(f"Error extracting user_id: {str(e)}")
        return None

def lambda_handler(event, context):
    """
    Metrics Lambda - aggregates and returns feedback metrics
    Endpoint: GET /metrics
    """
    dynamodb = boto3.resource('dynamodb')
    feedback_table = dynamodb.Table('ThreatalyticsFeedback')
    
    # Get user ID from token
    user_id = get_user_id_from_token(event)
    
    if not user_id:
        return {
            'statusCode': 401,
            'headers': {
                'Access-Control-Allow-Origin': '*',
                'Access-Control-Allow-Headers': 'Content-Type,Authorization,X-API-Key',
                'Access-Control-Allow-Methods': 'GET,OPTIONS'
            },
            'body': json.dumps({'message': 'Unauthorized'})
        }
    
    try:
        # Get all feedback for user
        response = feedback_table.query(
            KeyConditionExpression=Key('user_id').eq(user_id),
            ScanIndexForward=False,  # Most recent first
            Limit=100
        )
        
        feedback_items = response.get('Items', [])
        
        # Calculate metrics
        total = len(feedback_items)
        helpful_count = sum(1 for f in feedback_items if f.get('helpful', False))
        not_helpful_count = total - helpful_count
        helpful_rate = round((helpful_count / total) * 100, 2) if total > 0 else 0
        
        # Get sample comments (last 5)
        comments = [f.get('comments', '') for f in feedback_items if f.get('comments', '').strip()]
        sample_comments = comments[:5]
        
        metrics = {
            'total_feedback': total,
            'helpful': helpful_count,
            'not_helpful': not_helpful_count,
            'helpful_rate_percent': helpful_rate,
            'sample_comments': sample_comments
        }
        
        return {
            'statusCode': 200,
            'headers': {
                'Access-Control-Allow-Origin': '*',
                'Access-Control-Allow-Headers': 'Content-Type,Authorization,X-API-Key',
                'Access-Control-Allow-Methods': 'GET,OPTIONS'
            },
            'body': json.dumps(metrics, default=str)
        }
        
    except Exception as e:
        print(f"Error in metrics: {str(e)}")
        return {
            'statusCode': 500,
            'headers': {
                'Access-Control-Allow-Origin': '*',
                'Access-Control-Allow-Headers': 'Content-Type,Authorization,X-API-Key',
                'Access-Control-Allow-Methods': 'GET,OPTIONS'
            },
            'body': json.dumps({'error': str(e)})
        }
