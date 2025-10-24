import os
import json
import boto3
from openai import OpenAI
from datetime import datetime

def lambda_handler(event, context):
    # Initialize AWS clients
    secrets_client = boto3.client('secretsmanager')
    dynamodb = boto3.resource('dynamodb')
    s3_client = boto3.client('s3')
    sns_client = boto3.client('sns')
    
    # Get OpenAI key from Secrets Manager
    secret_name = os.environ['OPENAI_SECRET']
    secret = json.loads(secrets_client.get_secret_value(SecretId=secret_name)['SecretString'])
    openai_api_key = secret['api_key']
    
    # Initialize OpenAI client
    client_openai = OpenAI(api_key=openai_api_key)
    
    # Parse input
    body = json.loads(event['body'])
    input_text = body.get('text', '')
    
    # System prompt
    system_prompt = "You are Threatalytics AI. Analyze the provided text for behavioral threat indicators. Redact any PII and provide a threat score."
    
    try:
        # Call GPT
        response = client_openai.chat.completions.create(
            model="gpt-4o",
            messages=[
                {"role": "system", "content": system_prompt},
                {"role": "user", "content": input_text}
            ],
            temperature=0.4
        )
        
        analysis = response.choices[0].message.content
        
        # Log structured data to S3
        log_data = {
            'timestamp': datetime.utcnow().isoformat(),
            'endpoint': 'analyze',
            'api_key': event['headers'].get('x-api-key'),
            'input_length': len(input_text),
            'request_id': context.aws_request_id,
            'status': 'success'
        }
        
        s3_client.put_object(
            Bucket=f"threatalytics-logs-{context.invoked_function_arn.split(':')[4]}",
            Key=f"logs/{datetime.utcnow().strftime('%Y/%m/%d')}/{context.aws_request_id}.json",
            Body=json.dumps(log_data),
            ContentType='application/json'
        )
        
        # Log usage to DynamoDB
        api_key = event['headers'].get('x-api-key')
        if api_key:
            table = dynamodb.Table('ThreatalyticsUsage')
            table.put_item(Item={
                'api_key': api_key,
                'timestamp': str(context.aws_request_id),
                'endpoint': 'analyze',
                'usage': 1
            })
        
        return {
            'statusCode': 200,
            'headers': {
                'Access-Control-Allow-Origin': '*',
                'Access-Control-Allow-Headers': 'Content-Type,X-Amz-Date,Authorization,X-Api-Key,X-Amz-Security-Token',
                'Access-Control-Allow-Methods': 'POST,OPTIONS'
            },
            'body': json.dumps({"analysis": analysis})
        }
        
    except Exception as e:
        # Log error to S3
        error_log = {
            'timestamp': datetime.utcnow().isoformat(),
            'endpoint': 'analyze',
            'api_key': event['headers'].get('x-api-key'),
            'request_id': context.aws_request_id,
            'status': 'error',
            'error': str(e)
        }
        
        s3_client.put_object(
            Bucket=f"threatalytics-logs-{context.invoked_function_arn.split(':')[4]}",
            Key=f"errors/{datetime.utcnow().strftime('%Y/%m/%d')}/{context.aws_request_id}.json",
            Body=json.dumps(error_log),
            ContentType='application/json'
        )
        
        # Send alert via SNS
        sns_client.publish(
            TopicArn=f"arn:aws:sns:{os.environ['AWS_REGION']}:{context.invoked_function_arn.split(':')[4]}:threatalytics-alerts",
            Subject="Threatalytics API Error Alert",
            Message=f"Error in analyze endpoint: {str(e)}\nRequest ID: {context.aws_request_id}"
        )
        
        return {
            'statusCode': 500,
            'headers': {
                'Access-Control-Allow-Origin': '*',
                'Access-Control-Allow-Headers': 'Content-Type,X-Amz-Date,Authorization,X-Api-Key,X-Amz-Security-Token',
                'Access-Control-Allow-Methods': 'POST,OPTIONS'
            },
            'body': json.dumps({"error": "Internal server error"})
        }