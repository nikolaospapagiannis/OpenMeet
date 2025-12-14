'use client';

import { NotificationDropdown } from '@/components/notifications/NotificationDropdown';
import { useNotificationContext } from '@/contexts/NotificationContext';

// Re-export types for backward compatibility
export type { NotificationUI as Notification, NotificationType } from '@/contexts/NotificationContext';

interface NotificationCenterProps {
  // Legacy props - now using context instead
  notifications?: any[];
  onMarkAsRead?: (id: string) => void;
  onMarkAllAsRead?: () => void;
  onDismiss?: (id: string) => void;
  className?: string;
  isLoading?: boolean;
  error?: string;
  onRetry?: () => void;
}

/**
 * NotificationCenter Component
 * Now uses NotificationContext for real-time WebSocket notifications
 */
export function NotificationCenter({
  className,
}: NotificationCenterProps) {
  const {
    notifications,
    unreadCount,
    isLoading,
    error,
    markAsRead,
    markAllAsRead,
    deleteNotification,
    fetchNotifications,
  } = useNotificationContext();

  return (
    <NotificationDropdown
      notifications={notifications}
      unreadCount={unreadCount}
      onMarkAsRead={markAsRead}
      onMarkAllAsRead={markAllAsRead}
      onDismiss={deleteNotification}
      isLoading={isLoading}
      error={error}
      onRetry={fetchNotifications}
      className={className}
    />
  );
}
