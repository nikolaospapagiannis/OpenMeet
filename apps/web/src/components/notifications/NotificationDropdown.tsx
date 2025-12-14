'use client';

import { useState } from 'react';
import Link from 'next/link';
import { Bell, Check, Settings, Loader2, AlertCircle } from 'lucide-react';
import { NotificationUI } from '@/contexts/NotificationContext';
import { NotificationItem } from './NotificationItem';
import { CardGlass } from '@/components/ui/card-glass';
import { Button } from '@/components/ui/button-v2';
import { Badge } from '@/components/ui/badge';
import { cn } from '@/lib/utils';

interface NotificationDropdownProps {
  notifications: NotificationUI[];
  unreadCount: number;
  onMarkAsRead: (id: string) => void;
  onMarkAllAsRead: () => void;
  onDismiss: (id: string) => void;
  onClick?: (notification: NotificationUI) => void;
  isLoading?: boolean;
  error?: string | null;
  onRetry?: () => void;
  className?: string;
}

export function NotificationDropdown({
  notifications,
  unreadCount,
  onMarkAsRead,
  onMarkAllAsRead,
  onDismiss,
  onClick,
  isLoading = false,
  error = null,
  onRetry,
  className,
}: NotificationDropdownProps) {
  const [isOpen, setIsOpen] = useState(false);

  // Show only first 5 notifications in dropdown
  const displayNotifications = notifications.slice(0, 5);
  const hasMore = notifications.length > 5;

  return (
    <div className={cn("relative", className)}>
      {/* Bell Button */}
      <Button
        variant="ghost-glass"
        size="icon"
        className={cn(
          "relative h-10 w-10 transition-all duration-300",
          isOpen && "bg-white/10 border-white/20"
        )}
        onClick={() => setIsOpen(!isOpen)}
        aria-label={`Notifications${unreadCount > 0 ? `, ${unreadCount} unread` : ''}`}
        aria-expanded={isOpen}
      >
        <Bell className={cn(
          "w-5 h-5 transition-all duration-300",
          unreadCount > 0 && "animate-wiggle"
        )} />

        {/* Unread Badge */}
        {unreadCount > 0 && (
          <Badge className={cn(
            "absolute -top-1 -right-1 h-5 min-w-[20px] px-1",
            "bg-gradient-to-r from-red-500 to-rose-500",
            "text-white text-xs font-bold",
            "border-2 border-slate-900",
            "animate-pulse"
          )}>
            {unreadCount > 99 ? '99+' : unreadCount}
          </Badge>
        )}
      </Button>

      {/* Dropdown Menu */}
      {isOpen && (
        <>
          <CardGlass
            variant="elevated"
            className={cn(
              "absolute top-full right-0 mt-2 w-96 max-h-[600px]",
              "animate-in fade-in slide-in-from-top-4 duration-300",
              "z-50 overflow-hidden"
            )}
          >
            {/* Header */}
            <div className="flex items-center justify-between p-4 border-b border-white/10">
              <div>
                <h3 className="text-lg font-semibold text-white">
                  Notifications
                </h3>
                {unreadCount > 0 && (
                  <p className="text-xs text-slate-400 mt-0.5">
                    {unreadCount} unread
                  </p>
                )}
              </div>
              <div className="flex items-center gap-2">
                {notifications.length > 0 && !isLoading && (
                  <Button
                    variant="ghost-glass"
                    size="sm"
                    onClick={onMarkAllAsRead}
                    className="text-xs"
                    title="Mark all as read"
                  >
                    <Check className="w-3 h-3 mr-1" />
                    Mark all read
                  </Button>
                )}
                <Link href="/dashboard/notifications">
                  <Button
                    variant="ghost-glass"
                    size="icon"
                    className="h-8 w-8"
                    title="Notification settings"
                  >
                    <Settings className="w-4 h-4" />
                  </Button>
                </Link>
              </div>
            </div>

            {/* Loading State */}
            {isLoading && (
              <div className="flex flex-col items-center justify-center py-12 px-4">
                <Loader2 className="w-8 h-8 text-teal-400 animate-spin mb-3" />
                <p className="text-sm text-slate-400">Loading notifications...</p>
              </div>
            )}

            {/* Error State */}
            {error && !isLoading && (
              <div className="flex flex-col items-center justify-center py-12 px-4">
                <div className="w-16 h-16 rounded-full bg-red-500/10 flex items-center justify-center mb-3">
                  <AlertCircle className="w-8 h-8 text-red-400" />
                </div>
                <p className="text-sm text-red-400 mb-3">{error}</p>
                {onRetry && (
                  <Button
                    variant="ghost-glass"
                    size="sm"
                    onClick={onRetry}
                    className="text-teal-400"
                  >
                    Try again
                  </Button>
                )}
              </div>
            )}

            {/* Notifications List */}
            {!isLoading && !error && (
              <div className="max-h-[500px] overflow-y-auto custom-scrollbar">
                {displayNotifications.length === 0 ? (
                  <div className="flex flex-col items-center justify-center py-12 px-4">
                    <div className="w-16 h-16 rounded-full bg-slate-800/50 flex items-center justify-center mb-3">
                      <Bell className="w-8 h-8 text-slate-600" />
                    </div>
                    <p className="text-sm text-slate-400 text-center">
                      No notifications yet
                    </p>
                    <p className="text-xs text-slate-500 text-center mt-1">
                      We'll notify you when something happens
                    </p>
                  </div>
                ) : (
                  <>
                    {displayNotifications.map((notification) => (
                      <NotificationItem
                        key={notification.id}
                        notification={notification}
                        onMarkAsRead={onMarkAsRead}
                        onDismiss={onDismiss}
                        onClick={onClick}
                        compact={false}
                        showDismiss={true}
                      />
                    ))}

                    {/* View All Link */}
                    {hasMore && (
                      <Link href="/dashboard/notifications">
                        <div className="p-4 text-center border-t border-white/10 hover:bg-white/5 transition-colors">
                          <span className="text-sm text-teal-400 hover:text-teal-300 font-medium">
                            View all {notifications.length} notifications
                          </span>
                        </div>
                      </Link>
                    )}
                  </>
                )}
              </div>
            )}
          </CardGlass>

          {/* Backdrop */}
          <div
            className="fixed inset-0 -z-10"
            onClick={() => setIsOpen(false)}
          />
        </>
      )}
    </div>
  );
}
