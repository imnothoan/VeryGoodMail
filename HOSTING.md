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
# ⚠️ Selector có thể là titan, titan1, titan2, hoặc default - kiểm tra trong Titan Admin
Type: TXT
Host: titan1._domainkey    (hoặc selector mà Titan hiển thị)
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

### 2.8 ⭐ Cấu hình Catch-All (QUAN TRỌNG)

Để nhận email cho TẤT CẢ users (ví dụ: `imnothoan@verygoodmail.tech`, `user2@verygoodmail.tech`, etc.), bạn cần cấu hình **Catch-All Email**:

#### Cách 1: Catch-All trong Titan Email (Khuyên dùng)
1. Đăng nhập Titan Admin Panel
2. Vào **Settings** → **Routing** hoặc **Email Routing**
3. Tìm option **Catch-All** hoặc **Default Routing**
4. Cấu hình để forward tất cả email không có mailbox riêng về `admin@verygoodmail.tech`

**Cách hoạt động:**
```
user1@gmail.com gửi email đến → imnothoan@verygoodmail.tech
                                    ↓
            Titan catch-all forward → admin@verygoodmail.tech (IMAP mailbox)
                                    ↓
            VeryGoodMail IMAP nhận → Parse recipient header
                                    ↓
            Tìm user "imnothoan" trong database → Deliver vào inbox
```

#### Cách 2: Tạo Email Alias
Nếu Titan không hỗ trợ catch-all:
1. Với mỗi user đăng ký mới, tạo Alias email trong Titan
2. Alias trỏ về `admin@verygoodmail.tech`

**Ví dụ:**
```
imnothoan@verygoodmail.tech → alias → admin@verygoodmail.tech
user2@verygoodmail.tech     → alias → admin@verygoodmail.tech
```

#### Cách 3: Sử dụng Email API Service (Nâng cao)
Nếu cần scale lớn, cân nhắc sử dụng:
- **Mailgun** - Có Inbound Email Routing
- **SendGrid** - Inbound Parse Webhook
- **Postmark** - Inbound Processing

Những service này cho phép:
- Nhận email real-time qua webhook
- Không giới hạn số mailbox
- Tích hợp dễ dàng hơn

### 2.9 Kiểm tra nhận email từ bên ngoài

1. Gửi email từ Gmail đến `admin@verygoodmail.tech`
2. Kiểm tra server logs:
   ```
   📧 Processing: "Test email" from user@gmail.com
      Recipients: admin@verygoodmail.tech
   ✓ Email delivered to 1 user(s)
   ```
3. Kiểm tra trong VeryGoodMail Inbox

## 🚀 Bước 3: Deploy Frontend

### Option A: GitHub Pages (Static Export - Khuyến nghị cho verygoodmail.tech)

> **Lưu ý quan trọng:** GitHub Pages chỉ hỗ trợ static files. Với Next.js, bạn cần sử dụng `output: 'export'` để tạo static HTML.

#### Bước 3.1: Cấu hình Next.js cho Static Export

Thêm vào file `Email-System-Client/next.config.ts`:
```typescript
import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  output: 'export',
  // Disable image optimization for static export
  images: {
    unoptimized: true,
  },
  // Base path nếu deploy vào subdirectory
  // basePath: '/VeryGoodMail',
  trailingSlash: true,
};

export default nextConfig;
```

#### Bước 3.2: Tạo GitHub Actions Workflow

Tạo file `.github/workflows/deploy.yml`:
```yaml
name: Deploy to GitHub Pages

on:
  push:
    branches: [main]
  workflow_dispatch:

permissions:
  contents: read
  pages: write
  id-token: write

concurrency:
  group: "pages"
  cancel-in-progress: false

jobs:
  build:
    runs-on: ubuntu-latest
    steps:
      - name: Checkout
        uses: actions/checkout@v4

      - name: Setup Node
        uses: actions/setup-node@v4
        with:
          node-version: "20"
          cache: 'npm'
          cache-dependency-path: Email-System-Client/package-lock.json

      - name: Install dependencies
        working-directory: Email-System-Client
        run: npm ci

      - name: Build
        working-directory: Email-System-Client
        env:
          NEXT_PUBLIC_SUPABASE_URL: ${{ secrets.NEXT_PUBLIC_SUPABASE_URL }}
          NEXT_PUBLIC_SUPABASE_ANON_KEY: ${{ secrets.NEXT_PUBLIC_SUPABASE_ANON_KEY }}
          NEXT_PUBLIC_API_URL: ${{ secrets.NEXT_PUBLIC_API_URL }}
        run: npm run build

      - name: Upload artifact
        uses: actions/upload-pages-artifact@v3
        with:
          path: Email-System-Client/out

  deploy:
    environment:
      name: github-pages
      url: ${{ steps.deployment.outputs.page_url }}
    runs-on: ubuntu-latest
    needs: build
    steps:
      - name: Deploy to GitHub Pages
        id: deployment
        uses: actions/deploy-pages@v4
```

#### Bước 3.3: Cấu hình GitHub Repository

1. Vào Repository → Settings → Pages
2. Source: chọn "GitHub Actions"
3. Vào Settings → Secrets and variables → Actions
4. Thêm các secrets:
   - `NEXT_PUBLIC_SUPABASE_URL`
   - `NEXT_PUBLIC_SUPABASE_ANON_KEY`
   - `NEXT_PUBLIC_API_URL`

#### Bước 3.4: Cấu hình Custom Domain (verygoodmail.tech)

1. Trong Repository → Settings → Pages → Custom domain
2. Nhập: `verygoodmail.tech`
3. Tick "Enforce HTTPS"

4. Thêm DNS Records tại domain provider:
```
# For apex domain (verygoodmail.tech)
Type: A
Host: @
Value: 185.199.108.153

Type: A
Host: @
Value: 185.199.109.153

Type: A
Host: @
Value: 185.199.110.153

Type: A
Host: @
Value: 185.199.111.153

# For www subdomain
Type: CNAME
Host: www
Value: imnothoan.github.io
```

5. Tạo file `Email-System-Client/public/CNAME` với nội dung:
```
verygoodmail.tech
```

### Option B: Deploy lên Vercel (Server-Side Rendering)

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

### Option C: Deploy lên Netlify

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
2. Tạo bucket `media` (cho email attachments):
   - Tên: `media`
   - Public: No (private)
   - File size limit: 52428800 (50MB)
3. Tạo bucket `avatars` (cho ảnh đại diện):
   - Tên: `avatars`
   - Public: Yes (public - để hiển thị trong email)
   - File size limit: 2097152 (2MB)
4. Chạy phần Storage Policies trong `supabase-schema.sql`

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
- [ ] Storage bucket `media` tạo xong
- [ ] Storage bucket `avatars` tạo xong (public)
- [ ] Storage policies đã chạy
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

### ⚠️ Lỗi DKIM - "Error in dkim public key, DKIM public key not found in dns"

**Nguyên nhân**: DNS records cho DKIM chưa được cấu hình đúng hoặc chưa propagate.

**⚠️ QUAN TRỌNG - Selector Name**: 
- Titan Email sử dụng selector khác nhau tùy theo tài khoản. Phổ biến nhất là `titan1`, `titan2`, hoặc `default`.
- **Kiểm tra selector đúng** trong Titan Admin Panel → Email Authentication → DKIM Settings

**Cách sửa:**

1. **Đăng nhập Titan Admin Panel** và lấy DKIM key:
   - Vào Settings → Email Authentication hoặc DNS Settings
   - Tìm **DKIM Record** - nó sẽ hiển thị dạng: `titan1._domainkey` hoặc `titan._domainkey`
   - Copy toàn bộ selector name và DKIM public key

2. **Thêm DKIM record vào DNS** (ví dụ với selector `titan1`):
   ```
   Type: TXT
   Host: titan1._domainkey    (hoặc selector mà Titan cung cấp)
   Value: v=DKIM1; k=rsa; p=<YOUR_DKIM_PUBLIC_KEY>
   TTL: 3600
   ```

3. **Kiểm tra DKIM đã propagate**:
   - Dùng [mxtoolbox.com](https://mxtoolbox.com/dkim.aspx)
   - Nhập domain: `verygoodmail.tech`
   - Nhập selector: `titan1` (hoặc selector bạn đang dùng)
   - Hoặc dùng lệnh: `nslookup -type=txt titan1._domainkey.verygoodmail.tech`

4. **Đợi propagation**: DNS changes có thể mất 15 phút - 48 giờ để propagate hoàn toàn.

5. **Kiểm tra trong Titan Admin Panel**: Sau khi DNS propagate, vào lại Titan Admin → Email Authentication để verify. Nếu vẫn báo lỗi, có thể do:
   - DNS chưa propagate hoàn toàn (đợi thêm)
   - Selector name không đúng
   - Value bị thiếu dấu ngoặc kép hoặc có ký tự thừa

### ⚠️ Lỗi SPF Record không hợp lệ

**Cách sửa:**
```
Type: TXT
Host: @
Value: v=spf1 include:spf.titan.email ~all
TTL: 3600
```

**Lưu ý**: Chỉ nên có MỘT TXT record cho SPF. Nếu có nhiều, cần gộp lại.

### ⚠️ MX Records không được nhận diện

**Cách sửa:**
```
Type: MX
Host: @
Value: mx1.titan.email
Priority: 10

Type: MX
Host: @
Value: mx2.titan.email  
Priority: 20
```

**Kiểm tra**: Dùng [mxtoolbox.com](https://mxtoolbox.com/MXLookup.aspx) → nhập `verygoodmail.tech`

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
