/**
 * Revenue Intelligence Routes
 * GAP #2 - Gong Competitor Features
 * Deal tracking, Win-loss analysis, Sales coaching, Pipeline insights
 */

import { Router, Request, Response } from 'express';
import { PrismaClient, DealStage, WinLossOutcome, CRMProvider } from '@prisma/client';
import Redis from 'ioredis';
import { body, param, query, validationResult } from 'express-validator';
import winston from 'winston';
import { authMiddleware } from '../middleware/auth';
import RevenueIntelligenceService from '../services/RevenueIntelligenceService';
import { Counter, Histogram } from 'prom-client';

const router: Router = Router();
const prisma = new PrismaClient();
const redis = new Redis({
  host: process.env.REDIS_HOST || 'localhost',
  port: parseInt(process.env.REDIS_PORT || '6379'),
  password: process.env.REDIS_PASSWORD,
});

const logger = winston.createLogger({
  level: process.env.LOG_LEVEL || 'info',
  defaultMeta: { service: 'revenue-routes' },
  transports: [new winston.transports.Console()],
});

// Prometheus metrics
const dealsCreated = new Counter({
  name: 'revenue_deals_created_total',
  help: 'Total number of deals created',
});

const winLossRecorded = new Counter({
  name: 'revenue_winloss_recorded_total',
  help: 'Total number of win/loss records created',
  labelNames: ['outcome'],
});

const scorecardsGenerated = new Counter({
  name: 'revenue_scorecards_generated_total',
  help: 'Total number of scorecards generated',
});

const requestDuration = new Histogram({
  name: 'revenue_request_duration_seconds',
  help: 'Revenue API request duration',
  labelNames: ['endpoint'],
});

// Initialize service
const revenueService = new RevenueIntelligenceService(prisma, redis);

// All routes require authentication
router.use(authMiddleware);

/**
 * POST /api/revenue/deals
 * Create a new deal
 */
router.post(
  '/deals',
  [
    body('name').isString().notEmpty().withMessage('Deal name is required'),
    body('amount').optional().isFloat({ min: 0 }).withMessage('Amount must be a positive number'),
    body('currency').optional().isString().isLength({ min: 3, max: 3 }).withMessage('Currency must be a 3-letter code'),
    body('stage').optional().isIn(Object.values(DealStage)).withMessage('Invalid deal stage'),
    body('probability').optional().isInt({ min: 0, max: 100 }).withMessage('Probability must be between 0-100'),
    body('expectedCloseDate').optional().isISO8601().withMessage('Invalid date format'),
    body('crmProvider').optional().isIn(Object.values(CRMProvider)).withMessage('Invalid CRM provider'),
    body('crmDealId').optional().isString(),
    body('crmAccountId').optional().isString(),
    body('contactEmail').optional().isEmail().withMessage('Invalid email'),
    body('contactName').optional().isString(),
    body('ownerId').optional().isUUID().withMessage('Invalid owner ID'),
    body('description').optional().isString(),
    body('tags').optional().isArray(),
  ],
  async (req: Request, res: Response): Promise<void> => {
    const end = requestDuration.startTimer({ endpoint: 'create_deal' });

    try {
      const errors = validationResult(req);
      if (!errors.isEmpty()) {
        res.status(400).json({ errors: errors.array() });
        return;
      }

      const organizationId = (req as any).user.organizationId;
      if (!organizationId) {
        res.status(403).json({ error: 'Organization membership required' });
        return;
      }

      const deal = await revenueService.createDeal(organizationId, {
        name: req.body.name,
        amount: req.body.amount,
        currency: req.body.currency,
        stage: req.body.stage,
        probability: req.body.probability,
        expectedCloseDate: req.body.expectedCloseDate ? new Date(req.body.expectedCloseDate) : undefined,
        crmProvider: req.body.crmProvider,
        crmDealId: req.body.crmDealId,
        crmAccountId: req.body.crmAccountId,
        contactEmail: req.body.contactEmail,
        contactName: req.body.contactName,
        ownerId: req.body.ownerId || (req as any).user.id,
        description: req.body.description,
        tags: req.body.tags,
        customFields: req.body.customFields,
      });

      dealsCreated.inc();
      res.status(201).json(deal);
    } catch (error) {
      logger.error('Error creating deal:', error);
      res.status(500).json({ error: 'Failed to create deal' });
    } finally {
      end();
    }
  }
);

/**
 * GET /api/revenue/deals
 * List all deals
 */
router.get(
  '/deals',
  [
    query('stage').optional().isIn(Object.values(DealStage)),
    query('ownerId').optional().isUUID(),
    query('search').optional().isString(),
  ],
  async (req: Request, res: Response): Promise<void> => {
    const end = requestDuration.startTimer({ endpoint: 'list_deals' });

    try {
      const organizationId = (req as any).user.organizationId;
      if (!organizationId) {
        res.status(403).json({ error: 'Organization membership required' });
        return;
      }

      const deals = await revenueService.listDeals(organizationId, {
        stage: req.query.stage as DealStage,
        ownerId: req.query.ownerId as string,
        search: req.query.search as string,
      });

      res.json({ deals, total: deals.length });
    } catch (error) {
      logger.error('Error listing deals:', error);
      res.status(500).json({ error: 'Failed to list deals' });
    } finally {
      end();
    }
  }
);

/**
 * GET /api/revenue/deals/:id
 * Get deal details
 */
router.get(
  '/deals/:id',
  [param('id').isUUID().withMessage('Invalid deal ID')],
  async (req: Request, res: Response): Promise<void> => {
    const end = requestDuration.startTimer({ endpoint: 'get_deal' });

    try {
      const errors = validationResult(req);
      if (!errors.isEmpty()) {
        res.status(400).json({ errors: errors.array() });
        return;
      }

      const organizationId = (req as any).user.organizationId;
      if (!organizationId) {
        res.status(403).json({ error: 'Organization membership required' });
        return;
      }

      const deal = await revenueService.getDeal(req.params.id, organizationId);

      if (!deal) {
        res.status(404).json({ error: 'Deal not found' });
        return;
      }

      res.json(deal);
    } catch (error) {
      logger.error('Error getting deal:', error);
      res.status(500).json({ error: 'Failed to get deal' });
    } finally {
      end();
    }
  }
);

/**
 * PUT /api/revenue/deals/:id
 * Update a deal
 */
router.put(
  '/deals/:id',
  [
    param('id').isUUID().withMessage('Invalid deal ID'),
    body('name').optional().isString().notEmpty(),
    body('amount').optional().isFloat({ min: 0 }),
    body('currency').optional().isString().isLength({ min: 3, max: 3 }),
    body('stage').optional().isIn(Object.values(DealStage)),
    body('probability').optional().isInt({ min: 0, max: 100 }),
    body('expectedCloseDate').optional().isISO8601(),
    body('actualCloseDate').optional().isISO8601(),
    body('contactEmail').optional().isEmail(),
    body('contactName').optional().isString(),
    body('ownerId').optional().isUUID(),
    body('description').optional().isString(),
    body('tags').optional().isArray(),
  ],
  async (req: Request, res: Response): Promise<void> => {
    const end = requestDuration.startTimer({ endpoint: 'update_deal' });

    try {
      const errors = validationResult(req);
      if (!errors.isEmpty()) {
        res.status(400).json({ errors: errors.array() });
        return;
      }

      const organizationId = (req as any).user.organizationId;
      if (!organizationId) {
        res.status(403).json({ error: 'Organization membership required' });
        return;
      }

      const deal = await revenueService.updateDeal(req.params.id, organizationId, {
        name: req.body.name,
        amount: req.body.amount,
        currency: req.body.currency,
        stage: req.body.stage,
        probability: req.body.probability,
        expectedCloseDate: req.body.expectedCloseDate ? new Date(req.body.expectedCloseDate) : undefined,
        actualCloseDate: req.body.actualCloseDate ? new Date(req.body.actualCloseDate) : undefined,
        contactEmail: req.body.contactEmail,
        contactName: req.body.contactName,
        ownerId: req.body.ownerId,
        description: req.body.description,
        tags: req.body.tags,
        customFields: req.body.customFields,
      });

      res.json(deal);
    } catch (error) {
      logger.error('Error updating deal:', error);
      res.status(500).json({ error: 'Failed to update deal' });
    } finally {
      end();
    }
  }
);

/**
 * POST /api/revenue/deals/:id/meetings
 * Link a meeting to a deal
 */
router.post(
  '/deals/:id/meetings',
  [
    param('id').isUUID().withMessage('Invalid deal ID'),
    body('meetingId').isUUID().withMessage('Meeting ID is required'),
    body('impact').optional().isString(),
  ],
  async (req: Request, res: Response): Promise<void> => {
    const end = requestDuration.startTimer({ endpoint: 'link_meeting' });

    try {
      const errors = validationResult(req);
      if (!errors.isEmpty()) {
        res.status(400).json({ errors: errors.array() });
        return;
      }

      const organizationId = (req as any).user.organizationId;
      if (!organizationId) {
        res.status(403).json({ error: 'Organization membership required' });
        return;
      }

      await revenueService.linkMeetingToDeal(
        req.params.id,
        req.body.meetingId,
        organizationId,
        req.body.impact
      );

      res.json({ success: true, message: 'Meeting linked to deal' });
    } catch (error) {
      logger.error('Error linking meeting to deal:', error);
      res.status(500).json({ error: 'Failed to link meeting to deal' });
    } finally {
      end();
    }
  }
);

/**
 * POST /api/revenue/win-loss
 * Record win/loss analysis
 */
router.post(
  '/win-loss',
  [
    body('dealId').isUUID().withMessage('Deal ID is required'),
    body('outcome').isIn(Object.values(WinLossOutcome)).withMessage('Outcome must be won or lost'),
    body('closedDate').isISO8601().withMessage('Closed date is required'),
    body('dealAmount').optional().isFloat({ min: 0 }),
    body('competitorName').optional().isString(),
    body('lostReason').optional().isString(),
    body('winReason').optional().isString(),
    body('keyObjections').optional().isArray(),
    body('lessonsLearned').optional().isArray(),
  ],
  async (req: Request, res: Response): Promise<void> => {
    const end = requestDuration.startTimer({ endpoint: 'record_winloss' });

    try {
      const errors = validationResult(req);
      if (!errors.isEmpty()) {
        res.status(400).json({ errors: errors.array() });
        return;
      }

      const organizationId = (req as any).user.organizationId;
      if (!organizationId) {
        res.status(403).json({ error: 'Organization membership required' });
        return;
      }

      const winLoss = await revenueService.recordWinLoss(organizationId, {
        dealId: req.body.dealId,
        outcome: req.body.outcome,
        closedDate: new Date(req.body.closedDate),
        dealAmount: req.body.dealAmount,
        competitorName: req.body.competitorName,
        lostReason: req.body.lostReason,
        winReason: req.body.winReason,
        keyObjections: req.body.keyObjections,
        lessonsLearned: req.body.lessonsLearned,
      });

      winLossRecorded.inc({ outcome: req.body.outcome });
      res.status(201).json(winLoss);
    } catch (error) {
      logger.error('Error recording win/loss:', error);
      res.status(500).json({ error: 'Failed to record win/loss' });
    } finally {
      end();
    }
  }
);

/**
 * GET /api/revenue/win-loss/analysis
 * Get win/loss analysis
 */
router.get(
  '/win-loss/analysis',
  [
    query('startDate').optional().isISO8601(),
    query('endDate').optional().isISO8601(),
  ],
  async (req: Request, res: Response): Promise<void> => {
    const end = requestDuration.startTimer({ endpoint: 'winloss_analysis' });

    try {
      const organizationId = (req as any).user.organizationId;
      if (!organizationId) {
        res.status(403).json({ error: 'Organization membership required' });
        return;
      }

      const startDate = req.query.startDate ? new Date(req.query.startDate as string) : undefined;
      const endDate = req.query.endDate ? new Date(req.query.endDate as string) : undefined;

      const analysis = await revenueService.getWinLossAnalysis(
        organizationId,
        startDate,
        endDate
      );

      res.json(analysis);
    } catch (error) {
      logger.error('Error getting win/loss analysis:', error);
      res.status(500).json({ error: 'Failed to get win/loss analysis' });
    } finally {
      end();
    }
  }
);

/**
 * POST /api/revenue/scorecard
 * Generate sales coaching scorecard for a meeting
 */
router.post(
  '/scorecard',
  [
    body('meetingId').isUUID().withMessage('Meeting ID is required'),
    body('userId').optional().isUUID(),
    body('dealId').optional().isUUID(),
  ],
  async (req: Request, res: Response): Promise<void> => {
    const end = requestDuration.startTimer({ endpoint: 'generate_scorecard' });

    try {
      const errors = validationResult(req);
      if (!errors.isEmpty()) {
        res.status(400).json({ errors: errors.array() });
        return;
      }

      const organizationId = (req as any).user.organizationId;
      if (!organizationId) {
        res.status(403).json({ error: 'Organization membership required' });
        return;
      }

      const userId = req.body.userId || (req as any).user.id;

      const scorecard = await revenueService.generateScorecard(
        req.body.meetingId,
        userId,
        organizationId,
        req.body.dealId
      );

      scorecardsGenerated.inc();
      res.status(201).json(scorecard);
    } catch (error) {
      logger.error('Error generating scorecard:', error);

      // Handle specific errors
      if (error instanceof Error) {
        if (error.message === 'Meeting not found') {
          res.status(404).json({ error: 'Meeting not found' });
          return;
        }
        if (error.message === 'No transcript available for this meeting') {
          res.status(400).json({ error: 'No transcript available for this meeting' });
          return;
        }
      }

      res.status(500).json({ error: 'Failed to generate scorecard' });
    } finally {
      end();
    }
  }
);

/**
 * GET /api/revenue/scorecards/:userId
 * Get scorecards for a user
 */
router.get(
  '/scorecards/:userId',
  [
    param('userId').isUUID().withMessage('Invalid user ID'),
    query('limit').optional().isInt({ min: 1, max: 100 }),
  ],
  async (req: Request, res: Response): Promise<void> => {
    const end = requestDuration.startTimer({ endpoint: 'get_scorecards' });

    try {
      const errors = validationResult(req);
      if (!errors.isEmpty()) {
        res.status(400).json({ errors: errors.array() });
        return;
      }

      const organizationId = (req as any).user.organizationId;
      if (!organizationId) {
        res.status(403).json({ error: 'Organization membership required' });
        return;
      }

      const limit = req.query.limit ? parseInt(req.query.limit as string) : 10;

      const scorecards = await revenueService.getUserScorecards(
        req.params.userId,
        organizationId,
        limit
      );

      res.json({ scorecards, total: scorecards.length });
    } catch (error) {
      logger.error('Error getting scorecards:', error);
      res.status(500).json({ error: 'Failed to get scorecards' });
    } finally {
      end();
    }
  }
);

/**
 * GET /api/revenue/pipeline
 * Get pipeline health metrics
 */
router.get(
  '/pipeline',
  async (req: Request, res: Response): Promise<void> => {
    const end = requestDuration.startTimer({ endpoint: 'pipeline_insights' });

    try {
      const organizationId = (req as any).user.organizationId;
      if (!organizationId) {
        res.status(403).json({ error: 'Organization membership required' });
        return;
      }

      const metrics = await revenueService.getPipelineInsights(organizationId);

      res.json(metrics);
    } catch (error) {
      logger.error('Error getting pipeline insights:', error);
      res.status(500).json({ error: 'Failed to get pipeline insights' });
    } finally {
      end();
    }
  }
);

export default router;
