import json

# Define approved and restricted keywords
APPROVED_KEYWORDS = [
    "threat grid", "trs graph", "escalation chart", "behavior map",
    "flowchart", "team capability grid", "simulation visual",
    "threat analysis", "security diagram", "risk matrix"
]

RESTRICTED_KEYWORDS = [
    "poster", "cartoon", "character", "illustration", "emotional",
    "mascot", "stylized", "infographic", "logo", "drawing",
    "cute", "funny", "playful", "artistic"
]

def lambda_handler(event, context):
    """
    Image Validation Lambda - validates image generation requests
    Denies requests with restricted terms or without approved patterns
    Endpoint: POST /image/validate
    """
    try:
        body = json.loads(event.get('body', '{}'))
        request_text = body.get('description', '').lower()
        
        if not request_text:
            return {
                'statusCode': 400,
                'headers': {
                    'Access-Control-Allow-Origin': '*',
                    'Access-Control-Allow-Headers': 'Content-Type,Authorization,X-API-Key',
                    'Access-Control-Allow-Methods': 'POST,OPTIONS'
                },
                'body': json.dumps({
                    'error': 'Description is required'
                })
            }
        
        # Check for restricted keywords
        for keyword in RESTRICTED_KEYWORDS:
            if keyword in request_text:
                return {
                    'statusCode': 400,
                    'headers': {
                        'Access-Control-Allow-Origin': '*',
                        'Access-Control-Allow-Headers': 'Content-Type,Authorization,X-API-Key',
                        'Access-Control-Allow-Methods': 'POST,OPTIONS'
                    },
                    'body': json.dumps({
                        'error': f"Request denied. The term '{keyword}' is not supported under the visual policy.",
                        'restricted_term': keyword
                    })
                }
        
        # Check for at least one approved keyword
        approved_found = any(keyword in request_text for keyword in APPROVED_KEYWORDS)
        
        if not approved_found:
            return {
                'statusCode': 400,
                'headers': {
                    'Access-Control-Allow-Origin': '*',
                    'Access-Control-Allow-Headers': 'Content-Type,Authorization,X-API-Key',
                    'Access-Control-Allow-Methods': 'POST,OPTIONS'
                },
                'body': json.dumps({
                    'error': 'Request denied. Visuals must be related to operational casework or training.',
                    'suggestion': f'Try including one of these terms: {", ".join(APPROVED_KEYWORDS[:5])}'
                })
            }
        
        # Request is valid
        return {
            'statusCode': 200,
            'headers': {
                'Access-Control-Allow-Origin': '*',
                'Access-Control-Allow-Headers': 'Content-Type,Authorization,X-API-Key',
                'Access-Control-Allow-Methods': 'POST,OPTIONS'
            },
            'body': json.dumps({
                'message': 'Image request approved. Proceed to generation module.',
                'approved': True
            })
        }
        
    except Exception as e:
        return {
            'statusCode': 500,
            'headers': {
                'Access-Control-Allow-Origin': '*',
                'Access-Control-Allow-Headers': 'Content-Type,Authorization,X-API-Key',
                'Access-Control-Allow-Methods': 'POST,OPTIONS'
            },
            'body': json.dumps({
                'error': f'Internal error: {str(e)}'
            })
        }
