import os
import json
import boto3
from openai import OpenAI

def lambda_handler(event, context):
    # Get OpenAI key from Secrets Manager
    secret_name = os.environ['OPENAI_SECRET']
    client = boto3.client('secretsmanager')
    secret = json.loads(client.get_secret_value(SecretId=secret_name)['SecretString'])
    openai_api_key = secret['api_key']
    
    # Initialize OpenAI client
    client_openai = OpenAI(api_key=openai_api_key)
    
    # Parse input
    body = json.loads(event['body'])
    input_data = body.get('data', '')
    
    # System prompt for report generation
    system_prompt = "You are Threatalytics AI. Generate a comprehensive threat analysis report based on the provided data. Include threat scores, indicators, and recommendations."
    
    # Call GPT
    response = client_openai.chat.completions.create(
        model="gpt-4o",
        messages=[
            {"role": "system", "content": system_prompt},
            {"role": "user", "content": input_data}
        ],
        temperature=0.4
    )
    
    report = response.choices[0].message.content
    
    # Log usage
    api_key = event['headers'].get('x-api-key')
    if api_key:
        dynamodb = boto3.resource('dynamodb')
        table = dynamodb.Table('ThreatalyticsUsage')
        table.put_item(Item={
            'api_key': api_key,
            'timestamp': str(context.aws_request_id),
            'endpoint': 'report',
            'usage': 1
        })
    
    return {
        'statusCode': 200,
        'headers': {
            'Access-Control-Allow-Origin': '*',
            'Access-Control-Allow-Headers': 'Content-Type,X-Amz-Date,Authorization,X-Api-Key,X-Amz-Security-Token',
            'Access-Control-Allow-Methods': 'POST,OPTIONS'
        },
        'body': json.dumps({"report": report})
    }