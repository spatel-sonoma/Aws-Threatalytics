import os
import json
import boto3
import time
from datetime import datetime
from openai import OpenAI

# -------- CONFIG / DEFAULTS --------
# env vars we'll read:
# OPENAI_SECRET       -> secrets manager secret name (JSON with key "api_key" or "OPENAI_API_KEY")
# ANALYZE_MODEL       -> preferred model, default 'gpt-4o-mini'
# ANALYZE_MAX_TOKENS  -> integer, default 800
# ANALYZE_TEMP        -> float, default 0.3
# ALLOW_ALL_ORIGINS   -> 'true' to allow '*' for CORS (careful in prod)

DEFAULT_MODEL = os.environ.get('ANALYZE_MODEL', 'gpt-4o-mini')
DEFAULT_MAX_TOKENS = int(os.environ.get('ANALYZE_MAX_TOKENS', '800'))
DEFAULT_TEMP = float(os.environ.get('ANALYZE_TEMP', '0.3'))
ALLOW_ALL_ORIGINS = os.environ.get('ALLOW_ALL_ORIGINS', 'false').lower() == 'true'

# fallback models to try if primary fails (model access errors)
FALLBACK_MODELS = ['gpt-4o-mini', 'gpt-4o']  # order: prefer smaller faster first

# -------- helpers --------
def cors_headers(event=None):
    # safe default: restrict to known origin if provided, otherwise allow *
    if ALLOW_ALL_ORIGINS:
        origin = '*'
    else:
        origin = None
        if event and event.get('headers'):
            origin = event['headers'].get('origin') or event['headers'].get('Origin')
        # whitelist fallback(s)
        allowed = [
            'https://d1xoad2p9303mu.cloudfront.net',
            'https://d29k5fl5sa0elz.cloudfront.net',
            'http://localhost:8000',
            'http://127.0.0.1:8000'
        ]
        origin = origin if origin in allowed else allowed[0]
    return {
        'Access-Control-Allow-Origin': origin,
        'Access-Control-Allow-Headers': 'Content-Type,Authorization,X-API-Key,X-Amz-Date,X-Amz-Security-Token',
        'Access-Control-Allow-Methods': 'POST,OPTIONS',
        'Access-Control-Allow-Credentials': 'true'
    }

def json_body(event):
    try:
        return json.loads(event.get('body') or '{}')
    except Exception:
        return {}

def fetch_openai_key(secret_name):
    secrets_client = boto3.client('secretsmanager')
    secret_resp = secrets_client.get_secret_value(SecretId=secret_name)
    secret_str = secret_resp.get('SecretString', '') or ''
    # secret can be plain api key or JSON - try parse
    try:
        parsed = json.loads(secret_str)
        # accept common keys
        return parsed.get('api_key') or parsed.get('OPENAI_API_KEY') or parsed.get('openai_api_key')
    except Exception:
        # return plaintext secret if not JSON
        return secret_str or None

def make_response(status, body, event=None):
    return {
        'statusCode': status,
        'headers': cors_headers(event),
        'body': json.dumps(body)
    }

# -------- LAMBDA HANDLER --------
def lambda_handler(event, context):
    # quick preflight
    if event.get('httpMethod') == 'OPTIONS':
        return make_response(200, {'message': 'CORS preflight OK'}, event)

    # instrumentation timings
    start_all = time.time()
    try:
        # init clients
        s3_client = boto3.client('s3')
        dynamodb = boto3.resource('dynamodb')

        # parse input
        payload = json_body(event)
        input_text = payload.get('text', '').strip()
        if not input_text:
            return make_response(400, {'error': 'No input text provided'}, event)

        print("RAW PAYLOAD - length:", len(input_text))
        print("RAW PAYLOAD - preview:", input_text[:400])

        # fetch OpenAI key from Secrets Manager
        secret_name = os.environ.get('OPENAI_SECRET')
        if not secret_name:
            return make_response(500, {'error': 'OPENAI_SECRET environment variable not set'}, event)

        t0 = time.time()
        try:
            openai_key = fetch_openai_key(secret_name)
        except Exception as e:
            print("Secret fetch failed:", str(e))
            openai_key = None
        print("Secrets fetch time (s):", round(time.time() - t0, 3))

        if not openai_key:
            return make_response(500, {'error': 'Failed to obtain OpenAI API key from Secrets Manager'}, event)

        # init OpenAI client
        client_openai = OpenAI(api_key=openai_key)

        # model + params
        model = os.environ.get('ANALYZE_MODEL', DEFAULT_MODEL)
        max_tokens = int(os.environ.get('ANALYZE_MAX_TOKENS', DEFAULT_MAX_TOKENS))
        temperature = float(os.environ.get('ANALYZE_TEMP', DEFAULT_TEMP))

        system_prompt = payload.get('system_prompt') or "You are a helpful assistant."  # fallback if not provided

        # build messages
        messages = [
            {"role": "system", "content": system_prompt},
            {"role": "user", "content": input_text}
        ]

        # call OpenAI - measure time and handle model permission errors gracefully
        t_call_start = time.time()
        try_models = [model] + [m for m in FALLBACK_MODELS if m != model]
        last_exception = None
        response_text = None

        for try_model in try_models:
            try:
                print(f"Calling OpenAI model={try_model} max_tokens={max_tokens} temp={temperature}")
                resp = client_openai.chat.completions.create(
                    model=try_model,
                    messages=messages,
                    max_tokens=max_tokens,
                    temperature=temperature
                )
                # try to extract text robustly
                # new client shape used in earlier code: resp.choices[0].message.content
                try:
                    response_text = resp.choices[0].message.content
                except Exception:
                    # fallback shapes
                    try:
                        response_text = resp.choices[0].text
                    except Exception:
                        response_text = None

                # log timing
                print("OpenAI call duration (s):", round(time.time() - t_call_start, 3))
                last_exception = None
                break
            except Exception as e:
                last_exception = e
                msg = str(e)
                print(f"OpenAI error for model {try_model}:", msg)
                # If model access issue (403 / model_not_found) try next fallback
                if 'model_not_found' in msg or 'does not have access' in msg or '403' in msg:
                    print("Model access/permissions problem - trying fallback model if available")
                    continue
                # for rate limit or other transient errors we might retry once
                if 'rate limit' in msg.lower() or 'timeout' in msg.lower():
                    print("Transient error - retrying once after short sleep")
                    time.sleep(1)
                    continue
                # otherwise break and surface the error
                break

        # if still no response_text, return error
        if not response_text:
            err_msg = f"OpenAI failed: {str(last_exception) if last_exception else 'unknown'}"
            print(err_msg)
            return make_response(500, {'error': f'OpenAI API error: {err_msg}'}, event)

        # success - compose logs (try to read usage safely)
        usage_info = {}
        try:
            usage_info = {
                'total_tokens': getattr(resp.usage, 'total_tokens', None),
                'prompt_tokens': getattr(resp.usage, 'prompt_tokens', None),
                'completion_tokens': getattr(resp.usage, 'completion_tokens', None)
            }
        except Exception:
            usage_info = {}

        # write minimal log to s3 (best-effort, don't fail the response if S3 errors)
        try:
            s3_bucket = os.environ.get('LOG_BUCKET')  # optional env var
            if s3_bucket:
                s3_client.put_object(
                    Bucket=s3_bucket,
                    Key=f"analyze-logs/{datetime.utcnow().strftime('%Y/%m/%d')}/{context.aws_request_id}.json",
                    Body=json.dumps({
                        'timestamp': datetime.utcnow().isoformat(),
                        'input_length': len(input_text),
                        'model': try_model,
                        'usage': usage_info
                    }),
                    ContentType='application/json'
                )
        except Exception as e:
            print("S3 logging failed (non-fatal):", str(e))

        total_time = round(time.time() - start_all, 3)
        print("Total handler time (s):", total_time)

        return make_response(200, {'analysis': response_text, 'usage': usage_info}, event)

    except Exception as e:
        print("Unhandled exception:", str(e))
        try:
            # try to log error to s3 (best effort)
            s3_client = boto3.client('s3')
            s3_bucket = os.environ.get('LOG_BUCKET')
            if s3_bucket:
                s3_client.put_object(
                    Bucket=s3_bucket,
                    Key=f"analyze-errors/{datetime.utcnow().strftime('%Y/%m/%d')}/{context.aws_request_id}.json",
                    Body=json.dumps({'error': str(e), 'event': event}),
                    ContentType='application/json'
                )
        except Exception:
            pass
        return make_response(500, {'error': 'Internal server error', 'detail': str(e)}, event)