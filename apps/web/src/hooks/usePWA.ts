'use client';

import { useState, useEffect, useCallback, useRef } from 'react';

interface PWAStatus {
  isInstalled: boolean;
  isInstallable: boolean;
  isOnline: boolean;
  isUpdateAvailable: boolean;
  isStandalone: boolean;
  serviceWorkerStatus: 'unsupported' | 'unregistered' | 'installing' | 'installed' | 'activated' | 'error';
  platform: 'ios' | 'android' | 'desktop' | 'unknown';
}

interface BeforeInstallPromptEvent extends Event {
  prompt: () => Promise<void>;
  userChoice: Promise<{ outcome: 'accepted' | 'dismissed' }>;
}

declare global {
  interface WindowEventMap {
    beforeinstallprompt: BeforeInstallPromptEvent;
  }
}

export const usePWA = () => {
  const [pwaStatus, setPwaStatus] = useState<PWAStatus>({
    isInstalled: false,
    isInstallable: false,
    isOnline: true,
    isUpdateAvailable: false,
    isStandalone: false,
    serviceWorkerStatus: 'unsupported',
    platform: 'unknown'
  });

  const [deferredPrompt, setDeferredPrompt] = useState<BeforeInstallPromptEvent | null>(null);
  const [installError, setInstallError] = useState<string | null>(null);
  const serviceWorkerRef = useRef<ServiceWorkerRegistration | null>(null);

  // Detect platform
  const detectPlatform = useCallback((): PWAStatus['platform'] => {
    const userAgent = navigator.userAgent.toLowerCase();
    if (/iphone|ipad|ipod/.test(userAgent)) return 'ios';
    if (/android/.test(userAgent)) return 'android';
    return 'desktop';
  }, []);

  // Check if app is installed
  const checkInstalled = useCallback((): boolean => {
    // Check for standalone mode
    if (window.matchMedia('(display-mode: standalone)').matches) {
      return true;
    }

    // Check for iOS standalone
    if ('standalone' in window.navigator && (window.navigator as any).standalone) {
      return true;
    }

    // Check for desktop PWA
    if (window.matchMedia('(display-mode: window-controls-overlay)').matches) {
      return true;
    }

    return false;
  }, []);

  // Check if running in standalone mode
  const checkStandalone = useCallback((): boolean => {
    return (
      window.matchMedia('(display-mode: standalone)').matches ||
      window.matchMedia('(display-mode: fullscreen)').matches ||
      window.matchMedia('(display-mode: minimal-ui)').matches ||
      ('standalone' in window.navigator && (window.navigator as any).standalone)
    );
  }, []);

  // Initialize PWA status
  useEffect(() => {
    const updateStatus = () => {
      setPwaStatus(prev => ({
        ...prev,
        isOnline: navigator.onLine,
        isInstalled: checkInstalled(),
        isStandalone: checkStandalone(),
        platform: detectPlatform()
      }));
    };

    updateStatus();

    // Listen for online/offline events
    window.addEventListener('online', updateStatus);
    window.addEventListener('offline', updateStatus);

    // Listen for install prompt
    const handleBeforeInstallPrompt = (e: BeforeInstallPromptEvent) => {
      e.preventDefault();
      setDeferredPrompt(e);
      setPwaStatus(prev => ({ ...prev, isInstallable: true }));
    };

    // Listen for app installed
    const handleAppInstalled = () => {
      setPwaStatus(prev => ({
        ...prev,
        isInstalled: true,
        isInstallable: false
      }));
      setDeferredPrompt(null);
    };

    window.addEventListener('beforeinstallprompt', handleBeforeInstallPrompt);
    window.addEventListener('appinstalled', handleAppInstalled);

    // Setup service worker
    if ('serviceWorker' in navigator) {
      setupServiceWorker();
    } else {
      setPwaStatus(prev => ({ ...prev, serviceWorkerStatus: 'unsupported' }));
    }

    return () => {
      window.removeEventListener('online', updateStatus);
      window.removeEventListener('offline', updateStatus);
      window.removeEventListener('beforeinstallprompt', handleBeforeInstallPrompt);
      window.removeEventListener('appinstalled', handleAppInstalled);
    };
  }, [checkInstalled, checkStandalone, detectPlatform]);

  // Setup service worker
  const setupServiceWorker = async () => {
    try {
      setPwaStatus(prev => ({ ...prev, serviceWorkerStatus: 'installing' }));

      const registration = await navigator.serviceWorker.register('/sw.js', {
        scope: '/'
      });

      serviceWorkerRef.current = registration;

      if (registration.installing) {
        setPwaStatus(prev => ({ ...prev, serviceWorkerStatus: 'installing' }));
      } else if (registration.waiting) {
        setPwaStatus(prev => ({
          ...prev,
          serviceWorkerStatus: 'installed',
          isUpdateAvailable: true
        }));
      } else if (registration.active) {
        setPwaStatus(prev => ({ ...prev, serviceWorkerStatus: 'activated' }));
      }

      // Listen for updates
      registration.addEventListener('updatefound', () => {
        const installingWorker = registration.installing;
        if (!installingWorker) return;

        installingWorker.addEventListener('statechange', () => {
          if (installingWorker.state === 'installed') {
            if (navigator.serviceWorker.controller) {
              setPwaStatus(prev => ({ ...prev, isUpdateAvailable: true }));
            }
          }
        });
      });

      // Check for updates periodically
      setInterval(() => {
        registration.update();
      }, 60 * 60 * 1000); // Every hour

    } catch (error) {
      console.error('[PWA] Service worker registration failed:', error);
      setPwaStatus(prev => ({ ...prev, serviceWorkerStatus: 'error' }));
    }
  };

  // Install PWA
  const installPWA = useCallback(async () => {
    if (!deferredPrompt) {
      setInstallError('Install prompt not available');
      return false;
    }

    try {
      // Show the install prompt
      await deferredPrompt.prompt();

      // Wait for user choice
      const { outcome } = await deferredPrompt.userChoice;

      if (outcome === 'accepted') {
        console.log('[PWA] User accepted the install prompt');
        setDeferredPrompt(null);
        return true;
      } else {
        console.log('[PWA] User dismissed the install prompt');
        setDeferredPrompt(null);
        return false;
      }
    } catch (error) {
      console.error('[PWA] Error showing install prompt:', error);
      setInstallError(error instanceof Error ? error.message : 'Installation failed');
      return false;
    }
  }, [deferredPrompt]);

  // Update PWA
  const updatePWA = useCallback(async () => {
    if (!serviceWorkerRef.current?.waiting) {
      console.log('[PWA] No update available');
      return false;
    }

    try {
      // Tell waiting service worker to activate
      serviceWorkerRef.current.waiting.postMessage({ type: 'SKIP_WAITING' });

      // Listen for controller change
      await new Promise<void>((resolve) => {
        const onControllerChange = () => {
          window.location.reload();
          resolve();
        };
        navigator.serviceWorker.addEventListener('controllerchange', onControllerChange);
      });

      return true;
    } catch (error) {
      console.error('[PWA] Error updating PWA:', error);
      return false;
    }
  }, []);

  // Check for updates manually
  const checkForUpdates = useCallback(async () => {
    if (!serviceWorkerRef.current) {
      console.log('[PWA] Service worker not registered');
      return false;
    }

    try {
      await serviceWorkerRef.current.update();
      return true;
    } catch (error) {
      console.error('[PWA] Error checking for updates:', error);
      return false;
    }
  }, []);

  // Get install instructions based on platform
  const getInstallInstructions = useCallback(() => {
    switch (pwaStatus.platform) {
      case 'ios':
        return {
          title: 'Install on iOS',
          steps: [
            'Tap the Share button in Safari',
            'Scroll down and tap "Add to Home Screen"',
            'Tap "Add" to confirm'
          ]
        };
      case 'android':
        return {
          title: 'Install on Android',
          steps: [
            'Tap the menu button (three dots)',
            'Tap "Install App" or "Add to Home screen"',
            'Follow the prompts to install'
          ]
        };
      case 'desktop':
        return {
          title: 'Install on Desktop',
          steps: [
            'Click the install icon in the address bar',
            'Or use the browser menu to install',
            'Follow the prompts to complete installation'
          ]
        };
      default:
        return {
          title: 'Install App',
          steps: ['Follow your browser prompts to install this app']
        };
    }
  }, [pwaStatus.platform]);

  // Subscribe to push notifications
  const subscribeToPush = useCallback(async (vapidPublicKey: string) => {
    try {
      // Check permission
      const permission = await Notification.requestPermission();
      if (permission !== 'granted') {
        throw new Error('Notification permission denied');
      }

      // Get service worker registration
      const registration = serviceWorkerRef.current || await navigator.serviceWorker.ready;

      // Convert VAPID key
      const convertedVapidKey = urlBase64ToUint8Array(vapidPublicKey);

      // Subscribe
      const subscription = await registration.pushManager.subscribe({
        userVisibleOnly: true,
        applicationServerKey: convertedVapidKey.buffer.slice(0) as ArrayBuffer
      });

      return subscription;
    } catch (error) {
      console.error('[PWA] Error subscribing to push:', error);
      throw error;
    }
  }, []);

  // Unsubscribe from push notifications
  const unsubscribeFromPush = useCallback(async () => {
    try {
      const registration = serviceWorkerRef.current || await navigator.serviceWorker.ready;
      const subscription = await registration.pushManager.getSubscription();

      if (subscription) {
        await subscription.unsubscribe();
        return true;
      }

      return false;
    } catch (error) {
      console.error('[PWA] Error unsubscribing from push:', error);
      throw error;
    }
  }, []);

  // Cache management
  const clearCache = useCallback(async (cacheName?: string) => {
    try {
      if (cacheName) {
        await caches.delete(cacheName);
      } else {
        const cacheNames = await caches.keys();
        await Promise.all(cacheNames.map(name => caches.delete(name)));
      }
      return true;
    } catch (error) {
      console.error('[PWA] Error clearing cache:', error);
      return false;
    }
  }, []);

  const getCacheSize = useCallback(async (): Promise<number> => {
    try {
      if ('storage' in navigator && 'estimate' in navigator.storage) {
        const estimate = await navigator.storage.estimate();
        return estimate.usage || 0;
      }
      return 0;
    } catch (error) {
      console.error('[PWA] Error getting cache size:', error);
      return 0;
    }
  }, []);

  return {
    ...pwaStatus,
    deferredPrompt,
    installError,
    installPWA,
    updatePWA,
    checkForUpdates,
    getInstallInstructions,
    subscribeToPush,
    unsubscribeFromPush,
    clearCache,
    getCacheSize
  };
};

// Helper function to convert VAPID key
function urlBase64ToUint8Array(base64String: string): Uint8Array {
  const padding = '='.repeat((4 - base64String.length % 4) % 4);
  const base64 = (base64String + padding)
    .replace(/-/g, '+')
    .replace(/_/g, '/');

  const rawData = window.atob(base64);
  const outputArray = new Uint8Array(rawData.length);

  for (let i = 0; i < rawData.length; ++i) {
    outputArray[i] = rawData.charCodeAt(i);
  }
  return outputArray;
}

export default usePWA;