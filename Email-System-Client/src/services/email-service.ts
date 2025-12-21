import { supabase } from '@/lib/supabase';
import { Email } from '@/types';

const API_URL = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:3001';

export type Folder = 'inbox' | 'sent' | 'drafts' | 'spam' | 'trash' | 'starred' | 'important' | 'social' | 'updates' | 'promotions' | 'archive';

export interface EmailFilters {
  folder?: Folder;
  page?: number;
  limit?: number;
  search?: string;
  is_read?: boolean;
  is_starred?: boolean;
}

export interface EmailsResponse {
  emails: Email[];
  pagination: {
    page: number;
    limit: number;
    total: number;
  };
}

class EmailService {
  private async getAuthToken(): Promise<string | null> {
    const { data: { session } } = await supabase.auth.getSession();
    return session?.access_token || null;
  }

  private async fetchWithAuth(url: string, options: RequestInit = {}): Promise<Response> {
    const token = await this.getAuthToken();
    
    if (!token) {
      throw new Error('Not authenticated');
    }

    return fetch(url, {
      ...options,
      headers: {
        ...options.headers,
        'Authorization': `Bearer ${token}`,
        'Content-Type': 'application/json',
      },
    });
  }

  async getEmails(filters: EmailFilters = {}): Promise<EmailsResponse> {
    const params = new URLSearchParams();
    
    if (filters.folder) params.append('folder', filters.folder);
    if (filters.page) params.append('page', filters.page.toString());
    if (filters.limit) params.append('limit', filters.limit.toString());
    if (filters.search) params.append('search', filters.search);
    if (filters.is_read !== undefined) params.append('is_read', filters.is_read.toString());
    if (filters.is_starred !== undefined) params.append('is_starred', filters.is_starred.toString());

    try {
      const response = await this.fetchWithAuth(`${API_URL}/api/emails?${params}`);
      
      if (!response.ok) {
        throw new Error(`Failed to fetch emails: ${response.status}`);
      }

      return await response.json();
    } catch (error) {
      console.error('Error fetching emails:', error);
      // Return empty result instead of throwing
      return {
        emails: [],
        pagination: { page: 1, limit: 50, total: 0 }
      };
    }
  }

  async getEmail(id: string): Promise<Email | null> {
    try {
      const response = await this.fetchWithAuth(`${API_URL}/api/emails/${id}`);
      
      if (!response.ok) {
        if (response.status === 404) {
          return null;
        }
        throw new Error(`Failed to fetch email: ${response.status}`);
      }

      return await response.json();
    } catch (error) {
      console.error('Error fetching email:', error);
      return null;
    }
  }

  async sendEmail(data: {
    to: string[];
    cc?: string[];
    bcc?: string[];
    subject: string;
    body_text: string;
    body_html?: string;
    is_draft?: boolean;
  }): Promise<{ success: boolean; email?: Email; error?: string }> {
    try {
      const response = await this.fetchWithAuth(`${API_URL}/api/emails`, {
        method: 'POST',
        body: JSON.stringify(data),
      });

      const result = await response.json();

      if (!response.ok) {
        return { success: false, error: result.error || 'Failed to send email' };
      }

      return { success: true, email: result.email };
    } catch (error) {
      console.error('Error sending email:', error);
      return { success: false, error: 'Network error. Please try again.' };
    }
  }

  async updateEmail(id: string, updates: Partial<Pick<Email, 'is_read' | 'is_starred' | 'is_draft'>> & { is_trashed?: boolean; is_spam?: boolean }): Promise<boolean> {
    try {
      const response = await this.fetchWithAuth(`${API_URL}/api/emails/${id}`, {
        method: 'PATCH',
        body: JSON.stringify(updates),
      });

      return response.ok;
    } catch (error) {
      console.error('Error updating email:', error);
      return false;
    }
  }

  async deleteEmail(id: string): Promise<boolean> {
    try {
      const response = await this.fetchWithAuth(`${API_URL}/api/emails/${id}`, {
        method: 'DELETE',
      });

      return response.ok;
    } catch (error) {
      console.error('Error deleting email:', error);
      return false;
    }
  }

  async bulkAction(action: string, emailIds: string[]): Promise<boolean> {
    try {
      const response = await this.fetchWithAuth(`${API_URL}/api/emails/bulk`, {
        method: 'POST',
        body: JSON.stringify({ action, email_ids: emailIds }),
      });

      return response.ok;
    } catch (error) {
      console.error('Error performing bulk action:', error);
      return false;
    }
  }
}

export const emailService = new EmailService();
