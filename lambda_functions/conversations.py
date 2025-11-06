import os
import json
import boto3
from datetime import datetime
import uuid
import base64

def get_user_id_from_token(event):
    """Extract user_id from JWT token in Authorization header"""
    try:
        # Check if authorizer claims exist (when using Cognito authorizer)
        if 'requestContext' in event and 'authorizer' in event['requestContext']:
            if 'claims' in event['requestContext']['authorizer']:
                return event['requestContext']['authorizer']['claims']['sub']
        
        # Otherwise, extract from Authorization header
        auth_header = event.get('headers', {}).get('Authorization') or event.get('headers', {}).get('authorization')
        if not auth_header:
            raise Exception('No Authorization header found')
        
        # Extract token (format: "Bearer <token>")
        token = auth_header.replace('Bearer ', '').replace('bearer ', '')
        
        # Decode JWT payload (without verification for now - AWS API Gateway should handle this)
        # JWT format: header.payload.signature
        parts = token.split('.')
        if len(parts) != 3:
            raise Exception('Invalid token format')
        
        # Decode payload (add padding if needed)
        payload = parts[1]
        payload += '=' * (4 - len(payload) % 4)  # Add padding
        decoded = base64.urlsafe_b64decode(payload)
        claims = json.loads(decoded)
        
        # Return user_id (sub claim)
        return claims.get('sub')
    except Exception as e:
        print(f"Error extracting user_id: {str(e)}")
        return None

def lambda_handler(event, context):
    """
    Conversations Lambda - manages user conversation history
    """
    dynamodb = boto3.resource('dynamodb')
    conversations_table = dynamodb.Table('ThreatalyticsConversations')
    
    # Get user ID from token
    user_id = get_user_id_from_token(event)
    
    if not user_id:
        return {
            'statusCode': 401,
            'headers': {
                'Access-Control-Allow-Origin': '*',
                'Access-Control-Allow-Headers': 'Content-Type,Authorization',
                'Access-Control-Allow-Methods': 'GET,POST,DELETE,OPTIONS'
            },
            'body': json.dumps({'message': 'Unauthorized'})
        }
    
    # Parse request
    http_method = event['httpMethod']
    
    try:
        if http_method == 'GET':
            # Get all conversations for user
            response = conversations_table.query(
                KeyConditionExpression='user_id = :uid',
                ExpressionAttributeValues={':uid': user_id},
                ScanIndexForward=False,  # Most recent first
                Limit=50
            )
            
            return {
                'statusCode': 200,
                'headers': {
                    'Access-Control-Allow-Origin': '*',
                    'Access-Control-Allow-Headers': 'Content-Type,Authorization',
                    'Access-Control-Allow-Methods': 'GET,POST,DELETE,OPTIONS'
                },
                'body': json.dumps({
                    'conversations': response.get('Items', [])
                })
            }
            
        elif http_method == 'POST':
            # Save/update conversation
            body = json.loads(event['body'])
            
            conversation_id = body.get('conversation_id', str(uuid.uuid4()))
            mode = body.get('mode')
            messages = body.get('messages', [])
            title = body.get('title', f"{mode.title()} - {datetime.utcnow().strftime('%Y-%m-%d %H:%M')}")
            
            conversations_table.put_item(Item={
                'user_id': user_id,
                'conversation_id': conversation_id,
                'mode': mode,
                'title': title,
                'messages': messages,
                'created_at': body.get('created_at', datetime.utcnow().isoformat()),
                'updated_at': datetime.utcnow().isoformat(),
                'message_count': len(messages)
            })
            
            return {
                'statusCode': 200,
                'headers': {
                    'Access-Control-Allow-Origin': '*',
                    'Access-Control-Allow-Headers': 'Content-Type,Authorization',
                    'Access-Control-Allow-Methods': 'GET,POST,DELETE,OPTIONS'
                },
                'body': json.dumps({
                    'message': 'Conversation saved',
                    'conversation_id': conversation_id
                })
            }
            
        elif http_method == 'DELETE':
            # Delete conversation
            conversation_id = event['pathParameters']['conversation_id']
            
            conversations_table.delete_item(
                Key={
                    'user_id': user_id,
                    'conversation_id': conversation_id
                }
            )
            
            return {
                'statusCode': 200,
                'headers': {
                    'Access-Control-Allow-Origin': '*',
                    'Access-Control-Allow-Headers': 'Content-Type,Authorization',
                    'Access-Control-Allow-Methods': 'GET,POST,DELETE,OPTIONS'
                },
                'body': json.dumps({'message': 'Conversation deleted'})
            }
            
    except Exception as e:
        return {
            'statusCode': 500,
            'headers': {
                'Access-Control-Allow-Origin': '*',
                'Access-Control-Allow-Headers': 'Content-Type,Authorization',
                'Access-Control-Allow-Methods': 'GET,POST,DELETE,OPTIONS'
            },
            'body': json.dumps({'error': str(e)})
        }
