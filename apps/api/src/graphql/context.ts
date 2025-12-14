/**
 * GraphQL Context - Real context with authentication and DataLoaders
 */

import { PrismaClient } from '@prisma/client';
import { Request, Response } from 'express';
import Redis from 'ioredis';
import jwt from 'jsonwebtoken';
import { createLoaders, DataLoaders } from './dataloaders';
import { pubsub } from './pubsub';
import { logger } from '../utils/logger';

const JWT_SECRET = process.env.JWT_SECRET || 'your-secret-key';

export interface User {
  id: string;
  email: string;
  organizationId?: string;
  role: string;
}

export interface GraphQLContext {
  req: Request;
  res: Response;
  prisma: PrismaClient;
  redis: Redis;
  pubsub: typeof pubsub;
  loaders: DataLoaders;
  user: User | null;
}

/**
 * Extract user from JWT token
 */
function getUserFromToken(token: string | undefined): User | null {
  if (!token) return null;

  try {
    // Remove 'Bearer ' prefix if present
    const actualToken = token.startsWith('Bearer ') ? token.slice(7) : token;

    // Verify and decode JWT
    const decoded = jwt.verify(actualToken, JWT_SECRET) as any;

    return {
      id: decoded.userId || decoded.id,
      email: decoded.email,
      organizationId: decoded.organizationId,
      role: decoded.role,
    };
  } catch (error) {
    logger.error('GraphQL Context: Invalid token', { error: error.message, stack: error.stack });
    return null;
  }
}

/**
 * Create GraphQL context for each request
 * Creates fresh DataLoaders per request to prevent cache issues
 */
export function createContext(
  prisma: PrismaClient,
  redis: Redis
): (context: { req: Request; res: Response }) => GraphQLContext {
  return ({ req, res }) => {
    // Extract token from Authorization header or cookie
    const token = req.headers.authorization || req.cookies?.token;

    // Get user from token
    const user = getUserFromToken(token);

    // Create fresh loaders for this request (important for cache isolation)
    const loaders = createLoaders(prisma);

    return {
      req,
      res,
      prisma,
      redis,
      pubsub,
      loaders,
      user,
    };
  };
}

/**
 * Context for WebSocket subscriptions
 */
export interface SubscriptionContext {
  prisma: PrismaClient;
  redis: Redis;
  pubsub: typeof pubsub;
  user: User | null;
}

/**
 * Create context for WebSocket connections
 */
export function createSubscriptionContext(
  prisma: PrismaClient,
  redis: Redis
): (connectionParams: any) => SubscriptionContext | Promise<SubscriptionContext> {
  return (connectionParams) => {
    // Extract token from connection params
    const token = connectionParams?.authorization || connectionParams?.token;

    // Get user from token
    const user = getUserFromToken(token);

    return {
      prisma,
      redis,
      pubsub,
      user,
    };
  };
}

/**
 * Authorization helper - Check if user is authenticated
 */
export function requireAuth(context: GraphQLContext): User {
  if (!context.user) {
    throw new Error('Authentication required');
  }
  return context.user;
}

/**
 * Authorization helper - Check if user has specific role
 */
export function requireRole(context: GraphQLContext, roles: string[]): User {
  const user = requireAuth(context);

  if (!roles.includes(user.role)) {
    throw new Error('Insufficient permissions');
  }

  return user;
}

/**
 * Authorization helper - Check if user belongs to organization
 */
export function requireOrganization(context: GraphQLContext, organizationId: string): User {
  const user = requireAuth(context);

  if (user.organizationId !== organizationId) {
    throw new Error('Access denied to this organization');
  }

  return user;
}
