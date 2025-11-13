# Stripe Integration & Usage Tracking - Complete Guide

## 🎯 Overview

This document describes the comprehensive Stripe payment and usage tracking integration across the Threatalytics React application.

## 📦 What's Been Integrated

### 1. **New Services**
- `usage-service.ts` - Track and monitor API usage
- `subscription-service.ts` - Handle Stripe subscriptions and payments

### 2. **New Components**
- `UpgradeModal.tsx` - Full-featured plan upgrade modal with all plans
- `UsageDisplay.tsx` - Real-time usage tracking display (compact & full versions)

### 3. **New Hook**
- `use-usage.ts` - Custom React hook for usage tracking across components

### 4. **Updated Pages**
- ✅ **Dashboard** - Added usage sidebar + upgrade modal
- ✅ **ClientAssistant** - Added usage display + tracking
- ✅ **ClientDashboard** - Added compact usage display
- ✅ **ChatInterface** - Added pre-request usage checking

## 🎨 Features

### Usage Tracking
- **Real-time monitoring** of API calls
- **Plan-based limits** (Free: 100, Starter: 500, Pro: 5000, Enterprise: Unlimited)
- **Visual progress bars** showing usage percentage
- **Automatic alerts** when approaching limit (>80%)
- **Request blocking** when limit reached
- **Usage history** tracking per endpoint

### Stripe Integration
- **4 pricing tiers**: Free, Starter ($29), Professional ($99), Enterprise ($499)
- **Secure checkout** via Stripe Checkout Sessions
- **Customer portal** for managing subscriptions
- **Subscription status** tracking
- **Auto-tracking** of API usage after successful requests

### User Experience
- **Pre-flight checks** before API calls
- **Upgrade prompts** when limits reached
- **Beautiful UI** with animations and transitions
- **Responsive design** for all screen sizes
- **Compact mode** for sidebars

## 🔧 Configuration

### Environment Variables (.env)
```bash
# Stripe Price IDs (replace with your actual Stripe price IDs)
VITE_STRIPE_PRICE_ID_STARTER=price_starter_monthly
VITE_STRIPE_PRICE_ID_PROFESSIONAL=price_professional_monthly
VITE_STRIPE_PRICE_ID_ENTERPRISE=price_enterprise_monthly
```

### API Endpoints Required

Backend endpoints that need to be implemented:

```typescript
// Usage Tracking
GET  /usage              - Get current usage stats
POST /usage/track        - Track API usage
GET  /usage/history      - Get usage history

// Subscription Management
GET  /subscription/status   - Get subscription status
POST /subscription/create   - Create checkout session
GET  /subscription/portal   - Get customer portal URL
POST /subscription/cancel   - Cancel subscription
```

## 📋 Usage Flow

### 1. **User Makes Request**
```typescript
// Automatic usage checking before request
const canProceed = await checkUsageBeforeRequest();
if (!canProceed) {
  // Shows upgrade modal automatically
  return;
}
```

### 2. **API Call Succeeds**
```typescript
// Automatic tracking after successful response
await trackApiUsage('analyze'); // or 'redact', 'report', 'drill'
```

### 3. **Usage Updates**
- Usage count increments
- Progress bars update
- Alerts shown if near limit
- Request blocked if over limit

## 🎨 Components Usage

### UpgradeModal
```tsx
<UpgradeModal
  isOpen={showUpgradeModal}
  onClose={() => {
    setShowUpgradeModal(false);
    refreshUsage();
  }}
  currentPlan={usage?.plan}
  usage={usage || undefined}
/>
```

### UsageDisplay
```tsx
// Full version (Dashboard sidebar)
<UsageDisplay 
  onUpgradeClick={() => setShowUpgradeModal(true)}
/>

// Compact version (Page header)
<UsageDisplay 
  onUpgradeClick={() => setShowUpgradeModal(true)}
  compact
/>
```

### useUsageTracking Hook
```tsx
const {
  usage,                      // Current usage data
  subscription,               // Subscription status
  loading,                    // Loading state
  canMakeRequest,             // Boolean: can user make requests
  checkUsageBeforeRequest,    // Function: check before API call
  trackApiUsage,              // Function: track after API call
  refreshUsage                // Function: reload usage data
} = useUsageTracking();
```

## 🔐 Backend Integration

### Lambda Function: usage_tracker.py

Already exists with these endpoints:
- `GET /usage` - Returns current usage stats
- `POST /usage/track` - Tracks API usage
- Plan limits defined in `PLAN_LIMITS` constant

### Lambda Function: subscription_manager.py

Already exists with these endpoints:
- `POST /subscription/create` - Creates Stripe checkout session
- `GET /subscription/status` - Returns subscription status
- `GET /subscription/portal` - Returns customer portal URL
- `POST /subscription/cancel` - Cancels subscription

## 📊 Data Flow

```
User Action → checkUsageBeforeRequest() → Allow/Block
                      ↓
              Make API Call
                      ↓
          Successful Response
                      ↓
         trackApiUsage(endpoint)
                      ↓
       Update DynamoDB Usage
                      ↓
         Refresh UI Display
```

## 🎯 Plan Details

| Plan | Price | API Calls/Month | Features |
|------|-------|-----------------|----------|
| **Free** | $0 | 100 | Basic threat analysis, Document redaction, Report generation |
| **Starter** | $29 | 500 | + Advanced analysis, Priority support, Custom reports |
| **Professional** | $99 | 5,000 | + Analytics, Team collaboration, API access |
| **Enterprise** | $499 | Unlimited | + All features, Dedicated support, Custom SLA |

## 🚀 Deployment Steps

### 1. Backend Setup
```bash
# Deploy usage tracker Lambda
serverless deploy function -f usageTracker

# Deploy subscription manager Lambda
serverless deploy function -f subscriptionManager
```

### 2. Stripe Configuration
1. Create products in Stripe Dashboard
2. Get price IDs for each plan
3. Update `.env` file with price IDs
4. Configure webhook endpoint

### 3. Frontend Build
```bash
cd reactapp-main
npm install
npm run build
```

### 4. Test Integration
- Sign up for free account
- Make API calls until limit
- Try to upgrade plan
- Verify Stripe checkout
- Check usage tracking

## 🧪 Testing

### Test Usage Limits
```typescript
// Simulate hitting limit
for (let i = 0; i < 101; i++) {
  await analyzeEndpoint.call();
}
// Should show upgrade prompt on 101st call
```

### Test Upgrade Flow
1. Click "Upgrade Plan"
2. Select plan (e.g., Starter)
3. Redirects to Stripe Checkout
4. Complete test payment
5. Redirects back to dashboard
6. Verify plan updated
7. Verify new limits applied

## 📱 UI Screenshots

### Usage Display (Full)
- Large card showing current usage
- Progress bar with color-coding
- Warning messages
- Upgrade button

### Usage Display (Compact)
- Small inline display
- Mini progress bar
- Upgrade button (if over limit)

### Upgrade Modal
- 4 plan cards side-by-side
- Feature comparison
- Current plan highlighted
- Stripe checkout integration

## 🔧 Troubleshooting

### Usage Not Tracking
- Check backend Lambda logs
- Verify DynamoDB table exists
- Check authentication token

### Stripe Checkout Fails
- Verify Stripe API keys
- Check price IDs match
- Review webhook configuration

### Usage Display Shows Wrong Data
- Refresh usage data manually
- Check browser localStorage
- Verify user authentication

## 📚 Files Modified/Created

### Created
- `src/lib/usage-service.ts`
- `src/lib/subscription-service.ts`
- `src/components/UpgradeModal.tsx`
- `src/components/UsageDisplay.tsx`
- `src/hooks/use-usage.ts`

### Modified
- `src/pages/Dashboard.tsx`
- `src/pages/ClientAssistant.tsx`
- `src/pages/ClientDashboard.tsx`
- `src/components/ChatInterface.tsx`
- `src/config/api.ts`
- `.env`

### Backend (Already Exists)
- `lambda_functions/usage_tracker.py`
- `lambda_functions/subscription_manager.py`

## 🎉 Success Metrics

After integration, you'll have:
- ✅ Real-time usage tracking
- ✅ Automatic limit enforcement
- ✅ Seamless Stripe integration
- ✅ Beautiful upgrade UI
- ✅ Comprehensive plan management
- ✅ Usage analytics

## 🔮 Future Enhancements

1. **Usage Analytics Dashboard**
   - Historical usage charts
   - Endpoint breakdown
   - Cost projections

2. **Team Management**
   - Multi-user subscriptions
   - Usage allocation
   - Team billing

3. **Custom Plans**
   - Enterprise custom pricing
   - Volume discounts
   - Add-on features

4. **Email Notifications**
   - Usage warnings (75%, 90%, 100%)
   - Payment receipts
   - Renewal reminders

## 🆘 Support

For issues or questions:
- Check Lambda logs in CloudWatch
- Review Stripe Dashboard events
- Check DynamoDB usage table
- Verify API Gateway logs
