import { Router, Request, Response } from 'express';
import { whiteLabelService } from '../services/WhiteLabelService';
import multer from 'multer';
import path from 'path';
import fs from 'fs/promises';

const router = Router();

// Configure multer for file uploads
const storage = multer.diskStorage({
  destination: async (req, file, cb) => {
    const uploadDir = path.join(process.cwd(), 'uploads', 'branding');
    await fs.mkdir(uploadDir, { recursive: true });
    cb(null, uploadDir);
  },
  filename: (req, file, cb) => {
    const uniqueSuffix = Date.now() + '-' + Math.round(Math.random() * 1e9);
    cb(null, file.fieldname + '-' + uniqueSuffix + path.extname(file.originalname));
  },
});

const upload = multer({
  storage,
  limits: {
    fileSize: 5 * 1024 * 1024, // 5MB
  },
  fileFilter: (req, file, cb) => {
    const allowedMimes = ['image/jpeg', 'image/png', 'image/svg+xml', 'image/webp'];
    if (allowedMimes.includes(file.mimetype)) {
      cb(null, true);
    } else {
      cb(new Error('Invalid file type. Only JPEG, PNG, SVG, and WebP are allowed.'));
    }
  },
});

/**
 * GET /api/whitelabel/config
 * Get branding configuration for the current organization
 */
router.get('/config', async (req: Request, res: Response) => {
  try {
    const organizationId = req.user?.organizationId;

    if (!organizationId) {
      return res.status(401).json({ error: 'Unauthorized' });
    }

    const config = await whiteLabelService.getBrandingConfig(organizationId);

    if (!config) {
      // Return default configuration
      return res.json({
        primaryColor: '#3B82F6',
        secondaryColor: '#10B981',
        accentColor: '#8B5CF6',
        backgroundColor: '#FFFFFF',
        textColor: '#1F2937',
        customDomainVerified: false,
        emailFromName: 'OpenMeet',
        productName: 'OpenMeet',
        hideWatermark: false,
      });
    }

    res.json(config);
  } catch (error) {
    console.error('Error fetching branding config:', error);
    res.status(500).json({ error: 'Failed to fetch branding configuration' });
  }
});

/**
 * PUT /api/whitelabel/config
 * Update branding configuration
 */
router.put('/config', async (req: Request, res: Response) => {
  try {
    const organizationId = req.user?.organizationId;

    if (!organizationId) {
      return res.status(401).json({ error: 'Unauthorized' });
    }

    const config = await whiteLabelService.updateBrandingConfig(organizationId, req.body);

    res.json(config);
  } catch (error: any) {
    console.error('Error updating branding config:', error);
    res.status(400).json({ error: error.message || 'Failed to update branding configuration' });
  }
});

/**
 * POST /api/whitelabel/logo
 * Upload logo or favicon
 */
router.post('/logo', upload.single('file'), async (req: Request, res: Response) => {
  try {
    const organizationId = req.user?.organizationId;

    if (!organizationId) {
      return res.status(401).json({ error: 'Unauthorized' });
    }

    if (!req.file) {
      return res.status(400).json({ error: 'No file uploaded' });
    }

    const logoType = req.body.type as 'logo' | 'logoDark' | 'logoSquare' | 'favicon';

    if (!['logo', 'logoDark', 'logoSquare', 'favicon'].includes(logoType)) {
      return res.status(400).json({ error: 'Invalid logo type' });
    }

    // In production, upload to S3 or CDN
    const fileUrl = `/uploads/branding/${req.file.filename}`;

    const config = await whiteLabelService.uploadLogo(organizationId, logoType, fileUrl);

    res.json({
      success: true,
      fileUrl,
      config,
    });
  } catch (error) {
    console.error('Error uploading logo:', error);
    res.status(500).json({ error: 'Failed to upload logo' });
  }
});

/**
 * POST /api/whitelabel/domain
 * Configure custom domain
 */
router.post('/domain', async (req: Request, res: Response) => {
  try {
    const organizationId = req.user?.organizationId;

    if (!organizationId) {
      return res.status(401).json({ error: 'Unauthorized' });
    }

    const { customDomain } = req.body;

    if (!customDomain) {
      return res.status(400).json({ error: 'Custom domain is required' });
    }

    const result = await whiteLabelService.configureCustomDomain(organizationId, customDomain);

    res.json(result);
  } catch (error: any) {
    console.error('Error configuring custom domain:', error);
    res.status(400).json({ error: error.message || 'Failed to configure custom domain' });
  }
});

/**
 * POST /api/whitelabel/domain/verify
 * Verify custom domain DNS configuration
 */
router.post('/domain/verify', async (req: Request, res: Response) => {
  try {
    const organizationId = req.user?.organizationId;

    if (!organizationId) {
      return res.status(401).json({ error: 'Unauthorized' });
    }

    const verified = await whiteLabelService.verifyCustomDomain(organizationId);

    res.json({ verified });
  } catch (error: any) {
    console.error('Error verifying custom domain:', error);
    res.status(400).json({ error: error.message || 'Failed to verify custom domain' });
  }
});

/**
 * GET /api/whitelabel/preview
 * Get preview of branding with CSS variables
 */
router.get('/preview', async (req: Request, res: Response) => {
  try {
    const organizationId = req.user?.organizationId;

    if (!organizationId) {
      return res.status(401).json({ error: 'Unauthorized' });
    }

    const config = await whiteLabelService.getBrandingConfig(organizationId);

    if (!config) {
      return res.status(404).json({ error: 'No branding configuration found' });
    }

    const cssVariables = whiteLabelService.getCSSVariables(config);

    res.json({
      config,
      cssVariables,
    });
  } catch (error) {
    console.error('Error fetching branding preview:', error);
    res.status(500).json({ error: 'Failed to fetch branding preview' });
  }
});

/**
 * POST /api/whitelabel/contrast
 * Calculate contrast ratio between two colors
 */
router.post('/contrast', async (req: Request, res: Response) => {
  try {
    const { color1, color2 } = req.body;

    if (!color1 || !color2) {
      return res.status(400).json({ error: 'Two colors are required' });
    }

    const contrast = whiteLabelService.calculateContrast(color1, color2);

    res.json({
      contrast,
      ratio: `${contrast.toFixed(2)}:1`,
      wcagAA: contrast >= 4.5,
      wcagAAA: contrast >= 7,
    });
  } catch (error) {
    console.error('Error calculating contrast:', error);
    res.status(400).json({ error: 'Failed to calculate contrast' });
  }
});

/**
 * POST /api/whitelabel/reset
 * Reset to default branding
 */
router.post('/reset', async (req: Request, res: Response) => {
  try {
    const organizationId = req.user?.organizationId;

    if (!organizationId) {
      return res.status(401).json({ error: 'Unauthorized' });
    }

    const config = await whiteLabelService.resetToDefaults(organizationId);

    res.json(config);
  } catch (error) {
    console.error('Error resetting branding:', error);
    res.status(500).json({ error: 'Failed to reset branding' });
  }
});

/**
 * DELETE /api/whitelabel/config
 * Delete branding configuration
 */
router.delete('/config', async (req: Request, res: Response) => {
  try {
    const organizationId = req.user?.organizationId;

    if (!organizationId) {
      return res.status(401).json({ error: 'Unauthorized' });
    }

    await whiteLabelService.deleteBrandingConfig(organizationId);

    res.json({ success: true });
  } catch (error) {
    console.error('Error deleting branding config:', error);
    res.status(500).json({ error: 'Failed to delete branding configuration' });
  }
});

/**
 * GET /api/whitelabel/domain/:domain
 * Get branding configuration by custom domain (public endpoint)
 */
router.get('/domain/:domain', async (req: Request, res: Response) => {
  try {
    const { domain } = req.params;

    const config = await whiteLabelService.getBrandingByDomain(domain);

    if (!config) {
      return res.status(404).json({ error: 'No branding configuration found for this domain' });
    }

    res.json(config);
  } catch (error) {
    console.error('Error fetching branding by domain:', error);
    res.status(500).json({ error: 'Failed to fetch branding configuration' });
  }
});

export default router;
