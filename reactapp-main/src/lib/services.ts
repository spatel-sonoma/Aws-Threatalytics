import { API_CONFIG } from '@/config/api';

// Types
export interface AnalysisRequest {
    content: string;
    mode?: 'analyze' | 'redact' | 'report' | 'drill';
}

export interface AnalysisResponse {
    result: string;
    threatLevel?: 'low' | 'medium' | 'high';
    recommendations?: string[];
}

export interface AdminUser {
    id: string;
    email: string;
    name?: string;
    subscription?: {
        status: string;
        plan: string;
    };
    lastActive?: string;
    created?: string;
}

// Base API Client
class BaseApiClient {
    protected async request<T>(endpoint: string, options: RequestInit = {}, baseUrl = API_CONFIG.API_BASE_URL): Promise<T> {
        const headers = new Headers({
            'Content-Type': 'application/json',
            ...options.headers
        });

        const response = await fetch(`${baseUrl}${endpoint}`, {
            ...options,
            headers
        });

        if (!response.ok) {
            const error = await response.json().catch(() => ({ message: 'An error occurred' }));
            throw new Error(error.message || 'Request failed');
        }

        return response.json();
    }
}

// Analysis Service - All endpoints are LIVE
export class AnalysisService extends BaseApiClient {
    async analyze(content: string): Promise<AnalysisResponse> {
        return this.request('/analyze', {
            method: 'POST',
            body: JSON.stringify({ content, mode: 'analyze' })
        });
    }

    async redact(content: string): Promise<{ redactedContent: string }> {
        return this.request('/redact', {
            method: 'POST',
            body: JSON.stringify({ content })
        });
    }

    async generateReport(content: string): Promise<AnalysisResponse> {
        return this.request('/generate-report', {
            method: 'POST',
            body: JSON.stringify({ content, mode: 'report' })
        });
    }

    async simulateDrill(scenario: string): Promise<AnalysisResponse> {
        // Note: This endpoint is live but has 504 timeout issues
        return this.request('/simulate-drill', {
            method: 'POST',
            body: JSON.stringify({ content: scenario, mode: 'drill' })
        });
    }
}

// Admin Service - Only working with live endpoints
export class AdminService extends BaseApiClient {
    async getAllUsers(): Promise<AdminUser[]> {
        return this.request('/admin/users', {}, API_CONFIG.ADMIN_BASE_URL);
    }

    async getRecentUsers(): Promise<AdminUser[]> {
        return this.request('/admin/users/recent', {}, API_CONFIG.ADMIN_BASE_URL);
    }

    async exportUsers(): Promise<Blob> {
        const response = await fetch(`${API_CONFIG.ADMIN_BASE_URL}/admin/users/export`);
        if (!response.ok) throw new Error('Failed to export users');
        return response.blob();
    }
}

import { StripeWebhookEvent } from '@/types/stripe';

// Stripe Webhook Service - Live endpoint
export class StripeService extends BaseApiClient {
    async handleWebhook(event: StripeWebhookEvent): Promise<void> {
        await this.request('/stripe/webhook', {
            method: 'POST',
            body: JSON.stringify(event)
        });
    }
}

// Create service instances
export const analysisService = new AnalysisService();
export const adminService = new AdminService();
export const stripeService = new StripeService();