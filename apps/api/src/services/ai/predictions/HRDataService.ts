/**
 * HR Data Service
 *
 * Provides access to employee and HR-related data from:
 * - Local database (User, MeetingParticipant models)
 * - External HR systems (BambooHR, Workday) when integrated
 * - Meeting participation and engagement metrics
 *
 * This service abstracts HR data retrieval for AI prediction services.
 */

import { PrismaClient, User } from '@prisma/client';
import winston from 'winston';
import { CacheService } from '../../cache';

const logger = winston.createLogger({
  level: process.env.LOG_LEVEL || 'info',
  defaultMeta: { service: 'hr-data-service' },
  transports: [new winston.transports.Console()],
});

export interface Employee {
  id: string;
  email: string;
  firstName?: string;
  lastName?: string;
  fullName?: string;
  title?: string;
  department?: string;
  managerId?: string;
  managerEmail?: string;
  hireDate?: Date;
  tenure?: number; // in days
  location?: string;
  employmentType?: string; // full-time, part-time, contractor
  level?: string; // junior, mid, senior, lead, manager, director, vp, c-level
  teamSize?: number;
  lastPromotionDate?: Date;
  performanceRating?: number;
  compensationBand?: string;
}

export interface EmployeeEngagement {
  employeeId: string;
  meetingParticipation: number; // percentage
  averageTalkTime: number; // seconds
  oneOnOneFrequency: number; // meetings per month
  teamMeetingAttendance: number; // percentage
  lastOneOnOneDate?: Date;
  managerInteractionScore: number; // 0-100
  peerCollaborationScore: number; // 0-100
  initiativeCount: number; // proactive contributions
}

export interface TeamMetrics {
  teamId: string;
  teamName?: string;
  size: number;
  averageEngagement: number;
  averageTenure: number; // days
  turnoverRate: number; // percentage
  meetingFrequency: number; // per week
  collaborationScore: number; // 0-100
}

export interface ManagerRelationship {
  employeeId: string;
  managerId: string;
  relationshipDuration: number; // days
  oneOnOneFrequency: number; // per month
  feedbackFrequency: number; // per quarter
  lastFeedbackDate?: Date;
  relationshipQuality: number; // 0-100
}

export class HRDataService {
  private prisma: PrismaClient;
  private cacheService?: CacheService;
  private cacheTTL: number = 300; // 5 minutes

  constructor(prisma: PrismaClient, cacheService?: CacheService) {
    this.prisma = prisma;
    this.cacheService = cacheService;
  }

  /**
   * Get employee data by ID or email
   */
  async getEmployee(
    identifier: string,
    organizationId: string
  ): Promise<Employee | null> {
    const cacheKey = `hr:employee:${identifier}`;

    // Check cache first
    if (this.cacheService) {
      const cached = await this.cacheService.get(cacheKey);
      if (cached) return JSON.parse(cached);
    }

    try {
      // Try to find user by ID or email
      const user = await this.prisma.user.findFirst({
        where: {
          organizationId,
          OR: [
            { id: identifier },
            { email: identifier },
          ],
        },
      });

      if (!user) return null;

      // Get additional data from meeting participation
      const participantData = await this.getParticipantData(user.email, organizationId);

      // Calculate tenure
      const tenure = this.calculateTenure(user.createdAt);

      // Build employee object
      const employee: Employee = {
        id: user.id,
        email: user.email,
        firstName: user.firstName || undefined,
        lastName: user.lastName || undefined,
        fullName: this.getFullName(user),
        title: participantData?.title,
        department: participantData?.department,
        hireDate: user.createdAt,
        tenure,
        level: this.inferLevel(participantData?.title),
        // These would come from HR system integration or metadata
        managerId: (user.metadata as any)?.managerId,
        managerEmail: (user.metadata as any)?.managerEmail,
        location: (user.metadata as any)?.location,
        employmentType: (user.metadata as any)?.employmentType || 'full-time',
        lastPromotionDate: (user.metadata as any)?.lastPromotionDate
          ? new Date((user.metadata as any).lastPromotionDate)
          : undefined,
        performanceRating: (user.metadata as any)?.performanceRating,
        compensationBand: (user.metadata as any)?.compensationBand,
      };

      // Cache the result
      if (this.cacheService) {
        await this.cacheService.set(cacheKey, JSON.stringify(employee), this.cacheTTL);
      }

      return employee;
    } catch (error) {
      logger.error('Failed to get employee:', error);
      return null;
    }
  }

  /**
   * Get employee engagement metrics
   */
  async getEmployeeEngagement(
    employeeId: string,
    organizationId: string,
    daysBack: number = 90
  ): Promise<EmployeeEngagement | null> {
    const cacheKey = `hr:engagement:${employeeId}:${daysBack}`;

    if (this.cacheService) {
      const cached = await this.cacheService.get(cacheKey);
      if (cached) return JSON.parse(cached);
    }

    try {
      const employee = await this.getEmployee(employeeId, organizationId);
      if (!employee) return null;

      const startDate = new Date();
      startDate.setDate(startDate.getDate() - daysBack);

      // Get all meetings the employee participated in
      const meetings = await this.prisma.meeting.findMany({
        where: {
          organizationId,
          scheduledStartAt: { gte: startDate },
          participants: {
            some: {
              OR: [
                { email: employee.email },
                { userId: employee.id },
              ],
            },
          },
        },
        include: {
          participants: true,
        },
      });

      // Calculate metrics
      const totalScheduled = meetings.filter(m => m.status === 'scheduled').length;
      const totalAttended = meetings.filter(m => m.status === 'completed').length;
      const participationRate = totalScheduled > 0 ? totalAttended / totalScheduled : 0;

      // Calculate average talk time
      let totalTalkTime = 0;
      let talkTimeCount = 0;

      meetings.forEach(meeting => {
        const participant = meeting.participants.find(p =>
          p.email === employee.email || p.userId === employee.id
        );
        if (participant && participant.talkTimeSeconds > 0) {
          totalTalkTime += participant.talkTimeSeconds;
          talkTimeCount++;
        }
      });

      const avgTalkTime = talkTimeCount > 0 ? totalTalkTime / talkTimeCount : 0;

      // Count 1-on-1 meetings
      const oneOnOnes = meetings.filter(m =>
        m.title.toLowerCase().includes('1:1') ||
        m.title.toLowerCase().includes('one on one') ||
        m.participants.length === 2
      );

      const oneOnOneFrequency = (oneOnOnes.length / (daysBack / 30)); // per month

      // Team meeting attendance
      const teamMeetings = meetings.filter(m => m.participants.length > 2);
      const teamMeetingAttendance = teamMeetings.length > 0
        ? teamMeetings.filter(m => m.status === 'completed').length / teamMeetings.length
        : 0;

      // Last 1-on-1 date
      const lastOneOnOne = oneOnOnes
        .sort((a, b) => (b.scheduledStartAt?.getTime() || 0) - (a.scheduledStartAt?.getTime() || 0))[0];

      // Manager interaction score (based on 1-on-1 frequency and participation)
      const managerInteractionScore = Math.min(100, oneOnOneFrequency * 25 + participationRate * 50);

      // Peer collaboration score (based on team meeting participation)
      const peerCollaborationScore = teamMeetingAttendance * 100;

      // Count initiatives (meetings they organized or where they were the organizer)
      const initiativeCount = meetings.filter(m => {
        const participant = m.participants.find(p =>
          p.email === employee.email || p.userId === employee.id
        );
        return participant?.isOrganizer;
      }).length;

      const engagement: EmployeeEngagement = {
        employeeId: employee.id,
        meetingParticipation: participationRate * 100,
        averageTalkTime: avgTalkTime,
        oneOnOneFrequency,
        teamMeetingAttendance: teamMeetingAttendance * 100,
        lastOneOnOneDate: lastOneOnOne?.scheduledStartAt || undefined,
        managerInteractionScore,
        peerCollaborationScore,
        initiativeCount,
      };

      // Cache the result
      if (this.cacheService) {
        await this.cacheService.set(cacheKey, JSON.stringify(engagement), this.cacheTTL);
      }

      return engagement;
    } catch (error) {
      logger.error('Failed to get employee engagement:', error);
      return null;
    }
  }

  /**
   * Get team metrics for a manager
   */
  async getTeamMetrics(
    managerId: string,
    organizationId: string
  ): Promise<TeamMetrics | null> {
    try {
      // Find team members (users who report to this manager)
      const teamMembers = await this.prisma.user.findMany({
        where: {
          organizationId,
          metadata: {
            path: ['managerId'],
            equals: managerId,
          },
        },
      });

      if (teamMembers.length === 0) {
        // Manager might not have direct reports
        return null;
      }

      // Calculate team metrics
      const engagementPromises = teamMembers.map(member =>
        this.getEmployeeEngagement(member.id, organizationId, 90)
      );
      const engagements = await Promise.all(engagementPromises);

      const validEngagements = engagements.filter(e => e !== null) as EmployeeEngagement[];

      const averageEngagement = validEngagements.length > 0
        ? validEngagements.reduce((sum, e) => sum + e.meetingParticipation, 0) / validEngagements.length
        : 0;

      const averageTenure = teamMembers.reduce((sum, member) => {
        return sum + this.calculateTenure(member.createdAt);
      }, 0) / teamMembers.length;

      // Calculate turnover (simplified - based on inactive users)
      const inactiveCount = teamMembers.filter(m => !m.isActive).length;
      const turnoverRate = (inactiveCount / teamMembers.length) * 100;

      // Calculate meeting frequency for the team
      const thirtyDaysAgo = new Date();
      thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30);

      const teamMeetings = await this.prisma.meeting.count({
        where: {
          organizationId,
          scheduledStartAt: { gte: thirtyDaysAgo },
          participants: {
            some: {
              userId: { in: teamMembers.map(m => m.id) },
            },
          },
        },
      });

      const meetingFrequency = teamMeetings / 4; // per week

      // Calculate collaboration score
      const collaborationScore = Math.min(100,
        averageEngagement * 0.3 +
        (meetingFrequency * 10) +
        ((100 - turnoverRate) * 0.3)
      );

      return {
        teamId: managerId,
        teamName: `Team ${managerId}`,
        size: teamMembers.length,
        averageEngagement,
        averageTenure,
        turnoverRate,
        meetingFrequency,
        collaborationScore,
      };
    } catch (error) {
      logger.error('Failed to get team metrics:', error);
      return null;
    }
  }

  /**
   * Get manager relationship quality
   */
  async getManagerRelationship(
    employeeId: string,
    organizationId: string
  ): Promise<ManagerRelationship | null> {
    try {
      const employee = await this.getEmployee(employeeId, organizationId);
      if (!employee || !employee.managerId) return null;

      const manager = await this.getEmployee(employee.managerId, organizationId);
      if (!manager) return null;

      const ninetyDaysAgo = new Date();
      ninetyDaysAgo.setDate(ninetyDaysAgo.getDate() - 90);

      // Get 1-on-1 meetings between employee and manager
      const oneOnOnes = await this.prisma.meeting.findMany({
        where: {
          organizationId,
          scheduledStartAt: { gte: ninetyDaysAgo },
          participants: {
            every: {
              OR: [
                { email: { in: [employee.email, manager.email] } },
                { userId: { in: [employee.id, manager.id] } },
              ],
            },
          },
        },
        include: {
          aiAnalyses: true,
        },
        orderBy: { scheduledStartAt: 'desc' },
      });

      // Filter to ensure both participants are in the meeting
      const actualOneOnOnes = oneOnOnes.filter(m =>
        m.participants.length === 2 ||
        m.title.toLowerCase().includes('1:1') ||
        m.title.toLowerCase().includes('one on one')
      );

      const oneOnOneFrequency = (actualOneOnOnes.length / 3); // per month

      // Count feedback sessions (meetings with certain keywords)
      const feedbackKeywords = ['feedback', 'review', 'performance', 'evaluation'];
      const feedbackSessions = actualOneOnOnes.filter(m =>
        feedbackKeywords.some(k => m.title.toLowerCase().includes(k))
      );

      const feedbackFrequency = feedbackSessions.length; // per quarter

      const lastFeedback = feedbackSessions[0];

      // Calculate relationship quality based on frequency and sentiment
      let totalSentiment = 0;
      let sentimentCount = 0;

      actualOneOnOnes.forEach(meeting => {
        if (meeting.aiAnalyses?.length > 0) {
          const sentiment = (meeting.aiAnalyses[0].sentiment as any)?.overall;
          if (typeof sentiment === 'number') {
            totalSentiment += sentiment;
            sentimentCount++;
          }
        }
      });

      const avgSentiment = sentimentCount > 0 ? totalSentiment / sentimentCount : 0;

      // Calculate relationship quality score
      const relationshipQuality = Math.min(100,
        Math.max(0,
          50 + // base score
          (oneOnOneFrequency * 10) + // frequency bonus
          (avgSentiment * 20) + // sentiment impact
          (feedbackFrequency * 5) // feedback bonus
        )
      );

      // Calculate relationship duration
      const relationshipStart = employee.hireDate || employee.hireDate || new Date();
      const relationshipDuration = Math.floor(
        (Date.now() - relationshipStart.getTime()) / (1000 * 60 * 60 * 24)
      );

      return {
        employeeId: employee.id,
        managerId: manager.id,
        relationshipDuration,
        oneOnOneFrequency,
        feedbackFrequency,
        lastFeedbackDate: lastFeedback?.scheduledStartAt || undefined,
        relationshipQuality,
      };
    } catch (error) {
      logger.error('Failed to get manager relationship:', error);
      return null;
    }
  }

  /**
   * Get employees by department
   */
  async getEmployeesByDepartment(
    department: string,
    organizationId: string
  ): Promise<Employee[]> {
    try {
      const participants = await this.prisma.meetingParticipant.findMany({
        where: {
          meeting: {
            organizationId,
          },
          metadata: {
            path: ['department'],
            equals: department,
          },
        },
        distinct: ['email'],
      });

      const employees: Employee[] = [];

      for (const participant of participants) {
        if (participant.email) {
          const employee = await this.getEmployee(participant.email, organizationId);
          if (employee) {
            employees.push(employee);
          }
        }
      }

      return employees;
    } catch (error) {
      logger.error('Failed to get employees by department:', error);
      return [];
    }
  }

  /**
   * Helper: Get participant data from meetings
   */
  private async getParticipantData(
    email: string,
    organizationId: string
  ): Promise<{ title?: string; department?: string } | null> {
    const participant = await this.prisma.meetingParticipant.findFirst({
      where: {
        email,
        meeting: {
          organizationId,
        },
        role: { not: null },
      },
      orderBy: { createdAt: 'desc' },
    });

    if (!participant) return null;

    const metadata = participant.metadata as any;

    return {
      title: participant.role || metadata?.title,
      department: metadata?.department,
    };
  }

  /**
   * Helper: Calculate tenure in days
   */
  private calculateTenure(startDate: Date): number {
    return Math.floor((Date.now() - startDate.getTime()) / (1000 * 60 * 60 * 24));
  }

  /**
   * Helper: Get full name
   */
  private getFullName(user: User): string {
    if (user.firstName && user.lastName) {
      return `${user.firstName} ${user.lastName}`;
    }
    if (user.firstName) return user.firstName;
    if (user.lastName) return user.lastName;
    return user.email.split('@')[0];
  }

  /**
   * Helper: Infer level from title
   */
  private inferLevel(title?: string): string | undefined {
    if (!title) return undefined;

    const lowerTitle = title.toLowerCase();

    if (lowerTitle.includes('ceo') || lowerTitle.includes('cto') || lowerTitle.includes('cfo')) {
      return 'c-level';
    }
    if (lowerTitle.includes('vp') || lowerTitle.includes('vice president')) {
      return 'vp';
    }
    if (lowerTitle.includes('director')) {
      return 'director';
    }
    if (lowerTitle.includes('manager') || lowerTitle.includes('lead')) {
      return 'manager';
    }
    if (lowerTitle.includes('senior') || lowerTitle.includes('sr')) {
      return 'senior';
    }
    if (lowerTitle.includes('junior') || lowerTitle.includes('jr')) {
      return 'junior';
    }

    return 'mid';
  }

  /**
   * Integration with external HR systems (stub methods)
   */
  async fetchBambooHRData(employeeId: string): Promise<Employee | null> {
    // Would integrate with BambooHR API if credentials available
    logger.debug('BambooHR integration not configured');
    return null;
  }

  async fetchWorkdayData(employeeId: string): Promise<Employee | null> {
    // Would integrate with Workday API if credentials available
    logger.debug('Workday integration not configured');
    return null;
  }
}

/**
 * Factory function to create HRDataService
 */
export function createHRDataService(
  prisma: PrismaClient,
  cacheService?: CacheService
): HRDataService {
  return new HRDataService(prisma, cacheService);
}