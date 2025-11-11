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

type StoredTokens = {
  access_token?: string | null;
  id_token?: string | null;
  refresh_token?: string | null;
};

// ======== CONFIG - set to your values ========
const COGNITO_DOMAIN = 'https://threatalyticsai.auth.us-east-1.amazoncognito.com';
const COGNITO_CLIENT_ID = '5ifaa48pf75jou1opehoc95jue';

// ======== HELPERS ========
function readTokens(): StoredTokens {
  const raw = localStorage.getItem('threatalytics_tokens');
  if (!raw) return {};
  try {
    return JSON.parse(raw);
  } catch (e) {
    console.warn('Failed to parse stored tokens, clearing them.');
    localStorage.removeItem('threatalytics_tokens');
    return {};
  }
}

function writeTokens(tokens: StoredTokens) {
  localStorage.setItem('threatalytics_tokens', JSON.stringify(tokens));
}

function safeAtob(input: string) {
  try {
    return atob(input.replace(/-/g, '+').replace(/_/g, '/'));
  } catch {
    return null;
  }
}

function decodeJwtPayload(token?: string): any | null {
  if (!token) return null;
  const parts = token.split('.');
  if (parts.length < 2) return null;
  const payload = safeAtob(parts[1]);
  if (!payload) return null;
  try {
    return JSON.parse(payload);
  } catch {
    return null;
  }
}

function isTokenExpired(token?: string, skewMs = 30_000): boolean {
  const payload = decodeJwtPayload(token);
  if (!payload || typeof payload.exp !== 'number') return true;
  const now = Date.now();
  return now >= payload.exp * 1000 - skewMs;
}

// ======== SERIALIZED REFRESH (single shared promise) ========
let refreshPromise: Promise<StoredTokens> | null = null;

async function refreshTokensOnce(refreshToken?: string): Promise<StoredTokens> {
  if (!refreshToken) throw new Error('No refresh_token available');

  const tokenUrl = `${COGNITO_DOMAIN.replace(/\/$/, '')}/oauth2/token`;
  console.log('Refreshing tokens via:', tokenUrl);

  const body = new URLSearchParams();
  body.set('grant_type', 'refresh_token');
  body.set('client_id', COGNITO_CLIENT_ID);
  body.set('refresh_token', refreshToken);

  const res = await fetch(tokenUrl, {
    method: 'POST',
    headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
    body: body.toString(),
  });

  if (!res.ok) {
    const txt = await res.text();
    console.error('Refresh token failed:', res.status, txt);
    throw new Error(`Refresh token failed: ${res.status} - ${txt}`);
  }

  const json = await res.json();

  // Merge with existing tokens so we don't lose other fields.
  const current = readTokens();
  const updated: StoredTokens = {
    access_token: json.access_token ?? current.access_token ?? null,
    id_token: json.id_token ?? current.id_token ?? null,
    refresh_token: current.refresh_token ?? refreshToken ?? null,
  };

  // Persist updated tokens
  writeTokens(updated);
  console.log('Tokens refreshed - id_token present:', !!updated.id_token);
  return updated;
}

/**
 * Get a valid token (prefer id_token, then access_token).
 * If both missing/expired and refresh_token exists, trigger a single refresh (serialized).
 * Throws if no valid token after a refresh attempt.
 */
async function getValidAuthToken(): Promise<{ token: string; type: 'id_token' | 'access_token' }> {
  // Fast path: check stored tokens first
  let tokens = readTokens();
  const refreshToken = tokens.refresh_token ?? null;

  const idToken = tokens.id_token ?? null;
  const accessToken = tokens.access_token ?? null;

  if (idToken && !isTokenExpired(idToken)) {
    return { token: idToken, type: 'id_token' };
  }
  if (accessToken && !isTokenExpired(accessToken)) {
    return { token: accessToken, type: 'access_token' };
  }

  // If we don't have a valid token, we will attempt to refresh once.
  if (!refreshToken) {
    throw new Error('Session expired and no refresh token available. Please sign in again.');
  }

  // If a refresh is already in progress, wait for it. Otherwise start one.
  if (!refreshPromise) {
    refreshPromise = (async () => {
      try {
        const updated = await refreshTokensOnce(refreshToken);
        return updated;
      } finally {
        // clear the promise so subsequent calls can decide next steps
        refreshPromise = null;
      }
    })();
  } else {
    console.log('Awaiting in-flight refreshPromise...');
  }

  // Wait for refresh to finish
  try {
    tokens = await refreshPromise;
  } catch (err) {
    // Refresh failed — ensure promise cleared and rethrow a meaningful error
    refreshPromise = null;
    console.error('Token refresh failed:', err);
    throw new Error('Unable to refresh session. Please sign in again.');
  }

  // After refresh, pick a valid token
  const newId = tokens.id_token ?? null;
  const newAccess = tokens.access_token ?? null;

  if (newId && !isTokenExpired(newId)) {
    return { token: newId, type: 'id_token' };
  }
  if (newAccess && !isTokenExpired(newAccess)) {
    return { token: newAccess, type: 'access_token' };
  }

  // If still no valid token, require re-login
  throw new Error('Session refresh did not produce a usable token. Please sign in again.');
}

// ======== SERVICE CLASS ========
class ConversationsService {
  private AUTH_BASE_URL = API_CONFIG.AUTH_BASE_URL;

  // returns headers that include the valid token
  private async getAuthHeader(): Promise<HeadersInit> {
    const { token, type } = await getValidAuthToken();
    console.log(`Using ${type} for API calls (first 12 chars):`, token.substring(0, 12) + '...');
    return {
      'Content-Type': 'application/json',
      'Authorization': `Bearer ${token}`,
    };
  }

  // Generic fetch with auth header
  private async authedFetch(input: string, init: RequestInit = {}): Promise<Response> {
    const headers = await this.getAuthHeader();
    const mergedHeaders = { ...(init.headers || {}), ...headers };
    return fetch(input, { ...init, headers: mergedHeaders });
  }

  async listConversations(): Promise<Conversation[]> {
    const url = `${this.AUTH_BASE_URL}/conversations`;
    console.log('Fetching conversations from:', url);
    try {
      const res = await this.authedFetch(url, { method: 'GET' });
      if (!res.ok) {
        const txt = await res.text();
        throw new Error(`Failed to fetch conversations: ${res.status} - ${txt}`);
      }
      const json = await res.json();
      return json.conversations || [];
    } catch (err) {
      console.error('Error in listConversations:', err);
      throw err;
    }
  }

  async createConversation(mode: string, title: string, messages: ConversationMessage[]): Promise<string | null> {
    const url = `${this.AUTH_BASE_URL}/conversations`;
    try {
      const res = await this.authedFetch(url, {
        method: 'POST',
        body: JSON.stringify({ mode, title, messages }),
      });
      if (!res.ok) {
        const txt = await res.text();
        console.error('Failed to create conversation:', res.status, txt);
        return null;
      }
      const data = await res.json();
      return data.conversation_id ?? null;
    } catch (err) {
      console.error('Error createConversation:', err);
      return null;
    }
  }

  async updateConversation(conversationId: string, messages: ConversationMessage[]): Promise<boolean> {
    const url = `${this.AUTH_BASE_URL}/conversations/${conversationId}`;
    try {
      const res = await this.authedFetch(url, {
        method: 'PUT',
        body: JSON.stringify({ messages }),
      });
      if (!res.ok) {
        const txt = await res.text();
        console.error('Failed to update conversation:', res.status, txt);
        return false;
      }
      return true;
    } catch (err) {
      console.error('Error updateConversation:', err);
      return false;
    }
  }

  async deleteConversation(conversationId: string): Promise<boolean> {
    const url = `${this.AUTH_BASE_URL}/conversations/${conversationId}`;
    try {
      const res = await this.authedFetch(url, { method: 'DELETE' });
      if (!res.ok) {
        const txt = await res.text();
        console.error('Failed to delete conversation:', res.status, txt);
        return false;
      }
      return true;
    } catch (err) {
      console.error('Error deleteConversation:', err);
      return false;
    }
  }

  generateTitle(firstMessage: string, mode: string): string {
    const maxLength = 50;
    let title = firstMessage.substring(0, maxLength);
    if (firstMessage.length > maxLength) title += '...';
    return title;
  }
}

export const conversationsService = new ConversationsService();

