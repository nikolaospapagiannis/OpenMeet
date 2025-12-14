'use client';

import React, { ReactNode, useEffect } from 'react';
import { InstallPrompt } from './InstallPrompt';
import { OfflineIndicator } from './OfflineIndicator';
import { PushNotificationSetup } from './PushNotificationSetup';
import { UpdateAvailable } from './UpdateAvailable';

interface PWAProviderProps {
  children: ReactNode;
  enableInstallPrompt?: boolean;
  enableOfflineIndicator?: boolean;
  enablePushNotifications?: boolean;
  enableUpdateNotification?: boolean;
  vapidPublicKey?: string;
}

export const PWAProvider: React.FC<PWAProviderProps> = ({
  children,
  enableInstallPrompt = true,
  enableOfflineIndicator = true,
  enablePushNotifications = true,
  enableUpdateNotification = true,
  vapidPublicKey
}) => {
  useEffect(() => {
    // Register service worker on mount
    if ('serviceWorker' in navigator) {
      registerServiceWorker();
    }

    // Add viewport meta tags for PWA
    addPWAMetaTags();

    // Handle app visibility changes
    document.addEventListener('visibilitychange', handleVisibilityChange);

    return () => {
      document.removeEventListener('visibilitychange', handleVisibilityChange);
    };
  }, []);

  const registerServiceWorker = async () => {
    try {
      const registration = await navigator.serviceWorker.register('/sw.js', {
        scope: '/',
        updateViaCache: 'none'
      });

      console.log('[PWA] Service Worker registered successfully:', registration);

      // Check for updates when the app gains focus
      registration.addEventListener('updatefound', () => {
        console.log('[PWA] New service worker update found');
      });

      // Check for updates immediately
      registration.update();

    } catch (error) {
      console.error('[PWA] Service Worker registration failed:', error);
    }
  };

  const addPWAMetaTags = () => {
    // Check if meta tags already exist
    const existingThemeColor = document.querySelector('meta[name="theme-color"]');
    const existingViewport = document.querySelector('meta[name="viewport"]');
    const existingManifest = document.querySelector('link[rel="manifest"]');

    // Add theme-color meta tag
    if (!existingThemeColor) {
      const themeColor = document.createElement('meta');
      themeColor.name = 'theme-color';
      themeColor.content = '#6366f1';
      document.head.appendChild(themeColor);
    }

    // Update viewport for PWA best practices
    if (!existingViewport) {
      const viewport = document.createElement('meta');
      viewport.name = 'viewport';
      viewport.content = 'width=device-width, initial-scale=1.0, maximum-scale=5.0, user-scalable=yes, viewport-fit=cover';
      document.head.appendChild(viewport);
    }

    // Add manifest link
    if (!existingManifest) {
      const manifest = document.createElement('link');
      manifest.rel = 'manifest';
      manifest.href = '/manifest.json';
      document.head.appendChild(manifest);
    }

    // Add Apple-specific meta tags for iOS
    addAppleMetaTags();
  };

  const addAppleMetaTags = () => {
    const appleTags = [
      { name: 'apple-mobile-web-app-capable', content: 'yes' },
      { name: 'apple-mobile-web-app-status-bar-style', content: 'black-translucent' },
      { name: 'apple-mobile-web-app-title', content: 'OpenMeet' }
    ];

    appleTags.forEach(tag => {
      const existing = document.querySelector(`meta[name="${tag.name}"]`);
      if (!existing) {
        const meta = document.createElement('meta');
        meta.name = tag.name;
        meta.content = tag.content;
        document.head.appendChild(meta);
      }
    });

    // Add Apple touch icons
    const iconSizes = ['57', '60', '72', '76', '114', '120', '144', '152', '180'];
    iconSizes.forEach(size => {
      const existing = document.querySelector(`link[rel="apple-touch-icon"][sizes="${size}x${size}"]`);
      if (!existing) {
        const link = document.createElement('link');
        link.rel = 'apple-touch-icon';
        link.sizes = `${size}x${size}`;
        link.href = `/icon-${size}x${size}.png`;
        document.head.appendChild(link);
      }
    });
  };

  const handleVisibilityChange = () => {
    if (!document.hidden) {
      // App became visible, check for updates
      if ('serviceWorker' in navigator) {
        navigator.serviceWorker.ready.then(registration => {
          registration.update();
        });
      }
    }
  };

  return (
    <>
      {children}
      {enableOfflineIndicator && <OfflineIndicator />}
      {enableInstallPrompt && <InstallPrompt />}
      {enablePushNotifications && <PushNotificationSetup />}
      {enableUpdateNotification && <UpdateAvailable />}
    </>
  );
};

export default PWAProvider;