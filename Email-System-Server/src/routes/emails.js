const express = require('express');
const router = express.Router();
const { v4: uuidv4 } = require('uuid');
const { createClient } = require('@supabase/supabase-js');
const encryption = require('../utils/encryption');
const smtpService = require('../services/smtp');
const phobertService = require('../services/phobert');
const naiveBayes = require('../services/naiveBayes'); // Fallback classifier

// Create admin Supabase client for cross-user operations
const supabaseAdmin = createClient(
  process.env.SUPABASE_URL,
  process.env.SUPABASE_SERVICE_ROLE_KEY,
  {
    auth: {
      autoRefreshToken: false,
      persistSession: false
    }
  }
);

/**
 * GET /api/emails/counts/unread
 * Get unread email counts per folder/category
 * NOTE: This route MUST be before /:id to avoid "counts" being matched as an ID
 */
router.get('/counts/unread', async (req, res) => {
  try {
    const { supabase, user } = req;

    // Get counts for each folder
    const { data: emails, error } = await supabase
      .from('emails')
      .select('is_read, is_draft, is_sent, is_spam, is_trashed, is_starred, ai_category')
      .eq('user_id', user.id);

    if (error) throw error;

    const counts = {
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

    emails.forEach(email => {
      const isUnread = !email.is_read;
      
      // Count inbox (not sent, draft, spam, or trashed)
      if (!email.is_sent && !email.is_draft && !email.is_spam && !email.is_trashed && isUnread) {
        counts.inbox++;
      }
      
      // Count drafts
      if (email.is_draft && !email.is_trashed) {
        counts.drafts++;
      }
      
      // Count spam
      if (email.is_spam && !email.is_trashed && isUnread) {
        counts.spam++;
      }
      
      // Count starred
      if (email.is_starred && !email.is_trashed && isUnread) {
        counts.starred++;
      }
      
      // Count by AI category (only for received emails, not sent)
      if (!email.is_trashed && !email.is_spam && !email.is_draft && !email.is_sent && isUnread) {
        const category = email.ai_category;
        if (category && counts.hasOwnProperty(category)) {
          counts[category]++;
        }
      }
    });

    res.json(counts);
  } catch (error) {
    console.error('Error getting unread counts:', error);
    res.status(500).json({ error: 'Failed to get unread counts' });
  }
});

/**
 * GET /api/emails
 * Get emails for the authenticated user
 */
router.get('/', async (req, res) => {
  try {
    const { supabase, user } = req;
    const { 
      folder = 'inbox', 
      page = 1, 
      limit = 50,
      search,
      is_read,
      is_starred
    } = req.query;

    let query = supabase
      .from('emails')
      .select('*, labels:email_labels(label:labels(*)), attachments(*)')
      .eq('user_id', user.id)
      .order('date', { ascending: false });

    // Apply folder filter
    switch (folder) {
      case 'inbox':
        query = query.eq('is_trashed', false).eq('is_spam', false).eq('is_draft', false).eq('is_sent', false);
        break;
      case 'sent':
        query = query.eq('is_sent', true).eq('is_trashed', false);
        break;
      case 'drafts':
        query = query.eq('is_draft', true).eq('is_trashed', false);
        break;
      case 'spam':
        query = query.eq('is_spam', true).eq('is_trashed', false);
        break;
      case 'trash':
        query = query.eq('is_trashed', true);
        break;
      case 'starred':
        query = query.eq('is_starred', true).eq('is_trashed', false);
        break;
      case 'archive':
        query = query.eq('is_trashed', false).eq('is_spam', false).eq('is_draft', false);
        // Note: Archive functionality would need additional flag in database
        break;
      // AI categories - filter by ai_category and exclude sent/draft/spam/trash
      case 'important':
      case 'social':
      case 'promotions':
      case 'updates':
      case 'primary':
        query = query
          .eq('ai_category', folder)
          .eq('is_trashed', false)
          .eq('is_spam', false)
          .eq('is_draft', false)
          .eq('is_sent', false);
        break;
    }

    // Apply additional filters
    if (is_read !== undefined) {
      query = query.eq('is_read', is_read === 'true');
    }
    if (is_starred !== undefined) {
      query = query.eq('is_starred', is_starred === 'true');
    }
    if (search) {
      query = query.ilike('subject', `%${search}%`);
    }

    // Pagination
    const offset = (parseInt(page) - 1) * parseInt(limit);
    query = query.range(offset, offset + parseInt(limit) - 1);

    const { data: emails, error, count } = await query;

    if (error) {
      throw error;
    }

    // Decrypt email content
    const decryptedEmails = emails.map(email => {
      try {
        return {
          ...email,
          body_text: email.body_text ? encryption.decrypt(email.body_text) : null,
          body_html: email.body_html ? encryption.decrypt(email.body_html) : null,
          snippet: email.snippet ? encryption.decrypt(email.snippet) : null,
          has_attachments: email.attachments && email.attachments.length > 0
        };
      } catch (decryptError) {
        // If decryption fails, return original (might be unencrypted legacy data)
        return email;
      }
    });

    res.json({
      emails: decryptedEmails,
      pagination: {
        page: parseInt(page),
        limit: parseInt(limit),
        total: count
      }
    });
  } catch (error) {
    console.error('Error fetching emails:', error);
    res.status(500).json({ error: 'Failed to fetch emails' });
  }
});

/**
 * GET /api/emails/:id
 * Get a single email by ID
 */
router.get('/:id', async (req, res) => {
  try {
    const { supabase, user } = req;
    const { id } = req.params;

    const { data: email, error } = await supabase
      .from('emails')
      .select('*, labels:email_labels(label:labels(*))')
      .eq('id', id)
      .eq('user_id', user.id)
      .single();

    if (error) {
      if (error.code === 'PGRST116') {
        return res.status(404).json({ error: 'Email not found' });
      }
      throw error;
    }

    // Decrypt email content
    const decryptedEmail = {
      ...email,
      body_text: email.body_text ? encryption.decrypt(email.body_text) : null,
      body_html: email.body_html ? encryption.decrypt(email.body_html) : null,
      snippet: email.snippet ? encryption.decrypt(email.snippet) : null
    };

    res.json(decryptedEmail);
  } catch (error) {
    console.error('Error fetching email:', error);
    res.status(500).json({ error: 'Failed to fetch email' });
  }
});

/**
 * POST /api/emails
 * Create a new email (send or draft)
 */
router.post('/', async (req, res) => {
  try {
    const { supabase, user } = req;
    const io = req.app.get('io');
    const {
      to,
      cc,
      bcc,
      subject,
      body_text,
      body_html,
      is_draft = false,
      attachments = []
    } = req.body;

    // Validate required fields for sending
    if (!is_draft) {
      if (!to || to.length === 0) {
        return res.status(400).json({ error: 'At least one recipient is required' });
      }
      if (!subject) {
        return res.status(400).json({ error: 'Subject is required' });
      }
    }

    // Create snippet from body (first 100 chars)
    const snippet = body_text ? body_text.substring(0, 100) : '';

    // Encrypt sensitive content
    const encryptedBody = body_text ? encryption.encrypt(body_text) : null;
    const encryptedHtml = body_html ? encryption.encrypt(body_html) : null;
    const encryptedSnippet = snippet ? encryption.encrypt(snippet) : null;

    // AI Classification - Priority: PhoBERT > Naive Bayes fallback
    let aiCategory = 'primary';
    let aiSpamScore = 0;
    let isSpam = false;
    let aiSentiment = 'neutral';
    let classificationSource = 'none';
    
    if (body_text || subject) {
      const textToClassify = `${subject || ''} ${body_text || ''}`;
      
      // Try PhoBERT first (if available)
      try {
        const phobertResult = await phobertService.classifyEmail(subject, body_text);
        
        if (phobertResult) {
          // PhoBERT classification succeeded
          aiCategory = phobertResult.category;
          isSpam = phobertResult.isSpam;
          aiSpamScore = phobertResult.spamScore;
          aiSentiment = phobertResult.sentiment || 'neutral';
          classificationSource = 'phobert';
          console.log('Email classified by PhoBERT:', { aiCategory, isSpam, aiSentiment });
        } else {
          // PhoBERT not available, use Naive Bayes fallback
          throw new Error('PhoBERT not available, using fallback');
        }
      } catch (phobertError) {
        // Fallback to Naive Bayes
        console.log('Using Naive Bayes fallback:', phobertError.message);
        try {
          const classification = naiveBayes.classify(textToClassify);
          aiCategory = classification.category;
          isSpam = classification.isSpam;
          aiSpamScore = isSpam ? classification.confidence / 100 : 0;
          classificationSource = 'naive_bayes';
          
          // Map category names
          if (aiCategory === 'ham') aiCategory = 'primary';
          if (aiCategory === 'spam') {
            aiCategory = 'spam';
            isSpam = true;
          }
        } catch (classifyError) {
          console.log('Classification skipped:', classifyError.message);
        }
      }
    }

    // Create or find thread
    const threadId = uuidv4();
    const emailId = uuidv4();
    
    await supabase
      .from('threads')
      .insert({
        id: threadId,
        user_id: user.id,
        subject: subject || '(No subject)',
        snippet: encryptedSnippet,
        last_message_at: new Date().toISOString()
      });

    // Create email
    const emailData = {
      id: emailId,
      thread_id: threadId,
      user_id: user.id,
      sender_name: user.user_metadata?.full_name || user.email,
      sender_email: user.email,
      recipient_emails: to || [],
      cc_emails: cc || [],
      bcc_emails: bcc || [],
      subject: subject || '(No subject)',
      snippet: encryptedSnippet,
      body_text: encryptedBody,
      body_html: encryptedHtml,
      is_draft,
      is_sent: !is_draft,
      is_spam: isSpam,
      ai_category: aiCategory,
      ai_spam_score: aiSpamScore,
      ai_sentiment: aiSentiment,
      ai_classification_source: classificationSource,
      date: new Date().toISOString()
    };

    const { data: email, error } = await supabase
      .from('emails')
      .insert(emailData)
      .select()
      .single();

    if (error) {
      throw error;
    }

    // Save attachments to database
    if (attachments.length > 0) {
      const attachmentRecords = attachments.map(att => ({
        id: uuidv4(),
        email_id: emailId,
        user_id: user.id,
        filename: att.filename,
        content_type: att.content_type,
        size_bytes: att.size_bytes,
        storage_path: att.storage_path,
      }));

      await supabase
        .from('attachments')
        .insert(attachmentRecords);
    }

    // Handle email delivery (internal users + SMTP for external)
    let smtpResult = null;
    const internalDeliveries = [];
    const externalRecipients = [];
    
    if (!is_draft && to && to.length > 0) {
      // Separate internal vs external recipients
      const EMAIL_DOMAIN = 'verygoodmail.tech';
      
      for (const recipientEmail of to) {
        if (recipientEmail.endsWith(`@${EMAIL_DOMAIN}`)) {
          // Internal recipient - check if user exists using admin client
          const { data: recipientProfile } = await supabaseAdmin
            .from('profiles')
            .select('id')
            .eq('email', recipientEmail)
            .single();
          
          if (recipientProfile) {
            internalDeliveries.push({
              email: recipientEmail,
              userId: recipientProfile.id
            });
          } else {
            // User doesn't exist, treat as external
            externalRecipients.push(recipientEmail);
          }
        } else {
          externalRecipients.push(recipientEmail);
        }
      }

      // Create copies for internal recipients (in their inbox) using admin client
      for (const recipient of internalDeliveries) {
        const recipientEmailId = uuidv4();
        const recipientThreadId = uuidv4();
        
        // Create thread for recipient
        await supabaseAdmin
          .from('threads')
          .insert({
            id: recipientThreadId,
            user_id: recipient.userId,
            subject: subject || '(No subject)',
            snippet: encryptedSnippet,
            last_message_at: new Date().toISOString()
          });
        
        // Create email copy for recipient
        const recipientEmailData = {
          id: recipientEmailId,
          thread_id: recipientThreadId,
          user_id: recipient.userId,
          sender_name: user.user_metadata?.full_name || user.email,
          sender_email: user.email,
          recipient_emails: to || [],
          cc_emails: cc || [],
          bcc_emails: bcc || [],
          subject: subject || '(No subject)',
          snippet: encryptedSnippet,
          body_text: encryptedBody,
          body_html: encryptedHtml,
          is_draft: false,
          is_sent: false, // This is received, not sent
          is_spam: isSpam,
          ai_category: aiCategory,
          ai_spam_score: aiSpamScore,
          ai_sentiment: aiSentiment,
          ai_classification_source: classificationSource,
          is_read: false,
          date: new Date().toISOString()
        };

        const { error: recipientError } = await supabaseAdmin
          .from('emails')
          .insert(recipientEmailData);

        if (recipientError) {
          console.error('Failed to deliver to internal recipient:', recipient.email, recipientError);
        } else {
          console.log('Email delivered to internal recipient:', recipient.email);
          
          // Copy attachments for recipient
          if (attachments.length > 0) {
            const recipientAttachments = attachments.map(att => ({
              id: uuidv4(),
              email_id: recipientEmailId,
              user_id: recipient.userId,
              filename: att.filename,
              content_type: att.content_type,
              size_bytes: att.size_bytes,
              storage_path: att.storage_path,
            }));

            await supabaseAdmin
              .from('attachments')
              .insert(recipientAttachments);
          }
        }
      }

      // Send via SMTP for external recipients
      if (externalRecipients.length > 0) {
        // Get public URLs for attachments
        const attachmentUrls = [];
        for (const att of attachments) {
          if (att.storage_path) {
            const { data: urlData } = supabase.storage
              .from('media')
              .getPublicUrl(att.storage_path);
            attachmentUrls.push({
              ...att,
              url: urlData?.publicUrl
            });
          }
        }

        smtpResult = await smtpService.sendEmail({
          from: user.email,
          to: externalRecipients,
          cc,
          bcc,
          subject: subject || '(No subject)',
          text: body_text,
          html: body_html,
          attachments: attachmentUrls
        });

        if (!smtpResult.success && !smtpResult.local) {
          console.warn('SMTP send failed for external recipients:', smtpResult.error);
        }
      }
    }

    // Notify recipients via Socket.IO (if they're connected)
    if (!is_draft && to) {
      to.forEach(recipientEmail => {
        io.to(`user:${recipientEmail}`).emit('new-email', {
          ...email,
          body_text,
          body_html,
          snippet,
          attachments
        });
      });
    }

    res.status(201).json({
      message: is_draft ? 'Draft saved' : 'Email sent successfully',
      email: {
        ...email,
        body_text,
        body_html,
        snippet,
        attachments
      },
      delivery: {
        internal: internalDeliveries.map(d => d.email),
        external: externalRecipients,
        smtp: smtpResult
      }
    });
  } catch (error) {
    console.error('Error creating email:', error);
    res.status(500).json({ error: 'Failed to create email' });
  }
});

/**
 * PATCH /api/emails/:id
 * Update email (mark as read, star, move to trash, etc.)
 */
router.patch('/:id', async (req, res) => {
  try {
    const { supabase, user } = req;
    const { id } = req.params;
    const updates = req.body;

    // Only allow certain fields to be updated
    const allowedFields = ['is_read', 'is_starred', 'is_trashed', 'is_spam', 'is_draft'];
    const filteredUpdates = {};
    
    Object.keys(updates).forEach(key => {
      if (allowedFields.includes(key)) {
        filteredUpdates[key] = updates[key];
      }
    });

    // Add timestamp for trash
    if (filteredUpdates.is_trashed === true) {
      filteredUpdates.trashed_at = new Date().toISOString();
    }

    filteredUpdates.updated_at = new Date().toISOString();

    const { data: email, error } = await supabase
      .from('emails')
      .update(filteredUpdates)
      .eq('id', id)
      .eq('user_id', user.id)
      .select()
      .single();

    if (error) {
      throw error;
    }

    res.json({ message: 'Email updated', email });
  } catch (error) {
    console.error('Error updating email:', error);
    res.status(500).json({ error: 'Failed to update email' });
  }
});

/**
 * DELETE /api/emails/:id
 * Permanently delete an email
 */
router.delete('/:id', async (req, res) => {
  try {
    const { supabase, user } = req;
    const { id } = req.params;

    const { error } = await supabase
      .from('emails')
      .delete()
      .eq('id', id)
      .eq('user_id', user.id);

    if (error) {
      throw error;
    }

    res.json({ message: 'Email deleted permanently' });
  } catch (error) {
    console.error('Error deleting email:', error);
    res.status(500).json({ error: 'Failed to delete email' });
  }
});

/**
 * POST /api/emails/bulk
 * Bulk operations on emails
 */
router.post('/bulk', async (req, res) => {
  try {
    const { supabase, user } = req;
    const { action, email_ids } = req.body;

    if (!email_ids || email_ids.length === 0) {
      return res.status(400).json({ error: 'No emails selected' });
    }

    let updates = {};

    switch (action) {
      case 'mark_read':
        updates = { is_read: true };
        break;
      case 'mark_unread':
        updates = { is_read: false };
        break;
      case 'star':
        updates = { is_starred: true };
        break;
      case 'unstar':
        updates = { is_starred: false };
        break;
      case 'trash':
        updates = { is_trashed: true, trashed_at: new Date().toISOString() };
        break;
      case 'spam':
        updates = { is_spam: true };
        break;
      case 'restore':
        updates = { is_trashed: false, is_spam: false, trashed_at: null };
        break;
      default:
        return res.status(400).json({ error: 'Invalid action' });
    }

    updates.updated_at = new Date().toISOString();

    const { error } = await supabase
      .from('emails')
      .update(updates)
      .in('id', email_ids)
      .eq('user_id', user.id);

    if (error) {
      throw error;
    }

    res.json({ message: `${email_ids.length} emails updated`, action });
  } catch (error) {
    console.error('Error in bulk operation:', error);
    res.status(500).json({ error: 'Failed to perform bulk operation' });
  }
});

module.exports = router;
