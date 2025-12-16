/**
 * Admin Support Ticket Routes
 * Support ticket management for Super Admin Dashboard
 */

import { Router, Request, Response } from 'express';
import { PrismaClient, TicketStatus, TicketPriority } from '@prisma/client';
import { requirePermission, requireRole, auditAdminAction } from '../../middleware/admin-auth';
import { logger } from '../../utils/logger';

const router = Router();
const prisma = new PrismaClient();

/**
 * Generate a unique ticket number
 * Format: TKT-YYYYMMDD-XXXX
 */
async function generateTicketNumber(): Promise<string> {
  const today = new Date();
  const datePrefix = today.toISOString().slice(0, 10).replace(/-/g, '');
  const prefix = 'TKT-' + datePrefix + '-';

  const lastTicket = await prisma.supportTicket.findFirst({
    where: {
      ticketNumber: {
        startsWith: prefix,
      },
    },
    orderBy: {
      ticketNumber: 'desc',
    },
    select: {
      ticketNumber: true,
    },
  });

  let nextNumber = 1;
  if (lastTicket) {
    const lastNumberStr = lastTicket.ticketNumber.split('-').pop();
    if (lastNumberStr) {
      nextNumber = parseInt(lastNumberStr, 10) + 1;
    }
  }

  return prefix + nextNumber.toString().padStart(4, '0');
}

/**
 * Calculate SLA metrics for a ticket
 */
function calculateSLAMetrics(
  priority: TicketPriority,
  createdAt: Date,
  firstResponseAt: Date | null,
  resolvedAt: Date | null
): {
  responseTimeTarget: number;
  resolutionTimeTarget: number;
  responseTimeMet: boolean | null;
  resolutionTimeMet: boolean | null;
  responseTimeHours: number | null;
  resolutionTimeHours: number | null;
} {
  const slaTargets: Record<TicketPriority, { response: number; resolution: number }> = {
    urgent: { response: 1, resolution: 4 },
    high: { response: 4, resolution: 24 },
    medium: { response: 8, resolution: 48 },
    low: { response: 24, resolution: 120 },
  };

  const targets = slaTargets[priority];
  const now = new Date();

  let responseTimeHours: number | null = null;
  let resolutionTimeHours: number | null = null;
  let responseTimeMet: boolean | null = null;
  let resolutionTimeMet: boolean | null = null;

  if (firstResponseAt) {
    responseTimeHours = (firstResponseAt.getTime() - createdAt.getTime()) / (1000 * 60 * 60);
    responseTimeMet = responseTimeHours <= targets.response;
  }

  if (resolvedAt) {
    resolutionTimeHours = (resolvedAt.getTime() - createdAt.getTime()) / (1000 * 60 * 60);
    resolutionTimeMet = resolutionTimeHours <= targets.resolution;
  }

  return {
    responseTimeTarget: targets.response,
    resolutionTimeTarget: targets.resolution,
    responseTimeMet,
    resolutionTimeMet,
    responseTimeHours,
    resolutionTimeHours,
  };
}

// List all support tickets with pagination and filters
router.get(
  '/',
  requirePermission('read:users'),
  async (req: Request, res: Response) => {
    try {
      const page = parseInt(req.query.page as string) || 1;
      const limit = Math.min(parseInt(req.query.limit as string) || 20, 100);
      const skip = (page - 1) * limit;
      const search = req.query.search as string;
      const status = req.query.status as TicketStatus;
      const priority = req.query.priority as TicketPriority;
      const assigneeId = req.query.assigneeId as string;
      const organizationId = req.query.organizationId as string;
      const userId = req.query.userId as string;
      const category = req.query.category as string;
      const slaBreached = req.query.slaBreached === 'true';
      const sortBy = (req.query.sortBy as string) || 'createdAt';
      const sortOrder = (req.query.sortOrder as 'asc' | 'desc') || 'desc';

      const where: Record<string, unknown> = {};

      if (search) {
        where.OR = [
          { ticketNumber: { contains: search, mode: 'insensitive' } },
          { subject: { contains: search, mode: 'insensitive' } },
          { description: { contains: search, mode: 'insensitive' } },
        ];
      }
      if (status) where.status = status;
      if (priority) where.priority = priority;
      if (assigneeId) where.assigneeId = assigneeId;
      if (organizationId) where.organizationId = organizationId;
      if (userId) where.userId = userId;
      if (category) where.category = category;
      if (req.query.slaBreached !== undefined) where.slaBreached = slaBreached;

      const [tickets, total] = await Promise.all([
        prisma.supportTicket.findMany({
          where,
          skip,
          take: limit,
          orderBy: { [sortBy]: sortOrder },
          include: {
            messages: {
              orderBy: { createdAt: 'desc' },
              take: 1,
              select: {
                id: true,
                content: true,
                senderType: true,
                senderName: true,
                createdAt: true,
              },
            },
            _count: {
              select: {
                messages: true,
              },
            },
          },
        }),
        prisma.supportTicket.count({ where }),
      ]);

      // Fetch user and assignee details
      const userIds = [...new Set(tickets.map((t) => t.userId))];
      const assigneeIds = [...new Set(tickets.filter((t) => t.assigneeId).map((t) => t.assigneeId as string))];
      const orgIds = [...new Set(tickets.filter((t) => t.organizationId).map((t) => t.organizationId as string))];

      const [users, assignees, organizations] = await Promise.all([
        prisma.user.findMany({
          where: { id: { in: userIds } },
          select: { id: true, email: true, firstName: true, lastName: true },
        }),
        assigneeIds.length > 0
          ? prisma.user.findMany({
              where: { id: { in: assigneeIds } },
              select: { id: true, email: true, firstName: true, lastName: true },
            })
          : [],
        orgIds.length > 0
          ? prisma.organization.findMany({
              where: { id: { in: orgIds } },
              select: { id: true, name: true, slug: true },
            })
          : [],
      ]);

      const userMap = new Map(users.map((u) => [u.id, u] as const));
      const assigneeMap = new Map(assignees.map((a) => [a.id, a] as const));
      const orgMap = new Map(organizations.map((o) => [o.id, o] as const));

      const enrichedTickets = tickets.map((ticket) => ({
        ...ticket,
        user: userMap.get(ticket.userId) || null,
        assignee: ticket.assigneeId ? assigneeMap.get(ticket.assigneeId) || null : null,
        organization: ticket.organizationId ? orgMap.get(ticket.organizationId) || null : null,
        messageCount: ticket._count.messages,
        lastMessage: ticket.messages[0] || null,
        sla: calculateSLAMetrics(
          ticket.priority,
          ticket.createdAt,
          ticket.firstResponseAt,
          ticket.resolvedAt
        ),
      }));

      res.json({
        success: true,
        data: enrichedTickets,
        pagination: {
          page,
          limit,
          total,
          totalPages: Math.ceil(total / limit),
        },
      });
    } catch (error) {
      logger.error('Error listing support tickets', { error });
      res.status(500).json({
        success: false,
        error: 'Failed to list support tickets',
      });
    }
  }
);

// Get single ticket with full conversation history
router.get(
  '/:id',
  requirePermission('read:users'),
  async (req: Request, res: Response) => {
    try {
      const { id } = req.params;

      const ticket = await prisma.supportTicket.findUnique({
        where: { id },
        include: {
          messages: {
            orderBy: { createdAt: 'asc' },
          },
        },
      });

      if (!ticket) {
        res.status(404).json({
          success: false,
          error: 'Ticket not found',
        });
        return;
      }

      // Fetch user, assignee, and organization details
      const [user, assignee, organization] = await Promise.all([
        prisma.user.findUnique({
          where: { id: ticket.userId },
          select: { id: true, email: true, firstName: true, lastName: true, avatarUrl: true },
        }),
        ticket.assigneeId
          ? prisma.user.findUnique({
              where: { id: ticket.assigneeId },
              select: { id: true, email: true, firstName: true, lastName: true, avatarUrl: true, systemRole: true },
            })
          : null,
        ticket.organizationId
          ? prisma.organization.findUnique({
              where: { id: ticket.organizationId },
              select: { id: true, name: true, slug: true, tier: true },
            })
          : null,
      ]);

      // Get sender details for all messages
      const senderIds = [...new Set(ticket.messages.map((m) => m.senderId))];
      const senders = await prisma.user.findMany({
        where: { id: { in: senderIds } },
        select: { id: true, email: true, firstName: true, lastName: true, avatarUrl: true, systemRole: true },
      });
      const senderMap = new Map(senders.map((s) => [s.id, s]));

      const enrichedMessages = ticket.messages.map((message) => ({
        ...message,
        sender: senderMap.get(message.senderId) || null,
      }));

      res.json({
        success: true,
        data: {
          ...ticket,
          messages: enrichedMessages,
          user,
          assignee,
          organization,
          sla: calculateSLAMetrics(
            ticket.priority,
            ticket.createdAt,
            ticket.firstResponseAt,
            ticket.resolvedAt
          ),
        },
      });
    } catch (error) {
      logger.error('Error fetching support ticket', { error });
      res.status(500).json({
        success: false,
        error: 'Failed to fetch support ticket',
      });
    }
  }
);

// Create ticket (admin creating on behalf of user)
router.post(
  '/',
  requirePermission('write:users'),
  auditAdminAction('admin:create_support_ticket'),
  async (req: Request, res: Response) => {
    try {
      const {
        subject,
        description,
        priority,
        category,
        userId,
        organizationId,
        tags,
        assigneeId,
      } = req.body;

      if (!subject || !description || !userId) {
        res.status(400).json({
          success: false,
          error: 'Subject, description, and userId are required',
        });
        return;
      }

      // Verify user exists
      const user = await prisma.user.findUnique({
        where: { id: userId },
        select: { id: true, email: true, firstName: true, lastName: true },
      });

      if (!user) {
        res.status(404).json({
          success: false,
          error: 'User not found',
        });
        return;
      }

      // Verify assignee exists if provided
      if (assigneeId) {
        const assignee = await prisma.user.findUnique({
          where: { id: assigneeId },
          select: { id: true, systemRole: true },
        });

        if (!assignee || !assignee.systemRole) {
          res.status(400).json({
            success: false,
            error: 'Invalid assignee - must be an admin user',
          });
          return;
        }
      }

      const ticketNumber = await generateTicketNumber();
      const admin = (req as unknown as Record<string, unknown>).admin as { id: string; email: string } | undefined;

      const ticket = await prisma.supportTicket.create({
        data: {
          ticketNumber,
          subject,
          description,
          priority: priority || 'medium',
          category: category || 'general',
          userId,
          organizationId: organizationId || null,
          assigneeId: assigneeId || null,
          tags: tags || [],
          source: 'admin',
          metadata: {
            createdByAdmin: admin?.id,
            createdByAdminEmail: admin?.email,
          },
        },
        include: {
          messages: true,
        },
      });

      // Create initial system message
      await prisma.ticketMessage.create({
        data: {
          ticketId: ticket.id,
          senderId: admin?.id || 'system',
          senderType: 'system',
          senderName: 'System',
          content: 'Ticket created by admin ' + (admin?.email || 'unknown') + ' on behalf of user.',
          isInternal: true,
        },
      });

      logger.info('Support ticket created by admin', {
        ticketId: ticket.id,
        ticketNumber: ticket.ticketNumber,
        adminId: admin?.id,
        userId,
      });

      res.status(201).json({
        success: true,
        data: ticket,
      });
    } catch (error) {
      logger.error('Error creating support ticket', { error });
      res.status(500).json({
        success: false,
        error: 'Failed to create support ticket',
      });
    }
  }
);

// Update ticket (status, priority, assignee)
router.put(
  '/:id',
  requirePermission('write:users'),
  auditAdminAction('admin:update_support_ticket'),
  async (req: Request, res: Response) => {
    try {
      const { id } = req.params;
      const {
        status,
        priority,
        category,
        tags,
        assigneeId,
        satisfactionRating,
        satisfactionComment,
      } = req.body;

      const existingTicket = await prisma.supportTicket.findUnique({
        where: { id },
        select: { id: true, status: true, priority: true, firstResponseAt: true },
      });

      if (!existingTicket) {
        res.status(404).json({
          success: false,
          error: 'Ticket not found',
        });
        return;
      }

      // Verify assignee exists if provided
      if (assigneeId) {
        const assignee = await prisma.user.findUnique({
          where: { id: assigneeId },
          select: { id: true, systemRole: true },
        });

        if (!assignee || !assignee.systemRole) {
          res.status(400).json({
            success: false,
            error: 'Invalid assignee - must be an admin user',
          });
          return;
        }
      }

      const updateData: Record<string, unknown> = {};

      if (status !== undefined) {
        updateData.status = status;
        if (status === 'resolved' && existingTicket.status !== 'resolved') {
          updateData.resolvedAt = new Date();
        }
        if (status === 'closed' && existingTicket.status !== 'closed') {
          updateData.closedAt = new Date();
        }
      }
      if (priority !== undefined) updateData.priority = priority;
      if (category !== undefined) updateData.category = category;
      if (tags !== undefined) updateData.tags = tags;
      if (assigneeId !== undefined) updateData.assigneeId = assigneeId;
      if (satisfactionRating !== undefined) updateData.satisfactionRating = satisfactionRating;
      if (satisfactionComment !== undefined) updateData.satisfactionComment = satisfactionComment;

      const ticket = await prisma.supportTicket.update({
        where: { id },
        data: updateData,
      });

      const admin = (req as unknown as Record<string, unknown>).admin as { id: string; email: string } | undefined;

      // Log status change as system message
      if (status && status !== existingTicket.status) {
        await prisma.ticketMessage.create({
          data: {
            ticketId: ticket.id,
            senderId: admin?.id || 'system',
            senderType: 'system',
            senderName: 'System',
            content: 'Ticket status changed from ' + existingTicket.status + ' to ' + status + ' by ' + (admin?.email || 'admin') + '.',
            isInternal: true,
          },
        });
      }

      logger.info('Support ticket updated', {
        ticketId: id,
        adminId: admin?.id,
        changes: req.body,
      });

      res.json({
        success: true,
        data: ticket,
      });
    } catch (error) {
      logger.error('Error updating support ticket', { error });
      res.status(500).json({
        success: false,
        error: 'Failed to update support ticket',
      });
    }
  }
);

// Add message/reply to ticket
router.post(
  '/:id/messages',
  requirePermission('write:users'),
  auditAdminAction('admin:reply_support_ticket'),
  async (req: Request, res: Response) => {
    try {
      const { id } = req.params;
      const { content, isInternal, attachments } = req.body;

      if (!content) {
        res.status(400).json({
          success: false,
          error: 'Message content is required',
        });
        return;
      }

      const ticket = await prisma.supportTicket.findUnique({
        where: { id },
        select: { id: true, firstResponseAt: true, status: true },
      });

      if (!ticket) {
        res.status(404).json({
          success: false,
          error: 'Ticket not found',
        });
        return;
      }

      const admin = (req as unknown as Record<string, unknown>).admin as { id: string; email: string } | undefined;

      // Create message
      const message = await prisma.ticketMessage.create({
        data: {
          ticketId: id,
          senderId: admin?.id || 'unknown',
          senderType: 'admin',
          senderName: admin?.email || 'Admin',
          content,
          isInternal: isInternal || false,
          attachments: attachments || [],
        },
      });

      // Update ticket first response time if this is first admin response
      const updateData: Record<string, unknown> = {};
      if (!ticket.firstResponseAt && !isInternal) {
        updateData.firstResponseAt = new Date();
      }

      // Auto-update status to in_progress if currently open
      if (ticket.status === 'open' && !isInternal) {
        updateData.status = 'in_progress';
      }

      if (Object.keys(updateData).length > 0) {
        await prisma.supportTicket.update({
          where: { id },
          data: updateData,
        });
      }

      logger.info('Message added to support ticket', {
        ticketId: id,
        messageId: message.id,
        adminId: admin?.id,
        isInternal,
      });

      res.status(201).json({
        success: true,
        data: message,
      });
    } catch (error) {
      logger.error('Error adding message to support ticket', { error });
      res.status(500).json({
        success: false,
        error: 'Failed to add message to support ticket',
      });
    }
  }
);

// Assign ticket to admin user
router.put(
  '/:id/assign',
  requirePermission('write:users'),
  auditAdminAction('admin:assign_support_ticket'),
  async (req: Request, res: Response) => {
    try {
      const { id } = req.params;
      const { assigneeId } = req.body;

      const ticket = await prisma.supportTicket.findUnique({
        where: { id },
        select: { id: true, assigneeId: true, ticketNumber: true },
      });

      if (!ticket) {
        res.status(404).json({
          success: false,
          error: 'Ticket not found',
        });
        return;
      }

      // Verify assignee exists and is an admin
      if (assigneeId) {
        const assignee = await prisma.user.findUnique({
          where: { id: assigneeId },
          select: { id: true, email: true, systemRole: true },
        });

        if (!assignee) {
          res.status(404).json({
            success: false,
            error: 'Assignee not found',
          });
          return;
        }

        if (!assignee.systemRole) {
          res.status(400).json({
            success: false,
            error: 'Assignee must be an admin user with a system role',
          });
          return;
        }
      }

      const admin = (req as unknown as Record<string, unknown>).admin as { id: string; email: string } | undefined;

      const updatedTicket = await prisma.supportTicket.update({
        where: { id },
        data: {
          assigneeId: assigneeId || null,
        },
      });

      // Get assignee details for response
      const assigneeDetails = assigneeId
        ? await prisma.user.findUnique({
            where: { id: assigneeId },
            select: { id: true, email: true, firstName: true, lastName: true },
          })
        : null;

      // Log assignment as system message
      const assignmentMessage = assigneeId
        ? 'Ticket assigned to ' + (assigneeDetails?.email || assigneeId) + ' by ' + (admin?.email || 'admin') + '.'
        : 'Ticket unassigned by ' + (admin?.email || 'admin') + '.';

      await prisma.ticketMessage.create({
        data: {
          ticketId: id,
          senderId: admin?.id || 'system',
          senderType: 'system',
          senderName: 'System',
          content: assignmentMessage,
          isInternal: true,
        },
      });

      logger.info('Support ticket assigned', {
        ticketId: id,
        ticketNumber: ticket.ticketNumber,
        previousAssignee: ticket.assigneeId,
        newAssignee: assigneeId,
        assignedBy: admin?.id,
      });

      res.json({
        success: true,
        data: {
          ...updatedTicket,
          assignee: assigneeDetails,
        },
      });
    } catch (error) {
      logger.error('Error assigning support ticket', { error });
      res.status(500).json({
        success: false,
        error: 'Failed to assign support ticket',
      });
    }
  }
);

// Escalate ticket priority
router.put(
  '/:id/escalate',
  requirePermission('write:users'),
  auditAdminAction('admin:escalate_support_ticket'),
  async (req: Request, res: Response) => {
    try {
      const { id } = req.params;
      const { priority, escalationLevel, reason } = req.body;

      const ticket = await prisma.supportTicket.findUnique({
        where: { id },
        select: { id: true, priority: true, escalationLevel: true, ticketNumber: true },
      });

      if (!ticket) {
        res.status(404).json({
          success: false,
          error: 'Ticket not found',
        });
        return;
      }

      const admin = (req as unknown as Record<string, unknown>).admin as { id: string; email: string } | undefined;

      // Determine new priority based on escalation
      let newPriority = priority;
      if (!newPriority) {
        const priorityOrder: TicketPriority[] = ['low', 'medium', 'high', 'urgent'];
        const currentIndex = priorityOrder.indexOf(ticket.priority);
        if (currentIndex < priorityOrder.length - 1) {
          newPriority = priorityOrder[currentIndex + 1];
        } else {
          newPriority = ticket.priority;
        }
      }

      const newEscalationLevel = escalationLevel !== undefined
        ? escalationLevel
        : Math.min(ticket.escalationLevel + 1, 2);

      const updatedTicket = await prisma.supportTicket.update({
        where: { id },
        data: {
          priority: newPriority,
          escalationLevel: newEscalationLevel,
          escalatedAt: new Date(),
          escalatedBy: admin?.id,
          slaBreached: newEscalationLevel >= 2,
        },
      });

      // Log escalation as system message
      await prisma.ticketMessage.create({
        data: {
          ticketId: id,
          senderId: admin?.id || 'system',
          senderType: 'system',
          senderName: 'System',
          content: 'Ticket escalated from ' + ticket.priority + ' to ' + newPriority + ' (Level ' + newEscalationLevel + ') by ' + (admin?.email || 'admin') + '.' + (reason ? ' Reason: ' + reason : ''),
          isInternal: true,
        },
      });

      logger.warn('Support ticket escalated', {
        ticketId: id,
        ticketNumber: ticket.ticketNumber,
        previousPriority: ticket.priority,
        newPriority,
        previousLevel: ticket.escalationLevel,
        newLevel: newEscalationLevel,
        escalatedBy: admin?.id,
        reason,
      });

      res.json({
        success: true,
        data: updatedTicket,
      });
    } catch (error) {
      logger.error('Error escalating support ticket', { error });
      res.status(500).json({
        success: false,
        error: 'Failed to escalate support ticket',
      });
    }
  }
);

// Get ticket statistics
router.get(
  '/stats',
  requirePermission('read:users'),
  async (req: Request, res: Response) => {
    try {
      const organizationId = req.query.organizationId as string;
      const assigneeId = req.query.assigneeId as string;
      const startDate = req.query.startDate ? new Date(req.query.startDate as string) : undefined;
      const endDate = req.query.endDate ? new Date(req.query.endDate as string) : undefined;

      const baseWhere: Record<string, unknown> = {};
      if (organizationId) baseWhere.organizationId = organizationId;
      if (assigneeId) baseWhere.assigneeId = assigneeId;
      if (startDate || endDate) {
        baseWhere.createdAt = {};
        if (startDate) (baseWhere.createdAt as Record<string, Date>).gte = startDate;
        if (endDate) (baseWhere.createdAt as Record<string, Date>).lte = endDate;
      }

      // Get counts by status
      const [
        totalTickets,
        openTickets,
        inProgressTickets,
        waitingOnCustomer,
        resolvedTickets,
        closedTickets,
      ] = await Promise.all([
        prisma.supportTicket.count({ where: baseWhere }),
        prisma.supportTicket.count({ where: { ...baseWhere, status: 'open' } }),
        prisma.supportTicket.count({ where: { ...baseWhere, status: 'in_progress' } }),
        prisma.supportTicket.count({ where: { ...baseWhere, status: 'waiting_on_customer' } }),
        prisma.supportTicket.count({ where: { ...baseWhere, status: 'resolved' } }),
        prisma.supportTicket.count({ where: { ...baseWhere, status: 'closed' } }),
      ]);

      // Get counts by priority
      const [urgentTickets, highTickets, mediumTickets, lowTickets] = await Promise.all([
        prisma.supportTicket.count({ where: { ...baseWhere, priority: 'urgent', status: { notIn: ['resolved', 'closed'] } } }),
        prisma.supportTicket.count({ where: { ...baseWhere, priority: 'high', status: { notIn: ['resolved', 'closed'] } } }),
        prisma.supportTicket.count({ where: { ...baseWhere, priority: 'medium', status: { notIn: ['resolved', 'closed'] } } }),
        prisma.supportTicket.count({ where: { ...baseWhere, priority: 'low', status: { notIn: ['resolved', 'closed'] } } }),
      ]);

      // Get SLA breach count
      const slaBreachedCount = await prisma.supportTicket.count({
        where: { ...baseWhere, slaBreached: true },
      });

      // Calculate average response time (for tickets with first response)
      const ticketsWithResponse = await prisma.supportTicket.findMany({
        where: {
          ...baseWhere,
          firstResponseAt: { not: null },
        },
        select: {
          createdAt: true,
          firstResponseAt: true,
        },
      });

      let avgResponseTimeHours = 0;
      if (ticketsWithResponse.length > 0) {
        const totalResponseTime = ticketsWithResponse.reduce((sum, ticket) => {
          if (ticket.firstResponseAt) {
            return sum + (ticket.firstResponseAt.getTime() - ticket.createdAt.getTime());
          }
          return sum;
        }, 0);
        avgResponseTimeHours = totalResponseTime / ticketsWithResponse.length / (1000 * 60 * 60);
      }

      // Calculate average resolution time (for resolved/closed tickets)
      const resolvedTicketsData = await prisma.supportTicket.findMany({
        where: {
          ...baseWhere,
          resolvedAt: { not: null },
        },
        select: {
          createdAt: true,
          resolvedAt: true,
        },
      });

      let avgResolutionTimeHours = 0;
      if (resolvedTicketsData.length > 0) {
        const totalResolutionTime = resolvedTicketsData.reduce((sum, ticket) => {
          if (ticket.resolvedAt) {
            return sum + (ticket.resolvedAt.getTime() - ticket.createdAt.getTime());
          }
          return sum;
        }, 0);
        avgResolutionTimeHours = totalResolutionTime / resolvedTicketsData.length / (1000 * 60 * 60);
      }

      // Get tickets created today, this week, this month
      const now = new Date();
      const todayStart = new Date(now.getFullYear(), now.getMonth(), now.getDate());
      const weekStart = new Date(todayStart);
      weekStart.setDate(weekStart.getDate() - weekStart.getDay());
      const monthStart = new Date(now.getFullYear(), now.getMonth(), 1);

      const [todayCount, weekCount, monthCount] = await Promise.all([
        prisma.supportTicket.count({ where: { ...baseWhere, createdAt: { gte: todayStart } } }),
        prisma.supportTicket.count({ where: { ...baseWhere, createdAt: { gte: weekStart } } }),
        prisma.supportTicket.count({ where: { ...baseWhere, createdAt: { gte: monthStart } } }),
      ]);

      // Get unassigned tickets count
      const unassignedCount = await prisma.supportTicket.count({
        where: {
          ...baseWhere,
          assigneeId: null,
          status: { notIn: ['resolved', 'closed'] },
        },
      });

      // Get satisfaction stats
      const satisfactionData = await prisma.supportTicket.aggregate({
        where: {
          ...baseWhere,
          satisfactionRating: { not: null },
        },
        _avg: {
          satisfactionRating: true,
        },
        _count: {
          satisfactionRating: true,
        },
      });

      res.json({
        success: true,
        data: {
          total: totalTickets,
          byStatus: {
            open: openTickets,
            in_progress: inProgressTickets,
            waiting_on_customer: waitingOnCustomer,
            resolved: resolvedTickets,
            closed: closedTickets,
          },
          byPriority: {
            urgent: urgentTickets,
            high: highTickets,
            medium: mediumTickets,
            low: lowTickets,
          },
          slaBreached: slaBreachedCount,
          avgResponseTimeHours: Math.round(avgResponseTimeHours * 100) / 100,
          avgResolutionTimeHours: Math.round(avgResolutionTimeHours * 100) / 100,
          createdToday: todayCount,
          createdThisWeek: weekCount,
          createdThisMonth: monthCount,
          unassigned: unassignedCount,
          satisfaction: {
            average: satisfactionData._avg.satisfactionRating
              ? Math.round(satisfactionData._avg.satisfactionRating * 100) / 100
              : null,
            totalRatings: satisfactionData._count.satisfactionRating,
          },
        },
      });
    } catch (error) {
      logger.error('Error fetching ticket statistics', { error });
      res.status(500).json({
        success: false,
        error: 'Failed to fetch ticket statistics',
      });
    }
  }
);

// Get SLA compliance metrics
router.get(
  '/sla',
  requirePermission('read:users'),
  async (req: Request, res: Response) => {
    try {
      const organizationId = req.query.organizationId as string;
      const startDate = req.query.startDate ? new Date(req.query.startDate as string) : undefined;
      const endDate = req.query.endDate ? new Date(req.query.endDate as string) : undefined;

      const baseWhere: Record<string, unknown> = {};
      if (organizationId) baseWhere.organizationId = organizationId;
      if (startDate || endDate) {
        baseWhere.createdAt = {};
        if (startDate) (baseWhere.createdAt as Record<string, Date>).gte = startDate;
        if (endDate) (baseWhere.createdAt as Record<string, Date>).lte = endDate;
      }

      // SLA targets by priority (in hours)
      const slaTargets: Record<TicketPriority, { response: number; resolution: number }> = {
        urgent: { response: 1, resolution: 4 },
        high: { response: 4, resolution: 24 },
        medium: { response: 8, resolution: 48 },
        low: { response: 24, resolution: 120 },
      };

      // Get all tickets with response times
      const tickets = await prisma.supportTicket.findMany({
        where: baseWhere,
        select: {
          id: true,
          priority: true,
          createdAt: true,
          firstResponseAt: true,
          resolvedAt: true,
          slaBreached: true,
        },
      });

      // Calculate SLA compliance by priority
      const slaByPriority: Record<string, {
        totalTickets: number;
        responseCompliant: number;
        resolutionCompliant: number;
        breached: number;
        responseComplianceRate: number;
        resolutionComplianceRate: number;
      }> = {};

      for (const priority of ['urgent', 'high', 'medium', 'low'] as TicketPriority[]) {
        const priorityTickets = tickets.filter((t) => t.priority === priority);
        const targets = slaTargets[priority];

        let responseCompliant = 0;
        let resolutionCompliant = 0;
        let breached = 0;

        for (const ticket of priorityTickets) {
          if (ticket.slaBreached) {
            breached++;
            continue;
          }

          if (ticket.firstResponseAt) {
            const responseTimeHours =
              (ticket.firstResponseAt.getTime() - ticket.createdAt.getTime()) / (1000 * 60 * 60);
            if (responseTimeHours <= targets.response) {
              responseCompliant++;
            }
          }

          if (ticket.resolvedAt) {
            const resolutionTimeHours =
              (ticket.resolvedAt.getTime() - ticket.createdAt.getTime()) / (1000 * 60 * 60);
            if (resolutionTimeHours <= targets.resolution) {
              resolutionCompliant++;
            }
          }
        }

        const ticketsWithResponse = priorityTickets.filter((t) => t.firstResponseAt).length;
        const ticketsResolved = priorityTickets.filter((t) => t.resolvedAt).length;

        slaByPriority[priority] = {
          totalTickets: priorityTickets.length,
          responseCompliant,
          resolutionCompliant,
          breached,
          responseComplianceRate: ticketsWithResponse > 0
            ? Math.round((responseCompliant / ticketsWithResponse) * 100)
            : 100,
          resolutionComplianceRate: ticketsResolved > 0
            ? Math.round((resolutionCompliant / ticketsResolved) * 100)
            : 100,
        };
      }

      // Calculate overall SLA compliance
      const totalTickets = tickets.length;
      const totalBreached = tickets.filter((t) => t.slaBreached).length;
      const ticketsWithResponse = tickets.filter((t) => t.firstResponseAt).length;
      const ticketsResolved = tickets.filter((t) => t.resolvedAt).length;

      let totalResponseCompliant = 0;
      let totalResolutionCompliant = 0;

      for (const ticket of tickets) {
        const targets = slaTargets[ticket.priority];

        if (ticket.firstResponseAt) {
          const responseTimeHours =
            (ticket.firstResponseAt.getTime() - ticket.createdAt.getTime()) / (1000 * 60 * 60);
          if (responseTimeHours <= targets.response) {
            totalResponseCompliant++;
          }
        }

        if (ticket.resolvedAt) {
          const resolutionTimeHours =
            (ticket.resolvedAt.getTime() - ticket.createdAt.getTime()) / (1000 * 60 * 60);
          if (resolutionTimeHours <= targets.resolution) {
            totalResolutionCompliant++;
          }
        }
      }

      res.json({
        success: true,
        data: {
          overall: {
            totalTickets,
            breached: totalBreached,
            breachRate: totalTickets > 0
              ? Math.round((totalBreached / totalTickets) * 100)
              : 0,
            responseComplianceRate: ticketsWithResponse > 0
              ? Math.round((totalResponseCompliant / ticketsWithResponse) * 100)
              : 100,
            resolutionComplianceRate: ticketsResolved > 0
              ? Math.round((totalResolutionCompliant / ticketsResolved) * 100)
              : 100,
          },
          byPriority: slaByPriority,
          targets: slaTargets,
        },
      });
    } catch (error) {
      logger.error('Error fetching SLA metrics', { error });
      res.status(500).json({
        success: false,
        error: 'Failed to fetch SLA metrics',
      });
    }
  }
);

export default router;
