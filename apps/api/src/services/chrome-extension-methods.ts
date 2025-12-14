/**
 * Additional methods for ChromeExtensionService
 * These will be merged into the main class
 */

import { PrismaClient } from '@prisma/client';
import { logger } from '../utils/logger';

const prisma = new PrismaClient();

// Types
export interface ExtensionSettings {
  userId: string;
  autoRecordMeetings: boolean;
  recordAudio: boolean;
  recordVideo: boolean;
  captureSlides: boolean;
  enableLiveCaptions: boolean;
  defaultMeetingPrivacy: 'private' | 'team' | 'organization';
  excludedDomains: string[];
  notificationPreferences: {
    showRecordingIndicator: boolean;
    notifyOnMeetingEnd: boolean;
    notifyOnTranscriptReady: boolean;
  };
}

export interface ExtensionSession {
  id: string;
  userId: string;
  organizationId: string;
  meetingId?: string;
  platform: 'zoom' | 'google_meet' | 'microsoft_teams' | 'webex' | 'other';
  meetingUrl: string;
  meetingTitle?: string;
  startedAt: Date;
  endedAt?: Date;
  status: 'recording' | 'processing' | 'completed' | 'failed';
  audioChunks: number;
  transcriptSegments: number;
  capturedSlides: number;
}

/**
 * Check database connectivity
 */
export async function checkDatabaseConnection(): Promise<'healthy' | 'degraded' | 'unhealthy'> {
  try {
    await prisma.$queryRaw`SELECT 1`;
    return 'healthy';
  } catch (error) {
    logger.error('Database health check failed', { error });
    return 'unhealthy';
  }
}

/**
 * Check storage availability
 */
export async function checkStorageAvailability(): Promise<'healthy' | 'degraded' | 'unhealthy'> {
  try {
    if (!process.env.AWS_ACCESS_KEY_ID || !process.env.AWS_SECRET_ACCESS_KEY) {
      return 'degraded';
    }
    return 'healthy';
  } catch (error) {
    logger.error('Storage health check failed', { error });
    return 'unhealthy';
  }
}

/**
 * Check transcription service
 */
export async function checkTranscriptionService(): Promise<'healthy' | 'degraded' | 'unhealthy'> {
  try {
    if (!process.env.OPENAI_API_KEY) {
      return 'degraded';
    }
    return 'healthy';
  } catch (error) {
    logger.error('Transcription service health check failed', { error });
    return 'unhealthy';
  }
}

/**
 * Get active user count from session map
 */
export function getActiveUserCountFromSessions(
  activeSessions: Map<string, ExtensionSession>
): number {
  const activeUserIds = new Set<string>();
  for (const session of activeSessions.values()) {
    if (session.status === 'recording') {
      activeUserIds.add(session.userId);
    }
  }
  return activeUserIds.size;
}

/**
 * Store error report
 */
export async function storeErrorReport(report: {
  userId: string;
  error: any;
  context?: any;
  userAgent?: string;
  extensionVersion?: string;
  timestamp: Date;
}): Promise<void> {
  try {
    const user = await prisma.user.findUnique({
      where: { id: report.userId },
      select: { organizationId: true },
    });

    await prisma.auditLog.create({
      data: {
        userId: report.userId,
        organizationId: user?.organizationId,
        action: 'extension_error',
        actionLabel: 'Chrome Extension Error Report',
        resourceType: 'extension',
        status: 'failure',
        userAgent: report.userAgent,
        requestBody: {
          error: report.error,
          context: report.context,
          extensionVersion: report.extensionVersion,
        },
        metadata: {
          extensionVersion: report.extensionVersion,
          errorType: report.error?.name || 'UnknownError',
          errorMessage: report.error?.message || 'Unknown error',
        },
        createdAt: report.timestamp,
      },
    });

    logger.info('Extension error report stored', { userId: report.userId });
  } catch (error) {
    logger.error('Error storing extension error report', { error });
    throw error;
  }
}

/**
 * Get user recording history
 */
export async function getUserRecordingHistory(
  userId: string,
  options: { limit?: number; offset?: number; platform?: string }
): Promise<Array<{
  id: string;
  title: string;
  platform: string;
  startedAt: Date;
  endedAt: Date | null;
  duration: number;
  status: string;
  transcriptAvailable: boolean;
  summaryAvailable: boolean;
}>> {
  try {
    const { limit = 20, offset = 0, platform } = options;

    const meetings = await prisma.meeting.findMany({
      where: {
        userId,
        recordingSource: 'extension',
        ...(platform && { platform }),
      },
      orderBy: { createdAt: 'desc' },
      take: limit,
      skip: offset,
      include: {
        transcripts: { select: { id: true }, take: 1 },
        summaries: { select: { id: true }, take: 1 },
      },
    });

    return meetings.map(meeting => ({
      id: meeting.id,
      title: meeting.title,
      platform: meeting.platform || 'unknown',
      startedAt: meeting.scheduledStartAt || meeting.createdAt,
      endedAt: meeting.actualEndAt,
      duration: meeting.durationSeconds || 0,
      status: meeting.status,
      transcriptAvailable: meeting.transcripts.length > 0,
      summaryAvailable: meeting.summaries.length > 0,
    }));
  } catch (error) {
    logger.error('Error getting user recording history', { error, userId });
    throw error;
  }
}

/**
 * Get session details
 */
export async function getSessionDetails(
  sessionId: string,
  userId: string,
  activeSessions: Map<string, ExtensionSession>
): Promise<{
  id: string;
  meetingId: string | undefined;
  platform: string;
  meetingUrl: string;
  meetingTitle: string | undefined;
  startedAt: Date;
  endedAt: Date | undefined;
  status: string;
  audioChunks: number;
  transcriptSegments: number;
  capturedSlides: number;
  duration: number;
  participants: Array<{ name: string; email?: string; role: string }>;
} | null> {
  try {
    const activeSession = activeSessions.get(sessionId);
    if (activeSession && activeSession.userId === userId) {
      const duration = Math.floor((Date.now() - activeSession.startedAt.getTime()) / 1000);
      let participants: Array<{ name: string; email?: string; role: string }> = [];
      if (activeSession.meetingId) {
        const meetingParticipants = await prisma.meetingParticipant.findMany({
          where: { meetingId: activeSession.meetingId },
          select: { name: true, email: true, role: true },
        });
        participants = meetingParticipants.map(p => ({
          name: p.name,
          email: p.email || undefined,
          role: p.role,
        }));
      }
      return {
        id: activeSession.id,
        meetingId: activeSession.meetingId,
        platform: activeSession.platform,
        meetingUrl: activeSession.meetingUrl,
        meetingTitle: activeSession.meetingTitle,
        startedAt: activeSession.startedAt,
        endedAt: activeSession.endedAt,
        status: activeSession.status,
        audioChunks: activeSession.audioChunks,
        transcriptSegments: activeSession.transcriptSegments,
        capturedSlides: activeSession.capturedSlides,
        duration,
        participants,
      };
    }

    const meeting = await prisma.meeting.findFirst({
      where: {
        userId,
        metadata: { path: ['extensionSessionId'], equals: sessionId },
      },
      include: {
        participants: { select: { name: true, email: true, role: true } },
      },
    });

    if (!meeting) return null;

    const metadata = meeting.metadata as any;
    return {
      id: sessionId,
      meetingId: meeting.id,
      platform: (metadata?.platform as string) || meeting.platform || 'unknown',
      meetingUrl: meeting.meetingUrl || '',
      meetingTitle: meeting.title,
      startedAt: meeting.scheduledStartAt || meeting.createdAt,
      endedAt: meeting.actualEndAt || undefined,
      status: metadata?.extensionStatus || meeting.status,
      audioChunks: metadata?.audioChunks || 0,
      transcriptSegments: metadata?.transcriptSegments || 0,
      capturedSlides: metadata?.capturedSlides || 0,
      duration: meeting.durationSeconds || 0,
      participants: meeting.participants.map(p => ({
        name: p.name,
        email: p.email || undefined,
        role: p.role,
      })),
    };
  } catch (error) {
    logger.error('Error getting session details', { error, sessionId });
    throw error;
  }
}

/**
 * Update session metadata
 */
export async function updateSessionMetadata(
  sessionId: string,
  userId: string,
  updates: { title?: string; participants?: Array<{ name: string; email?: string }>; tags?: string[]; notes?: string }
): Promise<{ id: string; title: string; tags: string[]; notes: string; updatedAt: Date }> {
  try {
    const meeting = await prisma.meeting.findFirst({
      where: {
        userId,
        OR: [
          { metadata: { path: ['extensionSessionId'], equals: sessionId } },
          { id: sessionId },
        ],
      },
    });

    if (!meeting) throw new Error('Session not found');

    const updatedMeeting = await prisma.meeting.update({
      where: { id: meeting.id },
      data: {
        ...(updates.title && { title: updates.title }),
        metadata: {
          ...(meeting.metadata as any),
          ...(updates.tags && { tags: updates.tags }),
          ...(updates.notes && { notes: updates.notes }),
        },
      },
    });

    if (updates.participants && updates.participants.length > 0) {
      await prisma.meetingParticipant.deleteMany({ where: { meetingId: meeting.id } });
      for (const participant of updates.participants) {
        await prisma.meetingParticipant.create({
          data: { meetingId: meeting.id, name: participant.name, email: participant.email, role: 'attendee' },
        });
      }
    }

    const metadata = updatedMeeting.metadata as any;
    logger.info('Session metadata updated', { sessionId, meetingId: meeting.id });

    return {
      id: sessionId,
      title: updatedMeeting.title,
      tags: metadata?.tags || [],
      notes: metadata?.notes || '',
      updatedAt: updatedMeeting.updatedAt,
    };
  } catch (error) {
    logger.error('Error updating session metadata', { error, sessionId });
    throw error;
  }
}

/**
 * Delete session
 */
export async function deleteSession(
  sessionId: string,
  userId: string,
  activeSessions: Map<string, ExtensionSession>,
  audioBuffers: Map<string, Buffer[]>
): Promise<void> {
  try {
    const activeSession = activeSessions.get(sessionId);
    if (activeSession && activeSession.userId === userId) {
      activeSessions.delete(sessionId);
      audioBuffers.delete(sessionId);
    }

    const meeting = await prisma.meeting.findFirst({
      where: {
        userId,
        OR: [
          { metadata: { path: ['extensionSessionId'], equals: sessionId } },
          { id: sessionId },
        ],
      },
    });

    if (!meeting) throw new Error('Session not found');

    await prisma.meeting.delete({ where: { id: meeting.id } });
    logger.info('Session deleted', { sessionId, meetingId: meeting.id, userId });
  } catch (error) {
    logger.error('Error deleting session', { error, sessionId });
    throw error;
  }
}

/**
 * Get usage analytics
 */
export async function getUsageAnalytics(
  organizationId: string,
  period: string = '7d'
): Promise<{
  totalRecordings: number;
  totalDuration: number;
  avgDuration: number;
  recordingsByPlatform: Record<string, number>;
  recordingsByDay: Array<{ date: string; count: number; duration: number }>;
  topUsers: Array<{ userId: string; name: string; recordingCount: number }>;
  transcriptionStats: { totalWords: number; avgWordsPerMeeting: number };
}> {
  try {
    const days = parseInt(period) || 7;
    const startDate = new Date();
    startDate.setDate(startDate.getDate() - days);

    const meetings = await prisma.meeting.findMany({
      where: {
        organizationId,
        recordingSource: 'extension',
        createdAt: { gte: startDate },
      },
      include: {
        user: { select: { id: true, firstName: true, lastName: true } },
        transcripts: { select: { wordCount: true } },
      },
      orderBy: { createdAt: 'asc' },
    });

    const totalDuration = meetings.reduce((sum, m) => sum + (m.durationSeconds || 0), 0);
    const avgDuration = meetings.length > 0 ? Math.floor(totalDuration / meetings.length) : 0;

    const recordingsByPlatform: Record<string, number> = {};
    meetings.forEach(m => {
      const platform = m.platform || 'unknown';
      recordingsByPlatform[platform] = (recordingsByPlatform[platform] || 0) + 1;
    });

    const dailyStats = new Map<string, { count: number; duration: number }>();
    meetings.forEach(m => {
      const dateKey = m.createdAt.toISOString().split('T')[0];
      const existing = dailyStats.get(dateKey) || { count: 0, duration: 0 };
      existing.count++;
      existing.duration += m.durationSeconds || 0;
      dailyStats.set(dateKey, existing);
    });

    const recordingsByDay = Array.from(dailyStats.entries()).map(([date, stats]) => ({
      date, count: stats.count, duration: stats.duration,
    }));

    const userRecordings = new Map<string, { name: string; count: number }>();
    meetings.forEach(m => {
      if (m.user) {
        const userName = [m.user.firstName, m.user.lastName].filter(Boolean).join(' ') || 'Unknown';
        const existing = userRecordings.get(m.user.id) || { name: userName, count: 0 };
        existing.count++;
        userRecordings.set(m.user.id, existing);
      }
    });

    const topUsers = Array.from(userRecordings.entries())
      .map(([userId, data]) => ({ userId, name: data.name, recordingCount: data.count }))
      .sort((a, b) => b.recordingCount - a.recordingCount)
      .slice(0, 10);

    let totalWords = 0;
    meetings.forEach(m => {
      m.transcripts.forEach(t => { totalWords += t.wordCount || 0; });
    });

    return {
      totalRecordings: meetings.length,
      totalDuration,
      avgDuration,
      recordingsByPlatform,
      recordingsByDay,
      topUsers,
      transcriptionStats: {
        totalWords,
        avgWordsPerMeeting: meetings.length > 0 ? Math.floor(totalWords / meetings.length) : 0,
      },
    };
  } catch (error) {
    logger.error('Error getting usage analytics', { error, organizationId });
    throw error;
  }
}

/**
 * Sync user data
 */
export async function syncUserData(
  userId: string,
  getExtensionSettings: (userId: string) => Promise<ExtensionSettings>,
  getActiveSession: (userId: string) => Promise<ExtensionSession | null>
): Promise<{
  settings: ExtensionSettings;
  recentRecordings: number;
  activeSession: ExtensionSession | null;
  lastSyncAt: Date;
}> {
  try {
    const settings = await getExtensionSettings(userId);

    const thirtyDaysAgo = new Date();
    thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30);

    const recentRecordings = await prisma.meeting.count({
      where: {
        userId,
        recordingSource: 'extension',
        createdAt: { gte: thirtyDaysAgo },
      },
    });

    const activeSession = await getActiveSession(userId);

    const user = await prisma.user.findUnique({ where: { id: userId } });
    await prisma.user.update({
      where: { id: userId },
      data: {
        preferences: {
          ...(user?.preferences as any),
          extensionLastSync: new Date(),
        },
      },
    });

    logger.info('User data synced', { userId, recentRecordings });

    return {
      settings,
      recentRecordings,
      activeSession,
      lastSyncAt: new Date(),
    };
  } catch (error) {
    logger.error('Error syncing user data', { error, userId });
    throw error;
  }
}
