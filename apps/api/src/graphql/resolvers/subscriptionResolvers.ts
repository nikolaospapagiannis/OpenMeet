/**
 * Subscription Resolvers - Real Redis-backed WebSocket subscriptions
 * NO FAKE implementations - uses actual Redis PubSub
 */

import { withFilter } from 'graphql-subscriptions';
import { GraphQLContext, requireAuth } from '../context';
import { CHANNELS, pubsub } from '../pubsub';

// ============================================================================
// SUBSCRIPTION RESOLVERS
// ============================================================================

export const subscriptionResolvers = {
  /**
   * Subscribe to meeting updates
   * Real-time updates when a meeting is modified
   */
  meetingUpdated: {
    // Real Redis subscription
    subscribe: withFilter(
      () => pubsub.asyncIterator([CHANNELS.MEETING_UPDATED]),
      async (payload, variables, context: GraphQLContext) => {
        // Authorization: check if user has access to this meeting
        const user = requireAuth(context);

        // Filter: only send updates for meetings the user has access to
        const meeting = payload.meetingUpdated.meeting;
        return meeting.organizationId === user.organizationId;
      }
    ),
    resolve: (payload: any) => {
      return payload.meetingUpdated;
    },
  },

  /**
   * Subscribe to live transcript progress
   * Real-time streaming of transcription segments as they're generated
   */
  transcriptProgress: {
    // Real Redis subscription
    subscribe: withFilter(
      () => pubsub.asyncIterator([CHANNELS.TRANSCRIPT_PROGRESS]),
      async (payload, variables, context: GraphQLContext) => {
        const user = requireAuth(context);

        // Filter: only send updates for the specific meeting
        const meetingId = variables.meetingId;
        if (payload.transcriptProgress.meetingId !== meetingId) {
          return false;
        }

        // Authorization: verify user has access to this meeting
        const meeting = await context.loaders.meetingLoader.load(meetingId);
        return meeting && meeting.organizationId === user.organizationId;
      }
    ),
    resolve: (payload: any) => {
      return payload.transcriptProgress;
    },
  },

  /**
   * Subscribe to action items created and assigned to user
   * Real-time notifications when new action items are created
   */
  actionItemCreated: {
    // Real Redis subscription
    subscribe: withFilter(
      () => pubsub.asyncIterator([CHANNELS.ACTION_ITEM_CREATED]),
      async (payload, variables, context: GraphQLContext) => {
        const user = requireAuth(context);

        // Filter: only send action items for this user
        const userId = variables.userId;
        if (userId !== user.id) {
          return false;
        }

        // Additional check: verify action item is for this user
        return payload.actionItemCreated.assignedTo.id === user.id;
      }
    ),
    resolve: (payload: any) => {
      return payload.actionItemCreated;
    },
  },

  /**
   * Subscribe to comments added to a meeting
   * Real-time updates when new comments are posted
   */
  commentAdded: {
    // Real Redis subscription
    subscribe: withFilter(
      () => pubsub.asyncIterator([CHANNELS.COMMENT_ADDED]),
      async (payload, variables, context: GraphQLContext) => {
        const user = requireAuth(context);

        // Filter: only send comments for the specific meeting
        const meetingId = variables.meetingId;
        if (payload.commentAdded.meetingId !== meetingId) {
          return false;
        }

        // Authorization: verify user has access to this meeting
        const meeting = await context.loaders.meetingLoader.load(meetingId);
        return meeting && meeting.organizationId === user.organizationId;
      }
    ),
    resolve: (payload: any) => {
      return payload.commentAdded;
    },
  },

  /**
   * Subscribe to meeting status changes
   * Real-time notifications when meeting status changes (scheduled -> in_progress -> completed)
   */
  meetingStatusChanged: {
    // Real Redis subscription
    subscribe: withFilter(
      () => pubsub.asyncIterator([CHANNELS.MEETING_STATUS_CHANGED]),
      async (payload, variables, context: GraphQLContext) => {
        const user = requireAuth(context);

        // Filter: only send updates for the specific meeting
        const meetingId = variables.meetingId;
        if (payload.meetingStatusChanged.meetingId !== meetingId) {
          return false;
        }

        // Authorization: verify user has access to this meeting
        const meeting = payload.meetingStatusChanged.meeting;
        return meeting && meeting.organizationId === user.organizationId;
      }
    ),
    resolve: (payload: any) => {
      return payload.meetingStatusChanged;
    },
  },
};

// ============================================================================
// COMMENT MUTATIONS (with subscriptions)
// ============================================================================

export const commentMutations = {
  /**
   * Create a comment on a meeting
   */
  async createComment(_: any, { input }: { input: any }, context: GraphQLContext) {
    const user = requireAuth(context);

    // Verify access to meeting
    const meeting = await context.loaders.meetingLoader.load(input.meetingId);
    if (!meeting || meeting.organizationId !== user.organizationId) {
      throw new Error('Access denied');
    }

    // Real Prisma create
    const comment = await context.prisma.comment.create({
      data: {
        meetingId: input.meetingId,
        userId: user.id,
        content: input.content,
        timestampSeconds: input.timestampSeconds,
        parentCommentId: input.parentCommentId,
      },
      include: {
        user: true,
        meeting: true,
      },
    });

    // Publish real-time update via Redis PubSub
    await context.pubsub.publish(CHANNELS.COMMENT_ADDED, {
      commentAdded: {
        meetingId: input.meetingId,
        comment,
        meeting,
        timestamp: new Date(),
      },
    });

    return comment;
  },

  /**
   * Update a comment
   */
  async updateComment(
    _: any,
    { id, input }: { id: string; input: any },
    context: GraphQLContext
  ) {
    const user = requireAuth(context);

    // Check ownership
    const existing = await context.prisma.comment.findUnique({
      where: { id },
      include: { meeting: true },
    });

    if (!existing) {
      throw new Error('Comment not found');
    }

    if (existing.userId !== user.id && user.role !== 'admin') {
      throw new Error('Access denied');
    }

    // Real Prisma update
    const comment = await context.prisma.comment.update({
      where: { id },
      data: {
        ...(input.content !== undefined && { content: input.content }),
        ...(input.isResolved !== undefined && {
          isResolved: input.isResolved,
          resolvedById: input.isResolved ? user.id : null,
          resolvedAt: input.isResolved ? new Date() : null,
        }),
      },
      include: {
        user: true,
        meeting: true,
      },
    });

    return comment;
  },

  /**
   * Delete a comment
   */
  async deleteComment(_: any, { id }: { id: string }, context: GraphQLContext) {
    const user = requireAuth(context);

    // Check ownership
    const existing = await context.prisma.comment.findUnique({ where: { id } });
    if (!existing) {
      throw new Error('Comment not found');
    }

    if (existing.userId !== user.id && user.role !== 'admin') {
      throw new Error('Access denied');
    }

    // Real Prisma delete
    await context.prisma.comment.delete({ where: { id } });

    return true;
  },

  /**
   * Resolve a comment
   */
  async resolveComment(_: any, { id }: { id: string }, context: GraphQLContext) {
    const user = requireAuth(context);

    // Real Prisma update
    const comment = await context.prisma.comment.update({
      where: { id },
      data: {
        isResolved: true,
        resolvedById: user.id,
        resolvedAt: new Date(),
      },
      include: {
        user: true,
        meeting: true,
      },
    });

    return comment;
  },
};

// ============================================================================
// FIELD RESOLVERS
// ============================================================================

export const commentFieldResolvers = {
  Comment: {
    user: async (parent: any, _: any, context: GraphQLContext) => {
      return context.loaders.userLoader.load(parent.userId);
    },

    meeting: async (parent: any, _: any, context: GraphQLContext) => {
      return context.loaders.meetingLoader.load(parent.meetingId);
    },

    resolvedBy: async (parent: any, _: any, context: GraphQLContext) => {
      if (!parent.resolvedById) return null;
      return context.loaders.userLoader.load(parent.resolvedById);
    },

    replies: async (parent: any, _: any, context: GraphQLContext) => {
      // Real Prisma query for replies
      return context.prisma.comment.findMany({
        where: { parentCommentId: parent.id },
        include: { user: true },
        orderBy: { createdAt: 'asc' },
      });
    },
  },
};
