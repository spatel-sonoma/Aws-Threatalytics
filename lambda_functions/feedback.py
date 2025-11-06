import os
import json
import boto3
from datetime import datetime
import uuid
import base64

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
    Feedback Lambda - collects user feedback on answers
    Endpoint: POST /feedback
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
                'Access-Control-Allow-Methods': 'POST,OPTIONS'
            },
            'body': json.dumps({'message': 'Unauthorized'})
        }
    
    try:
        body = json.loads(event['body'])
        question = body.get('question', '')
        helpful = body.get('helpful', False)
        comments = body.get('comments', '')
        
        # Store feedback
        feedback_id = str(uuid.uuid4())
        timestamp = datetime.utcnow().isoformat()
        
        feedback_table.put_item(Item={
            'user_id': user_id,
            'feedback_id': feedback_id,
            'timestamp': timestamp,
            'question': question,
            'helpful': helpful,
            'comments': comments
        })
        
        return {
            'statusCode': 200,
            'headers': {
                'Access-Control-Allow-Origin': '*',
                'Access-Control-Allow-Headers': 'Content-Type,Authorization,X-API-Key',
                'Access-Control-Allow-Methods': 'POST,OPTIONS'
            },
            'body': json.dumps({
                'status': 'logged',
                'message': 'Feedback received. Thank you!',
                'feedback_id': feedback_id
            })
        }
        
    except Exception as e:
        print(f"Error in feedback: {str(e)}")
        return {
            'statusCode': 500,
            'headers': {
                'Access-Control-Allow-Origin': '*',
                'Access-Control-Allow-Headers': 'Content-Type,Authorization,X-API-Key',
                'Access-Control-Allow-Methods': 'POST,OPTIONS'
            },
            'body': json.dumps({'error': str(e)})
        }
