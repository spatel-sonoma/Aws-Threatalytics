# Threatalytics GPT API

This is a serverless API for Threatalytics GPT, built on AWS Lambda, API Gateway, and integrated with Stripe for monetization.

## Features

- /analyze: Analyze threat behavior
- /redact: Redact PII
- /report: Generate reports
- /drill: Simulate drills

## Setup

1. Install dependencies: `pip install -r requirements.txt`
2. Configure AWS credentials
3. Store OpenAI API key in Secrets Manager
4. Deploy with Serverless: `serverless deploy`

## Environment Variables

- OPENAI_SECRET: Name of the secret in Secrets Manager containing OpenAI API key
- STRIPE_SECRET_KEY: Stripe secret key

## API Usage

All endpoints require an API key in the header: `x-api-key`

### /analyze

POST /analyze

Body: {"text": "input text"}

Response: {"analysis": "GPT response"}

### /redact

POST /redact

Body: {"text": "input text"}

Response: {"redacted": "redacted text"}

### /report

POST /report

Body: {"data": "input data"}

Response: {"report": "generated report"}

### /drill

POST /drill

Body: {"scenario": "drill scenario"}

Response: {"simulation": "drill result"}

## Monetization

Integrated with Stripe for subscription billing. Webhooks handle subscription events to assign/revoke API keys.

## Security & Compliance

- **IAM Roles**: Least-privilege access with specific resource ARNs
- **Secrets Manager**: Secure storage of API keys
- **CloudTrail**: Audit logging enabled
- **CORS**: Configured for web applications
- **Encryption**: Data encrypted at rest and in transit
- **PII Handling**: FERPA-safe responses with automatic redaction

## Testing

### Automated Endpoint Testing

Run the included test script:

```bash
chmod +x test_endpoints.sh
./test_endpoints.sh https://your-api-id.execute-api.region.amazonaws.com/dev your-api-key
```

### Manual Testing with curl

```bash
# Test /analyze endpoint
curl -X POST https://your-api-id.execute-api.region.amazonaws.com/dev/analyze \
  -H "x-api-key: your-api-key" \
  -H "Content-Type: application/json" \
  -d '{"text": "Suspicious behavior: User accessing restricted files repeatedly"}'

# Test /redact endpoint
curl -X POST https://your-api-id.execute-api.region.amazonaws.com/dev/redact \
  -H "x-api-key: your-api-key" \
  -H "Content-Type: application/json" \
  -d '{"text": "John Doe from New York called support at 555-1234"}'
```

### Postman Testing

1. Create new request
2. Set method to POST
3. Enter API endpoint URL
4. Add header: `x-api-key` with your API key
5. Add header: `Content-Type: application/json`
6. Add request body with JSON payload
7. Send request and validate 200 OK response

## Monitoring & Logging

- **CloudWatch**: Real-time logs and metrics
- **S3**: Structured data logging in `threatalytics-logs-{account-id}` bucket
- **SNS**: Alert notifications for errors and security events
- **DynamoDB**: Usage tracking and plan management

## AWS Resources Created

- Lambda Functions: analyze, redact, report, drill, stripe_webhook
- API Gateway: REST API with usage plans and API keys
- DynamoDB Tables: ThreatalyticsUsage, ThreatalyticsPlans
- S3 Buckets: threatalytics-logs-{account-id}, threatalytics-cloudtrail-{account-id}
- SNS Topic: threatalytics-alerts
- CloudTrail: threatalytics-trail