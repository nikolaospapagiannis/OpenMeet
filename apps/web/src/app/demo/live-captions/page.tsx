/**
 * Live Captions Demo Page
 * Test page for Live Captions Overlay Component
 */

'use client';

import { useState } from 'react';
import { LiveCaptionsOverlay } from '@/components/live/LiveCaptionsOverlay';
import { PlayIcon, StopIcon } from '@heroicons/react/24/solid';

export default function LiveCaptionsDemo() {
  const [showCaptions, setShowCaptions] = useState(false);
  const [meetingId] = useState(`demo-meeting-${Date.now()}`);

  return (
    <div className="min-h-screen bg-gradient-to-b from-gray-900 to-black p-8">
      <div className="max-w-4xl mx-auto">
        <h1 className="text-4xl font-bold text-white mb-2">Live Captions Demo</h1>
        <p className="text-gray-400 mb-8">
          Test the real-time WebSocket-powered live captions overlay
        </p>

        <div className="bg-gray-900/50 backdrop-blur-sm rounded-xl border border-gray-800 p-8">
          {/* Controls */}
          <div className="flex items-center gap-4 mb-6">
            <button
              onClick={() => setShowCaptions(!showCaptions)}
              className={`px-6 py-3 rounded-lg font-medium transition-all flex items-center gap-2 ${
                showCaptions
                  ? 'bg-red-500 hover:bg-red-600 text-white'
                  : 'bg-purple-500 hover:bg-purple-600 text-white'
              }`}
            >
              {showCaptions ? (
                <>
                  <StopIcon className="w-5 h-5" />
                  Stop Captions
                </>
              ) : (
                <>
                  <PlayIcon className="w-5 h-5" />
                  Start Captions
                </>
              )}
            </button>

            <div className="text-sm text-gray-400">
              Meeting ID: <code className="text-purple-400 bg-gray-800 px-2 py-1 rounded">{meetingId}</code>
            </div>
          </div>

          {/* Demo Meeting Area */}
          <div className="relative bg-black rounded-lg overflow-hidden" style={{ aspectRatio: '16/9' }}>
            <div className="absolute inset-0 flex items-center justify-center">
              <div className="text-center">
                <div className="w-32 h-32 mx-auto mb-4 rounded-full bg-gradient-to-br from-purple-500 to-pink-500 flex items-center justify-center">
                  <svg className="w-16 h-16 text-white" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 10l4.553-2.276A1 1 0 0121 8.618v6.764a1 1 0 01-1.447.894L15 14M5 18h8a2 2 0 002-2V8a2 2 0 00-2-2H5a2 2 0 00-2 2v8a2 2 0 002 2z" />
                  </svg>
                </div>
                <h2 className="text-xl font-semibold text-white mb-2">Demo Meeting View</h2>
                <p className="text-gray-400">
                  {showCaptions ? 'Captions are active - speak to see them appear!' : 'Click "Start Captions" to begin'}
                </p>
              </div>
            </div>

            {/* Status Bar */}
            <div className="absolute top-4 left-4 flex items-center gap-2">
              <div className={`px-3 py-1 rounded-full text-xs font-medium ${
                showCaptions ? 'bg-green-500/20 text-green-400' : 'bg-gray-500/20 text-gray-400'
              }`}>
                {showCaptions ? '● Live' : '○ Ready'}
              </div>
            </div>
          </div>

          {/* Instructions */}
          <div className="mt-6 p-4 bg-blue-500/10 border border-blue-500/20 rounded-lg">
            <h3 className="text-blue-400 font-medium mb-2">How to Test:</h3>
            <ol className="text-sm text-gray-300 space-y-1">
              <li>1. Click "Start Captions" to activate the overlay</li>
              <li>2. The overlay will connect to the WebSocket server at ws://localhost:4100</li>
              <li>3. Drag the caption overlay to reposition it</li>
              <li>4. Click the settings icon to customize appearance</li>
              <li>5. Use the export button to download captions as SRT or WebVTT</li>
            </ol>
          </div>

          {/* Technical Info */}
          <div className="mt-4 p-4 bg-gray-800/50 rounded-lg">
            <h3 className="text-gray-400 font-medium mb-2">WebSocket Connection:</h3>
            <code className="text-xs text-green-400 bg-gray-900 px-2 py-1 rounded block">
              {process.env.NEXT_PUBLIC_WS_URL || 'ws://localhost:4100/ws/live-captions'}?meetingId={meetingId}
            </code>
          </div>
        </div>
      </div>

      {/* Live Captions Overlay */}
      {showCaptions && (
        <LiveCaptionsOverlay
          meetingId={meetingId}
          onClose={() => setShowCaptions(false)}
          initialPosition="bottom"
          showControls={true}
        />
      )}
    </div>
  );
}