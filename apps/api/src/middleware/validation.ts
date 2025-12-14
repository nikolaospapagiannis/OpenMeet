/**
 * Request Validation Middleware
 * Validates request data against schemas
 */

import { Request, Response, NextFunction } from 'express';
import { logger } from '../utils/logger';

/**
 * Validate request body against a schema
 */
export function validateRequest(schema: any) {
  return (req: Request, res: Response, next: NextFunction): void => {
    try {
      // Simple validation - can be enhanced with Joi or Zod
      if (schema.required) {
        for (const field of schema.required) {
          if (!req.body[field]) {
            res.status(400).json({
              error: 'Validation error',
              message: `Missing required field: ${field}`,
            });
            return;
          }
        }
      }

      next();
    } catch (error) {
      logger.error('Validation error', { error });
      res.status(400).json({
        error: 'Validation error',
        message: 'Request validation failed',
      });
    }
  };
}

/**
 * Validate query parameters
 */
export function validateQuery(schema: any) {
  return (req: Request, res: Response, next: NextFunction): void => {
    try {
      if (schema.required) {
        for (const field of schema.required) {
          if (!req.query[field]) {
            res.status(400).json({
              error: 'Validation error',
              message: `Missing required query parameter: ${field}`,
            });
            return;
          }
        }
      }

      next();
    } catch (error) {
      logger.error('Query validation error', { error });
      res.status(400).json({
        error: 'Validation error',
        message: 'Query validation failed',
      });
    }
  };
}

/**
 * Validate request params
 */
export function validateParams(schema: any) {
  return (req: Request, res: Response, next: NextFunction): void => {
    try {
      if (schema.required) {
        for (const field of schema.required) {
          if (!req.params[field]) {
            res.status(400).json({
              error: 'Validation error',
              message: `Missing required parameter: ${field}`,
            });
            return;
          }
        }
      }

      next();
    } catch (error) {
      logger.error('Params validation error', { error });
      res.status(400).json({
        error: 'Validation error',
        message: 'Parameter validation failed',
      });
    }
  };
}
