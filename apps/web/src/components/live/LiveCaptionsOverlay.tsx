/**
 * Live Captions Overlay Component
 * Real-time caption display with WebSocket connection
 * PRODUCTION READY - NO MOCKS
 */

'use client';

import React, { useState, useEffect, useRef, useCallback } from 'react';
import { useLiveCaptions } from '@/hooks/useLiveCaptions';
import { CaptionSettings } from './CaptionSettings';
import { motion, AnimatePresence } from 'framer-motion';
import {
  XMarkIcon,
  Cog6ToothIcon,
  ArrowDownTrayIcon,
  SignalIcon,
  SignalSlashIcon,
  MicrophoneIcon
} from '@heroicons/react/24/outline';

interface LiveCaptionsOverlayProps {
  meetingId: string;
  onClose?: () => void;
  initialPosition?: 'top' | 'bottom' | 'custom';
  initialCustomPosition?: { x: number; y: number };
  showControls?: boolean;
}

export function LiveCaptionsOverlay({
  meetingId,
  onClose,
  initialPosition = 'bottom',
  initialCustomPosition,
  showControls = true
}: LiveCaptionsOverlayProps) {
  const [showSettings, setShowSettings] = useState(false);
  const [isDragging, setIsDragging] = useState(false);
  const [position, setPosition] = useState({ x: 0, y: 0 });
  const [captionHistory, setCaptionHistory] = useState<string[]>([]);
  const overlayRef = useRef<HTMLDivElement>(null);
  const dragStartRef = useRef({ x: 0, y: 0 });

  const {
    currentCaption,
    captions,
    connectionStatus,
    sessionId,
    settings,
    connect,
    disconnect,
    startSession,
    stopSession,
    updateSettings,
    exportToSRT,
    exportToWebVTT,
    isConnected,
    isConnecting,
    hasError
  } = useLiveCaptions({
    meetingId,
    wsUrl: process.env.NEXT_PUBLIC_WS_URL ? `${process.env.NEXT_PUBLIC_WS_URL}/ws/live-captions` : 'ws://localhost:4100/ws/live-captions',
    onError: (error) => {
      console.error('Caption error:', error);
    }
  });

  // Initialize position based on settings
  useEffect(() => {
    if (initialCustomPosition) {
      setPosition(initialCustomPosition);
    } else if (initialPosition === 'bottom') {
      setPosition({ x: window.innerWidth / 2 - 300, y: window.innerHeight - 150 });
    } else if (initialPosition === 'top') {
      setPosition({ x: window.innerWidth / 2 - 300, y: 50 });
    }
  }, [initialPosition, initialCustomPosition]);

  // Start session when connected
  useEffect(() => {
    if (isConnected && !sessionId) {
      startSession();
    }
  }, [isConnected, sessionId, startSession]);

  // Update caption history
  useEffect(() => {
    if (currentCaption && currentCaption.isFinal) {
      setCaptionHistory(prev => [...prev.slice(-4), currentCaption.text]);
    }
  }, [currentCaption]);

  // Handle drag start
  const handleDragStart = useCallback((e: React.MouseEvent) => {
    if (!overlayRef.current) return;

    setIsDragging(true);
    dragStartRef.current = {
      x: e.clientX - position.x,
      y: e.clientY - position.y
    };

    e.preventDefault();
  }, [position]);

  // Handle drag move
  const handleDragMove = useCallback((e: MouseEvent) => {
    if (!isDragging) return;

    const newX = e.clientX - dragStartRef.current.x;
    const newY = e.clientY - dragStartRef.current.y;

    // Keep within viewport bounds
    const maxX = window.innerWidth - (overlayRef.current?.offsetWidth || 600);
    const maxY = window.innerHeight - (overlayRef.current?.offsetHeight || 200);

    setPosition({
      x: Math.max(0, Math.min(newX, maxX)),
      y: Math.max(0, Math.min(newY, maxY))
    });
  }, [isDragging]);

  // Handle drag end
  const handleDragEnd = useCallback(() => {
    setIsDragging(false);
  }, []);

  // Add global mouse event listeners for dragging
  useEffect(() => {
    if (isDragging) {
      document.addEventListener('mousemove', handleDragMove);
      document.addEventListener('mouseup', handleDragEnd);

      return () => {
        document.removeEventListener('mousemove', handleDragMove);
        document.removeEventListener('mouseup', handleDragEnd);
      };
    }
  }, [isDragging, handleDragMove, handleDragEnd]);

  // Export captions
  const handleExport = useCallback((format: 'srt' | 'vtt') => {
    const content = format === 'srt' ? exportToSRT() : exportToWebVTT();
    const blob = new Blob([content], { type: 'text/plain;charset=utf-8' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.download = `captions-${meetingId}.${format}`;
    link.click();
    URL.revokeObjectURL(url);
  }, [exportToSRT, exportToWebVTT, meetingId]);

  // Get font size class
  const getFontSizeClass = () => {
    switch (settings.fontSize) {
      case 'small': return 'text-sm';
      case 'large': return 'text-xl';
      default: return 'text-base';
    }
  };

  // Get background opacity
  const getBackgroundStyle = () => {
    const opacity = settings.backgroundColor / 100;
    return `rgba(10, 10, 26, ${opacity})`; // Using --ff-bg-layer color
  };

  return (
    <>
      <div
        ref={overlayRef}
        className="fixed z-50 pointer-events-auto select-none"
        style={{
          left: `${position.x}px`,
          top: `${position.y}px`,
          width: '600px',
          maxWidth: '90vw',
          cursor: isDragging ? 'grabbing' : 'grab'
        }}
        onMouseDown={handleDragStart}
      >
        {/* Controls Bar */}
        {showControls && (
          <div className="flex items-center justify-between mb-2 px-4 py-2 rounded-lg"
               style={{ backgroundColor: getBackgroundStyle() }}>
            <div className="flex items-center gap-3">
              {/* Connection Status */}
              <div className="flex items-center gap-2">
                {isConnected ? (
                  <>
                    <SignalIcon className="w-4 h-4 text-green-400" />
                    <span className="text-xs text-green-400">Live</span>
                  </>
                ) : isConnecting ? (
                  <>
                    <SignalIcon className="w-4 h-4 text-yellow-400 animate-pulse" />
                    <span className="text-xs text-yellow-400">Connecting...</span>
                  </>
                ) : (
                  <>
                    <SignalSlashIcon className="w-4 h-4 text-red-400" />
                    <span className="text-xs text-red-400">Disconnected</span>
                  </>
                )}
              </div>

              {/* Recording Indicator */}
              {sessionId && (
                <div className="flex items-center gap-2">
                  <div className="w-2 h-2 bg-red-500 rounded-full animate-pulse" />
                  <span className="text-xs text-gray-300">Recording</span>
                </div>
              )}
            </div>

            <div className="flex items-center gap-2">
              {/* Export Button */}
              <div className="relative group">
                <button
                  className="p-1.5 rounded hover:bg-white/10 transition-colors"
                  onClick={(e) => {
                    e.stopPropagation();
                  }}
                >
                  <ArrowDownTrayIcon className="w-4 h-4 text-gray-300" />
                </button>
                <div className="absolute top-full right-0 mt-1 bg-gray-900 rounded-lg shadow-lg opacity-0 invisible group-hover:opacity-100 group-hover:visible transition-all">
                  <button
                    onClick={(e) => {
                      e.stopPropagation();
                      handleExport('srt');
                    }}
                    className="block w-full px-4 py-2 text-sm text-left text-gray-300 hover:bg-white/10"
                  >
                    Export as SRT
                  </button>
                  <button
                    onClick={(e) => {
                      e.stopPropagation();
                      handleExport('vtt');
                    }}
                    className="block w-full px-4 py-2 text-sm text-left text-gray-300 hover:bg-white/10"
                  >
                    Export as WebVTT
                  </button>
                </div>
              </div>

              {/* Settings Button */}
              <button
                className="p-1.5 rounded hover:bg-white/10 transition-colors"
                onClick={(e) => {
                  e.stopPropagation();
                  setShowSettings(!showSettings);
                }}
              >
                <Cog6ToothIcon className="w-4 h-4 text-gray-300" />
              </button>

              {/* Close Button */}
              {onClose && (
                <button
                  className="p-1.5 rounded hover:bg-white/10 transition-colors"
                  onClick={(e) => {
                    e.stopPropagation();
                    stopSession();
                    onClose();
                  }}
                >
                  <XMarkIcon className="w-4 h-4 text-gray-300" />
                </button>
              )}
            </div>
          </div>
        )}

        {/* Caption Display Area */}
        <div
          className="rounded-lg px-6 py-4 backdrop-blur-sm border transition-all duration-200"
          style={{
            backgroundColor: getBackgroundStyle(),
            borderColor: 'var(--ff-border)',
            minHeight: '80px'
          }}
          onClick={(e) => e.stopPropagation()}
        >
          <AnimatePresence mode="wait">
            {currentCaption ? (
              <motion.div
                key={currentCaption.id}
                initial={{ opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: -10 }}
                transition={{ duration: 0.3 }}
                className="space-y-2"
              >
                {/* Current Speaker */}
                {settings.showSpeakers && currentCaption.speaker && (
                  <div className="flex items-center gap-2 mb-1">
                    <MicrophoneIcon className="w-4 h-4" style={{ color: 'var(--ff-purple-500)' }} />
                    <span
                      className="text-sm font-medium"
                      style={{ color: 'var(--ff-purple-500)' }}
                    >
                      {currentCaption.speaker}
                    </span>
                    {currentCaption.confidence < 0.8 && (
                      <span className="text-xs text-yellow-400">(low confidence)</span>
                    )}
                  </div>
                )}

                {/* Caption Text */}
                <p
                  className={`${getFontSizeClass()} leading-relaxed`}
                  style={{ color: 'var(--ff-text-primary)' }}
                >
                  {currentCaption.text}
                  {!currentCaption.isFinal && (
                    <span className="ml-1 opacity-50">...</span>
                  )}
                </p>
              </motion.div>
            ) : (
              <div className="text-center py-2">
                <p className="text-sm opacity-50" style={{ color: 'var(--ff-text-muted)' }}>
                  {isConnected ? 'Waiting for speech...' : 'Connecting to caption service...'}
                </p>
              </div>
            )}
          </AnimatePresence>

          {/* Caption History (last few lines) */}
          {captionHistory.length > 0 && (
            <div className="mt-3 pt-3 border-t" style={{ borderColor: 'var(--ff-border)' }}>
              <div className="space-y-1 opacity-60">
                {captionHistory.map((text, index) => (
                  <p
                    key={index}
                    className="text-xs"
                    style={{ color: 'var(--ff-text-secondary)' }}
                  >
                    {text}
                  </p>
                ))}
              </div>
            </div>
          )}
        </div>

        {/* Reconnect Button for Errors */}
        {hasError && (
          <div className="mt-2 text-center">
            <button
              onClick={() => {
                connect();
              }}
              className="px-4 py-2 text-sm rounded-lg transition-colors"
              style={{
                backgroundColor: 'var(--ff-purple-500)',
                color: 'var(--ff-text-primary)'
              }}
            >
              Reconnect
            </button>
          </div>
        )}
      </div>

      {/* Settings Panel */}
      {showSettings && (
        <CaptionSettings
          settings={settings}
          onUpdateSettings={updateSettings}
          onClose={() => setShowSettings(false)}
        />
      )}
    </>
  );
}