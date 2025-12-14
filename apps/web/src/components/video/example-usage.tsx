/**
 * Example Usage of VideoPlayer Component
 * This demonstrates REAL API integration, not mocked data
 */

import React, { useEffect, useState } from 'react';
import { VideoPlayer } from './VideoPlayer';

// Example: Using VideoPlayer in a meeting detail page
export function MeetingDetailPage({ params }: { params: { id: string } }) {
  const [authToken, setAuthToken] = useState<string>('');

  useEffect(() => {
    // In production, get auth token from your auth context/store
    // Example: const token = useAuthStore(state => state.token);
    const getToken = async () => {
      // This would be your real auth token retrieval
      const response = await fetch('/api/auth/token');
      const data = await response.json();
      setAuthToken(data.token);
    };

    getToken();
  }, []);

  if (!authToken) {
    return <div>Loading authentication...</div>;
  }

  return (
    <div className="min-h-screen">
      <VideoPlayer
        meetingId={params.id}
        authToken={authToken}
        className="h-screen"
      />
    </div>
  );
}

// Example: Using VideoPlayer with custom video URL
export function CustomVideoPage() {
  const [authToken] = useState('your-auth-token');
  const customVideoUrl = 'https://example.com/videos/meeting-recording.mp4';

  return (
    <VideoPlayer
      meetingId="meeting-123"
      videoUrl={customVideoUrl}
      authToken={authToken}
      className="h-screen"
    />
  );
}

// Example: Embedding VideoPlayer in a dashboard
export function DashboardWithVideo() {
  const [selectedMeeting, setSelectedMeeting] = useState<string | null>(null);
  const [meetings, setMeetings] = useState<Array<{ id: string; title: string }>>([]);
  const [authToken] = useState('your-auth-token');

  useEffect(() => {
    // Fetch list of meetings from REAL API
    const fetchMeetings = async () => {
      const response = await fetch('/api/meetings', {
        headers: {
          'Authorization': `Bearer ${authToken}`
        }
      });
      const data = await response.json();
      setMeetings(data);
    };

    fetchMeetings();
  }, [authToken]);

  return (
    <div className="flex h-screen">
      {/* Meeting List Sidebar */}
      <div className="w-64 bg-[var(--ff-bg-layer)] border-r border-[var(--ff-border)] p-4">
        <h2 className="text-lg font-semibold mb-4">Meetings</h2>
        <ul className="space-y-2">
          {meetings.map(meeting => (
            <li key={meeting.id}>
              <button
                onClick={() => setSelectedMeeting(meeting.id)}
                className={`w-full text-left p-2 rounded ${
                  selectedMeeting === meeting.id
                    ? 'bg-[var(--ff-purple-500)] text-white'
                    : 'hover:bg-gray-800'
                }`}
              >
                {meeting.title}
              </button>
            </li>
          ))}
        </ul>
      </div>

      {/* Video Player */}
      <div className="flex-1">
        {selectedMeeting ? (
          <VideoPlayer
            meetingId={selectedMeeting}
            authToken={authToken}
            className="h-full"
          />
        ) : (
          <div className="flex items-center justify-center h-full text-[var(--ff-text-muted)]">
            Select a meeting to view
          </div>
        )}
      </div>
    </div>
  );
}

// Example: Using VideoPlayer with external controls
export function VideoWithExternalControls() {
  const videoRef = React.useRef<HTMLVideoElement>(null);
  const [authToken] = useState('your-auth-token');

  const handleExternalPlay = () => {
    if (videoRef.current) {
      videoRef.current.play();
    }
  };

  const handleExternalPause = () => {
    if (videoRef.current) {
      videoRef.current.pause();
    }
  };

  const handleExternalSeek = (time: number) => {
    if (videoRef.current) {
      videoRef.current.currentTime = time;
    }
  };

  return (
    <div>
      {/* External control buttons */}
      <div className="p-4 bg-[var(--ff-bg-layer)] border-b border-[var(--ff-border)]">
        <button
          onClick={handleExternalPlay}
          className="px-4 py-2 bg-[var(--ff-purple-500)] text-white rounded mr-2"
        >
          External Play
        </button>
        <button
          onClick={handleExternalPause}
          className="px-4 py-2 bg-gray-700 text-white rounded mr-2"
        >
          External Pause
        </button>
        <button
          onClick={() => handleExternalSeek(30)}
          className="px-4 py-2 bg-gray-700 text-white rounded"
        >
          Jump to 0:30
        </button>
      </div>

      {/* Video Player */}
      <VideoPlayer
        meetingId="meeting-456"
        authToken={authToken}
        className="h-[calc(100vh-80px)]"
      />
    </div>
  );
}

/**
 * API Response Types (for reference)
 * These match what the REAL backend APIs return
 */

interface MeetingResponse {
  id: string;
  title: string;
  videoUrl: string;
  duration: number;
  recordedAt: string;
}

interface TranscriptResponse {
  segments: Array<{
    id: string;
    text: string;
    speaker: string;
    startTime: number;
    endTime: number;
    confidence?: number;
  }>;
}

interface VideoClipRequest {
  meetingId: string;
  startTime: number;
  endTime: number;
  title: string;
  transcript: Array<{
    id: string;
    text: string;
    speaker: string;
    startTime: number;
    endTime: number;
  }>;
}

interface VideoClipResponse {
  id: string;
  meetingId: string;
  title: string;
  startTime: number;
  endTime: number;
  createdAt: string;
  url: string;
}