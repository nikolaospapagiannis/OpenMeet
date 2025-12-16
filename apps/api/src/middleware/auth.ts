/**
 * Authentication Middleware
 * JWT-based authentication with refresh tokens
 */

import { Request, Response, NextFunction } from 'express';
import jwt from 'jsonwebtoken';
import { PrismaClient } from '@prisma/client';
import Redis from 'ioredis';
import winston from 'winston';
import { getRequiredEnv } from '../config/env';

const prisma = new PrismaClient();
const redis = new Redis({
  host: process.env.REDIS_HOST || 'localhost',
  port: parseInt(process.env.REDIS_PORT || '6379'),
  password: process.env.REDIS_PASSWORD,
});

const logger = winston.createLogger({
  level: process.env.LOG_LEVEL || 'info',
  defaultMeta: { service: 'auth-middleware' },
  transports: [new winston.transports.Console()],
});

// Extend Request type to include user with systemRole for admin features
declare global {
  namespace Express {
    interface Request {
      user?: {
        id: string;
        email: string;
        organizationId?: string;
        role: string;
        systemRole?: string;
      };
    }
  }
}

interface JWTPayload {
  id: string;
  email: string;
  organizationId?: string;
  role: string;
  sessionId: string;
}

/**
 * Verify JWT token and attach user to request
 */
export const authMiddleware = async (
  req: Request,
  res: Response,
  next: NextFunction
): Promise<void> => {
  try {
    // Check for token in cookie first, then fall back to Authorization header
    let token = req.cookies?.access_token;

    if (!token) {
      const authHeader = req.headers.authorization;
      if (authHeader) {
        token = authHeader.replace('Bearer ', '');
      }
    }

    if (!token) {
      res.status(401).json({ error: 'No authentication token provided' });
      return;
    }

    // Check if token is blacklisted
    const isBlacklisted = await redis.get(`blacklist:${token}`);
    if (isBlacklisted) {
      res.status(401).json({ error: 'Token has been revoked' });
      return;
    }

    // Verify token
    const decoded = jwt.verify(
      token,
      getRequiredEnv('JWT_SECRET')
    ) as JWTPayload;

    // Check if session exists
    const session = await prisma.session.findUnique({
      where: { id: decoded.sessionId },
      include: { user: true },
    });

    if (!session) {
      res.status(401).json({ error: 'Invalid session' });
      return;
    }

    if (session.expiresAt < new Date()) {
      await prisma.session.delete({ where: { id: session.id } });
      res.status(401).json({ error: 'Session expired' });
      return;
    }

    // Check if user is active
    if (!session.user.isActive) {
      res.status(403).json({ error: 'User account is disabled' });
      return;
    }

    // Attach user to request
    req.user = {
      id: session.user.id,
      email: session.user.email,
      organizationId: session.user.organizationId || undefined,
      role: session.user.role,
    };

    // Update last activity in cache
    await redis.set(
      `user:activity:${session.user.id}`,
      new Date().toISOString(),
      'EX',
      3600
    );

    next();
  } catch (error) {
    if (error instanceof jwt.TokenExpiredError) {
      res.status(401).json({ error: 'Token expired' });
      return;
    }
    
    if (error instanceof jwt.JsonWebTokenError) {
      res.status(401).json({ error: 'Invalid token' });
      return;
    }

    logger.error('Authentication error:', error);
    res.status(500).json({ error: 'Authentication failed' });
  }
};

/**
 * Optional authentication - attaches user if token is valid, continues without error if not
 */
export const optionalAuth = async (
  req: Request,
  res: Response,
  next: NextFunction
): Promise<void> => {
  try {
    let token = req.cookies?.access_token;

    if (!token) {
      const authHeader = req.headers.authorization;
      if (authHeader) {
        token = authHeader.replace('Bearer ', '');
      }
    }

    if (!token) {
      // No token provided, continue without authentication
      next();
      return;
    }

    // Check if token is blacklisted
    const isBlacklisted = await redis.get(`blacklist:${token}`);
    if (isBlacklisted) {
      // Token is blacklisted, continue without authentication
      next();
      return;
    }

    // Verify token
    const decoded = jwt.verify(
      token,
      getRequiredEnv('JWT_SECRET')
    ) as JWTPayload;

    // Check if session exists
    const session = await prisma.session.findUnique({
      where: { id: decoded.sessionId },
      include: { user: true },
    });

    if (!session || session.expiresAt < new Date() || !session.user.isActive) {
      // Invalid session, continue without authentication
      next();
      return;
    }

    // Attach user to request
    req.user = {
      id: session.user.id,
      email: session.user.email,
      organizationId: session.user.organizationId || undefined,
      role: session.user.role,
    };

    next();
  } catch (error) {
    // Token verification failed, continue without authentication
    next();
  }
};

/**
 * Check if user has required role
 */
export const requireRole = (allowedRoles: string[]) => {
  return async (req: Request, res: Response, next: NextFunction): Promise<void> => {
    if (!req.user) {
      res.status(401).json({ error: 'Not authenticated' });
      return;
    }

    if (!allowedRoles.includes(req.user.role)) {
      res.status(403).json({ error: 'Insufficient permissions' });
      return;
    }

    next();
  };
};

/**
 * Check if user belongs to organization
 */
export const requireOrganization = async (
  req: Request,
  res: Response,
  next: NextFunction
): Promise<void> => {
  if (!req.user) {
    res.status(401).json({ error: 'Not authenticated' });
    return;
  }

  if (!req.user.organizationId) {
    res.status(403).json({ error: 'Organization membership required' });
    return;
  }

  next();
};

/**
 * Verify API key authentication
 */
export const apiKeyAuth = async (
  req: Request,
  res: Response,
  next: NextFunction
): Promise<void> => {
  try {
    const apiKey = req.headers['x-api-key'] as string;
    
    if (!apiKey) {
      res.status(401).json({ error: 'API key required' });
      return;
    }

    // Hash the API key
    const crypto = await import('crypto');
    const keyHash = crypto
      .createHash('sha256')
      .update(apiKey)
      .digest('hex');

    // Find API key in database
    const apiKeyRecord = await prisma.apiKey.findUnique({
      where: { keyHash },
      include: {
        user: true,
      },
    });

    if (!apiKeyRecord) {
      res.status(401).json({ error: 'Invalid API key' });
      return;
    }

    if (!apiKeyRecord.isActive) {
      res.status(401).json({ error: 'API key is disabled' });
      return;
    }

    if (apiKeyRecord.expiresAt && apiKeyRecord.expiresAt < new Date()) {
      res.status(401).json({ error: 'API key expired' });
      return;
    }

    // Update last used timestamp
    await prisma.apiKey.update({
      where: { id: apiKeyRecord.id },
      data: { lastUsedAt: new Date() },
    });

    // Attach user to request
    req.user = {
      id: apiKeyRecord.user.id,
      email: apiKeyRecord.user.email,
      organizationId: apiKeyRecord.organizationId,
      role: apiKeyRecord.user.role,
    };

    // Log API key usage
    await prisma.auditLog.create({
      data: {
        organizationId: apiKeyRecord.organizationId,
        userId: apiKeyRecord.user.id,
        action: 'api_key_used',
        resourceType: 'api_key',
        resourceId: apiKeyRecord.id,
        ipAddress: req.ip,
        userAgent: req.headers['user-agent'],
        metadata: {
          endpoint: req.path,
          method: req.method,
        },
      },
    });

    next();
  } catch (error) {
    logger.error('API key authentication error:', error);
    res.status(500).json({ error: 'Authentication failed' });
  }
};

/**
 * OAuth callback verification
 */
export const verifyOAuthCallback = (provider: string) => {
  return async (req: Request, res: Response, next: NextFunction): Promise<void> => {
    try {
      const state = req.query.state as string;
      const code = req.query.code as string;

      if (!state || !code) {
        res.status(400).json({ error: 'Missing OAuth parameters' });
        return;
      }

      // Verify state parameter
      const storedState = await redis.get(`oauth:state:${state}`);
      if (!storedState) {
        res.status(400).json({ error: 'Invalid OAuth state' });
        return;
      }

      // Delete state to prevent replay attacks
      await redis.del(`oauth:state:${state}`);

      // Store code temporarily for token exchange
      await redis.set(
        `oauth:code:${state}`,
        JSON.stringify({ code, provider }),
        'EX',
        300 // 5 minutes
      );

      next();
    } catch (error) {
      logger.error('OAuth verification error:', error);
      res.status(500).json({ error: 'OAuth verification failed' });
    }
  };
};

/**
 * Rate limiting per user
 */
export const userRateLimit = (limit: number, windowMs: number) => {
  return async (req: Request, res: Response, next: NextFunction): Promise<void> => {
    if (!req.user) {
      next();
      return;
    }

    const key = `rate:${req.user.id}:${req.path}`;
    const current = await redis.incr(key);
    
    if (current === 1) {
      await redis.expire(key, Math.ceil(windowMs / 1000));
    }

    if (current > limit) {
      res.status(429).json({ 
        error: 'Rate limit exceeded',
        retryAfter: await redis.ttl(key),
      });
      return;
    }

    next();
  };
};

// Export alias for backwards compatibility
export { authMiddleware as authenticateToken };
