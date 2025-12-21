/**
 * PhoBERT AI Service for Vietnamese Email Classification
 * 
 * This service connects to a PhoBERT model served via FastAPI.
 * The model should be trained on Google Colab and deployed as a REST API.
 * 
 * Features:
 * - Spam Detection (spam vs ham)
 * - Sentiment Analysis (positive, negative, neutral)
 * - Email Category Classification (important, social, promotions, updates, primary)
 * 
 * © 2025 VeryGoodMail by Hoàn
 */

const PHOBERT_URL = process.env.PHOBERT_URL || 'http://localhost:8000';
const PHOBERT_TIMEOUT = 10000; // 10 seconds timeout

class PhoBERTService {
  constructor() {
    this.baseUrl = PHOBERT_URL;
    this.isAvailable = false;
    this.lastHealthCheck = null;
    this.healthCheckInterval = 60000; // Check every minute
    
    // Check service availability on startup
    this.checkHealth();
  }

  /**
   * Check if PhoBERT service is available
   */
  async checkHealth() {
    try {
      const controller = new AbortController();
      const timeoutId = setTimeout(() => controller.abort(), 5000);

      const response = await fetch(`${this.baseUrl}/health`, {
        method: 'GET',
        signal: controller.signal,
      });

      clearTimeout(timeoutId);

      if (response.ok) {
        this.isAvailable = true;
        this.lastHealthCheck = Date.now();
        console.log('✓ PhoBERT service is available at', this.baseUrl);
        return true;
      }
    } catch (error) {
      this.isAvailable = false;
      console.log('⚠ PhoBERT service not available:', error.message);
    }
    return false;
  }

  /**
   * Check if we should use PhoBERT (service is available and healthy)
   */
  async shouldUsePhoBERT() {
    // Re-check health if it's been too long
    if (!this.lastHealthCheck || Date.now() - this.lastHealthCheck > this.healthCheckInterval) {
      await this.checkHealth();
    }
    return this.isAvailable;
  }

  /**
   * Classify email content using PhoBERT
   * @param {string} subject - Email subject
   * @param {string} body - Email body text
   * @returns {Promise<object>} - Classification result
   */
  async classifyEmail(subject, body) {
    if (!await this.shouldUsePhoBERT()) {
      return null; // Signal to use fallback
    }

    try {
      const controller = new AbortController();
      const timeoutId = setTimeout(() => controller.abort(), PHOBERT_TIMEOUT);

      const response = await fetch(`${this.baseUrl}/classify`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          subject: subject || '',
          body: body || '',
          text: `${subject || ''} ${body || ''}`.trim(),
        }),
        signal: controller.signal,
      });

      clearTimeout(timeoutId);

      if (!response.ok) {
        throw new Error(`PhoBERT API error: ${response.status}`);
      }

      const result = await response.json();
      
      return {
        category: result.category || 'primary',
        isSpam: result.is_spam || false,
        spamScore: result.spam_score || 0,
        sentiment: result.sentiment || 'neutral',
        sentimentScore: result.sentiment_score || 0,
        confidence: result.confidence || 0,
        source: 'phobert',
      };
    } catch (error) {
      console.error('PhoBERT classification error:', error.message);
      this.isAvailable = false; // Mark as unavailable
      return null; // Signal to use fallback
    }
  }

  /**
   * Detect spam using PhoBERT
   * @param {string} text - Text to analyze
   * @returns {Promise<object>} - Spam detection result
   */
  async detectSpam(text) {
    if (!await this.shouldUsePhoBERT()) {
      return null;
    }

    try {
      const controller = new AbortController();
      const timeoutId = setTimeout(() => controller.abort(), PHOBERT_TIMEOUT);

      const response = await fetch(`${this.baseUrl}/spam`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ text }),
        signal: controller.signal,
      });

      clearTimeout(timeoutId);

      if (!response.ok) {
        throw new Error(`PhoBERT spam API error: ${response.status}`);
      }

      const result = await response.json();
      
      return {
        isSpam: result.is_spam || false,
        spamScore: result.spam_score || 0,
        confidence: result.confidence || 0,
        source: 'phobert',
      };
    } catch (error) {
      console.error('PhoBERT spam detection error:', error.message);
      return null;
    }
  }

  /**
   * Analyze sentiment using PhoBERT
   * @param {string} text - Text to analyze
   * @returns {Promise<object>} - Sentiment analysis result
   */
  async analyzeSentiment(text) {
    if (!await this.shouldUsePhoBERT()) {
      return null;
    }

    try {
      const controller = new AbortController();
      const timeoutId = setTimeout(() => controller.abort(), PHOBERT_TIMEOUT);

      const response = await fetch(`${this.baseUrl}/sentiment`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ text }),
        signal: controller.signal,
      });

      clearTimeout(timeoutId);

      if (!response.ok) {
        throw new Error(`PhoBERT sentiment API error: ${response.status}`);
      }

      const result = await response.json();
      
      return {
        sentiment: result.sentiment || 'neutral', // positive, negative, neutral
        score: result.score || 0,
        confidence: result.confidence || 0,
        source: 'phobert',
      };
    } catch (error) {
      console.error('PhoBERT sentiment analysis error:', error.message);
      return null;
    }
  }

  /**
   * Get service status
   */
  getStatus() {
    return {
      available: this.isAvailable,
      url: this.baseUrl,
      lastHealthCheck: this.lastHealthCheck,
    };
  }
}

module.exports = new PhoBERTService();
