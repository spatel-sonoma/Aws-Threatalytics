import os
import json
import boto3
from datetime import datetime
import uuid

def lambda_handler(event, context):
    """
    Conversations Lambda - manages user conversation history
    """
    dynamodb = boto3.resource('dynamodb')
    conversations_table = dynamodb.Table('ThreatalyticsConversations')
    
    # Get user ID from token (set by authorizer)
    user_id = event['requestContext']['authorizer']['claims']['sub']
    
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
