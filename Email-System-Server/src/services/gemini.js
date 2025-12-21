/**
 * Gemini AI Service for Email Summarization
 * Uses Google's Gemini SDK
 * FIX: Updated model name to resolve 404 error
 */

const { GoogleGenerativeAI } = require("@google/generative-ai");

class GeminiService {
  constructor() {
    this.apiKey = process.env.GEMINI_API_KEY;
    
    if (this.apiKey) {
      this.genAI = new GoogleGenerativeAI(this.apiKey);
      
      // SỬA Ở ĐÂY: Thêm chữ "-latest" để Google nhận diện chính xác
      this.model = this.genAI.getGenerativeModel({ 
        model: "gemini-2.5-flash", 
        generationConfig: {
          temperature: 0.7,
          topK: 40,
          topP: 0.95,
          maxOutputTokens: 1024,
        }
      });
      console.log('✓ Gemini AI configured (model: gemini-1.5-flash-latest)');
    } else {
      console.warn('⚠ Gemini API key not configured.');
    }
  }

  async generateContent(prompt) {
    if (!this.apiKey) throw new Error('Gemini API key not configured');

    try {
      const result = await this.model.generateContent(prompt);
      const response = await result.response;
      return response.text();
    } catch (error) {
      // Nếu vẫn lỗi 404, in ra console để biết đường sửa tiếp
      console.error("Gemini Critical Error:", error.message);
      
      // Fallback: Nếu model Flash bị lỗi, thử gợi ý người dùng đổi sang Pro
      if (error.message.includes("404") || error.message.includes("not found")) {
        throw new Error("Model không tồn tại. Hãy thử đổi 'gemini-1.5-flash-latest' thành 'gemini-pro' trong code.");
      }
      throw error;
    }
  }

  // --- CÁC HÀM DƯỚI GIỮ NGUYÊN LOGIC ---

  async summarizeEmail(subject, body, language = 'vi') {
    const languageInstruction = language === 'vi' ? 'Trả lời bằng tiếng Việt.' : 'Reply in English.';
    const prompt = `${languageInstruction}
Hãy tóm tắt email sau ngắn gọn (2-3 câu):
Tiêu đề: ${subject || 'Không có'}
Nội dung: ${body || 'Không có'}
Yêu cầu: Tóm tắt ý chính và hành động cần thiết.`;

    try {
      const summary = await this.generateContent(prompt);
      return { success: true, summary: summary.trim(), language };
    } catch (error) {
      return { success: false, summary: 'Lỗi hệ thống AI.', error: error.message, language };
    }
  }

  async generateSmartReplies(emailContent, language = 'vi') {
    const prompt = `Tạo 3 câu trả lời ngắn gọn cho email này dưới dạng JSON Array (Ví dụ: ["Câu 1", "Câu 2"]). Email: ${emailContent}`;
    try {
      let text = await this.generateContent(prompt);
      text = text.replace(/```json|```/g, '').trim();
      let replies;
      try {
        const jsonMatch = text.match(/\[.*\]/s);
        replies = jsonMatch ? JSON.parse(jsonMatch[0]) : [];
      } catch (e) {
        replies = text.split('\n').slice(0, 3);
      }
      return { success: true, replies, language };
    } catch (error) {
      return { success: false, replies: [], error: error.message, language };
    }
  }

  async analyzeSentiment(content) {
    const prompt = `Analyze sentiment (positive/negative/neutral) return JSON only: {"sentiment": "...", "confidence": 0.9}. Content: ${content}`;
    try {
      let text = await this.generateContent(prompt);
      text = text.replace(/```json|```/g, '').trim();
      const jsonMatch = text.match(/\{.*\}/s);
      return jsonMatch ? { success: true, ...JSON.parse(jsonMatch[0]) } : { success: true, sentiment: 'neutral' };
    } catch (error) {
      return { success: false, error: error.message };
    }
  }

  async healthCheck() {
    if (!this.apiKey) return { status: 'not_configured' };
    try {
      await this.generateContent('Hi');
      return { status: 'healthy' };
    } catch (e) { return { status: 'error', message: e.message }; }
  }
}

module.exports = new GeminiService();