/**
 * Comprehensive Security Middleware
 * Fortune 100 Grade Security Headers & Protection
 */

import { Request, Response, NextFunction } from 'express';
import helmet from 'helmet';
import rateLimit from 'express-rate-limit';
import crypto from 'crypto';
import winston from 'winston';

// Initialize logger
const logger = winston.createLogger({
  level: process.env.LOG_LEVEL || 'info',
  format: winston.format.combine(
    winston.format.timestamp(),
    winston.format.errors({ stack: true }),
    winston.format.json()
  ),
  defaultMeta: { service: 'security' },
  transports: [
    new winston.transports.Console({
      format: winston.format.combine(
        winston.format.colorize(),
        winston.format.simple()
      ),
    }),
    new winston.transports.File({ filename: 'logs/security.log' }),
  ],
});

/**
 * Comprehensive Helmet Configuration
 * Implements all critical security headers
 */
export const helmetConfig = helmet({
  // Content Security Policy - Prevents XSS attacks
  contentSecurityPolicy: {
    directives: {
      defaultSrc: ["'self'"],
      scriptSrc: [
        "'self'",
        "'unsafe-inline'", // Required for some frameworks, consider removing in production
        'https://cdn.jsdelivr.net',
        'https://unpkg.com',
      ],
      styleSrc: ["'self'", "'unsafe-inline'", 'https://fonts.googleapis.com'],
      fontSrc: ["'self'", 'https://fonts.gstatic.com', 'data:'],
      imgSrc: ["'self'", 'data:', 'https:', 'blob:'],
      connectSrc: [
        "'self'",
        process.env.API_URL || 'http://localhost:3000',
        process.env.WS_URL || 'ws://localhost:3000',
      ],
      frameSrc: ["'none'"],
      objectSrc: ["'none'"],
      mediaSrc: ["'self'", 'blob:', 'data:'],
      workerSrc: ["'self'", 'blob:'],
      upgradeInsecureRequests: process.env.NODE_ENV === 'production' ? [] : null,
    },
  },

  // HTTP Strict Transport Security - Forces HTTPS
  hsts: {
    maxAge: 31536000, // 1 year
    includeSubDomains: true,
    preload: true,
  },

  // X-Frame-Options - Prevents Clickjacking
  frameguard: {
    action: 'deny',
  },

  // X-Content-Type-Options - Prevents MIME sniffing
  noSniff: true,

  // X-XSS-Protection - Legacy XSS protection
  xssFilter: true,

  // Referrer Policy - Controls referrer information
  referrerPolicy: {
    policy: 'strict-origin-when-cross-origin',
  },

  // X-DNS-Prefetch-Control - Controls DNS prefetching
  dnsPrefetchControl: {
    allow: false,
  },

  // X-Download-Options - Prevents IE from executing downloads
  ieNoOpen: true,

  // Hide X-Powered-By header
  hidePoweredBy: true,

  // X-Permitted-Cross-Domain-Policies - Controls cross-domain policies
  permittedCrossDomainPolicies: {
    permittedPolicies: 'none',
  },
});

/**
 * Advanced Rate Limiting Configuration
 */
export const generalRateLimit = rateLimit({
  windowMs: 15 * 60 * 1000, // 15 minutes
  max: 1000, // Limit each IP to 1000 requests per window
  message: 'Too many requests from this IP, please try again later.',
  standardHeaders: true,
  legacyHeaders: false,
  skip: (req) => {
    // Skip rate limiting for health checks
    return req.path === '/health' || req.path === '/metrics';
  },
  handler: (req, res) => {
    logger.warn('Rate limit exceeded', {
      ip: req.ip,
      path: req.path,
      userAgent: req.headers['user-agent'],
    });
    res.status(429).json({
      error: 'Too many requests',
      message: 'Please try again later',
      retryAfter: res.getHeader('Retry-After'),
    });
  },
});

/**
 * Strict Rate Limiting for Authentication Endpoints
 */
export const authRateLimit = rateLimit({
  windowMs: 15 * 60 * 1000, // 15 minutes
  max: 10, // Limit each IP to 10 auth requests per window
  skipSuccessfulRequests: true, // Don't count successful auth attempts
  message: 'Too many authentication attempts, please try again later.',
  handler: (req, res) => {
    logger.error('Auth rate limit exceeded', {
      ip: req.ip,
      path: req.path,
      userAgent: req.headers['user-agent'],
    });
    res.status(429).json({
      error: 'Too many authentication attempts',
      message: 'Account temporarily locked. Please try again later.',
      retryAfter: res.getHeader('Retry-After'),
    });
  },
});

/**
 * IP Whitelist Middleware
 * Restricts access to sensitive endpoints
 */
export const ipWhitelist = (allowedIPs: string[]) => {
  return (req: Request, res: Response, next: NextFunction) => {
    const clientIP = req.ip || req.connection.remoteAddress || '';

    // Allow requests from whitelisted IPs
    if (allowedIPs.includes(clientIP) || allowedIPs.includes('*')) {
      return next();
    }

    // Check for X-Forwarded-For header (load balancer)
    const forwardedFor = req.headers['x-forwarded-for'];
    if (forwardedFor) {
      const ips = Array.isArray(forwardedFor)
        ? forwardedFor[0].split(',')
        : forwardedFor.split(',');

      const realIP = ips[0].trim();
      if (allowedIPs.includes(realIP)) {
        return next();
      }
    }

    logger.warn('IP whitelist violation', {
      ip: clientIP,
      path: req.path,
      forwardedFor,
    });

    res.status(403).json({
      error: 'Access denied',
      message: 'Your IP address is not authorized to access this endpoint',
    });
  };
};

/**
 * Request Signing Middleware
 * Validates HMAC signatures for API requests
 */
export interface RequestSignatureConfig {
  secret: string;
  headerName?: string;
  algorithm?: string;
}

export const requestSignature = (config: RequestSignatureConfig) => {
  const {
    secret,
    headerName = 'X-Signature',
    algorithm = 'sha256',
  } = config;

  return (req: Request, res: Response, next: NextFunction) => {
    const signature = req.headers[headerName.toLowerCase()] as string;

    if (!signature) {
      logger.warn('Missing request signature', {
        ip: req.ip,
        path: req.path,
      });
      return res.status(401).json({
        error: 'Missing signature',
        message: 'Request signature is required',
      });
    }

    // Generate expected signature
    const payload = JSON.stringify({
      method: req.method,
      path: req.path,
      body: req.body,
      timestamp: req.headers['x-timestamp'],
    });

    const expectedSignature = crypto
      .createHmac(algorithm, secret)
      .update(payload)
      .digest('hex');

    // Constant-time comparison to prevent timing attacks
    const isValid = crypto.timingSafeEqual(
      Buffer.from(signature),
      Buffer.from(expectedSignature)
    );

    if (!isValid) {
      logger.error('Invalid request signature', {
        ip: req.ip,
        path: req.path,
        providedSignature: signature.substring(0, 10) + '...',
      });
      return res.status(401).json({
        error: 'Invalid signature',
        message: 'Request signature verification failed',
      });
    }

    next();
  };
};

/**
 * API Key Rotation Checker
 * Validates API keys and checks for rotation requirements
 */
export interface APIKeyRotationConfig {
  rotationDays: number;
  warningDays: number;
}

export const apiKeyRotation = (config: APIKeyRotationConfig) => {
  return (req: Request, res: Response, next: NextFunction) => {
    const apiKey = req.headers['x-api-key'] as string;

    if (!apiKey) {
      return next();
    }

    // In production, fetch key metadata from database
    // For now, we'll extract the timestamp from the key if it's encoded
    try {
      // Example: API key format could be: {prefix}_{timestamp}_{random}
      const parts = apiKey.split('_');
      if (parts.length >= 3) {
        const keyTimestamp = parseInt(parts[1], 10);
        const keyAge = Date.now() - keyTimestamp;
        const daysOld = keyAge / (1000 * 60 * 60 * 24);

        if (daysOld > config.rotationDays) {
          logger.warn('Expired API key used', {
            ip: req.ip,
            keyAge: daysOld,
          });
          return res.status(401).json({
            error: 'API key expired',
            message: 'Please rotate your API key',
          });
        }

        if (daysOld > config.warningDays) {
          logger.info('API key approaching expiration', {
            ip: req.ip,
            keyAge: daysOld,
          });
          res.setHeader('X-API-Key-Warning', `Key expires in ${config.rotationDays - daysOld} days`);
        }
      }
    } catch (error) {
      logger.error('API key validation error', { error });
    }

    next();
  };
};

/**
 * Strict CORS Configuration
 * Validates origin and implements strict CORS policies
 */
export const strictCorsOptions = {
  origin: (origin: string | undefined, callback: (err: Error | null, allow?: boolean) => void) => {
    const allowedOrigins = process.env.ALLOWED_ORIGINS?.split(',') || [
      'http://localhost:3000',
      'http://localhost:3001',
      'http://localhost:4200',
      'http://localhost:4100',
    ];

    // Allow requests with no origin (mobile apps, curl, etc.)
    // Allow Chrome extensions (chrome-extension://)
    if (origin && origin.startsWith('chrome-extension://')) {
      return callback(null, true);
    }
    if (!origin) {
      return callback(null, true);
    }

    if (allowedOrigins.includes(origin) || allowedOrigins.includes('*')) {
      callback(null, true);
    } else {
      logger.warn('CORS violation', { origin });
      callback(new Error('Not allowed by CORS'));
    }
  },
  credentials: true,
  optionsSuccessStatus: 200,
  methods: ['GET', 'POST', 'PUT', 'DELETE', 'PATCH', 'OPTIONS'],
  allowedHeaders: [
    'Content-Type',
    'Authorization',
    'X-Requested-With',
    'X-API-Key',
    'X-Signature',
    'X-Timestamp',
  ],
  exposedHeaders: [
    'X-RateLimit-Limit',
    'X-RateLimit-Remaining',
    'X-RateLimit-Reset',
    'X-API-Key-Warning',
  ],
  maxAge: 86400, // 24 hours
};

/**
 * SQL Injection Protection Middleware
 * Detects and blocks common SQL injection patterns
 */
export const sqlInjectionProtection = (req: Request, res: Response, next: NextFunction) => {
  const sqlPatterns = [
    /(\%27)|(\')|(\-\-)|(\%23)|(#)/i, // SQL meta-characters
    /((\%3D)|(=))[^\n]*((\%27)|(\')|(\-\-)|(\%3B)|(;))/i, // SQL operators
    /\w*((\%27)|(\'))((\%6F)|o|(\%4F))((\%72)|r|(\%52))/i, // SQL 'or'
    /(\%27)|(\')union/i, // UNION
    /exec(\s|\+)+(s|x)p\w+/i, // Stored procedures
  ];

  const checkValue = (value: any): boolean => {
    if (typeof value === 'string') {
      return sqlPatterns.some(pattern => pattern.test(value));
    }
    if (typeof value === 'object' && value !== null) {
      return Object.values(value).some(checkValue);
    }
    return false;
  };

  // Check query parameters
  if (checkValue(req.query)) {
    logger.error('SQL injection attempt detected in query', {
      ip: req.ip,
      path: req.path,
      query: req.query,
    });
    return res.status(400).json({
      error: 'Bad request',
      message: 'Invalid query parameters',
    });
  }

  // Check body
  if (checkValue(req.body)) {
    logger.error('SQL injection attempt detected in body', {
      ip: req.ip,
      path: req.path,
    });
    return res.status(400).json({
      error: 'Bad request',
      message: 'Invalid request body',
    });
  }

  next();
};

/**
 * XSS Protection Middleware
 * Detects and sanitizes XSS attempts
 */
export const xssProtection = (req: Request, res: Response, next: NextFunction) => {
  const xssPatterns = [
    /<script\b[^<]*(?:(?!<\/script>)<[^<]*)*<\/script>/gi,
    /javascript:/gi,
    /on\w+\s*=/gi, // Event handlers
    /<iframe/gi,
    /<object/gi,
    /<embed/gi,
  ];

  const checkValue = (value: any): boolean => {
    if (typeof value === 'string') {
      return xssPatterns.some(pattern => pattern.test(value));
    }
    if (typeof value === 'object' && value !== null) {
      return Object.values(value).some(checkValue);
    }
    return false;
  };

  if (checkValue(req.query) || checkValue(req.body)) {
    logger.error('XSS attempt detected', {
      ip: req.ip,
      path: req.path,
    });
    return res.status(400).json({
      error: 'Bad request',
      message: 'Invalid input detected',
    });
  }

  next();
};

/**
 * Security Headers Middleware
 * Adds additional custom security headers
 */
export const securityHeaders = (req: Request, res: Response, next: NextFunction) => {
  // Add custom security headers
  res.setHeader('X-Request-ID', crypto.randomUUID());
  res.setHeader('X-Security-Scan', 'enabled');
  res.setHeader('Permissions-Policy', 'geolocation=(), microphone=(), camera=()');

  // Remove sensitive headers
  res.removeHeader('X-Powered-By');
  res.removeHeader('Server');

  next();
};

/**
 * Complete Security Middleware Stack
 * Combines all security measures
 */
export const securityMiddleware = [
  helmetConfig,
  securityHeaders,
  sqlInjectionProtection,
  xssProtection,
  generalRateLimit,
];

export default {
  helmetConfig,
  generalRateLimit,
  authRateLimit,
  ipWhitelist,
  requestSignature,
  apiKeyRotation,
  strictCorsOptions,
  sqlInjectionProtection,
  xssProtection,
  securityHeaders,
  securityMiddleware,
};
