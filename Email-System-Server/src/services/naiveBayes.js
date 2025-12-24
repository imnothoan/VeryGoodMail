/**
 * Enhanced Naive Bayes Classifier for Email Classification
 * Implements multinomial Naive Bayes algorithm for:
 * - Spam Detection
 * - Email Category Classification  
 * - Sentiment Analysis
 * 
 * This is an enhanced version that doesn't rely on external services like PhoBERT
 * and provides accurate classification for both English and Vietnamese emails.
 * 
 * © 2025 VeryGoodMail by Hoàn
 */
const natural = require('natural');

class NaiveBayesClassifier {
  constructor() {
    // Main classifier for category/spam detection
    this.classifier = new natural.BayesClassifier();
    // Separate classifier for sentiment analysis
    this.sentimentClassifier = new natural.BayesClassifier();
    
    this.isTrained = false;
    this.categories = {
      SPAM: 'spam',
      PRIMARY: 'primary',      // Normal/personal email
      IMPORTANT: 'important',
      SOCIAL: 'social',
      PROMOTIONS: 'promotions',
      UPDATES: 'updates'
    };
    
    this.sentiments = {
      POSITIVE: 'positive',
      NEGATIVE: 'negative',
      NEUTRAL: 'neutral'
    };
    
    // Initialize with comprehensive training data
    this.initializeTrainingData();
    console.log('✓ Enhanced Naive Bayes classifier initialized');
  }

  /**
   * Initialize with comprehensive training data
   * Includes both English and Vietnamese examples
   */
  initializeTrainingData() {
    // ============================================
    // SPAM EXAMPLES (Extensive dataset)
    // ============================================
    const spamExamples = [
      // English spam
      'You have won a lottery! Click here to claim your prize',
      'Free money! Get rich quick scheme',
      'Buy cheap medications online without prescription',
      'Congratulations! You are selected for exclusive offer',
      'Make money from home fast easy guaranteed',
      'Click here for free gift card no strings attached',
      'Nigerian prince needs your help transfer money urgently',
      'Hot singles in your area want to meet you tonight',
      'Lose weight fast with this one trick doctors hate',
      'Free trial no credit card required limited time',
      'You won $1,000,000 in our sweepstakes claim now',
      'Earn $5000 per week working from home',
      'Your account has been compromised click here to verify',
      'Act now before this offer expires forever',
      'Congratulations lucky winner you\'ve been selected',
      'Double your investment overnight guaranteed returns',
      'Secret method to earn unlimited income revealed',
      'Casino bonus 500% deposit match claim now',
      'Adult content hot videos click here',
      'Pills that will change your life forever',
      'Bank needs your information urgent response required',
      'IRS refund waiting for you claim immediately',
      'Your inheritance is waiting transfer fee required',
      'Free iPhone just pay shipping click here',
      'Work from home make thousands daily easily',
      'Miracle cure discovered by scientists breakthrough',
      'Credit card debt eliminated instantly call now',
      'Exclusive VIP membership free trial sign up',
      
      // Vietnamese spam
      'Bạn đã trúng thưởng! Nhấn vào đây để nhận giải',
      'Kiếm tiền online dễ dàng nhanh chóng không cần vốn',
      'Giảm cân nhanh chóng không cần tập luyện hiệu quả',
      'Khuyến mãi đặc biệt chỉ hôm nay giảm giá 90%',
      'Bạn được chọn nhận quà tặng miễn phí đăng ký ngay',
      'Cơ hội đầu tư sinh lời 100% mỗi tháng',
      'Thuốc tăng cường sinh lý hiệu quả tức thì',
      'Vay tiền online nhanh chóng không cần chứng minh',
      'Trúng thưởng xe hơi nhấn link để nhận',
      'Cơ hội việc làm lương cao làm tại nhà',
      'Đầu tư bitcoin lợi nhuận khủng cam kết hoàn vốn',
      'Giải pháp làm giàu nhanh chóng ai cũng làm được',
      'Tài khoản ngân hàng bị khóa nhấn đây để mở',
      'Bạn có khoản tiền chờ nhận từ người thân nước ngoài',
      'Thuốc giảm cân an toàn hiệu quả sau 7 ngày',
    ];

    // ============================================
    // PRIMARY/NORMAL EMAIL EXAMPLES
    // ============================================
    const primaryExamples = [
      // English
      'Meeting scheduled for tomorrow at 10 AM please confirm',
      'Please review the attached document and let me know',
      'Thank you for your email regarding the project update',
      'I will send you the report by end of business day',
      'Looking forward to our discussion on Thursday',
      'Here are the meeting notes from today\'s session',
      'Can we reschedule our call to next week Tuesday',
      'Following up on our conversation from yesterday',
      'Just wanted to check in on the project status',
      'Let me know if you need any additional information',
      'Thanks for taking the time to meet with us',
      'I have a question about the proposal you sent',
      'Could you please forward this to the team',
      'Attached is the file you requested last week',
      'Let\'s set up a time to discuss this further',
      'Hope you had a great weekend how was your trip',
      'Quick question about the deadline for this project',
      'I appreciate your help with this matter',
      'Just checking if you received my previous email',
      'Here is the information you asked for',
      
      // Vietnamese
      'Cuộc họp được lên lịch vào ngày mai lúc 10 giờ sáng',
      'Vui lòng xem xét tài liệu đính kèm và cho tôi biết',
      'Cảm ơn email của bạn về dự án đang triển khai',
      'Tôi sẽ gửi báo cáo vào cuối ngày hôm nay',
      'Mong được thảo luận với bạn vào thứ năm tuần này',
      'Đây là ghi chú cuộc họp hôm nay xin xem qua',
      'Chúng ta có thể đổi lịch họp sang tuần sau không',
      'Em muốn hỏi về tiến độ dự án hiện tại',
      'Anh chị có thể gửi tài liệu cho em được không',
      'Cảm ơn anh chị đã dành thời gian trao đổi',
      'Em cần thêm thông tin về vấn đề này',
      'Đính kèm là file anh chị yêu cầu tuần trước',
      'Hẹn gặp lại vào cuộc họp tuần sau',
      'Xin chào buổi sáng em có câu hỏi muốn hỏi',
      'Cảm ơn sự hỗ trợ của anh chị trong thời gian qua',
    ];

    // ============================================
    // IMPORTANT EMAIL EXAMPLES
    // ============================================
    const importantExamples = [
      // English
      'URGENT: Action required before deadline tomorrow',
      'Important: Your account needs verification immediately',
      'Critical update for your immediate attention needed',
      'Time-sensitive: Please respond immediately to this',
      'Password reset request for your account security alert',
      'Deadline reminder: Project due in 24 hours',
      'Action required: Your approval needed today',
      'Emergency: Server maintenance scheduled tonight',
      'Priority: Meeting rescheduled to today 3 PM',
      'Attention: Contract expires end of this month',
      'Reminder: Payment due tomorrow please process',
      'Alert: Security incident requires your attention',
      'Final notice: Response needed by end of day',
      'Breaking: Important policy changes effective immediately',
      
      // Vietnamese
      'KHẨN CẤP: Cần hành động trước hạn chót ngày mai',
      'Quan trọng: Tài khoản của bạn cần xác minh ngay',
      'Cập nhật quan trọng cần sự chú ý của bạn',
      'Khẩn: Xin vui lòng phản hồi ngay lập tức',
      'Nhắc nhở deadline: Dự án đến hạn trong 24 giờ',
      'Cần phê duyệt: Hợp đồng cần ký hôm nay',
      'Thông báo khẩn: Bảo trì hệ thống tối nay',
      'Ưu tiên: Cuộc họp được đổi sang 3 giờ chiều nay',
      'Chú ý: Hợp đồng hết hạn cuối tháng này',
      'Nhắc nhở: Thanh toán đến hạn ngày mai',
      'Cảnh báo: Sự cố bảo mật cần xử lý ngay',
      'Thông báo cuối: Cần phản hồi trước cuối ngày',
    ];

    // ============================================
    // SOCIAL EMAIL EXAMPLES
    // ============================================
    const socialExamples = [
      // English
      'John commented on your post check it out',
      'You have a new friend request from Sarah',
      'Someone liked your photo on Instagram',
      'New message from your group chat',
      'Birthday reminder for your friend Mark tomorrow',
      'You were mentioned in a comment see what they said',
      'Your post is trending with 100 likes',
      'Facebook: Someone you may know sent a request',
      'LinkedIn: You have 5 new connection requests',
      'Twitter: You have new followers this week',
      'Instagram: Your story was viewed 50 times',
      'Your event invitation response is pending',
      'New comment on your shared article',
      'Your friend is celebrating their birthday today',
      
      // Vietnamese
      'Ai đó đã thích ảnh của bạn trên Facebook',
      'Bạn có yêu cầu kết bạn mới từ Minh',
      'Có người đã bình luận bài viết của bạn',
      'Tin nhắn mới từ nhóm chat của bạn',
      'Sinh nhật của bạn bè vào ngày mai nhắc nhở',
      'Bạn được nhắc đến trong một bình luận',
      'Bài viết của bạn đang nổi với 100 lượt thích',
      'Bạn có 5 lời mời kết nối mới trên LinkedIn',
      'Story của bạn đã được xem 50 lần',
      'Bạn bè đang chờ phản hồi sự kiện của bạn',
    ];

    // ============================================
    // PROMOTIONS EMAIL EXAMPLES
    // ============================================
    const promotionExamples = [
      // English
      'Summer sale 50% off all items this weekend only',
      'Limited time offer on electronics ends tonight',
      'New collection available now shop the latest styles',
      'Subscribe for exclusive discounts and early access',
      'Black Friday deals starting now up to 70% off',
      'Flash sale 24 hours only don\'t miss out',
      'Your exclusive member discount is waiting',
      'New arrivals just for you based on your preferences',
      'Last chance to save big on your favorites',
      'Clearance sale everything must go 80% off',
      'Double points day earn rewards faster today',
      'Exclusive offer for loyal customers like you',
      'Free shipping on all orders this week only',
      'Buy one get one free limited quantities',
      
      // Vietnamese
      'Giảm giá mùa hè 50% tất cả sản phẩm cuối tuần này',
      'Ưu đãi có hạn cho thiết bị điện tử kết thúc tối nay',
      'Bộ sưu tập mới đã có mặt mua ngay hôm nay',
      'Đăng ký để nhận giảm giá độc quyền và ưu tiên',
      'Black Friday giảm đến 70% mua ngay kẻo lỡ',
      'Flash sale 24 giờ duy nhất đừng bỏ lỡ',
      'Giảm giá thành viên độc quyền của bạn đang chờ',
      'Hàng mới về dành riêng cho bạn theo sở thích',
      'Cơ hội cuối để tiết kiệm lớn cho sản phẩm yêu thích',
      'Xả hàng tất cả sản phẩm giảm 80%',
      'Miễn phí vận chuyển tất cả đơn hàng tuần này',
      'Mua 1 tặng 1 số lượng có hạn nhanh tay đặt',
    ];

    // ============================================
    // UPDATES/NOTIFICATIONS EMAIL EXAMPLES
    // ============================================
    const updateExamples = [
      // English
      'Your order has been shipped tracking number inside',
      'Package delivery update out for delivery today',
      'Account statement for December is now available',
      'Weekly newsletter digest your weekly summary',
      'Software update available for your application',
      'Your subscription has been renewed successfully',
      'Payment received thank you for your purchase',
      'Order confirmation your order number is 12345',
      'Shipping notification your package is on the way',
      'Account activity new login detected on your account',
      'Bill reminder your payment is due on 15th',
      'Service update scheduled maintenance this weekend',
      'Receipt for your recent purchase attached',
      'Status update your request has been processed',
      'Notification: Changes to our terms of service',
      
      // Vietnamese
      'Đơn hàng của bạn đã được giao mã vận đơn bên trong',
      'Cập nhật giao hàng đang được vận chuyển hôm nay',
      'Sao kê tài khoản tháng 12 đã sẵn sàng xem',
      'Bản tin hàng tuần tổng hợp tin tức cho bạn',
      'Cập nhật phần mềm có sẵn cho ứng dụng của bạn',
      'Đăng ký của bạn đã được gia hạn thành công',
      'Thanh toán đã nhận cảm ơn bạn đã mua hàng',
      'Xác nhận đơn hàng mã đơn hàng của bạn là 12345',
      'Thông báo vận chuyển gói hàng đang trên đường',
      'Hoạt động tài khoản đăng nhập mới được phát hiện',
      'Nhắc thanh toán hóa đơn đến hạn ngày 15',
      'Cập nhật dịch vụ bảo trì theo lịch cuối tuần này',
      'Biên lai mua hàng gần đây của bạn đính kèm',
      'Cập nhật trạng thái yêu cầu của bạn đã được xử lý',
    ];

    // ============================================
    // SENTIMENT: POSITIVE EXAMPLES
    // ============================================
    const positiveExamples = [
      // English
      'Great work on the project everyone did amazing',
      'Thank you so much for your help I really appreciate it',
      'Excellent results we exceeded our targets',
      'Congratulations on your promotion well deserved',
      'I am very happy with the outcome thank you',
      'This is wonderful news looking forward to it',
      'Perfect that works great for me thanks',
      'Amazing job you did fantastic work',
      'So excited about this opportunity thank you',
      'Best regards and have a great day',
      'Love the idea let\'s move forward with it',
      'Brilliant suggestion I agree completely',
      
      // Vietnamese
      'Làm tốt lắm mọi người đã làm rất tuyệt vời',
      'Cảm ơn sự giúp đỡ của anh chị rất nhiều',
      'Kết quả xuất sắc chúng ta đã vượt mục tiêu',
      'Chúc mừng thăng chức anh xứng đáng được như vậy',
      'Em rất hài lòng với kết quả cảm ơn nhiều',
      'Đây là tin tuyệt vời mong chờ rất nhiều',
      'Hoàn hảo như vậy phù hợp với em cảm ơn',
      'Làm tuyệt vời lắm công việc rất tốt',
      'Rất phấn khích về cơ hội này cảm ơn nhiều',
      'Chúc anh chị một ngày tốt lành',
    ];

    // ============================================
    // SENTIMENT: NEGATIVE EXAMPLES
    // ============================================
    const negativeExamples = [
      // English
      'I am disappointed with the results not as expected',
      'This is unacceptable we need to fix this immediately',
      'Unfortunately we cannot proceed with this plan',
      'I am frustrated with the delays and issues',
      'This is not what we agreed upon at all',
      'Very unhappy with the service received',
      'Complaint about the poor quality of product',
      'Problems with the system need urgent attention',
      'Failed to meet the deadline again this is concerning',
      'Sorry to inform you the project is cancelled',
      'This is a serious issue that must be addressed',
      'Concerned about the lack of progress on this',
      
      // Vietnamese
      'Em thất vọng với kết quả không như mong đợi',
      'Điều này không thể chấp nhận được cần sửa ngay',
      'Rất tiếc chúng tôi không thể tiếp tục kế hoạch này',
      'Em rất bực bội với những chậm trễ và vấn đề',
      'Đây không phải là điều chúng ta đã thỏa thuận',
      'Rất không hài lòng với dịch vụ nhận được',
      'Khiếu nại về chất lượng sản phẩm kém',
      'Vấn đề với hệ thống cần sự chú ý khẩn cấp',
      'Không đạt được deadline lần nữa điều này đáng lo',
      'Xin thông báo dự án đã bị hủy',
      'Đây là vấn đề nghiêm trọng cần được giải quyết',
    ];

    // ============================================
    // SENTIMENT: NEUTRAL EXAMPLES
    // ============================================
    const neutralExamples = [
      // English
      'Please find attached the document as discussed',
      'The meeting is scheduled for 3 PM tomorrow',
      'FYI the report has been submitted',
      'Here is the information you requested',
      'Let me know if you have any questions',
      'Confirming our appointment for next week',
      'This email is to inform you about the update',
      'Attached please find the requested files',
      'The deadline for submission is Friday',
      'Please review and provide your feedback',
      
      // Vietnamese
      'Xin vui lòng xem tài liệu đính kèm như đã thảo luận',
      'Cuộc họp được lên lịch lúc 3 giờ chiều ngày mai',
      'FYI báo cáo đã được nộp',
      'Đây là thông tin anh chị yêu cầu',
      'Cho em biết nếu có câu hỏi gì',
      'Xác nhận cuộc hẹn của chúng ta tuần sau',
      'Email này để thông báo về cập nhật',
      'Đính kèm xin vui lòng tìm các file yêu cầu',
      'Deadline nộp bài là thứ Sáu',
      'Xin xem xét và cung cấp phản hồi của bạn',
    ];

    // Train the main classifier
    spamExamples.forEach(text => this.classifier.addDocument(text, this.categories.SPAM));
    primaryExamples.forEach(text => this.classifier.addDocument(text, this.categories.PRIMARY));
    importantExamples.forEach(text => this.classifier.addDocument(text, this.categories.IMPORTANT));
    socialExamples.forEach(text => this.classifier.addDocument(text, this.categories.SOCIAL));
    promotionExamples.forEach(text => this.classifier.addDocument(text, this.categories.PROMOTIONS));
    updateExamples.forEach(text => this.classifier.addDocument(text, this.categories.UPDATES));

    this.classifier.train();

    // Train the sentiment classifier
    positiveExamples.forEach(text => this.sentimentClassifier.addDocument(text, this.sentiments.POSITIVE));
    negativeExamples.forEach(text => this.sentimentClassifier.addDocument(text, this.sentiments.NEGATIVE));
    neutralExamples.forEach(text => this.sentimentClassifier.addDocument(text, this.sentiments.NEUTRAL));

    this.sentimentClassifier.train();
    
    this.isTrained = true;
  }

  /**
   * Classify email content
   * @param {string} text - Email subject and body combined
   * @returns {object} - Classification result with category, confidence, and spam status
   */
  classify(text) {
    if (!this.isTrained) {
      throw new Error('Classifier is not trained yet');
    }

    if (!text || text.trim().length === 0) {
      return {
        category: this.categories.PRIMARY,
        confidence: 50,
        allClassifications: [],
        isSpam: false,
        spamScore: 0,
      };
    }

    const classifications = this.classifier.getClassifications(text);
    const topClassification = classifications[0];
    
    // Calculate confidence as percentage
    const totalValue = classifications.reduce((sum, c) => sum + c.value, 0);
    const confidence = totalValue > 0 ? (topClassification.value / totalValue) * 100 : 0;
    
    // Calculate spam score (0-1)
    const spamClassification = classifications.find(c => c.label === this.categories.SPAM);
    const spamScore = spamClassification && totalValue > 0 
      ? spamClassification.value / totalValue 
      : 0;

    // Determine if email is spam (spam score > 0.5 or top category is spam with high confidence)
    const isSpam = topClassification.label === this.categories.SPAM && confidence > 60;

    return {
      category: isSpam ? this.categories.SPAM : topClassification.label,
      confidence: Math.round(confidence * 100) / 100,
      allClassifications: classifications.slice(0, 4).map(c => ({
        category: c.label,
        score: Math.round((c.value / totalValue) * 100 * 100) / 100
      })),
      isSpam,
      spamScore: Math.round(spamScore * 100) / 100,
    };
  }

  /**
   * Analyze sentiment of email content
   * @param {string} text - Email subject and body combined
   * @returns {object} - Sentiment result with label and confidence
   */
  analyzeSentiment(text) {
    if (!this.isTrained) {
      throw new Error('Classifier is not trained yet');
    }

    if (!text || text.trim().length === 0) {
      return {
        sentiment: this.sentiments.NEUTRAL,
        confidence: 50,
      };
    }

    const classifications = this.sentimentClassifier.getClassifications(text);
    const topClassification = classifications[0];
    
    const totalValue = classifications.reduce((sum, c) => sum + c.value, 0);
    const confidence = totalValue > 0 ? (topClassification.value / totalValue) * 100 : 0;

    return {
      sentiment: topClassification.label,
      confidence: Math.round(confidence * 100) / 100,
      allSentiments: classifications.map(c => ({
        sentiment: c.label,
        score: Math.round((c.value / totalValue) * 100 * 100) / 100
      })),
    };
  }

  /**
   * Full email classification including category and sentiment
   * @param {string} subject - Email subject
   * @param {string} body - Email body text
   * @returns {object} - Complete classification result
   */
  classifyEmail(subject, body) {
    const combinedText = `${subject || ''} ${body || ''}`.trim();
    
    const categoryResult = this.classify(combinedText);
    const sentimentResult = this.analyzeSentiment(combinedText);

    return {
      category: categoryResult.category,
      isSpam: categoryResult.isSpam,
      spamScore: categoryResult.spamScore,
      confidence: categoryResult.confidence,
      sentiment: sentimentResult.sentiment,
      sentimentConfidence: sentimentResult.confidence,
      source: 'naive_bayes_enhanced',
    };
  }

  /**
   * Add new training document (for future learning)
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
   * Add sentiment training document
   * @param {string} text - Email content
   * @param {string} sentiment - Sentiment (positive, negative, neutral)
   */
  addSentimentDocument(text, sentiment) {
    if (!Object.values(this.sentiments).includes(sentiment)) {
      throw new Error(`Invalid sentiment: ${sentiment}`);
    }
    this.sentimentClassifier.addDocument(text, sentiment);
    this.sentimentClassifier.train();
  }

  /**
   * Get all available categories
   */
  getCategories() {
    return this.categories;
  }

  /**
   * Get all available sentiments
   */
  getSentiments() {
    return this.sentiments;
  }
}

module.exports = new NaiveBayesClassifier();
