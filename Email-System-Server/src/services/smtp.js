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
      this.transporter = nodemailer.createTransport({
        host: process.env.SMTP_HOST,
        port: parseInt(process.env.SMTP_PORT || '587'),
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
   * @param {string} options.from - Sender address
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
    const mailOptions = {
      from: from || process.env.SMTP_FROM || process.env.SMTP_USER,
      to: Array.isArray(to) ? to.join(', ') : to,
      subject: subject || '(No subject)',
      text: text || '',
    };

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
        errorMessage = 'Recipient address rejected';
      } else if (error.responseCode === 552) {
        errorMessage = 'Message size exceeds limit';
      }
      
      return {
        success: false,
        error: errorMessage,
        details: process.env.NODE_ENV === 'development' ? error.message : undefined
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
