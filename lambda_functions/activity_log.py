import os
import json
import boto3
from datetime import datetime
import uuid
import base64

def get_user_id_from_token(event):
    """Extract user_id from JWT token in Authorization header (reused from conversations.py)"""
    try:
        # Check if authorizer claims exist
        if 'requestContext' in event and 'authorizer' in event['requestContext']:
            if 'claims' in event['requestContext']['authorizer']:
                return event['requestContext']['authorizer']['claims']['sub']
        
        # Extract from Authorization header
        auth_header = event.get('headers', {}).get('Authorization') or event.get('headers', {}).get('authorization')
        if not auth_header:
            raise Exception('No Authorization header found')
        
        token = auth_header.replace('Bearer ', '').replace('bearer ', '')
        
        # Decode JWT payload
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
    Activity Log Lambda - manages user activity history and case notes
    Endpoints:
    - GET /admin/activity?client_id={id} - Get all activities for a client
    - POST /admin/note/update - Update note for an activity
    """
    dynamodb = boto3.resource('dynamodb')
    activity_table = dynamodb.Table('ThreatalyticsActivityLog')
    
    # Get user ID from token
    user_id = get_user_id_from_token(event)
    
    if not user_id:
        return {
            'statusCode': 401,
            'headers': {
                'Access-Control-Allow-Origin': '*',
                'Access-Control-Allow-Headers': 'Content-Type,Authorization,X-API-Key',
                'Access-Control-Allow-Methods': 'GET,POST,OPTIONS'
            },
            'body': json.dumps({'message': 'Unauthorized'})
        }
    
    http_method = event['httpMethod']
    
    try:
        if http_method == 'GET':
            # Get all activities for user
            client_id = event.get('queryStringParameters', {}).get('client_id', user_id)
            
            # Query by user_id
            response = activity_table.query(
                KeyConditionExpression='user_id = :uid',
                ExpressionAttributeValues={':uid': user_id},
                ScanIndexForward=False,  # Most recent first
                Limit=100
            )
            
            activities = response.get('Items', [])
            
            # Filter by client_id if specified
            if client_id != user_id:
                activities = [a for a in activities if a.get('client_id') == client_id]
            
            return {
                'statusCode': 200,
                'headers': {
                    'Access-Control-Allow-Origin': '*',
                    'Access-Control-Allow-Headers': 'Content-Type,Authorization,X-API-Key',
                    'Access-Control-Allow-Methods': 'GET,POST,OPTIONS'
                },
                'body': json.dumps(activities, default=str)
            }
            
        elif http_method == 'POST':
            # Update note for an activity
            body = json.loads(event['body'])
            activity_id = body.get('id')
            new_note = body.get('note', '')
            
            if not activity_id:
                return {
                    'statusCode': 400,
                    'headers': {
                        'Access-Control-Allow-Origin': '*',
                        'Access-Control-Allow-Headers': 'Content-Type,Authorization,X-API-Key',
                        'Access-Control-Allow-Methods': 'GET,POST,OPTIONS'
                    },
                    'body': json.dumps({'error': 'activity_id required'})
                }
            
            # Update the note
            activity_table.update_item(
                Key={
                    'user_id': user_id,
                    'activity_id': activity_id
                },
                UpdateExpression='SET note = :note, updated_at = :updated',
                ExpressionAttributeValues={
                    ':note': new_note,
                    ':updated': datetime.utcnow().isoformat()
                }
            )
            
            return {
                'statusCode': 200,
                'headers': {
                    'Access-Control-Allow-Origin': '*',
                    'Access-Control-Allow-Headers': 'Content-Type,Authorization,X-API-Key',
                    'Access-Control-Allow-Methods': 'GET,POST,OPTIONS'
                },
                'body': json.dumps({'ok': True, 'message': 'Note updated successfully'})
            }
            
        else:
            return {
                'statusCode': 405,
                'headers': {
                    'Access-Control-Allow-Origin': '*',
                    'Access-Control-Allow-Headers': 'Content-Type,Authorization,X-API-Key',
                    'Access-Control-Allow-Methods': 'GET,POST,OPTIONS'
                },
                'body': json.dumps({'error': 'Method not allowed'})
            }
            
    except Exception as e:
        print(f"Error in activity_log: {str(e)}")
        return {
            'statusCode': 500,
            'headers': {
                'Access-Control-Allow-Origin': '*',
                'Access-Control-Allow-Headers': 'Content-Type,Authorization,X-API-Key',
                'Access-Control-Allow-Methods': 'GET,POST,OPTIONS'
            },
            'body': json.dumps({'error': str(e)})
        }
