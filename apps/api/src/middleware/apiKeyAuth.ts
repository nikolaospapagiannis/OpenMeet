/**
 * API Key Authentication Middleware
 *
 * Validates API keys for public API access
 * Enforces rate limits and scopes
 */

import { Request, Response, NextFunction } from 'express';
import { apiKeyService } from '../services/APIKeyService';
import { logger } from '../utils/logger';

export interface APIKeyRequest extends Request {
  apiKey?: {
    id: string;
    organizationId: string;
    userId: string;
    scopes: string[];
    rateLimit: number;
  };
}

/**
 * API Key authentication middleware
 * Checks Authorization header for API key
 */
export async function apiKeyAuthMiddleware(
  req: Request,
  res: Response,
  next: NextFunction
): Promise<void> {
  try {
    // Get API key from Authorization header
    const authHeader = req.headers.authorization;

    if (!authHeader || !authHeader.startsWith('Bearer ')) {
      res.status(401).json({
        error: 'Unauthorized',
        message: 'API key required. Format: Authorization: Bearer ff_your_api_key',
      });
      return;
    }

    const apiKey = authHeader.substring(7); // Remove 'Bearer '

    // Validate API key
    const validatedKey = await apiKeyService.validateAPIKey(apiKey);

    if (!validatedKey) {
      res.status(401).json({
        error: 'Unauthorized',
        message: 'Invalid or expired API key',
      });
      return;
    }

    // Check rate limit
    const rateLimitCheck = await apiKeyService.checkRateLimit(validatedKey.id);

    if (!rateLimitCheck.allowed) {
      res.status(429).json({
        error: 'Rate limit exceeded',
        message: `Rate limit of ${rateLimitCheck.limit} requests/hour exceeded`,
        limit: rateLimitCheck.limit,
        remaining: 0,
        resetAt: rateLimitCheck.resetAt,
      });
      return;
    }

    // Add rate limit headers
    res.setHeader('X-RateLimit-Limit', rateLimitCheck.limit.toString());
    res.setHeader('X-RateLimit-Remaining', rateLimitCheck.remaining.toString());
    res.setHeader('X-RateLimit-Reset', rateLimitCheck.resetAt.toISOString());

    // Attach API key info to request
    (req as APIKeyRequest).apiKey = {
      id: validatedKey.id,
      organizationId: validatedKey.organizationId,
      userId: validatedKey.userId,
      scopes: validatedKey.scopes,
      rateLimit: validatedKey.rateLimit,
    };

    // Log API usage
    apiKeyService.logUsage(
      validatedKey.id,
      req.path,
      req.method,
      200, // Will be updated by response interceptor
      {
        ipAddress: req.ip,
        userAgent: req.headers['user-agent'],
      }
    ).catch(err => logger.error('Failed to log API usage', { error: err }));

    next();
  } catch (error) {
    logger.error('API key authentication error', { error });
    res.status(500).json({
      error: 'Internal server error',
      message: 'Failed to authenticate API key',
    });
  }
}

/**
 * Require specific scopes middleware
 */
export function requireScopes(...requiredScopes: string[]) {
  return (req: Request, res: Response, next: NextFunction): void => {
    const apiKeyReq = req as APIKeyRequest;

    if (!apiKeyReq.apiKey) {
      res.status(401).json({
        error: 'Unauthorized',
        message: 'API key required',
      });
      return;
    }

    const hasRequiredScopes = requiredScopes.every(scope =>
      apiKeyReq.apiKey!.scopes.includes(scope)
    );

    if (!hasRequiredScopes) {
      res.status(403).json({
        error: 'Forbidden',
        message: `Required scopes: ${requiredScopes.join(', ')}`,
        yourScopes: apiKeyReq.apiKey.scopes,
      });
      return;
    }

    next();
  };
}
