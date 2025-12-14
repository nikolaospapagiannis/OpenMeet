# OpenMeet Service

## Overview

AI/ML microservice providing intelligent features for the OpenMeet platform:

- **Speech-to-Text**: Audio transcription using OpenAI Whisper
- **Text Summarization**: Meeting summaries using GPT-4
- **Sentiment Analysis**: Emotion and sentiment detection
- **Speaker Diarization**: Speaker identification and segmentation
- **Topic Extraction**: Automated topic modeling
- **Action Item Detection**: Intelligent task extraction

## Architecture

```
┌─────────────────┐
│   API Layer     │  ← FastAPI REST endpoints
├─────────────────┤
│  AI Orchestrator│  ← LangChain workflow management
├─────────────────┤
│   ML Models     │  ← OpenAI, Transformers, spaCy
├─────────────────┤
│   Data Layer    │  ← Redis, MongoDB, PostgreSQL
└─────────────────┘
```

## Tech Stack

- **Framework**: FastAPI 0.109+
- **AI/ML**: OpenAI API, LangChain, Transformers
- **NLP**: spaCy, NLTK
- **Deep Learning**: PyTorch
- **Caching**: Redis
- **Database**: PostgreSQL, MongoDB
- **Monitoring**: Prometheus, Structlog

## Installation

### Local Development

```bash
# Create virtual environment
python -m venv venv
source venv/bin/activate  # On Windows: venv\Scripts\activate

# Install dependencies
pip install -r requirements.txt

# Download spaCy models
python -m spacy download en_core_web_sm

# Set up environment variables
cp .env.example .env
# Edit .env with your credentials

# Run development server
uvicorn app.main:app --reload --port 8000
```

### Docker

```bash
# Build image
docker build -t openmeet-service .

# Run container
docker run -p 8000:8000 --env-file .env openmeet-service
```

## API Endpoints

### Health Check
```
GET /health
```

### Transcription
```
POST /api/v1/transcribe
Content-Type: application/json

{
  "audio_url": "https://example.com/audio.mp3",
  "language": "en",
  "enable_diarization": true,
  "enable_timestamps": true
}
```

### Summarization
```
POST /api/v1/summarize
Content-Type: application/json

{
  "text": "Meeting transcript text...",
  "max_length": 200,
  "style": "bullet_points"
}
```

### Sentiment Analysis
```
POST /api/v1/sentiment
Content-Type: application/json

{
  "text": "Text to analyze...",
  "granularity": "sentence"
}
```

### Speaker Diarization
```
POST /api/v1/diarize
Content-Type: application/json

{
  "audio_url": "https://example.com/audio.mp3",
  "num_speakers": 2
}
```

## Performance

- **Transcription**: ~1x realtime (1 hour audio = 1 hour processing)
- **Summarization**: <5 seconds for 10k tokens
- **Sentiment Analysis**: <2 seconds for 5k tokens
- **Concurrency**: 100+ requests/second

## Monitoring

Metrics available at `/metrics` (Prometheus format):
- Request count and duration
- API latency (p50, p95, p99)
- Error rates
- Model inference time
- Cache hit rates

## Testing

```bash
# Run all tests
pytest

# Run with coverage
pytest --cov=app --cov-report=html

# Run specific test file
pytest tests/test_transcription.py

# Run with verbose output
pytest -v
```

## Deployment

### Kubernetes

```bash
# Apply Kubernetes manifests
kubectl apply -f infrastructure/k8s/ai-service/

# Check deployment status
kubectl get pods -n openmeet-production -l app=ai-service

# View logs
kubectl logs -f deployment/ai-service -n openmeet-production
```

### Environment Variables

Required environment variables for production:
- `OPENAI_API_KEY`: OpenAI API key
- `DATABASE_URL`: PostgreSQL connection string
- `REDIS_URL`: Redis connection string
- `MONGODB_URL`: MongoDB connection string
- `S3_BUCKET`: AWS S3 bucket name
- `AWS_ACCESS_KEY_ID`: AWS access key
- `AWS_SECRET_ACCESS_KEY`: AWS secret key

## Security

- API key authentication required
- Rate limiting: 100 requests/minute per IP
- Input validation and sanitization
- Output filtering for PII
- Encrypted data at rest and in transit

## Troubleshooting

### Common Issues

**Issue**: "OPENAI_API_KEY not found"
```bash
# Solution: Set environment variable
export OPENAI_API_KEY=sk-...
```

**Issue**: "Module not found"
```bash
# Solution: Reinstall dependencies
pip install -r requirements.txt --force-reinstall
```

**Issue**: "spaCy model not found"
```bash
# Solution: Download spaCy models
python -m spacy download en_core_web_sm
```

## Contributing

1. Fork the repository
2. Create a feature branch
3. Make your changes
4. Add tests
5. Run linting: `ruff check .`
6. Format code: `black .`
7. Submit a pull request

## License

MIT License - see LICENSE file for details
