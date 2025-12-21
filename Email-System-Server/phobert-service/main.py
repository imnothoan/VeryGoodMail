"""
PhoBERT Email Classification Service
=====================================
FastAPI server for email spam detection and sentiment analysis using PhoBERT.

Author: VeryGoodMail Team
License: MIT
"""

import os
import logging
from typing import Optional, List
from enum import Enum

from fastapi import FastAPI, HTTPException, BackgroundTasks
from fastapi.middleware.cors import CORSMiddleware
from pydantic import BaseModel, Field
import torch
from transformers import AutoTokenizer, AutoModelForSequenceClassification
import numpy as np

# Configure logging
logging.basicConfig(
    level=logging.INFO,
    format='%(asctime)s - %(name)s - %(levelname)s - %(message)s'
)
logger = logging.getLogger(__name__)

# Initialize FastAPI app
app = FastAPI(
    title="PhoBERT Email Classifier",
    description="Email spam detection and sentiment analysis using PhoBERT",
    version="1.0.0"
)

# CORS middleware
app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],  # Configure appropriately for production
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# ============================================================
# Enums and Models
# ============================================================

class SpamLabel(str, Enum):
    SPAM = "spam"
    HAM = "ham"

class SentimentLabel(str, Enum):
    POSITIVE = "positive"
    NEGATIVE = "negative"
    NEUTRAL = "neutral"

class EmailCategory(str, Enum):
    IMPORTANT = "important"
    SOCIAL = "social"
    PROMOTIONS = "promotions"
    UPDATES = "updates"
    PRIMARY = "primary"

class ClassifyRequest(BaseModel):
    subject: str = Field(default="", description="Email subject")
    body: str = Field(default="", description="Email body content")
    language: str = Field(default="vi", description="Language code: 'vi' or 'en'")

class SentimentRequest(BaseModel):
    text: str = Field(..., description="Text to analyze")

class ClassifyResponse(BaseModel):
    is_spam: bool
    spam_confidence: float
    category: str
    category_confidence: float
    sentiment: str
    sentiment_confidence: float
    processing_time_ms: float

class SentimentResponse(BaseModel):
    sentiment: str
    confidence: float
    scores: dict

class HealthResponse(BaseModel):
    status: str
    model_loaded: bool
    device: str
    message: str

# ============================================================
# PhoBERT Model Manager
# ============================================================

class PhoBERTClassifier:
    """
    PhoBERT-based email classifier supporting:
    - Spam detection
    - Sentiment analysis
    - Email categorization
    """
    
    def __init__(self):
        self.device = torch.device("cuda" if torch.cuda.is_available() else "cpu")
        logger.info(f"Using device: {self.device}")
        
        self.tokenizer = None
        self.spam_model = None
        self.sentiment_model = None
        self.category_model = None
        self.models_loaded = False
        
        # Label mappings
        self.spam_labels = ["ham", "spam"]
        self.sentiment_labels = ["negative", "neutral", "positive"]
        self.category_labels = ["important", "social", "promotions", "updates", "primary"]
        
    def load_models(self):
        """Load PhoBERT models. Falls back to base model if fine-tuned not available."""
        try:
            logger.info("Loading PhoBERT tokenizer...")
            self.tokenizer = AutoTokenizer.from_pretrained("vinai/phobert-base")
            
            # Try to load fine-tuned models, fallback to base model
            model_paths = {
                "spam": os.getenv("SPAM_MODEL_PATH", "models/spam_classifier"),
                "sentiment": os.getenv("SENTIMENT_MODEL_PATH", "models/sentiment_classifier"),
                "category": os.getenv("CATEGORY_MODEL_PATH", "models/category_classifier")
            }
            
            # Load or create spam model
            if os.path.exists(model_paths["spam"]):
                logger.info(f"Loading fine-tuned spam model from {model_paths['spam']}")
                self.spam_model = AutoModelForSequenceClassification.from_pretrained(
                    model_paths["spam"]
                ).to(self.device)
            else:
                logger.info("Using base PhoBERT for spam detection (not fine-tuned)")
                self.spam_model = AutoModelForSequenceClassification.from_pretrained(
                    "vinai/phobert-base",
                    num_labels=2
                ).to(self.device)
            
            # Load or create sentiment model
            if os.path.exists(model_paths["sentiment"]):
                logger.info(f"Loading fine-tuned sentiment model from {model_paths['sentiment']}")
                self.sentiment_model = AutoModelForSequenceClassification.from_pretrained(
                    model_paths["sentiment"]
                ).to(self.device)
            else:
                logger.info("Using base PhoBERT for sentiment analysis (not fine-tuned)")
                self.sentiment_model = AutoModelForSequenceClassification.from_pretrained(
                    "vinai/phobert-base",
                    num_labels=3
                ).to(self.device)
            
            # Load or create category model
            if os.path.exists(model_paths["category"]):
                logger.info(f"Loading fine-tuned category model from {model_paths['category']}")
                self.category_model = AutoModelForSequenceClassification.from_pretrained(
                    model_paths["category"]
                ).to(self.device)
            else:
                logger.info("Using base PhoBERT for categorization (not fine-tuned)")
                self.category_model = AutoModelForSequenceClassification.from_pretrained(
                    "vinai/phobert-base",
                    num_labels=5
                ).to(self.device)
            
            # Set models to evaluation mode
            self.spam_model.eval()
            self.sentiment_model.eval()
            self.category_model.eval()
            
            self.models_loaded = True
            logger.info("All models loaded successfully!")
            
        except Exception as e:
            logger.error(f"Error loading models: {str(e)}")
            raise
    
    def preprocess_text(self, text: str, max_length: int = 256) -> dict:
        """Tokenize and prepare text for model input."""
        if not text:
            text = " "
        
        # Truncate very long texts
        text = text[:5000]
        
        encoded = self.tokenizer(
            text,
            padding="max_length",
            truncation=True,
            max_length=max_length,
            return_tensors="pt"
        )
        
        return {
            "input_ids": encoded["input_ids"].to(self.device),
            "attention_mask": encoded["attention_mask"].to(self.device)
        }
    
    @torch.no_grad()
    def predict_spam(self, text: str) -> tuple:
        """Predict if email is spam."""
        inputs = self.preprocess_text(text)
        outputs = self.spam_model(**inputs)
        probs = torch.softmax(outputs.logits, dim=1).cpu().numpy()[0]
        
        predicted_idx = np.argmax(probs)
        is_spam = self.spam_labels[predicted_idx] == "spam"
        confidence = float(probs[predicted_idx])
        
        return is_spam, confidence
    
    @torch.no_grad()
    def predict_sentiment(self, text: str) -> tuple:
        """Predict email sentiment."""
        inputs = self.preprocess_text(text)
        outputs = self.sentiment_model(**inputs)
        probs = torch.softmax(outputs.logits, dim=1).cpu().numpy()[0]
        
        predicted_idx = np.argmax(probs)
        sentiment = self.sentiment_labels[predicted_idx]
        confidence = float(probs[predicted_idx])
        
        scores = {label: float(prob) for label, prob in zip(self.sentiment_labels, probs)}
        
        return sentiment, confidence, scores
    
    @torch.no_grad()
    def predict_category(self, text: str) -> tuple:
        """Predict email category."""
        inputs = self.preprocess_text(text)
        outputs = self.category_model(**inputs)
        probs = torch.softmax(outputs.logits, dim=1).cpu().numpy()[0]
        
        predicted_idx = np.argmax(probs)
        category = self.category_labels[predicted_idx]
        confidence = float(probs[predicted_idx])
        
        return category, confidence
    
    def classify_email(self, subject: str, body: str) -> dict:
        """Full email classification: spam, sentiment, and category."""
        import time
        start_time = time.time()
        
        # Combine subject and body for analysis
        full_text = f"{subject} {body}".strip()
        
        # Run predictions
        is_spam, spam_conf = self.predict_spam(full_text)
        sentiment, sent_conf, _ = self.predict_sentiment(full_text)
        category, cat_conf = self.predict_category(full_text)
        
        processing_time = (time.time() - start_time) * 1000
        
        return {
            "is_spam": is_spam,
            "spam_confidence": round(spam_conf, 4),
            "category": category,
            "category_confidence": round(cat_conf, 4),
            "sentiment": sentiment,
            "sentiment_confidence": round(sent_conf, 4),
            "processing_time_ms": round(processing_time, 2)
        }

# ============================================================
# Rule-based Fallback Classifier
# ============================================================

class RuleBasedClassifier:
    """
    Fallback classifier using keyword rules.
    Used when PhoBERT models are not loaded.
    """
    
    SPAM_KEYWORDS = {
        "vi": ["trúng thưởng", "giảm cân", "kiếm tiền", "miễn phí", "khuyến mãi đặc biệt", 
               "click ngay", "nhấn vào đây", "ưu đãi sốc", "giới hạn", "chỉ hôm nay"],
        "en": ["winner", "lottery", "free money", "click here", "limited time", 
               "act now", "congratulations", "selected", "prize", "urgent"]
    }
    
    NEGATIVE_KEYWORDS = {
        "vi": ["thất vọng", "tệ", "kém", "tồi", "phàn nàn", "khiếu nại", "hủy", "từ chối"],
        "en": ["disappointed", "terrible", "worst", "complaint", "cancel", "refuse", "angry", "frustrated"]
    }
    
    POSITIVE_KEYWORDS = {
        "vi": ["cảm ơn", "tuyệt vời", "xuất sắc", "hài lòng", "tốt", "yêu thích"],
        "en": ["thank", "excellent", "great", "wonderful", "appreciate", "love", "amazing"]
    }
    
    CATEGORY_PATTERNS = {
        "important": ["urgent", "important", "action required", "khẩn cấp", "quan trọng", "cần xử lý"],
        "social": ["friend", "follow", "like", "comment", "bạn bè", "theo dõi", "bình luận"],
        "promotions": ["sale", "discount", "offer", "deal", "giảm giá", "khuyến mãi", "ưu đãi"],
        "updates": ["shipped", "delivered", "update", "notification", "giao hàng", "cập nhật", "thông báo"]
    }
    
    def classify(self, text: str, language: str = "vi") -> dict:
        """Rule-based classification."""
        text_lower = text.lower()
        
        # Spam detection
        spam_score = sum(1 for kw in self.SPAM_KEYWORDS.get(language, []) + self.SPAM_KEYWORDS["en"] 
                        if kw in text_lower)
        is_spam = spam_score >= 2
        spam_conf = min(0.5 + spam_score * 0.1, 0.95) if is_spam else max(0.5 - spam_score * 0.1, 0.1)
        
        # Sentiment
        pos_score = sum(1 for kw in self.POSITIVE_KEYWORDS.get(language, []) + self.POSITIVE_KEYWORDS["en"]
                       if kw in text_lower)
        neg_score = sum(1 for kw in self.NEGATIVE_KEYWORDS.get(language, []) + self.NEGATIVE_KEYWORDS["en"]
                       if kw in text_lower)
        
        if pos_score > neg_score:
            sentiment = "positive"
            sent_conf = min(0.5 + pos_score * 0.1, 0.9)
        elif neg_score > pos_score:
            sentiment = "negative"
            sent_conf = min(0.5 + neg_score * 0.1, 0.9)
        else:
            sentiment = "neutral"
            sent_conf = 0.6
        
        # Category
        category_scores = {}
        for cat, keywords in self.CATEGORY_PATTERNS.items():
            category_scores[cat] = sum(1 for kw in keywords if kw in text_lower)
        
        if max(category_scores.values()) > 0:
            category = max(category_scores, key=category_scores.get)
            cat_conf = min(0.5 + category_scores[category] * 0.15, 0.85)
        else:
            category = "primary"
            cat_conf = 0.6
        
        return {
            "is_spam": is_spam,
            "spam_confidence": spam_conf,
            "category": category,
            "category_confidence": cat_conf,
            "sentiment": sentiment,
            "sentiment_confidence": sent_conf,
            "processing_time_ms": 1.0
        }

# ============================================================
# Global instances
# ============================================================

classifier: Optional[PhoBERTClassifier] = None
fallback_classifier = RuleBasedClassifier()
USE_PHOBERT = os.getenv("USE_PHOBERT", "false").lower() == "true"

# ============================================================
# API Endpoints
# ============================================================

@app.on_event("startup")
async def startup_event():
    """Load models on startup if PhoBERT is enabled."""
    global classifier
    
    if USE_PHOBERT:
        try:
            classifier = PhoBERTClassifier()
            classifier.load_models()
            logger.info("PhoBERT models loaded successfully")
        except Exception as e:
            logger.warning(f"Failed to load PhoBERT models, using fallback: {str(e)}")
            classifier = None
    else:
        logger.info("PhoBERT disabled, using rule-based classifier")

@app.get("/", response_model=dict)
async def root():
    """Root endpoint with API info."""
    return {
        "service": "PhoBERT Email Classifier",
        "version": "1.0.0",
        "endpoints": {
            "classify": "POST /classify - Classify email",
            "sentiment": "POST /sentiment - Analyze sentiment",
            "health": "GET /health - Health check"
        }
    }

@app.get("/health", response_model=HealthResponse)
async def health_check():
    """Check service health and model status."""
    model_loaded = classifier is not None and classifier.models_loaded if classifier else False
    device = str(classifier.device) if classifier else "cpu"
    
    return HealthResponse(
        status="healthy",
        model_loaded=model_loaded,
        device=device,
        message="PhoBERT loaded" if model_loaded else "Using rule-based fallback"
    )

@app.post("/classify", response_model=ClassifyResponse)
async def classify_email(request: ClassifyRequest):
    """
    Classify email for spam, sentiment, and category.
    
    Uses PhoBERT if available, otherwise falls back to rule-based classifier.
    """
    try:
        full_text = f"{request.subject} {request.body}".strip()
        
        if not full_text:
            raise HTTPException(status_code=400, detail="Email content cannot be empty")
        
        # Use PhoBERT or fallback
        if classifier and classifier.models_loaded:
            result = classifier.classify_email(request.subject, request.body)
        else:
            result = fallback_classifier.classify(full_text, request.language)
        
        return ClassifyResponse(**result)
        
    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"Classification error: {str(e)}")
        raise HTTPException(status_code=500, detail=f"Classification failed: {str(e)}")

@app.post("/sentiment", response_model=SentimentResponse)
async def analyze_sentiment(request: SentimentRequest):
    """Analyze text sentiment."""
    try:
        if not request.text:
            raise HTTPException(status_code=400, detail="Text cannot be empty")
        
        if classifier and classifier.models_loaded:
            sentiment, confidence, scores = classifier.predict_sentiment(request.text)
        else:
            result = fallback_classifier.classify(request.text)
            sentiment = result["sentiment"]
            confidence = result["sentiment_confidence"]
            scores = {"positive": 0.33, "neutral": 0.34, "negative": 0.33}
            scores[sentiment] = confidence
        
        return SentimentResponse(
            sentiment=sentiment,
            confidence=round(confidence, 4),
            scores=scores
        )
        
    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"Sentiment analysis error: {str(e)}")
        raise HTTPException(status_code=500, detail=f"Analysis failed: {str(e)}")

@app.post("/batch-classify")
async def batch_classify(emails: List[ClassifyRequest]):
    """Classify multiple emails in batch."""
    if len(emails) > 100:
        raise HTTPException(status_code=400, detail="Maximum 100 emails per batch")
    
    results = []
    for email in emails:
        try:
            full_text = f"{email.subject} {email.body}".strip()
            if classifier and classifier.models_loaded:
                result = classifier.classify_email(email.subject, email.body)
            else:
                result = fallback_classifier.classify(full_text, email.language)
            results.append({"success": True, **result})
        except Exception as e:
            results.append({"success": False, "error": str(e)})
    
    return {"results": results, "total": len(results)}

# ============================================================
# Main entry point
# ============================================================

if __name__ == "__main__":
    import uvicorn
    port = int(os.getenv("PORT", 8000))
    uvicorn.run(app, host="0.0.0.0", port=port)
