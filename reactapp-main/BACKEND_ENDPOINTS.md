# Backend API Endpoints Required

## Overview
This document lists all backend endpoints needed for the Threatalytics AI application. These need to be implemented in your FastAPI backend.

## Authentication & Security
- All endpoints should validate API key via header: `X-API-Key`
- Store API key in environment variable: `API_KEY`

---

## 📋 Activity Log Endpoints

### GET `/api/admin/activity`
**Purpose**: Fetch activity log for a specific client

**Query Parameters**:
- `client_id` (string, required): Client identifier

**Response**:
```json
[
  {
    "id": "uuid",
    "client_id": "string",
    "case_name": "string",
    "timestamp": "2025-11-06 10:23:00",
    "mode": "analyze|drill|redact|trends",
    "question": "string",
    "answer": "string",
    "trs_score": 3,
    "tag": "string",
    "note": "string",
    "file_url": "string"
  }
]
```

### POST `/api/admin/note/update`
**Purpose**: Update private note for an activity entry

**Request Body**:
```json
{
  "id": "entry-uuid",
  "note": "string"
}
```

**Response**:
```json
{
  "ok": true
}
```

---

## 🗺️ Roadmap Endpoints

### GET `/api/admin/roadmap`
**Purpose**: Fetch launch readiness roadmap

**Response**:
```json
{
  "infrastructure": [
    { "task": "string", "status": "complete|pending" }
  ],
  "client_dashboard": [
    { "feature": "string", "status": "complete|pending" }
  ],
  "pilot": [
    { "task": "string", "status": "complete|pending" }
  ],
  "launch": [
    { "task": "string", "status": "complete|pending" }
  ],
  "database": {
    "preferred_db": "DynamoDB",
    "tables": ["activity_log", "clients", "cases", "feedback", "metrics"]
  }
}
```

### POST `/api/admin/roadmap/update`
**Purpose**: Update roadmap item status

**Request Body**:
```json
{
  "category": "infrastructure|client_dashboard|pilot|launch",
  "index": 0,
  "status": "complete|pending"
}
```

**Response**:
```json
{
  "ok": true
}
```

### GET `/api/admin/roadmap/export`
**Purpose**: Export roadmap as CSV file

**Response**: CSV file download
```
Phase,Item,Status
Infrastructure,Set up S3 bucket,complete
...
```

---

## 💬 Chat & Analysis Endpoints

### POST `/api/ask`
**Purpose**: Submit question for AI analysis

**Request Body**:
```json
{
  "question": "string",
  "mode": "analyze|drill|redact|trends"
}
```

**Response (Success)**:
```json
{
  "answer": "string",
  "formatted_prompt": "string",
  "context_used": ["chunk1", "chunk2"],
  "trs_score": 3,
  "red_flags": ["flag1"]
}
```

**Response (Vague Input Error)**:
```json
{
  "error": "Please be more specific",
  "templates": [
    "Does this policy clearly define lockdown procedures?",
    "Are there any vague terms in this policy section?"
  ]
}
```

---

## 📊 Feedback Endpoints

### POST `/api/feedback`
**Purpose**: Submit user feedback for a response

**Request Body**:
```json
{
  "question": "string",
  "helpful": true,
  "comments": "string",
  "timestamp": "ISO-8601"
}
```

**Response**:
```json
{
  "status": "logged"
}
```

### GET `/api/metrics`
**Purpose**: Fetch feedback metrics and analytics

**Response**:
```json
{
  "total_feedback": 10,
  "helpful": 8,
  "not_helpful": 2,
  "helpful_rate_percent": 80.0,
  "sample_comments": [
    "Very accurate analysis",
    "Helped identify key issues"
  ]
}
```

---

## 📁 File Upload Endpoints

### POST `/api/upload`
**Purpose**: Upload policy document for processing

**Request**: Multipart form data
- `file`: File upload (PDF, DOCX)
- `client_id`: Client identifier

**Response**:
```json
{
  "status": "uploaded",
  "s3_key": "uploads/client-id/uuid_filename.pdf"
}
```

### POST `/api/process`
**Purpose**: Process uploaded document (extract text, chunk, index)

**Request**: Multipart form data
- `file`: File to process

**Response**:
```json
{
  "status": "processed",
  "chunks": 45,
  "indexed": true
}
```

---

## 🔍 Implementation Notes

### Activity Logging
When a user asks a question via `/api/ask`, the backend should automatically:
1. Log the activity with `log_activity(entry)` function
2. Store: question, answer, mode, TRS score, timestamp, client_id
3. Generate unique UUID for the entry

### Input Validation (Vague Detection)
Before processing in `/api/ask`, check for:
- Questions with < 4 words
- Presence of vague phrases: "what should we do", "is this okay", etc.
- If vague, return error with mode-specific question templates

### Feedback Analytics
The `/api/metrics` endpoint should calculate:
- Total feedback count
- Helpful vs not helpful counts
- Helpful rate percentage
- Recent comments (last 5)

---

## 🔐 Environment Variables Required

```bash
API_KEY=your-secret-api-key
S3_BUCKET=threatalytics-uploads
OPENSEARCH_HOST=your-opensearch-host
OPENSEARCH_USER=admin
OPENSEARCH_PASS=admin-password
DATABASE_URL=dynamodb-connection-string
```

---

## 📦 Python Modules to Reuse

From your provided code, these modules can be reused:
1. `secure_upload_and_logging.py` - File upload & API key validation
2. `document_processor_module.py` - PDF/DOCX text extraction
3. `document_chunker_retriever.py` - Text chunking
4. `opensearch_handler_module.py` - Search & indexing
5. `document_scorecard_module.py` - TRS scoring & red flag detection
6. `guided_modes_module.py` - Mode-specific prompts
7. `resilience_hardening_module.py` - Input validation
8. `feedback_analytics_module.py` - Feedback metrics
9. `input_guidance_module.py` - Vague input detection

---

## 🚀 Deployment Checklist

### Backend (AWS Lambda + API Gateway)
1. ✅ Package all modules + dependencies
2. ✅ Set environment variables
3. ✅ Configure API Gateway routes
4. ✅ Enable CORS on all endpoints
5. ✅ Test each endpoint with sample data

### Frontend (React on S3 + CloudFront)
1. ✅ Build React app: `npm run build`
2. ✅ Upload to S3 bucket
3. ✅ Configure CloudFront distribution
4. ✅ Update API endpoint URLs in frontend
5. ✅ Test all features end-to-end

---

## 📝 Testing Endpoints

Use these sample requests to test:

```bash
# Test activity log
curl -X GET "https://your-api.com/api/admin/activity?client_id=test-client" \
  -H "X-API-Key: your-key"

# Test ask endpoint
curl -X POST "https://your-api.com/api/ask" \
  -H "X-API-Key: your-key" \
  -H "Content-Type: application/json" \
  -d '{"question": "Does this policy define lockdown procedures?", "mode": "analyze"}'

# Test feedback
curl -X POST "https://your-api.com/api/feedback" \
  -H "X-API-Key: your-key" \
  -H "Content-Type: application/json" \
  -d '{"question": "test", "helpful": true, "comments": "Great!"}'
```

---

## 🔄 Endpoint Status

| Endpoint | Status | Notes |
|----------|--------|-------|
| `/api/admin/activity` | ⚠️ To Implement | Uses activity_log module |
| `/api/admin/note/update` | ⚠️ To Implement | Updates note field |
| `/api/admin/roadmap` | ⚠️ To Implement | Returns roadmap dict |
| `/api/admin/roadmap/update` | ⚠️ To Implement | Updates status field |
| `/api/admin/roadmap/export` | ⚠️ To Implement | CSV export |
| `/api/ask` | ⚠️ To Implement | Main chat endpoint |
| `/api/feedback` | ⚠️ To Implement | Log feedback |
| `/api/metrics` | ⚠️ To Implement | Feedback analytics |
| `/api/upload` | ⚠️ To Implement | S3 upload |
| `/api/process` | ⚠️ To Implement | Document processing |
