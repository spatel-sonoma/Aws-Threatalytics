import { API_CONFIG } from '@/config/api';

export interface ConversationMessage {
  role: 'user' | 'assistant' | 'system';
  content: string;
  timestamp?: string;
}

export interface Conversation {
  conversation_id: string;
  user_id: string;
  mode: string;
  title: string;
  messages: ConversationMessage[];
  created_at: string;
  updated_at: string;
}

class ConversationsService {
  private AUTH_BASE_URL = API_CONFIG.AUTH_BASE_URL;

  private getAuthHeaders(): HeadersInit {
    const tokensStr = localStorage.getItem('threatalytics_tokens');
    if (!tokensStr) {
      console.error('No authentication token found in localStorage');
      throw new Error('No authentication token found');
    }
    
    try {
      const tokens = JSON.parse(tokensStr);
      console.log('Full tokens object:', tokens);
      
      const accessToken = tokens.access_token;
      
      if (!accessToken) {
        console.error('access_token not found in tokens:', tokens);
        throw new Error('Access token not found in stored tokens');
      }
      
      console.log('Using access token for conversations API (first 20 chars):', accessToken.substring(0, 20) + '...');
      console.log('Full access token:', accessToken);
      
      return {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${accessToken}`
      };
    } catch (error) {
      console.error('Error parsing tokens:', error);
      throw new Error('Failed to parse authentication tokens');
    }
  }

  async listConversations(): Promise<Conversation[]> {
    try {
      console.log('Fetching conversations from:', `${this.AUTH_BASE_URL}/conversations`);
      const response = await fetch(`${this.AUTH_BASE_URL}/conversations`, {
        method: 'GET',
        headers: this.getAuthHeaders()
      });

      console.log('Conversations response status:', response.status);

      if (!response.ok) {
        const errorText = await response.text();
        console.error('Failed to fetch conversations:', response.status, errorText);
        throw new Error(`Failed to fetch conversations: ${response.status} - ${errorText}`);
      }

      const data = await response.json();
      console.log('Conversations data received:', data);
      return data.conversations || [];
    } catch (error) {
      console.error('Error listing conversations:', error);
      throw error;
    }
  }

  async createConversation(mode: string, title: string, messages: ConversationMessage[]): Promise<string | null> {
    try {
      const response = await fetch(`${this.AUTH_BASE_URL}/conversations`, {
        method: 'POST',
        headers: this.getAuthHeaders(),
        body: JSON.stringify({
          mode,
          title,
          messages
        })
      });

      if (!response.ok) {
        throw new Error('Failed to create conversation');
      }

      const data = await response.json();
      return data.conversation_id;
    } catch (error) {
      console.error('Error creating conversation:', error);
      return null;
    }
  }

  async updateConversation(conversationId: string, messages: ConversationMessage[]): Promise<boolean> {
    try {
      const response = await fetch(`${this.AUTH_BASE_URL}/conversations/${conversationId}`, {
        method: 'PUT',
        headers: this.getAuthHeaders(),
        body: JSON.stringify({
          messages
        })
      });

      return response.ok;
    } catch (error) {
      console.error('Error updating conversation:', error);
      return false;
    }
  }

  async deleteConversation(conversationId: string): Promise<boolean> {
    try {
      const response = await fetch(`${this.AUTH_BASE_URL}/conversations/${conversationId}`, {
        method: 'DELETE',
        headers: this.getAuthHeaders()
      });

      return response.ok;
    } catch (error) {
      console.error('Error deleting conversation:', error);
      return false;
    }
  }

  generateTitle(firstMessage: string, mode: string): string {
    const maxLength = 50;
    let title = firstMessage.substring(0, maxLength);
    if (firstMessage.length > maxLength) {
      title += '...';
    }
    return title;
  }
}

export const conversationsService = new ConversationsService();
