/**
 * Meeting Service
 * Core meeting operations and management
 */

import { PrismaClient, MeetingStatus } from '@prisma/client';
import { logger } from '../utils/logger';

const prisma = new PrismaClient();

export interface MeetingDetails {
  id: string;
  title: string;
  scheduledStartAt: Date;
  actualStartAt?: Date;
  actualEndAt?: Date;
  durationSeconds?: number;
  platform: string;
  meetingUrl?: string;
  status: string;
  organizationId: string;
  createdBy: string;
  participants: Array<{
    id: string;
    userId?: string;
    name: string;
    email?: string;
  }>;
}

/**
 * Get meeting by ID
 */
export async function getMeetingById(meetingId: string): Promise<MeetingDetails | null> {
  try {
    const meeting = await prisma.meeting.findUnique({
      where: { id: meetingId },
      include: {
        participants: true,
      },
    });

    return meeting as any;
  } catch (error) {
    logger.error('Error getting meeting', { error, meetingId });
    return null;
  }
}

/**
 * Update meeting status
 */
export async function updateMeetingStatus(
  meetingId: string,
  status: MeetingStatus
): Promise<void> {
  try {
    await prisma.meeting.update({
      where: { id: meetingId },
      data: { status },
    });

    logger.info('Meeting status updated', { meetingId, status });
  } catch (error) {
    logger.error('Error updating meeting status', { error, meetingId });
    throw error;
  }
}

/**
 * Get meetings for organization
 */
export async function getOrganizationMeetings(
  organizationId: string,
  options?: {
    limit?: number;
    offset?: number;
    status?: MeetingStatus;
  }
): Promise<MeetingDetails[]> {
  try {
    const meetings = await prisma.meeting.findMany({
      where: {
        organizationId,
        ...(options?.status && { status: options.status }),
      },
      include: {
        participants: true,
      },
      orderBy: { scheduledStartAt: 'desc' },
      take: options?.limit || 50,
      skip: options?.offset || 0,
    });

    return meetings as any[];
  } catch (error) {
    logger.error('Error getting organization meetings', { error, organizationId });
    return [];
  }
}

/**
 * Create meeting
 */
export async function createMeeting(data: {
  title: string;
  scheduledStartAt: Date;
  platform: string;
  meetingUrl?: string;
  organizationId: string;
  createdBy: string;
}): Promise<MeetingDetails> {
  try {
    const meeting = await prisma.meeting.create({
      data: {
        id: 'meeting_' + Date.now(),
        title: data.title,
        scheduledStartAt: data.scheduledStartAt,
        platform: data.platform,
        meetingUrl: data.meetingUrl,
        status: MeetingStatus.scheduled,
        organizationId: data.organizationId,
        userId: data.createdBy, // userId is required in schema
        createdBy: data.createdBy,
      },
      include: {
        participants: true,
      },
    });

    logger.info('Meeting created', { meetingId: meeting.id });
    return meeting as any;
  } catch (error) {
    logger.error('Error creating meeting', { error });
    throw error;
  }
}

export const meetingService = {
  getMeetingById,
  updateMeetingStatus,
  getOrganizationMeetings,
  createMeeting,
};
