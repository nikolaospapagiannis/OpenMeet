FROM python:3.11-slim

# Set working directory
WORKDIR /app

# Install system dependencies (including audio libraries for pyannote)
RUN apt-get update && apt-get install -y \
    build-essential \
    curl \
    git \
    ffmpeg \
    libsndfile1 \
    libsndfile1-dev \
    sox \
    libsox-dev \
    && rm -rf /var/lib/apt/lists/*

# Copy requirements first for better caching
COPY apps/ai-service/requirements.txt .

# Install PyTorch first with compatible versions for pyannote.audio
RUN pip install --no-cache-dir torch==2.1.2 torchaudio==2.1.2 --index-url https://download.pytorch.org/whl/cpu

# Install Python dependencies
RUN pip install --no-cache-dir -r requirements.txt

# Download spaCy model
RUN python -m spacy download en_core_web_sm || true

# Pre-download sentence-transformers model for KeyBERT
RUN python -c "from sentence_transformers import SentenceTransformer; SentenceTransformer('all-MiniLM-L6-v2')" || true

# Copy application code
COPY apps/ai-service/app ./app

# Create directories for model cache
RUN mkdir -p /root/.cache/huggingface /root/.cache/whisper

# Create non-root user and set permissions
RUN useradd -m -u 1000 aiservice && \
    chown -R aiservice:aiservice /app /root/.cache

USER aiservice

# Expose port
EXPOSE 8000

# Health check
HEALTHCHECK --interval=30s --timeout=10s --start-period=5s --retries=3 \
    CMD curl -f http://localhost:8000/health || exit 1

# Run application
CMD ["uvicorn", "app.main:app", "--host", "0.0.0.0", "--port", "8000"]
