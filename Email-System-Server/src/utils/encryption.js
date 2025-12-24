const CryptoJS = require('crypto-js');

/**
 * Encryption utility for sensitive data
 * Uses AES-256 encryption for secure email content storage
 */
class EncryptionService {
  constructor() {
    this.secretKey = process.env.ENCRYPTION_KEY;
    if (!this.secretKey || this.secretKey.length < 32) {
      console.warn('WARNING: ENCRYPTION_KEY should be at least 32 characters for security');
    }
  }

  /**
   * Encrypt sensitive data
   * @param {string} data - Plain text data to encrypt
   * @returns {string} - Encrypted data
   */
  encrypt(data) {
    if (!data) return data;
    try {
      const encrypted = CryptoJS.AES.encrypt(data, this.secretKey).toString();
      return encrypted;
    } catch (error) {
      console.error('Encryption error:', error.message);
      throw new Error('Failed to encrypt data');
    }
  }

  /**
   * Decrypt sensitive data
   * Returns original data if decryption fails (for backwards compatibility with unencrypted data)
   * @param {string} encryptedData - Encrypted data
   * @returns {string} - Decrypted plain text or original data if not encrypted
   */
  decrypt(encryptedData) {
    if (!encryptedData) return encryptedData;
    
    try {
      // First, check if data looks like it might be encrypted (base64-like format)
      // CryptoJS encrypted strings typically start with 'U2F' (base64 encoded 'Sal' from 'Salted__')
      const looksEncrypted = /^[A-Za-z0-9+/=]+$/.test(encryptedData) && encryptedData.length > 20;
      
      if (!looksEncrypted) {
        // Data doesn't look encrypted, return as-is (backwards compatibility)
        return encryptedData;
      }
      
      const bytes = CryptoJS.AES.decrypt(encryptedData, this.secretKey);
      const decrypted = bytes.toString(CryptoJS.enc.Utf8);
      
      if (!decrypted) {
        // Decryption resulted in empty string - might be unencrypted data
        // Return original data for backwards compatibility
        return encryptedData;
      }
      
      return decrypted;
    } catch (error) {
      // If decryption fails, return original data (might be unencrypted legacy data)
      // This allows backwards compatibility with data stored before encryption was added
      return encryptedData;
    }
  }

  /**
   * Hash data using SHA256 (for searching encrypted content)
   * @param {string} data - Data to hash
   * @returns {string} - Hashed data
   */
  hash(data) {
    if (!data) return data;
    return CryptoJS.SHA256(data).toString();
  }
}

module.exports = new EncryptionService();
