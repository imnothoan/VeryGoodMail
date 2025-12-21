"""
PhoBERT Email Classification Service
FastAPI application for Vietnamese email classification

© 2025 VeryGoodMail by Hoàn
"""

from fastapi import FastAPI, HTTPException
from fastapi.middleware.cors import CORSMiddleware
from pydantic import BaseModel
from typing import Optional
import logging
import os

# Import classifier (will be implemented with trained model)
from .classifier import PhoBERTClassifier

# Configure logging
logging.basicConfig(level=logging.INFO)
logger = logging.getLogger(__name__)

# Initialize FastAPI app
app = FastAPI(
    title="PhoBERT Email Classification Service",
    description="Vietnamese email classification using PhoBERT",
    version="1.0.0"
)

# CORS middleware
app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],  # Configure this for production
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# Initialize classifier
classifier = None

@app.on_event("startup")
async def startup_event():
    """Load models on startup"""
    global classifier
    try:
        model_path = os.getenv("MODEL_PATH", "./models")
        classifier = PhoBERTClassifier(model_path)
        logger.info("PhoBERT classifier loaded successfully")
    except Exception as e:
        logger.error(f"Failed to load classifier: {e}")
        # Service will still start but return errors for classification requests


# Request/Response Models
class ClassifyRequest(BaseModel):
    subject: Optional[str] = ""
    body: Optional[str] = ""
    text: Optional[str] = ""

class ClassifyResponse(BaseModel):
    category: str
    is_spam: bool
    spam_score: float
    sentiment: str
    sentiment_score: float
    confidence: float

class SpamRequest(BaseModel):
    text: str

class SpamResponse(BaseModel):
    is_spam: bool
    spam_score: float
    confidence: float

class SentimentRequest(BaseModel):
    text: str

class SentimentResponse(BaseModel):
    sentiment: str  # positive, negative, neutral
    score: float
    confidence: float

class HealthResponse(BaseModel):
    status: str
    model_loaded: bool
    version: str


# API Endpoints
@app.get("/health", response_model=HealthResponse)
async def health_check():
    """Health check endpoint"""
    return HealthResponse(
        status="healthy",
        model_loaded=classifier is not None and classifier.is_loaded,
        version="1.0.0"
    )


@app.post("/classify", response_model=ClassifyResponse)
async def classify_email(request: ClassifyRequest):
    """
    Classify email content
    
    - Detects spam
    - Analyzes sentiment
    - Categorizes email (important, social, promotions, updates, primary)
    """
    if classifier is None or not classifier.is_loaded:
        raise HTTPException(status_code=503, detail="Model not loaded")
    
    # Combine text for classification
    text = request.text or f"{request.subject} {request.body}".strip()
    
    if not text:
        raise HTTPException(status_code=400, detail="No text provided")
    
    try:
        result = classifier.classify(text)
        return ClassifyResponse(
            category=result.get("category", "primary"),
            is_spam=result.get("is_spam", False),
            spam_score=result.get("spam_score", 0.0),
            sentiment=result.get("sentiment", "neutral"),
            sentiment_score=result.get("sentiment_score", 0.0),
            confidence=result.get("confidence", 0.0)
        )
    except Exception as e:
        logger.error(f"Classification error: {e}")
        raise HTTPException(status_code=500, detail="Classification failed")


@app.post("/spam", response_model=SpamResponse)
async def detect_spam(request: SpamRequest):
    """Detect if text is spam"""
    if classifier is None or not classifier.is_loaded:
        raise HTTPException(status_code=503, detail="Model not loaded")
    
    if not request.text:
        raise HTTPException(status_code=400, detail="No text provided")
    
    try:
        result = classifier.detect_spam(request.text)
        return SpamResponse(
            is_spam=result.get("is_spam", False),
            spam_score=result.get("spam_score", 0.0),
            confidence=result.get("confidence", 0.0)
        )
    except Exception as e:
        logger.error(f"Spam detection error: {e}")
        raise HTTPException(status_code=500, detail="Spam detection failed")


@app.post("/sentiment", response_model=SentimentResponse)
async def analyze_sentiment(request: SentimentRequest):
    """Analyze sentiment of text"""
    if classifier is None or not classifier.is_loaded:
        raise HTTPException(status_code=503, detail="Model not loaded")
    
    if not request.text:
        raise HTTPException(status_code=400, detail="No text provided")
    
    try:
        result = classifier.analyze_sentiment(request.text)
        return SentimentResponse(
            sentiment=result.get("sentiment", "neutral"),
            score=result.get("score", 0.0),
            confidence=result.get("confidence", 0.0)
        )
    except Exception as e:
        logger.error(f"Sentiment analysis error: {e}")
        raise HTTPException(status_code=500, detail="Sentiment analysis failed")


if __name__ == "__main__":
    import uvicorn
    uvicorn.run(app, host="0.0.0.0", port=8000)
