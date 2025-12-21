import { supabase } from '@/lib/supabase';
import { Email, Attachment } from '@/types';

const API_URL = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:3001';

// Maximum file size: 50MB (Supabase free tier limit)
export const MAX_FILE_SIZE = 50 * 1024 * 1024;
export const MAX_FILE_SIZE_MB = 50;

// Allowed MIME types for attachments
export const ALLOWED_MIME_TYPES = [
  // Documents
  'application/pdf',
  'application/msword',
  'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
  'application/vnd.ms-excel',
  'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
  'application/vnd.ms-powerpoint',
  'application/vnd.openxmlformats-officedocument.presentationml.presentation',
  'text/plain',
  'text/csv',
  // Images
  'image/jpeg',
  'image/png',
  'image/gif',
  'image/webp',
  'image/svg+xml',
  // Archives
  'application/zip',
  'application/x-rar-compressed',
  'application/x-7z-compressed',
  // Audio/Video
  'audio/mpeg',
  'audio/wav',
  'video/mp4',
  'video/webm',
];

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

export interface UploadedFile {
  file: File;
  progress: number;
  status: 'pending' | 'uploading' | 'done' | 'error';
  error?: string;
  attachment?: Attachment;
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
      const errorMessage = error instanceof Error ? error.message : 'Unknown error';
      console.error('Error fetching emails:', errorMessage);
      // Return empty result with error information for debugging
      return {
        emails: [],
        pagination: { page: 1, limit: 50, total: 0 }
      };
    }
  }

  async getUnreadCounts(): Promise<Record<Folder, number>> {
    try {
      const response = await this.fetchWithAuth(`${API_URL}/api/emails/counts/unread`);
      
      if (!response.ok) {
        throw new Error(`Failed to fetch unread counts: ${response.status}`);
      }

      return await response.json();
    } catch (error) {
      console.error('Error fetching unread counts:', error);
      return {
        inbox: 0,
        sent: 0,
        drafts: 0,
        spam: 0,
        trash: 0,
        starred: 0,
        important: 0,
        social: 0,
        updates: 0,
        promotions: 0,
        archive: 0
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

  /**
   * Validate file before upload
   * @param file - File to validate
   * @returns { valid: boolean; error?: string }
   */
  validateFile(file: File): { valid: boolean; error?: string } {
    // Check file size
    if (file.size > MAX_FILE_SIZE) {
      return {
        valid: false,
        error: `File "${file.name}" is too large. Maximum size is ${MAX_FILE_SIZE_MB}MB.`
      };
    }

    // Check MIME type
    if (!ALLOWED_MIME_TYPES.includes(file.type) && !file.type.startsWith('text/')) {
      return {
        valid: false,
        error: `File type "${file.type || 'unknown'}" is not allowed for "${file.name}".`
      };
    }

    return { valid: true };
  }

  /**
   * Upload a file attachment to Supabase Storage
   * @param file - File to upload
   * @param onProgress - Progress callback
   * @returns Promise<{ success: boolean; attachment?: Attachment; error?: string }>
   */
  async uploadAttachment(
    file: File,
    onProgress?: (progress: number) => void
  ): Promise<{ success: boolean; attachment?: Attachment; error?: string }> {
    // Validate file first
    const validation = this.validateFile(file);
    if (!validation.valid) {
      return { success: false, error: validation.error };
    }

    try {
      const { data: { session } } = await supabase.auth.getSession();
      if (!session?.user) {
        return { success: false, error: 'Not authenticated' };
      }

      // Generate unique filename
      const timestamp = Date.now();
      const safeFileName = file.name.replace(/[^a-zA-Z0-9.-]/g, '_');
      const filePath = `${session.user.id}/${timestamp}_${safeFileName}`;

      // Upload to Supabase Storage
      const { data, error } = await supabase.storage
        .from('media')
        .upload(filePath, file, {
          cacheControl: '3600',
          upsert: false,
        });

      if (error) {
        console.error('Upload error:', error);
        return { success: false, error: error.message };
      }

      // Get public URL
      const { data: urlData } = supabase.storage
        .from('media')
        .getPublicUrl(data.path);

      const attachment: Attachment = {
        id: data.id || `temp_${timestamp}`,
        email_id: '', // Will be set when email is sent
        filename: file.name,
        content_type: file.type,
        size_bytes: file.size,
        storage_path: data.path,
        url: urlData.publicUrl,
      };

      // Call progress with 100% when done
      onProgress?.(100);

      return { success: true, attachment };
    } catch (error) {
      console.error('Error uploading attachment:', error);
      return { success: false, error: 'Failed to upload file. Please try again.' };
    }
  }

  /**
   * Delete an attachment from Supabase Storage
   * @param storagePath - Path to the file in storage
   */
  async deleteAttachment(storagePath: string): Promise<boolean> {
    try {
      const { error } = await supabase.storage
        .from('media')
        .remove([storagePath]);

      if (error) {
        console.error('Delete error:', error);
        return false;
      }

      return true;
    } catch (error) {
      console.error('Error deleting attachment:', error);
      return false;
    }
  }

  /**
   * Send email with attachments
   */
  async sendEmailWithAttachments(data: {
    to: string[];
    cc?: string[];
    bcc?: string[];
    subject: string;
    body_text: string;
    body_html?: string;
    is_draft?: boolean;
    attachments?: Attachment[];
  }): Promise<{ success: boolean; email?: Email; error?: string }> {
    try {
      const response = await this.fetchWithAuth(`${API_URL}/api/emails`, {
        method: 'POST',
        body: JSON.stringify({
          ...data,
          attachments: data.attachments?.map(a => ({
            filename: a.filename,
            content_type: a.content_type,
            size_bytes: a.size_bytes,
            storage_path: a.storage_path,
          })),
        }),
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

  /**
   * Format file size for display
   */
  formatFileSize(bytes: number): string {
    if (bytes === 0) return '0 Bytes';
    const k = 1024;
    const sizes = ['Bytes', 'KB', 'MB', 'GB'];
    const i = Math.floor(Math.log(bytes) / Math.log(k));
    return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i];
  }
}

export const emailService = new EmailService();
