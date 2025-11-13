import { API_CONFIG } from '@/config/api';

export interface UsageData {
    user_id: string;
    plan: 'free' | 'starter' | 'professional' | 'enterprise';
    current: number;
    limit: number | 'unlimited';
    remaining: number | 'unlimited';
    percentage: number;
    has_active_subscription: boolean;
    subscription?: {
        subscription_id: string;
        plan: string;
        status: string;
        start_date: string;
        end_date?: string;
    };
}

export interface UsageResponse {
    success: boolean;
    usage?: UsageData;
    error?: string;
}

class UsageService {
    private readonly baseUrl: string;

    constructor() {
        this.baseUrl = API_CONFIG.AUTH_BASE_URL;
    }

    private getAuthHeaders(): HeadersInit {
        const tokensStr = localStorage.getItem('threatalytics_tokens');
        if (!tokensStr) {
            throw new Error('No authentication token found');
        }
        
        try {
            const tokens = JSON.parse(tokensStr);
            const accessToken = tokens.access_token;
            
            if (!accessToken) {
                throw new Error('Access token not found in stored tokens');
            }
            
            return {
                'Content-Type': 'application/json',
                'Authorization': `Bearer ${accessToken}`
            };
        } catch (error) {
            throw new Error('Failed to parse authentication tokens');
        }
    }

    /**
     * Get current usage for authenticated user
     */
    async getUsage(): Promise<UsageData> {
        try {
            const response = await fetch(`${this.baseUrl}/usage`, {
                method: 'GET',
                headers: this.getAuthHeaders(),
            });

            if (!response.ok) {
                // If endpoint doesn't exist (404) or not authorized, return default free plan
                if (response.status === 404 || response.status === 401) {
                    console.log('Usage endpoint not available, using default plan');
                    return {
                        user_id: 'current_user',
                        plan: 'free',
                        current: 0,
                        limit: 100,
                        remaining: 100,
                        percentage: 0,
                        has_active_subscription: false
                    };
                }
                throw new Error(`Failed to fetch usage: ${response.status}`);
            }

            const data: UsageResponse = await response.json();
            
            if (!data.success || !data.usage) {
                throw new Error(data.error || 'Failed to get usage data');
            }

            return data.usage;
        } catch (error) {
            console.error('Error fetching usage:', error);
            // Return default free plan if service unavailable
            return {
                user_id: 'current_user',
                plan: 'free',
                current: 0,
                limit: 100,
                remaining: 100,
                percentage: 0,
                has_active_subscription: false
            };
        }
    }

    /**
     * Track API usage (called after each API call)
     */
    async trackUsage(endpoint: string): Promise<boolean> {
        try {
            const response = await fetch(`${this.baseUrl}/usage/track`, {
                method: 'POST',
                headers: this.getAuthHeaders(),
                body: JSON.stringify({ endpoint }),
            });

            return response.ok;
        } catch (error) {
            console.error('Error tracking usage:', error);
            return false;
        }
    }

    /**
     * Check if user can make an API call (has remaining quota)
     */
    async canMakeRequest(): Promise<{ allowed: boolean; usage?: UsageData; message?: string }> {
        try {
            const usage = await this.getUsage();
            
            // Unlimited plan
            if (usage.limit === 'unlimited') {
                return { allowed: true, usage };
            }

            // Check if within limit
            if (typeof usage.remaining === 'number' && usage.remaining > 0) {
                return { allowed: true, usage };
            }

            return {
                allowed: false,
                usage,
                message: `You've reached your monthly limit of ${usage.limit} requests. Please upgrade your plan.`
            };
        } catch (error) {
            console.error('Error checking usage limit:', error);
            // Allow on error to prevent blocking legitimate users
            return { allowed: true };
        }
    }

    /**
     * Get usage display string
     */
    getUsageDisplay(usage: UsageData): string {
        if (usage.limit === 'unlimited') {
            return `${usage.current} requests this month (Unlimited)`;
        }
        return `${usage.current} / ${usage.limit} requests (${usage.remaining} remaining)`;
    }

    /**
     * Get usage percentage for progress bars
     */
    getUsagePercentage(usage: UsageData): number {
        if (usage.limit === 'unlimited') {
            return 0;
        }
        return usage.percentage;
    }

    /**
     * Check if usage is near limit (> 80%)
     */
    isNearLimit(usage: UsageData): boolean {
        if (usage.limit === 'unlimited') {
            return false;
        }
        return usage.percentage > 80;
    }

    /**
     * Check if usage exceeded limit
     */
    isOverLimit(usage: UsageData): boolean {
        if (usage.limit === 'unlimited') {
            return false;
        }
        return typeof usage.remaining === 'number' && usage.remaining <= 0;
    }
}

export const usageService = new UsageService();
