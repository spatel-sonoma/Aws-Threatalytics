# Usage Tracking Integration Guide

## Overview

This guide covers usage tracking integration across:
1. **reactapp-main** - Main Threatalytics AI application
2. **theme-keeper-login** - Admin dashboard for monitoring

## Backend Setup (Already Complete)

### Lambda Function: usage_tracker.py

**Endpoints:**
- `GET /usage` - Get current user's usage stats
- `POST /usage/track` - Track API call
- `GET /usage/check` - Check if user can make request

**Response Format:**
```json
{
  "success": true,
  "usage": {
    "user_id": "user123",
    "plan": "free",
    "current": 42,
    "limit": 100,
    "remaining": 58,
    "percentage": 42,
    "has_active_subscription": false
  }
}
```

### Fixed Response Structure

Updated to include `success` flag for consistency:
```python
return {
    'statusCode': 200,
    'headers': headers,
    'body': json.dumps({
        'success': True,
        'usage': usage_data
    }, cls=DecimalEncoder)
}
```

## Frontend Integration

### 1. Main App (reactapp-main)

#### Already Integrated Files:
- ✅ `src/lib/usage-service.ts` - Usage API client
- ✅ `src/hooks/use-usage.ts` - React hook for usage tracking
- ✅ `src/components/UsageDisplay.tsx` - Usage UI component
- ✅ `src/pages/Dashboard.tsx` - Integrated with chat
- ✅ `src/pages/ClientAssistant.tsx` - Document Q&A tracking
- ✅ `src/pages/ClientDashboard.tsx` - Activity log tracking

#### Usage Flow:
1. User loads page → `useUsageTracking()` loads usage data
2. User attempts API call → `checkUsageBeforeRequest()` validates
3. If allowed → Make API call
4. On success → `trackApiUsage()` increments counter
5. UI updates → Shows remaining calls

#### Example Usage:
```typescript
const { usage, checkUsageBeforeRequest, trackApiUsage } = useUsageTracking();

const handleAnalyze = async () => {
  // Check before request
  const canProceed = await checkUsageBeforeRequest();
  if (!canProceed) return; // Shows upgrade modal
  
  // Make API call
  const response = await fetch('/analyze', { ... });
  
  // Track usage after success
  await trackApiUsage('analyze');
};
```

### 2. Admin Dashboard (theme-keeper-login)

#### Files to Create/Update:

**Create: `src/lib/usage-api-client.ts`**
```typescript
const API_BASE = 'https://authapi.threatalyticsai.com';

export interface UserUsageStats {
  user_id: string;
  plan: string;
  current: number;
  limit: number | string;
  remaining: number | string;
  percentage: number;
}

export class UsageApiClient {
  private getAuthHeaders(): HeadersInit {
    return {
      'Content-Type': 'application/json',
      'X-Admin-Secret': 'threatalytics-admin-secret-2025',
    };
  }

  async getUserUsage(userId: string): Promise<UserUsageStats> {
    const response = await fetch(`${API_BASE}/admin/users/${userId}/usage`, {
      headers: this.getAuthHeaders(),
    });

    if (!response.ok) {
      throw new Error('Failed to fetch user usage');
    }

    const data = await response.json();
    return data.usage;
  }

  async getAllUsageStats(): Promise<UserUsageStats[]> {
    const response = await fetch(`${API_BASE}/admin/usage/all`, {
      headers: this.getAuthHeaders(),
    });

    if (!response.ok) {
      throw new Error('Failed to fetch all usage stats');
    }

    const data = await response.json();
    return data.users || [];
  }

  async resetUserUsage(userId: string): Promise<boolean> {
    const response = await fetch(`${API_BASE}/admin/users/${userId}/usage/reset`, {
      method: 'POST',
      headers: this.getAuthHeaders(),
    });

    return response.ok;
  }
}

export const usageApiClient = new UsageApiClient();
```

**Update: `src/components/dashboard/UsageAnalytics.tsx`**
Add real-time usage tracking visualization.

## Deployment Checklist

### Backend
- [x] usage_tracker.py returns success flag
- [x] Proper CORS headers configured
- [ ] Deploy to AWS: `serverless deploy function -f usageTracker`
- [ ] Verify endpoints are live
- [ ] Test with Postman/curl

### Frontend (reactapp-main)
- [x] Usage service configured
- [x] useUsageTracking hook integrated
- [x] UsageDisplay component shows stats
- [x] All pages track usage
- [x] Upgrade modal triggers on limit
- [ ] Test complete user flow
- [ ] Verify tracking increments correctly

### Admin Dashboard (theme-keeper-login)
- [ ] Create usage-api-client.ts
- [ ] Add UsageAnalytics component
- [ ] Integrate into Dashboard page
- [ ] Test admin can view all user usage
- [ ] Add usage reset functionality

## Testing

### 1. Test User Usage Flow
```bash
# Login as test user
# Make 5 API calls
# Check usage shows 5/100
# Make 95 more calls
# Verify 100/100 limit reached
# Verify upgrade modal appears
# Verify new calls blocked
```

### 2. Test Admin Dashboard
```bash
# Login as admin
# View all user usage stats
# Sort by highest usage
# Filter by plan type
# Test usage reset for specific user
```

### 3. Test API Endpoints
```bash
# Get usage
curl -X GET https://authapi.threatalyticsai.com/usage \
  -H "Authorization: Bearer YOUR_TOKEN"

# Track usage
curl -X POST https://authapi.threatalyticsai.com/usage/track \
  -H "Authorization: Bearer YOUR_TOKEN" \
  -H "Content-Type: application/json" \
  -d '{"endpoint": "analyze"}'

# Check limit
curl -X GET https://authapi.threatalyticsai.com/usage/check \
  -H "Authorization: Bearer YOUR_TOKEN"
```

## Environment Variables

### reactapp-main/.env
```env
VITE_AUTH_BASE_URL=https://authapi.threatalyticsai.com
```

### Root .env (for serverless)
```env
USERS_TABLE=ThreatalyticsUsers
USAGE_TABLE=ThreatalyticsUsage
SUBSCRIPTIONS_TABLE=ThreatalyticsSubscriptions
```

## DynamoDB Tables

### ThreatalyticsUsage
- **Partition Key**: `user_id` (String)
- **Sort Key**: `timestamp` (String)
- **Attributes**: `endpoint`, `usage`

### ThreatalyticsUsers
- **Partition Key**: `user_id` (String)
- **Attributes**: `email`, `plan`, `created_at`

### ThreatalyticsSubscriptions
- **Partition Key**: `user_id` (String)
- **Sort Key**: `subscription_id` (String)
- **Attributes**: `status`, `plan_type`, `stripe_customer_id`

## Troubleshooting

### Usage not tracking
1. Check browser console for errors
2. Verify Authorization header is sent
3. Check Lambda CloudWatch logs
4. Verify DynamoDB permissions

### Usage shows 0/0
1. User might not exist in database
2. Check user's plan assignment
3. Verify PLAN_LIMITS in usage_tracker.py

### Upgrade modal not showing
1. Check checkUsageBeforeRequest() logic
2. Verify limit comparison is correct
3. Test with console.log in hook

## Next Steps

1. Deploy backend changes: `serverless deploy function -f usageTracker`
2. Deploy frontend: `npm run build` in reactapp-main
3. Create admin usage client in theme-keeper-login
4. Test complete flow with real user
5. Monitor CloudWatch for errors

## Support

For issues:
1. Check CloudWatch Logs: `/aws/lambda/threatalytics-dev-usageTracker`
2. Review DynamoDB tables for data consistency
3. Test API endpoints with Postman
4. Verify JWT token is valid and contains `sub` claim
