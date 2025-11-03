# AWS Authentication & Data Storage Setup Guide

## 🔐 Prerequisites
- AWS Account with admin access
- AWS CLI configured
- Serverless Framework installed

---

## 📋 Step 1: Create DynamoDB Tables

### 1.1 Users Table
```bash
aws dynamodb create-table \
    --table-name ThreatalyticsUsers \
    --attribute-definitions \
        AttributeName=user_id,AttributeType=S \
    --key-schema \
        AttributeName=user_id,KeyType=HASH \
    --billing-mode PAY_PER_REQUEST \
    --region us-east-1
```

### 1.2 Conversations Table
```bash
aws dynamodb create-table \
    --table-name ThreatalyticsConversations \
    --attribute-definitions \
        AttributeName=user_id,AttributeType=S \
        AttributeName=conversation_id,AttributeType=S \
    --key-schema \
        AttributeName=user_id,KeyType=HASH \
        AttributeName=conversation_id,KeyType=RANGE \
    --billing-mode PAY_PER_REQUEST \
    --region us-east-1
```

---

## 🔑 Step 2: Set Up AWS Cognito

### 2.1 Create User Pool
```bash
aws cognito-idp create-user-pool \
    --pool-name threatalytics-user-pool \
    --policies "PasswordPolicy={MinimumLength=8,RequireUppercase=true,RequireLowercase=true,RequireNumbers=true,RequireSymbols=false}" \
    --auto-verified-attributes email \
    --username-attributes email \
    --mfa-configuration OFF \
    --region us-east-1
```

**Save the UserPoolId from the output!**

### 2.2 Create User Pool Client
```bash
aws cognito-idp create-user-pool-client \
    --user-pool-id <YOUR_USER_POOL_ID> \
    --client-name threatalytics-web-client \
    --explicit-auth-flows ALLOW_USER_PASSWORD_AUTH ALLOW_REFRESH_TOKEN_AUTH \
    --prevent-user-existence-errors ENABLED \
    --region us-east-1
```

**Save the ClientId from the output!**

### 2.3 Create Identity Pool (for AWS credentials)
```bash
aws cognito-identity create-identity-pool \
    --identity-pool-name threatalytics_identity_pool \
    --allow-unauthenticated-identities false \
    --cognito-identity-providers \
        ProviderName=cognito-idp.us-east-1.amazonaws.com/<YOUR_USER_POOL_ID>,ClientId=<YOUR_CLIENT_ID>
```

**Save the IdentityPoolId from the output!**

---

## 🔧 Step 3: Update serverless.yml

Add these functions and environment variables to your `serverless.yml`:

```yaml
provider:
  name: aws
  runtime: python3.9
  stage: dev
  region: us-east-1
  environment:
    COGNITO_USER_POOL_ID: <YOUR_USER_POOL_ID>
    COGNITO_CLIENT_ID: <YOUR_CLIENT_ID>
    COGNITO_IDENTITY_POOL_ID: <YOUR_IDENTITY_POOL_ID>
  
  iamRoleStatements:
    # Existing statements...
    - Effect: Allow
      Action:
        - cognito-idp:*
      Resource: "arn:aws:cognito-idp:${self:provider.region}:${aws:accountId}:userpool/<YOUR_USER_POOL_ID>"
    - Effect: Allow
      Action:
        - dynamodb:Query
        - dynamodb:GetItem
        - dynamodb:PutItem
        - dynamodb:DeleteItem
      Resource:
        - "arn:aws:dynamodb:${self:provider.region}:${aws:accountId}:table/ThreatalyticsUsers"
        - "arn:aws:dynamodb:${self:provider.region}:${aws:accountId}:table/ThreatalyticsConversations"

functions:
  auth:
    handler: lambda_functions/auth.lambda_handler
    events:
      - http:
          path: /auth
          method: post
          cors:
            origin: '*'
            headers:
              - Content-Type
              - X-Api-Key
              - Authorization
            allowCredentials: false

  conversations:
    handler: lambda_functions/conversations.lambda_handler
    events:
      - http:
          path: /conversations
          method: get
          cors:
            origin: '*'
            headers:
              - Content-Type
              - Authorization
            allowCredentials: false
          authorizer:
            type: COGNITO_USER_POOLS
            authorizerId:
              Ref: ApiGatewayAuthorizer
      - http:
          path: /conversations
          method: post
          cors:
            origin: '*'
            headers:
              - Content-Type
              - Authorization
            allowCredentials: false
          authorizer:
            type: COGNITO_USER_POOLS
            authorizerId:
              Ref: ApiGatewayAuthorizer
      - http:
          path: /conversations/{conversation_id}
          method: delete
          cors:
            origin: '*'
            headers:
              - Content-Type
              - Authorization
            allowCredentials: false
          authorizer:
            type: COGNITO_USER_POOLS
            authorizerId:
              Ref: ApiGatewayAuthorizer

resources:
  Resources:
    ApiGatewayAuthorizer:
      Type: AWS::ApiGateway::Authorizer
      Properties:
        Name: CognitoAuthorizer
        Type: COGNITO_USER_POOLS
        IdentitySource: method.request.header.Authorization
        RestApiId:
          Ref: ApiGatewayRestApi
        ProviderARNs:
          - arn:aws:cognito-idp:${self:provider.region}:${aws:accountId}:userpool/<YOUR_USER_POOL_ID>
```

---

## 📦 Step 4: Update Requirements

Add to `requirements.txt`:
```
boto3
botocore
```

---

## 🚀 Step 5: Deploy

```bash
serverless deploy
```

---

## 📝 Step 6: Update Frontend

The frontend code has been updated with:
- Login/Signup modal
- Session management with localStorage
- Automatic token refresh
- Conversation history save/load
- Protected routes

---

## 🔒 Security Features Implemented

✅ **Cognito User Pools** - Secure authentication
✅ **JWT Tokens** - Access, ID, and Refresh tokens
✅ **DynamoDB** - Encrypted data storage
✅ **CORS** - Proper origin policies
✅ **Authorizers** - API Gateway protection
✅ **Password Policy** - Strong password requirements
✅ **Email Verification** - User email confirmation

---

## 🧪 Testing Authentication

### Sign Up
```bash
curl -X POST https://your-api.com/auth \
  -H "Content-Type: application/json" \
  -d '{
    "action": "signup",
    "email": "test@example.com",
    "password": "SecurePass123",
    "name": "Test User"
  }'
```

### Login
```bash
curl -X POST https://your-api.com/auth \
  -H "Content-Type: application/json" \
  -d '{
    "action": "login",
    "email": "test@example.com",
    "password": "SecurePass123"
  }'
```

### Get Conversations
```bash
curl -X GET https://your-api.com/conversations \
  -H "Authorization: Bearer <ACCESS_TOKEN>"
```

---

## 📊 DynamoDB Table Structures

### ThreatalyticsUsers
```json
{
  "user_id": "cognito-sub-id",
  "email": "user@example.com",
  "name": "User Name",
  "plan": "free|pro|enterprise",
  "created_at": "2025-11-01T10:00:00Z",
  "conversation_count": 0
}
```

### ThreatalyticsConversations
```json
{
  "user_id": "cognito-sub-id",
  "conversation_id": "uuid",
  "mode": "analyze|redact|report|drill",
  "title": "Conversation Title",
  "messages": [
    {"role": "user", "content": "...", "timestamp": "..."},
    {"role": "assistant", "content": "...", "timestamp": "..."}
  ],
  "created_at": "2025-11-01T10:00:00Z",
  "updated_at": "2025-11-01T10:05:00Z",
  "message_count": 4
}
```

---

## 🔑 Environment Variables to Set

After creating Cognito resources, update these in your deployment:

```bash
export COGNITO_USER_POOL_ID="us-east-1_XXXXXXXXX"
export COGNITO_CLIENT_ID="xxxxxxxxxxxxxxxxxxxxxxxxxx"
export COGNITO_IDENTITY_POOL_ID="us-east-1:xxxxxxxx-xxxx-xxxx-xxxx-xxxxxxxxxxxx"
```

---

## ✅ Verification Checklist

- [ ] DynamoDB tables created
- [ ] Cognito User Pool created
- [ ] Cognito User Pool Client created
- [ ] Identity Pool created
- [ ] serverless.yml updated with IDs
- [ ] IAM permissions configured
- [ ] Lambda functions deployed
- [ ] Frontend updated with auth code
- [ ] Test signup flow
- [ ] Test login flow
- [ ] Test conversation save/load

---

## 🆘 Troubleshooting

### Issue: "User pool not found"
**Solution:** Verify COGNITO_USER_POOL_ID is correct in serverless.yml

### Issue: "Not authorized to perform cognito-idp:InitiateAuth"
**Solution:** Check IAM role has proper Cognito permissions

### Issue: "Token expired"
**Solution:** Implement refresh token logic (already in frontend)

### Issue: "CORS error"
**Solution:** Ensure all endpoints have proper CORS headers

---

## 📞 Support

For issues or questions:
- Check AWS Cognito Console for user status
- Review CloudWatch logs for Lambda errors
- Verify DynamoDB table data in AWS Console
