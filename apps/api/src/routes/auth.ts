/**
 * Authentication Routes
 * User registration, login, OAuth, and session management
 */

import { Router, Request, Response } from 'express';
import bcrypt from 'bcryptjs';
import jwt from 'jsonwebtoken';
import { PrismaClient } from '@prisma/client';
import Redis from 'ioredis';
import { v4 as uuidv4 } from 'uuid';
import speakeasy from 'speakeasy';
import QRCode from 'qrcode';
import { body, validationResult } from 'express-validator';
import rateLimit from 'express-rate-limit';
import winston from 'winston';
import crypto from 'crypto';
import { authMiddleware } from '../middleware/auth';
import { getRequiredEnv } from '../config/env';
import { setAccessTokenCookie, setRefreshTokenCookie, setUserInfoCookie, clearAuthCookies } from '../utils/cookies';

const router: Router = Router();

// Whitelist for development/internal IPs (skip rate limiting)
const WHITELISTED_IPS = [
  '127.0.0.1',
  '::1',
  '::ffff:127.0.0.1',
  'localhost',
  // Docker internal network ranges
  '172.16.0.0/12',
  '172.17.0.0/16',
  '172.18.0.0/16',
  '172.19.0.0/16',
  '172.20.0.0/16',
  '172.21.0.0/16',
  '172.30.0.0/16',
  '172.31.0.0/16',
  '192.168.0.0/16',
  '10.0.0.0/8',
  ...(process.env.WHITELISTED_IPS?.split(',') || []),
];

// Check if IP is whitelisted (supports CIDR ranges)
const isWhitelisted = (ip: string): boolean => {
  // Clean up IP (handle IPv6-mapped IPv4)
  const cleanIP = ip.replace('::ffff:', '');

  for (const whitelist of WHITELISTED_IPS) {
    if (!whitelist) continue;

    // Exact match
    if (cleanIP === whitelist || ip === whitelist) {
      return true;
    }

    // CIDR range check
    if (whitelist.includes('/')) {
      const [subnet, bits] = whitelist.split('/');
      const subnetParts = subnet.split('.').map(Number);
      const ipParts = cleanIP.split('.').map(Number);

      if (subnetParts.length === 4 && ipParts.length === 4) {
        const mask = ~((1 << (32 - parseInt(bits))) - 1);
        const subnetNum = (subnetParts[0] << 24) | (subnetParts[1] << 16) | (subnetParts[2] << 8) | subnetParts[3];
        const ipNum = (ipParts[0] << 24) | (ipParts[1] << 16) | (ipParts[2] << 8) | ipParts[3];

        if ((subnetNum & mask) === (ipNum & mask)) {
          return true;
        }
      }
    }
  }

  // Development mode: skip rate limiting
  if (process.env.NODE_ENV === 'development') {
    return true;
  }

  return false;
};

// Get client IP from request
const getClientIP = (req: Request): string => {
  const forwarded = req.headers['x-forwarded-for'];
  const ip = forwarded
    ? (typeof forwarded === 'string' ? forwarded.split(',')[0] : forwarded[0])
    : req.socket.remoteAddress || 'unknown';
  return ip.trim();
};

// Stricter rate limiting for authentication endpoints
const authLimiter = rateLimit({
  windowMs: 15 * 60 * 1000, // 15 minutes
  max: 5, // 5 requests per window
  message: 'Too many authentication attempts, please try again later',
  standardHeaders: true,
  legacyHeaders: false,
  skip: (req: Request) => isWhitelisted(getClientIP(req)),
});

const passwordResetLimiter = rateLimit({
  windowMs: 60 * 60 * 1000, // 1 hour
  max: 3, // 3 requests per hour
  message: 'Too many password reset attempts, please try again later',
  standardHeaders: true,
  legacyHeaders: false,
  skip: (req: Request) => isWhitelisted(getClientIP(req)),
});
const prisma = new PrismaClient();
const redis = new Redis({
  host: process.env.REDIS_HOST || 'localhost',
  port: parseInt(process.env.REDIS_PORT || '6379'),
  password: process.env.REDIS_PASSWORD,
});

const logger = winston.createLogger({
  level: process.env.LOG_LEVEL || 'info',
  defaultMeta: { service: 'auth-routes' },
  transports: [new winston.transports.Console()],
});

// Token generation
const generateTokens = async (user: any, sessionId: string) => {
  const JWT_SECRET = process.env.JWT_SECRET || '';
  const JWT_REFRESH_SECRET = process.env.JWT_REFRESH_SECRET || '';

  const accessToken = jwt.sign(
    {
      id: user.id,
      email: user.email,
      organizationId: user.organizationId,
      role: user.role,
      sessionId,
    },
    JWT_SECRET,
    { expiresIn: process.env.JWT_EXPIRES_IN || '15m' } as jwt.SignOptions
  );

  const refreshToken = jwt.sign(
    { id: user.id, sessionId },
    JWT_REFRESH_SECRET,
    { expiresIn: process.env.JWT_REFRESH_EXPIRES_IN || '7d' } as jwt.SignOptions
  );

  return { accessToken, refreshToken };
};

/**
 * POST /api/auth/register
 * Register a new user
 */
router.post(
  '/register',
  authLimiter,
  [
    body('email').isEmail().normalizeEmail(),
    body('password').isLength({ min: 8 }).matches(/^(?=.*[a-z])(?=.*[A-Z])(?=.*\d)(?=.*[@$!%*?&])/),
    body('firstName').notEmpty().trim(),
    body('lastName').notEmpty().trim(),
    body('organizationName').optional().trim(),
  ],
  async (req: Request, res: Response): Promise<void> => {
    try {
      const errors = validationResult(req);
      if (!errors.isEmpty()) {
        res.status(400).json({ errors: errors.array() });
        return;
      }

      const { email, password, firstName, lastName, organizationName } = req.body;

      // Check if user exists
      const existingUser = await prisma.user.findUnique({
        where: { email },
      });

      if (existingUser) {
        res.status(409).json({ error: 'User already exists' });
        return;
      }

      // Hash password
      const passwordHash = await bcrypt.hash(password, 12);

      // Create organization if provided
      let organizationId: string | null = null;
      if (organizationName) {
        const slug = organizationName
          .toLowerCase()
          .replace(/[^a-z0-9]+/g, '-')
          .replace(/^-|-$/g, '');

        const organization = await prisma.organization.create({
          data: {
            name: organizationName,
            slug: `${slug}-${uuidv4().slice(0, 8)}`,
            subscriptionTier: 'free',
            subscriptionStatus: 'active',
          },
        });
        organizationId = organization.id;
      }

      // Create user
      const user = await prisma.user.create({
        data: {
          email,
          passwordHash,
          firstName,
          lastName,
          organizationId,
          role: organizationId ? 'admin' : 'user',
        },
      });

      // Generate verification token
      const verificationToken = crypto.randomBytes(32).toString('hex');
      await redis.set(
        `verify:${verificationToken}`,
        user.id,
        'EX',
        86400 // 24 hours
      );

      // Send verification email (implement EmailService)
      // await emailService.sendVerificationEmail(email, verificationToken);

      // Create session
      const sessionId = uuidv4();
      const refreshToken = uuidv4();
      const session = await prisma.session.create({
        data: {
          id: sessionId,
          userId: user.id,
          refreshToken,
          deviceInfo: req.headers['user-agent'] ? { userAgent: req.headers['user-agent'] } : {},
          ipAddress: req.ip || null,
          expiresAt: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000), // 7 days
        },
      });

      // Generate tokens
      const tokens = await generateTokens(user, session.id);

      // Set secure httpOnly cookies
      setAccessTokenCookie(res, tokens.accessToken);
      setRefreshTokenCookie(res, session.refreshToken);
      setUserInfoCookie(res, user);

      // Log registration
      await prisma.auditLog.create({
        data: {
          organizationId,
          userId: user.id,
          action: 'user_registered',
          resourceType: 'user',
          resourceId: user.id,
          ipAddress: req.ip || null,
          userAgent: req.headers['user-agent'] || null,
        },
      });

      res.status(201).json({
        message: 'Registration successful. Please verify your email.',
        user: {
          id: user.id,
          email: user.email,
          firstName: user.firstName,
          lastName: user.lastName,
          organizationId: user.organizationId,
          role: user.role,
        },
      });
    } catch (error) {
      logger.error('Registration error:', error);
      res.status(500).json({ error: 'Registration failed' });
    }
  }
);

/**
 * POST /api/auth/login
 * User login
 */
router.post(
  '/login',
  authLimiter,
  [
    body('email').isEmail().normalizeEmail(),
    body('password').notEmpty(),
  ],
  async (req: Request, res: Response): Promise<void> => {
    try {
      const errors = validationResult(req);
      if (!errors.isEmpty()) {
        res.status(400).json({ errors: errors.array() });
        return;
      }

      const { email, password } = req.body;

      // Find user
      const user = await prisma.user.findUnique({
        where: { email },
        include: { organization: true },
      });

      if (!user || !user.passwordHash) {
        res.status(401).json({ error: 'Invalid credentials' });
        return;
      }

      // Verify password
      const isValidPassword = await bcrypt.compare(password, user.passwordHash);
      if (!isValidPassword) {
        res.status(401).json({ error: 'Invalid credentials' });
        return;
      }

      // Check if account is active
      if (!user.isActive) {
        res.status(403).json({ error: 'Account is disabled' });
        return;
      }

      // Check if email is verified
      if (!user.emailVerified) {
        res.status(403).json({ error: 'Please verify your email first' });
        return;
      }

      // Check if MFA is enabled
      if (user.mfaEnabled) {
        // Generate MFA session token
        const mfaToken = crypto.randomBytes(32).toString('hex');
        await redis.set(
          `mfa:${mfaToken}`,
          user.id,
          'EX',
          300 // 5 minutes
        );

        res.status(200).json({
          message: 'MFA required',
          mfaToken,
          mfaRequired: true,
        });
        return;
      }

      // Create session
      const sessionId = uuidv4();
      const refreshToken = uuidv4();
      const session = await prisma.session.create({
        data: {
          id: sessionId,
          userId: user.id,
          refreshToken,
          deviceInfo: req.headers['user-agent'] ? { userAgent: req.headers['user-agent'] } : {},
          ipAddress: req.ip || null,
          expiresAt: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000),
        },
      });

      // Generate tokens
      const tokens = await generateTokens(user, session.id);

      // Set secure httpOnly cookies
      setAccessTokenCookie(res, tokens.accessToken);
      setRefreshTokenCookie(res, session.refreshToken);
      setUserInfoCookie(res, user);

      // Update last login
      await prisma.user.update({
        where: { id: user.id },
        data: { lastLoginAt: new Date() },
      });

      // Log login
      await prisma.auditLog.create({
        data: {
          organizationId: user.organizationId,
          userId: user.id,
          action: 'user_login',
          resourceType: 'session',
          resourceId: session.id,
          ipAddress: req.ip || null,
          userAgent: req.headers['user-agent'] || null,
        },
      });

      res.json({
        message: 'Login successful',
        accessToken: tokens.accessToken, // For Chrome extension compatibility
        user: {
          id: user.id,
          email: user.email,
          firstName: user.firstName,
          lastName: user.lastName,
          organizationId: user.organizationId,
          organization: user.organization,
          role: user.role,
        },
      });
    } catch (error) {
      logger.error('Login error:', error);
      res.status(500).json({ error: 'Login failed' });
    }
  }
);

/**
 * POST /api/auth/logout
 * User logout
 */
router.post('/logout', authMiddleware, async (req: Request, res: Response): Promise<void> => {
  try {
    // Get token from cookie or header
    const token = req.cookies.access_token || req.headers.authorization?.replace('Bearer ', '');

    if (token) {
      // Add token to blacklist
      await redis.set(
        `blacklist:${token}`,
        '1',
        'EX',
        900 // 15 minutes (match JWT expiry)
      );
    }

    // Get refresh token from cookie
    const refreshToken = req.cookies.refresh_token || req.body.refreshToken;

    if (refreshToken) {
      // Delete session by refresh token
      const session = await prisma.session.findUnique({
        where: { refreshToken },
      });

      if (session) {
        await prisma.session.delete({
          where: { id: session.id },
        });
      }
    }

    // Clear auth cookies
    clearAuthCookies(res);

    // Log logout
    if (req.user) {
      await prisma.auditLog.create({
        data: {
          organizationId: req.user.organizationId,
          userId: req.user.id,
          action: 'user_logout',
          ipAddress: req.ip || null,
          userAgent: req.headers['user-agent'] || null,
        },
      });
    }

    res.json({ message: 'Logout successful' });
  } catch (error) {
    logger.error('Logout error:', error);
    res.status(500).json({ error: 'Logout failed' });
  }
});

/**
 * POST /api/auth/refresh
 * Refresh access token
 */
router.post('/refresh', async (req: Request, res: Response): Promise<void> => {
  try {
    // Get refresh token from cookie or body (support both for migration)
    const refreshToken = req.cookies.refresh_token || req.body.refreshToken;

    if (!refreshToken) {
      res.status(400).json({ error: 'Refresh token required' });
      return;
    }

    // Find session
    const session = await prisma.session.findUnique({
      where: { refreshToken },
      include: { user: true },
    });

    if (!session) {
      res.status(401).json({ error: 'Invalid refresh token' });
      return;
    }

    if (session.expiresAt < new Date()) {
      await prisma.session.delete({ where: { id: session.id } });
      res.status(401).json({ error: 'Refresh token expired' });
      return;
    }

    // Generate new access token
    const JWT_SECRET = process.env.JWT_SECRET || '';
    const accessToken = jwt.sign(
      {
        id: session.user.id,
        email: session.user.email,
        organizationId: session.user.organizationId,
        role: session.user.role,
        sessionId: session.id,
      },
      JWT_SECRET,
      { expiresIn: process.env.JWT_EXPIRES_IN || '15m' } as jwt.SignOptions
    );

    // Set new access token cookie
    setAccessTokenCookie(res, accessToken);

    res.json({
      message: 'Token refreshed successfully',
      accessToken, // Keep for backward compatibility
    });
  } catch (error) {
    logger.error('Token refresh error:', error);
    res.status(500).json({ error: 'Token refresh failed' });
  }
});

/**
 * POST /api/auth/verify-email
 * Verify email address
 */
router.post('/verify-email', async (req: Request, res: Response): Promise<void> => {
  try {
    const { token } = req.body;

    if (!token) {
      res.status(400).json({ error: 'Verification token required' });
      return;
    }

    // Get user ID from token
    const userId = await redis.get(`verify:${token}`);
    if (!userId) {
      res.status(400).json({ error: 'Invalid or expired token' });
      return;
    }

    // Update user
    await prisma.user.update({
      where: { id: userId },
      data: { emailVerified: true },
    });

    // Delete token
    await redis.del(`verify:${token}`);

    res.json({ message: 'Email verified successfully' });
  } catch (error) {
    logger.error('Email verification error:', error);
    res.status(500).json({ error: 'Email verification failed' });
  }
});

/**
 * POST /api/auth/resend-verification
 * Resend email verification
 */
router.post(
  '/resend-verification',
  authLimiter,
  [body('email').isEmail().normalizeEmail()],
  async (req: Request, res: Response): Promise<void> => {
    try {
      const errors = validationResult(req);
      if (!errors.isEmpty()) {
        res.status(400).json({ errors: errors.array() });
        return;
      }

      const { email } = req.body;

      // Find user
      const user = await prisma.user.findUnique({
        where: { email },
      });

      // Don't reveal if user exists for security
      if (!user) {
        res.json({ message: 'If an account exists with that email, a verification link has been sent.' });
        return;
      }

      // Check if already verified
      if (user.emailVerified) {
        res.status(400).json({ error: 'Email already verified' });
        return;
      }

      // Check rate limit for this specific email (prevent abuse)
      const rateLimitKey = `resend-verify:${email}`;
      const lastSent = await redis.get(rateLimitKey);

      if (lastSent) {
        const timeRemaining = 60 - Math.floor((Date.now() - parseInt(lastSent)) / 1000);
        res.status(429).json({
          error: 'Please wait before requesting another verification email',
          retryAfter: timeRemaining > 0 ? timeRemaining : 0
        });
        return;
      }

      // Generate new verification token
      const verificationToken = crypto.randomBytes(32).toString('hex');
      await redis.set(
        `verify:${verificationToken}`,
        user.id,
        'EX',
        86400 // 24 hours
      );

      // Set rate limit (60 seconds)
      await redis.set(rateLimitKey, Date.now().toString(), 'EX', 60);

      // Send verification email
      const EmailService = (await import('../services/email')).EmailService;
      const emailService = new EmailService();

      const verificationUrl = `${process.env.FRONTEND_URL || 'http://localhost:3000'}/verify-email?token=${verificationToken}`;

      await emailService.sendEmail(
        {
          subject: 'Verify Your Email - OpenMeet',
          htmlContent: `
            <h1>Welcome to OpenMeet!</h1>
            <p>Hello ${user.firstName},</p>
            <p>Thank you for signing up. Please verify your email address by clicking the link below:</p>
            <p><a href="${verificationUrl}" style="display: inline-block; padding: 12px 24px; background-color: #7a5af8; color: white; text-decoration: none; border-radius: 6px;">Verify Email</a></p>
            <p>Or copy and paste this link into your browser:</p>
            <p>${verificationUrl}</p>
            <p>This link will expire in 24 hours.</p>
            <p>If you didn't create this account, please ignore this email.</p>
          `,
          textContent: `Hello ${user.firstName},\n\nThank you for signing up for OpenMeet. Please verify your email address by visiting this link:\n${verificationUrl}\n\nThis link will expire in 24 hours.\n\nIf you didn't create this account, please ignore this email.`,
        },
        {
          to: user.email,
        }
      );

      // Log resend action
      await prisma.auditLog.create({
        data: {
          organizationId: user.organizationId,
          userId: user.id,
          action: 'verification_email_resent',
          resourceType: 'user',
          resourceId: user.id,
          ipAddress: req.ip || null,
          userAgent: req.headers['user-agent'] || null,
        },
      });

      res.json({ message: 'Verification email sent successfully' });
    } catch (error) {
      logger.error('Resend verification error:', error);
      res.status(500).json({ error: 'Failed to send verification email' });
    }
  }
);

/**
 * POST /api/auth/forgot-password
 * Request password reset
 */
router.post(
  '/forgot-password',
  passwordResetLimiter,
  [body('email').isEmail().normalizeEmail()],
  async (req: Request, res: Response): Promise<void> => {
    try {
      const errors = validationResult(req);
      if (!errors.isEmpty()) {
        res.status(400).json({ errors: errors.array() });
        return;
      }

      const { email } = req.body;

      // Find user (don't reveal if email doesn't exist for security)
      const user = await prisma.user.findUnique({
        where: { email },
      });

      // Always return success to prevent email enumeration
      if (!user) {
        res.json({ message: 'If an account exists with that email, a password reset link has been sent.' });
        return;
      }

      // Generate password reset token
      const resetToken = crypto.randomBytes(32).toString('hex');
      const resetTokenHash = crypto.createHash('sha256').update(resetToken).digest('hex');

      // Store hashed token in Redis (expires in 1 hour)
      await redis.set(
        `password-reset:${resetTokenHash}`,
        user.id,
        'EX',
        3600
      );

      // Send password reset email
      const EmailService = (await import('../services/email')).EmailService;
      const emailService = new EmailService();

      const resetUrl = `${process.env.FRONTEND_URL || 'http://localhost:3000'}/reset-password?token=${resetToken}`;

      await emailService.sendEmail(
        {
          subject: 'Password Reset Request',
          htmlContent: `
            <h1>Password Reset Request</h1>
            <p>Hello ${user.firstName},</p>
            <p>You requested to reset your password. Click the link below to reset it:</p>
            <p><a href="${resetUrl}">Reset Password</a></p>
            <p>This link will expire in 1 hour.</p>
            <p>If you didn't request this, please ignore this email.</p>
          `,
          textContent: `Hello ${user.firstName},\n\nYou requested to reset your password. Visit this link to reset it:\n${resetUrl}\n\nThis link will expire in 1 hour.\n\nIf you didn't request this, please ignore this email.`,
        },
        {
          to: user.email,
        }
      );

      // Log password reset request
      await prisma.auditLog.create({
        data: {
          organizationId: user.organizationId,
          userId: user.id,
          action: 'password_reset_requested',
          resourceType: 'user',
          resourceId: user.id,
          ipAddress: req.ip || null,
          userAgent: req.headers['user-agent'] || null,
        },
      });

      res.json({ message: 'If an account exists with that email, a password reset link has been sent.' });
    } catch (error) {
      logger.error('Forgot password error:', error);
      res.status(500).json({ error: 'Password reset request failed' });
    }
  }
);

/**
 * POST /api/auth/reset-password
 * Reset password with token
 */
router.post(
  '/reset-password',
  passwordResetLimiter,
  [
    body('token').notEmpty(),
    body('password').isLength({ min: 8 }).matches(/^(?=.*[a-z])(?=.*\d)(?=.*[@$!%*?&])/),
  ],
  async (req: Request, res: Response): Promise<void> => {
    try {
      const errors = validationResult(req);
      if (!errors.isEmpty()) {
        res.status(400).json({ errors: errors.array() });
        return;
      }

      const { token, password } = req.body;

      // Hash the token to match what's stored
      const tokenHash = crypto.createHash('sha256').update(token).digest('hex');

      // Get user ID from Redis
      const userId = await redis.get(`password-reset:${tokenHash}`);
      if (!userId) {
        res.status(400).json({ error: 'Invalid or expired reset token' });
        return;
      }

      // Get user
      const user = await prisma.user.findUnique({
        where: { id: userId },
      });

      if (!user) {
        res.status(404).json({ error: 'User not found' });
        return;
      }

      // Hash new password
      const passwordHash = await bcrypt.hash(password, 12);

      // Update user password
      await prisma.user.update({
        where: { id: userId },
        data: { passwordHash },
      });

      // Delete reset token
      await redis.del(`password-reset:${tokenHash}`);

      // Invalidate all existing sessions
      await prisma.session.deleteMany({
        where: { userId },
      });

      // Log password reset
      await prisma.auditLog.create({
        data: {
          organizationId: user.organizationId,
          userId: user.id,
          action: 'password_reset',
          resourceType: 'user',
          resourceId: user.id,
          ipAddress: req.ip || null,
          userAgent: req.headers['user-agent'] || null,
        },
      });

      // Send confirmation email
      const EmailService = (await import('../services/email')).EmailService;
      const emailService = new EmailService();

      await emailService.sendEmail(
        {
          subject: 'Password Reset Successful',
          htmlContent: `
            <h1>Password Reset Successful</h1>
            <p>Hello ${user.firstName},</p>
            <p>Your password has been successfully reset.</p>
            <p>If you didn't make this change, please contact support immediately.</p>
          `,
          textContent: `Hello ${user.firstName},\n\nYour password has been successfully reset.\n\nIf you didn't make this change, please contact support immediately.`,
        },
        {
          to: user.email,
        }
      );

      res.json({ message: 'Password reset successful. Please login with your new password.' });
    } catch (error) {
      logger.error('Reset password error:', error);
      res.status(500).json({ error: 'Password reset failed' });
    }
  }
);

/**
 * POST /api/auth/setup-mfa
 * Setup Multi-Factor Authentication
 */
router.post('/setup-mfa', authMiddleware, async (req: Request, res: Response): Promise<void> => {
  try {
    if (!req.user) {
      res.status(401).json({ error: 'Not authenticated' });
      return;
    }

    // Generate secret
    const secret = speakeasy.generateSecret({
      name: `OpenMeet (${req.user.email})`,
      issuer: 'OpenMeet',
    });

    // Store secret temporarily
    await redis.set(
      `mfa:setup:${req.user.id}`,
      secret.base32,
      'EX',
      600 // 10 minutes
    );

    // Generate QR code
    const qrCode = await QRCode.toDataURL(secret.otpauth_url!);

    res.json({
      secret: secret.base32,
      qrCode,
    });
  } catch (error) {
    logger.error('MFA setup error:', error);
    res.status(500).json({ error: 'MFA setup failed' });
  }
});

/**
 * POST /api/auth/complete-mfa
 * Complete MFA setup by verifying TOTP code
 */
router.post('/complete-mfa', authMiddleware, async (req: Request, res: Response): Promise<void> => {
  try {
    if (!req.user) {
      res.status(401).json({ error: 'Not authenticated' });
      return;
    }

    const { code } = req.body;

    if (!code) {
      res.status(400).json({ error: 'Verification code required' });
      return;
    }

    // Get secret from Redis
    const secret = await redis.get(`mfa:setup:${req.user.id}`);
    if (!secret) {
      res.status(400).json({ error: 'MFA setup session expired. Please start over.' });
      return;
    }

    // Verify TOTP code
    const verified = speakeasy.totp.verify({
      secret,
      encoding: 'base32',
      token: code,
      window: 2,
    });

    if (!verified) {
      res.status(401).json({ error: 'Invalid verification code' });
      return;
    }

    // Generate backup codes (10 codes)
    const backupCodes = Array.from({ length: 10 }, () =>
      crypto.randomBytes(4).toString('hex').toUpperCase()
    );

    // Hash backup codes for storage
    const hashedBackupCodes = await Promise.all(
      backupCodes.map(code => bcrypt.hash(code, 10))
    );

    // Enable MFA for user
    await prisma.user.update({
      where: { id: req.user.id },
      data: {
        mfaEnabled: true,
        mfaSecret: secret,
        mfaBackupCodes: hashedBackupCodes,
      },
    });

    // Delete setup session
    await redis.del(`mfa:setup:${req.user.id}`);

    // Log MFA enabled
    await prisma.auditLog.create({
      data: {
        organizationId: req.user.organizationId,
        userId: req.user.id,
        action: 'mfa_enabled',
        resourceType: 'user',
        resourceId: req.user.id,
        ipAddress: req.ip || null,
        userAgent: req.headers['user-agent'] || null,
      },
    });

    res.json({
      message: 'MFA enabled successfully',
      backupCodes, // Return unhashed codes to user (only time they'll see them)
    });
  } catch (error) {
    logger.error('Complete MFA error:', error);
    res.status(500).json({ error: 'Failed to complete MFA setup' });
  }
});

/**
 * POST /api/auth/disable-mfa
 * Disable Multi-Factor Authentication
 */
router.post('/disable-mfa', authMiddleware, async (req: Request, res: Response): Promise<void> => {
  try {
    if (!req.user) {
      res.status(401).json({ error: 'Not authenticated' });
      return;
    }

    const { password } = req.body;

    if (!password) {
      res.status(400).json({ error: 'Password required' });
      return;
    }

    // Get user with password hash
    const user = await prisma.user.findUnique({
      where: { id: req.user.id },
    });

    if (!user) {
      res.status(404).json({ error: 'User not found' });
      return;
    }

    // Verify password (if user has password)
    if (user.passwordHash) {
      const isValidPassword = await bcrypt.compare(password, user.passwordHash);
      if (!isValidPassword) {
        res.status(401).json({ error: 'Invalid password' });
        return;
      }
    }

    // Disable MFA
    await prisma.user.update({
      where: { id: req.user.id },
      data: {
        mfaEnabled: false,
        mfaSecret: null,
        mfaBackupCodes: [],
      },
    });

    // Log MFA disabled
    await prisma.auditLog.create({
      data: {
        organizationId: req.user.organizationId,
        userId: req.user.id,
        action: 'mfa_disabled',
        resourceType: 'user',
        resourceId: req.user.id,
        ipAddress: req.ip || null,
        userAgent: req.headers['user-agent'] || null,
      },
    });

    res.json({ message: 'MFA disabled successfully' });
  } catch (error) {
    logger.error('Disable MFA error:', error);
    res.status(500).json({ error: 'Failed to disable MFA' });
  }
});

/**
 * POST /api/auth/verify-mfa
 * Verify MFA token
 */
router.post('/verify-mfa', async (req: Request, res: Response): Promise<void> => {
  try {
    const { mfaToken, code } = req.body;

    if (!mfaToken || !code) {
      res.status(400).json({ error: 'MFA token and code required' });
      return;
    }

    // Get user ID from MFA token
    const userId = await redis.get(`mfa:${mfaToken}`);
    if (!userId) {
      res.status(400).json({ error: 'Invalid or expired MFA token' });
      return;
    }

    // Get user
    const user = await prisma.user.findUnique({
      where: { id: userId },
      include: { organization: true },
    });

    if (!user || !user.mfaSecret) {
      res.status(400).json({ error: 'MFA not configured' });
      return;
    }

    // Verify TOTP code
    const verified = speakeasy.totp.verify({
      secret: user.mfaSecret,
      encoding: 'base32',
      token: code,
      window: 2,
    });

    if (!verified) {
      res.status(401).json({ error: 'Invalid MFA code' });
      return;
    }

    // Delete MFA token
    await redis.del(`mfa:${mfaToken}`);

    // Create session
    const sessionId = uuidv4();
    const refreshToken = uuidv4();
    const session = await prisma.session.create({
      data: {
        id: sessionId,
        userId: user.id,
        refreshToken,
        deviceInfo: req.headers['user-agent'] ? { userAgent: req.headers['user-agent'] } : {},
        ipAddress: req.ip || null,
        expiresAt: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000),
      },
    });

    // Generate tokens
    const tokens = await generateTokens(user, session.id);

    res.json({
      message: 'MFA verification successful',
      user: {
        id: user.id,
        email: user.email,
        firstName: user.firstName,
        lastName: user.lastName,
        organizationId: user.organizationId,
        organization: user.organization,
        role: user.role,
      },
      tokens: {
        accessToken: tokens.accessToken,
        refreshToken: session.refreshToken,
      },
    });
  } catch (error) {
    logger.error('MFA verification error:', error);
    res.status(500).json({ error: 'MFA verification failed' });
  }
});

/**
 * POST /api/auth/google
 * Google OAuth login/registration
 */
router.post('/google', async (req: Request, res: Response): Promise<void> => {
  try {
    const { googleId, email, firstName, lastName, avatarUrl } = req.body;

    if (!googleId || !email) {
      res.status(400).json({ error: 'Google ID and email are required' });
      return;
    }

    // Find user by email or OAuth provider ID
    let user = await prisma.user.findFirst({
      where: {
        OR: [
          { oauthProvider: 'google', oauthProviderId: googleId },
          { email },
        ],
      },
      include: { organization: true },
    });

    if (!user) {
      // Create new user
      user = await prisma.user.create({
        data: {
          email,
          oauthProvider: 'google',
          oauthProviderId: googleId,
          firstName: firstName || 'User',
          lastName: lastName || '',
          avatarUrl,
          emailVerified: true, // Google verified the email
          isActive: true,
        },
        include: { organization: true },
      });

      logger.info('New user created via Google OAuth:', { userId: user.id, email });
    } else if (!user.oauthProviderId) {
      // Link Google account to existing user
      user = await prisma.user.update({
        where: { id: user.id },
        data: {
          oauthProvider: 'google',
          oauthProviderId: googleId,
          avatarUrl: avatarUrl || user.avatarUrl,
          emailVerified: true,
        },
        include: { organization: true },
      });

      logger.info('Google account linked to existing user:', { userId: user.id, email });
    }

    // Check if account is active
    if (!user.isActive) {
      res.status(403).json({ error: 'Account is disabled' });
      return;
    }

    // Create session
    const sessionId = uuidv4();
    const sessionRefreshToken = uuidv4();
    const session = await prisma.session.create({
      data: {
        id: sessionId,
        userId: user.id,
        refreshToken: sessionRefreshToken,
        deviceInfo: req.headers['user-agent'] ? { userAgent: req.headers['user-agent'] } : {},
        ipAddress: req.ip || null,
        expiresAt: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000),
      },
    });

    // Generate tokens
    const tokens = await generateTokens(user, session.id);

    // Set secure httpOnly cookies
    setAccessTokenCookie(res, tokens.accessToken);
    setRefreshTokenCookie(res, session.refreshToken);
    setUserInfoCookie(res, user);

    // Update last login
    await prisma.user.update({
      where: { id: user.id },
      data: { lastLoginAt: new Date() },
    });

    // Log login
    await prisma.auditLog.create({
      data: {
        organizationId: user.organizationId,
        userId: user.id,
        action: 'user_login_google',
        resourceType: 'session',
        resourceId: session.id,
        ipAddress: req.ip || null,
        userAgent: req.headers['user-agent'] || null,
      },
    });

    res.json({
      message: 'Google login successful',
      accessToken: tokens.accessToken,
      refreshToken: session.refreshToken,
      user: {
        id: user.id,
        email: user.email,
        firstName: user.firstName,
        lastName: user.lastName,
        organizationId: user.organizationId,
        organization: user.organization,
        role: user.role,
        avatarUrl: user.avatarUrl,
      },
    });
  } catch (error) {
    logger.error('Google OAuth error:', error);
    res.status(500).json({ error: 'Google authentication failed' });
  }
});


/**
 * POST /api/auth/microsoft
 * Microsoft OAuth login/registration
 */
router.post('/microsoft', async (req: Request, res: Response): Promise<void> => {
  try {
    const { microsoftId, email, firstName, lastName, avatarUrl } = req.body;

    if (!microsoftId || !email) {
      res.status(400).json({ error: 'Microsoft ID and email are required' });
      return;
    }

    // Find user by email or OAuth provider ID
    let user = await prisma.user.findFirst({
      where: {
        OR: [
          { oauthProvider: 'microsoft', oauthProviderId: microsoftId },
          { email },
        ],
      },
      include: { organization: true },
    });

    if (!user) {
      // Create new user
      user = await prisma.user.create({
        data: {
          email,
          oauthProvider: 'microsoft',
          oauthProviderId: microsoftId,
          firstName: firstName || 'User',
          lastName: lastName || '',
          avatarUrl,
          emailVerified: true, // Microsoft verified the email
          isActive: true,
        },
        include: { organization: true },
      });

      logger.info('New user created via Microsoft OAuth:', { userId: user.id, email });
    } else if (!user.oauthProviderId) {
      // Link Microsoft account to existing user
      user = await prisma.user.update({
        where: { id: user.id },
        data: {
          oauthProvider: 'microsoft',
          oauthProviderId: microsoftId,
          avatarUrl: avatarUrl || user.avatarUrl,
          emailVerified: true,
        },
        include: { organization: true },
      });

      logger.info('Microsoft account linked to existing user:', { userId: user.id, email });
    }

    // Check if account is active
    if (!user.isActive) {
      res.status(403).json({ error: 'Account is disabled' });
      return;
    }

    // Create session
    const sessionId = uuidv4();
    const sessionRefreshToken = uuidv4();
    const session = await prisma.session.create({
      data: {
        id: sessionId,
        userId: user.id,
        refreshToken: sessionRefreshToken,
        deviceInfo: req.headers['user-agent'] ? { userAgent: req.headers['user-agent'] } : {},
        ipAddress: req.ip || null,
        expiresAt: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000),
      },
    });

    // Generate tokens
    const tokens = await generateTokens(user, session.id);

    // Set secure httpOnly cookies
    setAccessTokenCookie(res, tokens.accessToken);
    setRefreshTokenCookie(res, session.refreshToken);
    setUserInfoCookie(res, user);

    // Update last login
    await prisma.user.update({
      where: { id: user.id },
      data: { lastLoginAt: new Date() },
    });

    // Log login
    await prisma.auditLog.create({
      data: {
        organizationId: user.organizationId,
        userId: user.id,
        action: 'user_login_microsoft',
        resourceType: 'session',
        resourceId: session.id,
        ipAddress: req.ip || null,
        userAgent: req.headers['user-agent'] || null,
      },
    });

    res.json({
      message: 'Microsoft login successful',
      accessToken: tokens.accessToken,
      refreshToken: session.refreshToken,
      user: {
        id: user.id,
        email: user.email,
        firstName: user.firstName,
        lastName: user.lastName,
        organizationId: user.organizationId,
        organization: user.organization,
        role: user.role,
        avatarUrl: user.avatarUrl,
      },
    });
  } catch (error) {
    logger.error('Microsoft OAuth error:', error);
    res.status(500).json({ error: 'Microsoft authentication failed' });
  }
});

export default router;
