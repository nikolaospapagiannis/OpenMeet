/**
 * WebSocket Service for Real-time Updates
 * Handles real-time communication for live transcription, notifications, and updates
 */

import { io, Socket } from 'socket.io-client';

interface WebSocketConfig {
  url: string;
  autoConnect?: boolean;
  reconnection?: boolean;
  reconnectionAttempts?: number;
  reconnectionDelay?: number;
}

interface TranscriptSegment {
  id: string;
  speaker: string;
  text: string;
  startTime: number;
  endTime: number;
  confidence: number;
}

interface MeetingUpdate {
  meetingId: string;
  type: 'status' | 'transcript' | 'attendee' | 'recording';
  data: any;
}

interface Notification {
  id: string;
  type: 'info' | 'success' | 'warning' | 'error';
  title: string;
  message: string;
  timestamp: string;
  read?: boolean;
}

class WebSocketService {
  private socket: Socket | null = null;
  private config: WebSocketConfig;
  private listeners: Map<string, Set<Function>> = new Map();
  private reconnectTimer: NodeJS.Timeout | null = null;
  private isConnected: boolean = false;
  private currentMeetingId: string | null = null;

  constructor(config?: Partial<WebSocketConfig>) {
    this.config = {
      url: process.env.NEXT_PUBLIC_WS_URL || 'ws://localhost:3002',
      autoConnect: true,
      reconnection: true,
      reconnectionAttempts: 5,
      reconnectionDelay: 5000,
      ...config
    };

    if (this.config.autoConnect) {
      this.connect();
    }
  }

  /**
   * Connect to WebSocket server
   */
  connect(): void {
    if (this.socket?.connected) {
      console.log('WebSocket already connected');
      return;
    }

    this.socket = io(this.config.url, {
      transports: ['websocket'],
      reconnection: this.config.reconnection,
      reconnectionAttempts: this.config.reconnectionAttempts,
      reconnectionDelay: this.config.reconnectionDelay,
      auth: {
        token: this.getAuthToken()
      }
    });

    this.setupEventHandlers();
  }

  /**
   * Disconnect from WebSocket server
   */
  disconnect(): void {
    if (this.socket) {
      this.socket.disconnect();
      this.socket = null;
      this.isConnected = false;
    }

    if (this.reconnectTimer) {
      clearTimeout(this.reconnectTimer);
      this.reconnectTimer = null;
    }
  }

  /**
   * Setup WebSocket event handlers
   */
  private setupEventHandlers(): void {
    if (!this.socket) return;

    // Connection events
    this.socket.on('connect', () => {
      console.log('WebSocket connected');
      this.isConnected = true;
      this.emit('connection', { status: 'connected' });

      // Rejoin meeting room if was previously connected
      if (this.currentMeetingId) {
        this.joinMeeting(this.currentMeetingId);
      }
    });

    this.socket.on('disconnect', (reason) => {
      console.log('WebSocket disconnected:', reason);
      this.isConnected = false;
      this.emit('connection', { status: 'disconnected', reason });

      // Auto-reconnect if not manual disconnect
      if (reason !== 'io client disconnect' && this.config.reconnection) {
        this.scheduleReconnect();
      }
    });

    this.socket.on('error', (error) => {
      console.error('WebSocket error:', error);
      this.emit('error', error);
    });

    // Meeting events
    this.socket.on('meeting:update', (data: MeetingUpdate) => {
      this.emit('meeting:update', data);
    });

    this.socket.on('meeting:started', (data) => {
      this.emit('meeting:started', data);
    });

    this.socket.on('meeting:ended', (data) => {
      this.emit('meeting:ended', data);
    });

    // Transcription events
    this.socket.on('transcript:segment', (segment: TranscriptSegment) => {
      this.emit('transcript:segment', segment);
    });

    this.socket.on('transcript:complete', (data) => {
      this.emit('transcript:complete', data);
    });

    this.socket.on('transcript:speaker', (data) => {
      this.emit('transcript:speaker', data);
    });

    // AI Analysis events
    this.socket.on('analysis:update', (data) => {
      this.emit('analysis:update', data);
    });

    this.socket.on('analysis:complete', (data) => {
      this.emit('analysis:complete', data);
    });

    this.socket.on('analysis:action_item', (data) => {
      this.emit('analysis:action_item', data);
    });

    // Notification events
    this.socket.on('notification', (notification: Notification) => {
      this.emit('notification', notification);
    });

    // Recording events
    this.socket.on('recording:started', (data) => {
      this.emit('recording:started', data);
    });

    this.socket.on('recording:stopped', (data) => {
      this.emit('recording:stopped', data);
    });

    this.socket.on('recording:progress', (data) => {
      this.emit('recording:progress', data);
    });

    // Collaboration events
    this.socket.on('user:joined', (data) => {
      this.emit('user:joined', data);
    });

    this.socket.on('user:left', (data) => {
      this.emit('user:left', data);
    });

    this.socket.on('user:typing', (data) => {
      this.emit('user:typing', data);
    });
  }

  /**
   * Schedule reconnection attempt
   */
  private scheduleReconnect(): void {
    if (this.reconnectTimer) return;

    this.reconnectTimer = setTimeout(() => {
      this.reconnectTimer = null;
      if (!this.isConnected) {
        console.log('Attempting to reconnect WebSocket...');
        this.connect();
      }
    }, this.config.reconnectionDelay);
  }

  /**
   * Get authentication token
   */
  private getAuthToken(): string | null {
    if (typeof window !== 'undefined') {
      return localStorage.getItem('access_token');
    }
    return null;
  }

  /**
   * Subscribe to an event
   */
  on(event: string, callback: Function): void {
    if (!this.listeners.has(event)) {
      this.listeners.set(event, new Set());
    }
    this.listeners.get(event)?.add(callback);
  }

  /**
   * Unsubscribe from an event
   */
  off(event: string, callback: Function): void {
    this.listeners.get(event)?.delete(callback);
  }

  /**
   * Emit an event to local listeners
   */
  private emit(event: string, data: any): void {
    this.listeners.get(event)?.forEach(callback => {
      try {
        callback(data);
      } catch (error) {
        console.error(`Error in WebSocket listener for ${event}:`, error);
      }
    });
  }

  /**
   * Send a message to the server
   */
  send(event: string, data: any): void {
    if (!this.socket?.connected) {
      console.warn('WebSocket not connected, cannot send message');
      return;
    }
    this.socket.emit(event, data);
  }

  /**
   * Join a meeting room for real-time updates
   */
  joinMeeting(meetingId: string): void {
    this.currentMeetingId = meetingId;
    this.send('meeting:join', { meetingId });
  }

  /**
   * Leave a meeting room
   */
  leaveMeeting(meetingId: string): void {
    if (this.currentMeetingId === meetingId) {
      this.currentMeetingId = null;
    }
    this.send('meeting:leave', { meetingId });
  }

  /**
   * Start recording a meeting
   */
  startRecording(meetingId: string): void {
    this.send('recording:start', { meetingId });
  }

  /**
   * Stop recording a meeting
   */
  stopRecording(meetingId: string): void {
    this.send('recording:stop', { meetingId });
  }

  /**
   * Send a typing indicator
   */
  sendTypingIndicator(meetingId: string, isTyping: boolean): void {
    this.send('user:typing', { meetingId, isTyping });
  }

  /**
   * Mark notification as read
   */
  markNotificationAsRead(notificationId: string): void {
    this.send('notification:read', { notificationId });
  }

  /**
   * Request meeting sync
   */
  requestMeetingSync(meetingId: string): void {
    this.send('meeting:sync', { meetingId });
  }

  /**
   * Get connection status
   */
  isConnectedStatus(): boolean {
    return this.isConnected;
  }

  /**
   * Get WebSocket instance (for advanced usage)
   */
  getSocket(): Socket | null {
    return this.socket;
  }
}

// Create singleton instance
const wsService = new WebSocketService();

// Export service and types
export default wsService;
export type { 
  WebSocketConfig, 
  TranscriptSegment, 
  MeetingUpdate, 
  Notification 
};
