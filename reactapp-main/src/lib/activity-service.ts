import { API_CONFIG } from '@/config/api';

export interface ActivityEntry {
  id: string;
  activity_id: string;
  user_id: string;
  client_id: string;
  case_name: string;
  timestamp: string;
  mode: string;
  question: string;
  answer: string;
  trs_score: number;
  tag: string;
  note: string;
  file_url: string;
  updated_at?: string;
}

class ActivityService {
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

  async getActivities(clientId?: string): Promise<ActivityEntry[]> {
    try {
      const url = clientId 
        ? `${this.AUTH_BASE_URL}/admin/activity?client_id=${clientId}`
        : `${this.AUTH_BASE_URL}/admin/activity`;
      
      const response = await fetch(url, {
        method: 'GET',
        headers: this.getAuthHeaders()
      });

      if (!response.ok) {
        const errorText = await response.text();
        throw new Error(`Failed to fetch activities: ${response.status} - ${errorText}`);
      }

      const data = await response.json();
      return data || [];
    } catch (error) {
      console.error('Error fetching activities:', error);
      throw error;
    }
  }

  async updateNote(activityId: string, note: string): Promise<boolean> {
    try {
      const response = await fetch(`${this.AUTH_BASE_URL}/admin/note/update`, {
        method: 'POST',
        headers: this.getAuthHeaders(),
        body: JSON.stringify({
          id: activityId,
          note: note
        })
      });

      if (!response.ok) {
        const errorText = await response.text();
        throw new Error(`Failed to update note: ${response.status} - ${errorText}`);
      }

      const data = await response.json();
      return data.ok === true;
    } catch (error) {
      console.error('Error updating note:', error);
      throw error;
    }
  }
}

export const activityService = new ActivityService();
