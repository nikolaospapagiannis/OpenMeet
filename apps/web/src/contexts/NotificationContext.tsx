'use client';

import React, { createContext, useContext, useEffect, useState, useCallback, useRef } from 'react';
import wsService from '@/services/websocket';
import apiClient from '@/lib/api';

export type NotificationType =
  | 'meeting_ready'
  | 'mention'
  | 'share'
  | 'action_item'
  | 'team_invite'
  | 'info'
  | 'success'
  | 'warning'
  | 'error';

export interface NotificationData {
  id: string;
  userId?: string;
  type: NotificationType;
  status: 'pending' | 'sent' | 'delivered' | 'read' | 'failed';
  channel: string;
  recipient: string;
  subject?: string;
  content: string;
  metadata?: {
    title?: string;
    message?: string;
    actionLabel?: string;
    actionUrl?: string;
    meetingId?: string;
    userId?: string;
    [key: string]: any;
  };
  sentAt?: Date;
  deliveredAt?: Date;
  readAt?: Date;
  createdAt: Date;
  updatedAt: Date;
}

export interface NotificationUI {
  id: string;
  type: NotificationType;
  title: string;
  message: string;
  timestamp: Date;
  read: boolean;
  actionLabel?: string;
  actionUrl?: string;
  onAction?: () => void;
  metadata?: any;
}

interface NotificationContextValue {
  notifications: NotificationUI[];
  unreadCount: number;
  isLoading: boolean;
  error: string | null;
  fetchNotifications: () => Promise<void>;
  markAsRead: (id: string) => Promise<void>;
  markAllAsRead: () => Promise<void>;
  deleteNotification: (id: string) => Promise<void>;
  showToast: (notification: NotificationUI) => void;
}

const NotificationContext = createContext<NotificationContextValue | null>(null);

export function NotificationProvider({ children }: { children: React.ReactNode }) {
  const [notifications, setNotifications] = useState<NotificationUI[]>([]);
  const [unreadCount, setUnreadCount] = useState(0);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [toastQueue, setToastQueue] = useState<NotificationUI[]>([]);
  const wsInitialized = useRef(false);

  // Convert API notification to UI format
  const convertToUI = useCallback((notification: NotificationData): NotificationUI => {
    const title = notification.metadata?.title || notification.subject || getDefaultTitle(notification.type);
    const message = notification.metadata?.message || notification.content;

    return {
      id: notification.id,
      type: notification.type,
      title,
      message,
      timestamp: new Date(notification.createdAt),
      read: notification.status === 'read',
      actionLabel: notification.metadata?.actionLabel,
      actionUrl: notification.metadata?.actionUrl,
      onAction: notification.metadata?.actionUrl
        ? () => window.location.href = notification.metadata!.actionUrl!
        : undefined,
      metadata: notification.metadata,
    };
  }, []);

  // Fetch notifications from API
  const fetchNotifications = useCallback(async () => {
    try {
      setIsLoading(true);
      setError(null);

      const response = await apiClient.get('/notifications', {
        params: { limit: 50, offset: 0 }
      });

      if (response.notifications && Array.isArray(response.notifications)) {
        const uiNotifications = response.notifications.map(convertToUI);
        setNotifications(uiNotifications);
        setUnreadCount(response.unreadCount || 0);
      }
    } catch (err: any) {
      console.error('Failed to fetch notifications:', err);
      setError(err.message || 'Failed to load notifications');
    } finally {
      setIsLoading(false);
    }
  }, [convertToUI]);

  // Mark single notification as read
  const markAsRead = useCallback(async (id: string) => {
    try {
      // Optimistic update
      setNotifications(prev =>
        prev.map(n => (n.id === id ? { ...n, read: true } : n))
      );
      setUnreadCount(prev => Math.max(0, prev - 1));

      // API call
      await apiClient.patch(`/notifications/${id}/read`);
    } catch (err: any) {
      console.error('Failed to mark notification as read:', err);
      // Revert on error
      await fetchNotifications();
    }
  }, [fetchNotifications]);

  // Mark all notifications as read
  const markAllAsRead = useCallback(async () => {
    try {
      // Optimistic update
      setNotifications(prev => prev.map(n => ({ ...n, read: true })));
      setUnreadCount(0);

      // API call
      await apiClient.post('/notifications/read-all');
    } catch (err: any) {
      console.error('Failed to mark all as read:', err);
      // Revert on error
      await fetchNotifications();
    }
  }, [fetchNotifications]);

  // Delete notification
  const deleteNotification = useCallback(async (id: string) => {
    try {
      // Optimistic update
      setNotifications(prev => {
        const notification = prev.find(n => n.id === id);
        if (notification && !notification.read) {
          setUnreadCount(count => Math.max(0, count - 1));
        }
        return prev.filter(n => n.id !== id);
      });

      // Note: API doesn't have delete endpoint, so we just remove locally
      // If you add a DELETE /notifications/:id endpoint, uncomment:
      // await apiClient.delete(`/notifications/${id}`);
    } catch (err: any) {
      console.error('Failed to delete notification:', err);
      await fetchNotifications();
    }
  }, [fetchNotifications]);

  // Show toast notification
  const showToast = useCallback((notification: NotificationUI) => {
    setToastQueue(prev => [...prev, notification]);

    // Auto-remove after 5 seconds
    setTimeout(() => {
      setToastQueue(prev => prev.filter(n => n.id !== notification.id));
    }, 5000);
  }, []);

  // Handle incoming WebSocket notifications
  const handleWebSocketNotification = useCallback((data: any) => {
    console.log('Received WebSocket notification:', data);

    // Create UI notification from WebSocket data
    const notification: NotificationUI = {
      id: data.id || `ws-${Date.now()}`,
      type: data.type || 'info',
      title: data.title || getDefaultTitle(data.type),
      message: data.message || data.content || '',
      timestamp: new Date(),
      read: false,
      actionLabel: data.actionLabel,
      actionUrl: data.actionUrl,
      onAction: data.actionUrl ? () => window.location.href = data.actionUrl : undefined,
      metadata: data.metadata,
    };

    // Add to notifications list
    setNotifications(prev => [notification, ...prev]);
    setUnreadCount(prev => prev + 1);

    // Show toast
    showToast(notification);

    // Play notification sound if enabled
    if (typeof window !== 'undefined' && window.localStorage.getItem('notificationSound') !== 'false') {
      playNotificationSound();
    }

    // Request browser notification permission and show
    if (typeof window !== 'undefined' && Notification.permission === 'granted') {
      new Notification(notification.title, {
        body: notification.message,
        icon: '/favicon.ico',
        badge: '/favicon.ico',
      });
    }
  }, [showToast]);

  // Initialize WebSocket connection
  useEffect(() => {
    if (wsInitialized.current) return;

    // Connect WebSocket
    if (!wsService.isConnectedStatus()) {
      wsService.connect();
    }

    // Subscribe to notification events
    wsService.on('notification', handleWebSocketNotification);
    wsService.on('notification:new', handleWebSocketNotification);

    wsInitialized.current = true;

    return () => {
      wsService.off('notification', handleWebSocketNotification);
      wsService.off('notification:new', handleWebSocketNotification);
    };
  }, [handleWebSocketNotification]);

  // Initial fetch
  useEffect(() => {
    fetchNotifications();
  }, [fetchNotifications]);

  // Request browser notification permission on mount
  useEffect(() => {
    if (typeof window !== 'undefined' && Notification.permission === 'default') {
      Notification.requestPermission();
    }
  }, []);

  const value: NotificationContextValue = {
    notifications,
    unreadCount,
    isLoading,
    error,
    fetchNotifications,
    markAsRead,
    markAllAsRead,
    deleteNotification,
    showToast,
  };

  return (
    <NotificationContext.Provider value={value}>
      {children}
      {/* Render toast notifications */}
      <NotificationToastContainer notifications={toastQueue} onDismiss={deleteNotification} />
    </NotificationContext.Provider>
  );
}

export function useNotificationContext() {
  const context = useContext(NotificationContext);
  if (!context) {
    throw new Error('useNotificationContext must be used within NotificationProvider');
  }
  return context;
}

// Toast container component
function NotificationToastContainer({
  notifications,
  onDismiss,
}: {
  notifications: NotificationUI[];
  onDismiss: (id: string) => void;
}) {
  if (notifications.length === 0) return null;

  return (
    <div className="fixed bottom-4 right-4 z-[100] flex flex-col gap-3 max-w-md">
      {notifications.map((notification, index) => (
        <NotificationToast
          key={notification.id}
          notification={notification}
          onDismiss={() => onDismiss(notification.id)}
          index={index}
        />
      ))}
    </div>
  );
}

// Toast notification component (placeholder, will create full version)
function NotificationToast({
  notification,
  onDismiss,
  index,
}: {
  notification: NotificationUI;
  onDismiss: () => void;
  index: number;
}) {
  return (
    <div
      className="bg-slate-900 border border-slate-700 rounded-lg shadow-xl p-4 animate-in slide-in-from-right duration-300"
      style={{ animationDelay: `${index * 100}ms` }}
    >
      <div className="flex items-start gap-3">
        <div className="flex-1">
          <h4 className="text-white font-medium text-sm">{notification.title}</h4>
          <p className="text-slate-400 text-xs mt-1">{notification.message}</p>
        </div>
        <button
          onClick={onDismiss}
          className="text-slate-400 hover:text-white transition-colors"
        >
          <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
          </svg>
        </button>
      </div>
    </div>
  );
}

// Helper functions
function getDefaultTitle(type: NotificationType): string {
  const titles: Record<NotificationType, string> = {
    meeting_ready: 'Meeting Ready',
    mention: 'New Mention',
    share: 'Shared with You',
    action_item: 'New Action Item',
    team_invite: 'Team Invitation',
    info: 'Information',
    success: 'Success',
    warning: 'Warning',
    error: 'Error',
  };
  return titles[type] || 'Notification';
}

function playNotificationSound() {
  try {
    const audio = new Audio('/sounds/notification.mp3');
    audio.volume = 0.5;
    audio.play().catch(() => {
      // Ignore error if sound file doesn't exist
    });
  } catch (err) {
    // Ignore errors
  }
}

export default NotificationContext;
