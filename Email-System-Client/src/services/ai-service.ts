import { supabase } from '@/lib/supabase';

const API_URL = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:3001';

// Constants for AI fallback values
const DEFAULT_CONFIDENCE = 0.5;
const DEFAULT_CATEGORY = 'primary';
const DEFAULT_SENTIMENT = 'neutral' as const;

export interface SummarizeResult {
  success: boolean;
  summary: string;
  language: string;
  error?: string;
}

export interface SmartReplyResult {
  success: boolean;
  replies: string[];
  language: string;
  error?: string;
}

export interface ClassifyResult {
  is_spam: boolean;
  spam_confidence: number;
  category: string;
  category_confidence: number;
  sentiment: 'positive' | 'negative' | 'neutral';
  sentiment_confidence: number;
  fallback?: boolean;
}

export interface SearchResult {
  results: Array<{
    id: string;
    score: number;
    metadata?: Record<string, unknown>;
  }>;
  total: number;
  query: string;
}

class AIService {
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

  /**
   * Summarize email content using Gemini AI
   */
  async summarizeEmail(subject: string, body: string, language: 'vi' | 'en' = 'vi'): Promise<SummarizeResult> {
    try {
      const response = await this.fetchWithAuth(`${API_URL}/api/ai/summarize`, {
        method: 'POST',
        body: JSON.stringify({ subject, body, language }),
      });

      const result = await response.json();

      if (!response.ok) {
        return {
          success: false,
          summary: language === 'vi' 
            ? 'Không thể tạo tóm tắt. Vui lòng thử lại.' 
            : 'Unable to generate summary. Please try again.',
          language,
          error: result.error,
        };
      }

      return result;
    } catch (error) {
      console.error('Error summarizing email:', error);
      return {
        success: false,
        summary: language === 'vi' 
          ? 'Lỗi kết nối. Vui lòng thử lại.' 
          : 'Connection error. Please try again.',
        language,
        error: 'Network error',
      };
    }
  }

  /**
   * Generate smart reply suggestions using Gemini AI
   */
  async generateSmartReplies(content: string, language: 'vi' | 'en' = 'vi'): Promise<SmartReplyResult> {
    try {
      const response = await this.fetchWithAuth(`${API_URL}/api/ai/smart-reply`, {
        method: 'POST',
        body: JSON.stringify({ content, language }),
      });

      const result = await response.json();

      if (!response.ok) {
        return {
          success: false,
          replies: [],
          language,
          error: result.error,
        };
      }

      return result;
    } catch (error) {
      console.error('Error generating smart replies:', error);
      return {
        success: false,
        replies: [],
        language,
        error: 'Network error',
      };
    }
  }

  /**
   * Classify email (spam detection, sentiment, category)
   */
  async classifyEmail(subject: string, body: string, language: 'vi' | 'en' = 'vi'): Promise<ClassifyResult> {
    try {
      const response = await this.fetchWithAuth(`${API_URL}/api/ai/classify`, {
        method: 'POST',
        body: JSON.stringify({ subject, body, language }),
      });

      return await response.json();
    } catch (error) {
      console.error('Error classifying email:', error);
      // Return fallback result
      return {
        is_spam: false,
        spam_confidence: DEFAULT_CONFIDENCE,
        category: DEFAULT_CATEGORY,
        category_confidence: DEFAULT_CONFIDENCE,
        sentiment: DEFAULT_SENTIMENT,
        sentiment_confidence: DEFAULT_CONFIDENCE,
        fallback: true,
      };
    }
  }

  /**
   * Search emails using vector space model
   */
  async searchEmails(query: string, limit: number = 10, folder?: string): Promise<SearchResult> {
    try {
      const response = await this.fetchWithAuth(`${API_URL}/api/ai/search`, {
        method: 'POST',
        body: JSON.stringify({ query, limit, folder }),
      });

      if (!response.ok) {
        throw new Error('Search failed');
      }

      return await response.json();
    } catch (error) {
      console.error('Error searching emails:', error);
      return {
        results: [],
        total: 0,
        query,
      };
    }
  }

  /**
   * Check AI services health status
   */
  async checkHealth(): Promise<{ gemini: { status: string }; phobert: { status: string }; vectorSpace: { status: string } }> {
    try {
      const response = await this.fetchWithAuth(`${API_URL}/api/ai/health`);
      
      if (!response.ok) {
        throw new Error('Health check failed');
      }

      return await response.json();
    } catch (error) {
      console.error('Error checking AI health:', error);
      return {
        gemini: { status: 'unknown' },
        phobert: { status: 'unknown' },
        vectorSpace: { status: 'unknown' },
      };
    }
  }
}

export const aiService = new AIService();
