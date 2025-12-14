'use client';

import React, { useRef, useState, useEffect, useCallback } from 'react';
import { Play, Pause, RotateCw, Volume2, VolumeX, Maximize2, Download, Copy } from 'lucide-react';

interface ClipPreviewProps {
  videoUrl: string;
  startTime: number;
  endTime: number;
  title?: string;
  transcript?: Array<{
    text: string;
    startTime: number;
    endTime: number;
    speaker?: string;
  }>;
  onShare?: () => void;
  onDownload?: () => void;
  className?: string;
}

export const ClipPreview: React.FC<ClipPreviewProps> = ({
  videoUrl,
  startTime,
  endTime,
  title,
  transcript = [],
  onShare,
  onDownload,
  className = ''
}) => {
  const videoRef = useRef<HTMLVideoElement>(null);
  const containerRef = useRef<HTMLDivElement>(null);
  const [isPlaying, setIsPlaying] = useState(false);
  const [currentTime, setCurrentTime] = useState(startTime);
  const [isMuted, setIsMuted] = useState(false);
  const [isLooping, setIsLooping] = useState(true);
  const [isFullscreen, setIsFullscreen] = useState(false);
  const [showControls, setShowControls] = useState(true);
  const [clipUrl, setClipUrl] = useState('');
  const [copied, setCopied] = useState(false);
  const [isLoading, setIsLoading] = useState(true);

  const clipDuration = endTime - startTime;

  // Format time display
  const formatTime = (seconds: number): string => {
    const mins = Math.floor(seconds / 60);
    const secs = Math.floor(seconds % 60);
    return `${mins}:${secs.toString().padStart(2, '0')}`;
  };

  // Initialize video with clip range
  useEffect(() => {
    if (!videoRef.current) return;

    const video = videoRef.current;

    // Set initial time when metadata loads
    const handleLoadedMetadata = () => {
      video.currentTime = startTime;
      setIsLoading(false);
    };

    video.addEventListener('loadedmetadata', handleLoadedMetadata);

    // Generate shareable URL
    const url = new URL(window.location.href);
    url.searchParams.set('clip', `${startTime}-${endTime}`);
    setClipUrl(url.toString());

    return () => {
      video.removeEventListener('loadedmetadata', handleLoadedMetadata);
    };
  }, [startTime, endTime]);

  // Handle time updates and looping
  useEffect(() => {
    if (!videoRef.current) return;

    const video = videoRef.current;

    const handleTimeUpdate = () => {
      const relativeTime = video.currentTime - startTime;
      setCurrentTime(relativeTime);

      // Check if reached end of clip
      if (video.currentTime >= endTime) {
        if (isLooping) {
          video.currentTime = startTime;
          if (!video.paused) {
            video.play();
          }
        } else {
          video.pause();
          setIsPlaying(false);
        }
      }
    };

    video.addEventListener('timeupdate', handleTimeUpdate);

    return () => {
      video.removeEventListener('timeupdate', handleTimeUpdate);
    };
  }, [startTime, endTime, isLooping]);

  // Play/pause control
  const togglePlayPause = useCallback(() => {
    if (!videoRef.current) return;

    if (isPlaying) {
      videoRef.current.pause();
    } else {
      // Reset to start if at end
      if (videoRef.current.currentTime >= endTime) {
        videoRef.current.currentTime = startTime;
      }
      videoRef.current.play();
    }
    setIsPlaying(!isPlaying);
  }, [isPlaying, startTime, endTime]);

  // Mute control
  const toggleMute = useCallback(() => {
    if (!videoRef.current) return;
    videoRef.current.muted = !isMuted;
    setIsMuted(!isMuted);
  }, [isMuted]);

  // Loop control
  const toggleLoop = useCallback(() => {
    setIsLooping(!isLooping);
  }, [isLooping]);

  // Fullscreen control
  const toggleFullscreen = useCallback(async () => {
    if (!containerRef.current) return;

    try {
      if (!isFullscreen) {
        if (containerRef.current.requestFullscreen) {
          await containerRef.current.requestFullscreen();
        }
      } else {
        if (document.exitFullscreen) {
          await document.exitFullscreen();
        }
      }
      setIsFullscreen(!isFullscreen);
    } catch (err) {
      console.error('Fullscreen error:', err);
    }
  }, [isFullscreen]);

  // Copy clip URL
  const copyClipUrl = useCallback(() => {
    navigator.clipboard.writeText(clipUrl);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  }, [clipUrl]);

  // Seek within clip
  const handleSeek = useCallback((e: React.ChangeEvent<HTMLInputElement>) => {
    if (!videoRef.current) return;
    const seekTime = parseFloat(e.target.value);
    videoRef.current.currentTime = startTime + seekTime;
  }, [startTime]);

  // Get active transcript segment
  const getActiveTranscript = () => {
    const videoTime = videoRef.current?.currentTime || startTime;
    return transcript.filter(
      segment => segment.startTime <= videoTime && segment.endTime >= videoTime
    );
  };

  const activeTranscripts = getActiveTranscript();

  // Auto-hide controls
  useEffect(() => {
    let timeout: NodeJS.Timeout;

    const resetTimer = () => {
      setShowControls(true);
      clearTimeout(timeout);
      timeout = setTimeout(() => setShowControls(false), 3000);
    };

    const handleMouseMove = () => {
      if (isPlaying) resetTimer();
    };

    containerRef.current?.addEventListener('mousemove', handleMouseMove);

    return () => {
      clearTimeout(timeout);
      containerRef.current?.removeEventListener('mousemove', handleMouseMove);
    };
  }, [isPlaying]);

  return (
    <div
      ref={containerRef}
      className={`relative bg-black rounded-lg overflow-hidden group ${className}`}
      onMouseEnter={() => setShowControls(true)}
      onMouseLeave={() => isPlaying && setShowControls(false)}
    >
      {/* Video element */}
      <video
        ref={videoRef}
        src={videoUrl}
        className="w-full h-full object-contain"
        onPlay={() => setIsPlaying(true)}
        onPause={() => setIsPlaying(false)}
        onClick={togglePlayPause}
      />

      {/* Loading indicator */}
      {isLoading && (
        <div className="absolute inset-0 flex items-center justify-center bg-black bg-opacity-50">
          <div className="animate-spin rounded-full h-12 w-12 border-4 border-white border-t-transparent" />
        </div>
      )}

      {/* Title overlay */}
      {title && showControls && (
        <div className="absolute top-0 left-0 right-0 p-4 bg-gradient-to-b from-black to-transparent">
          <h3 className="text-white font-medium text-lg">{title}</h3>
          <p className="text-gray-300 text-sm mt-1">
            {formatTime(0)} - {formatTime(clipDuration)}
          </p>
        </div>
      )}

      {/* Transcript overlay */}
      {activeTranscripts.length > 0 && (
        <div className="absolute bottom-20 left-0 right-0 p-4 text-center">
          {activeTranscripts.map((segment, index) => (
            <div
              key={index}
              className="bg-black bg-opacity-75 text-white px-4 py-2 rounded-lg inline-block"
            >
              {segment.speaker && (
                <span className="text-[var(--ff-purple-400)] text-sm">
                  {segment.speaker}:{' '}
                </span>
              )}
              <span className="text-sm">{segment.text}</span>
            </div>
          ))}
        </div>
      )}

      {/* Controls overlay */}
      <div
        className={`absolute bottom-0 left-0 right-0 bg-gradient-to-t from-black to-transparent transition-opacity duration-300 ${
          showControls ? 'opacity-100' : 'opacity-0 pointer-events-none'
        }`}
      >
        {/* Progress bar */}
        <div className="px-4 pb-2">
          <input
            type="range"
            min="0"
            max={clipDuration}
            value={currentTime}
            onChange={handleSeek}
            className="w-full h-1 bg-gray-600 rounded-lg appearance-none cursor-pointer slider"
            style={{
              background: `linear-gradient(to right, var(--ff-purple-500) 0%, var(--ff-purple-500) ${
                (currentTime / clipDuration) * 100
              }%, #4B5563 ${(currentTime / clipDuration) * 100}%, #4B5563 100%)`
            }}
          />
          <div className="flex justify-between text-xs text-gray-400 mt-1">
            <span>{formatTime(currentTime)}</span>
            <span>{formatTime(clipDuration)}</span>
          </div>
        </div>

        {/* Control buttons */}
        <div className="flex items-center justify-between px-4 pb-4">
          <div className="flex items-center gap-2">
            {/* Play/Pause */}
            <button
              onClick={togglePlayPause}
              className="p-2 rounded-lg bg-white bg-opacity-20 hover:bg-opacity-30 transition-all text-white"
            >
              {isPlaying ? (
                <Pause className="w-5 h-5" />
              ) : (
                <Play className="w-5 h-5" />
              )}
            </button>

            {/* Loop */}
            <button
              onClick={toggleLoop}
              className={`p-2 rounded-lg transition-all ${
                isLooping
                  ? 'bg-[var(--ff-purple-500)] text-white'
                  : 'bg-white bg-opacity-20 hover:bg-opacity-30 text-white'
              }`}
              title="Toggle loop"
            >
              <RotateCw className="w-5 h-5" />
            </button>

            {/* Volume */}
            <button
              onClick={toggleMute}
              className="p-2 rounded-lg bg-white bg-opacity-20 hover:bg-opacity-30 transition-all text-white"
            >
              {isMuted ? (
                <VolumeX className="w-5 h-5" />
              ) : (
                <Volume2 className="w-5 h-5" />
              )}
            </button>
          </div>

          <div className="flex items-center gap-2">
            {/* Copy URL */}
            <button
              onClick={copyClipUrl}
              className="p-2 rounded-lg bg-white bg-opacity-20 hover:bg-opacity-30 transition-all text-white relative"
              title="Copy clip URL"
            >
              <Copy className="w-5 h-5" />
              {copied && (
                <span className="absolute -top-8 left-1/2 transform -translate-x-1/2 bg-gray-800 text-white text-xs px-2 py-1 rounded">
                  Copied!
                </span>
              )}
            </button>

            {/* Download */}
            {onDownload && (
              <button
                onClick={onDownload}
                className="p-2 rounded-lg bg-white bg-opacity-20 hover:bg-opacity-30 transition-all text-white"
                title="Download clip"
              >
                <Download className="w-5 h-5" />
              </button>
            )}

            {/* Fullscreen */}
            <button
              onClick={toggleFullscreen}
              className="p-2 rounded-lg bg-white bg-opacity-20 hover:bg-opacity-30 transition-all text-white"
              title="Fullscreen"
            >
              <Maximize2 className="w-5 h-5" />
            </button>
          </div>
        </div>
      </div>

      <style jsx>{`
        .slider::-webkit-slider-thumb {
          appearance: none;
          width: 12px;
          height: 12px;
          background: var(--ff-purple-500);
          border-radius: 50%;
          cursor: pointer;
        }

        .slider::-moz-range-thumb {
          width: 12px;
          height: 12px;
          background: var(--ff-purple-500);
          border-radius: 50%;
          cursor: pointer;
          border: none;
        }
      `}</style>
    </div>
  );
};