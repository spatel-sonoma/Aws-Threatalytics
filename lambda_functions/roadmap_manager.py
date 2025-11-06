import os
import json
import boto3
from datetime import datetime
import csv
from io import StringIO
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

# Default roadmap structure
DEFAULT_ROADMAP = {
    "infrastructure": [
        {"task": "Set up S3 bucket + CloudFront", "status": "complete"},
        {"task": "Provision API Gateway + Lambda", "status": "complete"},
        {"task": "Configure environment variables", "status": "pending"}
    ],
    "client_dashboard": [
        {"feature": "Re-download source files", "status": "complete"},
        {"feature": "Save private case notes", "status": "complete"}
    ],
    "pilot": [
        {"task": "Confirm FERPA/PII onboarding with schools", "status": "pending"},
        {"task": "Validate red flag logic with live data", "status": "pending"}
    ],
    "launch": [
        {"task": "QA all endpoints", "status": "pending"},
        {"task": "Deploy final build to CloudFront", "status": "pending"}
    ],
    "database": {
        "preferred_db": "DynamoDB",
        "tables": ["activity_log", "clients", "cases", "feedback", "metrics"]
    }
}

def lambda_handler(event, context):
    """
    Roadmap Manager Lambda - manages project roadmap and launch checklist
    Endpoints:
    - GET /admin/roadmap - Get roadmap for user
    - POST /admin/roadmap/update - Update task status
    - GET /admin/roadmap/export - Export roadmap as CSV
    """
    dynamodb = boto3.resource('dynamodb')
    roadmap_table = dynamodb.Table('ThreatalyticsRoadmap')
    
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
    path = event.get('path', '')
    
    try:
        if http_method == 'GET' and '/export' in path:
            # Export roadmap as CSV
            # Get roadmap from DynamoDB
            response = roadmap_table.get_item(Key={'user_id': user_id})
            roadmap = response.get('Item', {}).get('roadmap_data', DEFAULT_ROADMAP)
            
            # Generate CSV
            output = StringIO()
            writer = csv.writer(output)
            writer.writerow(["Phase", "Item", "Status"])
            
            for section in roadmap:
                if section == "database":
                    continue
                for item in roadmap[section]:
                    name = item.get("task") or item.get("feature")
                    writer.writerow([section.capitalize(), name, item["status"]])
            
            csv_data = output.getvalue()
            
            return {
                'statusCode': 200,
                'headers': {
                    'Access-Control-Allow-Origin': '*',
                    'Content-Type': 'text/csv',
                    'Content-Disposition': 'attachment; filename=roadmap.csv'
                },
                'body': csv_data
            }
            
        elif http_method == 'GET':
            # Get roadmap
            response = roadmap_table.get_item(Key={'user_id': user_id})
            
            if 'Item' in response:
                roadmap = response['Item']['roadmap_data']
            else:
                # Initialize with default roadmap
                roadmap = DEFAULT_ROADMAP
                roadmap_table.put_item(Item={
                    'user_id': user_id,
                    'roadmap_data': roadmap,
                    'created_at': datetime.utcnow().isoformat(),
                    'updated_at': datetime.utcnow().isoformat()
                })
            
            return {
                'statusCode': 200,
                'headers': {
                    'Access-Control-Allow-Origin': '*',
                    'Access-Control-Allow-Headers': 'Content-Type,Authorization,X-API-Key',
                    'Access-Control-Allow-Methods': 'GET,POST,OPTIONS'
                },
                'body': json.dumps(roadmap, default=str)
            }
            
        elif http_method == 'POST':
            # Update task status
            body = json.loads(event['body'])
            category = body.get('category')
            index = body.get('index')
            status = body.get('status')
            
            if not all([category, index is not None, status]):
                return {
                    'statusCode': 400,
                    'headers': {
                        'Access-Control-Allow-Origin': '*',
                        'Access-Control-Allow-Headers': 'Content-Type,Authorization,X-API-Key',
                        'Access-Control-Allow-Methods': 'GET,POST,OPTIONS'
                    },
                    'body': json.dumps({'error': 'category, index, and status required'})
                }
            
            # Get current roadmap
            response = roadmap_table.get_item(Key={'user_id': user_id})
            roadmap = response.get('Item', {}).get('roadmap_data', DEFAULT_ROADMAP)
            
            # Update status
            if category in roadmap and index < len(roadmap[category]):
                roadmap[category][index]['status'] = status
                
                # Save back to DynamoDB
                roadmap_table.put_item(Item={
                    'user_id': user_id,
                    'roadmap_data': roadmap,
                    'updated_at': datetime.utcnow().isoformat()
                })
                
                return {
                    'statusCode': 200,
                    'headers': {
                        'Access-Control-Allow-Origin': '*',
                        'Access-Control-Allow-Headers': 'Content-Type,Authorization,X-API-Key',
                        'Access-Control-Allow-Methods': 'GET,POST,OPTIONS'
                    },
                    'body': json.dumps({'ok': True, 'message': 'Status updated'})
                }
            else:
                return {
                    'statusCode': 400,
                    'headers': {
                        'Access-Control-Allow-Origin': '*',
                        'Access-Control-Allow-Headers': 'Content-Type,Authorization,X-API-Key',
                        'Access-Control-Allow-Methods': 'GET,POST,OPTIONS'
                    },
                    'body': json.dumps({'error': 'Invalid category or index'})
                }
                
    except Exception as e:
        print(f"Error in roadmap_manager: {str(e)}")
        return {
            'statusCode': 500,
            'headers': {
                'Access-Control-Allow-Origin': '*',
                'Access-Control-Allow-Headers': 'Content-Type,Authorization,X-API-Key',
                'Access-Control-Allow-Methods': 'GET,POST,OPTIONS'
            },
            'body': json.dumps({'error': str(e)})
        }
