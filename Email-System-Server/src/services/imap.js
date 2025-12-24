/**
 * IMAP Email Receiving Service for VeryGoodMail
 * Handles receiving real emails via IMAP (Titan Email or other providers)
 * 
 * This service uses IMAP IDLE for real-time email notifications.
 * IMAP IDLE keeps a persistent connection and receives push notifications
 * when new emails arrive - no polling needed!
 * 
 * Benefits of IMAP IDLE:
 * - Near real-time delivery (< 1 second)
 * - Low resource usage (no constant polling)
 * - Efficient for high-traffic scenarios
 * 
 * © 2025 VeryGoodMail by Hoàn
 */

const { ImapFlow } = require('imapflow');
const { simpleParser } = require('mailparser');
const { v4: uuidv4 } = require('uuid');
const { createClient } = require('@supabase/supabase-js');
const encryption = require('../utils/encryption');

// Configuration constants
const BACKOFF_MULTIPLIER = 1.5;
const MAX_BACKOFF_DELAY = 60000; // 60 seconds max
const UID_CACHE_MAX_SIZE = 10000;
const UID_CACHE_CLEANUP_SIZE = 5000;

class IMAPService {
  constructor() {
    // Check for required environment variables
    // IMAP_HOST, IMAP_USER, IMAP_PASS are required
    // IMAP_PORT defaults to 993, IMAP_SECURE defaults to true
    this.isConfigured = !!(
      process.env.IMAP_HOST &&
      process.env.IMAP_USER &&
      process.env.IMAP_PASS
    );

    // Validate optional settings
    if (this.isConfigured) {
      const port = parseInt(process.env.IMAP_PORT || '993', 10);
      if (isNaN(port) || port <= 0 || port > 65535) {
        console.warn('⚠ Invalid IMAP_PORT, using default 993');
      }
    }

    // Admin Supabase client for cross-user operations
    this.supabaseAdmin = null;
    
    // IDLE state (real-time listening)
    this.isListening = false;
    this.processedUIDs = new Set(); // Track processed message UIDs to avoid duplicates
    
    // Connection state
    this.client = null;
    this.isConnected = false;
    this.reconnectAttempts = 0;
    this.maxReconnectAttempts = 10;
    this.reconnectDelay = 5000; // Start with 5 seconds
    this.shouldReconnect = true; // Flag to control reconnection behavior
    
    // Socket.IO instance for real-time notifications
    this.io = null;
    
    // Cleanup interval for processed UIDs
    this.cleanupInterval = null;
    
    // Statistics
    this.stats = {
      emailsReceived: 0,
      lastEmailTime: null,
      connectionStartTime: null,
      reconnections: 0,
    };

    if (this.isConfigured) {
      this.initSupabase();
      console.log('✓ IMAP service configured (IDLE mode for real-time)');
    } else {
      console.warn('⚠ IMAP not configured. External emails cannot be received.');
      console.warn('  Set IMAP_HOST, IMAP_USER, and IMAP_PASS to enable receiving.');
    }
  }

  /**
   * Initialize Supabase admin client
   */
  initSupabase() {
    if (!process.env.SUPABASE_URL || !process.env.SUPABASE_SERVICE_ROLE_KEY) {
      console.error('Supabase credentials not configured for IMAP service');
      return;
    }

    this.supabaseAdmin = createClient(
      process.env.SUPABASE_URL,
      process.env.SUPABASE_SERVICE_ROLE_KEY,
      {
        auth: {
          autoRefreshToken: false,
          persistSession: false
        }
      }
    );
  }

  /**
   * Create IMAP client with optimized settings
   */
  createClient() {
    const port = parseInt(process.env.IMAP_PORT || '993', 10);
    const secure = process.env.IMAP_SECURE !== 'false'; // Default to true for port 993

    return new ImapFlow({
      host: process.env.IMAP_HOST,
      port: port,
      secure: secure,
      auth: {
        user: process.env.IMAP_USER,
        pass: process.env.IMAP_PASS,
      },
      logger: false,
      emitLogs: false,
      // IDLE settings - RFC 2177
      // Most servers require re-IDLE every 29 minutes
      // We use 25 minutes to be safe
      idleTimeout: 25 * 60 * 1000,
    });
  }

  /**
   * Connect to IMAP server
   */
  async connect() {
    if (!this.isConfigured) {
      return false;
    }

    try {
      this.client = this.createClient();
      
      // Set up event handlers before connecting
      this.setupEventHandlers();
      
      await this.client.connect();
      this.isConnected = true;
      this.reconnectAttempts = 0;
      this.reconnectDelay = 5000;
      this.stats.connectionStartTime = new Date();
      
      console.log('✓ IMAP connection established');
      return true;
    } catch (error) {
      console.error('✗ IMAP connection failed:', error.message);
      this.isConnected = false;
      return false;
    }
  }

  /**
   * Set up event handlers for the IMAP client
   */
  setupEventHandlers() {
    if (!this.client) return;

    // Handle connection close
    this.client.on('close', async () => {
      console.log('IMAP connection closed');
      this.isConnected = false;
      this.isListening = false;
      
      // Attempt reconnection if we should
      if (this.shouldReconnect) {
        await this.handleReconnect();
      }
    });

    // Handle errors
    this.client.on('error', (error) => {
      console.error('IMAP error:', error.message);
    });
  }

  /**
   * Handle reconnection with exponential backoff
   */
  async handleReconnect() {
    if (this.reconnectAttempts >= this.maxReconnectAttempts) {
      console.error(`Max reconnection attempts (${this.maxReconnectAttempts}) reached`);
      return;
    }

    this.reconnectAttempts++;
    this.stats.reconnections++;
    
    const delay = Math.min(this.reconnectDelay * Math.pow(BACKOFF_MULTIPLIER, this.reconnectAttempts - 1), MAX_BACKOFF_DELAY);
    console.log(`Reconnecting in ${delay / 1000}s (attempt ${this.reconnectAttempts}/${this.maxReconnectAttempts})`);
    
    await new Promise(resolve => setTimeout(resolve, delay));
    
    const connected = await this.connect();
    if (connected && this.isListening) {
      // Resume listening
      this.startListening(this.io);
    }
  }

  /**
   * Disconnect from IMAP server
   */
  async disconnect() {
    this.shouldReconnect = false;
    this.isListening = false;
    
    if (this.client) {
      try {
        await this.client.logout();
      } catch {
        // Ignore logout errors
      }
      this.client = null;
      this.isConnected = false;
    }
    
    console.log('IMAP disconnected');
  }

  /**
   * Start listening for new emails using IMAP IDLE
   * This is the main method for real-time email receiving
   * 
   * @param {object} io - Socket.IO instance for real-time notifications
   */
  async startListening(io = null) {
    if (!this.isConfigured) {
      console.log('IMAP not configured, cannot start listening');
      return false;
    }

    if (this.isListening) {
      console.log('IMAP already listening');
      return true;
    }

    this.io = io;
    this.shouldReconnect = true;

    // Connect if not connected
    if (!this.isConnected) {
      const connected = await this.connect();
      if (!connected) {
        return false;
      }
    }

    try {
      // First, process any existing unread emails
      await this.processExistingUnread();
      
      // Start IDLE loop for real-time notifications
      this.isListening = true;
      this.idleLoop();
      
      // Start periodic cleanup of processed UIDs (every 30 minutes)
      if (this.cleanupInterval) {
        clearInterval(this.cleanupInterval);
      }
      this.cleanupInterval = setInterval(() => {
        this.cleanupProcessedUIDs();
      }, 30 * 60 * 1000);
      
      console.log('✓ IMAP IDLE started - listening for new emails in real-time');
      return true;
    } catch (error) {
      console.error('Failed to start IMAP listening:', error.message);
      this.isListening = false;
      return false;
    }
  }

  /**
   * Process existing unread emails on startup
   */
  async processExistingUnread() {
    if (!this.client || !this.isConnected) return;

    try {
      const lock = await this.client.getMailboxLock('INBOX');
      
      try {
        // Search for unread emails
        const unreadUIDs = await this.client.search({ seen: false });
        
        if (unreadUIDs.length > 0) {
          console.log(`Processing ${unreadUIDs.length} existing unread emails...`);
          
          for (const uid of unreadUIDs) {
            if (!this.processedUIDs.has(uid)) {
              await this.fetchAndProcessEmail(uid);
              this.processedUIDs.add(uid);
            }
          }
        }
      } finally {
        lock.release();
      }
    } catch (error) {
      console.error('Error processing existing unread:', error.message);
    }
  }

  /**
   * IDLE loop - the heart of real-time email receiving
   * Uses IMAP IDLE command to wait for new emails
   */
  async idleLoop() {
    while (this.isListening && this.isConnected && this.client) {
      try {
        const lock = await this.client.getMailboxLock('INBOX');
        
        try {
          // Wait for new emails using IDLE
          // This will block until either:
          // 1. A new email arrives (EXISTS response)
          // 2. The IDLE timeout is reached (25 minutes)
          // 3. The connection is closed
          
          const idlePromise = this.client.idle();
          
          // Set up listener for new messages during IDLE
          const existsHandler = async (data) => {
            if (data.path === 'INBOX') {
              console.log(`New email notification received! (${data.count} total)`);
              
              // Fetch the newest message
              try {
                const newestUID = await this.getNewestUID();
                if (newestUID && !this.processedUIDs.has(newestUID)) {
                  await this.fetchAndProcessEmail(newestUID);
                  this.processedUIDs.add(newestUID);
                }
              } catch (fetchError) {
                console.error('Error fetching new email:', fetchError.message);
              }
            }
          };
          
          this.client.on('exists', existsHandler);
          
          // Wait for IDLE to complete (timeout or new mail)
          await idlePromise;
          
          // Remove the exists handler
          this.client.off('exists', existsHandler);
          
        } finally {
          lock.release();
        }
        
        // Small delay before next IDLE cycle
        await new Promise(resolve => setTimeout(resolve, 100));
        
      } catch (error) {
        if (this.isListening) {
          console.error('IDLE error:', error.message);
          // Will attempt reconnect via the 'close' event handler
        }
        break;
      }
    }
  }

  /**
   * Get the UID of the newest email in INBOX
   */
  async getNewestUID() {
    try {
      const status = await this.client.status('INBOX', { uidNext: true, messages: true });
      if (status.messages > 0) {
        // Fetch the last message's UID
        const messages = await this.client.search({ seq: `${status.messages}:*` });
        return messages[messages.length - 1];
      }
    } catch (error) {
      console.error('Error getting newest UID:', error.message);
    }
    return null;
  }

  /**
   * Fetch and process a single email by UID
   * @param {number} uid - Message UID
   */
  async fetchAndProcessEmail(uid) {
    try {
      // Fetch the message
      const message = await this.client.fetchOne(uid, {
        uid: true,
        envelope: true,
        source: true,
        flags: true,
      }, { uid: true });

      if (!message) {
        console.log(`Message ${uid} not found`);
        return;
      }

      await this.processIncomingEmail(message);
      
    } catch (error) {
      console.error(`Error fetching email ${uid}:`, error.message);
    }
  }

  /**
   * Process an incoming email message
   * @param {object} message - Raw IMAP message
   */
  async processIncomingEmail(message) {
    try {
      // Parse email content
      const parsed = await simpleParser(message.source);
      
      const envelope = message.envelope;
      const senderEmail = envelope.from?.[0]?.address || parsed.from?.value?.[0]?.address;
      const senderName = envelope.from?.[0]?.name || parsed.from?.value?.[0]?.name || senderEmail;
      
      // Get recipient emails - these are the users in our system
      // Include To, CC, and also check X-Original-To header (for catch-all/forwarded emails)
      const toAddresses = (envelope.to || parsed.to?.value || []).map(addr => addr.address?.toLowerCase()).filter(Boolean);
      const ccAddresses = (envelope.cc || parsed.cc?.value || []).map(addr => addr.address?.toLowerCase()).filter(Boolean);
      
      // Check for X-Original-To or Delivered-To headers (used in forwarding/catch-all scenarios)
      const originalTo = parsed.headers?.get('x-original-to');
      const deliveredTo = parsed.headers?.get('delivered-to');
      
      // Combine all possible recipient addresses
      let allRecipients = [...new Set([
        ...toAddresses, 
        ...ccAddresses,
        ...(originalTo ? [originalTo.toLowerCase()] : []),
        ...(deliveredTo ? [deliveredTo.toLowerCase()] : []),
      ])];
      
      if (allRecipients.length === 0) {
        console.log('No recipient addresses found, skipping email');
        return;
      }

      const subject = envelope.subject || parsed.subject || '(No subject)';
      const bodyText = parsed.text || '';
      const bodyHtml = parsed.html || '';
      const date = envelope.date || parsed.date || new Date();

      console.log(`📧 Processing: "${subject}" from ${senderEmail}`);
      console.log(`   Recipients: ${allRecipients.join(', ')}`);

      // Find users in our system that match the recipient emails
      const EMAIL_DOMAIN = process.env.EMAIL_DOMAIN || 'verygoodmail.tech';
      
      // Filter to only our domain recipients
      const ourDomainRecipients = allRecipients.filter(email => 
        email && email.endsWith(`@${EMAIL_DOMAIN}`)
      );
      
      if (ourDomainRecipients.length === 0) {
        console.log(`   No recipients for our domain (@${EMAIL_DOMAIN})`);
        return;
      }
      
      let deliveredCount = 0;
      let notFoundRecipients = [];
      
      for (const recipientEmail of ourDomainRecipients) {
        // Find user by email
        const { data: userProfile, error: profileError } = await this.supabaseAdmin
          .from('profiles')
          .select('id, email, full_name, avatar_url')
          .eq('email', recipientEmail)
          .single();

        if (profileError || !userProfile) {
          console.log(`   User not found: ${recipientEmail}`);
          notFoundRecipients.push(recipientEmail);
          continue;
        }

        // Deliver email to this user
        await this.deliverEmailToUser(userProfile, {
          senderName,
          senderEmail,
          toAddresses,
          ccAddresses,
          subject,
          bodyText,
          bodyHtml,
          date,
          attachments: parsed.attachments || [],
        });
        
        deliveredCount++;
      }

      if (deliveredCount > 0) {
        this.stats.emailsReceived++;
        this.stats.lastEmailTime = new Date();
        console.log(`✓ Email delivered to ${deliveredCount} user(s)`);
      }
      
      if (notFoundRecipients.length > 0) {
        console.log(`⚠ Could not find users for: ${notFoundRecipients.join(', ')}`);
        // TODO: Could implement bounce email or store in a "pending" queue
      }
      
    } catch (error) {
      console.error('Error processing incoming email:', error.message);
    }
  }

  /**
   * Deliver an email to a specific user
   * @param {object} user - User profile { id, email }
   * @param {object} emailData - Parsed email data
   */
  async deliverEmailToUser(user, emailData) {
    try {
      const {
        senderName,
        senderEmail,
        toAddresses,
        ccAddresses,
        subject,
        bodyText,
        bodyHtml,
        date,
        attachments,
      } = emailData;

      // Create snippet
      const snippet = bodyText ? bodyText.substring(0, 100) : '';

      // Encrypt sensitive content
      const encryptedBody = bodyText ? encryption.encrypt(bodyText) : null;
      const encryptedHtml = bodyHtml ? encryption.encrypt(bodyHtml) : null;
      const encryptedSnippet = snippet ? encryption.encrypt(snippet) : null;

      // AI-powered classification (basic implementation)
      const { isSpam, aiCategory, aiSpamScore } = this.classifyEmail(senderEmail, subject, bodyText);

      // Create thread
      const threadId = uuidv4();
      const emailId = uuidv4();

      await this.supabaseAdmin
        .from('threads')
        .insert({
          id: threadId,
          user_id: user.id,
          subject: subject,
          snippet: encryptedSnippet,
          last_message_at: date.toISOString()
        });

      // Create email record
      const emailRecord = {
        id: emailId,
        thread_id: threadId,
        user_id: user.id,
        sender_name: senderName,
        sender_email: senderEmail,
        recipient_emails: toAddresses,
        cc_emails: ccAddresses,
        bcc_emails: [],
        subject: subject,
        snippet: encryptedSnippet,
        body_text: encryptedBody,
        body_html: encryptedHtml,
        is_draft: false,
        is_sent: false,
        is_spam: isSpam,
        ai_category: aiCategory,
        ai_spam_score: aiSpamScore,
        ai_sentiment: 'neutral',
        is_read: false,
        date: date.toISOString()
      };

      const { error: insertError } = await this.supabaseAdmin
        .from('emails')
        .insert(emailRecord);

      if (insertError) {
        throw new Error(`Failed to insert email: ${insertError.message}`);
      }

      // Handle attachments (basic implementation)
      if (attachments && attachments.length > 0) {
        console.log(`  📎 Email has ${attachments.length} attachment(s)`);
        // TODO: Implement attachment storage to Supabase
      }

      // Notify user via Socket.IO if connected (real-time update!)
      if (this.io) {
        // Send all required fields for proper mail list display
        this.io.to(`user:${user.id}`).emit('new-email', {
          id: emailId,
          thread_id: threadId,
          user_id: user.id,
          sender_name: senderName,
          sender_email: senderEmail,
          sender_avatar_url: null, // External senders don't have avatar
          recipient_emails: toAddresses,
          cc_emails: ccAddresses,
          subject,
          snippet,
          body_text: bodyText, // Include body text for preview
          date: date.toISOString(),
          is_read: false,
          is_starred: false,
          is_draft: false,
          is_sent: false,
          is_spam: isSpam,
          is_trashed: false,
          ai_category: aiCategory,
          ai_spam_score: aiSpamScore,
          has_attachments: attachments && attachments.length > 0,
          attachments: [], // TODO: Include attachment info when implemented
        });
        
        console.log(`📣 WebSocket notification sent to user:${user.id}`);
      }

      return emailId;
    } catch (error) {
      console.error(`Failed to deliver email to ${user.email}:`, error.message);
      throw error;
    }
  }

  /**
   * Basic email classification
   * @param {string} senderEmail - Sender email address
   * @param {string} subject - Email subject
   * @param {string} bodyText - Email body text
   * @returns {object} Classification result
   */
  classifyEmail(senderEmail, subject, bodyText) {
    let isSpam = false;
    let aiCategory = 'primary';
    let aiSpamScore = 0;

    const lowerBody = (bodyText || '').toLowerCase();
    const lowerSubject = (subject || '').toLowerCase();
    const lowerSender = (senderEmail || '').toLowerCase();
    
    // Check if sender is from our own domain - trusted sender, never spam
    const EMAIL_DOMAIN = process.env.EMAIL_DOMAIN || 'verygoodmail.tech';
    const senderDomain = lowerSender.split('@')[1] || '';
    const isInternalSender = senderDomain === EMAIL_DOMAIN.toLowerCase();
    
    // Internal emails from our domain are NEVER spam
    if (isInternalSender) {
      return { isSpam: false, aiCategory: 'primary', aiSpamScore: 0 };
    }

    // Spam detection keywords (only for external emails)
    const spamKeywords = [
      'viagra', 'lottery', 'winner', 'prince', 'inheritance', 
      'urgent transfer', 'million dollars', 'bank account', 'wire transfer',
      'click here now', 'act now', 'limited time', 'free money'
    ];
    
    for (const keyword of spamKeywords) {
      if (lowerBody.includes(keyword) || lowerSubject.includes(keyword)) {
        isSpam = true;
        aiSpamScore = 0.85;
        aiCategory = 'spam';
        break;
      }
    }

    // Category detection (if not spam)
    if (!isSpam) {
      // Social networks
      const socialDomains = ['facebook.com', 'twitter.com', 'linkedin.com', 'instagram.com', 'tiktok.com', 'youtube.com'];
      if (socialDomains.some(d => senderDomain.includes(d))) {
        aiCategory = 'social';
      }
      // Promotions
      else if (['noreply', 'newsletter', 'marketing', 'promo', 'deals', 'offer'].some(k => lowerSender.includes(k))) {
        aiCategory = 'promotions';
      }
      // Updates/Notifications
      else if (['update', 'notification', 'alert', 'info', 'confirm', 'verify'].some(k => lowerSender.includes(k))) {
        aiCategory = 'updates';
      }
      // Important (basic heuristics)
      else if (lowerSubject.includes('urgent') || lowerSubject.includes('important') || lowerSubject.includes('action required')) {
        aiCategory = 'important';
      }
    }

    return { isSpam, aiCategory, aiSpamScore };
  }

  /**
   * Stop listening for emails
   */
  async stopListening() {
    this.isListening = false;
    
    // Clear cleanup interval
    if (this.cleanupInterval) {
      clearInterval(this.cleanupInterval);
      this.cleanupInterval = null;
    }
    
    await this.disconnect();
    console.log('IMAP listening stopped');
  }

  /**
   * Get service status
   */
  getStatus() {
    return {
      configured: this.isConfigured,
      connected: this.isConnected,
      listening: this.isListening,
      stats: {
        ...this.stats,
        uptime: this.stats.connectionStartTime 
          ? Math.round((Date.now() - this.stats.connectionStartTime.getTime()) / 1000)
          : 0,
        processedUIDs: this.processedUIDs.size,
      }
    };
  }

  /**
   * Manually trigger a check for new emails
   * Useful for testing or when IDLE might have missed something
   */
  async checkNow() {
    if (!this.isConnected) {
      return { success: false, error: 'Not connected' };
    }

    try {
      await this.processExistingUnread();
      return { success: true };
    } catch (error) {
      return { success: false, error: error.message };
    }
  }

  /**
   * Clean up old processed UIDs to prevent memory growth
   */
  cleanupProcessedUIDs() {
    if (this.processedUIDs.size > UID_CACHE_MAX_SIZE) {
      const uidsArray = Array.from(this.processedUIDs);
      this.processedUIDs = new Set(uidsArray.slice(-UID_CACHE_CLEANUP_SIZE));
      console.log(`Cleaned up processed UIDs cache (${UID_CACHE_MAX_SIZE} -> ${UID_CACHE_CLEANUP_SIZE})`);
    }
  }
}

// Singleton instance
module.exports = new IMAPService();
