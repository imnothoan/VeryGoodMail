# VeryGoodMail 📧

Hệ thống email hiện đại với tính năng AI thông minh, hỗ trợ tiếng Việt và tiếng Anh.

**© 2025 VeryGoodMail by <span style="color: orange;">Hoàn</span>**

## 🌟 Tính năng

### Email Client (Frontend)
- 📱 Giao diện hiện đại, responsive (Next.js 16 + Tailwind CSS)
- 🌍 Đa ngôn ngữ (i18n): Tiếng Việt & Tiếng Anh
- 🔐 Xác thực Supabase (Email, Google, GitHub)
- 🌙 Chế độ tối/sáng
- ⌨️ Phím tắt bàn phím
- 📂 Phân loại email thông minh (Inbox, Sent, Drafts, Spam, Trash)

### AI Features (PhoBERT + Gemini)
- 🤖 **PhoBERT**: Phát hiện spam, phân tích cảm xúc, phân loại email
- 💬 **Gemini AI**: Tóm tắt email, gợi ý trả lời thông minh
- 🔍 **Vector Space Search**: Tìm kiếm email nhanh chóng với TF-IDF

### Bảo mật
- 🔒 Mã hóa AES-256 cho nội dung email
- 🛡️ Row Level Security (RLS) với Supabase
- 🚦 Rate limiting để chống DDoS
- 🔑 JWT authentication

## 📁 Cấu trúc dự án

```
VeryGoodMail/
├── Email-System-Client/     # Frontend (Next.js)
│   ├── src/
│   │   ├── app/            # Next.js App Router
│   │   ├── components/     # React components
│   │   ├── contexts/       # React contexts (Auth, i18n)
│   │   ├── hooks/          # Custom hooks
│   │   ├── lib/            # Utilities & i18n
│   │   └── types/          # TypeScript types
│   └── package.json
│
├── Email-System-Server/     # Backend (Node.js)
│   ├── src/
│   │   ├── routes/         # API routes
│   │   ├── middleware/     # Auth middleware
│   │   ├── services/       # AI services
│   │   └── utils/          # Encryption utils
│   ├── phobert-service/    # PhoBERT Python service
│   │   ├── main.py         # FastAPI server
│   │   ├── training/       # Training notebook
│   │   └── models/         # Trained models
│   └── package.json
│
└── supabase-schema.sql     # Database schema
```

## 🚀 Cài đặt

### 1. Clone repository
```bash
git clone https://github.com/imnothoan/VeryGoodMail.git
cd VeryGoodMail
```

### 2. Thiết lập Supabase
1. Tạo project tại [supabase.com](https://supabase.com)
2. Mở SQL Editor
3. Copy và chạy nội dung file `supabase-schema.sql`
4. Lấy Project URL và API keys từ Settings > API

### 3. Cài đặt Client
```bash
cd Email-System-Client
cp .env.example .env.local
# Sửa file .env.local với Supabase credentials
npm install
npm run dev
```

### 4. Cài đặt Server
```bash
cd Email-System-Server
cp .env.example .env
# Sửa file .env với các credentials
npm install
npm run dev
```

### 5. (Optional) Cài đặt PhoBERT Service
```bash
cd Email-System-Server/phobert-service
pip install -r requirements.txt
USE_PHOBERT=true python main.py
```

## ⚙️ Biến môi trường

### Client (.env.local)
```env
NEXT_PUBLIC_SUPABASE_URL=your_supabase_url
NEXT_PUBLIC_SUPABASE_ANON_KEY=your_supabase_anon_key
NEXT_PUBLIC_API_URL=http://localhost:3001
```

### Server (.env)
```env
SUPABASE_URL=your_supabase_url
SUPABASE_ANON_KEY=your_supabase_anon_key
SUPABASE_SERVICE_ROLE_KEY=your_service_role_key
GEMINI_API_KEY=your_gemini_api_key
ENCRYPTION_KEY=your_32_character_key
PORT=3001
```

## 🧠 Training PhoBERT

1. Mở file `Email-System-Server/phobert-service/training/PhoBERT_Email_Classifier_Training.ipynb` trên Google Colab
2. Chạy tất cả cells để train model
3. Download file `phobert_email_models.zip`
4. Giải nén vào thư mục `phobert-service/models/`

## 📖 API Endpoints

### Emails
- `GET /api/emails` - Lấy danh sách email
- `GET /api/emails/:id` - Lấy chi tiết email
- `POST /api/emails` - Gửi/lưu email
- `PATCH /api/emails/:id` - Cập nhật email
- `DELETE /api/emails/:id` - Xóa email

### AI
- `POST /api/ai/classify` - Phân loại email (spam, sentiment, category)
- `POST /api/ai/summarize` - Tóm tắt email
- `POST /api/ai/smart-reply` - Gợi ý trả lời
- `POST /api/ai/search` - Tìm kiếm email
- `GET /api/ai/health` - Kiểm tra trạng thái AI services

## 🔐 Bảo mật

### Mã hóa nội dung email
- Nội dung email được mã hóa AES-256 trước khi lưu vào database
- Chỉ có user với encryption key mới có thể giải mã
- Admin database **KHÔNG** thể đọc được nội dung email

### Row Level Security
- Mỗi user chỉ có thể truy cập dữ liệu của chính mình
- Được enforced ở level database (Supabase RLS)

## 🤝 Đóng góp

Mọi đóng góp đều được chào đón! Vui lòng tạo Pull Request hoặc Issue.

## 📄 License

MIT License - Xem file [LICENSE](LICENSE) để biết thêm chi tiết.

---

**© 2025 VeryGoodMail bởi <span style="color: orange;">Hoàn</span>**