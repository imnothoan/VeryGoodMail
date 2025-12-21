/**
 * Gemini AI Service for Email Summarization
 * Uses Google's Gemini 2.0 Flash API for email content summarization
 */

class GeminiService {
  constructor() {
    this.apiKey = process.env.GEMINI_API_KEY;
    this.baseUrl = 'https://generativelanguage.googleapis.com/v1beta/models/gemini-2.0-flash:generateContent';
    this.maxRetries = 3;
    this.retryDelay = 1000;
  }

  /**
   * Generate content using Gemini API
   * @param {string} prompt - The prompt to send
   * @returns {Promise<string>} - Generated response
   */
  async generateContent(prompt) {
    if (!this.apiKey) {
      throw new Error('Gemini API key not configured');
    }

    let lastError;
    
    for (let attempt = 1; attempt <= this.maxRetries; attempt++) {
      try {
        const response = await fetch(this.baseUrl, {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            'X-goog-api-key': this.apiKey
          },
          body: JSON.stringify({
            contents: [{
              parts: [{
                text: prompt
              }]
            }]
          })
        });

        if (!response.ok) {
          const errorData = await response.text();
          throw new Error(`Gemini API error: ${response.status} - ${errorData}`);
        }

        const data = await response.json();
        
        if (data.candidates && data.candidates[0] && data.candidates[0].content) {
          return data.candidates[0].content.parts[0].text;
        }
        
        throw new Error('Invalid response structure from Gemini API');
      } catch (error) {
        lastError = error;
        console.error(`Gemini API attempt ${attempt} failed:`, error.message);
        
        if (attempt < this.maxRetries) {
          await new Promise(resolve => setTimeout(resolve, this.retryDelay * attempt));
        }
      }
    }

    throw lastError;
  }

  /**
   * Summarize email content
   * @param {string} subject - Email subject
   * @param {string} body - Email body
   * @param {string} language - Output language ('vi' or 'en')
   * @returns {Promise<object>} - Summary object with title and content
   */
  async summarizeEmail(subject, body, language = 'vi') {
    const languageInstruction = language === 'vi' 
      ? 'Trả lời bằng tiếng Việt.'
      : 'Reply in English.';

    const prompt = `${languageInstruction}

Hãy tóm tắt email sau một cách ngắn gọn (tối đa 2-3 câu):

Tiêu đề: ${subject || 'Không có tiêu đề'}

Nội dung:
${body || 'Không có nội dung'}

Yêu cầu:
1. Tóm tắt ý chính của email
2. Nêu hành động cần thiết (nếu có)
3. Giữ ngắn gọn, súc tích`;

    try {
      const summary = await this.generateContent(prompt);
      return {
        success: true,
        summary: summary.trim(),
        language
      };
    } catch (error) {
      console.error('Email summarization failed:', error.message);
      return {
        success: false,
        summary: language === 'vi' 
          ? 'Không thể tạo tóm tắt. Vui lòng thử lại sau.'
          : 'Unable to generate summary. Please try again later.',
        error: error.message,
        language
      };
    }
  }

  /**
   * Generate smart reply suggestions
   * @param {string} emailContent - Original email content
   * @param {string} language - Response language
   * @returns {Promise<array>} - Array of reply suggestions
   */
  async generateSmartReplies(emailContent, language = 'vi') {
    const languageInstruction = language === 'vi'
      ? 'Tạo 3 gợi ý trả lời bằng tiếng Việt.'
      : 'Generate 3 reply suggestions in English.';

    const prompt = `${languageInstruction}

Email gốc:
${emailContent}

Yêu cầu:
1. Tạo 3 câu trả lời ngắn gọn phù hợp
2. Mỗi câu trả lời là một tùy chọn khác nhau (đồng ý, từ chối lịch sự, cần thêm thông tin)
3. Trả lời theo định dạng JSON array: ["reply1", "reply2", "reply3"]`;

    try {
      const response = await this.generateContent(prompt);
      
      // Try to parse JSON response
      const jsonMatch = response.match(/\[.*\]/s);
      if (jsonMatch) {
        return {
          success: true,
          replies: JSON.parse(jsonMatch[0]),
          language
        };
      }
      
      // Fallback: split by newlines
      const replies = response.split('\n')
        .filter(line => line.trim())
        .slice(0, 3);
      
      return {
        success: true,
        replies,
        language
      };
    } catch (error) {
      console.error('Smart reply generation failed:', error.message);
      return {
        success: false,
        replies: [],
        error: error.message,
        language
      };
    }
  }

  /**
   * Detect email sentiment
   * @param {string} content - Email content
   * @returns {Promise<object>} - Sentiment analysis result
   */
  async analyzeSentiment(content) {
    const prompt = `Analyze the sentiment of the following email and respond with ONLY a JSON object in this exact format:
{"sentiment": "positive|negative|neutral", "confidence": 0.0-1.0, "summary": "brief explanation"}

Email:
${content}`;

    try {
      const response = await this.generateContent(prompt);
      const jsonMatch = response.match(/\{.*\}/s);
      
      if (jsonMatch) {
        return {
          success: true,
          ...JSON.parse(jsonMatch[0])
        };
      }
      
      return {
        success: true,
        sentiment: 'neutral',
        confidence: 0.5,
        summary: 'Unable to determine sentiment'
      };
    } catch (error) {
      console.error('Sentiment analysis failed:', error.message);
      return {
        success: false,
        sentiment: 'unknown',
        confidence: 0,
        error: error.message
      };
    }
  }

  /**
   * Check if Gemini API is configured and working
   */
  async healthCheck() {
    try {
      if (!this.apiKey) {
        return { status: 'not_configured', message: 'Gemini API key not set' };
      }
      
      await this.generateContent('Say "OK" to confirm the API is working.');
      return { status: 'healthy', message: 'Gemini API is operational' };
    } catch (error) {
      return { status: 'error', message: error.message };
    }
  }
}

module.exports = new GeminiService();
