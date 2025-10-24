# Threatalytics GPT API - Complete Setup Guide

## Prerequisites Checklist

### 1. AWS Account Setup
- [ ] Create AWS account or use existing one
- [ ] Enable billing and verify account limits
- [ ] Create IAM user with programmatic access
- [ ] Note down: Access Key ID, Secret Access Key, Account ID, Region

### 2. Development Environment
- [ ] Install Python 3.9+ (check with `python --version`)
- [ ] Install Node.js 16+ (check with `node --version`)
- [ ] Install Git
- [ ] Install VS Code (recommended)

### 3. API Keys & Services
- [ ] OpenAI API key (from https://platform.openai.com/api-keys)
- [ ] Stripe account and API keys (from https://dashboard.stripe.com/apikeys)

---

## Role-Based Setup Instructions

### 👨‍💻 BACKEND DEVELOPER
**Focus**: Code implementation, API logic, testing

#### Your Tasks:
1. **Code Review & Customization**
   ```bash
   # Review Lambda functions in lambda_functions/
   # Customize prompts in analyze.py, redact.py, etc.
   # Update system prompts for your specific use case
   ```

2. **Local Testing**
   ```bash
   # Install dependencies
   pip install -r requirements.txt

   # Run syntax checks
   python -m py_compile lambda_functions/*.py

   # Test individual functions (mock AWS services)
   ```

3. **API Logic Enhancement**
   - Add custom threat scoring algorithms
   - Implement FERPA compliance logic
   - Enhance PII detection patterns

---

### 🛠️ DEVOPS ENGINEER
**Focus**: Infrastructure, deployment, monitoring

#### Prerequisites:
```bash
# Install AWS CLI
pip install awscli

# Configure AWS credentials
aws configure
# Enter: Access Key ID, Secret Access Key, Default region (us-east-1), Default output (json)

# Verify credentials
aws sts get-caller-identity
```

#### Infrastructure Setup:
```bash
# Install Serverless Framework
npm install -g serverless

# Login to Serverless (if prompted)
serverless login

# Validate configuration
serverless print
```

#### Secrets Management:
```bash
# Create OpenAI secret in AWS Secrets Manager
aws secretsmanager create-secret \
  --name "threatalytics-openai-key" \
  --secret-string '{"api_key":"your-openai-key-here"}'

# Verify secret creation
aws secretsmanager list-secrets
```

#### Deployment:
```bash
# Deploy to AWS
serverless deploy

# Get deployment info
serverless info

# Note the API Gateway URL and API keys
```

#### Monitoring Setup:
```bash
# Create CloudWatch alarms (optional)
aws cloudwatch put-metric-alarm \
  --alarm-name "Threatalytics-API-Errors" \
  --alarm-description "Alert when API errors exceed threshold" \
  --metric-name Errors \
  --namespace AWS/Lambda \
  --statistic Sum \
  --period 300 \
  --threshold 5 \
  --comparison-operator GreaterThanThreshold
```

---

### 🔒 SECURITY ENGINEER
**Focus**: Security configuration, compliance, audit

#### IAM & Access Control:
```bash
# Verify IAM policies are least-privilege
# Check serverless.yml for specific ARNs
# Ensure no wildcard (*) permissions in production
```

#### Security Validation:
```bash
# Check encryption at rest
aws s3api get-bucket-encryption --bucket threatalytics-logs-{account-id}

# Verify CloudTrail is enabled
aws cloudtrail get-trail-status --name threatalytics-trail

# Check Secrets Manager rotation
aws secretsmanager describe-secret --secret-id threatalytics-openai-key
```

#### Compliance Checks:
- [ ] Data encryption (S3, DynamoDB)
- [ ] Network security (VPC, security groups)
- [ ] Access logging (CloudTrail, S3 access logs)
- [ ] PII handling (FERPA compliance)
- [ ] CORS configuration

---

### 🧪 QA/TEST ENGINEER
**Focus**: Testing, validation, quality assurance

#### Automated Testing:
```bash
# Make test script executable (Windows)
# Run endpoint tests after deployment
./test_endpoints.sh https://your-api-id.execute-api.us-east-1.amazonaws.com/dev your-api-key
```

#### Manual Testing Scenarios:
```bash
# Test /analyze endpoint
curl -X POST https://your-api-id.execute-api.us-east-1.amazonaws.com/dev/analyze \
  -H "x-api-key: your-api-key" \
  -H "Content-Type: application/json" \
  -d '{"text": "Test threat analysis text"}'

# Test error handling
curl -X POST https://your-api-id.execute-api.us-east-1.amazonaws.com/dev/analyze \
  -H "Content-Type: application/json" \
  -d '{"text": "Missing API key"}'
```

#### Load Testing:
```bash
# Test rate limits
# Verify throttling works
# Check usage plan enforcement
```

#### Security Testing:
- [ ] Test API key authentication
- [ ] Verify CORS headers
- [ ] Check for sensitive data leakage
- [ ] Validate input sanitization

---

### 📊 PRODUCT MANAGER
**Focus**: Requirements, monitoring, business metrics

#### Post-Deployment Validation:
1. **API Endpoint Verification**
   - All endpoints responding correctly
   - Proper error messages
   - CORS working for web clients

2. **Billing Integration**
   - Stripe webhooks configured
   - API key generation/revocation working
   - Usage tracking in DynamoDB

3. **Monitoring Setup**
   - CloudWatch dashboards created
   - SNS alerts configured
   - S3 logging verified

#### Business Metrics:
- API usage by endpoint
- Error rates and patterns
- User subscription trends
- Performance metrics (latency, throughput)

---

## 🚀 QUICK START (All Roles)

### Step 1: Environment Setup
```bash
# Clone/configure project
cd e:\SONOMA\test

# Install Python dependencies
pip install -r requirements.txt

# Install AWS CLI
pip install awscli

# Configure AWS
aws configure

# Install Serverless
npm install -g serverless
```

### Step 2: AWS Secrets
```bash
# Create OpenAI secret
aws secretsmanager create-secret \
  --name "threatalytics-openai-key" \
  --secret-string '{"api_key":"your-actual-openai-key"}'
```

### Step 3: Deploy
```bash
# Deploy infrastructure
serverless deploy

# Note the outputs (API URL, API keys)
```

### Step 4: Configure Stripe
1. Go to Stripe Dashboard
2. Create products/prices ($9.99/month for 500 req, $49.99/month for 5000 req)
3. Add webhook endpoint: `https://your-api-id.execute-api.us-east-1.amazonaws.com/dev/stripe/webhook`
4. Copy webhook secret to environment

### Step 5: Test
```bash
# Run automated tests
./test_endpoints.sh <api-url> <api-key>

# Manual testing with Postman
# Verify CloudWatch logs
# Check S3 for structured logs
```

---

## 🔧 Troubleshooting

### Common Issues:
1. **AWS Credentials**: Run `aws configure` again
2. **Serverless Login**: Run `serverless login`
3. **Permissions**: Check IAM policies for required actions
4. **Secrets**: Verify secret name matches `serverless.yml`
5. **API Keys**: Generate in API Gateway console if needed

### Logs & Debugging:
```bash
# Check CloudWatch logs
aws logs tail /aws/lambda/threatalytics-gpt-api-dev-analyze --follow

# View S3 logs
aws s3 ls s3://threatalytics-logs-{account-id}/logs/ --recursive

# Check DynamoDB tables
aws dynamodb scan --table-name ThreatalyticsUsage
```

---

## 📞 Support

- **DevOps**: Infrastructure issues, deployment failures
- **Backend**: API logic, Lambda function errors
- **Security**: Access issues, compliance concerns
- **QA**: Testing failures, validation issues
- **Product**: Feature requests, business logic

**Next Steps**: Start with DevOps setup, then move to testing, finally configure monitoring.