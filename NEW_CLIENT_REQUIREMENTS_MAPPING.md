# New Client Requirements - Endpoint Mapping & Implementation Plan

## 📊 Endpoint Analysis: Old vs New

### ✅ **REUSABLE EXISTING ENDPOINTS**

| Feature | Existing Endpoint | New Requirement | Status |
|---------|-------------------|-----------------|--------|
| **Authentication** | `/auth` (POST) | User login/signup | ✅ REUSE - Already handles JWT tokens |
| **Conversations** | `/conversations` (GET/POST/DELETE) | Activity logging | ✅ REUSE - Similar structure to activity_log |
| **Token Management** | Uses JWT in headers | API Key validation | ✅ REUSE - Add API key middleware |

### 🆕 **NEW ENDPOINTS REQUIRED**

| New Feature | Endpoint | Method | Lambda Function | Priority |
|-------------|----------|--------|-----------------|----------|
| **Activity Log** | `/admin/activity` | GET | `activity_log.py` | HIGH |
| **Update Note** | `/admin/note/update` | POST | `activity_log.py` | HIGH |
| **Roadmap View** | `/admin/roadmap` | GET | `roadmap_manager.py` | MEDIUM |
| **Roadmap Update** | `/admin/roadmap/update` | POST | `roadmap_manager.py` | MEDIUM |
| **Roadmap Export** | `/admin/roadmap/export` | GET | `roadmap_manager.py` | MEDIUM |
| **File Upload** | `/upload` | POST | `document_processor.py` | HIGH |
| **Process Doc** | `/process` | POST | `document_processor.py` | HIGH |
| **Ask Question** | `/ask` | POST | `document_processor.py` | HIGH |
| **Submit Feedback** | `/feedback` | POST | `feedback.py` | MEDIUM |
| **View Metrics** | `/metrics` | GET | `metrics.py` | MEDIUM |
| **Image Validation** | `/image/validate` | POST | `image_validator.py` | LOW |

## 🔄 **REUSABLE PATTERNS FROM EXISTING CODE**

### 1. **Activity Log → Use Conversations Pattern**
- **Existing:** `conversations.py` stores messages with user_id
- **Reuse:** Same DynamoDB structure, JWT token extraction
- **New Table:** `ThreatalyticsActivityLog` (similar to ThreatalyticsConversations)

```python
# REUSE from conversations.py:
- get_user_id_from_token(event)
- DynamoDB query by user_id
- CORS headers
```

### 2. **Authentication → Already Complete**
- **Existing:** `auth.py` with Cognito
- **Reuse:** Token validation, user management
- **No changes needed** - just reference in new Lambda functions

### 3. **API Key Validation**
- **New requirement:** `X-API-Key` header validation
- **Create:** Middleware in each Lambda to check API key

## 📁 **NEW LAMBDA FUNCTIONS TO CREATE**

### 1. `activity_log.py`
```python
# Handles: /admin/activity, /admin/note/update
# Reuses: JWT token extraction from conversations.py
# DynamoDB Table: ThreatalyticsActivityLog
# Schema: {
#   user_id: string (PK),
#   activity_id: string (SK),
#   client_id: string,
#   case_name: string,
#   timestamp: string,
#   mode: string,
#   question: string,
#   answer: string,
#   trs_score: number,
#   tag: string,
#   note: string,
#   file_url: string
# }
```

### 2. `roadmap_manager.py`
```python
# Handles: /admin/roadmap, /admin/roadmap/update, /admin/roadmap/export
# Reuses: JWT token extraction
# DynamoDB Table: ThreatalyticsRoadmap (or in-memory for MVP)
# Returns CSV for export endpoint
```

### 3. `document_processor.py`
```python
# Handles: /upload, /process, /ask
# New functionality: S3 upload, PDF/DOCX processing
# Dependencies: PyPDF2, python-docx, boto3
# Integrates with existing analyze.py logic
```

### 4. `feedback.py`
```python
# Handles: /feedback
# DynamoDB Table: ThreatalyticsFeedback
# Schema: { user_id, question, helpful, comments, timestamp }
```

### 5. `metrics.py`
```python
# Handles: /metrics
# Aggregates data from ThreatalyticsFeedback
# Returns: helpful_rate, sample_comments
```

### 6. `image_validator.py`
```python
# Handles: /image/validate
# Validates image generation requests
# No database needed - just keyword filtering
```

## 🎨 **NEW REACT COMPONENTS TO CREATE**

| Component | Path | Based On | Status |
|-----------|------|----------|--------|
| `ClientDashboard.tsx` | `reactapp-main/src/pages/ClientDashboard.tsx` | History.tsx | 🆕 NEW |
| `AdminLaunchDashboard.tsx` | `reactapp-main/src/pages/AdminLaunchDashboard.tsx` | History.tsx | 🆕 NEW |
| `ClientAssistant.tsx` | `reactapp-main/src/pages/ClientAssistant.tsx` | Dashboard.tsx | 🆕 NEW |

### New Service Files Needed:
- `src/lib/activity-service.ts` (based on conversations-service.ts)
- `src/lib/roadmap-service.ts` (based on conversations-service.ts)
- `src/lib/feedback-service.ts` (based on conversations-service.ts)
- `src/lib/metrics-service.ts` (based on conversations-service.ts)
- `src/lib/document-service.ts` (based on conversations-service.ts)

## 🗂️ **NEW DYNAMODB TABLES REQUIRED**

Add to `resources-dynamodb.yml`:

```yaml
ThreatalyticsActivityLog:
  Type: AWS::DynamoDB::Table
  Properties:
    TableName: ThreatalyticsActivityLog
    AttributeDefinitions:
      - AttributeName: user_id
        AttributeType: S
      - AttributeName: activity_id
        AttributeType: S
    KeySchema:
      - AttributeName: user_id
        KeyType: HASH
      - AttributeName: activity_id
        KeyType: RANGE
    BillingMode: PAY_PER_REQUEST

ThreatalyticsRoadmap:
  Type: AWS::DynamoDB::Table
  Properties:
    TableName: ThreatalyticsRoadmap
    AttributeDefinitions:
      - AttributeName: user_id
        AttributeType: S
      - AttributeName: category
        AttributeType: S
    KeySchema:
      - AttributeName: user_id
        KeyType: HASH
      - AttributeName: category
        KeyType: RANGE
    BillingMode: PAY_PER_REQUEST

ThreatalyticsFeedback:
  Type: AWS::DynamoDB::Table
  Properties:
    TableName: ThreatalyticsFeedback
    AttributeDefinitions:
      - AttributeName: user_id
        AttributeType: S
      - AttributeName: timestamp
        AttributeType: S
    KeySchema:
      - AttributeName: user_id
        KeyType: HASH
      - AttributeName: timestamp
        KeyType: RANGE
    BillingMode: PAY_PER_REQUEST

ThreatalyticsDocuments:
  Type: AWS::DynamoDB::Table
  Properties:
    TableName: ThreatalyticsDocuments
    AttributeDefinitions:
      - AttributeName: user_id
        AttributeType: S
      - AttributeName: document_id
        AttributeType: S
    KeySchema:
      - AttributeName: user_id
        KeyType: HASH
      - AttributeName: document_id
        KeyType: RANGE
    BillingMode: PAY_PER_REQUEST
```

## 🚀 **DEPLOYMENT SEQUENCE**

### Phase 1: Backend Setup (Lambda + DynamoDB)
1. ✅ Fix conversations.py (DONE - JWT token extraction)
2. 🆕 Create activity_log.py
3. 🆕 Create roadmap_manager.py
4. 🆕 Create document_processor.py
5. 🆕 Create feedback.py
6. 🆕 Create metrics.py
7. 🆕 Create image_validator.py
8. 🆕 Update resources-dynamodb.yml with new tables
9. 🆕 Update serverless.yml with new function definitions
10. 🚀 Deploy: `serverless deploy`

### Phase 2: Frontend Setup (React Components)
1. 🆕 Create activity-service.ts
2. 🆕 Create roadmap-service.ts
3. 🆕 Create feedback-service.ts
4. 🆕 Create metrics-service.ts
5. 🆕 Create document-service.ts
6. 🆕 Create ClientDashboard.tsx
7. 🆕 Create AdminLaunchDashboard.tsx
8. 🆕 Create ClientAssistant.tsx
9. 🆕 Update App.tsx routing
10. 🆕 Update Sidebar.tsx navigation

### Phase 3: Testing
1. Test each new endpoint individually
2. Test frontend integration
3. Test file upload/download flow
4. Test feedback/metrics collection

## 📝 **ENVIRONMENT VARIABLES NEEDED**

Add to serverless.yml environment section:
```yaml
environment:
  API_KEY: ${env:THREATALYTICS_API_KEY}
  S3_BUCKET: ${env:S3_BUCKET_NAME}
  OPENSEARCH_HOST: ${env:OPENSEARCH_HOST, 'localhost'}
  OPENSEARCH_USER: ${env:OPENSEARCH_USER, 'admin'}
  OPENSEARCH_PASS: ${env:OPENSEARCH_PASS, 'admin'}
```

## ⚠️ **IMPORTANT NOTES**

1. **Reuse JWT Token Logic** - All new Lambda functions should use the same `get_user_id_from_token()` pattern from conversations.py
2. **Consistent CORS** - Copy CORS headers from existing endpoints
3. **API Key Validation** - Add optional X-API-Key header validation as middleware
4. **S3 Integration** - Reuse existing S3 bucket configuration for document uploads
5. **Error Handling** - Follow same error response format as existing endpoints

## 🎯 **NEXT STEPS**

1. Create new Lambda functions (activity_log.py, roadmap_manager.py, etc.)
2. Update resources-dynamodb.yml with new tables
3. Update serverless.yml with new function definitions
4. Deploy backend: `serverless deploy`
5. Create React service files and components
6. Test integration
7. Update documentation

---

**Ready to proceed?** I'll start creating the Lambda functions, following the existing patterns from your codebase.
