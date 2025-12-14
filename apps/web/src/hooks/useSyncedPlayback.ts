'use client';

import { useState, useEffect, useCallback, useRef, RefObject } from 'react';

export interface TranscriptSegment {
  id: string;
  speaker: string;
  text: string;
  startTime: number;
  endTime: number;
  confidence?: number;
  words?: {
    word: string;
    startTime: number;
    endTime: number;
    confidence: number;
  }[];
}

interface UseSyncedPlaybackProps {
  segments: TranscriptSegment[];
  videoRef: RefObject<HTMLVideoElement | HTMLAudioElement>;
}

interface UseSyncedPlaybackReturn {
  currentSegment: TranscriptSegment | null;
  currentWord: { word: string; index: number } | null;
  seekToSegment: (segmentId: string) => void;
  seekToTime: (time: number) => void;
  activeSegmentIndex: number;
}

/**
 * Custom hook for synchronized playback between video/audio and transcript
 * Provides word-level highlighting and click-to-seek functionality
 */
export function useSyncedPlayback({
  segments,
  videoRef,
}: UseSyncedPlaybackProps): UseSyncedPlaybackReturn {
  const [currentTime, setCurrentTime] = useState(0);
  const [currentSegment, setCurrentSegment] = useState<TranscriptSegment | null>(null);
  const [currentWord, setCurrentWord] = useState<{ word: string; index: number } | null>(null);
  const [activeSegmentIndex, setActiveSegmentIndex] = useState(-1);

  const frameRef = useRef<number>();

  // Update current time using requestAnimationFrame for smooth updates
  useEffect(() => {
    const updateCurrentTime = () => {
      if (videoRef.current && !videoRef.current.paused) {
        setCurrentTime(videoRef.current.currentTime);
      }
      frameRef.current = requestAnimationFrame(updateCurrentTime);
    };

    frameRef.current = requestAnimationFrame(updateCurrentTime);

    return () => {
      if (frameRef.current) {
        cancelAnimationFrame(frameRef.current);
      }
    };
  }, [videoRef]);

  // Find active segment based on current time
  useEffect(() => {
    if (!segments || segments.length === 0) {
      setCurrentSegment(null);
      setActiveSegmentIndex(-1);
      return;
    }

    // Binary search for efficiency with large transcripts
    let left = 0;
    let right = segments.length - 1;
    let foundIndex = -1;

    while (left <= right) {
      const mid = Math.floor((left + right) / 2);
      const segment = segments[mid];

      if (currentTime >= segment.startTime && currentTime <= segment.endTime) {
        foundIndex = mid;
        setCurrentSegment(segment);
        setActiveSegmentIndex(mid);
        break;
      }

      if (currentTime < segment.startTime) {
        right = mid - 1;
      } else {
        left = mid + 1;
      }
    }

    if (foundIndex === -1) {
      // Find the nearest segment if not in any segment
      const nearestIndex = segments.findIndex(
        (seg, idx) =>
          currentTime >= seg.startTime &&
          (idx === segments.length - 1 || currentTime < segments[idx + 1].startTime)
      );

      if (nearestIndex !== -1) {
        setCurrentSegment(segments[nearestIndex]);
        setActiveSegmentIndex(nearestIndex);
      } else {
        setCurrentSegment(null);
        setActiveSegmentIndex(-1);
      }
    }
  }, [currentTime, segments]);

  // Find active word within current segment (if word-level timestamps available)
  useEffect(() => {
    if (!currentSegment || !currentSegment.words) {
      setCurrentWord(null);
      return;
    }

    const wordIndex = currentSegment.words.findIndex(
      (word) => currentTime >= word.startTime && currentTime <= word.endTime
    );

    if (wordIndex !== -1) {
      setCurrentWord({
        word: currentSegment.words[wordIndex].word,
        index: wordIndex,
      });
    } else {
      setCurrentWord(null);
    }
  }, [currentTime, currentSegment]);

  // Seek to a specific segment by ID
  const seekToSegment = useCallback(
    (segmentId: string) => {
      const segment = segments.find((s) => s.id === segmentId);
      if (segment && videoRef.current) {
        videoRef.current.currentTime = segment.startTime;
        setCurrentTime(segment.startTime);
      }
    },
    [segments, videoRef]
  );

  // Seek to a specific time
  const seekToTime = useCallback(
    (time: number) => {
      if (videoRef.current) {
        videoRef.current.currentTime = time;
        setCurrentTime(time);
      }
    },
    [videoRef]
  );

  return {
    currentSegment,
    currentWord,
    seekToSegment,
    seekToTime,
    activeSegmentIndex,
  };
}

/**
 * Hook for managing transcript export
 */
export function useTranscriptExport(segments: TranscriptSegment[], meetingTitle: string) {
  const exportAsText = useCallback(() => {
    const text = segments
      .map((segment) => `${segment.speaker} (${formatTime(segment.startTime)}):\n${segment.text}\n`)
      .join('\n');

    downloadFile(text, `${meetingTitle}-transcript.txt`, 'text/plain');
  }, [segments, meetingTitle]);

  const exportAsSRT = useCallback(() => {
    const srt = segments
      .map((segment, index) => {
        const start = formatSRTTime(segment.startTime);
        const end = formatSRTTime(segment.endTime);
        return `${index + 1}\n${start} --> ${end}\n${segment.text}\n`;
      })
      .join('\n');

    downloadFile(srt, `${meetingTitle}-transcript.srt`, 'text/plain');
  }, [segments, meetingTitle]);

  const exportAsVTT = useCallback(() => {
    const vtt = `WEBVTT\n\n${segments
      .map((segment) => {
        const start = formatVTTTime(segment.startTime);
        const end = formatVTTTime(segment.endTime);
        return `${start} --> ${end}\n${segment.speaker}: ${segment.text}\n`;
      })
      .join('\n')}`;

    downloadFile(vtt, `${meetingTitle}-transcript.vtt`, 'text/vtt');
  }, [segments, meetingTitle]);

  const exportAsJSON = useCallback(() => {
    const json = JSON.stringify({ segments }, null, 2);
    downloadFile(json, `${meetingTitle}-transcript.json`, 'application/json');
  }, [segments, meetingTitle]);

  return {
    exportAsText,
    exportAsSRT,
    exportAsVTT,
    exportAsJSON,
  };
}

// Helper functions
function formatTime(seconds: number): string {
  const minutes = Math.floor(seconds / 60);
  const secs = Math.floor(seconds % 60);
  return `${minutes}:${secs.toString().padStart(2, '0')}`;
}

function formatSRTTime(seconds: number): string {
  const hours = Math.floor(seconds / 3600);
  const minutes = Math.floor((seconds % 3600) / 60);
  const secs = Math.floor(seconds % 60);
  const millis = Math.floor((seconds % 1) * 1000);

  return `${hours.toString().padStart(2, '0')}:${minutes
    .toString()
    .padStart(2, '0')}:${secs.toString().padStart(2, '0')},${millis
    .toString()
    .padStart(3, '0')}`;
}

function formatVTTTime(seconds: number): string {
  const hours = Math.floor(seconds / 3600);
  const minutes = Math.floor((seconds % 3600) / 60);
  const secs = Math.floor(seconds % 60);
  const millis = Math.floor((seconds % 1) * 1000);

  return `${hours.toString().padStart(2, '0')}:${minutes
    .toString()
    .padStart(2, '0')}:${secs.toString().padStart(2, '0')}.${millis
    .toString()
    .padStart(3, '0')}`;
}

function downloadFile(content: string, filename: string, type: string) {
  const blob = new Blob([content], { type });
  const url = URL.createObjectURL(blob);
  const link = document.createElement('a');
  link.href = url;
  link.download = filename;
  document.body.appendChild(link);
  link.click();
  document.body.removeChild(link);
  URL.revokeObjectURL(url);
}
