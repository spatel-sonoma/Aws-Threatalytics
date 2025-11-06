import { API_CONFIG } from '@/config/api';
import { AnalysisRequest, AnalysisResponse, ConversationData, SubscriptionData } from '@/types/api';

interface RequestOptions extends RequestInit {
    requiresAuth?: boolean;
    baseUrl?: string;
}

export class ApiClient {
    private async request<T>(endpoint: string, options: RequestOptions = {}): Promise<T> {
        const {
            requiresAuth = true,
            baseUrl = API_CONFIG.API_BASE_URL,
            ...fetchOptions
        } = options;

        const headers = new Headers({
            'Content-Type': 'application/json',
            ...(fetchOptions.headers as Record<string, string>)
        });

        if (requiresAuth) {
            const tokens = localStorage.getItem('threatalytics_tokens');
            if (!tokens) {
                throw new Error('Authentication required');
            }
            const { access_token } = JSON.parse(tokens);
            headers['Authorization'] = `Bearer ${access_token}`;
        }

        if (API_CONFIG.API_KEY) {
            headers['x-api-key'] = API_CONFIG.API_KEY;
        }

        const response = await fetch(`${baseUrl}${endpoint}`, {
            ...fetchOptions,
            headers,
        });

        const data = await response.json();

        if (!response.ok) {
            throw new Error(data.error || data.message || 'Request failed');
        }

        return data;
    }

    // Core Analysis Methods
    async analyze(content: string) {
        return this.request('/analyze', {
            method: 'POST',
            body: JSON.stringify({ content })
        });
    }

    async redact(content: string) {
        return this.request('/redact', {
            method: 'POST',
            body: JSON.stringify({ content })
        });
    }

    async generateReport(data: AnalysisRequest): Promise<AnalysisResponse> {
        return this.request('/generate-report', {
            method: 'POST',
            body: JSON.stringify(data)
        });
    }

    async simulateDrill(scenario: string): Promise<AnalysisResponse> {
        return this.request('/simulate-drill', {
            method: 'POST',
            body: JSON.stringify({ content: scenario, mode: 'drill' })
        });
    }

    // Conversation Methods
    async getConversations(): Promise<ConversationData[]> {
        return this.request('/conversations', {
            baseUrl: API_CONFIG.AUTH_BASE_URL
        });
    }

    async saveConversation(data: ConversationData): Promise<ConversationData> {
        return this.request('/conversations', {
            method: 'POST',
            body: JSON.stringify(data),
            baseUrl: API_CONFIG.AUTH_BASE_URL
        });
    }

    async deleteConversation(id: string) {
        return this.request(`/conversations/${id}`, {
            method: 'DELETE',
            baseUrl: API_CONFIG.AUTH_BASE_URL
        });
    }

    // Subscription Methods
    async getSubscriptionStatus() {
        return this.request('/subscription/status', {
            baseUrl: API_CONFIG.AUTH_BASE_URL
        });
    }

    async createCheckoutSession(priceId: string) {
        return this.request('/subscription/create', {
            method: 'POST',
            body: JSON.stringify({ priceId }),
            baseUrl: API_CONFIG.AUTH_BASE_URL
        });
    }

    async getBillingPortalUrl() {
        return this.request('/subscription/portal', {
            baseUrl: API_CONFIG.AUTH_BASE_URL
        });
    }
}

export const apiClient = new ApiClient();