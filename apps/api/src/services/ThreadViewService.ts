/**
 * Thread View Service
 *
 * Thread/channel view organization for meetings
 * Features:
 * - Organize meetings by project/topic
 * - Meeting threads (group related meetings)
 * - Channel permissions
 * - Thread analytics
 */

import { PrismaClient } from '@prisma/client';
import { logger } from '../utils/logger';

const prisma = new PrismaClient();

export interface Thread {
  id: string;
  name: string;
  description?: string;
  type: 'project' | 'topic' | 'team' | 'customer' | 'custom';
  color?: string; // For UI organization
  icon?: string;
  organizationId: string;
  createdBy: string;
  isArchived: boolean;

  // Meetings in this thread
  meetingIds: string[];
  meetingCount: number;

  // Participants
  members: string[]; // User IDs
  allowedViewers: string[]; // User IDs with view permission
  allowedEditors: string[]; // User IDs with edit permission

  // Metadata
  tags: string[];
  metadata: Record<string, any>;
  lastActivityAt: Date;
  createdAt: Date;
  updatedAt: Date;
}

export interface Channel {
  id: string;
  name: string;
  description?: string;
  organizationId: string;

  // Thread organization
  threadIds: string[];
  threadCount: number;

  // Permissions
  isPrivate: boolean;
  members: string[]; // User IDs in this channel
  admins: string[]; // Channel administrators

  // Settings
  autoAddMeetings: boolean; // Automatically add meetings matching criteria
  matchingCriteria?: {
    keywords?: string[];
    participants?: string[];
    tags?: string[];
  };

  createdBy: string;
  isArchived: boolean;
  createdAt: Date;
  updatedAt: Date;
}

export interface ThreadMeetingSummary {
  threadId: string;
  threadName: string;
  meetingCount: number;
  totalDuration: number; // seconds
  participantCount: number;
  firstMeetingDate: Date;
  lastMeetingDate: Date;
  keyTopics: string[];
  actionItemCount: number;
}

class ThreadViewService {
  /**
   * Create a new thread
   */
  async createThread(
    organizationId: string,
    userId: string,
    data: {
      name: string;
      description?: string;
      type?: 'project' | 'topic' | 'team' | 'customer' | 'custom';
      color?: string;
      icon?: string;
      members?: string[];
      tags?: string[];
      metadata?: Record<string, any>;
    }
  ): Promise<Thread> {
    try {
      const threadId = `thread_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;

      const thread: Thread = {
        id: threadId,
        name: data.name,
        description: data.description,
        type: data.type || 'custom',
        color: data.color,
        icon: data.icon,
        organizationId,
        createdBy: userId,
        isArchived: false,
        meetingIds: [],
        meetingCount: 0,
        members: data.members || [userId],
        allowedViewers: data.members || [userId],
        allowedEditors: [userId],
        tags: data.tags || [],
        metadata: data.metadata || {},
        lastActivityAt: new Date(),
        createdAt: new Date(),
        updatedAt: new Date(),
      };

      // Store in Organization.metadata.meetingThreads
      const org = await prisma.organization.findUnique({
        where: { id: organizationId },
      });

      const orgMetadata = (org?.metadata as any) || {};
      const meetingThreads = orgMetadata.meetingThreads || [];
      meetingThreads.push(thread);
      orgMetadata.meetingThreads = meetingThreads;

      await prisma.organization.update({
        where: { id: organizationId },
        data: { metadata: orgMetadata as any },
      });

      logger.info('Thread created', { threadId: thread.id, name: data.name });

      return thread;
    } catch (error) {
      logger.error('Error creating thread', { error });
      throw error;
    }
  }

  /**
   * Get thread by ID
   */
  async getThread(threadId: string, userId?: string): Promise<Thread | null> {
    try {
      // Search all organizations for the thread
      const orgs = await prisma.organization.findMany();

      for (const org of orgs) {
        const orgMetadata = (org.metadata as any) || {};
        const meetingThreads: Thread[] = orgMetadata.meetingThreads || [];
        const thread = meetingThreads.find(t => t.id === threadId);

        if (thread) {
          // Check permissions if userId provided
          if (userId) {
            const allowedViewers = thread.allowedViewers || [];
            const members = thread.members || [];

            if (!allowedViewers.includes(userId) && !members.includes(userId)) {
              logger.warn('User does not have permission to view thread', { threadId, userId });
              return null;
            }
          }

          return thread;
        }
      }

      return null;
    } catch (error) {
      logger.error('Error getting thread', { error, threadId });
      return null;
    }
  }

  /**
   * Get all threads for organization
   */
  async getThreads(
    organizationId: string,
    userId?: string,
    filters?: {
      type?: string;
      tags?: string[];
      isArchived?: boolean;
      search?: string;
    }
  ): Promise<Thread[]> {
    try {
      const org = await prisma.organization.findUnique({
        where: { id: organizationId },
      });

      const orgMetadata = (org?.metadata as any) || {};
      let threads: Thread[] = orgMetadata.meetingThreads || [];

      // Apply filters
      if (filters?.type) {
        threads = threads.filter(t => t.type === filters.type);
      }

      if (filters?.isArchived !== undefined) {
        threads = threads.filter(t => t.isArchived === filters.isArchived);
      }

      if (filters?.tags && filters.tags.length > 0) {
        threads = threads.filter(t =>
          filters.tags!.some(tag => t.tags.includes(tag))
        );
      }

      // Permission filter
      if (userId) {
        threads = threads.filter(t =>
          t.allowedViewers.includes(userId) ||
          t.members.includes(userId) ||
          t.createdBy === userId
        );
      }

      // Search filter
      if (filters?.search) {
        const searchLower = filters.search.toLowerCase();
        threads = threads.filter(
          thread =>
            thread.name.toLowerCase().includes(searchLower) ||
            thread.description?.toLowerCase().includes(searchLower)
        );
      }

      // Sort by lastActivityAt descending
      threads.sort((a, b) => b.lastActivityAt.getTime() - a.lastActivityAt.getTime());

      return threads;
    } catch (error) {
      logger.error('Error getting threads', { error });
      throw error;
    }
  }

  /**
   * Update thread
   */
  async updateThread(
    threadId: string,
    userId: string,
    data: Partial<{
      name: string;
      description: string;
      color: string;
      icon: string;
      tags: string[];
      metadata: Record<string, any>;
      isArchived: boolean;
    }>
  ): Promise<Thread> {
    try {
      // Find and update the thread
      const orgs = await prisma.organization.findMany();

      for (const org of orgs) {
        const orgMetadata = (org.metadata as any) || {};
        const meetingThreads: Thread[] = orgMetadata.meetingThreads || [];
        const threadIndex = meetingThreads.findIndex(t => t.id === threadId);

        if (threadIndex >= 0) {
          const thread = meetingThreads[threadIndex];

          // Check edit permission
          const allowedEditors = thread.allowedEditors || [];
          if (!allowedEditors.includes(userId) && thread.createdBy !== userId) {
            throw new Error('User does not have permission to edit this thread');
          }

          // Update the thread
          meetingThreads[threadIndex] = {
            ...thread,
            ...data,
            updatedAt: new Date(),
          };

          orgMetadata.meetingThreads = meetingThreads;

          await prisma.organization.update({
            where: { id: org.id },
            data: { metadata: orgMetadata as any },
          });

          logger.info('Thread updated', { threadId });

          return meetingThreads[threadIndex];
        }
      }

      throw new Error('Thread not found');
    } catch (error) {
      logger.error('Error updating thread', { error, threadId });
      throw error;
    }
  }

  /**
   * Delete thread
   */
  async deleteThread(threadId: string, userId: string): Promise<boolean> {
    try {
      // Find and delete the thread
      const orgs = await prisma.organization.findMany();

      for (const org of orgs) {
        const orgMetadata = (org.metadata as any) || {};
        const meetingThreads: Thread[] = orgMetadata.meetingThreads || [];
        const threadIndex = meetingThreads.findIndex(t => t.id === threadId);

        if (threadIndex >= 0) {
          const thread = meetingThreads[threadIndex];

          // Only creator can delete
          if (thread.createdBy !== userId) {
            throw new Error('Only the creator can delete this thread');
          }

          // Remove the thread
          meetingThreads.splice(threadIndex, 1);
          orgMetadata.meetingThreads = meetingThreads;

          await prisma.organization.update({
            where: { id: org.id },
            data: { metadata: orgMetadata as any },
          });

          logger.info('Thread deleted', { threadId });

          return true;
        }
      }

      return false;
    } catch (error) {
      logger.error('Error deleting thread', { error, threadId });
      throw error;
    }
  }

  /**
   * Add meeting to thread
   */
  async addMeetingToThread(
    threadId: string,
    meetingId: string,
    userId: string
  ): Promise<void> {
    try {
      const thread = await this.getThread(threadId);

      if (!thread) {
        throw new Error('Thread not found');
      }

      // Check edit permission
      if (!thread.allowedEditors.includes(userId) && thread.createdBy !== userId) {
        throw new Error('User does not have permission to edit this thread');
      }

      const meetingIds = thread.meetingIds;
      if (!meetingIds.includes(meetingId)) {
        // Update the thread in organization metadata
        const orgs = await prisma.organization.findMany();

        for (const org of orgs) {
          const orgMetadata = (org.metadata as any) || {};
          const meetingThreads: Thread[] = orgMetadata.meetingThreads || [];
          const threadIndex = meetingThreads.findIndex(t => t.id === threadId);

          if (threadIndex >= 0) {
            meetingThreads[threadIndex].meetingIds = [...meetingIds, meetingId];
            meetingThreads[threadIndex].meetingCount++;
            meetingThreads[threadIndex].lastActivityAt = new Date();
            meetingThreads[threadIndex].updatedAt = new Date();

            orgMetadata.meetingThreads = meetingThreads;

            await prisma.organization.update({
              where: { id: org.id },
              data: { metadata: orgMetadata as any },
            });

            logger.info('Meeting added to thread', { threadId, meetingId });
            break;
          }
        }
      }
    } catch (error) {
      logger.error('Error adding meeting to thread', { error, threadId, meetingId });
      throw error;
    }
  }

  /**
   * Remove meeting from thread
   */
  async removeMeetingFromThread(
    threadId: string,
    meetingId: string,
    userId: string
  ): Promise<void> {
    try {
      const thread = await this.getThread(threadId);

      if (!thread) {
        throw new Error('Thread not found');
      }

      // Check edit permission
      if (!thread.allowedEditors.includes(userId) && thread.createdBy !== userId) {
        throw new Error('User does not have permission to edit this thread');
      }

      const meetingIds = thread.meetingIds.filter(id => id !== meetingId);

      // Update the thread in organization metadata
      const orgs = await prisma.organization.findMany();

      for (const org of orgs) {
        const orgMetadata = (org.metadata as any) || {};
        const meetingThreads: Thread[] = orgMetadata.meetingThreads || [];
        const threadIndex = meetingThreads.findIndex(t => t.id === threadId);

        if (threadIndex >= 0) {
          meetingThreads[threadIndex].meetingIds = meetingIds;
          meetingThreads[threadIndex].meetingCount--;
          meetingThreads[threadIndex].updatedAt = new Date();

          orgMetadata.meetingThreads = meetingThreads;

          await prisma.organization.update({
            where: { id: org.id },
            data: { metadata: orgMetadata as any },
          });

          logger.info('Meeting removed from thread', { threadId, meetingId });
          break;
        }
      }
    } catch (error) {
      logger.error('Error removing meeting from thread', { error, threadId, meetingId });
      throw error;
    }
  }

  /**
   * Get thread with meetings
   */
  async getThreadWithMeetings(threadId: string, userId?: string): Promise<any> {
    try {
      const thread = await this.getThread(threadId, userId);

      if (!thread) {
        return null;
      }

      const meetings = await prisma.meeting.findMany({
        where: {
          id: { in: thread.meetingIds },
        },
        include: {
          participants: true,
          summaries: true,
        },
        orderBy: { scheduledStartAt: 'desc' },
      });

      return {
        ...thread,
        meetings,
      };
    } catch (error) {
      logger.error('Error getting thread with meetings', { error, threadId });
      throw error;
    }
  }

  /**
   * Update thread permissions
   */
  async updatePermissions(
    threadId: string,
    userId: string,
    permissions: {
      members?: string[];
      allowedViewers?: string[];
      allowedEditors?: string[];
    }
  ): Promise<Thread> {
    try {
      const thread = await this.getThread(threadId);

      if (!thread) {
        throw new Error('Thread not found');
      }

      // Only creator or editors can update permissions
      if (thread.createdBy !== userId && !thread.allowedEditors.includes(userId)) {
        throw new Error('User does not have permission to update permissions');
      }

      // Update thread in organization metadata
      const orgs = await prisma.organization.findMany();

      for (const org of orgs) {
        const orgMetadata = (org.metadata as any) || {};
        const meetingThreads: Thread[] = orgMetadata.meetingThreads || [];
        const threadIndex = meetingThreads.findIndex(t => t.id === threadId);

        if (threadIndex >= 0) {
          meetingThreads[threadIndex] = {
            ...meetingThreads[threadIndex],
            ...permissions,
            updatedAt: new Date(),
          };

          orgMetadata.meetingThreads = meetingThreads;

          await prisma.organization.update({
            where: { id: org.id },
            data: { metadata: orgMetadata as any },
          });

          logger.info('Thread permissions updated', { threadId });

          return meetingThreads[threadIndex];
        }
      }

      throw new Error('Thread not found');
    } catch (error) {
      logger.error('Error updating thread permissions', { error, threadId });
      throw error;
    }
  }

  /**
   * Get thread summary/analytics
   */
  async getThreadSummary(threadId: string): Promise<ThreadMeetingSummary | null> {
    try {
      const thread = await this.getThread(threadId);

      if (!thread) {
        return null;
      }

      const meetings = await prisma.meeting.findMany({
        where: {
          id: { in: thread.meetingIds },
        },
        include: {
          participants: true,
          summaries: true,
        },
      });

      if (meetings.length === 0) {
        return {
          threadId: thread.id,
          threadName: thread.name,
          meetingCount: 0,
          totalDuration: 0,
          participantCount: 0,
          firstMeetingDate: new Date(),
          lastMeetingDate: new Date(),
          keyTopics: [],
          actionItemCount: 0,
        };
      }

      // Calculate metrics
      const totalDuration = meetings.reduce(
        (sum, m) => sum + (m.durationSeconds || 0),
        0
      );

      const allParticipants = new Set<string>();
      meetings.forEach(m => {
        m.participants.forEach(p => {
          if (p.email) allParticipants.add(p.email);
        });
      });

      const dates = meetings
        .map(m => m.scheduledStartAt)
        .filter(Boolean)
        .sort((a, b) => a.getTime() - b.getTime());

      const firstMeetingDate = dates[0] || new Date();
      const lastMeetingDate = dates[dates.length - 1] || new Date();

      // Extract topics from summaries
      const topicsMap: Record<string, number> = {};
      let actionItemCount = 0;

      meetings.forEach(m => {
        m.summaries.forEach(summary => {
          const keyPoints = (summary.keyPoints as any) || [];
          keyPoints.forEach((point: string) => {
            const words = point.toLowerCase().split(' ');
            words.forEach(word => {
              if (word.length > 4) {
                topicsMap[word] = (topicsMap[word] || 0) + 1;
              }
            });
          });

          const actionItems = (summary.actionItems as any) || [];
          actionItemCount += Array.isArray(actionItems) ? actionItems.length : 0;
        });
      });

      const keyTopics = Object.entries(topicsMap)
        .sort((a, b) => b[1] - a[1])
        .slice(0, 10)
        .map(([topic]) => topic);

      return {
        threadId: thread.id,
        threadName: thread.name,
        meetingCount: meetings.length,
        totalDuration,
        participantCount: allParticipants.size,
        firstMeetingDate,
        lastMeetingDate,
        keyTopics,
        actionItemCount,
      };
    } catch (error) {
      logger.error('Error getting thread summary', { error, threadId });
      return null;
    }
  }

  /**
   * Create a channel
   */
  async createChannel(
    organizationId: string,
    userId: string,
    data: {
      name: string;
      description?: string;
      isPrivate?: boolean;
      members?: string[];
      autoAddMeetings?: boolean;
      matchingCriteria?: {
        keywords?: string[];
        participants?: string[];
        tags?: string[];
      };
    }
  ): Promise<Channel> {
    try {
      const channelId = `channel_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;

      const channel: Channel = {
        id: channelId,
        name: data.name,
        description: data.description,
        organizationId,
        threadIds: [],
        threadCount: 0,
        isPrivate: data.isPrivate || false,
        members: data.members || [userId],
        admins: [userId],
        autoAddMeetings: data.autoAddMeetings || false,
        matchingCriteria: data.matchingCriteria,
        createdBy: userId,
        isArchived: false,
        createdAt: new Date(),
        updatedAt: new Date(),
      };

      // Store in Organization.metadata.meetingChannels
      const org = await prisma.organization.findUnique({
        where: { id: organizationId },
      });

      const orgMetadata = (org?.metadata as any) || {};
      const meetingChannels = orgMetadata.meetingChannels || [];
      meetingChannels.push(channel);
      orgMetadata.meetingChannels = meetingChannels;

      await prisma.organization.update({
        where: { id: organizationId },
        data: { metadata: orgMetadata as any },
      });

      logger.info('Channel created', { channelId: channel.id, name: data.name });

      return channel;
    } catch (error) {
      logger.error('Error creating channel', { error });
      throw error;
    }
  }

  /**
   * Get channels for organization
   */
  async getChannels(
    organizationId: string,
    userId?: string,
    filters?: {
      isArchived?: boolean;
    }
  ): Promise<Channel[]> {
    try {
      const org = await prisma.organization.findUnique({
        where: { id: organizationId },
      });

      const orgMetadata = (org?.metadata as any) || {};
      let channels: Channel[] = orgMetadata.meetingChannels || [];

      // Apply filters
      if (filters?.isArchived !== undefined) {
        channels = channels.filter(c => c.isArchived === filters.isArchived);
      }

      // Permission filter: show public channels and private channels where user is a member
      if (userId) {
        channels = channels.filter(c =>
          !c.isPrivate ||
          c.members.includes(userId) ||
          c.createdBy === userId
        );
      } else {
        channels = channels.filter(c => !c.isPrivate);
      }

      // Sort by createdAt descending
      channels.sort((a, b) => b.createdAt.getTime() - a.createdAt.getTime());

      return channels;
    } catch (error) {
      logger.error('Error getting channels', { error });
      throw error;
    }
  }

  /**
   * Add thread to channel
   */
  async addThreadToChannel(
    channelId: string,
    threadId: string,
    userId: string
  ): Promise<void> {
    try {
      // Find the channel in organization metadata
      const orgs = await prisma.organization.findMany();

      for (const org of orgs) {
        const orgMetadata = (org.metadata as any) || {};
        const meetingChannels: Channel[] = orgMetadata.meetingChannels || [];
        const channelIndex = meetingChannels.findIndex(c => c.id === channelId);

        if (channelIndex >= 0) {
          const channel = meetingChannels[channelIndex];

          // Check if user is admin
          const admins = channel.admins || [];
          if (!admins.includes(userId) && channel.createdBy !== userId) {
            throw new Error('User does not have permission to modify this channel');
          }

          const threadIds = channel.threadIds || [];
          if (!threadIds.includes(threadId)) {
            meetingChannels[channelIndex].threadIds = [...threadIds, threadId];
            meetingChannels[channelIndex].threadCount++;
            meetingChannels[channelIndex].updatedAt = new Date();

            orgMetadata.meetingChannels = meetingChannels;

            await prisma.organization.update({
              where: { id: org.id },
              data: { metadata: orgMetadata as any },
            });

            logger.info('Thread added to channel', { channelId, threadId });
          }
          return;
        }
      }

      throw new Error('Channel not found');
    } catch (error) {
      logger.error('Error adding thread to channel', { error, channelId, threadId });
      throw error;
    }
  }

  /**
   * Auto-organize meeting into thread
   * Based on similarity to existing threads
   */
  async autoOrganizeMeeting(
    meetingId: string,
    organizationId: string
  ): Promise<string | null> {
    try {
      const meeting = await prisma.meeting.findUnique({
        where: { id: meetingId },
        include: {
          participants: true,
        },
      });

      if (!meeting) {
        return null;
      }

      const threads = await this.getThreads(organizationId, undefined, {
        isArchived: false,
      });

      let bestThread: Thread | null = null;
      let bestScore = 0;

      for (const thread of threads) {
        let score = 0;

        // Match by tags
        for (const tag of thread.tags) {
          if (meeting.title?.toLowerCase().includes(tag.toLowerCase())) {
            score += 30;
          }
        }

        // Match by type
        if (thread.type === 'customer' && meeting.title?.toLowerCase().includes('customer')) {
          score += 20;
        }
        if (thread.type === 'team' && meeting.title?.toLowerCase().includes('team')) {
          score += 20;
        }
        if (thread.type === 'project') {
          const metadata = thread.metadata as any;
          if (metadata?.projectName && meeting.title?.includes(metadata.projectName)) {
            score += 40;
          }
        }

        // Match by participants
        const threadMeetings = await prisma.meeting.findMany({
          where: {
            id: { in: thread.meetingIds.slice(0, 5) }, // Check recent meetings
          },
          include: {
            participants: true,
          },
        });

        const threadParticipants = new Set<string>();
        threadMeetings.forEach(m => {
          m.participants.forEach(p => {
            if (p.email) threadParticipants.add(p.email);
          });
        });

        const meetingParticipants = meeting.participants
          .map(p => p.email)
          .filter(Boolean) as string[];

        const overlap = meetingParticipants.filter(email =>
          threadParticipants.has(email)
        ).length;

        if (overlap > 0) {
          score += overlap * 10;
        }

        if (score > bestScore && score >= 30) {
          bestScore = score;
          bestThread = thread;
        }
      }

      if (bestThread) {
        await this.addMeetingToThread(bestThread.id, meetingId, bestThread.createdBy);
        logger.info('Meeting auto-organized into thread', {
          meetingId,
          threadId: bestThread.id,
          score: bestScore,
        });
        return bestThread.id;
      }

      return null;
    } catch (error) {
      logger.error('Error auto-organizing meeting', { error, meetingId });
      return null;
    }
  }
}

export const threadViewService = new ThreadViewService();
