import { Request, Response, NextFunction } from 'express';
import { whiteLabelService } from '../services/WhiteLabelService';

declare global {
  namespace Express {
    interface Request {
      branding?: {
        primaryColor: string;
        secondaryColor: string;
        accentColor: string;
        backgroundColor: string;
        textColor: string;
        logoUrl?: string;
        logoDarkUrl?: string;
        logoSquareUrl?: string;
        faviconUrl?: string;
        customDomain?: string;
        customDomainVerified: boolean;
        emailFromName: string;
        emailFromEmail?: string;
        emailLogoUrl?: string;
        emailFooter?: string;
        customCSS?: string;
        customJS?: string;
        productName: string;
        companyName?: string;
        tagline?: string;
        hideWatermark: boolean;
        customFonts?: Record<string, any>;
      };
    }
  }
}

/**
 * Middleware to load branding configuration per request
 * Attaches branding to req.branding for use in routes
 */
export const whitelabelMiddleware = async (
  req: Request,
  res: Response,
  next: NextFunction
) => {
  try {
    let branding = null;

    // First, try to load branding by custom domain
    const host = req.get('host');
    if (host) {
      // Remove port if present
      const domain = host.split(':')[0];

      // Skip localhost and default domains
      if (!domain.includes('localhost') &&
          !domain.includes('127.0.0.1') &&
          !domain.includes('openmeet.com')) {
        branding = await whiteLabelService.getBrandingByDomain(domain);
      }
    }

    // If no custom domain branding, try organization ID from user
    if (!branding && req.user?.organizationId) {
      branding = await whiteLabelService.getBrandingConfig(req.user.organizationId);
    }

    // Attach branding to request
    if (branding) {
      req.branding = branding;
    }

    next();
  } catch (error) {
    console.error('Error loading branding:', error);
    // Continue without branding on error
    next();
  }
};

/**
 * Middleware to inject branding into HTML responses
 */
export const injectBrandingHTML = (
  req: Request,
  res: Response,
  next: NextFunction
) => {
  const originalSend = res.send;

  res.send = function (body: any): Response {
    if (req.branding && typeof body === 'string' && body.includes('</head>')) {
      const cssVariables = whiteLabelService.getCSSVariables(req.branding);

      const styleTag = `
        <style>
          :root {
            ${Object.entries(cssVariables)
              .map(([key, value]) => `${key}: ${value};`)
              .join('\n            ')}
          }
          ${req.branding.customCSS || ''}
        </style>
      `;

      const scriptTag = req.branding.customJS
        ? `<script>${req.branding.customJS}</script>`
        : '';

      const faviconTag = req.branding.faviconUrl
        ? `<link rel="icon" type="image/png" href="${req.branding.faviconUrl}">`
        : '';

      const titleTag = req.branding.productName
        ? `<title>${req.branding.productName}</title>`
        : '';

      body = body.replace(
        '</head>',
        `${titleTag}${faviconTag}${styleTag}${scriptTag}</head>`
      );
    }

    return originalSend.call(this, body);
  };

  next();
};

/**
 * Middleware to inject branding into API responses
 */
export const injectBrandingAPI = (
  req: Request,
  res: Response,
  next: NextFunction
) => {
  const originalJson = res.json;

  res.json = function (body: any): Response {
    if (req.branding) {
      // Add branding to response metadata
      body._branding = {
        primaryColor: req.branding.primaryColor,
        secondaryColor: req.branding.secondaryColor,
        accentColor: req.branding.accentColor,
        logoUrl: req.branding.logoUrl,
        productName: req.branding.productName,
        companyName: req.branding.companyName,
        hideWatermark: req.branding.hideWatermark,
      };
    }

    return originalJson.call(this, body);
  };

  next();
};

/**
 * Express middleware to enforce custom domain
 */
export const enforceCustomDomain = async (
  req: Request,
  res: Response,
  next: NextFunction
) => {
  try {
    if (req.user?.organizationId) {
      const config = await whiteLabelService.getBrandingConfig(req.user.organizationId);

      if (config?.customDomain && config.customDomainVerified) {
        const host = req.get('host');
        const currentDomain = host?.split(':')[0];

        // If not on custom domain, redirect
        if (currentDomain !== config.customDomain) {
          const protocol = req.secure ? 'https' : 'http';
          const redirectUrl = `${protocol}://${config.customDomain}${req.originalUrl}`;

          return res.redirect(301, redirectUrl);
        }
      }
    }

    next();
  } catch (error) {
    console.error('Error enforcing custom domain:', error);
    next();
  }
};
