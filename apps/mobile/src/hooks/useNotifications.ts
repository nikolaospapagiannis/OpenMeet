/**
 * useNotifications Hook
 * React hook for managing push notifications in the app
 */

import {useState, useEffect, useCallback} from 'react';
import notificationService from '../services/notifications';
import {AppState, AppStateStatus} from 'react-native';

export interface Notification {
  id: string;
  type: 'meeting_ready' | 'action_item' | 'comment_reply' | 'weekly_summary';
  data: Record<string, any>;
  timestamp: string;
  read: boolean;
}

export interface UseNotificationsReturn {
  notifications: Notification[];
  unreadCount: number;
  isEnabled: boolean;
  isLoading: boolean;
  error: string | null;
  initialize: () => Promise<void>;
  requestPermission: () => Promise<boolean>;
  markAsRead: (notificationId: string) => Promise<void>;
  markAllAsRead: () => Promise<void>;
  clearAll: () => Promise<void>;
  refresh: () => Promise<void>;
}

/**
 * Hook for managing push notifications
 */
export const useNotifications = (): UseNotificationsReturn => {
  const [notifications, setNotifications] = useState<Notification[]>([]);
  const [unreadCount, setUnreadCount] = useState<number>(0);
  const [isEnabled, setIsEnabled] = useState<boolean>(false);
  const [isLoading, setIsLoading] = useState<boolean>(true);
  const [error, setError] = useState<string | null>(null);

  /**
   * Load notifications from storage
   */
  const loadNotifications = useCallback(async () => {
    try {
      const stored = await notificationService.getStoredNotifications();
      setNotifications(stored);

      const unread = await notificationService.getUnreadCount();
      setUnreadCount(unread);
    } catch (err) {
      console.error('Failed to load notifications:', err);
      setError('Failed to load notifications');
    }
  }, []);

  /**
   * Check if notifications are enabled
   */
  const checkPermissionStatus = useCallback(async () => {
    try {
      const enabled = await notificationService.isEnabled();
      setIsEnabled(enabled);
    } catch (err) {
      console.error('Failed to check permission status:', err);
    }
  }, []);

  /**
   * Initialize notification service
   */
  const initialize = useCallback(async () => {
    setIsLoading(true);
    setError(null);

    try {
      await notificationService.initialize();
      await loadNotifications();
      await checkPermissionStatus();
    } catch (err) {
      console.error('Failed to initialize notifications:', err);
      setError('Failed to initialize notifications');
    } finally {
      setIsLoading(false);
    }
  }, [loadNotifications, checkPermissionStatus]);

  /**
   * Request notification permission
   */
  const requestPermission = useCallback(async (): Promise<boolean> => {
    setError(null);

    try {
      const granted = await notificationService.requestPermission();
      setIsEnabled(granted);

      if (granted) {
        await notificationService.getFCMToken();
      }

      return granted;
    } catch (err) {
      console.error('Failed to request permission:', err);
      setError('Failed to request permission');
      return false;
    }
  }, []);

  /**
   * Mark notification as read
   */
  const markAsRead = useCallback(
    async (notificationId: string) => {
      try {
        await notificationService.markNotificationAsRead(notificationId);
        await loadNotifications();
      } catch (err) {
        console.error('Failed to mark notification as read:', err);
        setError('Failed to mark notification as read');
      }
    },
    [loadNotifications]
  );

  /**
   * Mark all notifications as read
   */
  const markAllAsRead = useCallback(async () => {
    try {
      const stored = await notificationService.getStoredNotifications();
      const allRead = stored.map(n => ({...n, read: true}));

      // Update storage
      const AsyncStorage = require('@react-native-async-storage/async-storage').default;
      await AsyncStorage.setItem('notifications', JSON.stringify(allRead));

      await loadNotifications();
    } catch (err) {
      console.error('Failed to mark all as read:', err);
      setError('Failed to mark all as read');
    }
  }, [loadNotifications]);

  /**
   * Clear all notifications
   */
  const clearAll = useCallback(async () => {
    try {
      await notificationService.clearAllNotifications();
      await loadNotifications();
    } catch (err) {
      console.error('Failed to clear notifications:', err);
      setError('Failed to clear notifications');
    }
  }, [loadNotifications]);

  /**
   * Refresh notifications
   */
  const refresh = useCallback(async () => {
    setIsLoading(true);
    try {
      await loadNotifications();
      await checkPermissionStatus();
    } catch (err) {
      console.error('Failed to refresh notifications:', err);
      setError('Failed to refresh notifications');
    } finally {
      setIsLoading(false);
    }
  }, [loadNotifications, checkPermissionStatus]);

  /**
   * Initialize on mount
   */
  useEffect(() => {
    initialize();
  }, [initialize]);

  /**
   * Refresh notifications when app comes to foreground
   */
  useEffect(() => {
    const handleAppStateChange = (nextAppState: AppStateStatus) => {
      if (nextAppState === 'active') {
        loadNotifications();
      }
    };

    const subscription = AppState.addEventListener(
      'change',
      handleAppStateChange
    );

    return () => {
      subscription.remove();
    };
  }, [loadNotifications]);

  /**
   * Poll for new notifications every 30 seconds when app is active
   */
  useEffect(() => {
    const interval = setInterval(() => {
      if (AppState.currentState === 'active') {
        loadNotifications();
      }
    }, 30000); // 30 seconds

    return () => clearInterval(interval);
  }, [loadNotifications]);

  return {
    notifications,
    unreadCount,
    isEnabled,
    isLoading,
    error,
    initialize,
    requestPermission,
    markAsRead,
    markAllAsRead,
    clearAll,
    refresh,
  };
};
