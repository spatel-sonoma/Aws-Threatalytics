import os
import json
import boto3
from datetime import datetime
import uuid
import base64
from openai import OpenAI
import io
try:
    import PyPDF2
except ImportError:
    PyPDF2 = None

# This Lambda handles document upload, processing, and question answering
# It can reuse logic from existing analyze.py, redact.py, report.py, drill.py endpoints

def extract_text_from_pdf(file_bytes):
    """Extract text from PDF bytes"""
    if not PyPDF2:
        raise Exception("PyPDF2 not available")
    
    try:
        pdf_file = io.BytesIO(file_bytes)
        pdf_reader = PyPDF2.PdfReader(pdf_file)
        
        text_content = []
        for page_num in range(len(pdf_reader.pages)):
            page = pdf_reader.pages[page_num]
            text_content.append(page.extract_text())
        
        return "\n\n".join(text_content)
    except Exception as e:
        print(f"Error extracting PDF text: {str(e)}")
        raise

def get_user_id_from_token(event):
    """Extract user_id from JWT token in Authorization header"""
    try:
        if 'requestContext' in event and 'authorizer' in event['requestContext']:
            if 'claims' in event['requestContext']['authorizer']:
                return event['requestContext']['authorizer']['claims']['sub']
        
        auth_header = event.get('headers', {}).get('Authorization') or event.get('headers', {}).get('authorization')
        if not auth_header:
            # Check for X-API-Key header as alternative
            api_key = event.get('headers', {}).get('X-API-Key') or event.get('headers', {}).get('x-api-key')
            if api_key:
                # For API key auth, use a default user or validate key
                return f"api-key-user-{api_key[:8]}"
            raise Exception('No Authorization header found')
        
        token = auth_header.replace('Bearer ', '').replace('bearer ', '')
        parts = token.split('.')
        if len(parts) != 3:
            raise Exception('Invalid token format')
        
        payload = parts[1]
        payload += '=' * (4 - len(payload) % 4)
        decoded = base64.urlsafe_b64decode(payload)
        claims = json.loads(decoded)
        
        return claims.get('sub')
    except Exception as e:
        print(f"Error extracting user_id: {str(e)}")
        return None

def lambda_handler(event, context):
    """
    Document Processor Lambda - handles document upload, processing, and Q&A
    Endpoints:
    - POST /upload - Upload document to S3
    - POST /process - Process uploaded document
    - POST /ask - Ask question about uploaded document
    
    NOTE: This integrates with existing analyze/redact/report/drill endpoints
    """
    s3 = boto3.client('s3')
    dynamodb = boto3.resource('dynamodb')
    documents_table = dynamodb.Table('ThreatalyticsDocuments')
    
    S3_BUCKET = os.environ.get('S3_BUCKET', 'threatalytics-documents')
    
    # Get user ID from token or API key
    user_id = get_user_id_from_token(event)
    
    if not user_id:
        return {
            'statusCode': 401,
            'headers': {
                'Access-Control-Allow-Origin': '*',
                'Access-Control-Allow-Headers': 'Content-Type,Authorization,X-API-Key',
                'Access-Control-Allow-Methods': 'POST,OPTIONS'
            },
            'body': json.dumps({'message': 'Unauthorized'})
        }
    
    path = event.get('path', '')
    
    # Debug logging for troubleshooting
    print("BODY PREVIEW:", (event.get("body") or "")[:200])
    print("CONTENT-TYPE:", event.get("headers", {}).get("Content-Type"))
    
    try:
        if '/upload' in path:
            # Handle file upload
            # NOTE: In API Gateway, file uploads need multipart/form-data handling
            # For now, this is a placeholder - actual implementation depends on your setup
            
            body = json.loads(event.get('body', '{}'))
            file_name = body.get('file_name', 'document.pdf')
            file_content = body.get('file_content', '')  # Base64 encoded
            
            # Generate unique document ID
            document_id = str(uuid.uuid4())
            s3_key = f"uploads/{user_id}/{document_id}/{file_name}"
            
            # Upload to S3
            if file_content:
                file_data = base64.b64decode(file_content)
                s3.put_object(
                    Bucket=S3_BUCKET,
                    Key=s3_key,
                    Body=file_data
                )
            
            # Store document metadata
            documents_table.put_item(Item={
                'user_id': user_id,
                'document_id': document_id,
                'file_name': file_name,
                's3_key': s3_key,
                'upload_time': datetime.utcnow().isoformat(),
                'status': 'uploaded'
            })
            
            return {
                'statusCode': 200,
                'headers': {
                    'Access-Control-Allow-Origin': '*',
                    'Access-Control-Allow-Headers': 'Content-Type,Authorization,X-API-Key',
                    'Access-Control-Allow-Methods': 'POST,OPTIONS'
                },
                'body': json.dumps({
                    'status': 'uploaded',
                    'document_id': document_id,
                    's3_key': s3_key
                })
            }
            
        elif '/process' in path:
            # Process uploaded document
            body = json.loads(event.get('body', '{}'))
            document_id = body.get('document_id')
            
            if not document_id:
                return {
                    'statusCode': 400,
                    'headers': {
                        'Access-Control-Allow-Origin': '*',
                        'Access-Control-Allow-Headers': 'Content-Type,Authorization,X-API-Key',
                        'Access-Control-Allow-Methods': 'POST,OPTIONS'
                    },
                    'body': json.dumps({'error': 'document_id required'})
                }
            
            # Update document status
            documents_table.update_item(
                Key={
                    'user_id': user_id,
                    'document_id': document_id
                },
                UpdateExpression='SET #status = :status, processed_time = :time',
                ExpressionAttributeNames={'#status': 'status'},
                ExpressionAttributeValues={
                    ':status': 'processed',
                    ':time': datetime.utcnow().isoformat()
                }
            )
            
            return {
                'statusCode': 200,
                'headers': {
                    'Access-Control-Allow-Origin': '*',
                    'Access-Control-Allow-Headers': 'Content-Type,Authorization,X-API-Key',
                    'Access-Control-Allow-Methods': 'POST,OPTIONS'
                },
                'body': json.dumps({
                    'status': 'processed',
                    'message': 'Document processed successfully. You may now ask questions.'
                })
            }
            
        elif '/ask' in path:
            # Answer question about document using OpenAI
            body = json.loads(event.get('body', '{}'))
            question = body.get('question', '')
            mode = body.get('mode', 'policy_audit')
            document_id = body.get('document_id')
            
            print(f"Ask endpoint called - question: {question}, mode: {mode}, document_id: {document_id}")
            
            if not question:
                return {
                    'statusCode': 400,
                    'headers': {
                        'Access-Control-Allow-Origin': '*',
                        'Access-Control-Allow-Headers': 'Content-Type,Authorization,X-API-Key',
                        'Access-Control-Allow-Methods': 'POST,OPTIONS'
                    },
                    'body': json.dumps({
                        'error': 'Question is too vague. Try rephrasing with more specifics.',
                        'templates': [
                            'Does this policy clearly define lockdown procedures?',
                            'Are there any vague terms in this policy section?',
                            'What drill procedures are described in this section?'
                        ]
                    })
                }
            
            # Get OpenAI API key from Secrets Manager
            try:
                secrets_client = boto3.client('secretsmanager')
                secret_name = os.environ.get('OPENAI_SECRET', 'threatalytics-openai-key')
                print(f"Fetching secret: {secret_name}")
                secret = json.loads(secrets_client.get_secret_value(SecretId=secret_name)['SecretString'])
                openai_api_key = secret['api_key']
            except Exception as e:
                print(f"Error getting OpenAI key: {str(e)}")
                return {
                    'statusCode': 500,
                    'headers': {
                        'Access-Control-Allow-Origin': '*',
                        'Access-Control-Allow-Headers': 'Content-Type,Authorization,X-API-Key',
                        'Access-Control-Allow-Methods': 'POST,OPTIONS'
                    },
                    'body': json.dumps({'error': f'Failed to get API key: {str(e)}'})
                }
            
            # Initialize OpenAI client
            client_openai = OpenAI(api_key=openai_api_key)
            
            # Get document content from S3 if document_id provided
            document_content = ""
            if document_id:
                try:
                    print(f"Fetching document: {document_id} for user: {user_id}")
                    doc_response = documents_table.get_item(
                        Key={
                            'user_id': user_id,
                            'document_id': document_id
                        }
                    )
                    if 'Item' in doc_response:
                        s3_key = doc_response['Item'].get('s3_key')
                        file_name = doc_response['Item'].get('file_name', '')
                        print(f"Found document with S3 key: {s3_key}, file_name: {file_name}")
                        if s3_key:
                            # Get document from S3
                            obj = s3.get_object(Bucket=S3_BUCKET, Key=s3_key)
                            file_bytes = obj['Body'].read()
                            
                            # Extract text based on file type
                            if file_name.lower().endswith('.pdf'):
                                print("Extracting text from PDF...")
                                document_content = extract_text_from_pdf(file_bytes)
                            else:
                                # Try decoding as text
                                document_content = file_bytes.decode('utf-8')
                            
                            print(f"Document content length: {len(document_content)}")
                    else:
                        print(f"Document not found in DynamoDB")
                except Exception as e:
                    print(f"Error retrieving document: {str(e)}")
                    # Continue without document content
            
            # Build prompt based on mode with ChatGPT-style formatting
            mode_prompts = {
                'policy_audit': """You are a professional policy analysis expert with years of experience in organizational compliance and governance.

**CRITICAL INSTRUCTION:** Answer ONLY based on the document content provided below. Do NOT provide general knowledge or best practices unless the document is empty. Your analysis must be grounded in what is actually written in the document.

**Your Task:** Analyze the provided policy document and answer the user's question with clarity, precision, and actionable insights.

**Formatting Guidelines:**
- Use clear paragraph breaks with blank lines between sections
- Use em dashes (—) for emphasis, not hyphens
- Bold key terms with **asterisks**
- Structure your response with clear headings when appropriate
- Break down complex information into digestible chunks
- Use bullet points for lists of items

**Analysis Framework:**
1. **Document Review** — Reference specific sections, quotes, or page numbers from the document
2. **Clarity Assessment** — Evaluate if the policy language is clear and unambiguous
3. **Completeness Review** — Identify any gaps or missing elements IN THE DOCUMENT
4. **Legal Compliance** — Check alignment with regulations based on what's IN THE DOCUMENT
5. **Practical Implementation** — Assess feasibility based on what's STATED IN THE DOCUMENT

**Response Style:**
- Be confident and decisive in your assessments
- Provide specific quotes and references from THE PROVIDED DOCUMENT
- Explain the "why" behind your observations
- Offer constructive recommendations based on what you found IN THE DOCUMENT
- Write in a professional yet conversational tone
- If something is NOT in the document, explicitly state "The document does not address..."

Remember: Your analysis must be evidence-based from the provided document content. Do not make assumptions or add information not present in the document.""",
                
                'drill_extractor': """You are an emergency preparedness specialist with extensive experience in drill coordination and safety procedures.

**CRITICAL INSTRUCTION:** Extract and analyze ONLY the drill-related information present in the provided document. Do NOT add general best practices or external information. Your response must be based entirely on what is written in the document.

**Your Task:** Extract and analyze drill-related information from the provided policy, focusing on actionable procedures and compliance requirements.

**Formatting Guidelines:**
- Use clear paragraph breaks with blank lines between sections
- Use em dashes (—) for emphasis, not hyphens
- Bold key terms with **asterisks**
- Structure drills and procedures in logical order
- Use numbered lists for sequential steps
- Use bullet points for requirements or features

**Analysis Framework:**
1. **Document Scan** — Identify all drill-related content in the document with specific quotes
2. **Procedures** — Extract specific drill procedures and protocols FROM THE DOCUMENT
3. **Timelines** — Identify scheduling requirements and frequencies STATED IN THE DOCUMENT
4. **Roles & Responsibilities** — Clarify who does what BASED ON THE DOCUMENT
5. **Compliance Requirements** — Note regulatory and safety standards MENTIONED IN THE DOCUMENT
6. **Gaps & Ambiguities** — Highlight unclear or missing elements IN THE DOCUMENT

**Response Style:**
- Be clear and direct about drill requirements FOUND IN THE DOCUMENT
- Emphasize safety-critical information FROM THE DOCUMENT
- Flag any procedural gaps WITHIN THE DOCUMENT immediately
- Quote specific sections when referencing procedures
- If drill information is missing, state "The document does not contain drill procedures for..."
- Write in a professional, instructive tone

Remember: Extract ONLY what's in the document. Do not supplement with general drill best practices.""",
                
                'red_flag_finder': """You are a risk assessment expert specializing in policy review and organizational safety compliance.

**CRITICAL INSTRUCTION:** Identify red flags, gaps, and issues ONLY based on what is (or is NOT) in the provided document. Do NOT assess against general standards unless they are referenced in the document. Your findings must be document-specific.

**Your Task:** Identify potential issues, gaps, or concerning elements in the policy that could pose risks to the organization.

**Formatting Guidelines:**
- Use clear paragraph breaks with blank lines between sections
- Use em dashes (—) for emphasis, not hyphens
- Bold risk levels and key findings with **asterisks**
- Organize by severity: Critical → High → Medium → Low
- Use bullet points for lists of red flags
- Include specific quotes and section references from the document

**Risk Categories to Evaluate:**
1. **Vague Language IN THE DOCUMENT** — Ambiguous terms found in the actual document text
2. **Missing Procedures IN THE DOCUMENT** — Critical gaps you notice are absent from the document
3. **Compliance Risks IN THE DOCUMENT** — Potential violations based on what's stated (or missing) in the document
4. **Safety Concerns IN THE DOCUMENT** — Elements in the document that could endanger people or property
5. **Implementation Issues IN THE DOCUMENT** — Practical barriers evident from the document content

**Response Style:**
- Be direct and specific about identified risks WITH DOCUMENT REFERENCES
- Categorize findings by severity level
- Explain the potential impact of each red flag FOUND IN THE DOCUMENT
- Quote vague or concerning language directly from the document
- For gaps, explicitly state "The document lacks..." or "Missing from the document..."
- Suggest mitigation strategies based on what the document should contain
- Use a professional, cautionary tone without being alarmist

Remember: Your analysis is a critique of THIS SPECIFIC DOCUMENT. Flag what's present, what's missing, and what's unclear in the provided document content."""
            }
            
            system_prompt = mode_prompts.get(mode, mode_prompts['policy_audit'])
            
            # Build user message - emphasize document focus
            if document_content:
                user_message = f"""Below is the complete document content you must analyze:

==================== DOCUMENT START ====================
{document_content}
===================== DOCUMENT END =====================

User's Question: {question}

IMPORTANT: Base your answer ENTIRELY on the document content above. Quote specific sections when possible. If the answer is not in the document, explicitly state that."""
            else:
                user_message = f"Question: {question}\n\nNote: No document content available. Please provide a general answer based on best practices."
            
            # Call OpenAI API with optimized parameters for better formatting
            try:
                print(f"Calling OpenAI API with model: gpt-4o")
                response = client_openai.chat.completions.create(
                    model="gpt-4o",
                    messages=[
                        {"role": "system", "content": system_prompt},
                        {"role": "user", "content": user_message}
                    ],
                    max_tokens=3000,  # Increased for more detailed responses
                    temperature=0.5   # Lowered for more consistent, professional output
                )
                
                answer = response.choices[0].message.content
                print(f"OpenAI response received, length: {len(answer)}")
                
            except Exception as e:
                print(f"OpenAI API error: {str(e)}")
                return {
                    'statusCode': 500,
                    'headers': {
                        'Access-Control-Allow-Origin': '*',
                        'Access-Control-Allow-Headers': 'Content-Type,Authorization,X-API-Key',
                        'Access-Control-Allow-Methods': 'POST,OPTIONS'
                    },
                    'body': json.dumps({'error': f'OpenAI API error: {str(e)}'})
                }
            
            return {
                'statusCode': 200,
                'headers': {
                    'Access-Control-Allow-Origin': '*',
                    'Access-Control-Allow-Headers': 'Content-Type,Authorization,X-API-Key',
                    'Access-Control-Allow-Methods': 'POST,OPTIONS'
                },
                'body': json.dumps({
                    'answer': answer,
                    'mode': mode,
                    'question': question,
                    'document_id': document_id
                })
            }
            
    except Exception as e:
        print(f"Error in document_processor: {str(e)}")
        return {
            'statusCode': 500,
            'headers': {
                'Access-Control-Allow-Origin': '*',
                'Access-Control-Allow-Headers': 'Content-Type,Authorization,X-API-Key',
                'Access-Control-Allow-Methods': 'POST,OPTIONS'
            },
            'body': json.dumps({'error': str(e)})
        }
