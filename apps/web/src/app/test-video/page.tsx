'use client';

import React, { useState } from 'react';
import { VideoPlayer } from '@/components/video/VideoPlayer';

export default function TestVideoPage() {
  const [meetingId] = useState('test-meeting-123');
  const [authToken] = useState('test-token-abc'); // In production, get from auth context

  return (
    <div className="min-h-screen bg-[var(--ff-bg-dark)]">
      <VideoPlayer
        meetingId={meetingId}
        authToken={authToken}
        className="h-screen"
      />
    </div>
  );
}