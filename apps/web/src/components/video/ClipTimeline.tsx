'use client';

import React, { useRef, useState, useCallback, useEffect } from 'react';
import { GripVertical, Scissors, Play, Pause } from 'lucide-react';

interface ClipTimelineProps {
  videoRef: React.RefObject<HTMLVideoElement>;
  duration: number;
  currentTime: number;
  onTimeRangeChange: (start: number, end: number) => void;
  initialStart?: number;
  initialEnd?: number;
  thumbnails?: string[];
  waveformData?: number[];
}

export const ClipTimeline: React.FC<ClipTimelineProps> = ({
  videoRef,
  duration,
  currentTime,
  onTimeRangeChange,
  initialStart = 0,
  initialEnd = Math.min(30, duration),
  thumbnails = [],
  waveformData = []
}) => {
  const timelineRef = useRef<HTMLDivElement>(null);
  const [clipStart, setClipStart] = useState(initialStart);
  const [clipEnd, setClipEnd] = useState(initialEnd);
  const [isDragging, setIsDragging] = useState<'start' | 'end' | 'range' | null>(null);
  const [dragOffset, setDragOffset] = useState(0);
  const [isPreviewPlaying, setIsPreviewPlaying] = useState(false);
  const [hoverTime, setHoverTime] = useState<number | null>(null);
  const [timelineWidth, setTimelineWidth] = useState(0);

  // Update timeline width on mount and resize
  useEffect(() => {
    const updateWidth = () => {
      if (timelineRef.current) {
        setTimelineWidth(timelineRef.current.offsetWidth);
      }
    };

    updateWidth();
    window.addEventListener('resize', updateWidth);
    return () => window.removeEventListener('resize', updateWidth);
  }, []);

  // Format time helper
  const formatTime = (seconds: number): string => {
    const mins = Math.floor(seconds / 60);
    const secs = Math.floor(seconds % 60);
    return `${mins}:${secs.toString().padStart(2, '0')}`;
  };

  // Convert position to time
  const positionToTime = useCallback((clientX: number): number => {
    if (!timelineRef.current) return 0;
    const rect = timelineRef.current.getBoundingClientRect();
    const x = Math.max(0, Math.min(clientX - rect.left, rect.width));
    return (x / rect.width) * duration;
  }, [duration]);

  // Convert time to position
  const timeToPosition = useCallback((time: number): number => {
    if (!timelineWidth) return 0;
    return (time / duration) * timelineWidth;
  }, [duration, timelineWidth]);

  // Handle mouse down on handles
  const handleMouseDown = useCallback((
    e: React.MouseEvent,
    type: 'start' | 'end' | 'range'
  ) => {
    e.preventDefault();
    setIsDragging(type);

    if (type === 'range') {
      const time = positionToTime(e.clientX);
      setDragOffset(time - clipStart);
    }
  }, [clipStart, positionToTime]);

  // Handle mouse move
  useEffect(() => {
    const handleMouseMove = (e: MouseEvent) => {
      if (!isDragging) return;

      const time = positionToTime(e.clientX);

      if (isDragging === 'start') {
        const newStart = Math.max(0, Math.min(time, clipEnd - 1));
        setClipStart(newStart);
        onTimeRangeChange(newStart, clipEnd);
      } else if (isDragging === 'end') {
        const newEnd = Math.min(duration, Math.max(time, clipStart + 1));
        setClipEnd(newEnd);
        onTimeRangeChange(clipStart, newEnd);
      } else if (isDragging === 'range') {
        const rangeWidth = clipEnd - clipStart;
        let newStart = time - dragOffset;
        let newEnd = newStart + rangeWidth;

        // Constrain to timeline bounds
        if (newStart < 0) {
          newStart = 0;
          newEnd = rangeWidth;
        } else if (newEnd > duration) {
          newEnd = duration;
          newStart = duration - rangeWidth;
        }

        setClipStart(newStart);
        setClipEnd(newEnd);
        onTimeRangeChange(newStart, newEnd);
      }
    };

    const handleMouseUp = () => {
      setIsDragging(null);
      setDragOffset(0);
    };

    if (isDragging) {
      document.addEventListener('mousemove', handleMouseMove);
      document.addEventListener('mouseup', handleMouseUp);
      return () => {
        document.removeEventListener('mousemove', handleMouseMove);
        document.removeEventListener('mouseup', handleMouseUp);
      };
    }
  }, [isDragging, dragOffset, clipStart, clipEnd, duration, positionToTime, onTimeRangeChange]);

  // Handle timeline click
  const handleTimelineClick = useCallback((e: React.MouseEvent) => {
    if (isDragging) return;
    if (!videoRef.current) return;

    const time = positionToTime(e.clientX);
    videoRef.current.currentTime = time;
  }, [isDragging, positionToTime, videoRef]);

  // Handle hover
  const handleMouseOver = useCallback((e: React.MouseEvent) => {
    if (!isDragging) {
      const time = positionToTime(e.clientX);
      setHoverTime(time);
    }
  }, [isDragging, positionToTime]);

  // Toggle preview playback
  const togglePreview = useCallback(() => {
    if (!videoRef.current) return;

    if (isPreviewPlaying) {
      videoRef.current.pause();
      setIsPreviewPlaying(false);
    } else {
      videoRef.current.currentTime = clipStart;
      videoRef.current.play();
      setIsPreviewPlaying(true);

      // Auto-stop at clip end
      const checkTime = setInterval(() => {
        if (videoRef.current && videoRef.current.currentTime >= clipEnd) {
          videoRef.current.pause();
          videoRef.current.currentTime = clipStart;
          setIsPreviewPlaying(false);
          clearInterval(checkTime);
        }
      }, 100);
    }
  }, [isPreviewPlaying, clipStart, clipEnd, videoRef]);

  // Generate waveform visualization
  const renderWaveform = () => {
    if (!waveformData.length) return null;

    return (
      <div className="absolute inset-0 pointer-events-none">
        <svg width="100%" height="100%" preserveAspectRatio="none">
          {waveformData.map((amplitude, index) => {
            const x = (index / waveformData.length) * 100;
            const height = amplitude * 50;
            return (
              <rect
                key={index}
                x={`${x}%`}
                y={`${50 - height / 2}%`}
                width={`${100 / waveformData.length}%`}
                height={`${height}%`}
                fill="rgba(147, 51, 234, 0.2)"
              />
            );
          })}
        </svg>
      </div>
    );
  };

  // Generate thumbnail strip
  const renderThumbnails = () => {
    if (!thumbnails.length) return null;

    return (
      <div className="absolute inset-0 flex pointer-events-none">
        {thumbnails.map((src, index) => (
          <img
            key={index}
            src={src}
            alt=""
            className="flex-1 h-full object-cover opacity-30"
          />
        ))}
      </div>
    );
  };

  const clipDuration = clipEnd - clipStart;
  const startPosition = timeToPosition(clipStart);
  const endPosition = timeToPosition(clipEnd);
  const currentPosition = timeToPosition(currentTime);

  return (
    <div className="bg-[var(--ff-bg-layer)] border border-[var(--ff-border)] rounded-lg p-4">
      {/* Header */}
      <div className="flex items-center justify-between mb-4">
        <div className="flex items-center gap-3">
          <Scissors className="w-5 h-5 text-[var(--ff-purple-500)]" />
          <span className="text-sm font-medium text-white">Timeline Selection</span>
        </div>
        <div className="flex items-center gap-4">
          <span className="text-xs text-[var(--ff-text-muted)]">
            Duration: {formatTime(clipDuration)}
          </span>
          <button
            onClick={togglePreview}
            className="px-3 py-1 bg-[var(--ff-purple-500)] text-white rounded-lg hover:bg-[var(--ff-purple-600)] transition-colors flex items-center gap-2 text-sm"
          >
            {isPreviewPlaying ? (
              <>
                <Pause className="w-3 h-3" />
                Stop
              </>
            ) : (
              <>
                <Play className="w-3 h-3" />
                Preview
              </>
            )}
          </button>
        </div>
      </div>

      {/* Timeline */}
      <div
        ref={timelineRef}
        className="relative h-20 bg-gray-900 rounded-lg overflow-hidden cursor-pointer"
        onClick={handleTimelineClick}
        onMouseMove={handleMouseOver}
        onMouseLeave={() => setHoverTime(null)}
      >
        {/* Background layers */}
        {renderThumbnails()}
        {renderWaveform()}

        {/* Current time indicator */}
        <div
          className="absolute top-0 bottom-0 w-0.5 bg-white z-20 pointer-events-none"
          style={{ left: `${currentPosition}px` }}
        />

        {/* Selected range */}
        <div
          className="absolute top-0 bottom-0 bg-[var(--ff-purple-500)] bg-opacity-30 border-y-2 border-[var(--ff-purple-500)]"
          style={{
            left: `${startPosition}px`,
            width: `${endPosition - startPosition}px`,
            cursor: isDragging === 'range' ? 'grabbing' : 'grab'
          }}
          onMouseDown={(e) => handleMouseDown(e, 'range')}
        />

        {/* Start handle */}
        <div
          className={`absolute top-0 bottom-0 w-3 bg-[var(--ff-purple-500)] cursor-ew-resize z-10 flex items-center justify-center hover:bg-[var(--ff-purple-600)] transition-colors ${
            isDragging === 'start' ? 'bg-[var(--ff-purple-600)]' : ''
          }`}
          style={{ left: `${startPosition - 6}px` }}
          onMouseDown={(e) => handleMouseDown(e, 'start')}
        >
          <GripVertical className="w-3 h-3 text-white" />
        </div>

        {/* End handle */}
        <div
          className={`absolute top-0 bottom-0 w-3 bg-[var(--ff-purple-500)] cursor-ew-resize z-10 flex items-center justify-center hover:bg-[var(--ff-purple-600)] transition-colors ${
            isDragging === 'end' ? 'bg-[var(--ff-purple-600)]' : ''
          }`}
          style={{ left: `${endPosition - 6}px` }}
          onMouseDown={(e) => handleMouseDown(e, 'end')}
        >
          <GripVertical className="w-3 h-3 text-white" />
        </div>

        {/* Hover time tooltip */}
        {hoverTime !== null && !isDragging && (
          <div
            className="absolute -top-8 bg-gray-800 text-white text-xs px-2 py-1 rounded pointer-events-none"
            style={{ left: `${timeToPosition(hoverTime) - 20}px` }}
          >
            {formatTime(hoverTime)}
          </div>
        )}
      </div>

      {/* Time labels */}
      <div className="flex justify-between mt-2">
        <div className="text-xs text-[var(--ff-text-muted)]">
          Start: {formatTime(clipStart)}
        </div>
        <div className="text-xs text-[var(--ff-text-muted)]">
          {formatTime(duration)}
        </div>
        <div className="text-xs text-[var(--ff-text-muted)]">
          End: {formatTime(clipEnd)}
        </div>
      </div>
    </div>
  );
};