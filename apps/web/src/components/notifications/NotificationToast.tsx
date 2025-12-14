'use client';

import { useEffect, useState } from 'react';
import { X, Bell, CheckCircle, AlertCircle, AlertTriangle, Info, UserPlus, Share2, Calendar } from 'lucide-react';
import { NotificationUI, NotificationType } from '@/contexts/NotificationContext';
import { Button } from '@/components/ui/button-v2';
import { cn } from '@/lib/utils';

interface NotificationToastProps {
  notification: NotificationUI;
  onDismiss: (id: string) => void;
  onClick?: (notification: NotificationUI) => void;
  autoDismiss?: boolean;
  dismissTimeout?: number;
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

export function NotificationToast({
  notification,
  onDismiss,
  onClick,
  autoDismiss = true,
  dismissTimeout = 5000,
}: NotificationToastProps) {
  const [isVisible, setIsVisible] = useState(true);
  const [progress, setProgress] = useState(100);

  useEffect(() => {
    if (!autoDismiss) return;

    const startTime = Date.now();
    const interval = setInterval(() => {
      const elapsed = Date.now() - startTime;
      const remaining = Math.max(0, 100 - (elapsed / dismissTimeout) * 100);
      setProgress(remaining);

      if (remaining === 0) {
        setIsVisible(false);
        setTimeout(() => onDismiss(notification.id), 300);
      }
    }, 50);

    return () => clearInterval(interval);
  }, [autoDismiss, dismissTimeout, notification.id, onDismiss]);

  const handleClick = () => {
    if (onClick) {
      onClick(notification);
    } else if (notification.onAction) {
      notification.onAction();
    }
    setIsVisible(false);
    setTimeout(() => onDismiss(notification.id), 300);
  };

  const handleDismiss = (e: React.MouseEvent) => {
    e.stopPropagation();
    setIsVisible(false);
    setTimeout(() => onDismiss(notification.id), 300);
  };

  return (
    <div
      className={cn(
        "bg-slate-900/95 backdrop-blur-xl border border-slate-700/50 rounded-xl shadow-2xl overflow-hidden",
        "transition-all duration-300 transform",
        isVisible ? "translate-x-0 opacity-100" : "translate-x-full opacity-0",
        "min-w-[320px] max-w-md"
      )}
      onClick={handleClick}
      role="alert"
      aria-live="polite"
    >
      {/* Progress bar */}
      {autoDismiss && (
        <div className="h-1 bg-slate-800/50">
          <div
            className={cn(
              "h-full bg-gradient-to-r transition-all duration-50",
              notificationColors[notification.type]
            )}
            style={{ width: `${progress}%` }}
          />
        </div>
      )}

      <div className="p-4">
        <div className="flex gap-3">
          {/* Icon */}
          <div className={cn(
            "flex-shrink-0 w-10 h-10 rounded-lg flex items-center justify-center",
            "bg-gradient-to-br shadow-lg",
            notificationColors[notification.type]
          )}>
            {notificationIcons[notification.type]}
          </div>

          {/* Content */}
          <div className="flex-1 min-w-0">
            <div className="flex items-start justify-between gap-2 mb-1">
              <h4 className="text-sm font-semibold text-white">
                {notification.title}
              </h4>
              <button
                onClick={handleDismiss}
                className="text-slate-400 hover:text-white transition-colors flex-shrink-0"
                aria-label="Dismiss notification"
              >
                <X className="w-4 h-4" />
              </button>
            </div>
            <p className="text-xs text-slate-300 line-clamp-2 mb-2">
              {notification.message}
            </p>
            {notification.actionLabel && (
              <Button
                variant="ghost-glass"
                size="xs"
                onClick={(e) => {
                  e.stopPropagation();
                  notification.onAction?.();
                  handleDismiss(e);
                }}
                className="text-xs text-teal-400 hover:text-teal-300 mt-1"
              >
                {notification.actionLabel}
              </Button>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}

// Toast container for multiple toasts
export function NotificationToastContainer({
  notifications,
  onDismiss,
  onClick,
}: {
  notifications: NotificationUI[];
  onDismiss: (id: string) => void;
  onClick?: (notification: NotificationUI) => void;
}) {
  if (notifications.length === 0) return null;

  return (
    <div
      className="fixed bottom-4 right-4 z-[100] flex flex-col gap-3 pointer-events-none"
      aria-live="polite"
      aria-atomic="true"
    >
      <div className="pointer-events-auto flex flex-col gap-3">
        {notifications.slice(0, 3).map((notification, index) => (
          <NotificationToast
            key={notification.id}
            notification={notification}
            onDismiss={onDismiss}
            onClick={onClick}
          />
        ))}
        {notifications.length > 3 && (
          <div className="bg-slate-900/95 backdrop-blur-xl border border-slate-700/50 rounded-xl p-3 text-center">
            <p className="text-xs text-slate-400">
              + {notifications.length - 3} more notifications
            </p>
          </div>
        )}
      </div>
    </div>
  );
}
