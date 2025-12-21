const express = require('express');
const router = express.Router();
const { v4: uuidv4 } = require('uuid');
const encryption = require('../utils/encryption');

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
      .select('*, labels:email_labels(label:labels(*))')
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
      // AI categories
      case 'important':
      case 'social':
      case 'promotions':
      case 'updates':
        query = query.eq('ai_category', folder).eq('is_trashed', false).eq('is_spam', false);
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
          snippet: email.snippet ? encryption.decrypt(email.snippet) : null
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
      is_draft = false
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

    // Create or find thread
    const threadId = uuidv4();
    
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
      id: uuidv4(),
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

    // TODO: Integrate with PhoBERT for spam/sentiment analysis
    // TODO: Send actual email via SMTP

    // Notify recipients via Socket.IO (if they're connected)
    if (!is_draft && to) {
      to.forEach(recipientEmail => {
        io.to(`user:${recipientEmail}`).emit('new-email', {
          ...email,
          body_text,
          body_html,
          snippet
        });
      });
    }

    res.status(201).json({
      message: is_draft ? 'Draft saved' : 'Email sent successfully',
      email: {
        ...email,
        body_text,
        body_html,
        snippet
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
