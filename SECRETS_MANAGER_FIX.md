# Secrets Manager Access Fix

## Problem
The `/ask` endpoint was failing with:
```
AccessDeniedException: User: arn:aws:sts::847025107284:assumed-role/analyze_behavior-role-gdthz8jo/document_processor 
is not authorized to perform: secretsmanager:GetSecretValue on resource: threatalytics/openai
```

## Root Cause
1. **IAM Policy Mismatch**: The IAM policy in serverless.yml only allowed access to `threatalytics-openai-key-*` but NOT `threatalytics/openai-*`
2. **Code Inconsistency**: document_processor.py had a fallback default of `threatalytics/openai` instead of `threatalytics-openai-key`

## Solution

### 1. Updated serverless.yml
Added `threatalytics/openai-*` to the IAM policy:

```yaml
iamRoleStatements:
  - Effect: Allow
    Action:
      - secretsmanager:GetSecretValue
    Resource: 
      - "arn:aws:secretsmanager:${self:provider.region}:${aws:accountId}:secret:threatalytics-openai-key-*"
      - "arn:aws:secretsmanager:${self:provider.region}:${aws:accountId}:secret:threatalytics/openai-*"  # ADDED
      - "arn:aws:secretsmanager:${self:provider.region}:${aws:accountId}:secret:threatalytics/stripe-*"
      - "arn:aws:secretsmanager:${self:provider.region}:${aws:accountId}:secret:threatalytics/admin-*"
```

### 2. Updated document_processor.py
Changed the fallback secret name to match the environment variable:

**Before:**
```python
secret_name = os.environ.get('OPENAI_SECRET', 'threatalytics/openai')
```

**After:**
```python
secret_name = os.environ.get('OPENAI_SECRET', 'threatalytics-openai-key')
```

## Environment Variables
The serverless.yml already has:
```yaml
environment:
  OPENAI_SECRET: threatalytics-openai-key
```

So the Lambda will use `threatalytics-openai-key` as the secret name.

## Deployment
Run:
```bash
serverless deploy
```

Or deploy just the document processor function:
```bash
serverless deploy function -f documentProcessor
```

## Verification
After deployment, test the `/ask` endpoint:
```bash
curl -X POST https://api.threatalyticsai.com/ask \
  -H "Content-Type: application/json" \
  -H "Authorization: Bearer <token>" \
  -d '{"document_id": "doc123", "question": "What is this document about?"}'
```

Should return a successful response instead of 500 error.
