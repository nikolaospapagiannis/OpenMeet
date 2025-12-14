'use client';

import React from 'react';
import { PWAProvider } from '@/components/pwa/PWAProvider';
import { NotificationSettings, OfflineStatus } from '@/components/pwa';
import { UpdateStatus } from '@/components/pwa/UpdateAvailable';
import { usePWA } from '@/hooks/usePWA';

// PWA Status Component
const PWAStatus: React.FC = () => {
  const pwa = usePWA();

  return (
    <div className="bg-gray-800 rounded-lg p-6 mb-6">
      <h2 className="text-xl font-semibold text-white mb-4">PWA Status</h2>
      <div className="grid grid-cols-2 gap-4">
        <div className="flex items-center justify-between">
          <span className="text-gray-400">Installed</span>
          <span className={`px-2 py-1 rounded text-xs ${pwa.isInstalled ? 'bg-green-900 text-green-400' : 'bg-gray-700 text-gray-400'}`}>
            {pwa.isInstalled ? 'Yes' : 'No'}
          </span>
        </div>
        <div className="flex items-center justify-between">
          <span className="text-gray-400">Installable</span>
          <span className={`px-2 py-1 rounded text-xs ${pwa.isInstallable ? 'bg-green-900 text-green-400' : 'bg-gray-700 text-gray-400'}`}>
            {pwa.isInstallable ? 'Yes' : 'No'}
          </span>
        </div>
        <div className="flex items-center justify-between">
          <span className="text-gray-400">Online</span>
          <span className={`px-2 py-1 rounded text-xs ${pwa.isOnline ? 'bg-green-900 text-green-400' : 'bg-red-900 text-red-400'}`}>
            {pwa.isOnline ? 'Yes' : 'No'}
          </span>
        </div>
        <div className="flex items-center justify-between">
          <span className="text-gray-400">Standalone</span>
          <span className={`px-2 py-1 rounded text-xs ${pwa.isStandalone ? 'bg-green-900 text-green-400' : 'bg-gray-700 text-gray-400'}`}>
            {pwa.isStandalone ? 'Yes' : 'No'}
          </span>
        </div>
        <div className="flex items-center justify-between">
          <span className="text-gray-400">Update Available</span>
          <span className={`px-2 py-1 rounded text-xs ${pwa.isUpdateAvailable ? 'bg-yellow-900 text-yellow-400' : 'bg-gray-700 text-gray-400'}`}>
            {pwa.isUpdateAvailable ? 'Yes' : 'No'}
          </span>
        </div>
        <div className="flex items-center justify-between">
          <span className="text-gray-400">Service Worker</span>
          <span className={`px-2 py-1 rounded text-xs ${
            pwa.serviceWorkerStatus === 'activated' ? 'bg-green-900 text-green-400' :
            pwa.serviceWorkerStatus === 'error' ? 'bg-red-900 text-red-400' :
            'bg-yellow-900 text-yellow-400'
          }`}>
            {pwa.serviceWorkerStatus}
          </span>
        </div>
        <div className="flex items-center justify-between">
          <span className="text-gray-400">Platform</span>
          <span className="px-2 py-1 bg-gray-700 text-gray-300 rounded text-xs">
            {pwa.platform}
          </span>
        </div>
      </div>
    </div>
  );
};

// Installation Guide Component
const InstallationGuide: React.FC = () => {
  const pwa = usePWA();
  const instructions = pwa.getInstallInstructions();

  if (pwa.isInstalled) {
    return (
      <div className="bg-green-900/20 border border-green-800 rounded-lg p-6">
        <h3 className="text-lg font-semibold text-green-400 mb-2">App Installed!</h3>
        <p className="text-gray-400">
          This app is already installed on your device. You can access it from your home screen.
        </p>
      </div>
    );
  }

  return (
    <div className="bg-gray-800 rounded-lg p-6">
      <h3 className="text-lg font-semibold text-white mb-4">{instructions.title}</h3>
      <ol className="space-y-2">
        {instructions.steps.map((step, index) => (
          <li key={index} className="flex items-start text-gray-300">
            <span className="mr-3 text-indigo-400 font-semibold">{index + 1}.</span>
            {step}
          </li>
        ))}
      </ol>
      {pwa.isInstallable && (
        <button
          onClick={() => pwa.installPWA()}
          className="mt-4 px-4 py-2 bg-indigo-600 hover:bg-indigo-700 text-white rounded-lg transition-colors"
        >
          Install Now
        </button>
      )}
    </div>
  );
};

// Cache Management Component
const CacheManagement: React.FC = () => {
  const pwa = usePWA();
  const [cacheSize, setCacheSize] = React.useState<number>(0);
  const [isClearing, setIsClearing] = React.useState(false);

  React.useEffect(() => {
    loadCacheSize();
  }, []);

  const loadCacheSize = async () => {
    const size = await pwa.getCacheSize();
    setCacheSize(size);
  };

  const handleClearCache = async () => {
    setIsClearing(true);
    await pwa.clearCache();
    await loadCacheSize();
    setIsClearing(false);
  };

  const formatBytes = (bytes: number) => {
    if (bytes === 0) return '0 Bytes';
    const k = 1024;
    const sizes = ['Bytes', 'KB', 'MB', 'GB'];
    const i = Math.floor(Math.log(bytes) / Math.log(k));
    return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i];
  };

  return (
    <div className="bg-gray-800 rounded-lg p-6">
      <h3 className="text-lg font-semibold text-white mb-4">Cache Management</h3>
      <div className="flex items-center justify-between">
        <div>
          <p className="text-gray-400">Current cache size</p>
          <p className="text-2xl font-semibold text-white">{formatBytes(cacheSize)}</p>
        </div>
        <button
          onClick={handleClearCache}
          disabled={isClearing}
          className="px-4 py-2 bg-red-600 hover:bg-red-700 disabled:opacity-50 disabled:cursor-not-allowed text-white rounded-lg transition-colors"
        >
          {isClearing ? 'Clearing...' : 'Clear Cache'}
        </button>
      </div>
    </div>
  );
};

// Main PWA Demo Page
export default function PWADemoPage() {
  return (
    <PWAProvider
      enableInstallPrompt={true}
      enableOfflineIndicator={true}
      enablePushNotifications={true}
      enableUpdateNotification={true}
    >
      <div className="min-h-screen bg-gray-900">
        <div className="max-w-6xl mx-auto px-4 py-8">
          <div className="mb-8">
            <h1 className="text-4xl font-bold text-white mb-4">PWA Features Demo</h1>
            <p className="text-gray-400">
              This page demonstrates all Progressive Web App features implemented in OpenMeet.
              The PWA components will automatically show when appropriate conditions are met.
            </p>
            <OfflineStatus className="mt-4" />
          </div>

          <div className="grid md:grid-cols-2 gap-6 mb-6">
            <PWAStatus />
            <InstallationGuide />
          </div>

          <div className="grid md:grid-cols-2 gap-6 mb-6">
            <NotificationSettings />
            <UpdateStatus />
          </div>

          <CacheManagement />

          <div className="mt-8 bg-blue-900/20 border border-blue-800 rounded-lg p-6">
            <h3 className="text-lg font-semibold text-blue-400 mb-3">Testing PWA Features</h3>
            <ul className="space-y-2 text-sm text-gray-300">
              <li className="flex items-start">
                <span className="text-blue-400 mr-2">•</span>
                <span><strong>Install Prompt:</strong> Will appear automatically after 30 seconds on first visit, or 5 seconds on subsequent visits</span>
              </li>
              <li className="flex items-start">
                <span className="text-blue-400 mr-2">•</span>
                <span><strong>Offline Indicator:</strong> Disconnect your internet to see the offline status banner</span>
              </li>
              <li className="flex items-start">
                <span className="text-blue-400 mr-2">•</span>
                <span><strong>Push Notifications:</strong> Setup prompt will appear after 10 seconds if not configured</span>
              </li>
              <li className="flex items-start">
                <span className="text-blue-400 mr-2">•</span>
                <span><strong>Update Banner:</strong> Will appear when a new version of the service worker is available</span>
              </li>
              <li className="flex items-start">
                <span className="text-blue-400 mr-2">•</span>
                <span><strong>Service Worker:</strong> Automatically registered and provides offline caching</span>
              </li>
            </ul>
          </div>

          <div className="mt-6 text-center text-gray-500 text-sm">
            PWA features are automatically integrated throughout the application.
            No additional configuration needed.
          </div>
        </div>
      </div>
    </PWAProvider>
  );
}