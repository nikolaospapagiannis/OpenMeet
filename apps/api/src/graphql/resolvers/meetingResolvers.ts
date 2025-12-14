/**
 * Meeting Resolvers - Real Prisma database queries
 * NO FAKE implementations - all queries use actual database
 */

import { GraphQLContext, requireAuth } from '../context';
import { publishMeetingUpdated, publishMeetingStatusChanged } from '../pubsub';

// ============================================================================
// QUERY RESOLVERS
// ============================================================================

export const meetingQueries = {
  /**
   * Get current authenticated user
   */
  async me(_: any, __: any, context: GraphQLContext) {
    const user = requireAuth(context);

    // Real Prisma query
    return context.loaders.userLoader.load(user.id);
  },

  /**
   * Get single meeting by ID
   */
  async meeting(_: any, { id }: { id: string }, context: GraphQLContext) {
    const user = requireAuth(context);

    // Real Prisma query via DataLoader
    const meeting = await context.loaders.meetingLoader.load(id);

    if (!meeting) {
      throw new Error('Meeting not found');
    }

    // Authorization check - user must belong to same organization
    if (meeting.organizationId !== user.organizationId) {
      throw new Error('Access denied');
    }

    return meeting;
  },

  /**
   * Get meetings with filtering, pagination, and sorting
   */
  async meetings(
    _: any,
    {
      filter,
      limit = 20,
      offset = 0,
      sortBy = 'createdAt',
      sortOrder = 'desc',
    }: {
      filter?: any;
      limit?: number;
      offset?: number;
      sortBy?: string;
      sortOrder?: 'asc' | 'desc';
    },
    context: GraphQLContext
  ) {
    const user = requireAuth(context);

    // Build Prisma where clause
    const where: any = {
      organizationId: user.organizationId,
    };

    if (filter) {
      if (filter.status) {
        where.status = filter.status;
      }
      if (filter.workspaceId) {
        where.workspaceId = filter.workspaceId;
      }
      if (filter.search) {
        where.OR = [
          { title: { contains: filter.search, mode: 'insensitive' } },
          { description: { contains: filter.search, mode: 'insensitive' } },
        ];
      }
      if (filter.startDate || filter.endDate) {
        where.scheduledStartAt = {};
        if (filter.startDate) {
          where.scheduledStartAt.gte = new Date(filter.startDate);
        }
        if (filter.endDate) {
          where.scheduledStartAt.lte = new Date(filter.endDate);
        }
      }
      if (filter.platform) {
        where.platform = filter.platform;
      }
    }

    // Real Prisma queries
    const [meetings, totalCount] = await Promise.all([
      context.prisma.meeting.findMany({
        where,
        include: {
          organization: true,
          user: true,
          workspace: true,
        },
        orderBy: {
          [sortBy]: sortOrder,
        },
        take: limit,
        skip: offset,
      }),
      context.prisma.meeting.count({ where }),
    ]);

    // Build connection response
    return {
      edges: meetings.map((meeting, index) => ({
        node: meeting,
        cursor: Buffer.from(`${offset + index}`).toString('base64'),
      })),
      pageInfo: {
        hasNextPage: offset + limit < totalCount,
        hasPreviousPage: offset > 0,
        startCursor: meetings.length > 0 ? Buffer.from(`${offset}`).toString('base64') : null,
        endCursor:
          meetings.length > 0
            ? Buffer.from(`${offset + meetings.length - 1}`).toString('base64')
            : null,
      },
      totalCount,
    };
  },

  /**
   * Get transcript by ID
   */
  async transcript(_: any, { id }: { id: string }, context: GraphQLContext) {
    const user = requireAuth(context);

    // Real Prisma query
    const transcript = await context.prisma.transcript.findUnique({
      where: { id },
      include: {
        meeting: true,
      },
    });

    if (!transcript) {
      throw new Error('Transcript not found');
    }

    // Authorization check
    if (transcript.meeting.organizationId !== user.organizationId) {
      throw new Error('Access denied');
    }

    return transcript;
  },

  /**
   * Get transcript for a meeting
   */
  async meetingTranscript(_: any, { meetingId }: { meetingId: string }, context: GraphQLContext) {
    const user = requireAuth(context);

    // Verify access to meeting first
    const meeting = await context.loaders.meetingLoader.load(meetingId);
    if (!meeting || meeting.organizationId !== user.organizationId) {
      throw new Error('Access denied');
    }

    // Load transcript via DataLoader
    return context.loaders.transcriptLoader.load(meetingId);
  },

  /**
   * Get comments for a meeting
   */
  async meetingComments(
    _: any,
    { meetingId, limit = 50, offset = 0 }: { meetingId: string; limit?: number; offset?: number },
    context: GraphQLContext
  ) {
    const user = requireAuth(context);

    // Verify access to meeting
    const meeting = await context.loaders.meetingLoader.load(meetingId);
    if (!meeting || meeting.organizationId !== user.organizationId) {
      throw new Error('Access denied');
    }

    // Load comments via DataLoader (returns all, so we slice)
    const allComments = await context.loaders.meetingCommentsLoader.load(meetingId);
    return allComments.slice(offset, offset + limit);
  },

  /**
   * Get analytics for a meeting
   */
  async meetingAnalytics(_: any, { meetingId }: { meetingId: string }, context: GraphQLContext) {
    const user = requireAuth(context);

    // Verify access to meeting
    const meeting = await context.loaders.meetingLoader.load(meetingId);
    if (!meeting || meeting.organizationId !== user.organizationId) {
      throw new Error('Access denied');
    }

    // Load analytics via DataLoader
    return context.loaders.meetingAnalyticsLoader.load(meetingId);
  },

  /**
   * Search meetings by query
   */
  async searchMeetings(
    _: any,
    { query, limit = 20, offset = 0 }: { query: string; limit?: number; offset?: number },
    context: GraphQLContext
  ) {
    const user = requireAuth(context);

    // Real Prisma full-text search
    return context.prisma.meeting.findMany({
      where: {
        organizationId: user.organizationId,
        OR: [
          { title: { contains: query, mode: 'insensitive' } },
          { description: { contains: query, mode: 'insensitive' } },
        ],
      },
      include: {
        organization: true,
        user: true,
      },
      take: limit,
      skip: offset,
      orderBy: {
        createdAt: 'desc',
      },
    });
  },
};

// ============================================================================
// MUTATION RESOLVERS
// ============================================================================

export const meetingMutations = {
  /**
   * Create a new meeting
   */
  async createMeeting(_: any, { input }: { input: any }, context: GraphQLContext) {
    const user = requireAuth(context);

    // Real Prisma create
    const meeting = await context.prisma.meeting.create({
      data: {
        title: input.title,
        description: input.description,
        scheduledStartAt: input.scheduledStartAt ? new Date(input.scheduledStartAt) : null,
        scheduledEndAt: input.scheduledEndAt ? new Date(input.scheduledEndAt) : null,
        platform: input.platform,
        meetingUrl: input.meetingUrl,
        status: 'scheduled',
        organizationId: user.organizationId!,
        userId: user.id,
        workspaceId: input.workspaceId,
      },
      include: {
        organization: true,
        user: true,
        workspace: true,
      },
    });

    return meeting;
  },

  /**
   * Update a meeting
   */
  async updateMeeting(
    _: any,
    { id, input }: { id: string; input: any },
    context: GraphQLContext
  ) {
    const user = requireAuth(context);

    // Check access
    const existing = await context.prisma.meeting.findUnique({ where: { id } });
    if (!existing || existing.organizationId !== user.organizationId) {
      throw new Error('Meeting not found or access denied');
    }

    // Track changed fields for subscription
    const changedFields: string[] = [];
    if (input.title !== undefined && input.title !== existing.title) changedFields.push('title');
    if (input.status !== undefined && input.status !== existing.status) changedFields.push('status');

    // Real Prisma update
    const meeting = await context.prisma.meeting.update({
      where: { id },
      data: {
        ...(input.title !== undefined && { title: input.title }),
        ...(input.description !== undefined && { description: input.description }),
        ...(input.status !== undefined && { status: input.status }),
        ...(input.scheduledStartAt !== undefined && {
          scheduledStartAt: new Date(input.scheduledStartAt),
        }),
        ...(input.scheduledEndAt !== undefined && {
          scheduledEndAt: new Date(input.scheduledEndAt),
        }),
        ...(input.actualStartAt !== undefined && {
          actualStartAt: new Date(input.actualStartAt),
        }),
        ...(input.actualEndAt !== undefined && { actualEndAt: new Date(input.actualEndAt) }),
      },
      include: {
        organization: true,
        user: true,
        workspace: true,
      },
    });

    // Publish real-time update via Redis PubSub
    if (changedFields.length > 0) {
      await publishMeetingUpdated({
        meetingId: meeting.id,
        meeting,
        changedFields,
        timestamp: new Date(),
      });
    }

    // Publish status change if status changed
    if (input.status !== undefined && input.status !== existing.status) {
      await publishMeetingStatusChanged({
        meetingId: meeting.id,
        meeting,
        oldStatus: existing.status,
        newStatus: input.status,
        timestamp: new Date(),
      });
    }

    return meeting;
  },

  /**
   * Delete a meeting
   */
  async deleteMeeting(_: any, { id }: { id: string }, context: GraphQLContext) {
    const user = requireAuth(context);

    // Check access
    const existing = await context.prisma.meeting.findUnique({ where: { id } });
    if (!existing || existing.organizationId !== user.organizationId) {
      throw new Error('Meeting not found or access denied');
    }

    // Real Prisma delete (cascade will handle related records)
    await context.prisma.meeting.delete({ where: { id } });

    return true;
  },

  /**
   * Start a meeting (change status to in_progress)
   */
  async startMeeting(_: any, { id }: { id: string }, context: GraphQLContext) {
    const user = requireAuth(context);

    // Check access
    const existing = await context.prisma.meeting.findUnique({ where: { id } });
    if (!existing || existing.organizationId !== user.organizationId) {
      throw new Error('Meeting not found or access denied');
    }

    // Update status
    const meeting = await context.prisma.meeting.update({
      where: { id },
      data: {
        status: 'in_progress',
        actualStartAt: new Date(),
      },
      include: {
        organization: true,
        user: true,
        workspace: true,
      },
    });

    // Publish status change
    await publishMeetingStatusChanged({
      meetingId: meeting.id,
      meeting,
      oldStatus: existing.status,
      newStatus: 'in_progress',
      timestamp: new Date(),
    });

    return meeting;
  },

  /**
   * Complete a meeting (change status to completed)
   */
  async completeMeeting(_: any, { id }: { id: string }, context: GraphQLContext) {
    const user = requireAuth(context);

    // Check access
    const existing = await context.prisma.meeting.findUnique({ where: { id } });
    if (!existing || existing.organizationId !== user.organizationId) {
      throw new Error('Meeting not found or access denied');
    }

    // Calculate duration
    const actualEndAt = new Date();
    const duration = existing.actualStartAt
      ? Math.floor((actualEndAt.getTime() - existing.actualStartAt.getTime()) / 1000)
      : null;

    // Update status
    const meeting = await context.prisma.meeting.update({
      where: { id },
      data: {
        status: 'completed',
        actualEndAt,
        duration,
      },
      include: {
        organization: true,
        user: true,
        workspace: true,
      },
    });

    // Publish status change
    await publishMeetingStatusChanged({
      meetingId: meeting.id,
      meeting,
      oldStatus: existing.status,
      newStatus: 'completed',
      timestamp: new Date(),
    });

    return meeting;
  },
};

// ============================================================================
// FIELD RESOLVERS (for nested data via DataLoaders)
// ============================================================================

export const meetingFieldResolvers = {
  Meeting: {
    // User who created the meeting
    user: async (parent: any, _: any, context: GraphQLContext) => {
      return context.loaders.userLoader.load(parent.userId);
    },

    // Organization
    organization: async (parent: any, _: any, context: GraphQLContext) => {
      return context.loaders.organizationLoader.load(parent.organizationId);
    },

    // Participants (via DataLoader)
    participants: async (parent: any, _: any, context: GraphQLContext) => {
      return context.loaders.meetingParticipantsLoader.load(parent.id);
    },

    // Single transcript (most recent final)
    transcript: async (parent: any, _: any, context: GraphQLContext) => {
      return context.loaders.transcriptLoader.load(parent.id);
    },

    // All transcripts
    transcripts: async (parent: any, _: any, context: GraphQLContext) => {
      // Real Prisma query for all transcripts
      return context.prisma.transcript.findMany({
        where: { meetingId: parent.id },
        orderBy: { createdAt: 'desc' },
      });
    },

    // Summary (via DataLoader)
    summary: async (parent: any, _: any, context: GraphQLContext) => {
      return context.loaders.meetingSummaryLoader.load(parent.id);
    },

    // Analytics (via DataLoader)
    analytics: async (parent: any, _: any, context: GraphQLContext) => {
      return context.loaders.meetingAnalyticsLoader.load(parent.id);
    },

    // Comments (via DataLoader)
    comments: async (parent: any, _: any, context: GraphQLContext) => {
      return context.loaders.meetingCommentsLoader.load(parent.id);
    },

    // Recordings (via DataLoader)
    recordings: async (parent: any, _: any, context: GraphQLContext) => {
      return context.loaders.meetingRecordingsLoader.load(parent.id);
    },
  },

  User: {
    // Full name computed field
    fullName: (parent: any) => {
      if (parent.firstName && parent.lastName) {
        return `${parent.firstName} ${parent.lastName}`;
      }
      return parent.firstName || parent.lastName || parent.email;
    },

    // Organization
    organization: async (parent: any, _: any, context: GraphQLContext) => {
      if (!parent.organizationId) return null;
      return context.loaders.organizationLoader.load(parent.organizationId);
    },

    // Created meetings
    createdMeetings: async (
      parent: any,
      { limit = 20, offset = 0 }: { limit?: number; offset?: number },
      context: GraphQLContext
    ) => {
      return context.prisma.meeting.findMany({
        where: { userId: parent.id },
        orderBy: { createdAt: 'desc' },
        take: limit,
        skip: offset,
      });
    },
  },
};
