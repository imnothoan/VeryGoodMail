/**
 * Vector Space Model for Email Search
 * Implements TF-IDF based document similarity for searching emails
 */
const natural = require('natural');

class VectorSpaceSearch {
  constructor() {
    this.tfidf = new natural.TfIdf();
    this.documents = [];
    this.tokenizer = new natural.WordTokenizer();
    this.stemmer = natural.PorterStemmer;
  }

  /**
   * Preprocess text for indexing/searching
   * @param {string} text - Raw text
   * @returns {string} - Preprocessed text
   */
  preprocess(text) {
    if (!text) return '';
    
    // Convert to lowercase
    let processed = text.toLowerCase();
    
    // Remove special characters but keep Vietnamese characters
    processed = processed.replace(/[^\w\sàáảãạăằắẳẵặâầấẩẫậèéẻẽẹêềếểễệìíỉĩịòóỏõọôồốổỗộơờớởỡợùúủũụưừứửữựỳýỷỹỵđ]/gi, ' ');
    
    // Remove extra whitespace
    processed = processed.replace(/\s+/g, ' ').trim();
    
    return processed;
  }

  /**
   * Add document to the index
   * @param {string} id - Document ID
   * @param {string} content - Document content (subject + body)
   * @param {object} metadata - Additional document metadata
   */
  addDocument(id, content, metadata = {}) {
    const processedContent = this.preprocess(content);
    
    this.documents.push({
      id,
      content: processedContent,
      originalContent: content,
      metadata
    });
    
    this.tfidf.addDocument(processedContent);
  }

  /**
   * Remove document from index
   * @param {string} id - Document ID to remove
   */
  removeDocument(id) {
    const index = this.documents.findIndex(doc => doc.id === id);
    if (index !== -1) {
      this.documents.splice(index, 1);
      // Rebuild TF-IDF index
      this.rebuildIndex();
    }
  }

  /**
   * Rebuild the TF-IDF index
   */
  rebuildIndex() {
    this.tfidf = new natural.TfIdf();
    this.documents.forEach(doc => {
      this.tfidf.addDocument(doc.content);
    });
  }

  /**
   * Clear all documents
   */
  clearIndex() {
    this.documents = [];
    this.tfidf = new natural.TfIdf();
  }

  /**
   * Search for documents matching query
   * @param {string} query - Search query
   * @param {number} limit - Maximum number of results
   * @param {object} filters - Optional filters (e.g., { folder: 'inbox' })
   * @returns {array} - Array of matching documents with scores
   */
  search(query, limit = 10, filters = {}) {
    if (!query || this.documents.length === 0) {
      return [];
    }

    const processedQuery = this.preprocess(query);
    const queryTerms = processedQuery.split(' ').filter(t => t.length > 0);
    
    // Calculate TF-IDF scores for each document
    const scores = [];
    
    this.documents.forEach((doc, index) => {
      let score = 0;
      
      queryTerms.forEach(term => {
        this.tfidf.tfidfs(term, (docIndex, measure) => {
          if (docIndex === index) {
            score += measure;
          }
        });
      });

      // Apply filters
      let matchesFilters = true;
      Object.keys(filters).forEach(key => {
        if (doc.metadata[key] !== undefined && doc.metadata[key] !== filters[key]) {
          matchesFilters = false;
        }
      });

      if (matchesFilters && score > 0) {
        scores.push({
          id: doc.id,
          score: Math.round(score * 1000) / 1000,
          content: doc.originalContent,
          metadata: doc.metadata
        });
      }
    });

    // Sort by score descending
    scores.sort((a, b) => b.score - a.score);

    // Return top results
    return scores.slice(0, limit);
  }

  /**
   * Find similar documents to a given document
   * @param {string} documentId - ID of the source document
   * @param {number} limit - Maximum number of results
   * @returns {array} - Array of similar documents
   */
  findSimilar(documentId, limit = 5) {
    const sourceDoc = this.documents.find(d => d.id === documentId);
    if (!sourceDoc) {
      return [];
    }

    return this.search(sourceDoc.content, limit + 1)
      .filter(result => result.id !== documentId)
      .slice(0, limit);
  }

  /**
   * Get keyword suggestions based on indexed content
   * @param {string} prefix - Query prefix for autocomplete
   * @param {number} limit - Maximum suggestions
   * @returns {array} - Array of suggested keywords
   */
  getSuggestions(prefix, limit = 5) {
    if (!prefix) return [];

    const prefixLower = prefix.toLowerCase();
    const wordFrequency = {};

    this.documents.forEach(doc => {
      const words = doc.content.split(' ');
      words.forEach(word => {
        if (word.startsWith(prefixLower) && word.length > prefix.length) {
          wordFrequency[word] = (wordFrequency[word] || 0) + 1;
        }
      });
    });

    return Object.entries(wordFrequency)
      .sort((a, b) => b[1] - a[1])
      .slice(0, limit)
      .map(([word]) => word);
  }

  /**
   * Get index statistics
   */
  getStats() {
    return {
      documentCount: this.documents.length,
      indexedTerms: this.tfidf.documents ? this.tfidf.documents.length : 0
    };
  }
}

module.exports = new VectorSpaceSearch();
