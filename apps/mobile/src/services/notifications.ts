/**
 * Firebase Cloud Messaging Service
 * Handles push notification setup, permissions, and message handling
 */

import messaging, {
  FirebaseMessagingTypes,
} from '@react-native-firebase/messaging';
import {Platform} from 'react-native';
import axios from 'axios';
import AsyncStorage from '@react-native-async-storage/async-storage';

const API_BASE_URL = process.env.API_URL || 'http://localhost:3000';

export interface NotificationPayload {
  type: 'meeting_ready' | 'action_item' | 'comment_reply' | 'weekly_summary';
  title: string;
  body: string;
  data?: Record<string, any>;
}

class NotificationService {
  private fcmToken: string | null = null;
  private initialized: boolean = false;

  /**
   * Initialize Firebase Cloud Messaging
   * Requests permissions and sets up message handlers
   */
  async initialize(): Promise<void> {
    if (this.initialized) {
      return;
    }

    try {
      // Request permission
      const authStatus = await this.requestPermission();
      if (!authStatus) {
        console.warn('Notification permission denied');
        return;
      }

      // Get FCM token
      await this.getFCMToken();

      // Setup message handlers
      this.setupMessageHandlers();

      this.initialized = true;
      console.log('Notification service initialized');
    } catch (error) {
      console.error('Failed to initialize notification service:', error);
      throw error;
    }
  }

  /**
   * Request notification permissions from the user
   * @returns true if permission granted, false otherwise
   */
  async requestPermission(): Promise<boolean> {
    try {
      const authStatus = await messaging().requestPermission();
      const enabled =
        authStatus === messaging.AuthorizationStatus.AUTHORIZED ||
        authStatus === messaging.AuthorizationStatus.PROVISIONAL;

      if (enabled) {
        console.log('Notification permission granted:', authStatus);
      } else {
        console.log('Notification permission denied');
      }

      return enabled;
    } catch (error) {
      console.error('Error requesting notification permission:', error);
      return false;
    }
  }

  /**
   * Get FCM token and register with backend
   */
  async getFCMToken(): Promise<string | null> {
    try {
      // Check if already registered
      const token = await messaging().getToken();
      this.fcmToken = token;

      console.log('FCM Token:', token);

      // Register token with backend
      await this.registerTokenWithBackend(token);

      // Listen for token refresh
      messaging().onTokenRefresh(async newToken => {
        console.log('FCM Token refreshed:', newToken);
        this.fcmToken = newToken;
        await this.registerTokenWithBackend(newToken);
      });

      return token;
    } catch (error) {
      console.error('Error getting FCM token:', error);
      return null;
    }
  }

  /**
   * Register FCM token with backend API
   */
  private async registerTokenWithBackend(token: string): Promise<void> {
    try {
      const authToken = await AsyncStorage.getItem('authToken');
      if (!authToken) {
        console.warn('No auth token found, skipping token registration');
        return;
      }

      await axios.post(
        `${API_BASE_URL}/api/notifications/register`,
        {
          token,
          platform: Platform.OS,
          deviceId: await this.getDeviceId(),
          appVersion: '1.0.0', // Replace with actual app version
        },
        {
          headers: {
            Authorization: `Bearer ${authToken}`,
          },
        }
      );

      console.log('FCM token registered with backend');
    } catch (error) {
      console.error('Failed to register token with backend:', error);
    }
  }

  /**
   * Get unique device identifier
   */
  private async getDeviceId(): Promise<string> {
    try {
      let deviceId = await AsyncStorage.getItem('deviceId');
      if (!deviceId) {
        deviceId = `${Platform.OS}-${Date.now()}-${Math.random()
          .toString(36)
          .substring(7)}`;
        await AsyncStorage.setItem('deviceId', deviceId);
      }
      return deviceId;
    } catch (error) {
      console.error('Error getting device ID:', error);
      return 'unknown';
    }
  }

  /**
   * Setup message handlers for foreground, background, and quit state
   */
  private setupMessageHandlers(): void {
    // Handle foreground messages
    messaging().onMessage(this.handleForegroundMessage);

    // Handle background messages (app in background)
    messaging().setBackgroundMessageHandler(this.handleBackgroundMessage);

    // Handle notification opened app (from background or quit state)
    messaging().onNotificationOpenedApp(this.handleNotificationOpen);

    // Check if app was opened from a notification (quit state)
    messaging()
      .getInitialNotification()
      .then(remoteMessage => {
        if (remoteMessage) {
          console.log('App opened from quit state by notification');
          this.handleNotificationOpen(remoteMessage);
        }
      });
  }

  /**
   * Handle foreground notification
   */
  private handleForegroundMessage = async (
    remoteMessage: FirebaseMessagingTypes.RemoteMessage
  ): Promise<void> => {
    console.log('Foreground notification received:', remoteMessage);

    // Display local notification
    // You could use react-native-push-notification or similar
    // For now, we'll just log it
    const {notification, data} = remoteMessage;

    if (notification) {
      console.log('Notification title:', notification.title);
      console.log('Notification body:', notification.body);
    }

    if (data) {
      console.log('Notification data:', data);
      // Handle notification data
      await this.handleNotificationData(data);
    }
  };

  /**
   * Handle background notification
   */
  private handleBackgroundMessage = async (
    remoteMessage: FirebaseMessagingTypes.RemoteMessage
  ): Promise<void> => {
    console.log('Background notification received:', remoteMessage);

    const {data} = remoteMessage;
    if (data) {
      await this.handleNotificationData(data);
    }
  };

  /**
   * Handle notification tap (app opened from notification)
   */
  private handleNotificationOpen = (
    remoteMessage: FirebaseMessagingTypes.RemoteMessage
  ): void => {
    console.log('Notification opened app:', remoteMessage);

    const {data} = remoteMessage;
    if (data) {
      this.navigateFromNotification(data);
    }
  };

  /**
   * Handle notification data and update app state
   */
  private async handleNotificationData(
    data: Record<string, any>
  ): Promise<void> {
    const {type, meetingId, actionItemId, commentId} = data;

    console.log('Processing notification data:', {
      type,
      meetingId,
      actionItemId,
      commentId,
    });

    // Store notification in local storage for notification center
    try {
      const notifications = await this.getStoredNotifications();
      notifications.unshift({
        id: Date.now().toString(),
        type,
        data,
        timestamp: new Date().toISOString(),
        read: false,
      });

      // Keep only last 100 notifications
      const trimmedNotifications = notifications.slice(0, 100);
      await AsyncStorage.setItem(
        'notifications',
        JSON.stringify(trimmedNotifications)
      );
    } catch (error) {
      console.error('Failed to store notification:', error);
    }
  }

  /**
   * Navigate to appropriate screen based on notification data
   */
  private navigateFromNotification(data: Record<string, any>): void {
    const {type, meetingId, actionItemId, commentId} = data;

    // This will be handled by the navigation service
    // For now, just log the navigation intent
    console.log('Navigation intent from notification:', {
      type,
      meetingId,
      actionItemId,
      commentId,
    });

    // You would typically use NavigationRef to navigate here
    // Example: NavigationRef.navigate('MeetingDetails', { meetingId });
  }

  /**
   * Get stored notifications from local storage
   */
  async getStoredNotifications(): Promise<any[]> {
    try {
      const stored = await AsyncStorage.getItem('notifications');
      return stored ? JSON.parse(stored) : [];
    } catch (error) {
      console.error('Failed to get stored notifications:', error);
      return [];
    }
  }

  /**
   * Mark notification as read
   */
  async markNotificationAsRead(notificationId: string): Promise<void> {
    try {
      const notifications = await this.getStoredNotifications();
      const updated = notifications.map(n =>
        n.id === notificationId ? {...n, read: true} : n
      );
      await AsyncStorage.setItem('notifications', JSON.stringify(updated));
    } catch (error) {
      console.error('Failed to mark notification as read:', error);
    }
  }

  /**
   * Clear all notifications
   */
  async clearAllNotifications(): Promise<void> {
    try {
      await AsyncStorage.setItem('notifications', JSON.stringify([]));
    } catch (error) {
      console.error('Failed to clear notifications:', error);
    }
  }

  /**
   * Get unread notification count
   */
  async getUnreadCount(): Promise<number> {
    try {
      const notifications = await this.getStoredNotifications();
      return notifications.filter(n => !n.read).length;
    } catch (error) {
      console.error('Failed to get unread count:', error);
      return 0;
    }
  }

  /**
   * Unregister device token
   */
  async unregister(): Promise<void> {
    try {
      if (!this.fcmToken) {
        return;
      }

      const authToken = await AsyncStorage.getItem('authToken');
      if (!authToken) {
        return;
      }

      await axios.delete(`${API_BASE_URL}/api/notifications/register`, {
        headers: {
          Authorization: `Bearer ${authToken}`,
        },
        data: {
          token: this.fcmToken,
        },
      });

      // Delete FCM token
      await messaging().deleteToken();
      this.fcmToken = null;
      this.initialized = false;

      console.log('Device token unregistered');
    } catch (error) {
      console.error('Failed to unregister device token:', error);
    }
  }

  /**
   * Check if notifications are enabled
   */
  async isEnabled(): Promise<boolean> {
    try {
      const authStatus = await messaging().hasPermission();
      return (
        authStatus === messaging.AuthorizationStatus.AUTHORIZED ||
        authStatus === messaging.AuthorizationStatus.PROVISIONAL
      );
    } catch (error) {
      console.error('Failed to check notification status:', error);
      return false;
    }
  }

  /**
   * Get current FCM token
   */
  getToken(): string | null {
    return this.fcmToken;
  }
}

// Export singleton instance
export default new NotificationService();
