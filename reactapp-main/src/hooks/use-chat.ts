import { useState, useEffect } from 'react';
import { API_CONFIG, ENDPOINTS } from '@/config/api';

interface User {
  id: string;
  email: string;
  subscription: {
    plan: string;
    status: string;
    usage: {
      current: number;
      limit: number;
    };
  };
}

interface Conversation {
  id: string;
  title: string;
  mode: string;
  lastUpdated: string;
}

export const useChat = () => {
  const [conversations, setConversations] = useState<Conversation[]>([]);
  const [user, setUser] = useState<User | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const fetchConversations = async () => {
    try {
      const token = localStorage.getItem('auth_token');
      if (!token) throw new Error('Authentication required');

      const response = await fetch(`${API_CONFIG.BASE_URL}${ENDPOINTS.chat.history}`, {
        headers: {
          'Authorization': `Bearer ${token}`,
          'x-api-key': API_CONFIG.API_KEY
        }
      });

      if (!response.ok) throw new Error('Failed to fetch conversations');
      
      const data = await response.json();
      setConversations(data.conversations);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Error fetching conversations');
    }
  };

  const fetchUserProfile = async () => {
    try {
      const token = localStorage.getItem('auth_token');
      if (!token) throw new Error('Authentication required');

      const response = await fetch(`${API_CONFIG.BASE_URL}${ENDPOINTS.user.profile}`, {
        headers: {
          'Authorization': `Bearer ${token}`,
          'x-api-key': API_CONFIG.API_KEY
        }
      });

      if (!response.ok) throw new Error('Failed to fetch user profile');
      
      const data = await response.json();
      setUser(data.user);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Error fetching user profile');
    }
  };

  const deleteConversation = async (conversationId: string) => {
    try {
      const token = localStorage.getItem('auth_token');
      if (!token) throw new Error('Authentication required');

      const response = await fetch(`${API_CONFIG.BASE_URL}${ENDPOINTS.chat.delete}/${conversationId}`, {
        method: 'DELETE',
        headers: {
          'Authorization': `Bearer ${token}`,
          'x-api-key': API_CONFIG.API_KEY
        }
      });

      if (!response.ok) throw new Error('Failed to delete conversation');

      setConversations(prev => prev.filter(conv => conv.id !== conversationId));
      return true;
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Error deleting conversation');
      return false;
    }
  };

  useEffect(() => {
    Promise.all([fetchConversations(), fetchUserProfile()])
      .finally(() => setLoading(false));
  }, []);

  return {
    conversations,
    user,
    loading,
    error,
    deleteConversation,
    refreshConversations: fetchConversations,
    refreshUserProfile: fetchUserProfile
  };
};