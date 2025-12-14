/**
 * Invoice Routes
 * Invoice management and retrieval
 */

import { Router, Request, Response, RequestHandler } from 'express';
import { query, param, validationResult } from 'express-validator';
import { TenantRequest } from '../middleware/tenant';
import * as stripeService from '../services/stripe';
import { createError } from '../middleware/errorHandler';
import { createLogger, format, transports } from 'winston';

const router: ReturnType<typeof Router> = Router();

const logger = createLogger({
  level: process.env.LOG_LEVEL || 'info',
  format: format.combine(format.timestamp(), format.json()),
  defaultMeta: { service: 'invoice-routes' },
  transports: [new transports.Console()],
});

/**
 * GET /api/billing/invoices
 * List invoices for organization
 */
router.get(
  '/',
  [
    query('limit').isInt({ min: 1, max: 100 }).optional(),
    query('status').isIn(['draft', 'open', 'paid', 'uncollectible', 'void']).optional(),
    query('startingAfter').isString().optional(),
  ],
  (async (req: Request, res: Response): Promise<void> => {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      res.status(400).json({ errors: errors.array() });
      return;
    }

    try {
      const tenantReq = req as TenantRequest;
      const { organizationId } = tenantReq.tenantContext;
      const { limit = 10, status, startingAfter } = req.query;

      // Get customer for organization
      const customer = await stripeService.getOrCreateCustomer(
        organizationId,
        tenantReq.user?.email || '',
        `Organization ${organizationId}`
      );

      // List invoices
      const invoices = await stripeService.listInvoices(customer.id, {
        limit: parseInt(limit as string, 10),
        status: status as any,
        startingAfter: startingAfter as string,
      });

      res.json({
        invoices: invoices.map((invoice) => {
          const inv = invoice as any;
          return {
            id: inv.id,
            number: inv.number,
            status: inv.status,
            amount: inv.amount_due,
            currency: inv.currency,
            created: inv.created ? new Date(inv.created * 1000).toISOString() : null,
            dueDate: inv.due_date
              ? new Date(inv.due_date * 1000).toISOString()
              : null,
            paidAt: inv.status_transitions?.paid_at
              ? new Date(inv.status_transitions.paid_at * 1000).toISOString()
              : null,
            hostedInvoiceUrl: inv.hosted_invoice_url,
            invoicePdf: inv.invoice_pdf,
            periodStart: inv.period_start ? new Date(inv.period_start * 1000).toISOString() : null,
            periodEnd: inv.period_end ? new Date(inv.period_end * 1000).toISOString() : null,
          };
        }),
        hasMore: invoices.length === parseInt(limit as string, 10),
      });
    } catch (error) {
      logger.error('Failed to list invoices', { error });
      throw createError('Failed to retrieve invoices', 500, 'INVOICE_LIST_ERROR');
    }
  }) as RequestHandler
);

/**
 * GET /api/billing/invoices/upcoming
 * Get upcoming invoice preview
 */
router.get('/upcoming', (async (req: Request, res: Response): Promise<void> => {
  try {
    const tenantReq = req as TenantRequest;
    const { organizationId } = tenantReq.tenantContext;

    // Get customer for organization
    const customer = await stripeService.getOrCreateCustomer(
      organizationId,
      tenantReq.user?.email || '',
      `Organization ${organizationId}`
    );

    // Get upcoming invoice
    const invoice = await stripeService.getUpcomingInvoice(customer.id);

    if (!invoice) {
      res.json({
        upcomingInvoice: null,
        message: 'No upcoming invoice',
      });
      return;
    }

    const inv = invoice as any;
    res.json({
      upcomingInvoice: {
        amount: inv.amount_due,
        currency: inv.currency,
        periodStart: inv.period_start ? new Date(inv.period_start * 1000).toISOString() : null,
        periodEnd: inv.period_end ? new Date(inv.period_end * 1000).toISOString() : null,
        nextPaymentAttempt: inv.next_payment_attempt
          ? new Date(inv.next_payment_attempt * 1000).toISOString()
          : null,
        lines: inv.lines?.data?.map((line: any) => ({
          description: line.description,
          amount: line.amount,
          quantity: line.quantity,
          period: line.period
            ? {
                start: new Date(line.period.start * 1000).toISOString(),
                end: new Date(line.period.end * 1000).toISOString(),
              }
            : null,
        })),
      },
    });
  } catch (error) {
    logger.error('Failed to get upcoming invoice', { error });
    throw createError('Failed to retrieve upcoming invoice', 500, 'UPCOMING_INVOICE_ERROR');
  }
}) as RequestHandler);

/**
 * GET /api/billing/invoices/:invoiceId
 * Get specific invoice
 */
router.get(
  '/:invoiceId',
  [param('invoiceId').isString().notEmpty()],
  (async (req: Request, res: Response): Promise<void> => {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      res.status(400).json({ errors: errors.array() });
      return;
    }

    try {
      const tenantReq = req as TenantRequest;
      const { organizationId } = tenantReq.tenantContext;
      const { invoiceId } = req.params;

      // Get invoice
      const invoice = await stripeService.stripe.invoices.retrieve(invoiceId, {
        expand: ['subscription', 'customer'],
      });

      // Verify invoice belongs to organization
      const inv = invoice as any;
      const customer = inv.customer;
      if (customer?.metadata?.organization_id !== organizationId) {
        throw createError('Invoice not found', 404, 'INVOICE_NOT_FOUND');
      }

      res.json({
        invoice: {
          id: inv.id,
          number: inv.number,
          status: inv.status,
          amount: inv.amount_due,
          amountPaid: inv.amount_paid,
          amountRemaining: inv.amount_remaining,
          currency: inv.currency,
          created: inv.created ? new Date(inv.created * 1000).toISOString() : null,
          dueDate: inv.due_date
            ? new Date(inv.due_date * 1000).toISOString()
            : null,
          paidAt: inv.status_transitions?.paid_at
            ? new Date(inv.status_transitions.paid_at * 1000).toISOString()
            : null,
          hostedInvoiceUrl: inv.hosted_invoice_url,
          invoicePdf: inv.invoice_pdf,
          periodStart: inv.period_start ? new Date(inv.period_start * 1000).toISOString() : null,
          periodEnd: inv.period_end ? new Date(inv.period_end * 1000).toISOString() : null,
          lines: inv.lines?.data?.map((line: any) => ({
            description: line.description,
            amount: line.amount,
            quantity: line.quantity,
            period: line.period
              ? {
                  start: new Date(line.period.start * 1000).toISOString(),
                  end: new Date(line.period.end * 1000).toISOString(),
                }
              : null,
          })),
        },
      });
    } catch (error: any) {
      if (error.code === 'INVOICE_NOT_FOUND') {
        throw error;
      }
      logger.error('Failed to get invoice', { error });
      throw createError('Failed to retrieve invoice', 500, 'INVOICE_FETCH_ERROR');
    }
  }) as RequestHandler
);

export default router;
