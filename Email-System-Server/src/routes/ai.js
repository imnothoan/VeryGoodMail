const express = require('express');
const router = express.Router();
const geminiService = require('../services/gemini');
const vectorSpace = require('../services/vectorSpace');

// PhoBERT service URL (Python FastAPI)
const PHOBERT_URL = process.env.PHOBERT_URL || 'http://localhost:8000';

/**
 * POST /api/ai/classify
 * Classify email using PhoBERT (spam, sentiment, category)
 */
router.post('/classify', async (req, res) => {
  try {
    const { subject, body, language = 'vi' } = req.body;

    if (!subject && !body) {
      return res.status(400).json({ error: 'Subject or body is required' });
    }

    // Call PhoBERT service
    const response = await fetch(`${PHOBERT_URL}/classify`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ subject, body, language })
    });

    if (!response.ok) {
      throw new Error(`PhoBERT service error: ${response.status}`);
    }

    const result = await response.json();
    res.json(result);
  } catch (error) {
    console.error('Classification error:', error);
    
    // Fallback to rule-based classification if PhoBERT is unavailable
    res.json({
      is_spam: false,
      spam_confidence: 0.5,
      category: 'primary',
      category_confidence: 0.5,
      sentiment: 'neutral',
      sentiment_confidence: 0.5,
      fallback: true,
      message: 'Using fallback classification'
    });
  }
});

/**
 * POST /api/ai/summarize
 * Summarize email content using Gemini
 */
router.post('/summarize', async (req, res) => {
  try {
    const { subject, body, language = 'vi' } = req.body;

    if (!body) {
      return res.status(400).json({ error: 'Email body is required' });
    }

    const result = await geminiService.summarizeEmail(subject, body, language);
    res.json(result);
  } catch (error) {
    console.error('Summarization error:', error);
    res.status(500).json({ 
      success: false,
      error: 'Failed to summarize email',
      summary: language === 'vi' 
        ? 'Không thể tạo tóm tắt. Vui lòng thử lại sau.'
        : 'Unable to generate summary. Please try again later.'
    });
  }
});

/**
 * POST /api/ai/smart-reply
 * Generate smart reply suggestions using Gemini
 */
router.post('/smart-reply', async (req, res) => {
  try {
    const { content, language = 'vi' } = req.body;

    if (!content) {
      return res.status(400).json({ error: 'Email content is required' });
    }

    const result = await geminiService.generateSmartReplies(content, language);
    res.json(result);
  } catch (error) {
    console.error('Smart reply error:', error);
    res.status(500).json({ 
      success: false,
      error: 'Failed to generate smart replies',
      replies: []
    });
  }
});

/**
 * POST /api/ai/sentiment
 * Analyze email sentiment using PhoBERT
 */
router.post('/sentiment', async (req, res) => {
  try {
    const { text } = req.body;

    if (!text) {
      return res.status(400).json({ error: 'Text is required' });
    }

    // Call PhoBERT service
    const response = await fetch(`${PHOBERT_URL}/sentiment`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ text })
    });

    if (!response.ok) {
      throw new Error(`PhoBERT service error: ${response.status}`);
    }

    const result = await response.json();
    res.json(result);
  } catch (error) {
    console.error('Sentiment analysis error:', error);
    res.json({
      sentiment: 'neutral',
      confidence: 0.5,
      fallback: true
    });
  }
});

/**
 * POST /api/ai/search
 * Search emails using vector space model
 */
router.post('/search', async (req, res) => {
  try {
    const { supabase, user } = req;
    const { query, limit = 10, folder } = req.body;

    if (!query) {
      return res.status(400).json({ error: 'Search query is required' });
    }

    // First, get user's emails to build index
    const { data: emails, error } = await supabase
      .from('emails')
      .select('id, subject, snippet, ai_category')
      .eq('user_id', user.id)
      .eq('is_trashed', false)
      .limit(1000);

    if (error) {
      throw error;
    }

    // Clear and rebuild index
    vectorSpace.clearIndex();
    emails.forEach(email => {
      vectorSpace.addDocument(
        email.id, 
        `${email.subject} ${email.snippet || ''}`,
        { category: email.ai_category }
      );
    });

    // Perform search
    const filters = folder ? { category: folder } : {};
    const results = vectorSpace.search(query, limit, filters);

    res.json({
      results,
      total: results.length,
      query
    });
  } catch (error) {
    console.error('Search error:', error);
    res.status(500).json({ error: 'Failed to search emails' });
  }
});

/**
 * GET /api/ai/suggestions
 * Get search suggestions based on indexed content
 */
router.get('/suggestions', async (req, res) => {
  try {
    const { prefix, limit = 5 } = req.query;

    if (!prefix) {
      return res.status(400).json({ error: 'Prefix is required' });
    }

    const suggestions = vectorSpace.getSuggestions(prefix, parseInt(limit));
    res.json({ suggestions });
  } catch (error) {
    console.error('Suggestions error:', error);
    res.status(500).json({ error: 'Failed to get suggestions' });
  }
});

/**
 * POST /api/ai/batch-classify
 * Classify multiple emails at once
 */
router.post('/batch-classify', async (req, res) => {
  try {
    const { emails } = req.body;

    if (!emails || emails.length === 0) {
      return res.status(400).json({ error: 'Emails array is required' });
    }

    if (emails.length > 100) {
      return res.status(400).json({ error: 'Maximum 100 emails per batch' });
    }

    // Call PhoBERT service
    const response = await fetch(`${PHOBERT_URL}/batch-classify`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(emails)
    });

    if (!response.ok) {
      throw new Error(`PhoBERT service error: ${response.status}`);
    }

    const result = await response.json();
    res.json(result);
  } catch (error) {
    console.error('Batch classification error:', error);
    res.status(500).json({ 
      error: 'Failed to classify emails',
      results: emails.map(() => ({
        success: false,
        fallback: true
      }))
    });
  }
});

/**
 * GET /api/ai/health
 * Check health of AI services
 */
router.get('/health', async (req, res) => {
  try {
    const health = {
      gemini: await geminiService.healthCheck(),
      phobert: { status: 'unknown' },
      vectorSpace: vectorSpace.getStats()
    };

    // Check PhoBERT service
    try {
      const response = await fetch(`${PHOBERT_URL}/health`, {
        method: 'GET',
        signal: AbortSignal.timeout(5000) // 5 second timeout
      });
      
      if (response.ok) {
        health.phobert = await response.json();
      } else {
        health.phobert = { status: 'error', message: `HTTP ${response.status}` };
      }
    } catch (error) {
      health.phobert = { status: 'unavailable', message: error.message };
    }

    res.json(health);
  } catch (error) {
    console.error('Health check error:', error);
    res.status(500).json({ error: 'Failed to check AI health' });
  }
});

/**
 * POST /api/ai/train
 * Submit training data for PhoBERT (user feedback)
 */
router.post('/train', async (req, res) => {
  try {
    const { supabase, user } = req;
    const { text, label_type, label_value } = req.body;

    if (!text || !label_type || !label_value) {
      return res.status(400).json({ error: 'text, label_type, and label_value are required' });
    }

    // Validate label_type
    const validTypes = ['spam', 'sentiment', 'category'];
    if (!validTypes.includes(label_type)) {
      return res.status(400).json({ error: 'Invalid label_type' });
    }

    // Store training data
    const { error } = await supabase
      .from('ai_training_data')
      .insert({
        user_id: user.id,
        text_content: text,
        label_type,
        label_value,
        is_verified: false
      });

    if (error) {
      throw error;
    }

    res.json({ 
      message: 'Training data submitted',
      note: 'Data will be reviewed before being used for model improvement'
    });
  } catch (error) {
    console.error('Training data error:', error);
    res.status(500).json({ error: 'Failed to submit training data' });
  }
});

module.exports = router;
