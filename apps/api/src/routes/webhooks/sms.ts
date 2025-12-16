/**
 * SMS Webhook Routes
 * Handles Twilio SMS webhooks for status updates and incoming messages
 */

import { Router, Request, Response } from 'express';
import { SmsService } from '../../services/sms';
import winston from 'winston';
import twilio from 'twilio';

const router: Router = Router();
const smsService = new SmsService();

const logger = winston.createLogger({
  level: process.env.LOG_LEVEL || 'info',
  defaultMeta: { service: 'sms-webhook' },
  transports: [new winston.transports.Console()],
});

/**
 * Validate Twilio webhook signature
 */
const validateTwilioSignature = (req: Request): boolean => {
  const authToken = process.env.TWILIO_AUTH_TOKEN;
  if (!authToken) {
    logger.warn('Twilio auth token not configured');
    return false;
  }

  const signature = req.headers['x-twilio-signature'] as string;
  const url = `${process.env.WEB_URL || 'http://localhost:3000'}${req.originalUrl}`;

  return twilio.validateRequest(
    authToken,
    signature,
    url,
    req.body
  );
};

/**
 * SMS Status Webhook
 * POST /api/webhooks/sms/status
 */
router.post('/status', async (req: Request, res: Response) => {
  try {
    // Validate webhook signature in production
    if (process.env.NODE_ENV === 'production') {
      if (!validateTwilioSignature(req)) {
        logger.warn('Invalid Twilio signature', {
          ip: req.ip,
          userAgent: req.headers['user-agent'],
        });
        return res.status(403).send('Forbidden');
      }
    }

    const {
      MessageSid,
      MessageStatus,
      ErrorCode,
      ErrorMessage,
      Price,
      PriceUnit,
      To,
      From,
    } = req.body;

    logger.info('SMS status webhook received', {
      messageId: MessageSid,
      status: MessageStatus,
      to: To,
      from: From,
    });

    // Update SMS status in database
    await smsService.handleStatusWebhook({
      MessageSid,
      MessageStatus,
      ErrorCode,
      ErrorMessage,
      Price,
      PriceUnit,
    });

    // Respond with 200 OK to acknowledge receipt
    res.status(200).send('OK');
  } catch (error) {
    logger.error('Failed to handle SMS status webhook:', error);
    res.status(500).send('Internal Server Error');
  }
});

/**
 * Incoming SMS Webhook
 * POST /api/webhooks/sms/incoming
 */
router.post('/incoming', async (req: Request, res: Response) => {
  try {
    // Validate webhook signature in production
    if (process.env.NODE_ENV === 'production') {
      if (!validateTwilioSignature(req)) {
        logger.warn('Invalid Twilio signature for incoming SMS', {
          ip: req.ip,
          userAgent: req.headers['user-agent'],
        });
        return res.status(403).send('Forbidden');
      }
    }

    const {
      From,
      To,
      Body,
      MessageSid,
      NumSegments,
      NumMedia,
      MediaUrl0,
    } = req.body;

    logger.info('Incoming SMS received', {
      from: From,
      to: To,
      messageId: MessageSid,
      segments: NumSegments,
      hasMedia: NumMedia > 0,
    });

    // Handle incoming SMS
    await smsService.handleIncomingSMS({
      From,
      To,
      Body,
      MessageSid,
    });

    // Send TwiML response (empty response = no reply)
    res.type('text/xml');
    res.send('<?xml version="1.0" encoding="UTF-8"?><Response></Response>');
  } catch (error) {
    logger.error('Failed to handle incoming SMS webhook:', error);

    // Send error response in TwiML format
    res.type('text/xml');
    res.status(500).send(
      '<?xml version="1.0" encoding="UTF-8"?><Response><Message>Sorry, we encountered an error processing your message.</Message></Response>'
    );
  }
});

/**
 * SMS Opt-Out Webhook
 * POST /api/webhooks/sms/optout
 */
router.post('/optout', async (req: Request, res: Response) => {
  try {
    // Validate webhook signature in production
    if (process.env.NODE_ENV === 'production') {
      if (!validateTwilioSignature(req)) {
        logger.warn('Invalid Twilio signature for opt-out', {
          ip: req.ip,
          userAgent: req.headers['user-agent'],
        });
        return res.status(403).send('Forbidden');
      }
    }

    const { From, OptOutType } = req.body;

    logger.info('SMS opt-out received', {
      from: From,
      type: OptOutType,
    });

    // Handle opt-out (unsubscribe)
    await smsService['handleUnsubscribe'](From);

    res.status(200).send('OK');
  } catch (error) {
    logger.error('Failed to handle SMS opt-out webhook:', error);
    res.status(500).send('Internal Server Error');
  }
});

export default router;