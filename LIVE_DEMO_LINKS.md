# Threatalytics API Live Demo Links

## 🚀 Live Demo Endpoint (No Authentication Required)

**URL**: https://api.threatalyticsai.com/demo

**Test Command**:
```bash
curl -X POST https://api.threatalyticsai.com/demo \
  -H "Content-Type: application/json" \
  -d '{"text": "User accessed restricted files 5 times in one hour"}'
```

**Expected Response**:
```json
{
  "demo": true,
  "analysis": "DEMO: Potential threat detected - unauthorized access pattern",
  "note": "This is a demo. Sign up for full access at https://api.threatalyticsai.com",
  "timestamp": "2025-10-30T..."
}
```

## 🔐 Full API Endpoints (Require API Key)

### /analyze - Threat Analysis
```bash
curl -X POST https://api.threatalyticsai.com/analyze \
  -H "x-api-key: YOUR_API_KEY" \
  -H "Content-Type: application/json" \
  -d '{"text": "User john.doe@email.com accessed restricted files"}'
```

### /redact - PII Redaction
```bash
curl -X POST https://api.threatalyticsai.com/redact \
  -H "x-api-key: YOUR_API_KEY" \
  -H "Content-Type: application/json" \
  -d '{"text": "Contact John Smith at 555-123-4567"}'
```

### /generate-report - Report Generation
```bash
curl -X POST https://api.threatalyticsai.com/generate-report \
  -H "x-api-key: YOUR_API_KEY" \
  -H "Content-Type: application/json" \
  -d '{"data": "Multiple failed login attempts detected"}'
```

### /simulate-drill - Threat Simulation
```bash
curl -X POST https://api.threatalyticsai.com/simulate-drill \
  -H "x-api-key: YOUR_API_KEY" \
  -H "Content-Type: application/json" \
  -d '{"scenario": "Simulate ransomware attack"}'
```

## 📋 Client Testing Instructions

### Step 1: Test Demo (No Signup Required)
1. Open browser or terminal
2. Run the demo curl command above
3. Should return JSON with demo analysis

### Step 2: Get API Key for Full Access
1. Sign up at your Stripe checkout page
2. Receive API key via email/webhook
3. Use key in `x-api-key` header

### Step 3: Test Full Endpoints
1. Replace `YOUR_API_KEY` with actual key
2. Test each endpoint
3. Verify responses contain expected fields

## 🔧 Troubleshooting

### If Demo Returns 403/404:
- Domain mapping not updated in API Gateway
- Demo endpoint not deployed

### If Auth Endpoints Return 403:
- Invalid API key
- Key not associated with usage plan
- Domain mapping issues

### If All Return 403:
- Custom domain not properly configured in Route 53/API Gateway
- SSL certificate issues

## 📞 Support

For client demos, provide:
1. **Demo Link**: https://api.threatalyticsai.com/demo
2. **Signup Instructions**: How to get API key
3. **Test Commands**: Above curl examples

The demo endpoint allows potential clients to test the AI capabilities without any signup process!