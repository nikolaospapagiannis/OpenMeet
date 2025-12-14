'use client';

import React, { useState, useEffect } from 'react';
import { Bell, BellOff, Check, X, AlertCircle, Settings } from 'lucide-react';

interface PushSubscription {
  endpoint: string;
  keys: {
    p256dh: string;
    auth: string;
  };
}

export const PushNotificationSetup: React.FC = () => {
  const [permission, setPermission] = useState<NotificationPermission>('default');
  const [isSubscribed, setIsSubscribed] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [showSetup, setShowSetup] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [serviceWorkerReady, setServiceWorkerReady] = useState(false);

  useEffect(() => {
    checkNotificationStatus();
    checkServiceWorker();
  }, []);

  const checkServiceWorker = async () => {
    if ('serviceWorker' in navigator && 'PushManager' in window) {
      try {
        const registration = await navigator.serviceWorker.ready;
        setServiceWorkerReady(!!registration);
      } catch (error) {
        console.error('[Push] Service worker not ready:', error);
        setServiceWorkerReady(false);
      }
    }
  };

  const checkNotificationStatus = async () => {
    // Check if notifications are supported
    if (!('Notification' in window)) {
      setError('Notifications are not supported in this browser');
      return;
    }

    // Check current permission status
    const currentPermission = Notification.permission;
    setPermission(currentPermission);

    // Check if already subscribed
    if ('serviceWorker' in navigator && currentPermission === 'granted') {
      try {
        const registration = await navigator.serviceWorker.ready;
        const subscription = await registration.pushManager.getSubscription();
        setIsSubscribed(!!subscription);
      } catch (error) {
        console.error('[Push] Error checking subscription:', error);
      }
    }

    // Show setup prompt if not set up yet and hasn't been dismissed
    const setupDismissed = localStorage.getItem('push-setup-dismissed');
    if (currentPermission === 'default' && !setupDismissed) {
      setTimeout(() => setShowSetup(true), 10000); // Show after 10 seconds
    }
  };

  const urlBase64ToUint8Array = (base64String: string): Uint8Array => {
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
  };

  const subscribeToPush = async () => {
    setIsLoading(true);
    setError(null);

    try {
      // Request notification permission
      const permission = await Notification.permission;

      if (permission === 'denied') {
        setError('Notification permission denied. Please enable it in browser settings.');
        setPermission('denied');
        return;
      }

      if (permission === 'default') {
        const newPermission = await Notification.requestPermission();
        setPermission(newPermission);

        if (newPermission !== 'granted') {
          setError('Notification permission not granted');
          return;
        }
      }

      // Get service worker registration
      const registration = await navigator.serviceWorker.ready;

      // Subscribe to push notifications
      // In production, replace with your actual VAPID public key
      const vapidPublicKey = 'BKd0FOnmkngVtRPCurCnmEH-98xTCmCKfNNR1MYLjKGLNmZxIDVmLpvJyRmFntVPCg5TmFPFqZ0Xz_NJsj6qjN4';
      const convertedVapidKey = urlBase64ToUint8Array(vapidPublicKey);

      const subscription = await registration.pushManager.subscribe({
        userVisibleOnly: true,
        applicationServerKey: convertedVapidKey
      });

      // Send subscription to backend
      const subscriptionData: PushSubscription = {
        endpoint: subscription.endpoint,
        keys: {
          p256dh: btoa(String.fromCharCode(...new Uint8Array(subscription.getKey('p256dh')!))),
          auth: btoa(String.fromCharCode(...new Uint8Array(subscription.getKey('auth')!)))
        }
      };

      const response = await fetch('/api/notifications/subscribe', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json'
        },
        body: JSON.stringify(subscriptionData)
      });

      if (!response.ok) {
        throw new Error('Failed to save subscription on server');
      }

      setIsSubscribed(true);
      setPermission('granted');
      setShowSetup(false);

      // Show test notification
      new Notification('OpenMeet', {
        body: 'Push notifications enabled successfully!',
        icon: '/icon-192x192.png',
        badge: '/icon-72x72.png'
      });

    } catch (error) {
      console.error('[Push] Subscription error:', error);
      setError(error instanceof Error ? error.message : 'Failed to enable notifications');
    } finally {
      setIsLoading(false);
    }
  };

  const unsubscribeFromPush = async () => {
    setIsLoading(true);
    setError(null);

    try {
      const registration = await navigator.serviceWorker.ready;
      const subscription = await registration.pushManager.getSubscription();

      if (subscription) {
        await subscription.unsubscribe();

        // Notify backend
        await fetch('/api/notifications/unsubscribe', {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json'
          },
          body: JSON.stringify({
            endpoint: subscription.endpoint
          })
        });
      }

      setIsSubscribed(false);
    } catch (error) {
      console.error('[Push] Unsubscribe error:', error);
      setError('Failed to unsubscribe from notifications');
    } finally {
      setIsLoading(false);
    }
  };

  const handleDismiss = () => {
    setShowSetup(false);
    localStorage.setItem('push-setup-dismissed', Date.now().toString());
  };

  const handleOpenSettings = () => {
    if ('Notification' in window && Notification.permission === 'denied') {
      alert('Please enable notifications in your browser settings:\n\n1. Click the lock/info icon in the address bar\n2. Find "Notifications"\n3. Change to "Allow"');
    }
  };

  // Setup prompt for first-time users
  if (showSetup && permission === 'default' && !isSubscribed && serviceWorkerReady) {
    return (
      <div className="fixed bottom-4 left-4 z-50 max-w-sm animate-slide-up">
        <div className="bg-gray-800 border border-gray-700 rounded-lg shadow-lg p-4">
          <div className="flex items-start justify-between mb-3">
            <div className="flex items-center space-x-3">
              <div className="p-2 bg-indigo-500/20 rounded-lg">
                <Bell className="w-5 h-5 text-indigo-400" />
              </div>
              <h3 className="text-white font-semibold">Enable Notifications</h3>
            </div>
            <button
              onClick={handleDismiss}
              className="text-gray-400 hover:text-white transition-colors"
            >
              <X className="w-4 h-4" />
            </button>
          </div>

          <p className="text-sm text-gray-400 mb-4">
            Stay updated with meeting reminders, important alerts, and team notifications
          </p>

          <div className="space-y-2 mb-4">
            <div className="flex items-center text-sm text-gray-300">
              <Check className="w-4 h-4 text-green-400 mr-2" />
              Meeting reminders
            </div>
            <div className="flex items-center text-sm text-gray-300">
              <Check className="w-4 h-4 text-green-400 mr-2" />
              Action item alerts
            </div>
            <div className="flex items-center text-sm text-gray-300">
              <Check className="w-4 h-4 text-green-400 mr-2" />
              Team mentions
            </div>
          </div>

          <div className="flex space-x-2">
            <button
              onClick={subscribeToPush}
              disabled={isLoading}
              className="flex-1 flex items-center justify-center px-4 py-2 bg-indigo-600 hover:bg-indigo-700 disabled:opacity-50 disabled:cursor-not-allowed text-white rounded-lg transition-colors"
            >
              {isLoading ? (
                <div className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" />
              ) : (
                <>
                  <Bell className="w-4 h-4 mr-2" />
                  Enable
                </>
              )}
            </button>
            <button
              onClick={handleDismiss}
              className="px-4 py-2 text-gray-400 hover:text-white transition-colors"
            >
              Not Now
            </button>
          </div>

          {error && (
            <div className="mt-3 p-2 bg-red-900/50 border border-red-800 rounded-lg">
              <p className="text-xs text-red-400">{error}</p>
            </div>
          )}
        </div>
      </div>
    );
  }

  return null;
};

// Settings component for notification preferences
export const NotificationSettings: React.FC = () => {
  const [permission, setPermission] = useState<NotificationPermission>('default');
  const [isSubscribed, setIsSubscribed] = useState(false);
  const [isLoading, setIsLoading] = useState(false);

  useEffect(() => {
    checkStatus();
  }, []);

  const checkStatus = async () => {
    if ('Notification' in window) {
      setPermission(Notification.permission);

      if ('serviceWorker' in navigator) {
        const registration = await navigator.serviceWorker.ready;
        const subscription = await registration.pushManager.getSubscription();
        setIsSubscribed(!!subscription);
      }
    }
  };

  const toggleNotifications = async () => {
    setIsLoading(true);

    if (isSubscribed) {
      // Unsubscribe logic
      try {
        const registration = await navigator.serviceWorker.ready;
        const subscription = await registration.pushManager.getSubscription();
        if (subscription) {
          await subscription.unsubscribe();
          setIsSubscribed(false);
        }
      } catch (error) {
        console.error('[Push] Error unsubscribing:', error);
      }
    } else {
      // Subscribe logic (similar to subscribeToPush above)
      // ... implement subscription logic
    }

    setIsLoading(false);
  };

  return (
    <div className="bg-gray-800 rounded-lg p-6">
      <div className="flex items-center justify-between mb-4">
        <div>
          <h3 className="text-lg font-semibold text-white">Push Notifications</h3>
          <p className="text-sm text-gray-400 mt-1">
            Receive notifications for meetings, mentions, and important updates
          </p>
        </div>
        <button
          onClick={toggleNotifications}
          disabled={isLoading || permission === 'denied'}
          className={`relative inline-flex h-6 w-11 items-center rounded-full transition-colors ${
            isSubscribed ? 'bg-indigo-600' : 'bg-gray-600'
          } disabled:opacity-50 disabled:cursor-not-allowed`}
        >
          <span
            className={`inline-block h-4 w-4 transform rounded-full bg-white transition-transform ${
              isSubscribed ? 'translate-x-6' : 'translate-x-1'
            }`}
          />
        </button>
      </div>

      {permission === 'denied' && (
        <div className="flex items-start space-x-2 p-3 bg-yellow-900/20 border border-yellow-800 rounded-lg">
          <AlertCircle className="w-5 h-5 text-yellow-500 mt-0.5" />
          <div className="flex-1">
            <p className="text-sm text-yellow-400">
              Notifications are blocked in your browser settings
            </p>
            <button className="text-xs text-yellow-500 hover:text-yellow-400 mt-1">
              Learn how to enable →
            </button>
          </div>
        </div>
      )}
    </div>
  );
};

export default PushNotificationSetup;