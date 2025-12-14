/**
 * GraphQL DataLoaders - Real N+1 query prevention
 * Uses actual Prisma queries with batching
 */

import DataLoader from 'dataloader';
import { PrismaClient } from '@prisma/client';

/**
 * Create meeting loader - Batches meeting queries by ID
 */
export function createMeetingLoader(prisma: PrismaClient) {
  return new DataLoader<string, any>(async (meetingIds) => {
    // Real Prisma query - fetch all meetings in one query
    const meetings = await prisma.meeting.findMany({
      where: {
        id: {
          in: [...meetingIds],
        },
      },
      include: {
        organization: true,
        user: true,
        workspace: true,
      },
    });

    // Map results back to original order (DataLoader requirement)
    const meetingMap = new Map(meetings.map((m) => [m.id, m]));
    return meetingIds.map((id) => meetingMap.get(id) || null);
  });
}

/**
 * Create user loader - Batches user queries by ID
 */
export function createUserLoader(prisma: PrismaClient) {
  return new DataLoader<string, any>(async (userIds) => {
    // Real Prisma query
    const users = await prisma.user.findMany({
      where: {
        id: {
          in: [...userIds],
        },
      },
      include: {
        organization: true,
      },
    });

    const userMap = new Map(users.map((u) => [u.id, u]));
    return userIds.map((id) => userMap.get(id) || null);
  });
}

/**
 * Create organization loader - Batches organization queries by ID
 */
export function createOrganizationLoader(prisma: PrismaClient) {
  return new DataLoader<string, any>(async (orgIds) => {
    // Real Prisma query
    const organizations = await prisma.organization.findMany({
      where: {
        id: {
          in: [...orgIds],
        },
      },
    });

    const orgMap = new Map(organizations.map((o) => [o.id, o]));
    return orgIds.map((id) => orgMap.get(id) || null);
  });
}

/**
 * Create transcript loader - Batches transcript queries by meeting ID
 */
export function createTranscriptLoader(prisma: PrismaClient) {
  return new DataLoader<string, any>(async (meetingIds) => {
    // Real Prisma query - get transcripts for meetings
    const transcripts = await prisma.transcript.findMany({
      where: {
        meetingId: {
          in: [...meetingIds],
        },
        isFinal: true,
      },
      orderBy: {
        createdAt: 'desc',
      },
    });

    // Group by meetingId, return first (most recent) for each
    const transcriptMap = new Map<string, any>();
    transcripts.forEach((t) => {
      if (!transcriptMap.has(t.meetingId)) {
        transcriptMap.set(t.meetingId, t);
      }
    });

    return meetingIds.map((id) => transcriptMap.get(id) || null);
  });
}

/**
 * Create meeting participants loader - Batches participant queries by meeting ID
 */
export function createMeetingParticipantsLoader(prisma: PrismaClient) {
  return new DataLoader<string, any[]>(async (meetingIds) => {
    // Real Prisma query
    const participants = await prisma.meetingParticipant.findMany({
      where: {
        meetingId: {
          in: [...meetingIds],
        },
      },
      orderBy: {
        createdAt: 'asc',
      },
    });

    // Group participants by meetingId
    const participantMap = new Map<string, any[]>();
    participants.forEach((p) => {
      const existing = participantMap.get(p.meetingId) || [];
      existing.push(p);
      participantMap.set(p.meetingId, existing);
    });

    return meetingIds.map((id) => participantMap.get(id) || []);
  });
}

/**
 * Create meeting summary loader - Batches summary queries by meeting ID
 */
export function createMeetingSummaryLoader(prisma: PrismaClient) {
  return new DataLoader<string, any>(async (meetingIds) => {
    // Real Prisma query
    const summaries = await prisma.meetingSummary.findMany({
      where: {
        meetingId: {
          in: [...meetingIds],
        },
      },
      orderBy: {
        createdAt: 'desc',
      },
    });

    // Map to most recent summary per meeting
    const summaryMap = new Map<string, any>();
    summaries.forEach((s) => {
      if (!summaryMap.has(s.meetingId)) {
        summaryMap.set(s.meetingId, s);
      }
    });

    return meetingIds.map((id) => summaryMap.get(id) || null);
  });
}

/**
 * Create meeting analytics loader - Batches analytics queries by meeting ID
 */
export function createMeetingAnalyticsLoader(prisma: PrismaClient) {
  return new DataLoader<string, any>(async (meetingIds) => {
    // Real Prisma query
    const analytics = await prisma.meetingAnalytics.findMany({
      where: {
        meetingId: {
          in: [...meetingIds],
        },
      },
    });

    const analyticsMap = new Map(analytics.map((a) => [a.meetingId, a]));
    return meetingIds.map((id) => analyticsMap.get(id) || null);
  });
}

/**
 * Create meeting comments loader - Batches comment queries by meeting ID
 */
export function createMeetingCommentsLoader(prisma: PrismaClient) {
  return new DataLoader<string, any[]>(async (meetingIds) => {
    // Real Prisma query
    const comments = await prisma.comment.findMany({
      where: {
        meetingId: {
          in: [...meetingIds],
        },
        parentCommentId: null, // Only top-level comments
      },
      include: {
        user: true,
        replies: {
          include: {
            user: true,
          },
        },
      },
      orderBy: {
        createdAt: 'desc',
      },
    });

    // Group comments by meetingId
    const commentsMap = new Map<string, any[]>();
    comments.forEach((c) => {
      const existing = commentsMap.get(c.meetingId) || [];
      existing.push(c);
      commentsMap.set(c.meetingId, existing);
    });

    return meetingIds.map((id) => commentsMap.get(id) || []);
  });
}

/**
 * Create meeting recordings loader - Batches recording queries by meeting ID
 */
export function createMeetingRecordingsLoader(prisma: PrismaClient) {
  return new DataLoader<string, any[]>(async (meetingIds) => {
    // Real Prisma query
    const recordings = await prisma.meetingRecording.findMany({
      where: {
        meetingId: {
          in: [...meetingIds],
        },
      },
      orderBy: {
        createdAt: 'desc',
      },
    });

    // Group recordings by meetingId
    const recordingsMap = new Map<string, any[]>();
    recordings.forEach((r) => {
      const existing = recordingsMap.get(r.meetingId) || [];
      existing.push(r);
      recordingsMap.set(r.meetingId, existing);
    });

    return meetingIds.map((id) => recordingsMap.get(id) || []);
  });
}

/**
 * Create all data loaders
 */
export function createLoaders(prisma: PrismaClient) {
  return {
    meetingLoader: createMeetingLoader(prisma),
    userLoader: createUserLoader(prisma),
    organizationLoader: createOrganizationLoader(prisma),
    transcriptLoader: createTranscriptLoader(prisma),
    meetingParticipantsLoader: createMeetingParticipantsLoader(prisma),
    meetingSummaryLoader: createMeetingSummaryLoader(prisma),
    meetingAnalyticsLoader: createMeetingAnalyticsLoader(prisma),
    meetingCommentsLoader: createMeetingCommentsLoader(prisma),
    meetingRecordingsLoader: createMeetingRecordingsLoader(prisma),
  };
}

export type DataLoaders = ReturnType<typeof createLoaders>;
