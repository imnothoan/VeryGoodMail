const express = require('express');
const router = express.Router();
const geminiService = require('../services/gemini');
const vectorSpace = require('../services/vectorSpace');
const naiveBayes = require('../services/naiveBayes'); // Enhanced Naive Bayes classifier

/**
 * POST /api/ai/classify
 * Classify email using Enhanced Naive Bayes (spam, sentiment, category)
 */
router.post('/classify', async (req, res) => {
  try {
    const { subject, body, language = 'vi' } = req.body;

    if (!subject && !body) {
      return res.status(400).json({ error: 'Subject or body is required' });
    }

    // Use Enhanced Naive Bayes classifier
    const result = naiveBayes.classifyEmail(subject, body);
    
    res.json({
      is_spam: result.isSpam,
      spam_confidence: result.spamScore,
      category: result.category,
      category_confidence: result.confidence / 100,
      sentiment: result.sentiment,
      sentiment_confidence: result.sentimentConfidence / 100,
      source: result.source,
      language
    });
  } catch (error) {
    console.error('Classification error:', error);
    
    // Fallback response
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
  const { subject, body, language = 'vi' } = req.body;
  
  try {
    if (!body) {
      return res.status(400).json({ error: 'Email body is required' });
    }

    // Check if Gemini is configured
    if (!process.env.GEMINI_API_KEY) {
      return res.json({
        success: false,
        summary: language === 'vi' 
          ? 'Trợ lý AI chưa được cấu hình. Vui lòng liên hệ quản trị viên.'
          : 'AI assistant is not configured. Please contact the administrator.',
        language,
        error: 'API key not configured'
      });
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
        : 'Unable to generate summary. Please try again later.',
      language
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

    // Check if Gemini is configured
    if (!process.env.GEMINI_API_KEY) {
      return res.json({
        success: false,
        replies: [],
        language,
        error: 'API key not configured'
      });
    }

    const result = await geminiService.generateSmartReplies(content, language);
    res.json(result);
  } catch (error) {
    console.error('Smart reply error:', error);
    res.status(500).json({ 
      success: false,
      error: 'Failed to generate smart replies',
      replies: [],
      language
    });
  }
});

/**
 * POST /api/ai/sentiment
 * Analyze email sentiment using Enhanced Naive Bayes
 */
router.post('/sentiment', async (req, res) => {
  try {
    const { text } = req.body;

    if (!text) {
      return res.status(400).json({ error: 'Text is required' });
    }

    // Use Enhanced Naive Bayes sentiment analyzer
    const result = naiveBayes.analyzeSentiment(text);
    
    res.json({
      sentiment: result.sentiment,
      confidence: result.confidence / 100,
      all_sentiments: result.allSentiments,
      source: 'naive_bayes_enhanced'
    });
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
 * Classify multiple emails at once using Enhanced Naive Bayes
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

    // Classify each email using Enhanced Naive Bayes
    const results = emails.map(email => {
      try {
        const classification = naiveBayes.classifyEmail(email.subject, email.body);
        return {
          success: true,
          is_spam: classification.isSpam,
          spam_score: classification.spamScore,
          category: classification.category,
          confidence: classification.confidence,
          sentiment: classification.sentiment,
          source: classification.source
        };
      } catch {
        return {
          success: false,
          is_spam: false,
          category: 'primary',
          confidence: 50,
          sentiment: 'neutral',
          fallback: true
        };
      }
    });

    res.json({ results });
  } catch (error) {
    console.error('Batch classification error:', error);
    res.status(500).json({ 
      error: 'Failed to classify emails',
      results: req.body.emails?.map(() => ({
        success: false,
        fallback: true
      })) || []
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
      naiveBayes: {
        status: 'healthy',
        categories: naiveBayes.getCategories(),
        sentiments: naiveBayes.getSentiments(),
      },
      vectorSpace: vectorSpace.getStats()
    };

    res.json(health);
  } catch (error) {
    console.error('Health check error:', error);
    res.status(500).json({ error: 'Failed to check AI health' });
  }
});

/**
 * POST /api/ai/train
 * Submit training data for classifier (user feedback)
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

    // Also train the in-memory classifier for immediate feedback
    try {
      if (label_type === 'category') {
        naiveBayes.addTrainingDocument(text, label_value);
      } else if (label_type === 'sentiment') {
        naiveBayes.addSentimentDocument(text, label_value);
      }
    } catch (trainError) {
      console.log('In-memory training skipped:', trainError.message);
    }

    res.json({ 
      message: 'Training data submitted',
      note: 'Classifier has been updated with your feedback'
    });
  } catch (error) {
    console.error('Training data error:', error);
    res.status(500).json({ error: 'Failed to submit training data' });
  }
});

module.exports = router;
