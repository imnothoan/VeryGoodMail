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
   * @param {string} encryptedData - Encrypted data
   * @returns {string} - Decrypted plain text
   */
  decrypt(encryptedData) {
    if (!encryptedData) return encryptedData;
    try {
      const bytes = CryptoJS.AES.decrypt(encryptedData, this.secretKey);
      const decrypted = bytes.toString(CryptoJS.enc.Utf8);
      if (!decrypted) {
        throw new Error('Decryption resulted in empty string');
      }
      return decrypted;
    } catch (error) {
      console.error('Decryption error:', error.message);
      throw new Error('Failed to decrypt data');
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
