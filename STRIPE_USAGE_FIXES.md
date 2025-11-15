# Stripe & Usage Tracking Fixes - Implementation Summary

## Issues Identified

### 1. All Plans Showing $29 Plan Only
**Root Cause**: Backend was ignoring the `price_id` sent from frontend and using environment variable only.

**Problem Flow**:
- Frontend sends: `{plan_id: 'professional', price_id: 'price_1SSxgQGJlATAbbMWG2dmfdW2'}`
- Backend receives: `body.get('plan', 'starter')` - looking for 'plan' instead of 'plan_id'
- Backend uses: `STRIPE_PRICES[plan]` - only env var, ignoring request price_id
- Result: All plans use the first available env var (Starter - $29)

### 2. Subscription Status Not Stored Properly
**Root Cause**: Missing `checkout.session.completed` webhook handler.

**Problem Flow**:
- User completes payment on Stripe
- Stripe sends `checkout.session.completed` webhook
- Webhook handler doesn't listen for this event
- User's plan in database never gets updated
- User stays on Free plan even after payment

### 3. Usage Showing 100/100
**Root Cause**: Default fallback values when API fails or isn't deployed.

**Problem Flow**:
- Frontend calls `/usage` endpoint
- If endpoint fails (404/500), returns default: `{current: 0, limit: 100, remaining: 100}`
- Display might show this as "100/100" depending on state

## Fixes Implemented

### Fix 1: Update subscription_manager.py to Accept price_id from Request

**File**: `lambda_functions/subscription_manager.py` (Lines 133-193)

```python
if method == 'POST' and path.endswith('/subscription/create'):
    body = json.loads(event.get('body', '{}'))
    # Support both plan and plan_id (frontend sends plan_id)
    plan_id = body.get('plan_id') or body.get('plan', 'starter')
    # Use price_id from request if provided, otherwise fallback to env var
    price_id = body.get('price_id')
    
    # Log for debugging
    print(f"Creating checkout session for plan: {plan_id}, price_id: {price_id}")
    
    # Validate price_id
    if not price_id:
        if plan_id in STRIPE_PRICES:
            price_id = STRIPE_PRICES[plan_id]
        else:
            return {
                'statusCode': 400,
                'headers': headers,
                'body': json.dumps({'error': f'Invalid plan: {plan_id}'})
            }
    
    # Validate it's a real Stripe price ID
    if not price_id.startswith('price_'):
        return {
            'statusCode': 400,
            'headers': headers,
            'body': json.dumps({'error': 'Invalid Stripe price ID'})
        }

    # ... rest of code uses price_id instead of STRIPE_PRICES[plan]
    
    checkout_session = stripe.checkout.Session.create(
        customer=stripe_customer_id,
        payment_method_types=['card'],
        line_items=[{
            'price': price_id,  # <-- Now using the correct price_id
            'quantity': 1,
        }],
        mode='subscription',
        success_url='https://d1xoad2p9303mu.cloudfront.net/?session_id={CHECKOUT_SESSION_ID}',
        cancel_url='https://d1xoad2p9303mu.cloudfront.net/',
        metadata={
            'user_id': user_id,
            'plan': plan_id
        }
    )
```

**Changes**:
- Accept `plan_id` from request body
- Accept `price_id` from request body
- Validate price_id is a real Stripe ID (starts with `price_`)
- Use the request `price_id` instead of env var
- Add logging for debugging

### Fix 2: Add checkout.session.completed Handler

**File**: `lambda_functions/stripe_webhook.py` (Lines 50-95)

```python
def handle_checkout_completed(session):
    """Handle successful checkout session completion"""
    try:
        customer_id = session.get('customer')
        metadata = session.get('metadata', {})
        plan = metadata.get('plan', 'starter')
        user_id = metadata.get('user_id')
        
        logger.info(f"Checkout completed - customer: {customer_id}, user: {user_id}, plan: {plan}")
        
        dynamodb = boto3.resource('dynamodb')
        users_table = dynamodb.Table('ThreatalyticsUsers')
        
        # Update user's plan in ThreatalyticsUsers table
        if user_id:
            users_table.update_item(
                Key={'user_id': user_id},
                UpdateExpression='SET plan = :plan, subscription_status = :status, updated_at = :updated',
                ExpressionAttributeValues={
                    ':plan': plan,
                    ':status': 'active',
                    ':updated': datetime.utcnow().isoformat()
                }
            )
            logger.info(f"Updated user {user_id} to plan {plan}")
        
    except Exception as e:
        logger.error(f"Error handling checkout completion: {e}")
        raise
```

**Updated Event Handler** (Lines 170-185):

```python
event_type = event_stripe.get('type')
event_data = event_stripe.get('data', {}).get('object', {})

if event_type == 'checkout.session.completed':
    handle_checkout_completed(event_data)  # <-- NEW HANDLER
elif event_type == 'customer.subscription.created':
    handle_subscription_created(event_data)
elif event_type == 'customer.subscription.updated':
    handle_subscription_updated(event_data)
# ... rest of handlers
```

**Changes**:
- Added `handle_checkout_completed()` function
- Extracts `plan` and `user_id` from session metadata
- Updates user's plan in `ThreatalyticsUsers` table
- Sets `subscription_status` to 'active'
- Adds event handler to lambda_handler

### Fix 3: Response Format Consistency

**File**: `lambda_functions/subscription_manager.py` (Line 183)

Already fixed in previous session:
```python
return {
    'statusCode': 200,
    'headers': headers,
    'body': json.dumps({
        'url': checkout_session.url,  # Changed from 'checkoutUrl'
        'sessionId': checkout_session.id
    })
}
```

## Deployment Instructions

### 1. Deploy subscriptionManager Lambda
```powershell
cd e:\SONOMA\Aws-Threatalytics
serverless deploy function -f subscriptionManager
```

### 2. Deploy stripeWebhook Lambda
```powershell
serverless deploy function -f stripeWebhook
```

### 3. Deploy usageTracker Lambda (if not already deployed)
```powershell
serverless deploy function -f usageTracker
```

### 4. Verify Stripe Webhook Configuration

Go to Stripe Dashboard → Developers → Webhooks and ensure these events are enabled:
- `checkout.session.completed` ✅ (NEW - CRITICAL)
- `customer.subscription.created` ✅
- `customer.subscription.updated` ✅
- `customer.subscription.deleted` ✅
- `invoice.payment_succeeded` ✅
- `invoice.payment_failed` ✅

## Testing Checklist

### Test Plan Selection
1. Login to application
2. Click "Upgrade Plan" button
3. Select **Starter ($29)** → Verify Stripe shows $29
4. Cancel and select **Professional ($99)** → Verify Stripe shows $99
5. Cancel and select **Enterprise ($499)** → Verify Stripe shows $499

### Test Subscription Status
1. Complete a payment for **Professional** plan
2. After redirect back to dashboard:
   - Check sidebar shows "Professional Plan"
   - Usage shows "X / 5,000 requests"
   - Subscription status badge shows "Active"

### Test Usage Tracking
1. Make an API call (Analyze, Redact, etc.)
2. Check usage counter updates immediately
3. Verify it shows "Used / Limit" format (e.g., "5 / 5,000")
4. Not "100/100" or "0/100"

### Test Database Updates

**Check ThreatalyticsUsers table**:
```powershell
aws dynamodb get-item --table-name ThreatalyticsUsers --key '{\"user_id\": {\"S\": \"YOUR_USER_ID\"}}'
```

Should show:
```json
{
  "user_id": "user_xxx",
  "email": "user@example.com",
  "plan": "professional",
  "subscription_status": "active",
  "stripe_customer_id": "cus_xxx",
  "updated_at": "2025-11-15T..."
}
```

## Environment Variables Required

### Backend (.env in root)
```env
STRIPE_SECRET_KEY=sk_live_xxx
STRIPE_WEBHOOK_SECRET=whsec_xxx
STRIPE_PRICE_ID_STARTER=price_1SSxgQGJlATAbbMWpPk98gTm
STRIPE_PRICE_ID_PROFESSIONAL=price_1SSxgQGJlATAbbMWG2dmfdW2
STRIPE_PRICE_ID_ENTERPRISE=price_1SSxgRGJlATAbbMWpLYlwFKK
```

### Frontend (reactapp-main/.env)
```env
VITE_STRIPE_PRICE_ID_STARTER=price_1SSxgQGJlATAbbMWpPk98gTm
VITE_STRIPE_PRICE_ID_PROFESSIONAL=price_1SSxgQGJlATAbbMWG2dmfdW2
VITE_STRIPE_PRICE_ID_ENTERPRISE=price_1SSxgRGJlATAbbMWpLYlwFKK
```

## API Response Examples

### POST /subscription/create (Starter Plan)
**Request**:
```json
{
  "plan_id": "starter",
  "price_id": "price_1SSxgQGJlATAbbMWpPk98gTm",
  "success_url": "https://d1xoad2p9303mu.cloudfront.net/?session_id={CHECKOUT_SESSION_ID}",
  "cancel_url": "https://d1xoad2p9303mu.cloudfront.net/"
}
```

**Response**:
```json
{
  "url": "https://checkout.stripe.com/c/pay/cs_test_xxx",
  "sessionId": "cs_test_xxx"
}
```

### POST /subscription/create (Professional Plan)
**Request**:
```json
{
  "plan_id": "professional",
  "price_id": "price_1SSxgQGJlATAbbMWG2dmfdW2",
  "success_url": "https://d1xoad2p9303mu.cloudfront.net/?session_id={CHECKOUT_SESSION_ID}",
  "cancel_url": "https://d1xoad2p9303mu.cloudfront.net/"
}
```

**Response**:
```json
{
  "url": "https://checkout.stripe.com/c/pay/cs_test_xxx",
  "sessionId": "cs_test_xxx"
}
```

### GET /usage
**Response** (Free Plan, No Usage):
```json
{
  "success": true,
  "usage": {
    "user_id": "user_xxx",
    "plan": "free",
    "current": 0,
    "limit": 100,
    "remaining": 100,
    "percentage": 0,
    "has_active_subscription": false
  }
}
```

**Response** (Professional Plan, Active):
```json
{
  "success": true,
  "usage": {
    "user_id": "user_xxx",
    "plan": "professional",
    "current": 45,
    "limit": 5000,
    "remaining": 4955,
    "percentage": 0.9,
    "has_active_subscription": true,
    "subscription": {
      "subscription_id": "sub_xxx",
      "plan": "professional",
      "status": "active",
      "start_date": "2025-11-15T..."
    }
  }
}
```

## Common Issues & Solutions

### Issue: Still showing $29 for all plans
**Solution**: 
1. Redeploy subscriptionManager Lambda
2. Clear browser cache and reload
3. Check browser console for price_id values
4. Verify .env has all 3 VITE_STRIPE_PRICE_ID_* variables

### Issue: Plan not updating after payment
**Solution**:
1. Check Stripe webhook is configured with `checkout.session.completed`
2. Redeploy stripeWebhook Lambda
3. Check CloudWatch logs for webhook handler
4. Verify user_id is in checkout session metadata

### Issue: Usage showing 100/100
**Solution**:
1. Check usageTracker Lambda is deployed
2. Test `/usage` endpoint with test_usage_api.ps1
3. Check CloudWatch logs for errors
4. Verify DynamoDB ThreatalyticsUsage table exists
5. Check authentication token is valid

## Files Modified

1. `lambda_functions/subscription_manager.py` - Accept price_id from request
2. `lambda_functions/stripe_webhook.py` - Add checkout.session.completed handler
3. `test_usage_api.ps1` - New testing script

## Next Steps After Deployment

1. Test all 3 pricing tiers (Starter, Professional, Enterprise)
2. Complete at least one test payment
3. Verify webhook updates database
4. Monitor CloudWatch logs for any errors
5. Test usage tracking increments properly
6. Verify usage displays correctly in UI
