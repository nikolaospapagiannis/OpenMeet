'use client';

import React, { useRef, useState, useEffect, useCallback } from 'react';
import { VideoControls } from './VideoControls';
import { TranscriptSidebar } from './TranscriptSidebar';
import { ClipCreator } from './ClipCreator';
import { useVideoSync } from '../../hooks/useVideoSync';

interface VideoPlayerProps {
  meetingId: string;
  videoUrl?: string;
  className?: string;
  authToken: string;
}

export interface TranscriptSegment {
  id: string;
  text: string;
  speaker: string;
  startTime: number;
  endTime: number;
  confidence?: number;
}

export interface Meeting {
  id: string;
  title: string;
  videoUrl: string;
  duration: number;
  recordedAt: string;
}

export const VideoPlayer: React.FC<VideoPlayerProps> = ({
  meetingId,
  videoUrl: propVideoUrl,
  className = '',
  authToken
}) => {
  const videoRef = useRef<HTMLVideoElement>(null);
  const containerRef = useRef<HTMLDivElement>(null);

  const [meeting, setMeeting] = useState<Meeting | null>(null);
  const [transcript, setTranscript] = useState<TranscriptSegment[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const [isPlaying, setIsPlaying] = useState(false);
  const [currentTime, setCurrentTime] = useState(0);
  const [duration, setDuration] = useState(0);
  const [volume, setVolume] = useState(1);
  const [playbackRate, setPlaybackRate] = useState(1);
  const [isFullscreen, setIsFullscreen] = useState(false);
  const [isMuted, setIsMuted] = useState(false);

  const [showClipCreator, setShowClipCreator] = useState(false);
  const [clipStart, setClipStart] = useState<number | null>(null);
  const [clipEnd, setClipEnd] = useState<number | null>(null);

  // Fetch meeting data
  useEffect(() => {
    const fetchMeetingData = async () => {
      setIsLoading(true);
      setError(null);

      try {
        // Fetch meeting details
        const meetingResponse = await fetch(`/api/meetings/${meetingId}`, {
          headers: {
            'Authorization': `Bearer ${authToken}`,
            'Content-Type': 'application/json'
          }
        });

        if (!meetingResponse.ok) {
          throw new Error(`Failed to fetch meeting: ${meetingResponse.statusText}`);
        }

        const meetingData = await meetingResponse.json();
        setMeeting(meetingData);

        // Fetch transcript
        const transcriptResponse = await fetch(`/api/meetings/${meetingId}/transcript`, {
          headers: {
            'Authorization': `Bearer ${authToken}`,
            'Content-Type': 'application/json'
          }
        });

        if (!transcriptResponse.ok) {
          throw new Error(`Failed to fetch transcript: ${transcriptResponse.statusText}`);
        }

        const transcriptData = await transcriptResponse.json();
        setTranscript(transcriptData.segments || []);

      } catch (err) {
        setError(err instanceof Error ? err.message : 'Failed to load meeting data');
        console.error('Error fetching meeting data:', err);
      } finally {
        setIsLoading(false);
      }
    };

    if (meetingId && authToken) {
      fetchMeetingData();
    }
  }, [meetingId, authToken]);

  // Video event handlers
  const handleLoadedMetadata = () => {
    if (videoRef.current) {
      setDuration(videoRef.current.duration);
    }
  };

  const handleTimeUpdate = () => {
    if (videoRef.current) {
      setCurrentTime(videoRef.current.currentTime);
    }
  };

  const togglePlayPause = useCallback(() => {
    if (!videoRef.current) return;

    if (isPlaying) {
      videoRef.current.pause();
    } else {
      videoRef.current.play();
    }
    setIsPlaying(!isPlaying);
  }, [isPlaying]);

  const handleSeek = useCallback((time: number) => {
    if (videoRef.current) {
      videoRef.current.currentTime = time;
      setCurrentTime(time);
    }
  }, []);

  const handleVolumeChange = useCallback((newVolume: number) => {
    if (videoRef.current) {
      videoRef.current.volume = newVolume;
      setVolume(newVolume);
      setIsMuted(newVolume === 0);
    }
  }, []);

  const toggleMute = useCallback(() => {
    if (videoRef.current) {
      if (isMuted) {
        videoRef.current.volume = volume || 0.5;
        setIsMuted(false);
        setVolume(volume || 0.5);
      } else {
        videoRef.current.volume = 0;
        setIsMuted(true);
      }
    }
  }, [isMuted, volume]);

  const handlePlaybackRateChange = useCallback((rate: number) => {
    if (videoRef.current) {
      videoRef.current.playbackRate = rate;
      setPlaybackRate(rate);
    }
  }, []);

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

  const handleTranscriptClick = useCallback((segment: TranscriptSegment) => {
    handleSeek(segment.startTime);
    if (!isPlaying && videoRef.current) {
      videoRef.current.play();
      setIsPlaying(true);
    }
  }, [handleSeek, isPlaying]);

  const handleCreateClip = useCallback(async (start: number, end: number, title: string) => {
    try {
      const response = await fetch(`/api/video-clips`, {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${authToken}`,
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({
          meetingId,
          startTime: start,
          endTime: end,
          title,
          transcript: transcript.filter(
            s => s.startTime >= start && s.endTime <= end
          )
        })
      });

      if (!response.ok) {
        throw new Error('Failed to create clip');
      }

      const clip = await response.json();
      console.log('Clip created:', clip);
      setShowClipCreator(false);
      setClipStart(null);
      setClipEnd(null);

      // Show success notification (you can implement a toast here)
      alert('Clip created successfully!');
    } catch (err) {
      console.error('Error creating clip:', err);
      alert('Failed to create clip. Please try again.');
    }
  }, [authToken, meetingId, transcript]);

  const activeSegment = useVideoSync(transcript, currentTime);

  if (isLoading) {
    return (
      <div className="flex items-center justify-center h-screen bg-[var(--ff-bg-dark)]">
        <div className="text-[var(--ff-text-muted)]">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-[var(--ff-purple-500)] mx-auto mb-4"></div>
          Loading video...
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="flex items-center justify-center h-screen bg-[var(--ff-bg-dark)]">
        <div className="text-red-500 text-center">
          <p className="text-xl mb-2">Error loading video</p>
          <p className="text-sm text-[var(--ff-text-muted)]">{error}</p>
        </div>
      </div>
    );
  }

  const videoSource = propVideoUrl || meeting?.videoUrl;

  return (
    <div
      ref={containerRef}
      className={`flex flex-col lg:flex-row h-screen bg-[var(--ff-bg-dark)] ${className}`}
    >
      <div className="flex-1 flex flex-col relative">
        <div className="flex-1 relative bg-black">
          <video
            ref={videoRef}
            src={videoSource}
            className="w-full h-full object-contain"
            onLoadedMetadata={handleLoadedMetadata}
            onTimeUpdate={handleTimeUpdate}
            onPlay={() => setIsPlaying(true)}
            onPause={() => setIsPlaying(false)}
            onClick={togglePlayPause}
          />

          {showClipCreator && (
            <ClipCreator
              videoRef={videoRef}
              currentTime={currentTime}
              duration={duration}
              onCreateClip={handleCreateClip}
              onCancel={() => {
                setShowClipCreator(false);
                setClipStart(null);
                setClipEnd(null);
              }}
              initialStart={clipStart}
              initialEnd={clipEnd}
            />
          )}
        </div>

        <VideoControls
          isPlaying={isPlaying}
          currentTime={currentTime}
          duration={duration}
          volume={volume}
          isMuted={isMuted}
          playbackRate={playbackRate}
          isFullscreen={isFullscreen}
          onPlayPause={togglePlayPause}
          onSeek={handleSeek}
          onVolumeChange={handleVolumeChange}
          onToggleMute={toggleMute}
          onPlaybackRateChange={handlePlaybackRateChange}
          onToggleFullscreen={toggleFullscreen}
          onStartClip={() => setShowClipCreator(true)}
        />
      </div>

      <TranscriptSidebar
        segments={transcript}
        activeSegment={activeSegment}
        onSegmentClick={handleTranscriptClick}
        currentTime={currentTime}
      />
    </div>
  );
};