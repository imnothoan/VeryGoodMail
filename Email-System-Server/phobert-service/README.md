# PhoBERT Email Classification Service

Dịch vụ phân loại email sử dụng PhoBERT - mô hình BERT được pre-trained cho tiếng Việt.

## Tính năng

- 🔍 **Spam Detection**: Phát hiện email spam với độ chính xác cao
- 😊 **Sentiment Analysis**: Phân tích cảm xúc email (tích cực/tiêu cực/trung lập)
- 📁 **Email Classification**: Phân loại email vào các thư mục (Quan trọng, Xã hội, Khuyến mãi, Cập nhật)

## Cài đặt

### Yêu cầu
- Python 3.8+
- CUDA (optional, cho GPU acceleration)

### Cài đặt dependencies

```bash
pip install -r requirements.txt
```

### Chạy server

```bash
# Development
uvicorn main:app --reload --host 0.0.0.0 --port 8000

# Production
gunicorn main:app -w 4 -k uvicorn.workers.UvicornWorker --bind 0.0.0.0:8000
```

## API Endpoints

### POST /classify
Phân loại email (spam/ham và category)

```json
{
  "subject": "Tiêu đề email",
  "body": "Nội dung email",
  "language": "vi"
}
```

### POST /sentiment
Phân tích cảm xúc email

```json
{
  "text": "Nội dung cần phân tích"
}
```

### GET /health
Kiểm tra trạng thái service

## Training

Xem file `training/PhoBERT_Email_Classifier_Training.ipynb` để train model trên Google Colab.

## Cấu trúc thư mục

```
phobert-service/
├── main.py              # FastAPI application
├── models/              # Trained models
├── training/            # Training notebooks
├── requirements.txt     # Python dependencies
└── README.md
```
