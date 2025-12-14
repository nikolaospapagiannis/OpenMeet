"""
Update for main.py to integrate real speaker diarization
Add this to the existing /transcribe/with-diarization endpoint
"""

from services.speaker_diarization import get_diarization_service
from services.entity_extraction import get_entity_service  
from services.keyword_extraction import get_keyword_service

# Add to the /transcribe/with-diarization endpoint (replace existing)
@app.post("/transcribe/with-diarization")
async def transcribe_with_diarization_real(
    file: UploadFile = File(...),
    language: str = Form("en"),
    num_speakers: Optional[int] = Form(None)
):
    """
    REAL speaker diarization using pyannote.audio
    No more hardcoded speaker labels!
    """
    start_time = time.time()
    temp_file = None
    
    try:
        # Save uploaded file
        temp_file = f"/tmp/{file.filename}"
        with open(temp_file, "wb") as f:
            content = await file.read()
            f.write(content)
        
        # 1. Transcribe with Whisper (REAL)
        audio_file = open(temp_file, "rb")
        transcription = client.audio.transcriptions.create(
            model="whisper-1",
            file=audio_file,
            language=language,
            response_format="verbose_json",
        )
        audio_file.close()
        
        # 2. Perform REAL speaker diarization
        diarization_service = get_diarization_service()
        diarization_segments = await diarization_service.diarize(
            audio_path=temp_file,
            num_speakers=num_speakers
        )
        
        # 3. Convert Whisper segments to format
        transcription_segments = []
        if hasattr(transcription, 'segments'):
            for segment in transcription.segments:
                transcription_segments.append({
                    "start": segment['start'],
                    "end": segment['end'],
                    "text": segment['text']
                })
        
        # 4. Merge diarization with transcription (REAL)
        merged_segments = diarization_service.merge_with_transcription(
            transcription_segments,
            diarization_segments
        )
        
        # 5. Get speaker statistics (REAL)
        speaker_stats = diarization_service.get_speaker_stats(merged_segments)
        
        duration = time.time() - start_time
        
        return {
            "status": "success",
            "text": transcription.text,
            "language": getattr(transcription, 'language', language),
            "segments": merged_segments,
            "speakers": speaker_stats,
            "diarization_method": "pyannote.audio" if diarization_service.pipeline else "fallback",
            "processing_time": duration,
            "num_speakers_detected": len(speaker_stats)
        }
        
    except Exception as e:
        logger.error(f"Error in diarization: {str(e)}")
        raise HTTPException(status_code=500, detail=str(e))
    finally:
        if temp_file and os.path.exists(temp_file):
            os.unlink(temp_file)


# Add new endpoint for entity extraction
@app.post("/extract/entities")
async def extract_entities_real(request: dict):
    """
    REAL entity extraction using spaCy
    No more mock data!
    """
    try:
        text = request.get("text", "")
        entity_types = request.get("entity_types")
        min_confidence = request.get("min_confidence", 0.7)
        
        entity_service = get_entity_service()
        entities = await entity_service.extract_entities(
            text=text,
            entity_types=entity_types,
            min_confidence=min_confidence
        )
        
        # Get summary
        summary = entity_service.get_entity_summary(entities)
        
        # Categorize
        categorized = entity_service.categorize_entities(entities)
        
        return {
            "status": "success",
            "entities": entities,
            "summary": summary,
            "categorized": categorized,
            "method": "spacy-transformers" if entity_service.use_transformers else "spacy-standard"
        }
        
    except Exception as e:
        logger.error(f"Error extracting entities: {str(e)}")
        raise HTTPException(status_code=500, detail=str(e))


# Add new endpoint for keyword extraction  
@app.post("/extract/keywords")
async def extract_keywords_real(request: dict):
    """
    REAL keyword extraction using KeyBERT/TF-IDF
    No more simple word frequency!
    """
    try:
        text = request.get("text", "")
        top_n = request.get("top_n", 20)
        use_mmr = request.get("use_mmr", True)
        diversity = request.get("diversity", 0.5)
        
        keyword_service = get_keyword_service()
        keywords = await keyword_service.extract_keywords(
            text=text,
            top_n=top_n,
            use_mmr=use_mmr,
            diversity=diversity
        )
        
        # Also extract key phrases
        phrases = await keyword_service.extract_phrases(text, top_n=10)
        
        return {
            "status": "success",
            "keywords": keywords,
            "key_phrases": phrases,
            "method": keywords[0]["method"] if keywords else "none"
        }
        
    except Exception as e:
        logger.error(f"Error extracting keywords: {str(e)}")
        raise HTTPException(status_code=500, detail=str(e))
