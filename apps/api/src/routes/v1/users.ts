/**
 * Public API v1 - Users Endpoints
 *
 * Provides user management within organization:
 * - List users in organization
 * - Get single user details
 * - Update user information
 */

import { Router, Response } from 'express';
import { param, query, body, validationResult } from 'express-validator';
import { PrismaClient } from '@prisma/client';
import { APIKeyRequest } from '../../middleware/apiKeyAuth';
import { logger } from '../../utils/logger';
import { requireScopes } from '../../middleware/apiKeyAuth';

const router: Router = Router();
const prisma = new PrismaClient();

/**
 * GET /api/v1/users
 * List users in organization with pagination and filtering
 */
router.get(
  '/',
  requireScopes('read'),
  [
    query('limit').optional().isInt({ min: 1, max: 100 }).withMessage('Limit must be between 1 and 100'),
    query('offset').optional().isInt({ min: 0 }).withMessage('Offset must be >= 0'),
    query('role').optional().isIn(['user', 'admin', 'super_admin']).withMessage('Invalid role'),
    query('search').optional().isString().withMessage('search must be a string'),
    query('sortBy').optional().isIn(['createdAt', 'name', 'email']).withMessage('Invalid sortBy field'),
    query('sortOrder').optional().isIn(['asc', 'desc']).withMessage('sortOrder must be asc or desc'),
  ],
  async (req: APIKeyRequest, res: Response) => {
    try {
      const errors = validationResult(req);
      if (!errors.isEmpty()) {
        return res.status(400).json({
          success: false,
          error: 'Validation error',
          details: errors.array()
        });
      }

      const limit = parseInt(req.query.limit as string) || 20;
      const offset = parseInt(req.query.offset as string) || 0;
      const role = req.query.role as string | undefined;
      const search = req.query.search as string | undefined;
      const sortBy = (req.query.sortBy as string) || 'createdAt';
      const sortOrder = (req.query.sortOrder as 'asc' | 'desc') || 'desc';

      const where: any = {
        organizationId: req.apiKey!.organizationId,
      };

      if (role) {
        where.role = role;
      }

      if (search) {
        where.OR = [
          { name: { contains: search, mode: 'insensitive' } },
          { email: { contains: search, mode: 'insensitive' } },
        ];
      }

      const [users, total] = await Promise.all([
        prisma.user.findMany({
          where,
          take: limit,
          skip: offset,
          orderBy: { [sortBy]: sortOrder },
          select: {
            id: true,
            email: true,
            firstName: true,
            lastName: true,
            role: true,
            avatarUrl: true,
            preferences: true,
            lastLoginAt: true,
            createdAt: true,
            updatedAt: true,
          },
        }),
        prisma.user.count({ where }),
      ]);

      res.json({
        success: true,
        data: users.map(user => ({
          id: user.id,
          email: user.email,
          name: `${user.firstName || ''} ${user.lastName || ''}`.trim() || null,
          role: user.role,
          avatar: user.avatarUrl,
          lastLoginAt: user.lastLoginAt,
          createdAt: user.createdAt,
          updatedAt: user.updatedAt,
        })),
        pagination: {
          total,
          limit,
          offset,
          hasMore: offset + limit < total,
          nextOffset: offset + limit < total ? offset + limit : null,
        },
      });
    } catch (error: any) {
      logger.error('Error listing users', { error, organizationId: req.apiKey?.organizationId });
      res.status(500).json({
        success: false,
        error: 'Internal server error',
        message: 'Failed to list users',
      });
    }
  }
);

/**
 * GET /api/v1/users/:id
 * Get detailed user information
 */
router.get(
  '/:id',
  requireScopes('read'),
  [param('id').isString().notEmpty().withMessage('User ID is required')],
  async (req: APIKeyRequest, res: Response) => {
    try {
      const errors = validationResult(req);
      if (!errors.isEmpty()) {
        return res.status(400).json({
          success: false,
          error: 'Validation error',
          details: errors.array()
        });
      }

      const { id } = req.params;

      const user = await prisma.user.findFirst({
        where: {
          id,
          organizationId: req.apiKey!.organizationId,
        },
        select: {
          id: true,
          email: true,
          firstName: true,
          lastName: true,
          role: true,
          avatarUrl: true,
          preferences: true,
          lastLoginAt: true,
          createdAt: true,
          updatedAt: true,
          _count: {
            select: {
              meetings: true,
            },
          },
        },
      });

      if (!user) {
        return res.status(404).json({
          success: false,
          error: 'Not found',
          message: 'User not found',
        });
      }

      // Get user statistics
      const meetingStats = await prisma.meeting.aggregate({
        where: {
          userId: id,
          organizationId: req.apiKey!.organizationId,
          status: 'completed',
        },
        _sum: {
          durationSeconds: true,
        },
        _count: {
          id: true,
        },
      });

      res.json({
        success: true,
        data: {
          id: user.id,
          email: user.email,
          name: `${user.firstName || ''} ${user.lastName || ''}`.trim() || null,
          role: user.role,
          avatar: user.avatarUrl,
          timezone: (user.preferences as any)?.timezone || null,
          language: (user.preferences as any)?.language || null,
          lastLoginAt: user.lastLoginAt,
          createdAt: user.createdAt,
          updatedAt: user.updatedAt,
          statistics: {
            totalMeetings: meetingStats._count.id,
            totalMeetingHours: Math.round((meetingStats._sum.durationSeconds || 0) / 3600),
          },
        },
      });
    } catch (error: any) {
      logger.error('Error getting user', { error, userId: req.params.id });
      res.status(500).json({
        success: false,
        error: 'Internal server error',
        message: 'Failed to get user',
      });
    }
  }
);

/**
 * PATCH /api/v1/users/:id
 * Update user information
 */
router.patch(
  '/:id',
  requireScopes('write'),
  [
    param('id').isString().notEmpty().withMessage('User ID is required'),
    body('name').optional().isString().withMessage('name must be a string'),
    body('avatar').optional().isURL().withMessage('avatar must be a valid URL'),
    body('timezone').optional().isString().withMessage('timezone must be a string'),
    body('language').optional().isString().withMessage('language must be a string'),
    body('settings').optional().isObject().withMessage('settings must be an object'),
  ],
  async (req: APIKeyRequest, res: Response) => {
    try {
      const errors = validationResult(req);
      if (!errors.isEmpty()) {
        return res.status(400).json({
          success: false,
          error: 'Validation error',
          details: errors.array()
        });
      }

      const { id } = req.params;
      const { name, avatar, timezone, language, settings } = req.body;

      // Check if user exists and belongs to organization
      const existingUser = await prisma.user.findFirst({
        where: {
          id,
          organizationId: req.apiKey!.organizationId,
        },
      });

      if (!existingUser) {
        return res.status(404).json({
          success: false,
          error: 'Not found',
          message: 'User not found',
        });
      }

      // Prepare update data
      const updateData: any = {};
      if (name !== undefined) {
        // Parse name into firstName and lastName
        const nameParts = name.split(' ');
        updateData.firstName = nameParts[0] || '';
        updateData.lastName = nameParts.slice(1).join(' ') || '';
      }
      if (avatar !== undefined) updateData.avatarUrl = avatar;

      // Handle preferences update (timezone, language, settings all go into preferences)
      if (timezone !== undefined || language !== undefined || settings !== undefined) {
        updateData.preferences = {
          ...(existingUser.preferences as any),
          ...(timezone !== undefined && { timezone }),
          ...(language !== undefined && { language }),
          ...(settings !== undefined && settings),
        };
      }

      // Update user
      const updatedUser = await prisma.user.update({
        where: { id },
        data: updateData,
        select: {
          id: true,
          email: true,
          firstName: true,
          lastName: true,
          role: true,
          avatarUrl: true,
          preferences: true,
          updatedAt: true,
        },
      });

      logger.info('User updated via API', {
        userId: id,
        organizationId: req.apiKey!.organizationId,
        apiKeyId: req.apiKey!.id,
      });

      res.json({
        success: true,
        data: updatedUser,
        message: 'User updated successfully',
      });
    } catch (error: any) {
      logger.error('Error updating user', { error, userId: req.params.id });
      res.status(500).json({
        success: false,
        error: 'Internal server error',
        message: 'Failed to update user',
      });
    }
  }
);

/**
 * GET /api/v1/users/:id/meetings
 * Get meetings for a specific user
 */
router.get(
  '/:id/meetings',
  requireScopes('read'),
  [
    param('id').isString().notEmpty().withMessage('User ID is required'),
    query('limit').optional().isInt({ min: 1, max: 100 }).withMessage('Limit must be between 1 and 100'),
    query('offset').optional().isInt({ min: 0 }).withMessage('Offset must be >= 0'),
    query('status').optional().isIn(['scheduled', 'in_progress', 'completed', 'cancelled']),
  ],
  async (req: APIKeyRequest, res: Response) => {
    try {
      const errors = validationResult(req);
      if (!errors.isEmpty()) {
        return res.status(400).json({
          success: false,
          error: 'Validation error',
          details: errors.array()
        });
      }

      const { id } = req.params;
      const limit = parseInt(req.query.limit as string) || 20;
      const offset = parseInt(req.query.offset as string) || 0;
      const status = req.query.status as string | undefined;

      // Verify user belongs to organization
      const user = await prisma.user.findFirst({
        where: {
          id,
          organizationId: req.apiKey!.organizationId,
        },
      });

      if (!user) {
        return res.status(404).json({
          success: false,
          error: 'Not found',
          message: 'User not found',
        });
      }

      const where: any = {
        userId: id,
        organizationId: req.apiKey!.organizationId,
      };

      if (status) {
        where.status = status;
      }

      const [meetings, total] = await Promise.all([
        prisma.meeting.findMany({
          where,
          take: limit,
          skip: offset,
          orderBy: { createdAt: 'desc' },
          select: {
            id: true,
            title: true,
            status: true,
            scheduledStartAt: true,
            actualStartAt: true,
            actualEndAt: true,
            durationSeconds: true,
            createdAt: true,
          },
        }),
        prisma.meeting.count({ where }),
      ]);

      res.json({
        success: true,
        data: meetings,
        pagination: {
          total,
          limit,
          offset,
          hasMore: offset + limit < total,
          nextOffset: offset + limit < total ? offset + limit : null,
        },
      });
    } catch (error: any) {
      logger.error('Error getting user meetings', { error, userId: req.params.id });
      res.status(500).json({
        success: false,
        error: 'Internal server error',
        message: 'Failed to get user meetings',
      });
    }
  }
);

export default router;
