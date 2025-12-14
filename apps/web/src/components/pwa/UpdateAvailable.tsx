'use client';

import React, { useState, useEffect } from 'react';
import { RefreshCw, Download, AlertCircle, Check, X } from 'lucide-react';

interface UpdateInfo {
  hasUpdate: boolean;
  version?: string;
  size?: string;
  changes?: string[];
}

export const UpdateAvailable: React.FC = () => {
  const [updateInfo, setUpdateInfo] = useState<UpdateInfo>({ hasUpdate: false });
  const [showBanner, setShowBanner] = useState(false);
  const [isUpdating, setIsUpdating] = useState(false);
  const [updateComplete, setUpdateComplete] = useState(false);
  const [serviceWorkerReg, setServiceWorkerReg] = useState<ServiceWorkerRegistration | null>(null);

  useEffect(() => {
    if (!('serviceWorker' in navigator)) {
      return;
    }

    let refreshing = false;

    // Listen for controller change (new service worker activated)
    navigator.serviceWorker.addEventListener('controllerchange', () => {
      if (refreshing) return;
      refreshing = true;
      window.location.reload();
    });

    const checkForUpdates = async () => {
      try {
        const registration = await navigator.serviceWorker.ready;
        setServiceWorkerReg(registration);

        // Check for updates periodically
        registration.addEventListener('updatefound', () => {
          const installingWorker = registration.installing;
          if (!installingWorker) return;

          installingWorker.addEventListener('statechange', () => {
            if (installingWorker.state === 'installed') {
              if (navigator.serviceWorker.controller) {
                // New update available
                console.log('[PWA] New update available');
                setUpdateInfo({
                  hasUpdate: true,
                  version: '1.0.1', // In production, fetch from API
                  size: '2.3 MB',
                  changes: [
                    'Performance improvements',
                    'Bug fixes',
                    'New offline capabilities'
                  ]
                });
                setShowBanner(true);
              } else {
                // First install
                console.log('[PWA] Content cached for offline use');
              }
            }
          });
        });

        // Check for updates every 30 minutes
        setInterval(() => {
          registration.update();
        }, 30 * 60 * 1000);

        // Initial update check
        registration.update();
      } catch (error) {
        console.error('[PWA] Error setting up update detection:', error);
      }
    };

    checkForUpdates();

    // Check on visibility change (when user returns to tab)
    document.addEventListener('visibilitychange', () => {
      if (!document.hidden && serviceWorkerReg) {
        serviceWorkerReg.update();
      }
    });

    return () => {
      // Cleanup if needed
    };
  }, [serviceWorkerReg]);

  const handleUpdate = async () => {
    setIsUpdating(true);

    try {
      if (!serviceWorkerReg || !serviceWorkerReg.waiting) {
        // Try to get fresh registration
        const registration = await navigator.serviceWorker.ready;
        if (!registration.waiting) {
          console.log('[PWA] No waiting service worker found');
          setIsUpdating(false);
          return;
        }
      }

      // Tell the waiting service worker to activate
      if (serviceWorkerReg?.waiting) {
        serviceWorkerReg.waiting.postMessage({ type: 'SKIP_WAITING' });
      }

      setUpdateComplete(true);

      // Reload after a short delay to show success state
      setTimeout(() => {
        window.location.reload();
      }, 1500);
    } catch (error) {
      console.error('[PWA] Error applying update:', error);
      setIsUpdating(false);
    }
  };

  const handleDismiss = () => {
    setShowBanner(false);
    // Show again after 1 hour if update is still available
    setTimeout(() => {
      if (updateInfo.hasUpdate) {
        setShowBanner(true);
      }
    }, 60 * 60 * 1000);
  };

  const handleScheduleUpdate = () => {
    setShowBanner(false);

    // Schedule update for next page load
    if (serviceWorkerReg?.waiting) {
      localStorage.setItem('pwa-update-pending', 'true');
    }
  };

  // Check for pending update on load
  useEffect(() => {
    const pendingUpdate = localStorage.getItem('pwa-update-pending');
    if (pendingUpdate && serviceWorkerReg?.waiting) {
      localStorage.removeItem('pwa-update-pending');
      handleUpdate();
    }
  }, [serviceWorkerReg]);

  if (!showBanner || !updateInfo.hasUpdate) {
    return null;
  }

  return (
    <div className="fixed bottom-4 left-1/2 transform -translate-x-1/2 z-50 max-w-lg w-full px-4">
      <div className="bg-gradient-to-r from-indigo-900 to-purple-900 border border-indigo-700 rounded-lg shadow-xl overflow-hidden">
        {!updateComplete ? (
          <>
            <div className="p-4">
              <div className="flex items-start justify-between mb-3">
                <div className="flex items-center space-x-3">
                  <div className="p-2 bg-white/10 rounded-lg">
                    <Download className="w-5 h-5 text-white" />
                  </div>
                  <div>
                    <h3 className="text-white font-semibold">Update Available</h3>
                    {updateInfo.version && (
                      <p className="text-indigo-200 text-xs">
                        Version {updateInfo.version} • {updateInfo.size}
                      </p>
                    )}
                  </div>
                </div>
                <button
                  onClick={handleDismiss}
                  className="text-indigo-300 hover:text-white transition-colors"
                >
                  <X className="w-5 h-5" />
                </button>
              </div>

              {updateInfo.changes && updateInfo.changes.length > 0 && (
                <div className="mb-4">
                  <p className="text-xs text-indigo-300 mb-2">What's new:</p>
                  <ul className="space-y-1">
                    {updateInfo.changes.map((change, index) => (
                      <li key={index} className="flex items-start text-sm text-indigo-100">
                        <span className="text-indigo-400 mr-2">•</span>
                        {change}
                      </li>
                    ))}
                  </ul>
                </div>
              )}

              <div className="flex space-x-2">
                <button
                  onClick={handleUpdate}
                  disabled={isUpdating}
                  className="flex-1 flex items-center justify-center px-4 py-2 bg-white/20 hover:bg-white/30 disabled:opacity-50 disabled:cursor-not-allowed text-white rounded-lg transition-colors backdrop-blur-sm"
                >
                  {isUpdating ? (
                    <>
                      <RefreshCw className="w-4 h-4 mr-2 animate-spin" />
                      Updating...
                    </>
                  ) : (
                    <>
                      <RefreshCw className="w-4 h-4 mr-2" />
                      Update Now
                    </>
                  )}
                </button>
                <button
                  onClick={handleScheduleUpdate}
                  className="px-4 py-2 text-indigo-200 hover:text-white transition-colors"
                >
                  Later
                </button>
              </div>
            </div>

            <div className="bg-indigo-950/50 px-4 py-2 border-t border-indigo-800">
              <div className="flex items-center space-x-2">
                <AlertCircle className="w-4 h-4 text-indigo-400" />
                <p className="text-xs text-indigo-300">
                  The app will refresh to apply updates
                </p>
              </div>
            </div>
          </>
        ) : (
          <div className="p-6 text-center">
            <div className="flex justify-center mb-3">
              <div className="p-3 bg-green-500/20 rounded-full">
                <Check className="w-8 h-8 text-green-400" />
              </div>
            </div>
            <h3 className="text-white font-semibold mb-1">Update Complete!</h3>
            <p className="text-indigo-200 text-sm">Refreshing application...</p>
          </div>
        )}
      </div>
    </div>
  );
};

// Companion component for showing update status in settings
export const UpdateStatus: React.FC = () => {
  const [lastChecked, setLastChecked] = useState<Date | null>(null);
  const [isChecking, setIsChecking] = useState(false);

  const checkForUpdates = async () => {
    setIsChecking(true);

    try {
      if ('serviceWorker' in navigator) {
        const registration = await navigator.serviceWorker.ready;
        await registration.update();
        setLastChecked(new Date());
      }
    } catch (error) {
      console.error('[PWA] Error checking for updates:', error);
    } finally {
      setIsChecking(false);
    }
  };

  return (
    <div className="bg-gray-800 rounded-lg p-6">
      <div className="flex items-center justify-between">
        <div>
          <h3 className="text-lg font-semibold text-white">App Updates</h3>
          <p className="text-sm text-gray-400 mt-1">
            Automatic updates keep your app secure and up-to-date
          </p>
          {lastChecked && (
            <p className="text-xs text-gray-500 mt-2">
              Last checked: {lastChecked.toLocaleTimeString()}
            </p>
          )}
        </div>

        <button
          onClick={checkForUpdates}
          disabled={isChecking}
          className="flex items-center px-4 py-2 bg-gray-700 hover:bg-gray-600 disabled:opacity-50 disabled:cursor-not-allowed text-white rounded-lg transition-colors"
        >
          <RefreshCw className={`w-4 h-4 mr-2 ${isChecking ? 'animate-spin' : ''}`} />
          {isChecking ? 'Checking...' : 'Check Now'}
        </button>
      </div>
    </div>
  );
};

export default UpdateAvailable;