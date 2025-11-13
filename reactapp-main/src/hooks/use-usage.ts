import { useState, useEffect, useCallback } from 'react';
import { usageService, UsageData } from '@/lib/usage-service';
import { subscriptionService, SubscriptionStatus } from '@/lib/subscription-service';
import Swal from 'sweetalert2';

export const useUsageTracking = () => {
    const [usage, setUsage] = useState<UsageData | null>(null);
    const [subscription, setSubscription] = useState<SubscriptionStatus | null>(null);
    const [loading, setLoading] = useState(true);
    const [canMakeRequest, setCanMakeRequest] = useState(true);

    const loadData = useCallback(async () => {
        try {
            setLoading(true);
            const [usageData, subData] = await Promise.all([
                usageService.getUsage().catch((err) => {
                    console.error('Failed to load usage:', err);
                    return null;
                }),
                subscriptionService.getSubscriptionStatus().catch(() => null)
            ]);
            
            setUsage(usageData);
            setSubscription(subData);
            
            // Check if user can make requests (only if usage loaded)
            if (usageData) {
                const { allowed } = await usageService.canMakeRequest();
                setCanMakeRequest(allowed);
            }
        } catch (error) {
            console.error('Failed to load usage data:', error);
            // Don't show error to user, gracefully degrade
        } finally {
            setLoading(false);
        }
    }, []);

    useEffect(() => {
        loadData();
    }, [loadData]);

    /**
     * Check if user can make an API request, show upgrade prompt if needed
     */
    const checkUsageBeforeRequest = async (): Promise<boolean> => {
        try {
            const result = await usageService.canMakeRequest();
            
            if (!result.allowed) {
                Swal.fire({
                    title: 'Usage Limit Reached',
                    text: result.message || 'You have reached your monthly API limit.',
                    icon: 'warning',
                    showCancelButton: true,
                    confirmButtonText: 'Upgrade Plan',
                    cancelButtonText: 'Close',
                    confirmButtonColor: '#f97316',
                    cancelButtonColor: '#6b7280',
                    background: '#1a1a1a',
                    color: '#fff',
                    customClass: {
                        popup: 'border border-gray-800',
                        confirmButton: 'font-semibold',
                        cancelButton: 'font-semibold'
                    }
                }).then((result) => {
                    if (result.isConfirmed) {
                        // Trigger upgrade modal (you can emit event or use context)
                        window.dispatchEvent(new CustomEvent('open-upgrade-modal'));
                    }
                });
                
                return false;
            }
            
            return true;
        } catch (error) {
            console.error('Error checking usage:', error);
            // Allow request on error to avoid blocking legitimate users
            return true;
        }
    };

    /**
     * Track API usage after successful request
     */
    const trackApiUsage = async (endpoint: string) => {
        try {
            await usageService.trackUsage(endpoint);
            // Reload usage data
            await loadData();
        } catch (error) {
            console.error('Failed to track usage:', error);
        }
    };

    /**
     * Refresh usage data
     */
    const refreshUsage = useCallback(async () => {
        await loadData();
    }, [loadData]);

    return {
        usage,
        subscription,
        loading,
        canMakeRequest,
        checkUsageBeforeRequest,
        trackApiUsage,
        refreshUsage
    };
};
