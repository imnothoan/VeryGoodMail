"""
PhoBERT Classifier Implementation

This module contains the PhoBERT-based classifier for:
- Spam detection
- Sentiment analysis  
- Email category classification

To use your trained model from Google Colab:
1. Export your model using model.save_pretrained('model_path')
2. Place the model files in the models/ directory
3. Update the model paths in this file

© 2025 VeryGoodMail by Hoàn
"""

import os
import logging
from typing import Dict, Any, Optional

logger = logging.getLogger(__name__)

# Try to import transformers - will be available when deployed with model
try:
    from transformers import AutoTokenizer, AutoModelForSequenceClassification
    import torch
    TRANSFORMERS_AVAILABLE = True
except ImportError:
    TRANSFORMERS_AVAILABLE = False
    logger.warning("Transformers not available. Install with: pip install transformers torch")


class PhoBERTClassifier:
    """
    PhoBERT-based classifier for Vietnamese email classification
    
    This class provides:
    - Spam detection
    - Sentiment analysis
    - Email category classification
    
    The models should be trained on Google Colab and placed in the models/ directory.
    """
    
    # Category mapping
    CATEGORIES = {
        0: "primary",
        1: "important", 
        2: "social",
        3: "promotions",
        4: "updates",
        5: "spam"
    }
    
    SENTIMENTS = {
        0: "negative",
        1: "neutral",
        2: "positive"
    }
    
    def __init__(self, model_path: str = "./models"):
        """
        Initialize the classifier
        
        Args:
            model_path: Path to the directory containing trained models
        """
        self.model_path = model_path
        self.is_loaded = False
        
        self.tokenizer = None
        self.spam_model = None
        self.sentiment_model = None
        self.category_model = None
        
        self.device = "cuda" if torch.cuda.is_available() else "cpu" if TRANSFORMERS_AVAILABLE else None
        
        # Try to load models
        self._load_models()
    
    def _load_models(self):
        """Load all trained models"""
        if not TRANSFORMERS_AVAILABLE:
            logger.error("Transformers library not available")
            return
            
        try:
            # Load tokenizer (shared across all models)
            tokenizer_path = os.path.join(self.model_path, "tokenizer")
            if os.path.exists(tokenizer_path):
                self.tokenizer = AutoTokenizer.from_pretrained(tokenizer_path)
            else:
                # Use default PhoBERT tokenizer
                self.tokenizer = AutoTokenizer.from_pretrained("vinai/phobert-base")
            
            # Load spam model
            spam_path = os.path.join(self.model_path, "spam_model")
            if os.path.exists(spam_path):
                self.spam_model = AutoModelForSequenceClassification.from_pretrained(spam_path)
                self.spam_model.to(self.device)
                self.spam_model.eval()
                logger.info("Spam model loaded")
            
            # Load sentiment model
            sentiment_path = os.path.join(self.model_path, "sentiment_model")
            if os.path.exists(sentiment_path):
                self.sentiment_model = AutoModelForSequenceClassification.from_pretrained(sentiment_path)
                self.sentiment_model.to(self.device)
                self.sentiment_model.eval()
                logger.info("Sentiment model loaded")
            
            # Load category model
            category_path = os.path.join(self.model_path, "category_model")
            if os.path.exists(category_path):
                self.category_model = AutoModelForSequenceClassification.from_pretrained(category_path)
                self.category_model.to(self.device)
                self.category_model.eval()
                logger.info("Category model loaded")
            
            # Check if at least one model is loaded
            self.is_loaded = any([
                self.spam_model is not None,
                self.sentiment_model is not None,
                self.category_model is not None
            ])
            
            if self.is_loaded:
                logger.info(f"Models loaded successfully on {self.device}")
            else:
                logger.warning("No models found. Please train and add models to the models/ directory")
                
        except Exception as e:
            logger.error(f"Error loading models: {e}")
            self.is_loaded = False
    
    def _preprocess(self, text: str) -> Dict[str, Any]:
        """Preprocess text for model input"""
        if self.tokenizer is None:
            raise ValueError("Tokenizer not loaded")
            
        # Truncate long text
        max_length = 256
        
        inputs = self.tokenizer(
            text,
            padding=True,
            truncation=True,
            max_length=max_length,
            return_tensors="pt"
        )
        
        return {k: v.to(self.device) for k, v in inputs.items()}
    
    def _predict(self, model, inputs) -> tuple:
        """Run prediction with a model"""
        with torch.no_grad():
            outputs = model(**inputs)
            probs = torch.softmax(outputs.logits, dim=-1)
            pred_class = torch.argmax(probs, dim=-1).item()
            confidence = probs[0][pred_class].item()
        return pred_class, confidence
    
    def classify(self, text: str) -> Dict[str, Any]:
        """
        Full classification: spam, sentiment, and category
        
        Args:
            text: Text to classify
            
        Returns:
            Dictionary with classification results
        """
        result = {
            "category": "primary",
            "is_spam": False,
            "spam_score": 0.0,
            "sentiment": "neutral",
            "sentiment_score": 0.0,
            "confidence": 0.0
        }
        
        if not self.is_loaded:
            return result
        
        try:
            inputs = self._preprocess(text)
            confidences = []
            
            # Spam detection
            if self.spam_model is not None:
                spam_result = self.detect_spam(text)
                result["is_spam"] = spam_result["is_spam"]
                result["spam_score"] = spam_result["spam_score"]
                confidences.append(spam_result["confidence"])
            
            # Sentiment analysis
            if self.sentiment_model is not None:
                sentiment_result = self.analyze_sentiment(text)
                result["sentiment"] = sentiment_result["sentiment"]
                result["sentiment_score"] = sentiment_result["score"]
                confidences.append(sentiment_result["confidence"])
            
            # Category classification
            if self.category_model is not None:
                pred_class, confidence = self._predict(self.category_model, inputs)
                result["category"] = self.CATEGORIES.get(pred_class, "primary")
                confidences.append(confidence)
            
            # Overall confidence is average of individual confidences
            if confidences:
                result["confidence"] = sum(confidences) / len(confidences)
                
        except Exception as e:
            logger.error(f"Classification error: {e}")
        
        return result
    
    def detect_spam(self, text: str) -> Dict[str, Any]:
        """
        Detect if text is spam
        
        Args:
            text: Text to check
            
        Returns:
            Dictionary with is_spam, spam_score, confidence
        """
        result = {
            "is_spam": False,
            "spam_score": 0.0,
            "confidence": 0.0
        }
        
        if self.spam_model is None:
            return result
        
        try:
            inputs = self._preprocess(text)
            pred_class, confidence = self._predict(self.spam_model, inputs)
            
            # Assuming class 1 is spam
            result["is_spam"] = pred_class == 1
            result["spam_score"] = confidence if pred_class == 1 else 1 - confidence
            result["confidence"] = confidence
            
        except Exception as e:
            logger.error(f"Spam detection error: {e}")
        
        return result
    
    def analyze_sentiment(self, text: str) -> Dict[str, Any]:
        """
        Analyze sentiment of text
        
        Args:
            text: Text to analyze
            
        Returns:
            Dictionary with sentiment, score, confidence
        """
        result = {
            "sentiment": "neutral",
            "score": 0.0,
            "confidence": 0.0
        }
        
        if self.sentiment_model is None:
            return result
        
        try:
            inputs = self._preprocess(text)
            pred_class, confidence = self._predict(self.sentiment_model, inputs)
            
            result["sentiment"] = self.SENTIMENTS.get(pred_class, "neutral")
            result["score"] = confidence
            result["confidence"] = confidence
            
        except Exception as e:
            logger.error(f"Sentiment analysis error: {e}")
        
        return result


# For testing without models
class MockClassifier:
    """Mock classifier for testing when models are not available"""
    
    def __init__(self, *args, **kwargs):
        self.is_loaded = True
        logger.info("Using mock classifier (no trained models)")
    
    def classify(self, text: str) -> Dict[str, Any]:
        # Simple rule-based classification for testing
        text_lower = text.lower()
        
        is_spam = any(word in text_lower for word in [
            'miễn phí', 'trúng thưởng', 'click here', 'free', 'winner'
        ])
        
        sentiment = "neutral"
        if any(word in text_lower for word in ['cảm ơn', 'tuyệt vời', 'great', 'thanks']):
            sentiment = "positive"
        elif any(word in text_lower for word in ['lỗi', 'tệ', 'error', 'bad', 'problem']):
            sentiment = "negative"
        
        category = "primary"
        if any(word in text_lower for word in ['facebook', 'instagram', 'social']):
            category = "social"
        elif any(word in text_lower for word in ['sale', 'discount', 'khuyến mãi']):
            category = "promotions"
        elif any(word in text_lower for word in ['update', 'cập nhật', 'shipping']):
            category = "updates"
        elif any(word in text_lower for word in ['urgent', 'important', 'quan trọng']):
            category = "important"
        
        return {
            "category": category,
            "is_spam": is_spam,
            "spam_score": 0.8 if is_spam else 0.1,
            "sentiment": sentiment,
            "sentiment_score": 0.7,
            "confidence": 0.6
        }
    
    def detect_spam(self, text: str) -> Dict[str, Any]:
        result = self.classify(text)
        return {
            "is_spam": result["is_spam"],
            "spam_score": result["spam_score"],
            "confidence": 0.6
        }
    
    def analyze_sentiment(self, text: str) -> Dict[str, Any]:
        result = self.classify(text)
        return {
            "sentiment": result["sentiment"],
            "score": result["sentiment_score"],
            "confidence": 0.6
        }


# Export the appropriate classifier
def get_classifier(model_path: str = "./models") -> PhoBERTClassifier:
    """Get the appropriate classifier based on available resources"""
    if TRANSFORMERS_AVAILABLE:
        classifier = PhoBERTClassifier(model_path)
        if classifier.is_loaded:
            return classifier
    
    # Fall back to mock classifier
    logger.warning("Using mock classifier. Train and add models for production use.")
    return MockClassifier()
