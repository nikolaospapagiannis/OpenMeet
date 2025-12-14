'use client';

import React, { useState, useEffect } from 'react';
import { X, Download, Smartphone, Monitor } from 'lucide-react';

interface BeforeInstallPromptEvent extends Event {
  prompt: () => Promise<void>;
  userChoice: Promise<{ outcome: 'accepted' | 'dismissed' }>;
}

declare global {
  interface WindowEventMap {
    beforeinstallprompt: BeforeInstallPromptEvent;
  }
}

export const InstallPrompt: React.FC = () => {
  const [deferredPrompt, setDeferredPrompt] = useState<BeforeInstallPromptEvent | null>(null);
  const [showPrompt, setShowPrompt] = useState(false);
  const [isInstalled, setIsInstalled] = useState(false);
  const [installDismissed, setInstallDismissed] = useState(false);

  useEffect(() => {
    // Check if already installed
    const checkInstalled = () => {
      if (window.matchMedia('(display-mode: standalone)').matches) {
        setIsInstalled(true);
        return true;
      }

      // Check for iOS
      if ('standalone' in window.navigator && (window.navigator as any).standalone) {
        setIsInstalled(true);
        return true;
      }

      return false;
    };

    if (checkInstalled()) {
      return;
    }

    // Check if user previously dismissed
    const dismissed = localStorage.getItem('pwa-install-dismissed');
    const dismissedTime = dismissed ? parseInt(dismissed, 10) : 0;
    const daysSinceDismissed = (Date.now() - dismissedTime) / (1000 * 60 * 60 * 24);

    // Don't show if dismissed within last 7 days
    if (daysSinceDismissed < 7) {
      setInstallDismissed(true);
      return;
    }

    const handleBeforeInstallPrompt = (e: BeforeInstallPromptEvent) => {
      e.preventDefault();
      setDeferredPrompt(e);

      // Show prompt after 30 seconds on first visit
      const hasVisited = localStorage.getItem('pwa-visited');
      if (!hasVisited) {
        localStorage.setItem('pwa-visited', 'true');
        setTimeout(() => {
          setShowPrompt(true);
        }, 30000);
      } else {
        // Show after 5 seconds on subsequent visits
        setTimeout(() => {
          setShowPrompt(true);
        }, 5000);
      }
    };

    const handleAppInstalled = () => {
      setIsInstalled(true);
      setShowPrompt(false);
      setDeferredPrompt(null);
      console.log('[PWA] App successfully installed');
    };

    window.addEventListener('beforeinstallprompt', handleBeforeInstallPrompt);
    window.addEventListener('appinstalled', handleAppInstalled);

    return () => {
      window.removeEventListener('beforeinstallprompt', handleBeforeInstallPrompt);
      window.removeEventListener('appinstalled', handleAppInstalled);
    };
  }, []);

  const handleInstallClick = async () => {
    if (!deferredPrompt) {
      console.log('[PWA] No deferred prompt available');
      return;
    }

    try {
      // Show the install prompt
      await deferredPrompt.prompt();

      // Wait for user choice
      const { outcome } = await deferredPrompt.userChoice;
      console.log(`[PWA] User ${outcome} the install prompt`);

      if (outcome === 'accepted') {
        setShowPrompt(false);
      } else {
        // User dismissed, hide for 7 days
        localStorage.setItem('pwa-install-dismissed', Date.now().toString());
        setShowPrompt(false);
      }

      // Clear the deferred prompt
      setDeferredPrompt(null);
    } catch (error) {
      console.error('[PWA] Error showing install prompt:', error);
    }
  };

  const handleDismiss = () => {
    setShowPrompt(false);
    localStorage.setItem('pwa-install-dismissed', Date.now().toString());
  };

  const getDeviceType = () => {
    const userAgent = navigator.userAgent.toLowerCase();
    if (/iphone|ipad|ipod/.test(userAgent)) return 'ios';
    if (/android/.test(userAgent)) return 'android';
    return 'desktop';
  };

  const renderIOSInstructions = () => (
    <div className="space-y-3">
      <p className="text-sm text-gray-400">To install on iOS:</p>
      <ol className="text-sm space-y-2 text-gray-300">
        <li className="flex items-start">
          <span className="mr-2 text-indigo-400">1.</span>
          Tap the Share button in Safari
        </li>
        <li className="flex items-start">
          <span className="mr-2 text-indigo-400">2.</span>
          Scroll down and tap "Add to Home Screen"
        </li>
        <li className="flex items-start">
          <span className="mr-2 text-indigo-400">3.</span>
          Tap "Add" to confirm
        </li>
      </ol>
    </div>
  );

  // Don't show if already installed or dismissed recently
  if (isInstalled || installDismissed || !showPrompt) {
    return null;
  }

  const deviceType = getDeviceType();

  return (
    <div className="fixed bottom-4 right-4 z-50 max-w-sm animate-slide-up">
      <div className="bg-gray-800 border border-gray-700 rounded-lg shadow-lg p-4">
        <div className="flex items-start justify-between mb-3">
          <div className="flex items-center space-x-3">
            <div className="p-2 bg-indigo-500/20 rounded-lg">
              {deviceType === 'desktop' ? (
                <Monitor className="w-5 h-5 text-indigo-400" />
              ) : (
                <Smartphone className="w-5 h-5 text-indigo-400" />
              )}
            </div>
            <h3 className="text-white font-semibold">Install OpenMeet</h3>
          </div>
          <button
            onClick={handleDismiss}
            className="text-gray-400 hover:text-white transition-colors"
            aria-label="Dismiss install prompt"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        <p className="text-sm text-gray-400 mb-4">
          Get quick access and offline support by installing our app
        </p>

        {deviceType === 'ios' ? (
          renderIOSInstructions()
        ) : (
          <>
            <div className="grid grid-cols-2 gap-2 mb-4 text-sm">
              <div className="flex items-center text-gray-300">
                <span className="w-2 h-2 bg-green-400 rounded-full mr-2" />
                Offline access
              </div>
              <div className="flex items-center text-gray-300">
                <span className="w-2 h-2 bg-green-400 rounded-full mr-2" />
                Push notifications
              </div>
              <div className="flex items-center text-gray-300">
                <span className="w-2 h-2 bg-green-400 rounded-full mr-2" />
                Quick launch
              </div>
              <div className="flex items-center text-gray-300">
                <span className="w-2 h-2 bg-green-400 rounded-full mr-2" />
                Native feel
              </div>
            </div>

            {deferredPrompt && (
              <div className="flex space-x-2">
                <button
                  onClick={handleInstallClick}
                  className="flex-1 flex items-center justify-center px-4 py-2 bg-indigo-600 hover:bg-indigo-700 text-white rounded-lg transition-colors"
                >
                  <Download className="w-4 h-4 mr-2" />
                  Install Now
                </button>
                <button
                  onClick={handleDismiss}
                  className="px-4 py-2 text-gray-400 hover:text-white transition-colors"
                >
                  Maybe Later
                </button>
              </div>
            )}
          </>
        )}
      </div>
    </div>
  );
};

export default InstallPrompt;