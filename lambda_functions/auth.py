import os
import json
import boto3
from datetime import datetime
from decimal import Decimal

# Helper class to convert Decimal to float for JSON serialization
class DecimalEncoder(json.JSONEncoder):
    def default(self, obj):
        if isinstance(obj, Decimal):
            return float(obj)
        return super(DecimalEncoder, self).default(obj)

def lambda_handler(event, context):
    """
    Authentication Lambda - handles login, signup, token refresh
    """
    cognito_client = boto3.client('cognito-idp')
    dynamodb = boto3.resource('dynamodb')
    
    # Get user pool ID from environment
    user_pool_id = os.environ.get('COGNITO_USER_POOL_ID')
    client_id = os.environ.get('COGNITO_CLIENT_ID')
    
    # Parse request
    body = json.loads(event['body'])
    action = body.get('action')  # 'signup', 'login', 'refresh', 'logout'
    
    try:
        if action == 'signup':
            # Register new user
            email = body.get('email')
            password = body.get('password')
            name = body.get('name', 'User')
            
            response = cognito_client.sign_up(
                ClientId=client_id,
                Username=email,
                Password=password,
                UserAttributes=[
                    {'Name': 'email', 'Value': email},
                    {'Name': 'name', 'Value': name}
                ]
            )
            
            # Create user profile in DynamoDB
            users_table = dynamodb.Table('ThreatalyticsUsers')
            users_table.put_item(Item={
                'user_id': response['UserSub'],
                'email': email,
                'name': name,
                'plan': 'free',
                'created_at': datetime.utcnow().isoformat(),
                'conversation_count': 0
            })

            # Auto-confirm the user's email if auto_confirm flag is set
            if body.get('auto_confirm', False):
                cognito_client.admin_confirm_sign_up(
                    UserPoolId=user_pool_id,
                    Username=email
                )
            
            return {
                'statusCode': 200,
                'headers': {
                    'Access-Control-Allow-Origin': '*',
                    'Access-Control-Allow-Credentials': True
                },
                'body': json.dumps({
                    'message': 'Please check your email for the verification code',
                    'email': email,
                    'userSub': response['UserSub']
                })
            }

        elif action == 'verify_code':
            # Verify the confirmation code
            email = body.get('email')
            code = body.get('code')
            
            try:
                response = cognito_client.confirm_sign_up(
                    ClientId=client_id,
                    Username=email,
                    ConfirmationCode=code
                )
                
                return {
                    'statusCode': 200,
                    'headers': {
                        'Access-Control-Allow-Origin': '*',
                        'Access-Control-Allow-Credentials': True
                    },
                    'body': json.dumps({
                        'message': 'Email verified successfully',
                        'status': 'CONFIRMED'
                    })
                }
            except cognito_client.exceptions.CodeMismatchException:
                return {
                    'statusCode': 400,
                    'headers': {
                        'Access-Control-Allow-Origin': '*',
                        'Access-Control-Allow-Credentials': True
                    },
                    'body': json.dumps({
                        'error': 'Invalid verification code'
                    })
                }
            except Exception as e:
                return {
                    'statusCode': 400,
                    'headers': {
                        'Access-Control-Allow-Origin': '*',
                        'Access-Control-Allow-Credentials': True
                    },
                    'body': json.dumps({
                        'error': str(e)
                    })
                }
                
            return {
                'statusCode': 200,
                'headers': {
                    'Access-Control-Allow-Origin': '*',
                    'Access-Control-Allow-Headers': 'Content-Type,X-Api-Key',
                    'Access-Control-Allow-Methods': 'POST,OPTIONS'
                },
                'body': json.dumps({
                    'message': 'User registered successfully. Please verify your email.',
                    'user_sub': response['UserSub']
                })
            }
            
        elif action == 'login':
            # Authenticate user
            email = body.get('email')
            password = body.get('password')
            
            response = cognito_client.initiate_auth(
                ClientId=client_id,
                AuthFlow='USER_PASSWORD_AUTH',
                AuthParameters={
                    'USERNAME': email,
                    'PASSWORD': password
                }
            )
            
            # Get user details
            access_token = response['AuthenticationResult']['AccessToken']
            user_info = cognito_client.get_user(AccessToken=access_token)
            
            user_sub = user_info['Username']
            
            # Get user profile from DynamoDB
            users_table = dynamodb.Table('ThreatalyticsUsers')
            user_profile = users_table.get_item(Key={'user_id': user_sub})
            
            return {
                'statusCode': 200,
                'headers': {
                    'Access-Control-Allow-Origin': '*',
                    'Access-Control-Allow-Headers': 'Content-Type,X-Api-Key',
                    'Access-Control-Allow-Methods': 'POST,OPTIONS'
                },
                'body': json.dumps({
                    'message': 'Login successful',
                    'tokens': {
                        'access_token': response['AuthenticationResult']['AccessToken'],
                        'id_token': response['AuthenticationResult']['IdToken'],
                        'refresh_token': response['AuthenticationResult']['RefreshToken']
                    },
                    'user': user_profile.get('Item', {})
                }, cls=DecimalEncoder)
            }
            
        elif action == 'refresh':
            # Refresh access token
            refresh_token = body.get('refresh_token')
            
            response = cognito_client.initiate_auth(
                ClientId=client_id,
                AuthFlow='REFRESH_TOKEN_AUTH',
                AuthParameters={
                    'REFRESH_TOKEN': refresh_token
                }
            )
            
            return {
                'statusCode': 200,
                'headers': {
                    'Access-Control-Allow-Origin': '*',
                    'Access-Control-Allow-Headers': 'Content-Type,X-Api-Key',
                    'Access-Control-Allow-Methods': 'POST,OPTIONS'
                },
                'body': json.dumps({
                    'tokens': {
                        'access_token': response['AuthenticationResult']['AccessToken'],
                        'id_token': response['AuthenticationResult']['IdToken']
                    }
                })
            }
            
        elif action == 'logout':
            # Sign out user
            access_token = body.get('access_token')
            
            cognito_client.global_sign_out(AccessToken=access_token)
            
            return {
                'statusCode': 200,
                'headers': {
                    'Access-Control-Allow-Origin': '*',
                    'Access-Control-Allow-Headers': 'Content-Type,X-Api-Key',
                    'Access-Control-Allow-Methods': 'POST,OPTIONS'
                },
                'body': json.dumps({'message': 'Logout successful'})
            }
            
        else:
            return {
                'statusCode': 400,
                'headers': {
                    'Access-Control-Allow-Origin': '*',
                    'Access-Control-Allow-Headers': 'Content-Type,X-Api-Key',
                    'Access-Control-Allow-Methods': 'POST,OPTIONS'
                },
                'body': json.dumps({'error': 'Invalid action'})
            }
            
    except cognito_client.exceptions.NotAuthorizedException:
        return {
            'statusCode': 401,
            'headers': {
                'Access-Control-Allow-Origin': '*',
                'Access-Control-Allow-Headers': 'Content-Type,X-Api-Key',
                'Access-Control-Allow-Methods': 'POST,OPTIONS'
            },
            'body': json.dumps({'error': 'Invalid credentials'})
        }
    except Exception as e:
        return {
            'statusCode': 500,
            'headers': {
                'Access-Control-Allow-Origin': '*',
                'Access-Control-Allow-Headers': 'Content-Type,X-Api-Key',
                'Access-Control-Allow-Methods': 'POST,OPTIONS'
            },
            'body': json.dumps({'error': str(e)})
        }
