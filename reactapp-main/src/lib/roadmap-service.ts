import { API_CONFIG } from '@/config/api';

export interface RoadmapTask {
  task?: string;
  feature?: string;
  status: 'pending' | 'complete';
}

export interface RoadmapData {
  infrastructure: RoadmapTask[];
  client_dashboard: RoadmapTask[];
  pilot: RoadmapTask[];
  launch: RoadmapTask[];
  database: {
    preferred_db: string;
    tables: string[];
  };
}

class RoadmapService {
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

  async getRoadmap(): Promise<RoadmapData> {
    try {
      const response = await fetch(`${this.AUTH_BASE_URL}/admin/roadmap`, {
        method: 'GET',
        headers: this.getAuthHeaders()
      });

      if (!response.ok) {
        const errorText = await response.text();
        throw new Error(`Failed to fetch roadmap: ${response.status} - ${errorText}`);
      }

      const data = await response.json();
      return data;
    } catch (error) {
      console.error('Error fetching roadmap:', error);
      throw error;
    }
  }

  async updateTaskStatus(category: string, index: number, status: 'pending' | 'complete'): Promise<boolean> {
    try {
      const response = await fetch(`${this.AUTH_BASE_URL}/admin/roadmap/update`, {
        method: 'POST',
        headers: this.getAuthHeaders(),
        body: JSON.stringify({
          category,
          index,
          status
        })
      });

      if (!response.ok) {
        const errorText = await response.text();
        throw new Error(`Failed to update status: ${response.status} - ${errorText}`);
      }

      const data = await response.json();
      return data.ok === true;
    } catch (error) {
      console.error('Error updating task status:', error);
      throw error;
    }
  }

  async exportRoadmap(): Promise<void> {
    try {
      const tokensStr = localStorage.getItem('threatalytics_tokens');
      const tokens = JSON.parse(tokensStr || '{}');
      const accessToken = tokens.access_token;
      
      // Open in new tab for download
      const url = `${this.AUTH_BASE_URL}/admin/roadmap/export`;
      window.open(`${url}?token=${accessToken}`, '_blank');
    } catch (error) {
      console.error('Error exporting roadmap:', error);
      throw error;
    }
  }
}

export const roadmapService = new RoadmapService();
