# 🎯 GPT-4 Configuration & Optimization Guide

## ⚙️ Current Configuration (OPTIMIZED)

### **Model Settings**
```python
model = "gpt-4o"           # GPT-4 Omni (latest, most capable)
temperature = 0.5          # Balance: consistency + nuance (0.4-0.7 range)
max_tokens = 4000          # Comprehensive responses (≥3000 required)
top_p = 0.95              # Nucleus sampling for quality
frequency_penalty = 0.0    # Allow natural term repetition
presence_penalty = 0.0     # Allow topic continuity
```

### **Why These Settings?**

#### **Model: GPT-4o (GPT-4 Omni)**
- ✅ Most advanced GPT-4 variant
- ✅ Best at nuanced, long-form, structured outputs
- ✅ Superior context handling and memory
- ✅ Handles complex system prompts effectively
- ❌ Avoid: `gpt-3.5-turbo` (too basic for threat analysis)
- ❌ Avoid: `gpt-4-0314` (older, less capable)

#### **Temperature: 0.5**
- ✅ Sweet spot for professional analysis
- ✅ Consistent enough for reliability
- ✅ Nuanced enough for complex reasoning
- ❌ Too low (0.1-0.3): Robotic, repetitive, lacks depth
- ❌ Too high (0.8-1.0): Inconsistent, unpredictable

#### **Max Tokens: 4000**
- ✅ Allows comprehensive threat assessments
- ✅ Room for full NTAC Pathway analysis
- ✅ Supports detailed TRS scoring + recommendations
- ❌ Below 3000: Responses get truncated mid-analysis
- ⚠️ OpenAI API default is often 256-512 (too low!)

#### **Top P: 0.95**
- ✅ Nucleus sampling for better quality
- ✅ Reduces low-probability token selection
- ✅ More coherent, focused outputs

---

## 🔍 Debugging: How to Verify Your Configuration

### **Step 1: Check CloudWatch Logs**

After deploying, test an analysis and check logs:

```powershell
aws logs tail /aws/lambda/threatalytics-gpt-api-dev-analyze --follow
```

Look for:
```
RAW PAYLOAD - Input length: 245
RAW PAYLOAD - First 500 chars: Analyze suspicious login attempts...
RAW PAYLOAD - Has line breaks: True
```

This confirms your frontend is sending data correctly.

### **Step 2: Check S3 Logs**

Check the structured logs in S3:

```powershell
aws s3 ls s3://threatalytics-logs-<ACCOUNT_ID>/logs/ --recursive
```

Download a log file:
```powershell
aws s3 cp s3://threatalytics-logs-<ACCOUNT_ID>/logs/2025/11/01/<request-id>.json ./test-log.json
cat ./test-log.json
```

You should see:
```json
{
  "model_config": {
    "model": "gpt-4o",
    "temperature": 0.5,
    "max_tokens": 4000,
    "top_p": 0.95
  },
  "tokens_used": 2847,
  "prompt_tokens": 1205,
  "completion_tokens": 1642,
  "system_prompt_length": 3456
}
```

### **Step 3: Compare Token Usage**

**Good sign**: `completion_tokens` between 1500-3500
**Bad sign**: `completion_tokens` under 500 (truncated responses)

---

## 🚨 Common Configuration Issues

### **Issue 1: Weak/Short Responses**

**Symptoms:**
- Responses are 2-3 paragraphs instead of comprehensive analysis
- Missing TRS scoring, NTAC pathway details
- No formatting, no structure

**Diagnosis:**
```python
# Check your Lambda function
model="gpt-3.5-turbo"  # ❌ WRONG
max_tokens=256         # ❌ TOO LOW
```

**Fix:**
```python
model="gpt-4o"         # ✅ CORRECT
max_tokens=4000        # ✅ CORRECT
```

---

### **Issue 2: Inconsistent Formatting**

**Symptoms:**
- Sometimes uses markdown, sometimes plain text
- Headers appear randomly
- Bullet points missing

**Diagnosis:**
- System prompt is being truncated or modified
- Frontend is stripping formatting characters

**Fix:**
Check raw payload logs (see Step 1 above). If line breaks are missing:

```javascript
// In your frontend (index.html)
// BEFORE (strips formatting):
text = text.replace(/\n/g, ' ');

// AFTER (preserves formatting):
text = text.trim();  // Only remove leading/trailing whitespace
```

---

### **Issue 3: System Prompt Not Applied**

**Symptoms:**
- GPT responds generically
- Doesn't follow Threatalytics structure
- Ignores [CONCERN] tags, TRS scoring

**Diagnosis:**
System prompt length exceeds token budget.

**Check:**
```python
# In logs, look for:
"system_prompt_length": 8000  # ❌ TOO LONG (exceeds context window)
```

**Fix:**
Our enhanced prompt is ~3500 chars, leaving ~12,000 tokens for input/output. Should work fine with GPT-4o (128K context window).

---

### **Issue 4: "Model Not Found" Error**

**Symptoms:**
```
Error: Model 'gpt-4o' does not exist
```

**Diagnosis:**
- Wrong OpenAI API key (org doesn't have GPT-4 access)
- Typo in model name

**Fix:**
1. Verify OpenAI account has GPT-4 access
2. Check API key in Secrets Manager:
```powershell
aws secretsmanager get-secret-value --secret-id threatalytics-openai-key
```

3. If needed, request GPT-4 API access from OpenAI

---

## 🧪 Testing Your Configuration

### **Test 1: Basic Analysis**

```powershell
$apiUrl = "https://your-api-gateway-url.execute-api.us-east-1.amazonaws.com/dev"
$apiKey = "your-api-key"

$body = @{
    text = "Student made threatening comments about school. Said 'I'll make them pay.' Has been researching weapons online. History of disciplinary issues."
} | ConvertTo-Json

$response = Invoke-RestMethod -Uri "$apiUrl/analyze" -Method Post `
    -Headers @{"x-api-key"=$apiKey; "Content-Type"="application/json"} `
    -Body $body

Write-Host $response.analysis
```

**Expected output length:** 2000-4000 characters
**Expected structure:** Markdown headers, bullet points, TRS scoring, NTAC pathway

### **Test 2: Check Token Usage**

After running Test 1, check CloudWatch logs:

```powershell
aws logs tail /aws/lambda/threatalytics-gpt-api-dev-analyze --since 5m
```

Look for:
```
Tokens used: 2847 (prompt: 1205, completion: 1642)
```

**Good**: Completion tokens 1500-3500
**Bad**: Completion tokens <500

### **Test 3: Verify Model in Logs**

Check S3 logs (as shown in Step 2 above). Confirm:
```json
"model_config": {
  "model": "gpt-4o",
  "temperature": 0.5,
  "max_tokens": 4000
}
```

---

## 📊 Performance Benchmarks

### **Expected Response Quality**

| Metric | Target | Bad | Good | Excellent |
|--------|--------|-----|------|-----------|
| **Response Length** | 2000-4000 chars | <500 | 1000-2000 | 2000-4000 |
| **Token Usage** | 1500-3500 | <500 | 800-1500 | 1500-3500 |
| **Structure** | Full markdown | None | Partial | Complete |
| **TRS Scoring** | Always present | Missing | Generic | Detailed |
| **NTAC Pathway** | All 5 stages | Missing | 1-2 stages | All 5 stages |
| **Actionable Steps** | 5-10 items | 0-2 | 3-5 | 5-10 |

### **Cost Per Request**

With current config:
- GPT-4o input: $5 per 1M tokens
- GPT-4o output: $15 per 1M tokens

Average request:
- Prompt: ~1200 tokens = $0.006
- Completion: ~2000 tokens = $0.030
- **Total: ~$0.036 per analysis**

---

## 🔧 Advanced Optimizations

### **1. Function Calling (Coming Soon)**

Instead of relying on GPT to format responses, use function calling:

```python
functions = [
    {
        "name": "threat_analysis",
        "description": "Structured threat assessment output",
        "parameters": {
            "type": "object",
            "properties": {
                "trs_score": {"type": "integer"},
                "ntac_pathway": {"type": "object"},
                "risk_indicators": {"type": "array"},
                "recommended_actions": {"type": "array"}
            }
        }
    }
]

response = client_openai.chat.completions.create(
    model="gpt-4o",
    messages=[...],
    functions=functions,
    function_call={"name": "threat_analysis"}
)
```

This enforces structure at the API level.

### **2. Response Templating**

Add response format examples to system prompt:

```python
system_prompt += """

EXAMPLE RESPONSE FORMAT:

## Threat Analysis Summary
[HIGH CONCERN] Subject exhibits multiple warning indicators...

## Observable Behaviors
- Made specific threats against identifiable targets
- Researched weapons and tactics online
- History of escalating aggressive behavior
...
"""
```

### **3. Token Budget Management**

Monitor token usage and adjust:

```python
# Calculate tokens before sending
import tiktoken

encoder = tiktoken.encoding_for_model("gpt-4o")
prompt_tokens = len(encoder.encode(system_prompt + input_text))

if prompt_tokens > 10000:
    # Truncate input or summarize
    input_text = input_text[:5000]
```

---

## ✅ Deployment Checklist

Before deploying:

- [ ] Model is `gpt-4o` or `gpt-4-1106-preview`
- [ ] Temperature is 0.4-0.7 (we use 0.5)
- [ ] Max tokens ≥ 3000 (we use 4000)
- [ ] System prompt is under 4000 characters
- [ ] CloudWatch logging enabled
- [ ] S3 structured logging enabled
- [ ] Raw payload logging enabled (for debugging)
- [ ] Token usage logging enabled
- [ ] OpenAI API key has GPT-4 access

---

## 🆘 Troubleshooting

### "Responses don't match GPT interface quality"

1. **Check model**: Must be `gpt-4o` or `gpt-4-1106-preview`
2. **Check max_tokens**: Must be ≥3000
3. **Check system prompt**: Must be fully applied (check logs)
4. **Check frontend**: Is it stripping formatting?

### "Responses are truncated"

- Increase `max_tokens` to 4000 or higher
- Check CloudWatch for token limit warnings

### "Too expensive"

- Use `gpt-4-turbo` instead of `gpt-4o` (slightly cheaper)
- Reduce `max_tokens` to 3000 (from 4000)
- Add response caching (for repeated queries)

---

## 📖 Resources

- [OpenAI API Documentation](https://platform.openai.com/docs/api-reference)
- [GPT-4 Model Comparison](https://platform.openai.com/docs/models/gpt-4-and-gpt-4-turbo)
- [Token Counting](https://github.com/openai/tiktoken)

---

**Current Status**: ✅ Optimized for GPT-4o with enhanced system prompt and comprehensive logging

**Deploy with**: `serverless deploy`
