import os
import json
import boto3
from datetime import datetime
import uuid
import base64
from openai import OpenAI

# This Lambda handles document upload, processing, and question answering
# It can reuse logic from existing analyze.py, redact.py, report.py, drill.py endpoints

def get_user_id_from_token(event):
    """Extract user_id from JWT token in Authorization header"""
    try:
        if 'requestContext' in event and 'authorizer' in event['requestContext']:
            if 'claims' in event['requestContext']['authorizer']:
                return event['requestContext']['authorizer']['claims']['sub']
        
        auth_header = event.get('headers', {}).get('Authorization') or event.get('headers', {}).get('authorization')
        if not auth_header:
            # Check for X-API-Key header as alternative
            api_key = event.get('headers', {}).get('X-API-Key') or event.get('headers', {}).get('x-api-key')
            if api_key:
                # For API key auth, use a default user or validate key
                return f"api-key-user-{api_key[:8]}"
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
    Document Processor Lambda - handles document upload, processing, and Q&A
    Endpoints:
    - POST /upload - Upload document to S3
    - POST /process - Process uploaded document
    - POST /ask - Ask question about uploaded document
    
    NOTE: This integrates with existing analyze/redact/report/drill endpoints
    """
    s3 = boto3.client('s3')
    dynamodb = boto3.resource('dynamodb')
    documents_table = dynamodb.Table('ThreatalyticsDocuments')
    
    S3_BUCKET = os.environ.get('S3_BUCKET', 'threatalytics-documents')
    
    # Get user ID from token or API key
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
    
    path = event.get('path', '')
    
    try:
        if '/upload' in path:
            # Handle file upload
            # NOTE: In API Gateway, file uploads need multipart/form-data handling
            # For now, this is a placeholder - actual implementation depends on your setup
            
            body = json.loads(event.get('body', '{}'))
            file_name = body.get('file_name', 'document.pdf')
            file_content = body.get('file_content', '')  # Base64 encoded
            
            # Generate unique document ID
            document_id = str(uuid.uuid4())
            s3_key = f"uploads/{user_id}/{document_id}/{file_name}"
            
            # Upload to S3
            if file_content:
                file_data = base64.b64decode(file_content)
                s3.put_object(
                    Bucket=S3_BUCKET,
                    Key=s3_key,
                    Body=file_data
                )
            
            # Store document metadata
            documents_table.put_item(Item={
                'user_id': user_id,
                'document_id': document_id,
                'file_name': file_name,
                's3_key': s3_key,
                'upload_time': datetime.utcnow().isoformat(),
                'status': 'uploaded'
            })
            
            return {
                'statusCode': 200,
                'headers': {
                    'Access-Control-Allow-Origin': '*',
                    'Access-Control-Allow-Headers': 'Content-Type,Authorization,X-API-Key',
                    'Access-Control-Allow-Methods': 'POST,OPTIONS'
                },
                'body': json.dumps({
                    'status': 'uploaded',
                    'document_id': document_id,
                    's3_key': s3_key
                })
            }
            
        elif '/process' in path:
            # Process uploaded document
            body = json.loads(event.get('body', '{}'))
            document_id = body.get('document_id')
            
            if not document_id:
                return {
                    'statusCode': 400,
                    'headers': {
                        'Access-Control-Allow-Origin': '*',
                        'Access-Control-Allow-Headers': 'Content-Type,Authorization,X-API-Key',
                        'Access-Control-Allow-Methods': 'POST,OPTIONS'
                    },
                    'body': json.dumps({'error': 'document_id required'})
                }
            
            # Update document status
            documents_table.update_item(
                Key={
                    'user_id': user_id,
                    'document_id': document_id
                },
                UpdateExpression='SET #status = :status, processed_time = :time',
                ExpressionAttributeNames={'#status': 'status'},
                ExpressionAttributeValues={
                    ':status': 'processed',
                    ':time': datetime.utcnow().isoformat()
                }
            )
            
            return {
                'statusCode': 200,
                'headers': {
                    'Access-Control-Allow-Origin': '*',
                    'Access-Control-Allow-Headers': 'Content-Type,Authorization,X-API-Key',
                    'Access-Control-Allow-Methods': 'POST,OPTIONS'
                },
                'body': json.dumps({
                    'status': 'processed',
                    'message': 'Document processed successfully. You may now ask questions.'
                })
            }
            
        elif '/ask' in path:
            # Answer question about document using OpenAI
            body = json.loads(event.get('body', '{}'))
            question = body.get('question', '')
            mode = body.get('mode', 'policy_audit')
            document_id = body.get('document_id')
            
            print(f"Ask endpoint called - question: {question}, mode: {mode}, document_id: {document_id}")
            
            if not question:
                return {
                    'statusCode': 400,
                    'headers': {
                        'Access-Control-Allow-Origin': '*',
                        'Access-Control-Allow-Headers': 'Content-Type,Authorization,X-API-Key',
                        'Access-Control-Allow-Methods': 'POST,OPTIONS'
                    },
                    'body': json.dumps({
                        'error': 'Question is too vague. Try rephrasing with more specifics.',
                        'templates': [
                            'Does this policy clearly define lockdown procedures?',
                            'Are there any vague terms in this policy section?',
                            'What drill procedures are described in this section?'
                        ]
                    })
                }
            
            # Get OpenAI API key from Secrets Manager
            try:
                secrets_client = boto3.client('secretsmanager')
                secret_name = os.environ.get('OPENAI_SECRET', 'threatalytics/openai')
                print(f"Fetching secret: {secret_name}")
                secret = json.loads(secrets_client.get_secret_value(SecretId=secret_name)['SecretString'])
                openai_api_key = secret['api_key']
            except Exception as e:
                print(f"Error getting OpenAI key: {str(e)}")
                return {
                    'statusCode': 500,
                    'headers': {
                        'Access-Control-Allow-Origin': '*',
                        'Access-Control-Allow-Headers': 'Content-Type,Authorization,X-API-Key',
                        'Access-Control-Allow-Methods': 'POST,OPTIONS'
                    },
                    'body': json.dumps({'error': f'Failed to get API key: {str(e)}'})
                }
            
            # Initialize OpenAI client
            client_openai = OpenAI(api_key=openai_api_key)
            
            # Get document content from S3 if document_id provided
            document_content = ""
            if document_id:
                try:
                    print(f"Fetching document: {document_id} for user: {user_id}")
                    doc_response = documents_table.get_item(
                        Key={
                            'user_id': user_id,
                            'document_id': document_id
                        }
                    )
                    if 'Item' in doc_response:
                        s3_key = doc_response['Item'].get('s3_key')
                        print(f"Found document with S3 key: {s3_key}")
                        if s3_key:
                            # Get document from S3
                            obj = s3.get_object(Bucket=S3_BUCKET, Key=s3_key)
                            document_content = obj['Body'].read().decode('utf-8')
                            print(f"Document content length: {len(document_content)}")
                    else:
                        print(f"Document not found in DynamoDB")
                except Exception as e:
                    print(f"Error retrieving document: {str(e)}")
                    # Continue without document content
            
            # Build prompt based on mode
            mode_prompts = {
                'policy_audit': """You are a policy analysis expert. Analyze the provided policy document and answer the user's question.
Focus on clarity, completeness, legal compliance, and practical implementation.
Provide specific quotes and page references when possible.""",
                
                'drill_extractor': """You are a drill and emergency procedure expert. Extract and analyze drill-related information from the policy.
Focus on procedures, timelines, roles, responsibilities, and compliance requirements.
Identify any gaps or ambiguities in the drill procedures.""",
                
                'red_flag_finder': """You are a risk assessment expert. Identify potential issues, gaps, or concerning elements in the policy.
Look for vague language, missing procedures, compliance risks, and safety concerns.
Highlight areas that need immediate attention or clarification."""
            }
            
            system_prompt = mode_prompts.get(mode, mode_prompts['policy_audit'])
            
            # Build user message
            if document_content:
                user_message = f"Document Content:\n{document_content}\n\nQuestion: {question}"
            else:
                user_message = f"Question: {question}\n\nNote: No document content available. Please provide a general answer based on best practices."
            
            # Call OpenAI API
            try:
                print(f"Calling OpenAI API with model: gpt-4")
                response = client_openai.chat.completions.create(
                    model="gpt-4",
                    messages=[
                        {"role": "system", "content": system_prompt},
                        {"role": "user", "content": user_message}
                    ],
                    max_tokens=2000,
                    temperature=0.7
                )
                
                answer = response.choices[0].message.content
                print(f"OpenAI response received, length: {len(answer)}")
                
            except Exception as e:
                print(f"OpenAI API error: {str(e)}")
                return {
                    'statusCode': 500,
                    'headers': {
                        'Access-Control-Allow-Origin': '*',
                        'Access-Control-Allow-Headers': 'Content-Type,Authorization,X-API-Key',
                        'Access-Control-Allow-Methods': 'POST,OPTIONS'
                    },
                    'body': json.dumps({'error': f'OpenAI API error: {str(e)}'})
                }
            
            return {
                'statusCode': 200,
                'headers': {
                    'Access-Control-Allow-Origin': '*',
                    'Access-Control-Allow-Headers': 'Content-Type,Authorization,X-API-Key',
                    'Access-Control-Allow-Methods': 'POST,OPTIONS'
                },
                'body': json.dumps({
                    'answer': answer,
                    'mode': mode,
                    'question': question,
                    'document_id': document_id
                })
            }
            
    except Exception as e:
        print(f"Error in document_processor: {str(e)}")
        return {
            'statusCode': 500,
            'headers': {
                'Access-Control-Allow-Origin': '*',
                'Access-Control-Allow-Headers': 'Content-Type,Authorization,X-API-Key',
                'Access-Control-Allow-Methods': 'POST,OPTIONS'
            },
            'body': json.dumps({'error': str(e)})
        }
