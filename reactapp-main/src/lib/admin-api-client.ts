import { API_CONFIG } from '@/config/api';

interface DashboardStats {
    totalUsers: number;
    activeSubscriptions: number;
    monthlyRevenue: number;
    apiUsage: number;
}

interface User {
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

interface ChartData {
    labels: string[];
    data: number[];
}

export class AdminApiClient {
    private async request<T>(endpoint: string, options: RequestInit = {}): Promise<T> {
        const headers: HeadersInit = {
            'Content-Type': 'application/json',
            'x-api-key': API_CONFIG.API_KEY,
        };

        const tokens = localStorage.getItem('threatalytics_tokens');
        if (tokens) {
            const { access_token } = JSON.parse(tokens);
            headers['Authorization'] = `Bearer ${access_token}`;
        }

        const response = await fetch(`${API_CONFIG.ADMIN_BASE_URL}${endpoint}`, {
            ...options,
            headers,
        });

        const data = await response.json();

        if (!response.ok) {
            throw new Error(data.error || data.message || 'Admin request failed');
        }

        return data;
    }

    // Dashboard Statistics
    async getDashboardStats(): Promise<DashboardStats> {
        return this.request('/dashboard/stats');
    }

    // User Management
    async getUsers(): Promise<User[]> {
        return this.request('/users');
    }

    async getRecentUsers(): Promise<User[]> {
        return this.request('/users/recent');
    }

    async exportUsers(): Promise<Blob> {
        const response = await fetch(`${API_CONFIG.ADMIN_BASE_URL}/users/export`, {
            headers: {
                'x-api-key': API_CONFIG.API_KEY,
            },
        });

        if (!response.ok) {
            throw new Error('Failed to export users');
        }

        return response.blob();
    }

    // Analytics Charts
    async getRevenueData(): Promise<ChartData> {
        return this.request('/charts/revenue');
    }

    async getUsageData(): Promise<ChartData> {
        return this.request('/charts/usage');
    }
}

export const adminApiClient = new AdminApiClient();