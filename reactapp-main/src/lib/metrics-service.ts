import { API_CONFIG } from '@/config/api';

export interface MetricsData {
  total_feedback: number;
  helpful: number;
  not_helpful: number;
  helpful_rate_percent: number;
  sample_comments: string[];
}

class MetricsService {
  private AUTH_BASE_URL = API_CONFIG.AUTH_BASE_URL;

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

  async getMetrics(): Promise<MetricsData> {
    try {
      const response = await fetch(`${this.AUTH_BASE_URL}/metrics`, {
        method: 'GET',
        headers: this.getAuthHeaders()
      });

      if (!response.ok) {
        const errorText = await response.text();
        throw new Error(`Failed to fetch metrics: ${response.status} - ${errorText}`);
      }

      const data = await response.json();
      return data;
    } catch (error) {
      console.error('Error fetching metrics:', error);
      throw error;
    }
  }
}

export const metricsService = new MetricsService();
