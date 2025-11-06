import { API_CONFIG } from '@/config/api';

export interface FeedbackData {
  question: string;
  helpful: boolean;
  comments: string;
}

class FeedbackService {
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

  async submitFeedback(feedback: FeedbackData): Promise<{ status: string; message: string; feedback_id: string }> {
    try {
      const response = await fetch(`${this.AUTH_BASE_URL}/feedback`, {
        method: 'POST',
        headers: this.getAuthHeaders(),
        body: JSON.stringify(feedback)
      });

      if (!response.ok) {
        const errorText = await response.text();
        throw new Error(`Failed to submit feedback: ${response.status} - ${errorText}`);
      }

      const data = await response.json();
      return data;
    } catch (error) {
      console.error('Error submitting feedback:', error);
      throw error;
    }
  }
}

export const feedbackService = new FeedbackService();
