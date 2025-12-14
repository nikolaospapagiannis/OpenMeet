/**
 * Shared TypeScript Types
 */

// User types
export interface User {
  id: string;
  email: string;
  firstName: string | null;
  lastName: string | null;
  avatarUrl: string | null;
  role: 'user' | 'admin' | 'super_admin';
  organizationId: string | null;
  createdAt: Date;
  updatedAt: Date;
}

// Meeting types
export interface Meeting {
  id: string;
  title: string;
  description: string | null;
  scheduledStartAt: Date | null;
  actualStartAt: Date | null;
  actualEndAt: Date | null;
  durationSeconds: number | null;
  status: 'scheduled' | 'in_progress' | 'completed' | 'failed' | 'processing';
  organizationId: string;
  userId: string;
  participants: MeetingParticipant[];
  createdAt: Date;
  updatedAt: Date;
}

export interface MeetingParticipant {
  id: string;
  meetingId: string;
  userId: string | null;
  email: string | null;
  name: string | null;
  role: string;
  joinedAt: Date | null;
  leftAt: Date | null;
  talkTimeSeconds: number;
}

// Transcription types
export interface Transcript {
  id: string;
  meetingId: string;
  language: string;
  wordCount: number | null;
  confidenceScore: number | null;
  isFinal: boolean;
  createdAt: Date;
  updatedAt: Date;
}

export interface TranscriptSegment {
  id: string;
  speaker: string;
  speakerId: string | null;
  text: string;
  startTime: number;
  endTime: number;
  confidence: number;
  words: TranscriptWord[];
}

export interface TranscriptWord {
  word: string;
  startTime: number;
  endTime: number;
  confidence: number;
}

// Summary types
export interface MeetingSummary {
  id: string;
  meetingId: string;
  title: string | null;
  overview: string | null;
  keyPoints: string[];
  actionItems: ActionItem[];
  decisions: Decision[];
  questions: string[];
  createdAt: Date;
}

export interface ActionItem {
  id: string;
  task: string;
  assignee: string | null;
  dueDate: Date | null;
  priority: 'low' | 'medium' | 'high';
  status: 'pending' | 'in_progress' | 'completed';
}

export interface Decision {
  id: string;
  title: string;
  description: string;
  madeBy: string;
  timestamp: Date;
}

// Analytics types
export interface MeetingAnalytics {
  id: string;
  meetingId: string;
  participantCount: number;
  totalTalkTime: number;
  avgSentiment: number | null;
  topicsDiscussed: string[];
  questionCount: number;
  interruptionCount: number;
}

export interface SpeakerAnalytics {
  name: string;
  email: string | null;
  talkTimeSeconds: number;
  talkTimePercentage: number;
  wordCount: number;
  questionCount: number;
  sentiment: number;
}

// Integration types
export interface Integration {
  id: string;
  type: 'zoom' | 'teams' | 'meet' | 'slack' | 'salesforce' | 'hubspot';
  organizationId: string;
  userId: string;
  credentials: Record<string, any>;
  isActive: boolean;
  lastSyncedAt: Date | null;
  createdAt: Date;
}

// API Response types
export interface ApiResponse<T = any> {
  data?: T;
  error?: string;
  message?: string;
  success: boolean;
}

export interface PaginatedResponse<T> {
  data: T[];
  total: number;
  page: number;
  pageSize: number;
  hasMore: boolean;
}

// WebSocket event types
export interface WSEvent<T = any> {
  event: string;
  payload: T;
  timestamp: Date;
}

export interface WSTranscriptionUpdate {
  meetingId: string;
  segment: TranscriptSegment;
}

export interface WSMeetingUpdate {
  meetingId: string;
  status: Meeting['status'];
  participants?: MeetingParticipant[];
}

// Notification types
export interface Notification {
  id: string;
  userId: string;
  type: string;
  channel: 'email' | 'sms' | 'push' | 'in_app';
  title: string;
  message: string;
  data: Record<string, any>;
  readAt: Date | null;
  createdAt: Date;
}

// Billing types
export interface Subscription {
  id: string;
  organizationId: string;
  tier: 'free' | 'pro' | 'business' | 'enterprise';
  status: 'active' | 'canceled' | 'past_due' | 'trialing';
  currentPeriodStart: Date;
  currentPeriodEnd: Date;
  cancelAt: Date | null;
}

export interface UsageMetric {
  organizationId: string;
  metricType: string;
  quantity: number;
  timestamp: Date;
}
