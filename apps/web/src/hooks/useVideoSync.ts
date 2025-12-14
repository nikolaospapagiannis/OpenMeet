import { useState, useEffect, useCallback } from 'react';
import { TranscriptSegment } from '../components/video/VideoPlayer';

/**
 * Custom hook for synchronizing video playback with transcript segments.
 * Returns the currently active segment based on the current playback time.
 */
export const useVideoSync = (
  segments: TranscriptSegment[],
  currentTime: number
): TranscriptSegment | null => {
  const [activeSegment, setActiveSegment] = useState<TranscriptSegment | null>(null);

  const findActiveSegment = useCallback((time: number): TranscriptSegment | null => {
    if (!segments || segments.length === 0) return null;

    // Binary search for efficiency with large transcripts
    let left = 0;
    let right = segments.length - 1;
    let result: TranscriptSegment | null = null;

    while (left <= right) {
      const mid = Math.floor((left + right) / 2);
      const segment = segments[mid];

      if (time >= segment.startTime && time <= segment.endTime) {
        return segment;
      }

      if (time < segment.startTime) {
        right = mid - 1;
      } else {
        // Keep track of the last segment that started before current time
        result = segment;
        left = mid + 1;
      }
    }

    // If we're past the last segment's end time, return null
    if (result && time > result.endTime) {
      return null;
    }

    return result;
  }, [segments]);

  useEffect(() => {
    const active = findActiveSegment(currentTime);
    setActiveSegment(active);
  }, [currentTime, findActiveSegment]);

  return activeSegment;
};

/**
 * Hook for managing video playback state with keyboard shortcuts
 */
export const useVideoKeyboardShortcuts = (
  videoRef: React.RefObject<HTMLVideoElement>,
  callbacks: {
    onPlayPause?: () => void;
    onSeek?: (time: number) => void;
    onVolumeChange?: (volume: number) => void;
    onPlaybackRateChange?: (rate: number) => void;
    onToggleFullscreen?: () => void;
    onSetClipStart?: () => void;
    onSetClipEnd?: () => void;
  }
) => {
  useEffect(() => {
    const handleKeyPress = (e: KeyboardEvent) => {
      if (!videoRef.current) return;

      // Ignore if user is typing in an input field
      if (e.target instanceof HTMLInputElement || e.target instanceof HTMLTextAreaElement) {
        return;
      }

      const video = videoRef.current;

      switch (e.key.toLowerCase()) {
        case ' ':
        case 'k':
          e.preventDefault();
          callbacks.onPlayPause?.();
          break;

        case 'arrowleft':
          e.preventDefault();
          const seekBackTime = e.shiftKey ? 10 : 5;
          callbacks.onSeek?.(Math.max(0, video.currentTime - seekBackTime));
          break;

        case 'arrowright':
          e.preventDefault();
          const seekForwardTime = e.shiftKey ? 10 : 5;
          callbacks.onSeek?.(Math.min(video.duration, video.currentTime + seekForwardTime));
          break;

        case 'arrowup':
          e.preventDefault();
          const newVolumeUp = Math.min(1, video.volume + 0.1);
          callbacks.onVolumeChange?.(newVolumeUp);
          break;

        case 'arrowdown':
          e.preventDefault();
          const newVolumeDown = Math.max(0, video.volume - 0.1);
          callbacks.onVolumeChange?.(newVolumeDown);
          break;

        case 'm':
          e.preventDefault();
          callbacks.onVolumeChange?.(video.volume > 0 ? 0 : 1);
          break;

        case 'f':
          e.preventDefault();
          callbacks.onToggleFullscreen?.();
          break;

        case 'i':
          e.preventDefault();
          callbacks.onSetClipStart?.();
          break;

        case 'o':
          e.preventDefault();
          callbacks.onSetClipEnd?.();
          break;

        case ',':
          e.preventDefault();
          const slowerRate = Math.max(0.25, video.playbackRate - 0.25);
          callbacks.onPlaybackRateChange?.(slowerRate);
          break;

        case '.':
          e.preventDefault();
          const fasterRate = Math.min(2, video.playbackRate + 0.25);
          callbacks.onPlaybackRateChange?.(fasterRate);
          break;

        case '0':
        case '1':
        case '2':
        case '3':
        case '4':
        case '5':
        case '6':
        case '7':
        case '8':
        case '9':
          e.preventDefault();
          const percent = parseInt(e.key) * 0.1;
          callbacks.onSeek?.(video.duration * percent);
          break;

        case 'home':
          e.preventDefault();
          callbacks.onSeek?.(0);
          break;

        case 'end':
          e.preventDefault();
          callbacks.onSeek?.(video.duration);
          break;
      }
    };

    window.addEventListener('keydown', handleKeyPress);
    return () => window.removeEventListener('keydown', handleKeyPress);
  }, [videoRef, callbacks]);
};

/**
 * Hook for generating video thumbnails for preview on hover
 */
export const useVideoThumbnails = (
  videoUrl: string,
  duration: number,
  thumbnailCount: number = 10
) => {
  const [thumbnails, setThumbnails] = useState<string[]>([]);
  const [isGenerating, setIsGenerating] = useState(false);

  useEffect(() => {
    if (!videoUrl || duration <= 0 || thumbnailCount <= 0) return;

    const generateThumbnails = async () => {
      setIsGenerating(true);
      const tempThumbnails: string[] = [];

      try {
        const video = document.createElement('video');
        video.src = videoUrl;
        video.crossOrigin = 'anonymous';
        video.muted = true;

        const canvas = document.createElement('canvas');
        const ctx = canvas.getContext('2d');

        if (!ctx) {
          console.error('Could not get canvas context');
          return;
        }

        await new Promise((resolve) => {
          video.addEventListener('loadedmetadata', resolve);
        });

        canvas.width = 160; // Thumbnail width
        canvas.height = 90; // Thumbnail height (16:9 aspect ratio)

        const interval = duration / thumbnailCount;

        for (let i = 0; i < thumbnailCount; i++) {
          const time = i * interval;

          await new Promise<void>((resolve) => {
            video.currentTime = time;
            video.addEventListener('seeked', () => {
              ctx.drawImage(video, 0, 0, canvas.width, canvas.height);
              tempThumbnails.push(canvas.toDataURL('image/jpeg', 0.7));
              resolve();
            }, { once: true });
          });
        }

        setThumbnails(tempThumbnails);
      } catch (error) {
        console.error('Error generating thumbnails:', error);
      } finally {
        setIsGenerating(false);
      }
    };

    generateThumbnails();
  }, [videoUrl, duration, thumbnailCount]);

  return { thumbnails, isGenerating };
};

/**
 * Hook for managing video quality selection
 */
export const useVideoQuality = (videoUrl: string) => {
  const [qualities, setQualities] = useState<Array<{ label: string; src: string }>>([]);
  const [currentQuality, setCurrentQuality] = useState<string>('auto');

  useEffect(() => {
    // This would typically fetch available quality options from the backend
    // For now, we'll use the single provided URL
    setQualities([
      { label: 'Auto', src: videoUrl },
      // Additional qualities would be added here based on backend response
    ]);
  }, [videoUrl]);

  const changeQuality = useCallback((qualityLabel: string) => {
    setCurrentQuality(qualityLabel);
    // Logic to switch video source would go here
  }, []);

  return { qualities, currentQuality, changeQuality };
};