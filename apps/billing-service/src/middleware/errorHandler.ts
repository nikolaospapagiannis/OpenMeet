/**
 * Global Error Handler
 */

import { Request, Response, NextFunction } from 'express';
import { createLogger, format, transports } from 'winston';

const logger = createLogger({
  level: process.env.LOG_LEVEL || 'info',
  format: format.combine(format.timestamp(), format.json()),
  defaultMeta: { service: 'billing-error' },
  transports: [new transports.Console()],
});

export interface ApiError extends Error {
  statusCode?: number;
  code?: string;
  details?: unknown;
}

export const errorHandler = (
  err: ApiError,
  _req: Request,
  res: Response,
  _next: NextFunction
): void => {
  const statusCode = err.statusCode || 500;
  const isProduction = process.env.NODE_ENV === 'production';

  logger.error('Request error', {
    message: err.message,
    code: err.code,
    statusCode,
    stack: err.stack,
    details: err.details,
  });

  res.status(statusCode).json({
    error: statusCode >= 500 ? 'Internal Server Error' : err.message,
    message: isProduction && statusCode >= 500
      ? 'An unexpected error occurred'
      : err.message,
    code: err.code,
    ...(isProduction ? {} : { stack: err.stack, details: err.details }),
  });
};

/**
 * Create a typed API error
 */
export const createError = (
  message: string,
  statusCode: number = 500,
  code?: string,
  details?: unknown
): ApiError => {
  const error = new Error(message) as ApiError;
  error.statusCode = statusCode;
  error.code = code;
  error.details = details;
  return error;
};
