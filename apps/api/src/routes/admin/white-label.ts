/**
 * Admin White-label Management Routes
 * Super Admin Dashboard API endpoints for managing white-label configurations
 */

import { Router, Request, Response } from 'express';
import { PrismaClient } from '@prisma/client';
import { z } from 'zod';
import multer from 'multer';
import path from 'path';
import fs from 'fs/promises';
import { requireRole, auditAdminAction } from '../../middleware/admin-auth';
import { logger } from '../../utils/logger';
import { whiteLabelService } from '../../services/WhiteLabelService';

const router = Router();
const prisma = new PrismaClient();

// Configure multer for asset uploads
const storage = multer.diskStorage({
  destination: async (req, file, cb) => {
    const uploadDir = path.join(process.cwd(), 'uploads', 'whitelabel', 'assets');
    await fs.mkdir(uploadDir, { recursive: true });
    cb(null, uploadDir);
  },
  filename: (req, file, cb) => {
    const uniqueSuffix = `${Date.now()}-${Math.round(Math.random() * 1e9)}`;
    const ext = path.extname(file.originalname);
    cb(null, `${file.fieldname}-${uniqueSuffix}${ext}`);
  },
});

const upload = multer({
  storage,
  limits: {
    fileSize: 10 * 1024 * 1024, // 10MB max
  },
  fileFilter: (req, file, cb) => {
    const allowedMimes = [
      'image/jpeg',
      'image/png',
      'image/svg+xml',
      'image/webp',
      'image/gif',
      'image/x-icon',
      'image/vnd.microsoft.icon',
    ];
    if (allowedMimes.includes(file.mimetype)) {
      cb(null, true);
    } else {
      cb(new Error('Invalid file type. Only JPEG, PNG, SVG, WebP, GIF, and ICO files are allowed.'));
    }
  },
});

// Zod Validation Schemas
const ColorSchema = z.string().regex(/^#[0-9A-Fa-f]{6}$/, 'Invalid hex color format');

const EmailTemplateSchema = z.object({
  subject: z.string().min(1).max(200),
  body: z.string().min(1),
  footer: z.string().optional(),
});

const FeatureFlagsSchema = z.object({
  enableChat: z.boolean().optional(),
  enableTranscription: z.boolean().optional(),
  enableRecording: z.boolean().optional(),
  enableCalendarSync: z.boolean().optional(),
  enableCustomBranding: z.boolean().optional(),
  enableAnalytics: z.boolean().optional(),
  enableIntegrations: z.boolean().optional(),
  enableApiAccess: z.boolean().optional(),
});

const CreateWhiteLabelSchema = z.object({
  organizationId: z.string().uuid(),
  brandName: z.string().min(1).max(100).optional(),
  tagline: z.string().max(200).optional(),
  primaryColor: ColorSchema.optional(),
  secondaryColor: ColorSchema.optional(),
  accentColor: ColorSchema.optional(),
  backgroundColor: ColorSchema.optional(),
  textColor: ColorSchema.optional(),
  customDomain: z.string().max(253).optional(),
  customEmailDomain: z.string().max(253).optional(),
  emailFromName: z.string().min(1).max(100).optional(),
  emailFromEmail: z.string().email().optional(),
  emailTemplates: z.record(z.string(), EmailTemplateSchema).optional(),
  featureFlags: FeatureFlagsSchema.optional(),
  cssOverrides: z.string().max(100000).optional(),
  jsInjection: z.string().max(50000).optional(),
  hideWatermark: z.boolean().optional(),
  customFonts: z.array(z.object({
    name: z.string(),
    url: z.string().url(),
    weight: z.string().optional(),
    style: z.string().optional(),
  })).optional(),
});

const UpdateWhiteLabelSchema = CreateWhiteLabelSchema.partial().omit({ organizationId: true });

const AssetUploadSchema = z.object({
  type: z.enum(['logo', 'logoDark', 'logoSquare', 'favicon', 'emailLogo', 'custom']),
  name: z.string().min(1).max(100).optional(),
});

// Types
type WhiteLabelStatus = 'draft' | 'published' | 'disabled';

interface WhiteLabelMetadata {
  status: WhiteLabelStatus;
  publishedAt?: string;
  disabledAt?: string;
  disabledReason?: string;
  version: number;
  assets: Array<{
    id: string;
    type: string;
    name: string;
    url: string;
    uploadedAt: string;
  }>;
  emailTemplates?: Record<string, { subject: string; body: string; footer?: string }>;
  featureFlags?: Record<string, boolean>;
  customEmailDomain?: string;
  cssOverrides?: string;
  jsInjection?: string;
}

// Helper functions
function getAdminId(req: Request): string {
  const user = (req as any).user || (req as any).admin;
  return user?.id || 'unknown';
}

function extractMetadata(config: any): WhiteLabelMetadata {
  const defaultMetadata: WhiteLabelMetadata = {
    status: 'draft',
    version: 1,
    assets: [],
  };
  
  if (!config.metadata) {
    return defaultMetadata;
  }
  
  if (typeof config.metadata === 'object') {
    return { ...defaultMetadata, ...config.metadata } as WhiteLabelMetadata;
  }
  
  try {
    const parsed = JSON.parse(String(config.metadata));
    return { ...defaultMetadata, ...parsed };
  } catch {
    return defaultMetadata;
  }
}

function formatWhiteLabelConfig(config: any): any {
  const metadata = extractMetadata(config);
  return {
    id: config.id,
    organizationId: config.organizationId,
    branding: {
      primaryColor: config.primaryColor,
      secondaryColor: config.secondaryColor,
      accentColor: config.accentColor,
      backgroundColor: config.backgroundColor,
      textColor: config.textColor,
      logoUrl: config.logoUrl,
      logoDarkUrl: config.logoDarkUrl,
      logoSquareUrl: config.logoSquareUrl,
      faviconUrl: config.faviconUrl,
    },
    domain: {
      customDomain: config.customDomain,
      customDomainVerified: config.customDomainVerified,
      customDomainDNS: config.customDomainDNS,
    },
    email: {
      emailFromName: config.emailFromName,
      emailFromEmail: config.emailFromEmail,
      emailLogoUrl: config.emailLogoUrl,
      emailFooter: config.emailFooter,
      customEmailDomain: metadata.customEmailDomain,
      templates: metadata.emailTemplates,
    },
    customization: {
      customCSS: config.customCSS,
      customJS: config.customJS,
      cssOverrides: metadata.cssOverrides,
      jsInjection: metadata.jsInjection,
    },
    product: {
      productName: config.productName,
      companyName: config.companyName,
      tagline: config.tagline,
    },
    features: {
      hideWatermark: config.hideWatermark,
      customFonts: config.customFonts,
      featureFlags: metadata.featureFlags,
    },
    status: metadata.status,
    version: metadata.version,
    assets: metadata.assets,
    publishedAt: metadata.publishedAt,
    createdAt: config.createdAt,
    updatedAt: config.updatedAt,
  };
}

// Helper to fetch organization data for a config
async function fetchOrganizationForConfig(organizationId: string): Promise<any> {
  return prisma.organization.findUnique({
    where: { id: organizationId },
    select: {
      id: true,
      name: true,
      slug: true,
      subscriptionTier: true,
    },
  });
}

// Helper to fetch organizations for multiple configs
async function fetchOrganizationsForConfigs(configs: any[]): Promise<Map<string, any>> {
  const orgIds = [...new Set(configs.map(c => c.organizationId))];
  const orgs = await prisma.organization.findMany({
    where: { id: { in: orgIds } },
    select: {
      id: true,
      name: true,
      slug: true,
      subscriptionTier: true,
    },
  });
  return new Map(orgs.map(org => [org.id, org]));
}

/**
 * GET /api/admin/white-label
 * List all white-label configurations with pagination and filters
 */
router.get(
  '/',
  requireRole('super_admin'),
  async (req: Request, res: Response) => {
    try {
      const page = parseInt(req.query.page as string) || 1;
      const limit = Math.min(parseInt(req.query.limit as string) || 20, 100);
      const skip = (page - 1) * limit;
      const search = req.query.search as string;
      const status = req.query.status as WhiteLabelStatus;
      const hasCustomDomain = req.query.hasCustomDomain === 'true';
      const sortBy = (req.query.sortBy as string) || 'updatedAt';
      const sortOrder = (req.query.sortOrder as 'asc' | 'desc') || 'desc';

      const where: any = {};

      if (search) {
        where.OR = [
          { productName: { contains: search, mode: 'insensitive' } },
          { companyName: { contains: search, mode: 'insensitive' } },
          { customDomain: { contains: search, mode: 'insensitive' } },
        ];
      }

      if (hasCustomDomain) {
        where.customDomain = { not: null };
      }

      const [configs, total] = await Promise.all([
        prisma.whitelabelConfig.findMany({
          where,
          skip,
          take: limit,
          orderBy: { [sortBy]: sortOrder },
        }),
        prisma.whitelabelConfig.count({ where }),
      ]);

      // Fetch organization data
      const orgMap = await fetchOrganizationsForConfigs(configs);

      // Filter by status (stored in metadata)
      let filteredConfigs = configs;
      if (status) {
        filteredConfigs = configs.filter((config) => {
          const metadata = extractMetadata(config);
          return metadata.status === status;
        });
      }

      const formattedConfigs = filteredConfigs.map((config) => ({
        ...formatWhiteLabelConfig(config),
        organization: orgMap.get(config.organizationId) || null,
      }));

      res.json({
        success: true,
        data: formattedConfigs,
        pagination: {
          page,
          limit,
          total: status ? filteredConfigs.length : total,
          totalPages: Math.ceil((status ? filteredConfigs.length : total) / limit),
        },
      });
    } catch (error) {
      logger.error('Error listing white-label configurations', { error });
      res.status(500).json({
        success: false,
        error: 'Failed to list white-label configurations',
      });
    }
  }
);

/**
 * GET /api/admin/white-label/stats
 * Get white-label statistics for dashboard
 */
router.get(
  '/stats',
  requireRole('super_admin'),
  async (req: Request, res: Response) => {
    try {
      const [
        totalConfigs,
        configsWithCustomDomain,
        verifiedDomains,
        allConfigs,
      ] = await Promise.all([
        prisma.whitelabelConfig.count(),
        prisma.whitelabelConfig.count({
          where: { customDomain: { not: null } },
        }),
        prisma.whitelabelConfig.count({
          where: { customDomainVerified: true },
        }),
        prisma.whitelabelConfig.findMany({
          select: { metadata: true },
        }),
      ]);

      // Count by status from metadata
      let publishedCount = 0;
      let draftCount = 0;
      let disabledCount = 0;

      allConfigs.forEach((config) => {
        const metadata = extractMetadata(config);
        switch (metadata.status) {
          case 'published':
            publishedCount++;
            break;
          case 'disabled':
            disabledCount++;
            break;
          default:
            draftCount++;
        }
      });

      res.json({
        success: true,
        data: {
          total: totalConfigs,
          byStatus: {
            published: publishedCount,
            draft: draftCount,
            disabled: disabledCount,
          },
          domains: {
            total: configsWithCustomDomain,
            verified: verifiedDomains,
            pending: configsWithCustomDomain - verifiedDomains,
          },
        },
      });
    } catch (error) {
      logger.error('Error fetching white-label stats', { error });
      res.status(500).json({
        success: false,
        error: 'Failed to fetch white-label statistics',
      });
    }
  }
);

/**
 * GET /api/admin/white-label/:id
 * Get a single white-label configuration
 */
router.get(
  '/:id',
  requireRole('super_admin'),
  async (req: Request, res: Response) => {
    try {
      const { id } = req.params;

      const config = await prisma.whitelabelConfig.findUnique({
        where: { id },
      });

      if (!config) {
        res.status(404).json({
          success: false,
          error: 'White-label configuration not found',
        });
        return;
      }

      const organization = await fetchOrganizationForConfig(config.organizationId);

      res.json({
        success: true,
        data: {
          ...formatWhiteLabelConfig(config),
          organization,
        },
      });
    } catch (error) {
      logger.error('Error fetching white-label configuration', { error });
      res.status(500).json({
        success: false,
        error: 'Failed to fetch white-label configuration',
      });
    }
  }
);

/**
 * POST /api/admin/white-label
 * Create a new white-label configuration
 */
router.post(
  '/',
  requireRole('super_admin'),
  auditAdminAction('admin:create_whitelabel'),
  async (req: Request, res: Response) => {
    try {
      const validation = CreateWhiteLabelSchema.safeParse(req.body);

      if (!validation.success) {
        res.status(400).json({
          success: false,
          error: 'Validation failed',
          details: validation.error.issues,
        });
        return;
      }

      const data = validation.data;

      // Check if organization already has a white-label config
      const existingConfig = await prisma.whitelabelConfig.findUnique({
        where: { organizationId: data.organizationId },
      });

      if (existingConfig) {
        res.status(409).json({
          success: false,
          error: 'Organization already has a white-label configuration',
        });
        return;
      }

      // Check if custom domain is already in use
      if (data.customDomain) {
        const domainInUse = await prisma.whitelabelConfig.findFirst({
          where: { customDomain: data.customDomain },
        });

        if (domainInUse) {
          res.status(409).json({
            success: false,
            error: 'Custom domain is already in use',
          });
          return;
        }
      }

      // Build metadata
      const metadata: WhiteLabelMetadata = {
        status: 'draft',
        version: 1,
        assets: [],
        emailTemplates: data.emailTemplates,
        featureFlags: data.featureFlags,
        customEmailDomain: data.customEmailDomain,
        cssOverrides: data.cssOverrides,
        jsInjection: data.jsInjection,
      };

      const config = await prisma.whitelabelConfig.create({
        data: {
          organizationId: data.organizationId,
          primaryColor: data.primaryColor || '#3B82F6',
          secondaryColor: data.secondaryColor || '#10B981',
          accentColor: data.accentColor || '#8B5CF6',
          backgroundColor: data.backgroundColor || '#FFFFFF',
          textColor: data.textColor || '#1F2937',
          customDomain: data.customDomain,
          emailFromName: data.emailFromName || 'Nebula AI',
          emailFromEmail: data.emailFromEmail,
          productName: data.brandName || 'Nebula AI',
          companyName: data.brandName,
          tagline: data.tagline,
          hideWatermark: data.hideWatermark || false,
          customFonts: data.customFonts as any,
          customCSS: data.cssOverrides,
          customJS: data.jsInjection,
          metadata: metadata as any,
        },
      });

      const organization = await fetchOrganizationForConfig(config.organizationId);

      logger.info('White-label configuration created', {
        configId: config.id,
        organizationId: config.organizationId,
        adminId: getAdminId(req),
      });

      res.status(201).json({
        success: true,
        data: {
          ...formatWhiteLabelConfig(config),
          organization,
        },
      });
    } catch (error) {
      logger.error('Error creating white-label configuration', { error });
      res.status(500).json({
        success: false,
        error: 'Failed to create white-label configuration',
      });
    }
  }
);

/**
 * PUT /api/admin/white-label/:id
 * Update a white-label configuration
 */
router.put(
  '/:id',
  requireRole('super_admin'),
  auditAdminAction('admin:update_whitelabel'),
  async (req: Request, res: Response) => {
    try {
      const { id } = req.params;
      const validation = UpdateWhiteLabelSchema.safeParse(req.body);

      if (!validation.success) {
        res.status(400).json({
          success: false,
          error: 'Validation failed',
          details: validation.error.issues,
        });
        return;
      }

      const data = validation.data;

      const existingConfig = await prisma.whitelabelConfig.findUnique({
        where: { id },
      });

      if (!existingConfig) {
        res.status(404).json({
          success: false,
          error: 'White-label configuration not found',
        });
        return;
      }

      // Check if custom domain is already in use by another config
      if (data.customDomain && data.customDomain !== existingConfig.customDomain) {
        const domainInUse = await prisma.whitelabelConfig.findFirst({
          where: {
            customDomain: data.customDomain,
            id: { not: id },
          },
        });

        if (domainInUse) {
          res.status(409).json({
            success: false,
            error: 'Custom domain is already in use',
          });
          return;
        }
      }

      // Update metadata
      const existingMetadata = extractMetadata(existingConfig);
      const updatedMetadata: WhiteLabelMetadata = {
        ...existingMetadata,
        version: existingMetadata.version + 1,
        emailTemplates: data.emailTemplates ?? existingMetadata.emailTemplates,
        featureFlags: data.featureFlags ?? existingMetadata.featureFlags,
        customEmailDomain: data.customEmailDomain ?? existingMetadata.customEmailDomain,
        cssOverrides: data.cssOverrides ?? existingMetadata.cssOverrides,
        jsInjection: data.jsInjection ?? existingMetadata.jsInjection,
      };

      // If custom domain changed, reset verification
      const domainChanged = data.customDomain !== undefined && 
        data.customDomain !== existingConfig.customDomain;

      const updateData: any = {
        ...(data.primaryColor && { primaryColor: data.primaryColor }),
        ...(data.secondaryColor && { secondaryColor: data.secondaryColor }),
        ...(data.accentColor && { accentColor: data.accentColor }),
        ...(data.backgroundColor && { backgroundColor: data.backgroundColor }),
        ...(data.textColor && { textColor: data.textColor }),
        ...(data.customDomain !== undefined && { customDomain: data.customDomain }),
        ...(domainChanged && { customDomainVerified: false, customDomainDNS: null }),
        ...(data.emailFromName && { emailFromName: data.emailFromName }),
        ...(data.emailFromEmail !== undefined && { emailFromEmail: data.emailFromEmail }),
        ...(data.brandName && { productName: data.brandName, companyName: data.brandName }),
        ...(data.tagline !== undefined && { tagline: data.tagline }),
        ...(data.hideWatermark !== undefined && { hideWatermark: data.hideWatermark }),
        ...(data.customFonts && { customFonts: data.customFonts }),
        ...(data.cssOverrides !== undefined && { customCSS: data.cssOverrides }),
        ...(data.jsInjection !== undefined && { customJS: data.jsInjection }),
        metadata: updatedMetadata as any,
      };

      const config = await prisma.whitelabelConfig.update({
        where: { id },
        data: updateData,
      });

      const organization = await fetchOrganizationForConfig(config.organizationId);

      logger.info('White-label configuration updated', {
        configId: config.id,
        adminId: getAdminId(req),
        changes: Object.keys(data),
      });

      res.json({
        success: true,
        data: {
          ...formatWhiteLabelConfig(config),
          organization,
        },
      });
    } catch (error) {
      logger.error('Error updating white-label configuration', { error });
      res.status(500).json({
        success: false,
        error: 'Failed to update white-label configuration',
      });
    }
  }
);

/**
 * DELETE /api/admin/white-label/:id
 * Delete a white-label configuration
 */
router.delete(
  '/:id',
  requireRole('super_admin'),
  auditAdminAction('admin:delete_whitelabel'),
  async (req: Request, res: Response) => {
    try {
      const { id } = req.params;

      const existingConfig = await prisma.whitelabelConfig.findUnique({
        where: { id },
      });

      if (!existingConfig) {
        res.status(404).json({
          success: false,
          error: 'White-label configuration not found',
        });
        return;
      }

      // Delete associated assets from filesystem
      const metadata = extractMetadata(existingConfig);
      for (const asset of metadata.assets) {
        try {
          const assetPath = path.join(process.cwd(), asset.url);
          await fs.unlink(assetPath);
        } catch {
          // Asset may not exist, continue
        }
      }

      await prisma.whitelabelConfig.delete({
        where: { id },
      });

      logger.info('White-label configuration deleted', {
        configId: id,
        organizationId: existingConfig.organizationId,
        adminId: getAdminId(req),
      });

      res.json({
        success: true,
        message: 'White-label configuration deleted successfully',
      });
    } catch (error) {
      logger.error('Error deleting white-label configuration', { error });
      res.status(500).json({
        success: false,
        error: 'Failed to delete white-label configuration',
      });
    }
  }
);

/**
 * POST /api/admin/white-label/:id/publish
 * Publish a white-label configuration
 */
router.post(
  '/:id/publish',
  requireRole('super_admin'),
  auditAdminAction('admin:publish_whitelabel'),
  async (req: Request, res: Response) => {
    try {
      const { id } = req.params;

      const existingConfig = await prisma.whitelabelConfig.findUnique({
        where: { id },
      });

      if (!existingConfig) {
        res.status(404).json({
          success: false,
          error: 'White-label configuration not found',
        });
        return;
      }

      const metadata = extractMetadata(existingConfig);

      if (metadata.status === 'published') {
        res.status(400).json({
          success: false,
          error: 'Configuration is already published',
        });
        return;
      }

      const updatedMetadata: WhiteLabelMetadata = {
        ...metadata,
        status: 'published',
        publishedAt: new Date().toISOString(),
      };

      const config = await prisma.whitelabelConfig.update({
        where: { id },
        data: {
          metadata: updatedMetadata as any,
        },
      });

      // Update branding config in WhiteLabelService
      await whiteLabelService.updateBrandingConfig(existingConfig.organizationId, {
        primaryColor: config.primaryColor,
        secondaryColor: config.secondaryColor,
        accentColor: config.accentColor,
        backgroundColor: config.backgroundColor,
        textColor: config.textColor,
        logoUrl: config.logoUrl || undefined,
        logoDarkUrl: config.logoDarkUrl || undefined,
        logoSquareUrl: config.logoSquareUrl || undefined,
        faviconUrl: config.faviconUrl || undefined,
        customDomain: config.customDomain || undefined,
        customDomainVerified: config.customDomainVerified,
        emailFromName: config.emailFromName,
        emailFromEmail: config.emailFromEmail || undefined,
        emailLogoUrl: config.emailLogoUrl || undefined,
        emailFooter: config.emailFooter || undefined,
        productName: config.productName,
        hideWatermark: config.hideWatermark,
      });

      const organization = await fetchOrganizationForConfig(config.organizationId);

      logger.info('White-label configuration published', {
        configId: config.id,
        organizationId: config.organizationId,
        adminId: getAdminId(req),
      });

      res.json({
        success: true,
        data: {
          ...formatWhiteLabelConfig(config),
          organization,
        },
      });
    } catch (error) {
      logger.error('Error publishing white-label configuration', { error });
      res.status(500).json({
        success: false,
        error: 'Failed to publish white-label configuration',
      });
    }
  }
);

/**
 * POST /api/admin/white-label/:id/preview
 * Generate preview CSS variables for a white-label configuration
 */
router.post(
  '/:id/preview',
  requireRole('super_admin'),
  async (req: Request, res: Response) => {
    try {
      const { id } = req.params;

      const config = await prisma.whitelabelConfig.findUnique({
        where: { id },
      });

      if (!config) {
        res.status(404).json({
          success: false,
          error: 'White-label configuration not found',
        });
        return;
      }

      const cssVariables = whiteLabelService.getCSSVariables({
        primaryColor: config.primaryColor,
        secondaryColor: config.secondaryColor,
        accentColor: config.accentColor,
        backgroundColor: config.backgroundColor,
        textColor: config.textColor,
        logoUrl: config.logoUrl || undefined,
        logoDarkUrl: config.logoDarkUrl || undefined,
        logoSquareUrl: config.logoSquareUrl || undefined,
        faviconUrl: config.faviconUrl || undefined,
        customDomainVerified: config.customDomainVerified,
        emailFromName: config.emailFromName,
        productName: config.productName,
        hideWatermark: config.hideWatermark,
      });

      res.json({
        success: true,
        data: {
          cssVariables,
          config: formatWhiteLabelConfig(config),
        },
      });
    } catch (error) {
      logger.error('Error generating preview', { error });
      res.status(500).json({
        success: false,
        error: 'Failed to generate preview',
      });
    }
  }
);

/**
 * GET /api/admin/white-label/:id/assets
 * List assets for a white-label configuration
 */
router.get(
  '/:id/assets',
  requireRole('super_admin'),
  async (req: Request, res: Response) => {
    try {
      const { id } = req.params;

      const config = await prisma.whitelabelConfig.findUnique({
        where: { id },
      });

      if (!config) {
        res.status(404).json({
          success: false,
          error: 'White-label configuration not found',
        });
        return;
      }

      const metadata = extractMetadata(config);

      res.json({
        success: true,
        data: {
          assets: metadata.assets,
          logos: {
            logo: config.logoUrl,
            logoDark: config.logoDarkUrl,
            logoSquare: config.logoSquareUrl,
            favicon: config.faviconUrl,
            emailLogo: config.emailLogoUrl,
          },
        },
      });
    } catch (error) {
      logger.error('Error fetching assets', { error });
      res.status(500).json({
        success: false,
        error: 'Failed to fetch assets',
      });
    }
  }
);

/**
 * POST /api/admin/white-label/:id/assets
 * Upload an asset for a white-label configuration
 */
router.post(
  '/:id/assets',
  requireRole('super_admin'),
  auditAdminAction('admin:upload_whitelabel_asset'),
  upload.single('file'),
  async (req: Request, res: Response) => {
    try {
      const { id } = req.params;
      const validation = AssetUploadSchema.safeParse(req.body);

      if (!validation.success) {
        res.status(400).json({
          success: false,
          error: 'Validation failed',
          details: validation.error.issues,
        });
        return;
      }

      if (!req.file) {
        res.status(400).json({
          success: false,
          error: 'No file uploaded',
        });
        return;
      }

      const config = await prisma.whitelabelConfig.findUnique({
        where: { id },
      });

      if (!config) {
        res.status(404).json({
          success: false,
          error: 'White-label configuration not found',
        });
        return;
      }

      const { type, name } = validation.data;
      const fileUrl = `/uploads/whitelabel/assets/${req.file.filename}`;
      const assetId = `asset-${Date.now()}`;

      const metadata = extractMetadata(config);
      
      // Update logo URLs if it's a logo type
      const updateData: any = {
        metadata: metadata as any,
      };

      if (type === 'logo') {
        updateData.logoUrl = fileUrl;
      } else if (type === 'logoDark') {
        updateData.logoDarkUrl = fileUrl;
      } else if (type === 'logoSquare') {
        updateData.logoSquareUrl = fileUrl;
      } else if (type === 'favicon') {
        updateData.faviconUrl = fileUrl;
      } else if (type === 'emailLogo') {
        updateData.emailLogoUrl = fileUrl;
      } else {
        // Custom asset - add to metadata assets array
        metadata.assets.push({
          id: assetId,
          type,
          name: name || req.file.originalname,
          url: fileUrl,
          uploadedAt: new Date().toISOString(),
        });
        updateData.metadata = metadata as any;
      }

      const updatedConfig = await prisma.whitelabelConfig.update({
        where: { id },
        data: updateData,
      });

      logger.info('White-label asset uploaded', {
        configId: id,
        assetType: type,
        filename: req.file.filename,
        adminId: getAdminId(req),
      });

      res.json({
        success: true,
        data: {
          assetId,
          type,
          name: name || req.file.originalname,
          url: fileUrl,
          config: formatWhiteLabelConfig(updatedConfig),
        },
      });
    } catch (error) {
      logger.error('Error uploading asset', { error });
      res.status(500).json({
        success: false,
        error: 'Failed to upload asset',
      });
    }
  }
);

/**
 * DELETE /api/admin/white-label/:id/assets/:assetId
 * Delete an asset from a white-label configuration
 */
router.delete(
  '/:id/assets/:assetId',
  requireRole('super_admin'),
  auditAdminAction('admin:delete_whitelabel_asset'),
  async (req: Request, res: Response) => {
    try {
      const { id, assetId } = req.params;

      const config = await prisma.whitelabelConfig.findUnique({
        where: { id },
      });

      if (!config) {
        res.status(404).json({
          success: false,
          error: 'White-label configuration not found',
        });
        return;
      }

      const metadata = extractMetadata(config);
      const assetIndex = metadata.assets.findIndex((a) => a.id === assetId);

      if (assetIndex === -1) {
        res.status(404).json({
          success: false,
          error: 'Asset not found',
        });
        return;
      }

      const asset = metadata.assets[assetIndex];

      // Delete file from filesystem
      try {
        const assetPath = path.join(process.cwd(), asset.url);
        await fs.unlink(assetPath);
      } catch {
        // File may not exist, continue
      }

      // Remove from metadata
      metadata.assets.splice(assetIndex, 1);

      await prisma.whitelabelConfig.update({
        where: { id },
        data: {
          metadata: metadata as any,
        },
      });

      logger.info('White-label asset deleted', {
        configId: id,
        assetId,
        adminId: getAdminId(req),
      });

      res.json({
        success: true,
        message: 'Asset deleted successfully',
      });
    } catch (error) {
      logger.error('Error deleting asset', { error });
      res.status(500).json({
        success: false,
        error: 'Failed to delete asset',
      });
    }
  }
);

/**
 * POST /api/admin/white-label/:id/disable
 * Disable a white-label configuration
 */
router.post(
  '/:id/disable',
  requireRole('super_admin'),
  auditAdminAction('admin:disable_whitelabel'),
  async (req: Request, res: Response) => {
    try {
      const { id } = req.params;
      const { reason } = req.body;

      const existingConfig = await prisma.whitelabelConfig.findUnique({
        where: { id },
      });

      if (!existingConfig) {
        res.status(404).json({
          success: false,
          error: 'White-label configuration not found',
        });
        return;
      }

      const metadata = extractMetadata(existingConfig);

      if (metadata.status === 'disabled') {
        res.status(400).json({
          success: false,
          error: 'Configuration is already disabled',
        });
        return;
      }

      const updatedMetadata: WhiteLabelMetadata = {
        ...metadata,
        status: 'disabled',
        disabledAt: new Date().toISOString(),
        disabledReason: reason,
      };

      const config = await prisma.whitelabelConfig.update({
        where: { id },
        data: {
          metadata: updatedMetadata as any,
        },
      });

      const organization = await fetchOrganizationForConfig(config.organizationId);

      logger.warn('White-label configuration disabled', {
        configId: config.id,
        organizationId: config.organizationId,
        reason,
        adminId: getAdminId(req),
      });

      res.json({
        success: true,
        data: {
          ...formatWhiteLabelConfig(config),
          organization,
        },
      });
    } catch (error) {
      logger.error('Error disabling white-label configuration', { error });
      res.status(500).json({
        success: false,
        error: 'Failed to disable white-label configuration',
      });
    }
  }
);

/**
 * POST /api/admin/white-label/:id/enable
 * Re-enable a disabled white-label configuration
 */
router.post(
  '/:id/enable',
  requireRole('super_admin'),
  auditAdminAction('admin:enable_whitelabel'),
  async (req: Request, res: Response) => {
    try {
      const { id } = req.params;

      const existingConfig = await prisma.whitelabelConfig.findUnique({
        where: { id },
      });

      if (!existingConfig) {
        res.status(404).json({
          success: false,
          error: 'White-label configuration not found',
        });
        return;
      }

      const metadata = extractMetadata(existingConfig);

      if (metadata.status !== 'disabled') {
        res.status(400).json({
          success: false,
          error: 'Configuration is not disabled',
        });
        return;
      }

      const updatedMetadata: WhiteLabelMetadata = {
        ...metadata,
        status: metadata.publishedAt ? 'published' : 'draft',
        disabledAt: undefined,
        disabledReason: undefined,
      };

      const config = await prisma.whitelabelConfig.update({
        where: { id },
        data: {
          metadata: updatedMetadata as any,
        },
      });

      const organization = await fetchOrganizationForConfig(config.organizationId);

      logger.info('White-label configuration enabled', {
        configId: config.id,
        organizationId: config.organizationId,
        adminId: getAdminId(req),
      });

      res.json({
        success: true,
        data: {
          ...formatWhiteLabelConfig(config),
          organization,
        },
      });
    } catch (error) {
      logger.error('Error enabling white-label configuration', { error });
      res.status(500).json({
        success: false,
        error: 'Failed to enable white-label configuration',
      });
    }
  }
);

/**
 * POST /api/admin/white-label/:id/verify-domain
 * Verify custom domain DNS configuration
 */
router.post(
  '/:id/verify-domain',
  requireRole('super_admin'),
  auditAdminAction('admin:verify_whitelabel_domain'),
  async (req: Request, res: Response) => {
    try {
      const { id } = req.params;

      const config = await prisma.whitelabelConfig.findUnique({
        where: { id },
      });

      if (!config) {
        res.status(404).json({
          success: false,
          error: 'White-label configuration not found',
        });
        return;
      }

      if (!config.customDomain) {
        res.status(400).json({
          success: false,
          error: 'No custom domain configured',
        });
        return;
      }

      // Use whiteLabelService to verify domain
      const verified = await whiteLabelService.verifyCustomDomain(config.organizationId);

      if (verified) {
        await prisma.whitelabelConfig.update({
          where: { id },
          data: {
            customDomainVerified: true,
          },
        });

        logger.info('Custom domain verified', {
          configId: id,
          domain: config.customDomain,
          adminId: getAdminId(req),
        });
      }

      res.json({
        success: true,
        data: {
          verified,
          domain: config.customDomain,
        },
      });
    } catch (error) {
      logger.error('Error verifying custom domain', { error });
      res.status(500).json({
        success: false,
        error: 'Failed to verify custom domain',
      });
    }
  }
);

/**
 * GET /api/admin/white-label/:id/dns-records
 * Get DNS records needed for custom domain verification
 */
router.get(
  '/:id/dns-records',
  requireRole('super_admin'),
  async (req: Request, res: Response) => {
    try {
      const { id } = req.params;

      const config = await prisma.whitelabelConfig.findUnique({
        where: { id },
      });

      if (!config) {
        res.status(404).json({
          success: false,
          error: 'White-label configuration not found',
        });
        return;
      }

      if (!config.customDomain) {
        res.status(400).json({
          success: false,
          error: 'No custom domain configured',
        });
        return;
      }

      // Generate DNS records for verification
      const dnsRecords = [
        {
          type: 'CNAME',
          name: config.customDomain,
          value: 'custom.nebula-ai.com',
          ttl: 3600,
          purpose: 'Route traffic to Nebula AI servers',
        },
        {
          type: 'TXT',
          name: `_nebula-verify.${config.customDomain}`,
          value: `nebula-verification=${config.id}`,
          ttl: 3600,
          purpose: 'Domain ownership verification',
        },
      ];

      // Save DNS records to config if not already saved
      if (!config.customDomainDNS) {
        await prisma.whitelabelConfig.update({
          where: { id },
          data: {
            customDomainDNS: dnsRecords as any,
          },
        });
      }

      res.json({
        success: true,
        data: {
          domain: config.customDomain,
          verified: config.customDomainVerified,
          dnsRecords,
          instructions: [
            'Add the following DNS records to your domain provider:',
            '1. Create a CNAME record pointing your domain to custom.nebula-ai.com',
            '2. Create a TXT record for domain verification',
            '3. Wait for DNS propagation (may take up to 48 hours)',
            '4. Click "Verify Domain" to complete the setup',
          ],
        },
      });
    } catch (error) {
      logger.error('Error fetching DNS records', { error });
      res.status(500).json({
        success: false,
        error: 'Failed to fetch DNS records',
      });
    }
  }
);

export default router;
