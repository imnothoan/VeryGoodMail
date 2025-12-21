# 🌐 Hướng dẫn Hosting VeryGoodMail

Hướng dẫn chi tiết để deploy VeryGoodMail với tên miền `verygoodmail.tech` và cấu hình Titan Email.

**© 2025 VeryGoodMail by Hoàn**

---

## 📋 Tổng quan

VeryGoodMail bao gồm 3 thành phần chính:
1. **Email-System-Client** (Frontend) - Next.js
2. **Email-System-Server** (Backend) - Node.js/Express
3. **PhoBERT-Service** (AI) - Python/FastAPI (tùy chọn)

## 🔧 Bước 1: Cấu hình DNS cho verygoodmail.tech

### 1.1 Truy cập DNS Provider
- Đăng nhập vào nhà cung cấp tên miền (Namecheap, GoDaddy, hoặc nơi bạn mua domain)
- Vào phần DNS Management / DNS Records

### 1.2 Thêm DNS Records

#### A Records (cho website):
```
Type: A
Host: @
Value: <IP của server hosting>
TTL: 3600

Type: A
Host: www
Value: <IP của server hosting>
TTL: 3600
```

#### MX Records (cho Titan Email):
```
Type: MX
Host: @
Value: mx1.titan.email
Priority: 10
TTL: 3600

Type: MX
Host: @
Value: mx2.titan.email
Priority: 20
TTL: 3600
```

#### TXT Records (SPF, DKIM, DMARC):
```
# SPF Record
Type: TXT
Host: @
Value: v=spf1 include:spf.titan.email ~all
TTL: 3600

# DKIM Record (lấy từ Titan Admin Panel)
Type: TXT
Host: titan._domainkey
Value: <DKIM key từ Titan>
TTL: 3600

# DMARC Record
Type: TXT
Host: _dmarc
Value: v=DMARC1; p=quarantine; rua=mailto:admin@verygoodmail.tech
TTL: 3600
```

## 📧 Bước 2: Cấu hình Titan Email

### 2.1 Tạo tài khoản Email trên Titan
1. Đăng nhập vào Titan Admin Panel (từ nhà cung cấp domain)
2. Chọn "Create Email Account"
3. Tạo tài khoản admin: `admin@verygoodmail.tech`
4. Lưu mật khẩu an toàn
5. **Quan trọng**: Đợi 15-30 phút để DNS propagate trước khi test

### 2.2 Lấy thông tin SMTP
```
SMTP Host: smtp.titan.email
SMTP Port: 587 (TLS) hoặc 465 (SSL)
Username: admin@verygoodmail.tech
Password: <mật khẩu bạn tạo ở bước 2.1>
```

### 2.3 Cập nhật Server .env

**⚠️ LƯU Ý QUAN TRỌNG:**
- `SMTP_USER` phải là email bạn tạo trên Titan (vd: `admin@verygoodmail.tech`)
- `SMTP_PASS` là mật khẩu của email Titan đó
- `SMTP_FROM` nên khớp với `SMTP_USER` để email không bị đánh spam

```env
# SMTP Configuration for Titan Email
SMTP_HOST=smtp.titan.email
SMTP_PORT=587
SMTP_SECURE=false
SMTP_USER=admin@verygoodmail.tech
SMTP_PASS=your_titan_password_here
SMTP_FROM="VeryGoodMail <admin@verygoodmail.tech>"

# IMAP Configuration for receiving emails (real-time)
IMAP_HOST=imap.titan.email
IMAP_PORT=993
IMAP_SECURE=true
IMAP_USER=admin@verygoodmail.tech
IMAP_PASS=your_titan_password_here
```

### 2.4 Kiểm tra SMTP hoạt động
Sau khi cấu hình, kiểm tra SMTP bằng cách:
1. Khởi động server: `npm start`
2. Xem console log: Nếu thấy `✓ SMTP connection verified` là thành công
3. Nếu thấy `✗ SMTP connection failed` - kiểm tra lại credentials

### 2.5 Kiểm tra IMAP hoạt động (Nhận email)
Sau khi cấu hình IMAP:
1. Khởi động server: `npm start`
2. Xem console log: Nếu thấy `✓ IMAP IDLE active - listening for incoming emails` là thành công
3. Hệ thống sẽ tự động nhận email từ bên ngoài (Gmail, Outlook, etc.) trong **real-time** (< 1 giây)

### 2.6 Gửi email ra ngoài (Gmail, Outlook, etc.)
Khi người dùng gửi email đến địa chỉ không phải @verygoodmail.tech:
- Hệ thống tự động sử dụng SMTP để gửi qua Titan
- Email được gửi với `From: admin@verygoodmail.tech`
- `Reply-To` được đặt là email của người gửi thực

### 2.7 Nhận email từ bên ngoài (Gmail, Outlook, etc.)
Khi ai đó gửi email đến @verygoodmail.tech:
- Hệ thống sử dụng IMAP IDLE để nhận email **real-time**
- Email được tự động phân loại (spam, social, promotions, etc.)
- Người dùng nhận thông báo ngay lập tức qua WebSocket

## 🚀 Bước 3: Deploy Frontend (Vercel)

### 3.1 Deploy lên Vercel (Khuyến nghị)

1. **Fork repository** hoặc push code lên GitHub
2. Đăng nhập vào [vercel.com](https://vercel.com)
3. Click "Import Project" → Chọn repository
4. Cấu hình:
   - Root Directory: `Email-System-Client`
   - Framework: Next.js
   - Build Command: `npm run build`
   - Output Directory: `.next`

5. **Environment Variables** (trong Vercel Dashboard):
```
NEXT_PUBLIC_SUPABASE_URL=https://your-project.supabase.co
NEXT_PUBLIC_SUPABASE_ANON_KEY=your_anon_key
NEXT_PUBLIC_API_URL=https://api.verygoodmail.tech
```

6. **Custom Domain**:
   - Vào Project Settings → Domains
   - Thêm `verygoodmail.tech` và `www.verygoodmail.tech`
   - Cập nhật DNS theo hướng dẫn Vercel

### 3.2 Alternative: Deploy lên Netlify

```bash
# Build
cd Email-System-Client
npm run build

# Netlify CLI
npm install -g netlify-cli
netlify deploy --prod --dir=.next
```

## 🖥️ Bước 4: Deploy Backend (Railway/Render/VPS)

### Option A: Railway (Đơn giản nhất)

1. Đăng nhập [railway.app](https://railway.app)
2. New Project → Deploy from GitHub
3. Chọn repository, set Root Directory: `Email-System-Server`
4. Add Variables trong Railway Dashboard:
```
SUPABASE_URL=https://your-project.supabase.co
SUPABASE_ANON_KEY=your_anon_key
SUPABASE_SERVICE_ROLE_KEY=your_service_role_key
GEMINI_API_KEY=your_gemini_key
ENCRYPTION_KEY=your_32_char_encryption_key
PORT=3001
NODE_ENV=production
ALLOWED_ORIGINS=https://verygoodmail.tech,https://www.verygoodmail.tech
SMTP_HOST=smtp.titan.email
SMTP_PORT=587
SMTP_SECURE=false
SMTP_USER=admin@verygoodmail.tech
SMTP_PASS=your_titan_password
```
5. Custom Domain: `api.verygoodmail.tech`

### Option B: Render.com

1. New Web Service → Connect GitHub
2. Root Directory: `Email-System-Server`
3. Build Command: `npm install`
4. Start Command: `npm start`
5. Add Environment Variables (như trên)
6. Custom Domain: `api.verygoodmail.tech`

### Option C: VPS (DigitalOcean, Linode, etc.)

```bash
# SSH vào server
ssh root@your-server-ip

# Install Node.js
curl -fsSL https://deb.nodesource.com/setup_20.x | sudo -E bash -
sudo apt-get install -y nodejs

# Clone repo
git clone https://github.com/imnothoan/VeryGoodMail.git
cd VeryGoodMail/Email-System-Server

# Install dependencies
npm install

# Setup environment
cp .env.example .env
nano .env  # Điền các biến môi trường

# Install PM2 để chạy ứng dụng
npm install -g pm2
pm2 start src/index.js --name "verygoodmail-api"
pm2 save
pm2 startup

# Setup Nginx reverse proxy
sudo apt install nginx
```

Nginx config (`/etc/nginx/sites-available/verygoodmail`):
```nginx
server {
    listen 80;
    server_name api.verygoodmail.tech;

    location / {
        proxy_pass http://localhost:3001;
        proxy_http_version 1.1;
        proxy_set_header Upgrade $http_upgrade;
        proxy_set_header Connection 'upgrade';
        proxy_set_header Host $host;
        proxy_cache_bypass $http_upgrade;
    }
}
```

```bash
# Enable site
sudo ln -s /etc/nginx/sites-available/verygoodmail /etc/nginx/sites-enabled/
sudo nginx -t
sudo systemctl restart nginx

# SSL với Certbot
sudo apt install certbot python3-certbot-nginx
sudo certbot --nginx -d api.verygoodmail.tech
```

## 🗄️ Bước 5: Cấu hình Supabase

### 5.1 Database Setup
1. Tạo project tại [supabase.com](https://supabase.com)
2. Vào SQL Editor
3. Copy và chạy toàn bộ nội dung file `supabase-schema.sql`

### 5.2 Storage Setup
1. Vào Storage → Create Bucket
2. Tên: `media`
3. Public: Yes
4. File size limit: 52428800 (50MB)

### 5.3 Auth Setup
1. Vào Authentication → Providers
2. Enable Email/Password
3. (Optional) Enable Google, GitHub OAuth

### 5.4 Environment Variables
Copy các giá trị từ Settings → API:
- Project URL → `SUPABASE_URL`
- anon key → `SUPABASE_ANON_KEY`
- service_role key → `SUPABASE_SERVICE_ROLE_KEY`

## 🔐 Bước 6: Bảo mật

### 6.1 Tạo Encryption Key
```bash
# Tạo key 32 ký tự ngẫu nhiên
node -e "console.log(require('crypto').randomBytes(16).toString('hex'))"
```

### 6.2 Cấu hình CORS
Trong `.env` của server:
```
ALLOWED_ORIGINS=https://verygoodmail.tech,https://www.verygoodmail.tech
```

### 6.3 Rate Limiting
Server đã có sẵn rate limiting (100 requests/15 phút).

## 🤖 Bước 7: Cấu hình AI (Tùy chọn)

### Gemini AI
1. Vào [Google AI Studio](https://aistudio.google.com/)
2. Create API Key
3. Thêm vào `.env`: `GEMINI_API_KEY=your_key`

### PhoBERT Service (Nâng cao)
```bash
cd PhoBERT-Service

# Install Python dependencies
pip install -r requirements.txt

# Run training notebook on Google Colab
# Download trained models to models/ folder

# Start service
uvicorn app.main:app --host 0.0.0.0 --port 8000
```

## ✅ Checklist Deploy

- [ ] DNS A Records trỏ đúng IP
- [ ] MX Records cho Titan Email
- [ ] SPF, DKIM, DMARC Records
- [ ] Frontend deploy thành công
- [ ] Backend deploy thành công
- [ ] SSL certificates hoạt động
- [ ] Supabase database setup
- [ ] Storage bucket tạo xong
- [ ] Environment variables đầy đủ
- [ ] SMTP gửi email được (gửi ra ngoài)
- [ ] IMAP nhận email được (nhận từ bên ngoài)
- [ ] Đăng ký/đăng nhập hoạt động
- [ ] Gửi email nội bộ hoạt động
- [ ] Gửi email ra ngoài hoạt động
- [ ] Nhận email từ bên ngoài hoạt động (real-time)

## 🐛 Troubleshooting

### Email không gửi được
1. Kiểm tra SMTP credentials
2. Kiểm tra MX records đã propagate chưa (dùng [mxtoolbox.com](https://mxtoolbox.com))
3. Kiểm tra SPF record

### Gemini AI không hoạt động
1. Kiểm tra API key hợp lệ
2. Kiểm tra quota còn dư
3. Xem logs: `pm2 logs` hoặc Railway/Render logs

### Lỗi CORS
1. Kiểm tra ALLOWED_ORIGINS
2. Đảm bảo frontend URL khớp chính xác

### Database errors
1. Kiểm tra RLS policies
2. Kiểm tra service role key

---

## 📞 Hỗ trợ

Nếu gặp vấn đề, tạo Issue trên GitHub hoặc liên hệ: admin@verygoodmail.tech

**© 2025 VeryGoodMail bởi Hoàn**
