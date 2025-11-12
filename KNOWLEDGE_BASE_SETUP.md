# Knowledge Base Setup for Threatalytics AI

## Overview
To improve Threatalytics AI responses and align them more closely with your ChatGPT version, you need to load your reference documents into AWS S3 and integrate them into the analysis workflow.

## Current Situation
- ✅ Your ChatGPT has access to uploaded documents/knowledge
- ❌ Your AWS Lambda function does NOT have access to these documents
- 🎯 Goal: Give AWS the same knowledge context as ChatGPT

---

## Step 1: Upload Documents to S3

### 1.1 Create S3 Bucket (if not exists)
```bash
aws s3 mb s3://threatalytics-knowledge-base --region us-east-1
```

### 1.2 Upload Your Knowledge Documents
```bash
# Upload individual files
aws s3 cp your-document.pdf s3://threatalytics-knowledge-base/documents/

# Upload entire folder
aws s3 cp ./knowledge-docs/ s3://threatalytics-knowledge-base/documents/ --recursive
```

### 1.3 Recommended Document Structure
```
s3://threatalytics-knowledge-base/
├── documents/
│   ├── ntac-pathway-guide.pdf
│   ├── threat-assessment-framework.pdf
│   ├── behavioral-indicators.pdf
│   ├── team-protocols.pdf
│   └── case-studies.pdf
├── templates/
│   ├── analysis-template.md
│   └── documentation-standards.md
└── reference/
    ├── legal-guidelines.pdf
    └── privacy-requirements.pdf
```

---

## Step 2: Update Lambda Function to Use Documents

### Option A: Vector Search with OpenAI Embeddings (Recommended)

This approach creates embeddings of your documents and searches them for relevant context.

**Benefits:**
- Most accurate and contextual
- Only sends relevant excerpts to GPT-4
- Reduces token usage
- Matches your ChatGPT experience

**Steps:**
1. Create embeddings of your documents
2. Store embeddings in vector database (e.g., Pinecone, Weaviate, or S3 with FAISS)
3. Search embeddings for relevant context before sending to GPT-4
4. Include relevant excerpts in the prompt

### Option B: Full Document Context (Simple)

Load entire documents and include in system prompt.

**Benefits:**
- Simple to implement
- No additional services needed
- Works immediately

**Limitations:**
- Higher token costs
- May hit token limits
- Less targeted

---

## Step 3: Update analyze.py to Include Documents

### Quick Implementation (Load from S3)

Add this code to your `analyze.py`:

```python
def get_knowledge_base_context():
    """Retrieve relevant knowledge base documents from S3"""
    s3 = boto3.client('s3')
    bucket_name = 'threatalytics-knowledge-base'
    
    # List of key documents to include
    doc_keys = [
        'documents/threat-assessment-framework.txt',
        'documents/ntac-pathway-summary.txt',
        'documents/behavioral-indicators.txt'
    ]
    
    context = []
    for key in doc_keys:
        try:
            response = s3.get_object(Bucket=bucket_name, Key=key)
            content = response['Body'].read().decode('utf-8')
            context.append(f"--- {key} ---\\n{content}\\n")
        except Exception as e:
            print(f"Could not load {key}: {e}")
    
    return "\\n".join(context)

# In lambda_handler, before calling OpenAI:
knowledge_context = get_knowledge_base_context()

# Update system prompt to include:
system_prompt = f"""You are Threatalytics AI...

REFERENCE MATERIALS:
{knowledge_context}

[rest of your system prompt]
"""
```

---

## Step 4: Extract Documents from ChatGPT

If you have documents loaded in your ChatGPT but need to extract them:

### Method 1: Ask ChatGPT Directly
```
Can you provide me with the full text of the threat assessment framework 
document you have access to? Please format it as plain text.
```

### Method 2: Recreate from Outputs
If documents aren't extractable, analyze ChatGPT's responses to identify:
- What guidelines it's following
- What frameworks it references
- What terminology it uses
- What examples it draws from

Then create matching reference documents.

---

## Step 5: Update serverless.yml

Add S3 permissions for knowledge base:

```yaml
provider:
  name: aws
  runtime: python3.9
  iam:
    role:
      statements:
        - Effect: Allow
          Action:
            - s3:GetObject
            - s3:ListBucket
          Resource:
            - arn:aws:s3:::threatalytics-knowledge-base
            - arn:aws:s3:::threatalytics-knowledge-base/*
```

---

## Step 6: Test the Integration

### 6.1 Upload a simple test document
Create `test-document.txt`:
```
NTAC Pathway Quick Reference:
1. Grievance - Unresolved conflicts or perceived injustices
2. Ideation - Thoughts about causing harm
3. Research/Planning - Gathering information about targets
4. Preparation - Acquiring materials or practicing
5. Implementation - Proximity to carrying out action
```

Upload:
```bash
aws s3 cp test-document.txt s3://threatalytics-knowledge-base/documents/
```

### 6.2 Deploy and test
```bash
serverless deploy
```

Test with the same prompt you used and compare outputs.

---

## Recommended Documents to Upload

Based on your ChatGPT's performance, these documents would help:

1. **NTAC Pathway Framework** - Detailed explanation of each stage
2. **Threat Response Scoring Guidelines** - How to score severity, immediacy, capability
3. **Risk Indicator Categories** - What constitutes HIGH, MEDIUM, LOW concern
4. **Professional Terminology** - Approved language and phrasing
5. **Case Study Examples** - Real-world scenarios with analysis
6. **Documentation Standards** - Templates and requirements
7. **Legal/Privacy Guidelines** - FERPA, confidentiality requirements
8. **Team Competency Framework** - How to assess team capabilities

---

## Quick Win: Improve Current Prompt

Even without documents, you can improve by making the system prompt more specific:

```python
system_prompt = """You are Threatalytics AI, designed specifically for threat assessment teams.

WRITING STYLE REQUIREMENTS:
- Write in clear, professional paragraphs
- Use confident, decisive language
- Avoid run-on sentences or dense blocks of text
- Each behavioral observation should stand on its own line
- Add blank lines between sections for readability
- Use em dash (—) not hyphen (-) for professional separation
- Start risk summaries with [CONCERN LEVEL] — then explanation

TONE:
- Professional but accessible
- Confident without being absolute
- Supportive of team decision-making
- Evidence-based and structured
- Not overly clinical or academic

[rest of prompt]
"""
```

---

## Next Steps

**Priority 1** (Immediate):
- ✅ Updated system prompt with better formatting rules (DONE)
- Extract or identify your ChatGPT's knowledge documents
- Convert to plain text format

**Priority 2** (This Week):
- Upload documents to S3
- Update analyze.py to load documents
- Test with same prompts to compare

**Priority 3** (Future Enhancement):
- Implement vector search with embeddings
- Add document versioning
- Create document update workflow

---

## Questions to Answer

1. **What documents are loaded in your ChatGPT?**
   - Can you list them or extract them?
   - Are they PDFs, text files, or structured data?

2. **How much content?**
   - Total size of all documents
   - This determines if we use full context or vector search

3. **Update frequency?**
   - Do documents change often?
   - Need version control?

---

**Need Help?** Let me know:
- Which documents you have in ChatGPT
- If you can export/share them
- What size they are (page count or file size)

I can help integrate them into the AWS system.
