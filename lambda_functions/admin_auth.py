import json
import os
import hashlib
import hmac
import base64
from datetime import datetime, timedelta

# Admin credentials (in production, store in AWS Secrets Manager)
ADMIN_CREDENTIALS = {
    'admin@threatalyticsai.com': {
        'password_hash': '240be518fabd2724ddb6f04eeb1da5967448d7e831c08c8fa822809f74c720a9',  # admin123
        'name': 'Admin User',
        'role': 'super_admin'
    },
    'support@threatalyticsai.com': {
        'password_hash': '5e884898da28047151d0e56f8dc6292773603d0d6aabbdd62a11ef721d1542d8',  # password
        'name': 'Support User',
        'role': 'support'
    }
}

# Simple JWT-like token generation (use proper JWT library in production)
SECRET_KEY = os.environ.get('ADMIN_SECRET_KEY', 'threatalytics-admin-secret-2025')

def generate_token(email, role):
    """Generate a simple authentication token"""
    expiry = (datetime.utcnow() + timedelta(hours=8)).isoformat()
    payload = f"{email}|{role}|{expiry}"
    signature = hmac.new(
        SECRET_KEY.encode(),
        payload.encode(),
        hashlib.sha256
    ).hexdigest()
    token = base64.b64encode(f"{payload}|{signature}".encode()).decode()
    return token

def verify_token(token):
    """Verify authentication token"""
    try:
        decoded = base64.b64decode(token).decode()
        parts = decoded.split('|')
        if len(parts) != 4:
            return None
        
        email, role, expiry, signature = parts
        
        # Check expiry
        if datetime.fromisoformat(expiry) < datetime.utcnow():
            return None
        
        # Verify signature
        payload = f"{email}|{role}|{expiry}"
        expected_sig = hmac.new(
            SECRET_KEY.encode(),
            payload.encode(),
            hashlib.sha256
        ).hexdigest()
        
        if signature != expected_sig:
            return None
        
        return {'email': email, 'role': role}
    except Exception as e:
        print(f"Token verification error: {e}")
        return None

def hash_password(password):
    """Hash password using SHA256"""
    return hashlib.sha256(password.encode()).hexdigest()

def lambda_handler(event, context):
    """
    Admin Authentication Lambda
    Actions: login, verify_token, logout
    """
    
    # CORS headers
    headers = {
        'Access-Control-Allow-Origin': '*',
        'Access-Control-Allow-Methods': 'POST,OPTIONS',
        'Access-Control-Allow-Headers': 'Content-Type,Authorization',
        'Access-Control-Allow-Credentials': 'true'
    }
    
    # Handle OPTIONS
    if event.get('httpMethod') == 'OPTIONS':
        return {
            'statusCode': 200,
            'headers': headers,
            'body': json.dumps({'message': 'CORS OK'})
        }
    
    try:
        body = json.loads(event.get('body', '{}'))
        action = body.get('action')
        
        if action == 'login':
            email = body.get('email', '').lower()
            password = body.get('password', '')
            
            # Verify credentials
            user = ADMIN_CREDENTIALS.get(email)
            if not user:
                return {
                    'statusCode': 401,
                    'headers': headers,
                    'body': json.dumps({'error': 'Invalid credentials'})
                }
            
            password_hash = hash_password(password)
            if password_hash != user['password_hash']:
                return {
                    'statusCode': 401,
                    'headers': headers,
                    'body': json.dumps({'error': 'Invalid credentials'})
                }
            
            # Generate token
            token = generate_token(email, user['role'])
            
            return {
                'statusCode': 200,
                'headers': headers,
                'body': json.dumps({
                    'message': 'Login successful',
                    'token': token,
                    'user': {
                        'email': email,
                        'name': user['name'],
                        'role': user['role']
                    }
                })
            }
        
        elif action == 'verify_token':
            token = body.get('token')
            if not token:
                # Check Authorization header
                auth_header = event.get('headers', {}).get('Authorization', '')
                if auth_header.startswith('Bearer '):
                    token = auth_header[7:]
            
            user_data = verify_token(token)
            if not user_data:
                return {
                    'statusCode': 401,
                    'headers': headers,
                    'body': json.dumps({'error': 'Invalid or expired token'})
                }
            
            # Get user details
            user = ADMIN_CREDENTIALS.get(user_data['email'])
            
            return {
                'statusCode': 200,
                'headers': headers,
                'body': json.dumps({
                    'valid': True,
                    'user': {
                        'email': user_data['email'],
                        'name': user['name'],
                        'role': user_data['role']
                    }
                })
            }
        
        elif action == 'logout':
            # In a real system, invalidate token in database
            return {
                'statusCode': 200,
                'headers': headers,
                'body': json.dumps({'message': 'Logged out successfully'})
            }
        
        else:
            return {
                'statusCode': 400,
                'headers': headers,
                'body': json.dumps({'error': 'Invalid action'})
            }
    
    except Exception as e:
        return {
            'statusCode': 500,
            'headers': headers,
            'body': json.dumps({'error': str(e)})
        }
