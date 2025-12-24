# 📧 VeryGoodMail - Hướng dẫn Demo & Thuyết Trình

> **Cheatsheet cho bạn để vừa demo vừa thuyết trình về toàn bộ dự án trước thầy**

---

## 🎯 Tổng quan Workflow Dự Án

```
┌─────────────────────────────────────────────────────────────────────────────┐
│                        VeryGoodMail Architecture                            │
├─────────────────────────────────────────────────────────────────────────────┤
│                                                                             │
│  ┌──────────────┐    ┌──────────────┐    ┌──────────────┐                  │
│  │ Titan Email  │    │    Server    │    │   Supabase   │                  │
│  │  (Domain)    │───▶│  (Node.js)   │───▶│  (Database)  │                  │
│  └──────────────┘    └──────────────┘    └──────────────┘                  │
│         │                   │                   │                          │
│    SMTP/IMAP           AI Services          Auth + RLS                    │
│         │                   │                   │                          │
│         ▼                   ▼                   ▼                          │
│  ┌──────────────┐    ┌──────────────┐    ┌──────────────┐                  │
│  │  External    │    │ Gemini AI    │    │   Client     │                  │
│  │   Emails     │    │ Naive Bayes  │    │  (Next.js)   │                  │
│  └──────────────┘    └──────────────┘    └──────────────┘                  │
│                                                                             │
└─────────────────────────────────────────────────────────────────────────────┘
```

---

## 📌 Phần 1: Email Domain & Titan Email

### 1.1 Titan Email là gì?

**Mở file:** `.env.example` trong folder `Email-System-Server`

```bash
# Mở file để show cho thầy
code Email-System-Server/.env.example
```

**Giải thích:**
- Em sử dụng **Titan Email** - một dịch vụ email hosting chuyên nghiệp
- Domain `verygoodmail.tech` được mua và kết nối với Titan Email
- Titan cung cấp cả **SMTP** (gửi mail) và **IMAP** (nhận mail)

```env
# SMTP Configuration for SENDING emails
SMTP_HOST=smtp.titan.email
SMTP_PORT=465
SMTP_SECURE=true
SMTP_USER=admin@verygoodmail.tech
SMTP_PASS="your_titan_email_password"

# IMAP Configuration for RECEIVING emails
IMAP_HOST=imap.titan.email
IMAP_PORT=993
IMAP_SECURE=true
IMAP_USER=admin@verygoodmail.tech
IMAP_PASS="your_titan_email_password"
```

### 1.2 Catch-All là gì?

**Giải thích cho thầy:**

> "Catch-All là tính năng cho phép **BẤT KỲ email nào** gửi đến domain `@verygoodmail.tech` đều được nhận vào một hộp thư chung."

**Ví dụ:**
- `user1@verygoodmail.tech` → Nhận được
- `random123@verygoodmail.tech` → Cũng nhận được
- `anything@verygoodmail.tech` → Đều nhận được

**Cách cài đặt Catch-All trên Titan:**
1. Vào Titan Email Dashboard
2. Chọn Domain Settings → Email Routing
3. Bật "Catch-all" và trỏ về email admin

**Tại sao cần Catch-All?**
- Cho phép mỗi user đăng ký có email riêng: `username@verygoodmail.tech`
- Hệ thống nhận TẤT CẢ email rồi phân phối cho từng user trong database

---

## 📌 Phần 2: IMAP - Nhận Email

### 2.1 IMAP là gì?

**Mở file:** `Email-System-Server/src/services/imap.js`

```bash
code Email-System-Server/src/services/imap.js
```

**Giải thích:**
> "IMAP (Internet Message Access Protocol) là giao thức để **NHẬN** email từ mail server. Khác với POP3, IMAP giữ email trên server và đồng bộ nhiều thiết bị."

### 2.2 IMAP IDLE - Real-time Email

**Show đoạn code này cho thầy (dòng 316-370):**

```javascript
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
            console.log(`New email notification received!`);
            // Fetch and process the new email...
          }
        };
        
        this.client.on('exists', existsHandler);
        await idlePromise;
        this.client.off('exists', existsHandler);
      } finally {
        lock.release();
      }
    } catch (error) {
      // Handle reconnection...
    }
  }
}
```

**Giải thích:**
> "IMAP IDLE giống như đặt 'chuông báo' trên mail server. Server sẽ push thông báo ngay khi có email mới - không cần polling liên tục, tiết kiệm tài nguyên!"

### 2.3 Xử lý Email Đến

**Show đoạn code (dòng 420-519):**

```javascript
/**
 * Process an incoming email message
 */
async processIncomingEmail(message) {
  // Parse email content
  const parsed = await simpleParser(message.source);
  
  const senderEmail = envelope.from?.[0]?.address;
  const senderName = envelope.from?.[0]?.name || senderEmail;
  
  // Get recipient emails - these are the users in our system
  const toAddresses = (envelope.to || []).map(addr => addr.address?.toLowerCase());
  
  // Find users in our system that match the recipient emails
  const EMAIL_DOMAIN = process.env.EMAIL_DOMAIN || 'verygoodmail.tech';
  
  // Filter to only our domain recipients
  const ourDomainRecipients = allRecipients.filter(email => 
    email && email.endsWith(`@${EMAIL_DOMAIN}`)
  );
  
  for (const recipientEmail of ourDomainRecipients) {
    // Find user by email in Supabase
    const { data: userProfile } = await this.supabaseAdmin
      .from('profiles')
      .select('id, email')
      .eq('email', recipientEmail)
      .single();

    if (userProfile) {
      // Deliver email to this user
      await this.deliverEmailToUser(userProfile, emailData);
    }
  }
}
```

**Giải thích:**
> "Khi email đến, hệ thống sẽ:
> 1. Parse nội dung email
> 2. Kiểm tra người nhận có trong database không
> 3. Nếu có → giao email cho user đó
> 4. Thông báo realtime qua WebSocket"

---

## 📌 Phần 3: SMTP - Gửi Email

### 3.1 SMTP là gì?

**Mở file:** `Email-System-Server/src/services/smtp.js`

```bash
code Email-System-Server/src/services/smtp.js
```

**Giải thích:**
> "SMTP (Simple Mail Transfer Protocol) là giao thức để **GỬI** email. Giống như 'bưu điện' chuyển thư từ người gửi đến người nhận."

### 3.2 Cấu hình SMTP với Nodemailer

**Show đoạn code (dòng 10-46):**

```javascript
class SMTPService {
  constructor() {
    this.isConfigured = !!(
      process.env.SMTP_HOST &&
      process.env.SMTP_USER &&
      process.env.SMTP_PASS
    );

    if (this.isConfigured) {
      this.transporter = nodemailer.createTransport({
        host: process.env.SMTP_HOST,        // smtp.titan.email
        port: parseInt(process.env.SMTP_PORT), // 465
        secure: process.env.SMTP_SECURE === 'true', // SSL/TLS
        auth: {
          user: process.env.SMTP_USER,      // admin@verygoodmail.tech
          pass: process.env.SMTP_PASS,
        },
        // Connection pool for better performance
        pool: true,
        maxConnections: 5,
        maxMessages: 100,
      });
    }
  }
}
```

### 3.3 Gửi Email

**Show đoạn code (dòng 79-175):**

```javascript
async sendEmail(options) {
  const {
    from, fromName, to, cc, bcc,
    subject, text, html, attachments = []
  } = options;

  // Build mail options
  const smtpFrom = process.env.SMTP_FROM || process.env.SMTP_USER;
  
  const mailOptions = {
    from: fromName ? `${fromName} <${smtpFrom}>` : smtpFrom,
    to: Array.isArray(to) ? to.join(', ') : to,
    subject: subject || '(No subject)',
    text: text || '',
  };

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

  // Send email!
  const info = await this.transporter.sendMail(mailOptions);
  console.log('Email sent successfully:', info.messageId);
  
  return { success: true, messageId: info.messageId };
}
```

**Giải thích:**
> "Khi user gửi email:
> 1. Hệ thống dùng Nodemailer kết nối SMTP server (Titan)
> 2. Titan sẽ gửi email đến người nhận
> 3. Nếu gửi cho user trong hệ thống → copy trực tiếp vào DB"

---

## 📌 Phần 4: Supabase - Database & Authentication

### 4.1 Supabase là gì?

**Mở file:** `supabase-schema.sql`

```bash
code supabase-schema.sql
```

**Giải thích:**
> "Supabase là 'Firebase alternative' open-source, cung cấp:
> - PostgreSQL Database
> - Authentication (đăng nhập/đăng ký)
> - Row Level Security (RLS)
> - Realtime subscriptions
> - Storage cho file/ảnh"

### 4.2 Database Schema

**Show cấu trúc bảng emails (dòng 141-180):**

```sql
CREATE TABLE IF NOT EXISTS public.emails (
    id UUID DEFAULT uuid_generate_v4() PRIMARY KEY,
    thread_id UUID REFERENCES public.threads(id),
    user_id UUID REFERENCES auth.users(id) NOT NULL,
    
    -- Sender info
    sender_name TEXT NOT NULL,
    sender_email TEXT NOT NULL,
    
    -- Recipients
    recipient_emails JSONB DEFAULT '[]'::JSONB,
    cc_emails JSONB DEFAULT '[]'::JSONB,
    bcc_emails JSONB DEFAULT '[]'::JSONB,
    
    -- Email content (ENCRYPTED!)
    subject TEXT NOT NULL,
    body_text TEXT,      -- ENCRYPTED with AES-256
    body_html TEXT,      -- ENCRYPTED with AES-256
    
    -- AI Analysis results
    ai_summary TEXT,
    ai_category TEXT CHECK (ai_category IN ('important', 'social', 'promotions', 'updates', 'primary', 'spam')),
    ai_sentiment TEXT CHECK (ai_sentiment IN ('positive', 'negative', 'neutral')),
    ai_spam_score DECIMAL(3,2),
    
    -- Status flags
    is_read BOOLEAN DEFAULT FALSE,
    is_starred BOOLEAN DEFAULT FALSE,
    is_draft BOOLEAN DEFAULT FALSE,
    is_sent BOOLEAN DEFAULT FALSE,
    is_spam BOOLEAN DEFAULT FALSE,
    is_trashed BOOLEAN DEFAULT FALSE,
);
```

### 4.3 Row Level Security (RLS)

**Show đoạn RLS (dòng 186-196):**

```sql
-- Enable RLS
ALTER TABLE public.emails ENABLE ROW LEVEL SECURITY;

-- Policies for emails - User chỉ thấy email của chính mình!
CREATE POLICY "Users can view own emails" ON public.emails
    FOR SELECT USING (auth.uid() = user_id);

CREATE POLICY "Users can create own emails" ON public.emails
    FOR INSERT WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update own emails" ON public.emails
    FOR UPDATE USING (auth.uid() = user_id);

CREATE POLICY "Users can delete own emails" ON public.emails
    FOR DELETE USING (auth.uid() = user_id);
```

**Giải thích:**
> "RLS (Row Level Security) đảm bảo:
> - User A KHÔNG THỂ đọc email của User B
> - Được enforce ở DATABASE level - không bypass được
> - Ngay cả admin cũng không đọc được nội dung (đã mã hóa)"

### 4.4 Authentication Flow

**Mở file:** `Email-System-Client/src/contexts/auth-context.tsx`

```bash
code Email-System-Client/src/contexts/auth-context.tsx
```

**Show đoạn code quan trọng:**

```typescript
const signIn = async (email: string, password: string) => {
  const { error } = await supabase.auth.signInWithPassword({
    email,
    password,
  });
  return { error };
};

const signUp = async (email: string, password: string, fullName?: string) => {
  const { error } = await supabase.auth.signUp({
    email,
    password,
    options: {
      data: { full_name: fullName },
    },
  });
  return { error };
};

// OAuth login
const signInWithGoogle = async () => {
  const { error } = await supabase.auth.signInWithOAuth({
    provider: 'google',
    options: {
      redirectTo: `${window.location.origin}/auth/callback`,
    },
  });
  return { error };
};
```

---

## 📌 Phần 5: Mã hóa AES-256

### 5.1 Tại sao cần mã hóa?

**Mở file:** `Email-System-Server/src/utils/encryption.js`

```bash
code Email-System-Server/src/utils/encryption.js
```

**Giải thích:**
> "Nội dung email là dữ liệu nhạy cảm. Dù admin database cũng KHÔNG được đọc! Em dùng AES-256 để mã hóa trước khi lưu."

### 5.2 Code Mã hóa

```javascript
const CryptoJS = require('crypto-js');

class EncryptionService {
  constructor() {
    this.secretKey = process.env.ENCRYPTION_KEY;
    // Key phải >= 32 ký tự cho AES-256
  }

  /**
   * Encrypt sensitive data
   */
  encrypt(data) {
    if (!data) return data;
    const encrypted = CryptoJS.AES.encrypt(data, this.secretKey).toString();
    return encrypted;
  }

  /**
   * Decrypt sensitive data
   */
  decrypt(encryptedData) {
    if (!encryptedData) return encryptedData;
    
    const bytes = CryptoJS.AES.decrypt(encryptedData, this.secretKey);
    const decrypted = bytes.toString(CryptoJS.enc.Utf8);
    return decrypted;
  }
}
```

### 5.3 Sử dụng trong routes

**Mở file:** `Email-System-Server/src/routes/emails.js`

**Show đoạn code (dòng 334-339):**

```javascript
// Encrypt sensitive content (including subject)
const encryptedBody = body_text ? encryption.encrypt(body_text) : null;
const encryptedHtml = body_html ? encryption.encrypt(body_html) : null;
const encryptedSnippet = snippet ? encryption.encrypt(snippet) : null;
const encryptedSubject = subject ? encryption.encrypt(subject) : encryption.encrypt('(No subject)');
```

**Và khi đọc ra (dòng 207-215):**

```javascript
// Decrypt email content
const decryptedEmails = emails.map(email => ({
  ...email,
  subject: email.subject ? encryption.decrypt(email.subject) : '(No subject)',
  body_text: email.body_text ? encryption.decrypt(email.body_text) : null,
  body_html: email.body_html ? encryption.decrypt(email.body_html) : null,
  snippet: email.snippet ? encryption.decrypt(email.snippet) : null,
}));
```

---

## 📌 Phần 6: Gemini AI - Tóm tắt & Smart Reply

### 6.1 Gemini là gì?

**Mở file:** `Email-System-Server/src/services/gemini.js`

```bash
code Email-System-Server/src/services/gemini.js
```

**Giải thích:**
> "Gemini là AI của Google (GPT competitor). Em dùng để:
> - Tóm tắt email dài
> - Gợi ý câu trả lời thông minh
> - Phân tích cảm xúc email"

### 6.2 Tóm tắt Email

```javascript
const { GoogleGenerativeAI } = require("@google/generative-ai");

class GeminiService {
  constructor() {
    this.genAI = new GoogleGenerativeAI(process.env.GEMINI_API_KEY);
    this.model = this.genAI.getGenerativeModel({ 
      model: "gemini-2.5-flash", 
      generationConfig: {
        temperature: 0.7,
        maxOutputTokens: 1024,
      }
    });
  }

  async summarizeEmail(subject, body, language = 'vi') {
    const languageInstruction = language === 'vi' 
      ? 'Trả lời bằng tiếng Việt.' 
      : 'Reply in English.';
    
    const prompt = `${languageInstruction}
Hãy tóm tắt email sau ngắn gọn (2-3 câu):
Tiêu đề: ${subject || 'Không có'}
Nội dung: ${body || 'Không có'}
Yêu cầu: Tóm tắt ý chính và hành động cần thiết.`;

    const summary = await this.generateContent(prompt);
    return { success: true, summary: summary.trim(), language };
  }
}
```

### 6.3 Smart Reply

```javascript
async generateSmartReplies(emailContent, language = 'vi') {
  const prompt = `Tạo 3 câu trả lời ngắn gọn cho email này dưới dạng JSON Array 
  (Ví dụ: ["Câu 1", "Câu 2", "Câu 3"]). 
  Email: ${emailContent}`;
  
  let text = await this.generateContent(prompt);
  text = text.replace(/```json|```/g, '').trim();
  
  const jsonMatch = text.match(/\[.*\]/s);
  const replies = jsonMatch ? JSON.parse(jsonMatch[0]) : [];
  
  return { success: true, replies, language };
}
```

---

## 📌 Phần 7: Naive Bayes - Phân loại Email

### 7.1 Naive Bayes là gì?

**Mở file:** `Email-System-Server/src/services/naiveBayes.js`

```bash
code Email-System-Server/src/services/naiveBayes.js
```

**Giải thích:**
> "Naive Bayes là thuật toán Machine Learning dựa trên xác suất Bayes. 'Naive' vì giả định các features độc lập với nhau. Rất hiệu quả cho text classification!"

### 7.2 Training Data

**Show đoạn code training (dòng 47-98):**

```javascript
initializeTrainingData() {
  // SPAM EXAMPLES
  const spamExamples = [
    'You have won a lottery! Click here to claim your prize',
    'Free money! Get rich quick scheme',
    'Nigerian prince needs your help transfer money urgently',
    // Vietnamese spam
    'Bạn đã trúng thưởng! Nhấn vào đây để nhận giải',
    'Kiếm tiền online dễ dàng nhanh chóng không cần vốn',
    // ... more examples
  ];

  // PRIMARY EMAIL EXAMPLES
  const primaryExamples = [
    'Meeting scheduled for tomorrow at 10 AM please confirm',
    'Please review the attached document and let me know',
    // Vietnamese
    'Cuộc họp được lên lịch vào ngày mai lúc 10 giờ sáng',
    // ... more examples
  ];

  // Train the classifier
  spamExamples.forEach(text => this.classifier.addDocument(text, 'spam'));
  primaryExamples.forEach(text => this.classifier.addDocument(text, 'primary'));
  // ... train other categories
  
  this.classifier.train();
}
```

### 7.3 Classification Logic

**Show đoạn classify (dòng 402-443):**

```javascript
classify(text) {
  const classifications = this.classifier.getClassifications(text);
  const topClassification = classifications[0];
  
  // Calculate confidence as percentage
  const totalValue = classifications.reduce((sum, c) => sum + c.value, 0);
  const confidence = (topClassification.value / totalValue) * 100;
  
  // Calculate spam score (0-1)
  const spamClassification = classifications.find(c => c.label === 'spam');
  const spamScore = spamClassification 
    ? spamClassification.value / totalValue 
    : 0;

  // Determine if email is spam
  const isSpam = topClassification.label === 'spam' && confidence > 60;

  return {
    category: isSpam ? 'spam' : topClassification.label,
    confidence: Math.round(confidence * 100) / 100,
    isSpam,
    spamScore: Math.round(spamScore * 100) / 100,
  };
}
```

### 7.4 Sentiment Analysis

```javascript
analyzeSentiment(text) {
  const classifications = this.sentimentClassifier.getClassifications(text);
  const topClassification = classifications[0]; // positive/negative/neutral
  
  return {
    sentiment: topClassification.label,
    confidence: (topClassification.value / totalValue) * 100,
  };
}
```

---

## 📌 Phần 8: Vector Space Search (TF-IDF)

### 8.1 TF-IDF là gì?

**Mở file:** `Email-System-Server/src/services/vectorSpace.js`

```bash
code Email-System-Server/src/services/vectorSpace.js
```

**Giải thích:**
> "TF-IDF (Term Frequency - Inverse Document Frequency) là kỹ thuật đo độ quan trọng của từ trong văn bản:
> - TF: Từ xuất hiện nhiều trong document → quan trọng
> - IDF: Từ xuất hiện ở nhiều documents → ít quan trọng (như 'the', 'is')
> - TF-IDF = TF × IDF"

### 8.2 Search Implementation

```javascript
const natural = require('natural');

class VectorSpaceSearch {
  constructor() {
    this.tfidf = new natural.TfIdf();
    this.documents = [];
  }

  // Add document to index
  addDocument(id, content, metadata = {}) {
    const processedContent = this.preprocess(content);
    this.documents.push({ id, content: processedContent, metadata });
    this.tfidf.addDocument(processedContent);
  }

  // Search for matching documents
  search(query, limit = 10, filters = {}) {
    const processedQuery = this.preprocess(query);
    const queryTerms = processedQuery.split(' ');
    
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

      if (score > 0) {
        scores.push({
          id: doc.id,
          score: Math.round(score * 1000) / 1000,
          metadata: doc.metadata
        });
      }
    });

    // Sort by score descending
    scores.sort((a, b) => b.score - a.score);
    return scores.slice(0, limit);
  }
}
```

---

## 📌 Phần 9: WebSocket - Real-time Updates

### 9.1 Socket.IO Setup

**Mở file:** `Email-System-Server/src/index.js`

```bash
code Email-System-Server/src/index.js
```

**Show đoạn code (dòng 18-36):**

```javascript
const { Server } = require('socket.io');

const io = new Server(httpServer, {
  cors: {
    origin: process.env.ALLOWED_ORIGINS?.split(','),
    methods: ['GET', 'POST'],
    credentials: true
  },
  pingTimeout: 60000,
  pingInterval: 25000,
  transports: ['websocket', 'polling'],
});

// Track connected users
io.on('connection', (socket) => {
  console.log('Client connected:', socket.id);

  // Join user's private room
  socket.on('join-room', (userId) => {
    socket.join(`user:${userId}`);
    console.log(`User ${userId} joined their room`);
  });
});
```

### 9.2 Push Notification khi có Email mới

**Trong imap.js (dòng 607-633):**

```javascript
// Notify user via Socket.IO when new email arrives
if (this.io) {
  this.io.to(`user:${user.id}`).emit('new-email', {
    id: emailId,
    thread_id: threadId,
    sender_name: senderName,
    sender_email: senderEmail,
    subject,
    snippet,
    date: date.toISOString(),
    is_read: false,
    is_spam: isSpam,
    ai_category: aiCategory,
  });
  
  console.log(`📣 WebSocket notification sent to user:${user.id}`);
}
```

---

## 📌 Phần 10: Frontend (Next.js)

### 10.1 Project Structure

**Show folder structure:**

```
Email-System-Client/
├── src/
│   ├── app/              # Next.js App Router
│   │   ├── (auth)/       # Protected routes
│   │   ├── auth/         # Login/Register pages
│   │   └── layout.tsx    # Root layout
│   ├── components/       # React components
│   │   ├── mail/         # Email list, compose, view
│   │   └── ui/           # Shadcn/UI components
│   ├── contexts/         # React contexts
│   │   ├── auth-context.tsx
│   │   └── i18n-context.tsx
│   ├── services/         # API services
│   │   ├── email-service.ts
│   │   └── ai-service.ts
│   └── lib/              # Utilities
│       └── supabase.ts   # Supabase client
```

### 10.2 Email Service

**Mở file:** `Email-System-Client/src/services/email-service.ts`

```bash
code Email-System-Client/src/services/email-service.ts
```

**Show các method chính:**

```typescript
class EmailService {
  private async fetchWithAuth(url: string, options: RequestInit = {}) {
    const token = await this.getAuthToken();
    return fetch(url, {
      ...options,
      headers: {
        'Authorization': `Bearer ${token}`,
        'Content-Type': 'application/json',
      },
    });
  }

  async getEmails(filters: EmailFilters) {
    const response = await this.fetchWithAuth(`${API_URL}/api/emails?${params}`);
    return await response.json();
  }

  async sendEmail(data) {
    const response = await this.fetchWithAuth(`${API_URL}/api/emails`, {
      method: 'POST',
      body: JSON.stringify(data),
    });
    return await response.json();
  }

  async updateEmail(id, updates) {
    const response = await this.fetchWithAuth(`${API_URL}/api/emails/${id}`, {
      method: 'PATCH',
      body: JSON.stringify(updates),
    });
    return response.ok;
  }
}
```

---

## 🎬 Kịch bản Demo

### Demo 1: Đăng nhập & Xác thực
1. Mở trang login
2. Đăng nhập bằng email/password hoặc Google
3. **Show code:** `auth-context.tsx` - giải thích Supabase Auth

### Demo 2: Xem danh sách Email
1. Vào Inbox, show danh sách email
2. Click vào email để xem chi tiết
3. **Show code:** `email-service.ts` - API calls

### Demo 3: Soạn & Gửi Email
1. Click "Compose" để soạn email mới
2. Điền người nhận (trong và ngoài hệ thống)
3. Gửi email
4. **Show code:** `smtp.js` - giải thích gửi via SMTP

### Demo 4: AI Features
1. Mở một email dài
2. Click "Summarize" để tóm tắt
3. Show "Smart Reply" suggestions
4. **Show code:** `gemini.js` - giải thích Gemini AI

### Demo 5: Spam Detection
1. Show email bị phân loại là spam
2. **Show code:** `naiveBayes.js` - giải thích thuật toán

### Demo 6: Real-time (nếu có 2 accounts)
1. Đăng nhập 2 account trên 2 browser
2. Gửi email từ account 1 đến account 2
3. Email xuất hiện ngay lập tức!
4. **Show code:** `imap.js` và WebSocket

---

## 💡 Câu hỏi thường gặp từ thầy

### Q: "Tại sao dùng Titan Email mà không dùng Gmail API?"
> "Gmail API giới hạn quota và cần OAuth phức tạp. Titan Email cho domain riêng, professional hơn, và full control SMTP/IMAP."

### Q: "AES-256 có an toàn không?"
> "AES-256 là chuẩn mã hóa được chính phủ Mỹ sử dụng cho thông tin tuyệt mật. Với key 32 bytes, có 2^256 khả năng - impossible to brute force."

### Q: "Naive Bayes accuracy như thế nào?"
> "Naive Bayes đơn giản nhưng hiệu quả cho text classification. Với training data đủ lớn, accuracy có thể đạt 85-95% cho spam detection."

### Q: "Tại sao không dùng PhoBERT?"
> "PhoBERT mạnh hơn nhưng cần GPU và setup phức tạp. Naive Bayes chạy được trên mọi server, phù hợp với scope dự án."

---

## 📚 Tài liệu tham khảo

- [Supabase Docs](https://supabase.com/docs)
- [Nodemailer](https://nodemailer.com/)
- [ImapFlow](https://imapflow.com/)
- [Google Gemini AI](https://ai.google.dev/)
- [Natural.js (Naive Bayes)](https://naturalnode.github.io/natural/)

---

**© 2025 VeryGoodMail by Hoàn**

*Chúc em thi tốt! 🍀*
