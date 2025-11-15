import { API_CONFIG } from '@/config/api';

export interface Plan {
    id: 'free' | 'starter' | 'professional' | 'enterprise';
    name: string;
    price: number;
    interval: 'month' | 'year';
    features: string[];
    apiCalls: number | 'unlimited';
    stripePriceId?: string;
}

export interface SubscriptionStatus {
    user_id: string;
    plan: string;
    status: 'active' | 'inactive' | 'cancelled' | 'past_due';
    current_period_start?: string;
    current_period_end?: string;
    cancel_at_period_end?: boolean;
    stripe_customer_id?: string;
    stripe_subscription_id?: string;
}

export interface CheckoutSession {
    url: string;
    session_id: string;
}

export const PLANS: Plan[] = [
    {
        id: 'free',
        name: 'Free',
        price: 0,
        interval: 'month',
        apiCalls: 100,
        features: [
            '100 API requests/month',
            'Basic threat analysis',
            'Document redaction',
            'Report generation',
            'Email support'
        ]
    },
    {
        id: 'starter',
        name: 'Starter',
        price: 29,
        interval: 'month',
        apiCalls: 500,
        stripePriceId: import.meta.env.VITE_STRIPE_PRICE_ID_STARTER || 'price_starter',
        features: [
            '500 API requests/month',
            'Advanced threat analysis',
            'Priority support',
            'Document redaction',
            'Custom reports',
            'Drill simulation'
        ]
    },
    {
        id: 'professional',
        name: 'Professional',
        price: 99,
        interval: 'month',
        apiCalls: 5000,
        stripePriceId: import.meta.env.VITE_STRIPE_PRICE_ID_PROFESSIONAL || 'price_professional',
        features: [
            '5,000 API requests/month',
            'All Starter features',
            'Advanced analytics',
            'Team collaboration',
            'API access',
            'Custom integrations',
            'Priority support'
        ]
    },
    {
        id: 'enterprise',
        name: 'Enterprise',
        price: 499,
        interval: 'month',
        apiCalls: 'unlimited',
        stripePriceId: import.meta.env.VITE_STRIPE_PRICE_ID_ENTERPRISE || 'price_enterprise',
        features: [
            'Unlimited API requests',
            'All Professional features',
            'Dedicated account manager',
            'Custom SLA',
            'On-premise deployment',
            'Advanced security',
            '24/7 phone support'
        ]
    }
];

class SubscriptionService {
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
     * Get current subscription status
     */
    async getSubscriptionStatus(): Promise<SubscriptionStatus> {
        try {
            const response = await fetch(`${this.baseUrl}/subscription/status`, {
                method: 'GET',
                headers: this.getAuthHeaders(),
            });

            if (!response.ok) {
                // If endpoint doesn't exist (404) or not authorized, return default free plan
                if (response.status === 404 || response.status === 401) {
                    console.log('Subscription endpoint not available, using default plan');
                    return {
                        user_id: '',
                        plan: 'free',
                        status: 'inactive',
                        cancel_at_period_end: false
                    };
                }
                throw new Error(`Failed to fetch subscription: ${response.status}`);
            }

            return await response.json();
        } catch (error) {
            console.error('Error fetching subscription:', error);
            // Return default free plan if service unavailable
            return {
                user_id: '',
                plan: 'free',
                status: 'inactive',
                cancel_at_period_end: false
            };
        }
    }

    /**
     * Create Stripe checkout session for plan upgrade
     */
    async createCheckoutSession(planId: string): Promise<CheckoutSession> {
        try {
            const plan = PLANS.find(p => p.id === planId);
            if (!plan || plan.id === 'free') {
                throw new Error('Invalid plan selected');
            }

            // Check if Stripe Price ID is configured (real price IDs start with price_1)
            if (!plan.stripePriceId || !plan.stripePriceId.startsWith('price_1')) {
                throw new Error(
                    'Stripe is not fully configured. Please contact support to set up your subscription. ' +
                    'We\'ll help you get started with the ' + plan.name + ' plan.'
                );
            }

            const response = await fetch(`${this.baseUrl}/subscription/create`, {
                method: 'POST',
                headers: this.getAuthHeaders(),
                body: JSON.stringify({
                    plan_id: planId,
                    price_id: plan.stripePriceId,
                    success_url: `${window.location.origin}/dashboard?session_id={CHECKOUT_SESSION_ID}`,
                    cancel_url: `${window.location.origin}/dashboard?cancelled=true`
                }),
            });

            if (!response.ok) {
                const error = await response.text();
                throw new Error(`Failed to create checkout session: ${error}`);
            }

            return await response.json();
        } catch (error) {
            console.error('Error creating checkout session:', error);
            throw error;
        }
    }

    /**
     * Get Stripe customer portal URL
     */
    async getPortalUrl(): Promise<string> {
        try {
            const response = await fetch(`${this.baseUrl}/subscription/portal`, {
                method: 'GET',
                headers: this.getAuthHeaders(),
            });

            if (!response.ok) {
                throw new Error(`Failed to get portal URL: ${response.status}`);
            }

            const data = await response.json();
            return data.url;
        } catch (error) {
            console.error('Error getting portal URL:', error);
            throw error;
        }
    }

    /**
     * Cancel subscription
     */
    async cancelSubscription(): Promise<void> {
        try {
            const response = await fetch(`${this.baseUrl}/subscription/cancel`, {
                method: 'POST',
                headers: this.getAuthHeaders(),
            });

            if (!response.ok) {
                throw new Error(`Failed to cancel subscription: ${response.status}`);
            }
        } catch (error) {
            console.error('Error cancelling subscription:', error);
            throw error;
        }
    }

    /**
     * Verify payment after successful checkout
     */
    async verifyPayment(sessionId: string, plan: string): Promise<void> {
        try {
            const response = await fetch(`${this.baseUrl}/subscription/verify`, {
                method: 'POST',
                headers: this.getAuthHeaders(),
                body: JSON.stringify({
                    session_id: sessionId,
                    plan: plan
                }),
            });

            if (!response.ok) {
                const error = await response.text();
                throw new Error(`Failed to verify payment: ${error}`);
            }

            const data = await response.json();
            
            if (!data.success) {
                throw new Error(data.message || 'Payment verification failed');
            }
            
            console.log('Payment verified successfully:', data);
        } catch (error) {
            console.error('Error verifying payment:', error);
            throw error;
        }
    }

    /**
     * Get plan by ID
     */
    getPlan(planId: string): Plan | undefined {
        return PLANS.find(p => p.id === planId);
    }

    /**
     * Get all available plans
     */
    getAllPlans(): Plan[] {
        return PLANS;
    }
}

export const subscriptionService = new SubscriptionService();
