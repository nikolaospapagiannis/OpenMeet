/**
 * Authentication Middleware
 * JWT token validation and user authentication
 */

import { Request, Response, NextFunction } from 'express';
import jwt from 'jsonwebtoken';
import { PrismaClient } from '@prisma/client';
import { logger } from '../utils/logger';

const prisma = new PrismaClient();

// Extend Express Request type to include user
declare global {
  namespace Express {
    interface Request {
      user?: {
        userId: string;
        email: string;
        organizationId?: string;
        role?: string;
        ssoSessionId?: string;
      };
    }
  }
}

/**
 * Authenticate JWT token from Authorization header
 */
export async function authenticateToken(
  req: Request,
  res: Response,
  next: NextFunction
): Promise<void> {
  try {
    const authHeader = req.headers.authorization;
    const token = authHeader?.split(' ')[1]; // Bearer TOKEN

    if (!token) {
      res.status(401).json({
        error: 'Authentication required',
        message: 'No token provided',
      });
      return;
    }

    // Verify JWT token
    const decoded = jwt.verify(
      token,
      process.env.JWT_SECRET || 'secret'
    ) as any;

    // Attach user info to request
    req.user = {
      userId: decoded.userId || decoded.id,
      email: decoded.email,
      organizationId: decoded.organizationId,
      role: decoded.role,
      ssoSessionId: decoded.ssoSessionId,
    };

    logger.debug('Token authenticated', {
      userId: req.user.userId,
      email: req.user.email,
    });

    next();
  } catch (error) {
    if (error instanceof jwt.JsonWebTokenError) {
      res.status(403).json({
        error: 'Invalid token',
        message: 'Token verification failed',
      });
    } else if (error instanceof jwt.TokenExpiredError) {
      res.status(403).json({
        error: 'Token expired',
        message: 'Please login again',
      });
    } else {
      logger.error('Authentication error', { error });
      res.status(500).json({
        error: 'Authentication error',
        message: 'Failed to authenticate token',
      });
    }
  }
}

/**
 * Authenticate API key from X-API-Key header (for public API)
 */
export async function authenticateApiKey(
  req: Request,
  res: Response,
  next: NextFunction
): Promise<void> {
  try {
    const apiKey = req.headers['x-api-key'] as string;

    if (!apiKey) {
      res.status(401).json({
        error: 'Authentication required',
        message: 'No API key provided',
      });
      return;
    }

    // Validate API key against database
    const apiKeyRecord = await prisma.apiKey.findFirst({
      where: {
        key: apiKey,
        isActive: true,
        expiresAt: {
          gt: new Date(),
        },
      },
      include: {
        organization: true,
      },
    });

    if (!apiKeyRecord) {
      res.status(403).json({
        error: 'Invalid API key',
        message: 'API key not found or expired',
      });
      return;
    }

    // Update last used timestamp
    await prisma.apiKey.update({
      where: { id: apiKeyRecord.id },
      data: { lastUsedAt: new Date() },
    });

    // Attach organization info to request
    req.user = {
      userId: apiKeyRecord.userId,
      email: '',
      organizationId: apiKeyRecord.organizationId,
    };

    logger.debug('API key authenticated', {
      organizationId: req.user.organizationId,
      apiKeyId: apiKeyRecord.id,
    });

    next();
  } catch (error) {
    logger.error('API key authentication error', { error });
    res.status(500).json({
      error: 'Authentication error',
      message: 'Failed to authenticate API key',
    });
  }
}

/**
 * Require specific role
 */
export function requireRole(...roles: string[]) {
  return async (req: Request, res: Response, next: NextFunction): Promise<void> => {
    if (!req.user) {
      res.status(401).json({
        error: 'Authentication required',
        message: 'User not authenticated',
      });
      return;
    }

    // Fetch user role from database
    const user = await prisma.user.findUnique({
      where: { id: req.user.userId },
      select: { role: true },
    });

    if (!user || !roles.includes(user.role)) {
      res.status(403).json({
        error: 'Forbidden',
        message: 'Insufficient permissions',
      });
      return;
    }

    next();
  };
}

/**
 * Require organization membership
 */
export function requireOrganization(
  req: Request,
  res: Response,
  next: NextFunction
): void {
  if (!req.user?.organizationId) {
    res.status(403).json({
      error: 'Forbidden',
      message: 'Organization membership required',
    });
    return;
  }

  next();
}

/**
 * Optional authentication (doesn't fail if no token)
 */
export async function optionalAuth(
  req: Request,
  res: Response,
  next: NextFunction
): Promise<void> {
  try {
    const authHeader = req.headers.authorization;
    const token = authHeader?.split(' ')[1];

    if (token) {
      const decoded = jwt.verify(
        token,
        process.env.JWT_SECRET || 'secret'
      ) as any;

      req.user = {
        userId: decoded.userId || decoded.id,
        email: decoded.email,
        organizationId: decoded.organizationId,
        role: decoded.role,
      };
    }

    next();
  } catch (error) {
    // Don't fail on auth error - just continue without user
    next();
  }
}

// Export for backwards compatibility
export const authMiddleware = authenticateToken;
