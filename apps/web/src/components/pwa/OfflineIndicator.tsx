'use client';

import React, { useState, useEffect } from 'react';
import { WifiOff, Wifi, AlertCircle, RefreshCw } from 'lucide-react';

export const OfflineIndicator: React.FC = () => {
  const [isOnline, setIsOnline] = useState(true);
  const [wasOffline, setWasOffline] = useState(false);
  const [showReconnected, setShowReconnected] = useState(false);
  const [retryCount, setRetryCount] = useState(0);
  const [isRetrying, setIsRetrying] = useState(false);

  useEffect(() => {
    // Check initial online status
    setIsOnline(navigator.onLine);

    const handleOnline = () => {
      console.log('[PWA] Connection restored');
      setIsOnline(true);

      if (wasOffline) {
        setShowReconnected(true);
        setRetryCount(0);
        setIsRetrying(false);

        // Auto-hide the reconnected message after 5 seconds
        setTimeout(() => {
          setShowReconnected(false);
          setWasOffline(false);
        }, 5000);

        // Trigger data sync when coming back online
        if ('serviceWorker' in navigator && navigator.serviceWorker.controller) {
          navigator.serviceWorker.controller.postMessage({
            type: 'SYNC_DATA'
          });
        }
      }
    };

    const handleOffline = () => {
      console.log('[PWA] Connection lost');
      setIsOnline(false);
      setWasOffline(true);
      setShowReconnected(false);
    };

    // Add event listeners
    window.addEventListener('online', handleOnline);
    window.addEventListener('offline', handleOffline);

    // Periodic connection check
    const intervalId = setInterval(() => {
      const currentlyOnline = navigator.onLine;

      if (currentlyOnline !== isOnline) {
        if (currentlyOnline) {
          handleOnline();
        } else {
          handleOffline();
        }
      }

      // Additional connectivity check using fetch
      if (!currentlyOnline) {
        checkConnectivity();
      }
    }, 5000);

    return () => {
      window.removeEventListener('online', handleOnline);
      window.removeEventListener('offline', handleOffline);
      clearInterval(intervalId);
    };
  }, [isOnline, wasOffline]);

  const checkConnectivity = async () => {
    try {
      const response = await fetch('/api/health', {
        method: 'HEAD',
        cache: 'no-cache'
      });

      if (response.ok) {
        setIsOnline(true);
        if (wasOffline) {
          setShowReconnected(true);
          setTimeout(() => {
            setShowReconnected(false);
            setWasOffline(false);
          }, 5000);
        }
      }
    } catch (error) {
      // Still offline
      console.log('[PWA] Connectivity check failed');
    }
  };

  const handleRetry = async () => {
    setIsRetrying(true);
    setRetryCount(prev => prev + 1);

    try {
      await checkConnectivity();
    } finally {
      setIsRetrying(false);
    }
  };

  // Show offline indicator
  if (!isOnline) {
    return (
      <div className="fixed top-0 left-0 right-0 z-50 animate-slide-down">
        <div className="bg-red-900/95 backdrop-blur-sm border-b border-red-800">
          <div className="max-w-7xl mx-auto px-4 py-3">
            <div className="flex items-center justify-between">
              <div className="flex items-center space-x-3">
                <div className="animate-pulse">
                  <WifiOff className="w-5 h-5 text-red-400" />
                </div>
                <div>
                  <p className="text-white font-medium text-sm">
                    You're currently offline
                  </p>
                  <p className="text-red-200 text-xs">
                    Some features may be limited. Your data will sync when connection is restored.
                  </p>
                </div>
              </div>

              <button
                onClick={handleRetry}
                disabled={isRetrying}
                className="flex items-center px-3 py-1.5 text-xs bg-red-800 hover:bg-red-700 disabled:opacity-50 disabled:cursor-not-allowed text-white rounded-lg transition-colors"
              >
                <RefreshCw className={`w-3.5 h-3.5 mr-1.5 ${isRetrying ? 'animate-spin' : ''}`} />
                {isRetrying ? 'Retrying...' : `Retry${retryCount > 0 ? ` (${retryCount})` : ''}`}
              </button>
            </div>
          </div>
        </div>
      </div>
    );
  }

  // Show reconnected message
  if (showReconnected && isOnline) {
    return (
      <div className="fixed top-0 left-0 right-0 z-50 animate-slide-down">
        <div className="bg-green-900/95 backdrop-blur-sm border-b border-green-800">
          <div className="max-w-7xl mx-auto px-4 py-3">
            <div className="flex items-center justify-between">
              <div className="flex items-center space-x-3">
                <Wifi className="w-5 h-5 text-green-400" />
                <div>
                  <p className="text-white font-medium text-sm">
                    Back online!
                  </p>
                  <p className="text-green-200 text-xs">
                    Your connection has been restored. Syncing data...
                  </p>
                </div>
              </div>

              <button
                onClick={() => setShowReconnected(false)}
                className="text-green-300 hover:text-white transition-colors"
              >
                <span className="text-xs">Dismiss</span>
              </button>
            </div>
          </div>
        </div>
      </div>
    );
  }

  return null;
};

// Companion component for showing offline status in specific areas
export const OfflineStatus: React.FC<{ className?: string }> = ({ className = '' }) => {
  const [isOnline, setIsOnline] = useState(true);

  useEffect(() => {
    const updateStatus = () => setIsOnline(navigator.onLine);

    updateStatus();

    window.addEventListener('online', updateStatus);
    window.addEventListener('offline', updateStatus);

    return () => {
      window.removeEventListener('online', updateStatus);
      window.removeEventListener('offline', updateStatus);
    };
  }, []);

  if (isOnline) return null;

  return (
    <div className={`flex items-center space-x-2 text-yellow-500 ${className}`}>
      <AlertCircle className="w-4 h-4" />
      <span className="text-sm">Offline Mode</span>
    </div>
  );
};

export default OfflineIndicator;