/**
 * AI Apps Routes
 * Endpoints for managing AI Apps marketplace
 */

import { Router, Request, Response } from 'express';
import { PrismaClient, AIAppCategory } from '@prisma/client';
import { authMiddleware, optionalAuth } from '../middleware/auth';
import { rateLimitByEndpoint } from '../middleware/rate-limit';
import { logger } from '../utils/logger';

const router = Router();
const prisma = new PrismaClient();

// Type definitions for API responses
interface AIAppResponse {
  id: string;
  slug: string;
  name: string;
  description: string;
  longDescription: string;
  icon: string;
  color: string;
  category: AIAppCategory;
  tags: string[];
  rating: number;
  isPremium: boolean;
  isNew: boolean;
  isTrending: boolean;
  isFeatured: boolean;
  features: string[];
  outputFormats: string[];
  systemPrompt?: string;
  temperature: number;
  maxTokens: number;
  createdAt: Date;
  updatedAt: Date;
}

interface PaginatedResponse<T> {
  data: T[];
  pagination: {
    total: number;
    page: number;
    pageSize: number;
    totalPages: number;
    hasMore: boolean;
  };
}

// Helper: Convert category string to enum
function parseCategoryFilter(category: string): AIAppCategory | undefined {
  const validCategories = Object.values(AIAppCategory);
  const normalizedCategory = category.toLowerCase() as AIAppCategory;
  return validCategories.includes(normalizedCategory) ? normalizedCategory : undefined;
}

/**
 * GET /api/ai-apps
 * List all AI apps with optional filtering and pagination
 */
router.get('/', optionalAuth, rateLimitByEndpoint(), async (req: Request, res: Response) => {
  try {
    const {
      page = '1',
      pageSize = '20',
      category,
      search,
      tags,
      isPremium,
      isNew,
      isTrending,
      isFeatured,
      sortBy = 'rating',
      sortOrder = 'desc'
    } = req.query;

    const pageNum = Math.max(1, parseInt(page as string, 10));
    const pageSizeNum = Math.min(100, Math.max(1, parseInt(pageSize as string, 10)));
    const skip = (pageNum - 1) * pageSizeNum;

    // Build where clause
    const where: any = {};

    if (category && category !== 'all') {
      const categoryEnum = parseCategoryFilter(category as string);
      if (categoryEnum) {
        where.category = categoryEnum;
      }
    }

    if (search) {
      const searchStr = (search as string).toLowerCase();
      where.OR = [
        { name: { contains: searchStr, mode: 'insensitive' } },
        { description: { contains: searchStr, mode: 'insensitive' } },
        { tags: { hasSome: [searchStr] } }
      ];
    }

    if (tags) {
      const tagList = (tags as string).split(',').map(t => t.trim().toLowerCase());
      where.tags = { hasSome: tagList };
    }

    if (isPremium !== undefined) {
      where.isPremium = isPremium === 'true';
    }

    if (isNew !== undefined) {
      where.isNew = isNew === 'true';
    }

    if (isTrending !== undefined) {
      where.isTrending = isTrending === 'true';
    }

    if (isFeatured !== undefined) {
      where.isFeatured = isFeatured === 'true';
    }

    // Build order by clause
    const validSortFields = ['rating', 'name', 'createdAt', 'updatedAt'];
    const sortField = validSortFields.includes(sortBy as string) ? sortBy : 'rating';
    const order = sortOrder === 'asc' ? 'asc' : 'desc';

    // Execute queries in parallel
    const [apps, total] = await Promise.all([
      prisma.aIApp.findMany({
        where,
        skip,
        take: pageSizeNum,
        orderBy: { [sortField as string]: order },
        select: {
          id: true,
          slug: true,
          name: true,
          description: true,
          longDescription: true,
          icon: true,
          color: true,
          category: true,
          tags: true,
          rating: true,
          isPremium: true,
          isNew: true,
          isTrending: true,
          isFeatured: true,
          features: true,
          outputFormats: true,
          temperature: true,
          maxTokens: true,
          createdAt: true,
          updatedAt: true,
          // Exclude systemPrompt from list for security
        }
      }),
      prisma.aIApp.count({ where })
    ]);

    const totalPages = Math.ceil(total / pageSizeNum);

    const response: PaginatedResponse<Omit<AIAppResponse, 'systemPrompt'>> = {
      data: apps,
      pagination: {
        total,
        page: pageNum,
        pageSize: pageSizeNum,
        totalPages,
        hasMore: pageNum < totalPages
      }
    };

    res.json(response);
  } catch (error) {
    logger.error('Failed to fetch AI apps:', error);
    res.status(500).json({
      success: false,
      error: { code: 'FETCH_ERROR', message: 'Failed to fetch AI apps' }
    });
  }
});

/**
 * GET /api/ai-apps/categories
 * Get all available categories with counts
 */
router.get('/categories', optionalAuth, rateLimitByEndpoint(), async (req: Request, res: Response) => {
  try {
    const categories = await prisma.aIApp.groupBy({
      by: ['category'],
      _count: { category: true },
      orderBy: { _count: { category: 'desc' } }
    });

    const categoryList: { value: string; label: string; count: number }[] = categories.map(c => ({
      value: c.category as string,
      label: c.category.charAt(0).toUpperCase() + c.category.slice(1).replace('_', ' '),
      count: c._count.category
    }));

    // Add "all" option
    const total = categoryList.reduce((sum, c) => sum + c.count, 0);
    categoryList.unshift({ value: 'all', label: 'All Categories', count: total });

    res.json({
      success: true,
      data: categoryList
    });
  } catch (error) {
    logger.error('Failed to fetch categories:', error);
    res.status(500).json({
      success: false,
      error: { code: 'FETCH_ERROR', message: 'Failed to fetch categories' }
    });
  }
});

/**
 * GET /api/ai-apps/featured
 * Get featured apps
 */
router.get('/featured', optionalAuth, rateLimitByEndpoint(), async (req: Request, res: Response) => {
  try {
    const featuredApps = await prisma.aIApp.findMany({
      where: { isFeatured: true },
      take: 6,
      orderBy: { rating: 'desc' },
      select: {
        id: true,
        slug: true,
        name: true,
        description: true,
        icon: true,
        color: true,
        category: true,
        tags: true,
        rating: true,
        isPremium: true,
        isNew: true,
        isTrending: true,
        isFeatured: true,
        features: true
      }
    });

    res.json({
      success: true,
      data: featuredApps
    });
  } catch (error) {
    logger.error('Failed to fetch featured apps:', error);
    res.status(500).json({
      success: false,
      error: { code: 'FETCH_ERROR', message: 'Failed to fetch featured apps' }
    });
  }
});

/**
 * GET /api/ai-apps/trending
 * Get trending apps
 */
router.get('/trending', optionalAuth, rateLimitByEndpoint(), async (req: Request, res: Response) => {
  try {
    const trendingApps = await prisma.aIApp.findMany({
      where: { isTrending: true },
      take: 10,
      orderBy: { rating: 'desc' },
      select: {
        id: true,
        slug: true,
        name: true,
        description: true,
        icon: true,
        color: true,
        category: true,
        tags: true,
        rating: true,
        isPremium: true,
        isNew: true,
        isTrending: true,
        features: true
      }
    });

    res.json({
      success: true,
      data: trendingApps
    });
  } catch (error) {
    logger.error('Failed to fetch trending apps:', error);
    res.status(500).json({
      success: false,
      error: { code: 'FETCH_ERROR', message: 'Failed to fetch trending apps' }
    });
  }
});

/**
 * GET /api/ai-apps/:slug
 * Get a single AI app by slug (includes systemPrompt for authenticated users)
 */
router.get('/:slug', optionalAuth, rateLimitByEndpoint(), async (req: Request, res: Response) => {
  try {
    const { slug } = req.params;
    const isAuthenticated = !!(req as any).user;

    const app = await prisma.aIApp.findUnique({
      where: { slug },
      select: {
        id: true,
        slug: true,
        name: true,
        description: true,
        longDescription: true,
        icon: true,
        color: true,
        category: true,
        tags: true,
        rating: true,
        isPremium: true,
        isNew: true,
        isTrending: true,
        isFeatured: true,
        features: true,
        outputFormats: true,
        systemPrompt: isAuthenticated, // Only include for authenticated users
        temperature: true,
        maxTokens: true,
        createdAt: true,
        updatedAt: true
      }
    });

    if (!app) {
      return res.status(404).json({
        success: false,
        error: { code: 'NOT_FOUND', message: 'AI app not found' }
      });
    }

    res.json({
      success: true,
      data: app
    });
  } catch (error) {
    logger.error('Failed to fetch AI app:', error);
    res.status(500).json({
      success: false,
      error: { code: 'FETCH_ERROR', message: 'Failed to fetch AI app' }
    });
  }
});

/**
 * GET /api/ai-apps/:slug/prompt
 * Get the system prompt for an AI app (authenticated users only)
 */
router.get('/:slug/prompt', authMiddleware, rateLimitByEndpoint(), async (req: Request, res: Response) => {
  try {
    const { slug } = req.params;

    const app = await prisma.aIApp.findUnique({
      where: { slug },
      select: {
        id: true,
        slug: true,
        name: true,
        systemPrompt: true,
        temperature: true,
        maxTokens: true
      }
    });

    if (!app) {
      return res.status(404).json({
        success: false,
        error: { code: 'NOT_FOUND', message: 'AI app not found' }
      });
    }

    res.json({
      success: true,
      data: {
        id: app.id,
        slug: app.slug,
        name: app.name,
        systemPrompt: app.systemPrompt,
        temperature: app.temperature,
        maxTokens: app.maxTokens
      }
    });
  } catch (error) {
    logger.error('Failed to fetch AI app prompt:', error);
    res.status(500).json({
      success: false,
      error: { code: 'FETCH_ERROR', message: 'Failed to fetch AI app prompt' }
    });
  }
});

/**
 * GET /api/ai-apps/stats/summary
 * Get marketplace statistics
 */
router.get('/stats/summary', optionalAuth, rateLimitByEndpoint(), async (req: Request, res: Response) => {
  try {
    const [
      totalApps,
      premiumApps,
      newApps,
      trendingApps,
      categoryStats
    ] = await Promise.all([
      prisma.aIApp.count(),
      prisma.aIApp.count({ where: { isPremium: true } }),
      prisma.aIApp.count({ where: { isNew: true } }),
      prisma.aIApp.count({ where: { isTrending: true } }),
      prisma.aIApp.groupBy({
        by: ['category'],
        _count: { category: true }
      })
    ]);

    res.json({
      success: true,
      data: {
        total: totalApps,
        premium: premiumApps,
        new: newApps,
        trending: trendingApps,
        byCategory: categoryStats.map(c => ({
          category: c.category,
          count: c._count.category
        }))
      }
    });
  } catch (error) {
    logger.error('Failed to fetch stats:', error);
    res.status(500).json({
      success: false,
      error: { code: 'FETCH_ERROR', message: 'Failed to fetch statistics' }
    });
  }
});

export default router;
