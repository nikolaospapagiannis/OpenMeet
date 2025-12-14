/**
 * Multi-Tenant Middleware
 * Ensures tenant isolation for all billing operations
 */

import { Response, NextFunction } from 'express';
import { createLogger, format, transports } from 'winston';
import { AuthenticatedRequest } from './auth';

const logger = createLogger({
  level: process.env.LOG_LEVEL || 'info',
  format: format.combine(format.timestamp(), format.json()),
  defaultMeta: { service: 'billing-tenant' },
  transports: [new transports.Console()],
});

export interface TenantRequest extends AuthenticatedRequest {
  organizationId: string;
  tenantContext: {
    organizationId: string;
    userId: string;
    userRole: string;
    isAdmin: boolean;
    canManageBilling: boolean;
  };
}

/**
 * Tenant middleware ensures:
 * 1. Every request has an organization context
 * 2. User has permission to access billing for that organization
 * 3. All subsequent queries are scoped to the organization
 */
export const tenantMiddleware = async (
  req: AuthenticatedRequest,
  res: Response,
  next: NextFunction
): Promise<void> => {
  try {
    // Get organization ID from multiple sources (priority order)
    const organizationId =
      req.headers['x-organization-id'] as string ||
      req.user?.organizationId ||
      req.query.organizationId as string ||
      req.body?.organizationId;

    if (!organizationId) {
      res.status(400).json({
        error: 'Bad Request',
        message: 'Organization ID is required for billing operations',
        code: 'MISSING_ORGANIZATION',
      });
      return;
    }

    // Validate organization ID format (UUID)
    const uuidRegex = /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;
    if (!uuidRegex.test(organizationId)) {
      res.status(400).json({
        error: 'Bad Request',
        message: 'Invalid organization ID format',
        code: 'INVALID_ORGANIZATION_ID',
      });
      return;
    }

    // Verify user has access to this organization
    // In a production system, this would check the database
    // For now, we trust the JWT claims
    const userOrgId = req.user?.organizationId;
    const userRole = req.user?.role || 'member';

    // Super admins can access any organization
    const isSuperAdmin = userRole === 'super_admin';

    // Users must belong to the organization they're accessing
    if (!isSuperAdmin && userOrgId !== organizationId) {
      logger.warn('Tenant access denied', {
        userId: req.user?.id,
        requestedOrg: organizationId,
        userOrg: userOrgId,
      });

      res.status(403).json({
        error: 'Forbidden',
        message: 'You do not have access to this organization',
        code: 'ORGANIZATION_ACCESS_DENIED',
      });
      return;
    }

    // Check billing permissions
    const billingRoles = ['owner', 'admin', 'billing_admin', 'super_admin'];
    const canManageBilling = billingRoles.includes(userRole);

    // Attach tenant context to request
    (req as TenantRequest).organizationId = organizationId;
    (req as TenantRequest).tenantContext = {
      organizationId,
      userId: req.user?.id || '',
      userRole,
      isAdmin: ['owner', 'admin', 'super_admin'].includes(userRole),
      canManageBilling,
    };

    logger.debug('Tenant context established', {
      organizationId,
      userId: req.user?.id,
      canManageBilling,
    });

    next();
  } catch (error) {
    logger.error('Tenant middleware error', { error });
    res.status(500).json({
      error: 'Internal Server Error',
      message: 'Failed to establish tenant context',
    });
  }
};

/**
 * Require billing management permission
 */
export const requireBillingPermission = (
  req: AuthenticatedRequest,
  res: Response,
  next: NextFunction
): void => {
  const tenantReq = req as TenantRequest;

  if (!tenantReq.tenantContext?.canManageBilling) {
    res.status(403).json({
      error: 'Forbidden',
      message: 'You do not have permission to manage billing',
      code: 'BILLING_PERMISSION_DENIED',
    });
    return;
  }

  next();
};
