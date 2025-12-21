/**
 * SMTP Email Service for VeryGoodMail
 * Handles sending real emails via SMTP (Titan Email or other providers)
 * 
 * © 2025 VeryGoodMail by Hoàn
 */

const nodemailer = require('nodemailer');

class SMTPService {
  constructor() {
    // Check for required environment variables
    this.isConfigured = !!(
      process.env.SMTP_HOST &&
      process.env.SMTP_USER &&
      process.env.SMTP_PASS
    );

    if (this.isConfigured) {
      // Parse port with validation
      const port = parseInt(process.env.SMTP_PORT || '587', 10);
      const validPort = !isNaN(port) && port > 0 && port <= 65535 ? port : 587;
      
      this.transporter = nodemailer.createTransport({
        host: process.env.SMTP_HOST,
        port: validPort,
        secure: process.env.SMTP_SECURE === 'true', // true for 465, false for other ports
        auth: {
          user: process.env.SMTP_USER,
          pass: process.env.SMTP_PASS,
        },
        // Connection pool for better performance under high load
        pool: true,
        maxConnections: 5,
        maxMessages: 100,
        // Timeout settings
        connectionTimeout: 30000, // 30 seconds
        greetingTimeout: 30000,
        socketTimeout: 60000,
      });

      // Verify connection on startup
      this.verifyConnection();
    } else {
      console.warn('SMTP not configured. Emails will be stored locally only.');
    }
  }

  /**
   * Verify SMTP connection
   */
  async verifyConnection() {
    if (!this.isConfigured) return false;

    try {
      await this.transporter.verify();
      console.log('✓ SMTP connection verified');
      return true;
    } catch (error) {
      console.error('✗ SMTP connection failed:', error.message);
      return false;
    }
  }

  /**
   * Send an email via SMTP
   * @param {object} options - Email options
   * @param {string} options.from - Sender email address
   * @param {string} options.fromName - Sender display name
   * @param {string|string[]} options.to - Recipient(s)
   * @param {string|string[]} options.cc - CC recipient(s)
   * @param {string|string[]} options.bcc - BCC recipient(s)
   * @param {string} options.subject - Email subject
   * @param {string} options.text - Plain text body
   * @param {string} options.html - HTML body
   * @param {array} options.attachments - Array of attachment objects
   * @returns {Promise<object>} - Result with messageId or error
   */
  async sendEmail(options) {
    if (!this.isConfigured) {
      console.log('SMTP not configured, email stored locally only');
      return {
        success: true,
        local: true,
        message: 'Email stored locally (SMTP not configured)'
      };
    }

    const {
      from,
      fromName,
      to,
      cc,
      bcc,
      subject,
      text,
      html,
      attachments = []
    } = options;

    // Validate required fields
    if (!to || (Array.isArray(to) && to.length === 0)) {
      return { success: false, error: 'Recipient is required' };
    }

    // Build mail options
    // SMTP servers typically require 'from' to match the authenticated user
    // Use SMTP_FROM or SMTP_USER as the actual sender
    // Include the user's display name in the "from" field for better UX
    const smtpFrom = process.env.SMTP_FROM || process.env.SMTP_USER;
    const userRequestedFrom = from || smtpFrom;
    
    // Format the from address with display name
    // If user has a display name, format as "Display Name <email@domain.com>"
    // Otherwise just use the SMTP email address
    let fromAddress = smtpFrom;
    if (fromName) {
      // Escape any special characters in the name
      const safeName = fromName.replace(/[<>"]/g, '');
      fromAddress = `${safeName} <${smtpFrom}>`;
    }
    
    const mailOptions = {
      from: fromAddress,
      to: Array.isArray(to) ? to.join(', ') : to,
      subject: subject || '(No subject)',
      text: text || '',
    };
    
    // If original sender is different from SMTP user, add Reply-To header
    // This allows recipients to reply directly to the actual sender
    // Also include the display name in Reply-To for consistency
    if (userRequestedFrom && userRequestedFrom !== smtpFrom) {
      if (fromName) {
        const safeName = fromName.replace(/[<>"]/g, '');
        mailOptions.replyTo = `${safeName} <${userRequestedFrom}>`;
      } else {
        mailOptions.replyTo = userRequestedFrom;
      }
    }

    // Add CC if provided
    if (cc && cc.length > 0) {
      mailOptions.cc = Array.isArray(cc) ? cc.join(', ') : cc;
    }

    // Add BCC if provided
    if (bcc && bcc.length > 0) {
      mailOptions.bcc = Array.isArray(bcc) ? bcc.join(', ') : bcc;
    }

    // Add HTML body if provided
    if (html) {
      mailOptions.html = html;
    }

    // Add attachments if provided
    if (attachments.length > 0) {
      mailOptions.attachments = attachments.map(att => ({
        filename: att.filename,
        path: att.url || att.storage_path,
        contentType: att.content_type,
      }));
    }

    try {
      const info = await this.transporter.sendMail(mailOptions);
      
      console.log('Email sent successfully:', info.messageId);
      
      return {
        success: true,
        messageId: info.messageId,
        response: info.response,
        accepted: info.accepted,
        rejected: info.rejected
      };
    } catch (error) {
      console.error('SMTP send error:', error.message);
      
      // Return appropriate error message
      let errorMessage = 'Failed to send email';
      
      if (error.code === 'ECONNREFUSED') {
        errorMessage = 'Unable to connect to email server';
      } else if (error.code === 'EAUTH') {
        errorMessage = 'Email authentication failed';
      } else if (error.responseCode === 550) {
        errorMessage = 'Recipient address not found or rejected';
      } else if (error.responseCode === 551 || error.responseCode === 553) {
        errorMessage = 'Invalid recipient address';
      } else if (error.responseCode === 552) {
        errorMessage = 'Message size exceeds limit';
      } else if (error.responseCode === 554) {
        errorMessage = 'Transaction failed - message rejected';
      } else if (error.code === 'ENOTFOUND') {
        errorMessage = 'Recipient domain not found';
      } else if (error.code === 'ETIMEDOUT' || error.code === 'ESOCKET') {
        errorMessage = 'Connection timeout - please try again';
      } else if (error.message?.toLowerCase().includes('address')) {
        errorMessage = 'Invalid email address';
      }
      
      return {
        success: false,
        error: errorMessage,
        // Don't expose sensitive error details even in development
      };
    }
  }

  /**
   * Send email with retry logic
   * @param {object} options - Email options
   * @param {number} maxRetries - Maximum retry attempts
   * @returns {Promise<object>} - Result
   */
  async sendEmailWithRetry(options, maxRetries = 3) {
    let lastError;
    
    for (let attempt = 1; attempt <= maxRetries; attempt++) {
      try {
        const result = await this.sendEmail(options);
        if (result.success) {
          return result;
        }
        lastError = result.error;
      } catch (error) {
        lastError = error.message;
      }
      
      if (attempt < maxRetries) {
        // Wait before retry (exponential backoff)
        await new Promise(resolve => setTimeout(resolve, 1000 * attempt));
      }
    }
    
    return { success: false, error: lastError };
  }

  /**
   * Check if SMTP is properly configured
   */
  isAvailable() {
    return this.isConfigured;
  }

  /**
   * Get SMTP service status
   */
  async getStatus() {
    if (!this.isConfigured) {
      return {
        status: 'not_configured',
        message: 'SMTP credentials not set'
      };
    }

    try {
      await this.transporter.verify();
      return {
        status: 'healthy',
        message: 'SMTP connection is working'
      };
    } catch (error) {
      return {
        status: 'error',
        message: error.message
      };
    }
  }
}

module.exports = new SMTPService();
