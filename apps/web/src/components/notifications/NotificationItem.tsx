'use client';

import { X, Bell, CheckCircle, AlertCircle, AlertTriangle, Info, UserPlus, Share2, Calendar } from 'lucide-react';
import { NotificationUI, NotificationType } from '@/contexts/NotificationContext';
import { Button } from '@/components/ui/button-v2';
import { cn } from '@/lib/utils';

interface NotificationItemProps {
  notification: NotificationUI;
  onMarkAsRead?: (id: string) => void;
  onDismiss?: (id: string) => void;
  onClick?: (notification: NotificationUI) => void;
  compact?: boolean;
  showDismiss?: boolean;
}

const notificationIcons: Record<NotificationType, React.ReactNode> = {
  meeting_ready: <Calendar className="w-5 h-5" />,
  mention: <Bell className="w-5 h-5" />,
  share: <Share2 className="w-5 h-5" />,
  action_item: <CheckCircle className="w-5 h-5" />,
  team_invite: <UserPlus className="w-5 h-5" />,
  info: <Info className="w-5 h-5" />,
  success: <CheckCircle className="w-5 h-5" />,
  warning: <AlertTriangle className="w-5 h-5" />,
  error: <AlertCircle className="w-5 h-5" />
};

const notificationColors: Record<NotificationType, string> = {
  meeting_ready: 'from-purple-500 to-indigo-500',
  mention: 'from-teal-500 to-cyan-500',
  share: 'from-blue-500 to-cyan-500',
  action_item: 'from-green-500 to-emerald-500',
  team_invite: 'from-orange-500 to-yellow-500',
  info: 'from-blue-500 to-cyan-500',
  success: 'from-green-500 to-emerald-500',
  warning: 'from-yellow-500 to-orange-500',
  error: 'from-red-500 to-rose-500'
};

export function NotificationItem({
  notification,
  onMarkAsRead,
  onDismiss,
  onClick,
  compact = false,
  showDismiss = true,
}: NotificationItemProps) {
  const formatTimestamp = (date: Date): string => {
    const now = new Date();
    const diffMs = now.getTime() - date.getTime();
    const diffMins = Math.floor(diffMs / 60000);

    if (diffMins < 1) return 'Just now';
    if (diffMins < 60) return `${diffMins}m ago`;

    const diffHours = Math.floor(diffMins / 60);
    if (diffHours < 24) return `${diffHours}h ago`;

    const diffDays = Math.floor(diffHours / 24);
    if (diffDays < 7) return `${diffDays}d ago`;

    return date.toLocaleDateString();
  };

  const handleClick = () => {
    if (!notification.read && onMarkAsRead) {
      onMarkAsRead(notification.id);
    }
    if (onClick) {
      onClick(notification);
    } else if (notification.onAction) {
      notification.onAction();
    }
  };

  return (
    <div
      className={cn(
        "p-4 transition-all duration-200 border-b border-white/5 last:border-0",
        !notification.read && "bg-white/5",
        "hover:bg-white/10 cursor-pointer group"
      )}
      onClick={handleClick}
    >
      <div className="flex gap-3">
        {/* Icon */}
        <div className={cn(
          "flex-shrink-0 rounded-lg flex items-center justify-center",
          "bg-gradient-to-br shadow-lg",
          notificationColors[notification.type],
          compact ? "w-8 h-8" : "w-10 h-10"
        )}>
          {notificationIcons[notification.type]}
        </div>

        {/* Content */}
        <div className="flex-1 min-w-0">
          <div className="flex items-start justify-between gap-2 mb-1">
            <h4 className={cn(
              "font-medium",
              compact ? "text-xs" : "text-sm",
              notification.read ? "text-slate-400" : "text-white"
            )}>
              {notification.title}
            </h4>
            {showDismiss && onDismiss && (
              <Button
                variant="ghost-glass"
                size="icon"
                className="h-6 w-6 opacity-0 group-hover:opacity-100 transition-opacity"
                onClick={(e) => {
                  e.stopPropagation();
                  onDismiss(notification.id);
                }}
              >
                <X className="w-3 h-3" />
              </Button>
            )}
          </div>
          <p className={cn(
            "text-slate-400 line-clamp-2 mb-2",
            compact ? "text-xs" : "text-sm"
          )}>
            {notification.message}
          </p>
          <div className="flex items-center justify-between">
            <span className={cn(
              "text-slate-500",
              compact ? "text-xs" : "text-xs"
            )}>
              {formatTimestamp(notification.timestamp)}
            </span>
            {notification.actionLabel && notification.onAction && (
              <Button
                variant="ghost-glass"
                size="xs"
                onClick={(e) => {
                  e.stopPropagation();
                  notification.onAction?.();
                }}
                className="text-xs text-teal-400 hover:text-teal-300"
              >
                {notification.actionLabel}
              </Button>
            )}
          </div>
        </div>

        {/* Unread indicator */}
        {!notification.read && (
          <div className="flex-shrink-0 w-2 h-2 rounded-full bg-teal-500 shadow-lg shadow-teal-500/50 mt-2" />
        )}
      </div>
    </div>
  );
}
