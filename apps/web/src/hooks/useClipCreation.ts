import { useState, useCallback, useRef, useEffect } from 'react';

interface ClipRange {
  start: number;
  end: number;
}

interface ClipMetadata {
  title: string;
  description?: string;
  tags?: string[];
  isPublic?: boolean;
}

interface ClipCreationState {
  isCreating: boolean;
  error: string | null;
  progress: number;
  clipId: string | null;
  clipUrl: string | null;
}

interface UseClipCreationOptions {
  meetingId: string;
  videoUrl: string;
  authToken: string;
  onSuccess?: (clipId: string, clipUrl: string) => void;
  onError?: (error: Error) => void;
}

export const useClipCreation = ({
  meetingId,
  videoUrl,
  authToken,
  onSuccess,
  onError
}: UseClipCreationOptions) => {
  const [range, setRange] = useState<ClipRange>({ start: 0, end: 30 });
  const [metadata, setMetadata] = useState<ClipMetadata>({
    title: '',
    description: '',
    tags: [],
    isPublic: false
  });
  const [state, setState] = useState<ClipCreationState>({
    isCreating: false,
    error: null,
    progress: 0,
    clipId: null,
    clipUrl: null
  });

  const [thumbnails, setThumbnails] = useState<string[]>([]);
  const [waveformData, setWaveformData] = useState<number[]>([]);
  const [transcript, setTranscript] = useState<any[]>([]);

  const videoRef = useRef<HTMLVideoElement | null>(null);
  const abortControllerRef = useRef<AbortController | null>(null);

  // Update clip range
  const updateRange = useCallback((start: number, end: number) => {
    setRange({ start, end });
    setState(prev => ({ ...prev, error: null }));
  }, []);

  // Update metadata
  const updateMetadata = useCallback((updates: Partial<ClipMetadata>) => {
    setMetadata(prev => ({ ...prev, ...updates }));
  }, []);

  // Validate clip before creation
  const validateClip = useCallback((): string | null => {
    if (!metadata.title.trim()) {
      return 'Please provide a title for the clip';
    }

    if (range.end <= range.start) {
      return 'End time must be after start time';
    }

    const duration = range.end - range.start;
    if (duration < 1) {
      return 'Clip must be at least 1 second long';
    }

    if (duration > 300) {
      return 'Clip cannot be longer than 5 minutes';
    }

    return null;
  }, [metadata.title, range]);

  // Generate thumbnails for timeline
  const generateThumbnails = useCallback(async (count: number = 10) => {
    if (!videoRef.current) return;

    const video = videoRef.current;
    const canvas = document.createElement('canvas');
    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    const thumbnailPromises: Promise<string>[] = [];
    const duration = video.duration;

    for (let i = 0; i < count; i++) {
      const time = (duration / count) * i;
      thumbnailPromises.push(
        new Promise((resolve) => {
          const tempVideo = document.createElement('video');
          tempVideo.src = videoUrl;
          tempVideo.currentTime = time;
          tempVideo.addEventListener('seeked', () => {
            canvas.width = 160;
            canvas.height = 90;
            ctx.drawImage(tempVideo, 0, 0, canvas.width, canvas.height);
            resolve(canvas.toDataURL('image/jpeg', 0.7));
          });
        })
      );
    }

    try {
      const generatedThumbnails = await Promise.all(thumbnailPromises);
      setThumbnails(generatedThumbnails);
    } catch (err) {
      console.error('Error generating thumbnails:', err);
    }
  }, [videoUrl]);

  // Generate waveform data (simulated)
  const generateWaveform = useCallback(async () => {
    // In production, this would analyze audio data
    // For now, generate random waveform for visualization
    const dataPoints = 100;
    const waveform: number[] = [];

    for (let i = 0; i < dataPoints; i++) {
      waveform.push(Math.random() * 0.8 + 0.2);
    }

    setWaveformData(waveform);
  }, []);

  // Fetch transcript for the clip range
  const fetchTranscript = useCallback(async () => {
    try {
      const response = await fetch(
        `/api/meetings/${meetingId}/transcript?start=${range.start}&end=${range.end}`,
        {
          headers: {
            'Authorization': `Bearer ${authToken}`,
            'Content-Type': 'application/json'
          }
        }
      );

      if (response.ok) {
        const data = await response.json();
        setTranscript(data.segments || []);
      }
    } catch (err) {
      console.error('Error fetching transcript:', err);
    }
  }, [meetingId, range, authToken]);

  // Create the clip
  const createClip = useCallback(async () => {
    const validationError = validateClip();
    if (validationError) {
      setState(prev => ({ ...prev, error: validationError }));
      return;
    }

    setState(prev => ({
      ...prev,
      isCreating: true,
      error: null,
      progress: 0
    }));

    // Create abort controller for cancellation
    abortControllerRef.current = new AbortController();

    try {
      // Step 1: Create clip metadata (20% progress)
      setState(prev => ({ ...prev, progress: 20 }));

      const createResponse = await fetch('/api/clips', {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${authToken}`,
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({
          meetingId,
          startTime: range.start,
          endTime: range.end,
          title: metadata.title,
          description: metadata.description,
          tags: metadata.tags,
          isPublic: metadata.isPublic,
          includeTranscript: transcript.length > 0
        }),
        signal: abortControllerRef.current.signal
      });

      if (!createResponse.ok) {
        throw new Error('Failed to create clip');
      }

      const clipData = await createResponse.json();
      setState(prev => ({ ...prev, progress: 40, clipId: clipData.id }));

      // Step 2: Process video (60% progress)
      setState(prev => ({ ...prev, progress: 60 }));

      // Poll for processing status
      let processingComplete = false;
      let pollCount = 0;
      const maxPolls = 60; // 60 seconds timeout

      while (!processingComplete && pollCount < maxPolls) {
        const statusResponse = await fetch(`/api/clips/${clipData.id}/status`, {
          headers: {
            'Authorization': `Bearer ${authToken}`
          },
          signal: abortControllerRef.current.signal
        });

        if (statusResponse.ok) {
          const status = await statusResponse.json();

          if (status.status === 'completed') {
            processingComplete = true;
            setState(prev => ({
              ...prev,
              progress: 100,
              clipUrl: status.clipUrl
            }));
          } else if (status.status === 'failed') {
            throw new Error('Video processing failed');
          } else {
            // Update progress based on processing status
            const processingProgress = status.progress || 0;
            setState(prev => ({
              ...prev,
              progress: 60 + (processingProgress * 0.4)
            }));
          }
        }

        if (!processingComplete) {
          await new Promise(resolve => setTimeout(resolve, 1000));
          pollCount++;
        }
      }

      if (!processingComplete) {
        throw new Error('Processing timeout');
      }

      // Success!
      setState(prev => ({
        ...prev,
        isCreating: false,
        error: null,
        progress: 100
      }));

      onSuccess?.(clipData.id, clipData.clipUrl);

    } catch (err) {
      const error = err as Error;

      if (error.name === 'AbortError') {
        setState(prev => ({
          ...prev,
          isCreating: false,
          error: 'Clip creation cancelled',
          progress: 0
        }));
      } else {
        setState(prev => ({
          ...prev,
          isCreating: false,
          error: error.message || 'Failed to create clip',
          progress: 0
        }));
        onError?.(error);
      }
    }
  }, [validateClip, metadata, range, transcript, meetingId, authToken, onSuccess, onError]);

  // Cancel clip creation
  const cancelCreation = useCallback(() => {
    if (abortControllerRef.current) {
      abortControllerRef.current.abort();
      abortControllerRef.current = null;
    }

    setState({
      isCreating: false,
      error: null,
      progress: 0,
      clipId: null,
      clipUrl: null
    });
  }, []);

  // Reset state
  const reset = useCallback(() => {
    setRange({ start: 0, end: 30 });
    setMetadata({
      title: '',
      description: '',
      tags: [],
      isPublic: false
    });
    setState({
      isCreating: false,
      error: null,
      progress: 0,
      clipId: null,
      clipUrl: null
    });
    setThumbnails([]);
    setWaveformData([]);
    setTranscript([]);
  }, []);

  // Initialize video reference
  const setVideoRef = useCallback((video: HTMLVideoElement | null) => {
    videoRef.current = video;
    if (video) {
      generateThumbnails();
      generateWaveform();
    }
  }, [generateThumbnails, generateWaveform]);

  // Fetch transcript when range changes
  useEffect(() => {
    if (range.start !== 0 || range.end !== 30) {
      fetchTranscript();
    }
  }, [range, fetchTranscript]);

  // Cleanup on unmount
  useEffect(() => {
    return () => {
      if (abortControllerRef.current) {
        abortControllerRef.current.abort();
      }
    };
  }, []);

  return {
    // State
    range,
    metadata,
    state,
    thumbnails,
    waveformData,
    transcript,

    // Actions
    updateRange,
    updateMetadata,
    createClip,
    cancelCreation,
    reset,
    setVideoRef,

    // Utilities
    validateClip
  };
};