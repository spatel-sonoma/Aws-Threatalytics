import json
import openai
import boto3
import os
from datetime import datetime

def lambda_handler(event, context):
    # Demo endpoint - limited functionality, no API key required
    try:
        # Get OpenAI key from Secrets Manager
        secrets_client = boto3.client('secretsmanager')
        secret_name = os.environ['OPENAI_SECRET']
        secret = json.loads(secrets_client.get_secret_value(SecretId=secret_name)['SecretString'])
        openai_api_key = secret['api_key']

        # Initialize OpenAI client
        client_openai = openai.OpenAI(api_key=openai_api_key)

        # Parse input
        body = json.loads(event.get('body', '{}'))
        input_text = body.get('text', 'Sample threat: User accessed restricted files repeatedly')

        # Limited demo analysis
        system_prompt = "You are Threatalytics AI demo. Provide a brief threat analysis sample. Keep response under 200 words."

        response = client_openai.chat.completions.create(
            model="gpt-4o",
            messages=[
                {"role": "system", "content": system_prompt},
                {"role": "user", "content": input_text}
            ],
            temperature=0.4,
            max_tokens=200
        )

        demo_response = {
            "demo": True,
            "analysis": response.choices[0].message.content,
            "note": "This is a demo. Sign up for full access at https://api.threatalyticsai.com",
            "timestamp": datetime.utcnow().isoformat()
        }

        # Log demo usage to S3
        s3_client = boto3.client('s3')
        log_data = {
            'timestamp': datetime.utcnow().isoformat(),
            'endpoint': 'demo',
            'request_id': context.aws_request_id,
            'status': 'success'
        }

        s3_client.put_object(
            Bucket=f"threatalytics-logs-{context.invoked_function_arn.split(':')[4]}",
            Key=f"demo/{datetime.utcnow().strftime('%Y/%m/%d')}/{context.aws_request_id}.json",
            Body=json.dumps(log_data),
            ContentType='application/json'
        )

        return {
            'statusCode': 200,
            'headers': {
                'Access-Control-Allow-Origin': '*',
                'Access-Control-Allow-Headers': 'Content-Type',
                'Access-Control-Allow-Methods': 'POST,OPTIONS'
            },
            'body': json.dumps(demo_response)
        }

    except Exception as e:
        return {
            'statusCode': 500,
            'headers': {
                'Access-Control-Allow-Origin': '*',
                'Access-Control-Allow-Headers': 'Content-Type',
                'Access-Control-Allow-Methods': 'POST,OPTIONS'
            },
            'body': json.dumps({
                "demo": True,
                "error": "Demo service temporarily unavailable",
                "note": "Sign up for full access at https://api.threatalyticsai.com"
            })
        }