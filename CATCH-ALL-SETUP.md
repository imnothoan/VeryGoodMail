# 📧 Hướng dẫn Cấu hình Catch-All Email cho VeryGoodMail

Tài liệu này hướng dẫn chi tiết cách cấu hình **Catch-All Email** để nhận email từ bên ngoài (Gmail, Outlook, etc.) cho TẤT CẢ users trong hệ thống VeryGoodMail.

**© 2025 VeryGoodMail by Hoàn**

---

## 🎯 Mục tiêu

Sau khi cấu hình xong:
- ✅ Ai đó từ Gmail gửi email đến `imnothoan@verygoodmail.tech` → User `imnothoan` nhận được trong Inbox
- ✅ Ai đó từ Outlook gửi email đến `admin@verygoodmail.tech` → User `admin` nhận được trong Inbox
- ✅ Email nhận được **real-time** (dưới 1 giây)
- ✅ Tự động phân loại spam, promotions, social, etc.

---

## 📋 Yêu cầu

1. ✅ Domain `verygoodmail.tech` đã trỏ MX records về Titan Email
2. ✅ Đã tạo ít nhất 1 email account trên Titan (ví dụ: `admin@verygoodmail.tech`)
3. ✅ Server VeryGoodMail đã cấu hình IMAP

---

## 🔧 Bước 1: Đăng nhập Titan Admin Panel

### 1.1 Truy cập Admin Panel
Có 2 cách đăng nhập:

**Cách 1: Từ Namecheap (nếu mua domain ở đây)**
1. Đăng nhập [namecheap.com](https://namecheap.com)
2. Vào **Domain List** → Chọn `verygoodmail.tech`
3. Click **Manage** → Tab **EMAIL**
4. Click **Go to Admin Panel** hoặc **Manage Email**

**Cách 2: Trực tiếp từ Titan**
1. Truy cập [control.titan.email](https://control.titan.email) hoặc [admin.titan.email](https://admin.titan.email)
2. Đăng nhập với tài khoản admin email

---

## 🔧 Bước 2: Cấu hình Catch-All

### 2.1 Tìm Email Routing Settings

Trong Admin Panel, tìm một trong các mục sau (tùy phiên bản giao diện):
- **Settings** → **Email Routing**
- **Domain Settings** → **Catch-All**
- **Mail Flow** → **Default Routing**
- **Advanced Settings** → **Catch-All Address**

### 2.2 Bật Catch-All

1. **Enable Catch-All** hoặc **Turn On Catch-All**
2. **Forward To**: Chọn `admin@verygoodmail.tech` (hoặc email admin bạn đã tạo)
3. **Action**: Chọn **Deliver to mailbox** hoặc **Forward**
4. Click **Save** hoặc **Apply**

### 2.3 Xác nhận cấu hình

Sau khi bật, bạn sẽ thấy thông báo:
```
Catch-All: Enabled
Forward to: admin@verygoodmail.tech
```

---

## 🔧 Bước 3: Cấu hình IMAP trên Server

### 3.1 Cập nhật file .env

```env
# IMAP Configuration for RECEIVING emails
IMAP_HOST=imap.titan.email
IMAP_PORT=993
IMAP_SECURE=true
IMAP_USER=admin@verygoodmail.tech
IMAP_PASS=your_titan_email_password

# Email domain (quan trọng!)
EMAIL_DOMAIN=verygoodmail.tech
```

### 3.2 Khởi động lại Server

```bash
cd Email-System-Server
npm start
```

### 3.3 Kiểm tra logs

Nếu cấu hình đúng, bạn sẽ thấy:
```
✓ IMAP IDLE active - listening for incoming emails
```

---

## 🧪 Bước 4: Test Catch-All

### 4.1 Gửi email test từ Gmail

1. Đăng nhập Gmail cá nhân
2. Soạn email mới
3. **To**: `imnothoan@verygoodmail.tech` (hoặc bất kỳ username nào đã đăng ký trong VeryGoodMail)
4. **Subject**: `Test Catch-All`
5. **Body**: `This is a test email`
6. Gửi email

### 4.2 Kiểm tra trên Server

Xem logs, bạn sẽ thấy:
```
📧 Processing: "Test Catch-All" from your_gmail@gmail.com
   Recipients: imnothoan@verygoodmail.tech
✓ Email delivered to 1 user(s)
```

### 4.3 Kiểm tra trên VeryGoodMail

1. Đăng nhập VeryGoodMail với user `imnothoan`
2. Vào **Inbox**
3. Email test sẽ xuất hiện!

---

## 🔄 Cách hoạt động (Flow)

```
┌─────────────────────────────────────────────────────────────────────┐
│                         EMAIL FLOW                                   │
├─────────────────────────────────────────────────────────────────────┤
│                                                                      │
│  1. Gmail User gửi email đến: imnothoan@verygoodmail.tech           │
│                           ↓                                          │
│  2. MX Records chỉ đến Titan Email servers                          │
│                           ↓                                          │
│  3. Titan nhận email, kiểm tra mailbox "imnothoan" - KHÔNG TỒN TẠI  │
│                           ↓                                          │
│  4. Catch-All kích hoạt → Forward đến admin@verygoodmail.tech       │
│                           ↓                                          │
│  5. VeryGoodMail IMAP IDLE nhận được email ngay lập tức             │
│                           ↓                                          │
│  6. Parse headers: X-Original-To = imnothoan@verygoodmail.tech      │
│                           ↓                                          │
│  7. Lookup user "imnothoan" trong database                          │
│                           ↓                                          │
│  8. Deliver email vào inbox của user "imnothoan"                    │
│                           ↓                                          │
│  9. WebSocket notification → User thấy email mới real-time! ✨       │
│                                                                      │
└─────────────────────────────────────────────────────────────────────┘
```

---

## ⚠️ Troubleshooting

### Email không nhận được

1. **Kiểm tra MX Records**
   ```bash
   dig MX verygoodmail.tech
   ```
   Phải trả về `mx1.titan.email` và `mx2.titan.email`

2. **Kiểm tra Catch-All đã bật**
   - Vào Titan Admin Panel → Email Routing

3. **Kiểm tra IMAP credentials**
   - Test đăng nhập webmail tại [mail.titan.email](https://mail.titan.email)

4. **Kiểm tra logs server**
   ```bash
   # Nếu dùng PM2
   pm2 logs verygoodmail-api
   ```

### Email nhận nhưng không vào đúng user

1. **Kiểm tra user đã đăng ký chưa**
   - Email `imnothoan@verygoodmail.tech` chỉ nhận được nếu có user với email đó trong database

2. **Kiểm tra profiles table**
   ```sql
   SELECT * FROM profiles WHERE email = 'imnothoan@verygoodmail.tech';
   ```

### IMAP không kết nối

1. **Kiểm tra credentials**
   ```
   IMAP_USER=admin@verygoodmail.tech  ← Đúng email Titan
   IMAP_PASS=correct_password         ← Đúng mật khẩu
   ```

2. **Kiểm tra firewall**
   - Port 993 (IMAPS) phải được mở

---

## 📊 Giới hạn Titan Free Trial

- **2 mailboxes** - Chỉ cần 1 mailbox (admin) cho catch-all
- **90 ngày trial** - Sau đó cần nâng cấp hoặc chuyển sang provider khác
- **Storage giới hạn** - Theo gói trial

---

## 🔮 Alternatives (Nếu cần scale lớn)

Nếu Titan không đáp ứng được nhu cầu:

### Mailgun (Khuyên dùng cho developers)
- Inbound email routing với webhooks
- 10,000 emails/tháng miễn phí
- API dễ tích hợp

### SendGrid
- Inbound Parse webhook
- Scalable
- Tích hợp nhiều features

### Amazon SES + S3
- Rẻ nhất cho volume lớn
- Cần setup nhiều hơn

---

## ✅ Checklist

- [ ] MX Records trỏ về Titan
- [ ] Tạo mailbox `admin@verygoodmail.tech` trên Titan
- [ ] Bật Catch-All forward về `admin@...`
- [ ] Cấu hình IMAP trong `.env`
- [ ] Khởi động server, thấy "IMAP IDLE active"
- [ ] Test gửi email từ Gmail
- [ ] Nhận được email trong VeryGoodMail Inbox

---

**Cần hỗ trợ?** Tạo issue trên GitHub hoặc liên hệ: admin@verygoodmail.tech

**© 2025 VeryGoodMail bởi Hoàn**
