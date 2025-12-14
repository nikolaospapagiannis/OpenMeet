"""
Real Keyword Extraction Service
Uses KeyBERT and TF-IDF for production-grade keyword extraction
"""

import logging
from typing import List, Dict, Any, Tuple, Optional
import os
from collections import Counter
import math

logger = logging.getLogger(__name__)

# Try to import KeyBERT (requires keybert and sentence-transformers)
try:
    from keybert import KeyBERT
    KEYBERT_AVAILABLE = True
except ImportError:
    logger.warning("KeyBERT not available, will use TF-IDF fallback")
    KEYBERT_AVAILABLE = False

# Try to import sklearn for TF-IDF
try:
    from sklearn.feature_extraction.text import TfidfVectorizer
    SKLEARN_AVAILABLE = True
except ImportError:
    logger.warning("scikit-learn not available")
    SKLEARN_AVAILABLE = False


class KeywordExtractionService:
    """
    Production-grade keyword extraction using KeyBERT and TF-IDF
    Falls back to statistical methods if ML libraries unavailable
    """
    
    def __init__(self):
        self.keybert_model = None
        self.use_keybert = os.getenv("USE_KEYBERT", "true").lower() == "true"
        
        if self.use_keybert and KEYBERT_AVAILABLE:
            try:
                self._initialize_keybert()
                logger.info("KeyBERT keyword extraction initialized")
            except Exception as e:
                logger.error(f"Failed to initialize KeyBERT: {e}")
                self.keybert_model = None
        else:
            logger.info("Using TF-IDF for keyword extraction")
    
    def _initialize_keybert(self):
        """Initialize KeyBERT model"""
        try:
            # Use sentence-transformers for semantic keyword extraction
            # Default model: all-MiniLM-L6-v2 (fast and accurate)
            model_name = os.getenv("KEYWORD_MODEL", "all-MiniLM-L6-v2")
            self.keybert_model = KeyBERT(model=model_name)
            logger.info(f"KeyBERT initialized with model: {model_name}")
        except Exception as e:
            logger.error(f"Error initializing KeyBERT: {e}")
            raise
    
    async def extract_keywords(
        self,
        text: str,
        top_n: int = 20,
        use_mmr: bool = True,
        diversity: float = 0.5
    ) -> List[Dict[str, Any]]:
        """
        Extract keywords from text using KeyBERT or TF-IDF
        
        Args:
            text: Input text
            top_n: Number of keywords to extract
            use_mmr: Use Maximal Marginal Relevance for diversity
            diversity: Diversity of results (0-1, higher = more diverse)
            
        Returns:
            List of keywords with scores
        """
        if self.keybert_model:
            return await self._extract_with_keybert(text, top_n, use_mmr, diversity)
        elif SKLEARN_AVAILABLE:
            return await self._extract_with_tfidf([text], top_n)
        else:
            return await self._extract_with_statistics(text, top_n)
    
    async def _extract_with_keybert(
        self,
        text: str,
        top_n: int,
        use_mmr: bool,
        diversity: float
    ) -> List[Dict[str, Any]]:
        """Extract keywords using KeyBERT with semantic understanding"""
        try:
            if use_mmr:
                # Use MMR for diverse keywords
                keywords = self.keybert_model.extract_keywords(
                    text,
                    keyphrase_ngram_range=(1, 3),  # Single words to 3-word phrases
                    stop_words='english',
                    use_mmr=True,
                    diversity=diversity,
                    top_n=top_n
                )
            else:
                # Use cosine similarity for most relevant keywords
                keywords = self.keybert_model.extract_keywords(
                    text,
                    keyphrase_ngram_range=(1, 3),
                    stop_words='english',
                    top_n=top_n
                )
            
            # Convert to dictionary format
            result = []
            for keyword, score in keywords:
                result.append({
                    "keyword": keyword,
                    "score": float(score),
                    "method": "keybert",
                    "ngram_size": len(keyword.split())
                })
            
            logger.info(f"KeyBERT extracted {len(result)} keywords")
            return result
            
        except Exception as e:
            logger.error(f"Error in KeyBERT extraction: {e}")
            return await self._extract_with_tfidf([text], top_n)
    
    async def _extract_with_tfidf(
        self,
        documents: List[str],
        top_n: int
    ) -> List[Dict[str, Any]]:
        """Extract keywords using TF-IDF"""
        try:
            # Create TF-IDF vectorizer
            vectorizer = TfidfVectorizer(
                max_features=top_n * 2,
                ngram_range=(1, 3),
                stop_words='english',
                min_df=1,
                max_df=0.9
            )
            
            # Fit and transform
            tfidf_matrix = vectorizer.fit_transform(documents)
            
            # Get feature names
            feature_names = vectorizer.get_feature_names_out()
            
            # Get scores for first document
            scores = tfidf_matrix.toarray()[0]
            
            # Get top keywords
            top_indices = scores.argsort()[-top_n:][::-1]
            
            result = []
            for idx in top_indices:
                if scores[idx] > 0:
                    result.append({
                        "keyword": feature_names[idx],
                        "score": float(scores[idx]),
                        "method": "tfidf",
                        "ngram_size": len(feature_names[idx].split())
                    })
            
            logger.info(f"TF-IDF extracted {len(result)} keywords")
            return result
            
        except Exception as e:
            logger.error(f"Error in TF-IDF extraction: {e}")
            return await self._extract_with_statistics(documents[0], top_n)
    
    async def _extract_with_statistics(
        self,
        text: str,
        top_n: int
    ) -> List[Dict[str, Any]]:
        """
        Fallback keyword extraction using statistical methods
        Better than simple word frequency - uses TF-IDF-like scoring
        """
        try:
            import re
            from collections import defaultdict
            
            # Tokenize and clean
            words = re.findall(r'\b[a-z]{4,}\b', text.lower())
            
            # Remove common stop words
            stop_words = {'that', 'this', 'with', 'from', 'have', 'will', 
                         'would', 'could', 'should', 'about', 'their', 'there',
                         'which', 'these', 'those', 'what', 'when', 'where',
                         'they', 'them', 'been', 'were', 'being', 'very',
                         'some', 'more', 'than', 'then', 'into', 'just'}
            
            words = [w for w in words if w not in stop_words]
            
            # Calculate word frequencies (TF)
            word_freq = Counter(words)
            total_words = len(words)
            
            # Calculate TF scores
            tf_scores = {word: freq / total_words 
                        for word, freq in word_freq.items()}
            
            # Simple IDF approximation (penalize very common words)
            # IDF = log(total_words / word_frequency)
            idf_scores = {}
            for word, freq in word_freq.items():
                idf_scores[word] = math.log(total_words / (freq + 1))
            
            # Calculate TF-IDF scores
            tfidf_scores = {}
            for word in tf_scores:
                tfidf_scores[word] = tf_scores[word] * idf_scores[word]
            
            # Get top keywords
            top_keywords = sorted(
                tfidf_scores.items(),
                key=lambda x: x[1],
                reverse=True
            )[:top_n]
            
            result = []
            for keyword, score in top_keywords:
                result.append({
                    "keyword": keyword,
                    "score": float(score),
                    "method": "statistical",
                    "frequency": word_freq[keyword],
                    "ngram_size": 1
                })
            
            logger.info(f"Statistical extraction found {len(result)} keywords")
            return result
            
        except Exception as e:
            logger.error(f"Error in statistical extraction: {e}")
            return []
    
    async def extract_phrases(
        self,
        text: str,
        top_n: int = 10
    ) -> List[Dict[str, Any]]:
        """Extract key phrases (multi-word expressions)"""
        if self.keybert_model:
            try:
                # Extract longer phrases
                keywords = self.keybert_model.extract_keywords(
                    text,
                    keyphrase_ngram_range=(2, 4),  # 2-4 word phrases
                    stop_words='english',
                    use_mmr=True,
                    diversity=0.7,
                    top_n=top_n
                )
                
                return [{
                    "phrase": keyword,
                    "score": float(score),
                    "words": len(keyword.split())
                } for keyword, score in keywords]
                
            except Exception as e:
                logger.error(f"Error extracting phrases: {e}")
        
        return []
    
    def get_keyword_context(
        self,
        text: str,
        keyword: str,
        context_words: int = 10
    ) -> List[str]:
        """Get context snippets where keyword appears"""
        import re
        
        # Find all occurrences
        pattern = re.compile(rf'\b{re.escape(keyword)}\b', re.IGNORECASE)
        contexts = []
        
        for match in pattern.finditer(text):
            start = max(0, match.start() - context_words * 6)  # Approx 6 chars per word
            end = min(len(text), match.end() + context_words * 6)
            context = text[start:end].strip()
            contexts.append(context)
        
        return contexts


# Singleton instance
_keyword_service = None

def get_keyword_service() -> KeywordExtractionService:
    """Get or create keyword extraction service singleton"""
    global _keyword_service
    if _keyword_service is None:
        _keyword_service = KeywordExtractionService()
    return _keyword_service
