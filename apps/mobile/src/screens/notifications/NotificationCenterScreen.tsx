/**
 * Notification Center Screen
 * Display all notifications with deep link handling
 */

import React, {useCallback} from 'react';
import {
  View,
  Text,
  FlatList,
  TouchableOpacity,
  StyleSheet,
  RefreshControl,
  Alert,
  ActivityIndicator,
  Platform,
} from 'react-native';
import {SafeAreaView} from 'react-native-safe-area-context';
import {useNotifications, Notification} from '../../hooks/useNotifications';
import {useNavigation} from '@react-navigation/native';

interface NotificationItemProps {
  notification: Notification;
  onPress: () => void;
  onMarkAsRead: () => void;
}

const NotificationItem: React.FC<NotificationItemProps> = ({
  notification,
  onPress,
  onMarkAsRead,
}) => {
  const getNotificationIcon = (type: string): string => {
    switch (type) {
      case 'meeting_ready':
        return '📝';
      case 'action_item':
        return '✅';
      case 'comment_reply':
        return '💬';
      case 'weekly_summary':
        return '📊';
      default:
        return '🔔';
    }
  };

  const getNotificationTitle = (notification: Notification): string => {
    const {type, data} = notification;
    switch (type) {
      case 'meeting_ready':
        return 'Meeting Transcription Ready';
      case 'action_item':
        return 'New Action Item Assigned';
      case 'comment_reply':
        return 'New Comment Reply';
      case 'weekly_summary':
        return 'Weekly Summary Available';
      default:
        return 'New Notification';
    }
  };

  const getNotificationBody = (notification: Notification): string => {
    const {type, data} = notification;
    switch (type) {
      case 'meeting_ready':
        return `Your meeting "${data.meetingTitle || 'Untitled'}" has been transcribed and is ready for review.`;
      case 'action_item':
        return `You have been assigned: ${data.actionItemTitle || 'New action item'}`;
      case 'comment_reply':
        return `${data.commenterName || 'Someone'} replied to your comment`;
      case 'weekly_summary':
        return 'Your weekly meeting summary is ready';
      default:
        return 'You have a new notification';
    }
  };

  const formatTimestamp = (timestamp: string): string => {
    const date = new Date(timestamp);
    const now = new Date();
    const diffMs = now.getTime() - date.getTime();
    const diffMins = Math.floor(diffMs / 60000);
    const diffHours = Math.floor(diffMs / 3600000);
    const diffDays = Math.floor(diffMs / 86400000);

    if (diffMins < 1) return 'Just now';
    if (diffMins < 60) return `${diffMins}m ago`;
    if (diffHours < 24) return `${diffHours}h ago`;
    if (diffDays < 7) return `${diffDays}d ago`;
    return date.toLocaleDateString();
  };

  return (
    <TouchableOpacity
      style={[
        styles.notificationItem,
        !notification.read && styles.notificationItemUnread,
      ]}
      onPress={onPress}
      activeOpacity={0.7}>
      <View style={styles.notificationIcon}>
        <Text style={styles.notificationIconText}>
          {getNotificationIcon(notification.type)}
        </Text>
      </View>

      <View style={styles.notificationContent}>
        <Text style={styles.notificationTitle}>
          {getNotificationTitle(notification)}
        </Text>
        <Text
          style={styles.notificationBody}
          numberOfLines={2}
          ellipsizeMode="tail">
          {getNotificationBody(notification)}
        </Text>
        <Text style={styles.notificationTime}>
          {formatTimestamp(notification.timestamp)}
        </Text>
      </View>

      {!notification.read && (
        <TouchableOpacity
          style={styles.markAsReadButton}
          onPress={onMarkAsRead}
          hitSlop={{top: 10, bottom: 10, left: 10, right: 10}}>
          <View style={styles.unreadDot} />
        </TouchableOpacity>
      )}
    </TouchableOpacity>
  );
};

const NotificationCenterScreen: React.FC = () => {
  const navigation = useNavigation();
  const {
    notifications,
    unreadCount,
    isEnabled,
    isLoading,
    error,
    markAsRead,
    markAllAsRead,
    clearAll,
    refresh,
    requestPermission,
  } = useNotifications();

  /**
   * Handle notification press - navigate to relevant screen
   */
  const handleNotificationPress = useCallback(
    (notification: Notification) => {
      // Mark as read
      markAsRead(notification.id);

      // Navigate to relevant screen based on notification type
      const {type, data} = notification;

      switch (type) {
        case 'meeting_ready':
          if (data.meetingId) {
            // Navigate to meeting details
            // navigation.navigate('MeetingDetails', { meetingId: data.meetingId });
            console.log('Navigate to meeting:', data.meetingId);
          }
          break;

        case 'action_item':
          if (data.actionItemId) {
            // Navigate to action item
            // navigation.navigate('ActionItem', { actionItemId: data.actionItemId });
            console.log('Navigate to action item:', data.actionItemId);
          }
          break;

        case 'comment_reply':
          if (data.meetingId && data.commentId) {
            // Navigate to meeting with comment highlighted
            // navigation.navigate('MeetingDetails', {
            //   meetingId: data.meetingId,
            //   commentId: data.commentId,
            // });
            console.log('Navigate to comment:', data.commentId);
          }
          break;

        case 'weekly_summary':
          // Navigate to analytics/summary screen
          // navigation.navigate('WeeklySummary');
          console.log('Navigate to weekly summary');
          break;
      }
    },
    [markAsRead]
  );

  /**
   * Handle mark as read button press
   */
  const handleMarkAsRead = useCallback(
    (notificationId: string) => {
      markAsRead(notificationId);
    },
    [markAsRead]
  );

  /**
   * Handle mark all as read
   */
  const handleMarkAllAsRead = useCallback(() => {
    if (unreadCount === 0) return;

    Alert.alert(
      'Mark All as Read',
      'Are you sure you want to mark all notifications as read?',
      [
        {text: 'Cancel', style: 'cancel'},
        {
          text: 'Mark All',
          onPress: markAllAsRead,
        },
      ]
    );
  }, [unreadCount, markAllAsRead]);

  /**
   * Handle clear all notifications
   */
  const handleClearAll = useCallback(() => {
    if (notifications.length === 0) return;

    Alert.alert(
      'Clear All',
      'Are you sure you want to delete all notifications?',
      [
        {text: 'Cancel', style: 'cancel'},
        {
          text: 'Clear All',
          style: 'destructive',
          onPress: clearAll,
        },
      ]
    );
  }, [notifications.length, clearAll]);

  /**
   * Handle enable notifications
   */
  const handleEnableNotifications = useCallback(async () => {
    const granted = await requestPermission();
    if (!granted) {
      Alert.alert(
        'Permission Denied',
        'Please enable notifications in your device settings to receive updates.',
        [{text: 'OK'}]
      );
    }
  }, [requestPermission]);

  /**
   * Render empty state
   */
  const renderEmptyState = () => {
    if (!isEnabled) {
      return (
        <View style={styles.emptyState}>
          <Text style={styles.emptyStateIcon}>🔔</Text>
          <Text style={styles.emptyStateTitle}>Notifications Disabled</Text>
          <Text style={styles.emptyStateMessage}>
            Enable notifications to stay updated on your meetings, action items,
            and more.
          </Text>
          <TouchableOpacity
            style={styles.enableButton}
            onPress={handleEnableNotifications}>
            <Text style={styles.enableButtonText}>Enable Notifications</Text>
          </TouchableOpacity>
        </View>
      );
    }

    return (
      <View style={styles.emptyState}>
        <Text style={styles.emptyStateIcon}>📭</Text>
        <Text style={styles.emptyStateTitle}>No Notifications</Text>
        <Text style={styles.emptyStateMessage}>
          You're all caught up! Check back later for updates.
        </Text>
      </View>
    );
  };

  /**
   * Render error state
   */
  if (error) {
    return (
      <SafeAreaView style={styles.container}>
        <View style={styles.errorState}>
          <Text style={styles.errorIcon}>⚠️</Text>
          <Text style={styles.errorTitle}>Something went wrong</Text>
          <Text style={styles.errorMessage}>{error}</Text>
          <TouchableOpacity style={styles.retryButton} onPress={refresh}>
            <Text style={styles.retryButtonText}>Retry</Text>
          </TouchableOpacity>
        </View>
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView style={styles.container}>
      {/* Header */}
      <View style={styles.header}>
        <Text style={styles.headerTitle}>Notifications</Text>
        {unreadCount > 0 && (
          <View style={styles.unreadBadge}>
            <Text style={styles.unreadBadgeText}>{unreadCount}</Text>
          </View>
        )}
      </View>

      {/* Action buttons */}
      {notifications.length > 0 && (
        <View style={styles.actionBar}>
          <TouchableOpacity
            style={styles.actionButton}
            onPress={handleMarkAllAsRead}
            disabled={unreadCount === 0}>
            <Text
              style={[
                styles.actionButtonText,
                unreadCount === 0 && styles.actionButtonTextDisabled,
              ]}>
              Mark All Read
            </Text>
          </TouchableOpacity>

          <TouchableOpacity
            style={styles.actionButton}
            onPress={handleClearAll}>
            <Text style={[styles.actionButtonText, styles.actionButtonDanger]}>
              Clear All
            </Text>
          </TouchableOpacity>
        </View>
      )}

      {/* Notifications list */}
      <FlatList
        data={notifications}
        keyExtractor={item => item.id}
        renderItem={({item}) => (
          <NotificationItem
            notification={item}
            onPress={() => handleNotificationPress(item)}
            onMarkAsRead={() => handleMarkAsRead(item.id)}
          />
        )}
        ListEmptyComponent={renderEmptyState}
        refreshControl={
          <RefreshControl refreshing={isLoading} onRefresh={refresh} />
        }
        contentContainerStyle={
          notifications.length === 0 && styles.emptyListContent
        }
      />
    </SafeAreaView>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#f5f5f5',
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 16,
    paddingVertical: 12,
    backgroundColor: '#fff',
    borderBottomWidth: 1,
    borderBottomColor: '#e0e0e0',
  },
  headerTitle: {
    fontSize: 24,
    fontWeight: 'bold',
    color: '#000',
  },
  unreadBadge: {
    marginLeft: 8,
    backgroundColor: '#ff4444',
    borderRadius: 12,
    paddingHorizontal: 8,
    paddingVertical: 2,
    minWidth: 24,
    alignItems: 'center',
  },
  unreadBadgeText: {
    color: '#fff',
    fontSize: 12,
    fontWeight: 'bold',
  },
  actionBar: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    paddingHorizontal: 16,
    paddingVertical: 8,
    backgroundColor: '#fff',
    borderBottomWidth: 1,
    borderBottomColor: '#e0e0e0',
  },
  actionButton: {
    paddingVertical: 8,
    paddingHorizontal: 12,
  },
  actionButtonText: {
    fontSize: 14,
    color: '#007AFF',
    fontWeight: '600',
  },
  actionButtonTextDisabled: {
    color: '#999',
  },
  actionButtonDanger: {
    color: '#ff4444',
  },
  notificationItem: {
    flexDirection: 'row',
    backgroundColor: '#fff',
    paddingHorizontal: 16,
    paddingVertical: 12,
    borderBottomWidth: 1,
    borderBottomColor: '#e0e0e0',
    alignItems: 'flex-start',
  },
  notificationItemUnread: {
    backgroundColor: '#f0f8ff',
  },
  notificationIcon: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: '#f5f5f5',
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: 12,
  },
  notificationIconText: {
    fontSize: 20,
  },
  notificationContent: {
    flex: 1,
  },
  notificationTitle: {
    fontSize: 16,
    fontWeight: '600',
    color: '#000',
    marginBottom: 4,
  },
  notificationBody: {
    fontSize: 14,
    color: '#666',
    marginBottom: 4,
    lineHeight: 20,
  },
  notificationTime: {
    fontSize: 12,
    color: '#999',
  },
  markAsReadButton: {
    padding: 8,
  },
  unreadDot: {
    width: 10,
    height: 10,
    borderRadius: 5,
    backgroundColor: '#007AFF',
  },
  emptyListContent: {
    flexGrow: 1,
  },
  emptyState: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: 32,
  },
  emptyStateIcon: {
    fontSize: 64,
    marginBottom: 16,
  },
  emptyStateTitle: {
    fontSize: 20,
    fontWeight: 'bold',
    color: '#000',
    marginBottom: 8,
  },
  emptyStateMessage: {
    fontSize: 16,
    color: '#666',
    textAlign: 'center',
    lineHeight: 24,
    marginBottom: 24,
  },
  enableButton: {
    backgroundColor: '#007AFF',
    paddingHorizontal: 24,
    paddingVertical: 12,
    borderRadius: 8,
  },
  enableButtonText: {
    color: '#fff',
    fontSize: 16,
    fontWeight: '600',
  },
  errorState: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: 32,
  },
  errorIcon: {
    fontSize: 64,
    marginBottom: 16,
  },
  errorTitle: {
    fontSize: 20,
    fontWeight: 'bold',
    color: '#000',
    marginBottom: 8,
  },
  errorMessage: {
    fontSize: 16,
    color: '#666',
    textAlign: 'center',
    lineHeight: 24,
    marginBottom: 24,
  },
  retryButton: {
    backgroundColor: '#007AFF',
    paddingHorizontal: 24,
    paddingVertical: 12,
    borderRadius: 8,
  },
  retryButtonText: {
    color: '#fff',
    fontSize: 16,
    fontWeight: '600',
  },
});

export default NotificationCenterScreen;
