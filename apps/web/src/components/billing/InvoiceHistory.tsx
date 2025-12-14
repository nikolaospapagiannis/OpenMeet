/**
 * InvoiceHistory Component
 * Displays table of past invoices with download and view options
 */

'use client';

import { FileText, Download, ExternalLink, CheckCircle, Clock, XCircle } from 'lucide-react';
import { CardGlass } from '@/components/ui/card-glass';
import { Button } from '@/components/ui/button-v2';
import { Badge } from '@/components/ui/badge';
import { Invoice } from '@/hooks/useSubscription';

interface InvoiceHistoryProps {
  invoices: Invoice[];
  loading: boolean;
  onDownload: (invoiceId: string) => void;
}

export function InvoiceHistory({ invoices, loading, onDownload }: InvoiceHistoryProps) {
  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleDateString('en-US', {
      year: 'numeric',
      month: 'short',
      day: 'numeric',
    });
  };

  const formatCurrency = (amount: number, currency: string) => {
    return new Intl.NumberFormat('en-US', {
      style: 'currency',
      currency: currency.toUpperCase(),
    }).format(amount / 100);
  };

  const getStatusBadge = (status: string) => {
    const statusConfig = {
      paid: {
        icon: CheckCircle,
        label: 'Paid',
        className: 'bg-green-500/20 text-green-300 border-green-500/30',
      },
      pending: {
        icon: Clock,
        label: 'Pending',
        className: 'bg-amber-500/20 text-amber-300 border-amber-500/30',
      },
      failed: {
        icon: XCircle,
        label: 'Failed',
        className: 'bg-red-500/20 text-red-300 border-red-500/30',
      },
      draft: {
        icon: Clock,
        label: 'Draft',
        className: 'bg-slate-500/20 text-slate-300 border-slate-500/30',
      },
      open: {
        icon: Clock,
        label: 'Open',
        className: 'bg-blue-500/20 text-blue-300 border-blue-500/30',
      },
      void: {
        icon: XCircle,
        label: 'Void',
        className: 'bg-slate-500/20 text-slate-300 border-slate-500/30',
      },
    };

    const config = statusConfig[status as keyof typeof statusConfig] || statusConfig.pending;
    const Icon = config.icon;

    return (
      <Badge className={config.className}>
        <Icon className="w-3 h-3 mr-1" />
        {config.label}
      </Badge>
    );
  };

  if (loading) {
    return (
      <CardGlass variant="default" className="animate-pulse">
        <div className="h-64 bg-slate-800/30 rounded-xl" />
      </CardGlass>
    );
  }

  if (invoices.length === 0) {
    return (
      <CardGlass variant="default">
        <div className="text-center py-12">
          <FileText className="w-12 h-12 text-slate-600 mx-auto mb-3" />
          <p className="text-slate-400">No invoices yet</p>
          <p className="text-sm text-slate-500 mt-1">
            Your invoice history will appear here once you have a paid subscription.
          </p>
        </div>
      </CardGlass>
    );
  }

  return (
    <CardGlass variant="default">
      {/* Header */}
      <div className="flex items-center justify-between mb-6">
        <div>
          <h2 className="text-xl font-semibold text-white mb-1">Invoice History</h2>
          <p className="text-sm text-slate-400">
            View and download your billing invoices
          </p>
        </div>
        <FileText className="w-6 h-6 text-teal-400" />
      </div>

      {/* Desktop table view */}
      <div className="hidden md:block overflow-x-auto">
        <table className="w-full">
          <thead>
            <tr className="border-b border-white/5">
              <th className="text-left text-xs font-semibold text-slate-400 uppercase tracking-wider pb-3 pr-4">
                Invoice
              </th>
              <th className="text-left text-xs font-semibold text-slate-400 uppercase tracking-wider pb-3 pr-4">
                Date
              </th>
              <th className="text-left text-xs font-semibold text-slate-400 uppercase tracking-wider pb-3 pr-4">
                Amount
              </th>
              <th className="text-left text-xs font-semibold text-slate-400 uppercase tracking-wider pb-3 pr-4">
                Status
              </th>
              <th className="text-right text-xs font-semibold text-slate-400 uppercase tracking-wider pb-3">
                Actions
              </th>
            </tr>
          </thead>
          <tbody className="divide-y divide-white/5">
            {invoices.map((invoice) => (
              <tr
                key={invoice.id}
                className="hover:bg-slate-800/30 transition-colors"
              >
                <td className="py-4 pr-4">
                  <div className="flex items-center gap-2">
                    <FileText className="w-4 h-4 text-slate-400" />
                    <span className="text-sm font-medium text-white">
                      {invoice.number || `INV-${invoice.id.slice(-8)}`}
                    </span>
                  </div>
                </td>
                <td className="py-4 pr-4">
                  <span className="text-sm text-slate-300">
                    {formatDate(invoice.date)}
                  </span>
                </td>
                <td className="py-4 pr-4">
                  <span className="text-sm font-medium text-white">
                    {formatCurrency(invoice.amount, invoice.currency)}
                  </span>
                </td>
                <td className="py-4 pr-4">{getStatusBadge(invoice.status)}</td>
                <td className="py-4 text-right">
                  <div className="flex items-center justify-end gap-2">
                    {invoice.pdfUrl && (
                      <Button
                        variant="ghost-glass"
                        size="sm"
                        onClick={() => onDownload(invoice.id)}
                        className="text-xs"
                      >
                        <Download className="w-3 h-3 mr-1" />
                        PDF
                      </Button>
                    )}
                    {invoice.hostedUrl && (
                      <Button
                        variant="ghost-glass"
                        size="sm"
                        onClick={() => window.open(invoice.hostedUrl, '_blank')}
                        className="text-xs"
                      >
                        <ExternalLink className="w-3 h-3 mr-1" />
                        View
                      </Button>
                    )}
                  </div>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      {/* Mobile card view */}
      <div className="md:hidden space-y-3">
        {invoices.map((invoice) => (
          <div
            key={invoice.id}
            className="p-4 rounded-xl bg-slate-800/30 border border-white/5 hover:bg-slate-800/50 hover:border-white/10 transition-all"
          >
            <div className="flex items-start justify-between mb-3">
              <div className="flex items-center gap-2">
                <FileText className="w-4 h-4 text-slate-400" />
                <span className="text-sm font-medium text-white">
                  {invoice.number || `INV-${invoice.id.slice(-8)}`}
                </span>
              </div>
              {getStatusBadge(invoice.status)}
            </div>

            <div className="grid grid-cols-2 gap-3 mb-3">
              <div>
                <div className="text-xs text-slate-500 mb-1">Date</div>
                <div className="text-sm text-slate-300">{formatDate(invoice.date)}</div>
              </div>
              <div>
                <div className="text-xs text-slate-500 mb-1">Amount</div>
                <div className="text-sm font-medium text-white">
                  {formatCurrency(invoice.amount, invoice.currency)}
                </div>
              </div>
            </div>

            <div className="flex gap-2">
              {invoice.pdfUrl && (
                <Button
                  variant="ghost-glass"
                  size="sm"
                  onClick={() => onDownload(invoice.id)}
                  className="flex-1 text-xs"
                >
                  <Download className="w-3 h-3 mr-1" />
                  Download PDF
                </Button>
              )}
              {invoice.hostedUrl && (
                <Button
                  variant="ghost-glass"
                  size="sm"
                  onClick={() => window.open(invoice.hostedUrl, '_blank')}
                  className="flex-1 text-xs"
                >
                  <ExternalLink className="w-3 h-3 mr-1" />
                  View Online
                </Button>
              )}
            </div>
          </div>
        ))}
      </div>

      {/* Summary */}
      <div className="mt-6 pt-6 border-t border-white/5">
        <div className="flex items-center justify-between text-sm">
          <span className="text-slate-400">
            Showing {invoices.length} invoice{invoices.length !== 1 ? 's' : ''}
          </span>
          <span className="text-slate-500">
            Total paid:{' '}
            <span className="text-white font-medium">
              {formatCurrency(
                invoices
                  .filter((inv) => inv.status === 'paid')
                  .reduce((sum, inv) => sum + inv.amount, 0),
                invoices[0]?.currency || 'usd'
              )}
            </span>
          </span>
        </div>
      </div>
    </CardGlass>
  );
}
