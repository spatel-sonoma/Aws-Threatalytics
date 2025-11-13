# 🚀 Quick Reference: Stripe & Usage Tracking

## 📌 Add to Any Page in 3 Steps

### Step 1: Import Hook
```typescript
import { useUsageTracking } from '@/hooks/use-usage';
import UpgradeModal from '@/components/UpgradeModal';
import UsageDisplay from '@/components/UsageDisplay';
```

### Step 2: Setup Hook
```typescript
const [showUpgradeModal, setShowUpgradeModal] = useState(false);
const { usage, checkUsageBeforeRequest, trackApiUsage, refreshUsage } = useUsageTracking();
```

### Step 3: Use in Component
```typescript
// BEFORE API call
const canProceed = await checkUsageBeforeRequest();
if (!canProceed) return;

// Make your API call here...

// AFTER successful API call
await trackApiUsage('analyze'); // or 'redact', 'report', 'drill'
```

## 🎨 UI Components

### Usage Display (Full)
```tsx
<UsageDisplay 
  onUpgradeClick={() => setShowUpgradeModal(true)}
/>
```

### Usage Display (Compact)
```tsx
<UsageDisplay 
  onUpgradeClick={() => setShowUpgradeModal(true)}
  compact 
/>
```

### Upgrade Modal
```tsx
<UpgradeModal
  isOpen={showUpgradeModal}
  onClose={() => {
    setShowUpgradeModal(false);
    refreshUsage();
  }}
  currentPlan={usage?.plan}
  usage={usage}
/>
```

## 📋 Complete Example

```typescript
import { useState } from 'react';
import { useUsageTracking } from '@/hooks/use-usage';
import UsageDisplay from '@/components/UsageDisplay';
import UpgradeModal from '@/components/UpgradeModal';
import { Button } from '@/components/ui/button';

const MyPage = () => {
  const [showUpgradeModal, setShowUpgradeModal] = useState(false);
  const { usage, checkUsageBeforeRequest, trackApiUsage, refreshUsage } = useUsageTracking();

  const handleApiCall = async () => {
    // Check usage first
    const canProceed = await checkUsageBeforeRequest();
    if (!canProceed) return; // Upgrade modal shown automatically

    try {
      // Your API call
      const response = await fetch('/api/analyze', {
        method: 'POST',
        body: JSON.stringify({ text: 'analyze this' })
      });
      
      const data = await response.json();
      
      // Track usage after success
      await trackApiUsage('analyze');
      
      // Handle response...
      
    } catch (error) {
      console.error(error);
    }
  };

  return (
    <div>
      <UsageDisplay onUpgradeClick={() => setShowUpgradeModal(true)} compact />
      
      <Button onClick={handleApiCall}>
        Analyze
      </Button>
      
      <UpgradeModal
        isOpen={showUpgradeModal}
        onClose={() => {
          setShowUpgradeModal(false);
          refreshUsage();
        }}
        currentPlan={usage?.plan}
        usage={usage}
      />
    </div>
  );
};
```

## 🎯 Hook API Reference

```typescript
const {
  usage,                      // UsageData | null
  subscription,               // SubscriptionStatus | null
  loading,                    // boolean
  canMakeRequest,             // boolean
  checkUsageBeforeRequest,    // () => Promise<boolean>
  trackApiUsage,              // (endpoint: string) => Promise<void>
  refreshUsage                // () => Promise<void>
} = useUsageTracking();
```

### Usage Data Type
```typescript
interface UsageData {
  user_id: string;
  plan: 'free' | 'starter' | 'professional' | 'enterprise';
  current: number;              // Current usage count
  limit: number | 'unlimited';  // Plan limit
  remaining: number | 'unlimited';
  percentage: number;           // Usage percentage
  has_active_subscription: boolean;
}
```

## ⚡ Endpoints to Track

Pass these to `trackApiUsage()`:
- `'analyze'` - Threat analysis
- `'redact'` - PII redaction
- `'report'` - Report generation
- `'drill'` - Drill simulation
- `'document_processor'` - Document Q&A

## 🎨 Pricing Tiers

| Plan | Monthly | API Calls |
|------|---------|-----------|
| Free | $0 | 100 |
| Starter | $29 | 500 |
| Professional | $99 | 5,000 |
| Enterprise | $499 | Unlimited |

## 🔧 Environment Setup

Add to `.env`:
```bash
VITE_STRIPE_PRICE_ID_STARTER=price_xxxxx
VITE_STRIPE_PRICE_ID_PROFESSIONAL=price_xxxxx
VITE_STRIPE_PRICE_ID_ENTERPRISE=price_xxxxx
```

## 📡 Backend Endpoints Required

```
GET  /usage              - Get current usage
POST /usage/track        - Track API call
GET  /subscription/status   - Get subscription
POST /subscription/create   - Create checkout
GET  /subscription/portal   - Get portal URL
```

## 🎨 Styling Notes

All components use:
- Dark theme (`bg-[#0f0f0f]`, `bg-[#0a0a0a]`)
- Orange accent (`text-orange-500`, `bg-orange-500`)
- Gray borders (`border-gray-800`)
- Smooth transitions
- Responsive design

## ⚠️ Common Issues

### Usage Not Updating
```typescript
// Manually refresh after operations
await refreshUsage();
```

### Modal Not Showing
```typescript
// Listen for global event
useEffect(() => {
  const handleOpenUpgrade = () => setShowUpgradeModal(true);
  window.addEventListener('open-upgrade-modal', handleOpenUpgrade);
  return () => window.removeEventListener('open-upgrade-modal', handleOpenUpgrade);
}, []);
```

### Wrong Endpoint Name
```typescript
// Use exact endpoint names
await trackApiUsage('analyze');  // ✅ Correct
await trackApiUsage('Analyze');  // ❌ Wrong (case sensitive)
```

## 🧪 Testing

### Test Usage Limit
```typescript
// Make 100+ API calls to test blocking
for (let i = 0; i < 101; i++) {
  await handleApiCall();
}
// Should block on 101st call for free plan
```

### Test Upgrade Flow
1. Click "Upgrade Plan"
2. Select plan
3. Redirects to Stripe
4. Complete checkout
5. Returns to app
6. Check new limits

## 📚 More Info

- Full guide: `STRIPE_INTEGRATION_GUIDE.md`
- Implementation: `STRIPE_IMPLEMENTATION_SUMMARY.md`
- Backend: `lambda_functions/usage_tracker.py`
