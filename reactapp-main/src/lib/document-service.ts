import { API_CONFIG } from '@/config/api';

export interface UploadResponse {
  status: string;
  document_id: string;
  s3_key: string;
}

export interface ProcessResponse {
  status: string;
  message: string;
}

export interface AskResponse {
  answer: string;
  mode: string;
  question: string;
  document_id?: string;
  error?: string;
  templates?: string[];
}

class DocumentService {
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

  async uploadDocument(fileName: string, fileContent: string): Promise<UploadResponse> {
    try {
      const response = await fetch(`${this.AUTH_BASE_URL}/upload`, {
        method: 'POST',
        headers: this.getAuthHeaders(),
        body: JSON.stringify({
          file_name: fileName,
          file_content: fileContent // Base64 encoded
        })
      });

      if (!response.ok) {
        const errorText = await response.text();
        throw new Error(`Failed to upload document: ${response.status} - ${errorText}`);
      }

      const data = await response.json();
      return data;
    } catch (error) {
      console.error('Error uploading document:', error);
      throw error;
    }
  }

  async processDocument(documentId: string): Promise<ProcessResponse> {
    try {
      const response = await fetch(`${this.AUTH_BASE_URL}/process`, {
        method: 'POST',
        headers: this.getAuthHeaders(),
        body: JSON.stringify({
          document_id: documentId
        })
      });

      if (!response.ok) {
        const errorText = await response.text();
        throw new Error(`Failed to process document: ${response.status} - ${errorText}`);
      }

      const data = await response.json();
      return data;
    } catch (error) {
      console.error('Error processing document:', error);
      throw error;
    }
  }

  async askQuestion(question: string, mode: string, documentId?: string): Promise<AskResponse> {
    try {
      const response = await fetch(`${this.AUTH_BASE_URL}/ask`, {
        method: 'POST',
        headers: this.getAuthHeaders(),
        body: JSON.stringify({
          question,
          mode,
          document_id: documentId
        })
      });

      if (!response.ok) {
        const errorText = await response.text();
        throw new Error(`Failed to ask question: ${response.status} - ${errorText}`);
      }

      const data = await response.json();
      return data;
    } catch (error) {
      console.error('Error asking question:', error);
      throw error;
    }
  }
}

export const documentService = new DocumentService();
