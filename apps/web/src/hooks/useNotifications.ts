'use client';

import { useNotificationContext } from '@/contexts/NotificationContext';
import type { NotificationUI } from '@/contexts/NotificationContext';

// Legacy type mapping for backward compatibility
export type { NotificationUI as Notification } from '@/contexts/NotificationContext';

interface UseNotificationsReturn {
  notifications: NotificationUI[];
  isLoading: boolean;
  error: string | null;
  markAsRead: (id: string) => Promise<void>;
  markAllAsRead: () => Promise<void>;
  dismiss: (id: string) => Promise<void>;
  refetch: () => Promise<void>;
  unreadCount: number;
}

/**
 * Hook to access notifications from the NotificationContext.
 * Provides real-time notifications via WebSocket and API access.
 *
 * @returns Notification state and methods
 */
export function useNotifications(): UseNotificationsReturn {
  const {
    notifications,
    unreadCount,
    isLoading,
    error,
    fetchNotifications,
    markAsRead,
    markAllAsRead,
    deleteNotification,
  } = useNotificationContext();

  return {
    notifications,
    unreadCount,
    isLoading,
    error,
    markAsRead,
    markAllAsRead,
    dismiss: deleteNotification,
    refetch: fetchNotifications,
  };
}

export default useNotifications;
