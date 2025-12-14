"""
Real Entity Extraction Service
Uses spaCy with transformers for production-grade NER
"""

import logging
from typing import List, Dict, Any, Optional
import spacy
from spacy.tokens import Doc
import os

logger = logging.getLogger(__name__)

class EntityExtractionService:
    """
    Production-grade Named Entity Recognition using spaCy
    Supports both standard and transformer models
    """
    
    def __init__(self):
        self.nlp = None
        self.model_name = os.getenv("SPACY_MODEL", "en_core_web_sm")
        self.use_transformers = os.getenv("USE_TRANSFORMERS", "false").lower() == "true"
        
        try:
            self._load_model()
            logger.info(f"Entity extraction initialized with model: {self.model_name}")
        except Exception as e:
            logger.error(f"Failed to load spaCy model: {e}")
            logger.warning("Entity extraction will use fallback mode")
    
    def _load_model(self):
        """Load spaCy model"""
        try:
            if self.use_transformers:
                # Use transformer-based model for best accuracy
                # Requires: python -m spacy download en_core_web_trf
                self.nlp = spacy.load("en_core_web_trf")
                logger.info("Loaded transformer model for entity extraction")
            else:
                # Use standard model for faster processing
                # Requires: python -m spacy download en_core_web_sm
                try:
                    self.nlp = spacy.load(self.model_name)
                except OSError:
                    logger.warning(f"Model {self.model_name} not found, downloading...")
                    os.system(f"python -m spacy download {self.model_name}")
                    self.nlp = spacy.load(self.model_name)
            
            # Add custom entity ruler if needed
            if "entity_ruler" not in self.nlp.pipe_names:
                ruler = self.nlp.add_pipe("entity_ruler", before="ner")
                self._add_custom_patterns(ruler)
            
        except Exception as e:
            logger.error(f"Error loading spaCy model: {e}")
            raise
    
    def _add_custom_patterns(self, ruler):
        """Add custom entity patterns for business-specific entities"""
        patterns = [
            # Meeting-specific patterns
            {"label": "MEETING_TYPE", "pattern": [{"LOWER": {"IN": ["standup", "1:1", "all-hands", "demo", "retro"]}}]},
            
            # Common business entities
            {"label": "DEAL_STAGE", "pattern": [{"LOWER": {"IN": ["qualification", "discovery", "proposal", "negotiation", "closed-won", "closed-lost"]}}]},
            
            # Email patterns
            {"label": "EMAIL", "pattern": [{"LIKE_EMAIL": True}]},
            
            # URL patterns
            {"label": "URL", "pattern": [{"LIKE_URL": True}]},
            
            # Phone patterns
            {"label": "PHONE", "pattern": [{"SHAPE": "ddd-ddd-dddd"}]},
            {"label": "PHONE", "pattern": [{"SHAPE": "(ddd) ddd-dddd"}]},
        ]
        ruler.add_patterns(patterns)
    
    async def extract_entities(
        self,
        text: str,
        entity_types: Optional[List[str]] = None,
        min_confidence: float = 0.7
    ) -> List[Dict[str, Any]]:
        """
        Extract named entities from text
        
        Args:
            text: Input text to analyze
            entity_types: Optional filter for specific entity types
            min_confidence: Minimum confidence threshold (0-1)
            
        Returns:
            List of entities with type, value, confidence, position
        """
        if not self.nlp:
            logger.warning("NLP model not loaded, using fallback")
            return self._fallback_extraction(text)
        
        try:
            # Process text
            doc = self.nlp(text)
            
            # Extract entities
            entities = []
            for ent in doc.ents:
                # Filter by type if specified
                if entity_types and ent.label_ not in entity_types:
                    continue
                
                # Calculate confidence (transformer models provide this)
                confidence = getattr(ent._, 'score', 0.9)
                
                if confidence >= min_confidence:
                    entity = {
                        "type": ent.label_,
                        "value": ent.text,
                        "start": ent.start_char,
                        "end": ent.end_char,
                        "confidence": float(confidence)
                    }
                    
                    # Add context (surrounding words)
                    start_token = max(0, ent.start - 3)
                    end_token = min(len(doc), ent.end + 3)
                    entity["context"] = doc[start_token:end_token].text
                    
                    entities.append(entity)
            
            # Remove duplicates while preserving order
            seen = set()
            unique_entities = []
            for entity in entities:
                key = (entity["type"], entity["value"])
                if key not in seen:
                    seen.add(key)
                    unique_entities.append(entity)
            
            logger.info(f"Extracted {len(unique_entities)} unique entities from text")
            return unique_entities
            
        except Exception as e:
            logger.error(f"Error extracting entities: {e}")
            return self._fallback_extraction(text)
    
    def _fallback_extraction(self, text: str) -> List[Dict[str, Any]]:
        """
        Fallback entity extraction using regex patterns
        Used when spaCy is not available
        """
        import re
        
        entities = []
        
        # Email pattern
        email_pattern = r'\b[A-Za-z0-9._%+-]+@[A-Za-z0-9.-]+\.[A-Z|a-z]{2,}\b'
        for match in re.finditer(email_pattern, text):
            entities.append({
                "type": "EMAIL",
                "value": match.group(),
                "start": match.start(),
                "end": match.end(),
                "confidence": 0.95
            })
        
        # URL pattern
        url_pattern = r'https?://[^\s]+'
        for match in re.finditer(url_pattern, text):
            entities.append({
                "type": "URL",
                "value": match.group(),
                "start": match.start(),
                "end": match.end(),
                "confidence": 0.95
            })
        
        # Phone pattern
        phone_pattern = r'\b\d{3}[-.]?\d{3}[-.]?\d{4}\b'
        for match in re.finditer(phone_pattern, text):
            entities.append({
                "type": "PHONE",
                "value": match.group(),
                "start": match.start(),
                "end": match.end(),
                "confidence": 0.90
            })
        
        # Money pattern
        money_pattern = r'\$\d+(?:,\d{3})*(?:\.\d{2})?'
        for match in re.finditer(money_pattern, text):
            entities.append({
                "type": "MONEY",
                "value": match.group(),
                "start": match.start(),
                "end": match.end(),
                "confidence": 0.85
            })
        
        # Date pattern (simple)
        date_pattern = r'\b\d{1,2}/\d{1,2}/\d{2,4}\b'
        for match in re.finditer(date_pattern, text):
            entities.append({
                "type": "DATE",
                "value": match.group(),
                "start": match.start(),
                "end": match.end(),
                "confidence": 0.80
            })
        
        logger.info(f"Fallback extraction found {len(entities)} entities")
        return entities
    
    def categorize_entities(self, entities: List[Dict[str, Any]]) -> Dict[str, List[Dict[str, Any]]]:
        """Group entities by type"""
        categorized = {}
        for entity in entities:
            entity_type = entity["type"]
            if entity_type not in categorized:
                categorized[entity_type] = []
            categorized[entity_type].append(entity)
        return categorized
    
    def get_entity_summary(self, entities: List[Dict[str, Any]]) -> Dict[str, Any]:
        """Get summary statistics about extracted entities"""
        categorized = self.categorize_entities(entities)
        
        summary = {
            "total_entities": len(entities),
            "unique_types": len(categorized),
            "entity_counts": {k: len(v) for k, v in categorized.items()},
            "avg_confidence": sum(e["confidence"] for e in entities) / len(entities) if entities else 0
        }
        
        return summary


# Singleton instance
_entity_service = None

def get_entity_service() -> EntityExtractionService:
    """Get or create entity extraction service singleton"""
    global _entity_service
    if _entity_service is None:
        _entity_service = EntityExtractionService()
    return _entity_service
