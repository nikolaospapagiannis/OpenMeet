'use client';

import { useState, useMemo } from 'react';
import { Bell, Check, CheckCheck, Filter, Search, Trash2, Calendar, Clock } from 'lucide-react';
import { useNotificationContext, NotificationType } from '@/contexts/NotificationContext';
import { NotificationItem } from '@/components/notifications/NotificationItem';
import { Button } from '@/components/ui/button-v2';
import { Badge } from '@/components/ui/badge';
import { CardGlass } from '@/components/ui/card-glass';
import { cn } from '@/lib/utils';

type FilterType = 'all' | 'unread' | NotificationType;

export default function NotificationsPage() {
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

  const [filter, setFilter] = useState<FilterType>('all');
  const [searchQuery, setSearchQuery] = useState('');

  // Filter and search notifications
  const filteredNotifications = useMemo(() => {
    let filtered = notifications;

    // Apply filter
    if (filter === 'unread') {
      filtered = filtered.filter(n => !n.read);
    } else if (filter !== 'all') {
      filtered = filtered.filter(n => n.type === filter);
    }

    // Apply search
    if (searchQuery) {
      const query = searchQuery.toLowerCase();
      filtered = filtered.filter(
        n =>
          n.title.toLowerCase().includes(query) ||
          n.message.toLowerCase().includes(query)
      );
    }

    return filtered;
  }, [notifications, filter, searchQuery]);

  // Group notifications by date
  const groupedNotifications = useMemo(() => {
    const groups: { [key: string]: typeof filteredNotifications } = {
      today: [],
      yesterday: [],
      week: [],
      older: [],
    };

    const now = new Date();
    const today = new Date(now.getFullYear(), now.getMonth(), now.getDate());
    const yesterday = new Date(today);
    yesterday.setDate(yesterday.getDate() - 1);
    const weekAgo = new Date(today);
    weekAgo.setDate(weekAgo.getDate() - 7);

    filteredNotifications.forEach(notification => {
      const notifDate = new Date(notification.timestamp);
      const notifDay = new Date(
        notifDate.getFullYear(),
        notifDate.getMonth(),
        notifDate.getDate()
      );

      if (notifDay.getTime() === today.getTime()) {
        groups.today.push(notification);
      } else if (notifDay.getTime() === yesterday.getTime()) {
        groups.yesterday.push(notification);
      } else if (notifDate >= weekAgo) {
        groups.week.push(notification);
      } else {
        groups.older.push(notification);
      }
    });

    return groups;
  }, [filteredNotifications]);

  const filters: { value: FilterType; label: string; count?: number }[] = [
    { value: 'all', label: 'All', count: notifications.length },
    { value: 'unread', label: 'Unread', count: unreadCount },
    { value: 'meeting_ready', label: 'Meetings' },
    { value: 'mention', label: 'Mentions' },
    { value: 'action_item', label: 'Action Items' },
    { value: 'share', label: 'Shared' },
    { value: 'team_invite', label: 'Invites' },
  ];

  return (
    <div className="min-h-screen bg-slate-950 p-6">
      <div className="max-w-5xl mx-auto">
        {/* Header */}
        <div className="mb-8">
          <div className="flex items-center justify-between mb-4">
            <div className="flex items-center gap-3">
              <div className="w-12 h-12 bg-gradient-to-br from-teal-500 to-cyan-500 rounded-xl flex items-center justify-center shadow-lg shadow-teal-500/20">
                <Bell className="w-6 h-6 text-white" />
              </div>
              <div>
                <h1 className="text-3xl font-bold text-white">Notifications</h1>
                <p className="text-slate-400 text-sm mt-1">
                  {unreadCount > 0
                    ? `${unreadCount} unread notification${unreadCount !== 1 ? 's' : ''}`
                    : 'All caught up!'}
                </p>
              </div>
            </div>
            {unreadCount > 0 && (
              <Button
                variant="default"
                size="sm"
                onClick={markAllAsRead}
                className="bg-gradient-to-r from-teal-500 to-cyan-500 hover:from-teal-600 hover:to-cyan-600 text-white border-0"
              >
                <CheckCheck className="w-4 h-4 mr-2" />
                Mark all as read
              </Button>
            )}
          </div>

          {/* Search and Filters */}
          <div className="flex flex-col sm:flex-row gap-4">
            {/* Search */}
            <div className="flex-1 relative">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
              <input
                type="text"
                placeholder="Search notifications..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="w-full bg-slate-900/50 border border-slate-700/50 rounded-lg pl-10 pr-4 py-2.5 text-white placeholder:text-slate-500 focus:outline-none focus:ring-2 focus:ring-teal-500/50 focus:border-teal-500/50"
              />
            </div>

            {/* Filter Chips */}
            <div className="flex items-center gap-2 overflow-x-auto pb-2 sm:pb-0">
              {filters.map((f) => (
                <button
                  key={f.value}
                  onClick={() => setFilter(f.value)}
                  className={cn(
                    "px-3 py-2 rounded-lg text-sm font-medium whitespace-nowrap transition-all duration-200",
                    filter === f.value
                      ? "bg-gradient-to-r from-teal-500 to-cyan-500 text-white shadow-lg shadow-teal-500/20"
                      : "bg-slate-800/50 text-slate-400 hover:bg-slate-800 hover:text-white"
                  )}
                >
                  {f.label}
                  {f.count !== undefined && f.count > 0 && (
                    <Badge className="ml-2 bg-white/10 text-white border-0">
                      {f.count}
                    </Badge>
                  )}
                </button>
              ))}
            </div>
          </div>
        </div>

        {/* Notifications List */}
        <CardGlass variant="elevated" className="overflow-hidden">
          {isLoading ? (
            <div className="flex flex-col items-center justify-center py-16">
              <div className="w-12 h-12 border-4 border-teal-500 border-t-transparent rounded-full animate-spin mb-4" />
              <p className="text-slate-400">Loading notifications...</p>
            </div>
          ) : error ? (
            <div className="flex flex-col items-center justify-center py-16">
              <div className="w-16 h-16 bg-red-500/10 rounded-full flex items-center justify-center mb-4">
                <Bell className="w-8 h-8 text-red-400" />
              </div>
              <p className="text-red-400 mb-4">{error}</p>
              <Button variant="ghost-glass" size="sm" onClick={fetchNotifications}>
                Try again
              </Button>
            </div>
          ) : filteredNotifications.length === 0 ? (
            <div className="flex flex-col items-center justify-center py-16">
              <div className="w-16 h-16 bg-slate-800/50 rounded-full flex items-center justify-center mb-4">
                <Bell className="w-8 h-8 text-slate-600" />
              </div>
              <p className="text-slate-400 text-center">
                {searchQuery
                  ? 'No notifications match your search'
                  : filter === 'unread'
                  ? 'No unread notifications'
                  : 'No notifications yet'}
              </p>
            </div>
          ) : (
            <div className="divide-y divide-white/5">
              {/* Today */}
              {groupedNotifications.today.length > 0 && (
                <div>
                  <div className="px-6 py-3 bg-slate-900/30 sticky top-0 z-10 backdrop-blur-xl">
                    <h3 className="text-sm font-semibold text-slate-300 flex items-center gap-2">
                      <Clock className="w-4 h-4" />
                      Today
                    </h3>
                  </div>
                  {groupedNotifications.today.map((notification) => (
                    <NotificationItem
                      key={notification.id}
                      notification={notification}
                      onMarkAsRead={markAsRead}
                      onDismiss={deleteNotification}
                    />
                  ))}
                </div>
              )}

              {/* Yesterday */}
              {groupedNotifications.yesterday.length > 0 && (
                <div>
                  <div className="px-6 py-3 bg-slate-900/30 sticky top-0 z-10 backdrop-blur-xl">
                    <h3 className="text-sm font-semibold text-slate-300 flex items-center gap-2">
                      <Calendar className="w-4 h-4" />
                      Yesterday
                    </h3>
                  </div>
                  {groupedNotifications.yesterday.map((notification) => (
                    <NotificationItem
                      key={notification.id}
                      notification={notification}
                      onMarkAsRead={markAsRead}
                      onDismiss={deleteNotification}
                    />
                  ))}
                </div>
              )}

              {/* This Week */}
              {groupedNotifications.week.length > 0 && (
                <div>
                  <div className="px-6 py-3 bg-slate-900/30 sticky top-0 z-10 backdrop-blur-xl">
                    <h3 className="text-sm font-semibold text-slate-300 flex items-center gap-2">
                      <Calendar className="w-4 h-4" />
                      This Week
                    </h3>
                  </div>
                  {groupedNotifications.week.map((notification) => (
                    <NotificationItem
                      key={notification.id}
                      notification={notification}
                      onMarkAsRead={markAsRead}
                      onDismiss={deleteNotification}
                    />
                  ))}
                </div>
              )}

              {/* Older */}
              {groupedNotifications.older.length > 0 && (
                <div>
                  <div className="px-6 py-3 bg-slate-900/30 sticky top-0 z-10 backdrop-blur-xl">
                    <h3 className="text-sm font-semibold text-slate-300 flex items-center gap-2">
                      <Calendar className="w-4 h-4" />
                      Older
                    </h3>
                  </div>
                  {groupedNotifications.older.map((notification) => (
                    <NotificationItem
                      key={notification.id}
                      notification={notification}
                      onMarkAsRead={markAsRead}
                      onDismiss={deleteNotification}
                    />
                  ))}
                </div>
              )}
            </div>
          )}
        </CardGlass>
      </div>
    </div>
  );
}
