# PhoBERT Email Classification Service

Dịch vụ này sử dụng PhoBERT để phân loại email tiếng Việt.

## Tính năng

- **Spam Detection**: Phát hiện email spam
- **Sentiment Analysis**: Phân tích cảm xúc (positive, negative, neutral)
- **Category Classification**: Phân loại email (important, social, promotions, updates, primary)

## Cài đặt

```bash
# Tạo virtual environment
python -m venv venv
source venv/bin/activate  # Linux/Mac
# hoặc: venv\Scripts\activate  # Windows

# Cài đặt dependencies
pip install -r requirements.txt
```

## Cấu trúc thư mục

```
PhoBERT-Service/
├── app/
│   ├── main.py           # FastAPI application
│   ├── models.py         # Pydantic models
│   └── classifier.py     # PhoBERT classifier
├── models/               # Thư mục chứa model đã train
│   ├── spam_model/       # Model phát hiện spam
│   ├── sentiment_model/  # Model phân tích cảm xúc  
│   └── category_model/   # Model phân loại danh mục
├── requirements.txt
├── Dockerfile
└── README.md
```

## Training model trên Google Colab

1. Mở notebook `training/VeryGoodMail_PhoBERT_Training.ipynb` trên Google Colab
2. Upload dataset của bạn
3. Chạy các cells để train model
4. Download model đã train
5. Đặt vào thư mục `models/`

## Chạy service

```bash
# Development
uvicorn app.main:app --host 0.0.0.0 --port 8000 --reload

# Production
uvicorn app.main:app --host 0.0.0.0 --port 8000 --workers 4
```

## API Endpoints

### Health Check
```
GET /health
```

### Phân loại email
```
POST /classify
Content-Type: application/json

{
  "subject": "Chủ đề email",
  "body": "Nội dung email"
}
```

Response:
```json
{
  "category": "primary",
  "is_spam": false,
  "spam_score": 0.05,
  "sentiment": "neutral",
  "sentiment_score": 0.85,
  "confidence": 0.92
}
```

### Phát hiện spam
```
POST /spam
Content-Type: application/json

{
  "text": "Nội dung cần kiểm tra"
}
```

### Phân tích cảm xúc
```
POST /sentiment
Content-Type: application/json

{
  "text": "Nội dung cần phân tích"
}
```

## Docker

```bash
# Build image
docker build -t phobert-service .

# Run container
docker run -p 8000:8000 phobert-service
```

## Kết nối với VeryGoodMail Server

Cập nhật file `.env` của Email-System-Server:

```
PHOBERT_URL=http://localhost:8000
```

## License

© 2025 VeryGoodMail by Hoàn
