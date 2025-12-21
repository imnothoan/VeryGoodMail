/**
 * Naive Bayes Classifier for Spam Detection
 * Implements multinomial Naive Bayes algorithm for email classification
 */
const natural = require('natural');

class NaiveBayesClassifier {
  constructor() {
    this.classifier = new natural.BayesClassifier();
    this.isTrainad = false;
    this.categories = {
      SPAM: 'spam',
      HAM: 'ham',       // Normal email
      IMPORTANT: 'important',
      SOCIAL: 'social',
      PROMOTIONS: 'promotions',
      UPDATES: 'updates'
    };
    
    // Initialize with training data
    this.initializeTrainingData();
  }

  /**
   * Initialize with sample training data
   * In production, this should be loaded from database
   */
  initializeTrainingData() {
    // Spam examples
    const spamExamples = [
      'You have won a lottery! Click here to claim your prize',
      'Free money! Get rich quick scheme',
      'Buy cheap medications online',
      'Congratulations! You are selected for exclusive offer',
      'Make money from home fast easy',
      'Click here for free gift card',
      'Nigerian prince needs your help transfer money',
      'Hot singles in your area want to meet',
      'Lose weight fast with this one trick',
      'Free trial no credit card required',
      'Bạn đã trúng thưởng! Nhấn vào đây để nhận',
      'Kiếm tiền online dễ dàng nhanh chóng',
      'Giảm cân nhanh chóng không cần tập luyện',
      'Khuyến mãi đặc biệt chỉ hôm nay',
    ];

    // Normal email examples
    const hamExamples = [
      'Meeting scheduled for tomorrow at 10 AM',
      'Please review the attached document',
      'Thank you for your email regarding the project',
      'I will send you the report by end of day',
      'Looking forward to our discussion',
      'Here are the meeting notes from today',
      'Can we reschedule our call to next week',
      'Cuộc họp được lên lịch vào ngày mai lúc 10 giờ',
      'Vui lòng xem xét tài liệu đính kèm',
      'Cảm ơn email của bạn về dự án',
    ];

    // Important email examples
    const importantExamples = [
      'URGENT: Action required before deadline',
      'Important: Your account needs verification',
      'Critical update for your attention',
      'Time-sensitive: Please respond immediately',
      'Password reset request for your account',
      'KHẨN CẤP: Cần hành động trước hạn chót',
      'Quan trọng: Tài khoản của bạn cần xác minh',
    ];

    // Social email examples
    const socialExamples = [
      'John commented on your post',
      'You have a new friend request',
      'Someone liked your photo',
      'New message from your group',
      'Birthday reminder for your friend',
      'Ai đó đã thích ảnh của bạn',
      'Bạn có yêu cầu kết bạn mới',
    ];

    // Promotions examples
    const promotionExamples = [
      'Summer sale 50% off all items',
      'Limited time offer on electronics',
      'New collection available now',
      'Subscribe for exclusive discounts',
      'Black Friday deals starting now',
      'Giảm giá mùa hè 50% tất cả sản phẩm',
      'Ưu đãi có hạn cho thiết bị điện tử',
    ];

    // Updates examples
    const updateExamples = [
      'Your order has been shipped',
      'Package delivery update',
      'Account statement available',
      'Weekly newsletter digest',
      'Software update available',
      'Đơn hàng của bạn đã được giao',
      'Cập nhật trạng thái giao hàng',
    ];

    // Train the classifier
    spamExamples.forEach(text => this.classifier.addDocument(text, this.categories.SPAM));
    hamExamples.forEach(text => this.classifier.addDocument(text, this.categories.HAM));
    importantExamples.forEach(text => this.classifier.addDocument(text, this.categories.IMPORTANT));
    socialExamples.forEach(text => this.classifier.addDocument(text, this.categories.SOCIAL));
    promotionExamples.forEach(text => this.classifier.addDocument(text, this.categories.PROMOTIONS));
    updateExamples.forEach(text => this.classifier.addDocument(text, this.categories.UPDATES));

    this.classifier.train();
    this.isTrained = true;
  }

  /**
   * Classify email content
   * @param {string} text - Email subject and body combined
   * @returns {object} - Classification result with category and confidence
   */
  classify(text) {
    if (!this.isTrained) {
      throw new Error('Classifier is not trained yet');
    }

    const classifications = this.classifier.getClassifications(text);
    const topClassification = classifications[0];
    
    // Calculate confidence as percentage
    const totalValue = classifications.reduce((sum, c) => sum + c.value, 0);
    const confidence = totalValue > 0 ? (topClassification.value / totalValue) * 100 : 0;

    return {
      category: topClassification.label,
      confidence: Math.round(confidence * 100) / 100,
      allClassifications: classifications.slice(0, 3).map(c => ({
        category: c.label,
        score: Math.round((c.value / totalValue) * 100 * 100) / 100
      })),
      isSpam: topClassification.label === this.categories.SPAM
    };
  }

  /**
   * Add new training document
   * @param {string} text - Email content
   * @param {string} category - Classification category
   */
  addTrainingDocument(text, category) {
    if (!Object.values(this.categories).includes(category)) {
      throw new Error(`Invalid category: ${category}`);
    }
    this.classifier.addDocument(text, category);
    this.classifier.train();
  }

  /**
   * Get all available categories
   */
  getCategories() {
    return this.categories;
  }
}

module.exports = new NaiveBayesClassifier();
