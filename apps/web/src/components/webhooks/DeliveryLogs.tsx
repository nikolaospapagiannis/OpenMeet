'use client';

import { useState } from 'react';
import {
  ArrowLeft,
  RefreshCw,
  CheckCircle,
  XCircle,
  Clock,
  AlertCircle,
  Calendar,
  Activity,
  Code,
  ChevronDown,
  ChevronRight,
  Copy,
  Send,
} from 'lucide-react';
import { CardGlass } from '@/components/ui/card-glass';
import { Button } from '@/components/ui/button-v2';
import { Badge } from '@/components/ui/badge';
import { Webhook, WebhookDelivery } from '@/hooks/useWebhooks';
import { format, formatDistanceToNow } from 'date-fns';

interface DeliveryLogsProps {
  webhook: Webhook;
  deliveries: WebhookDelivery[];
  onBack: () => void;
  onRefresh: () => void;
  onRetry: () => Promise<any>;
}

export function DeliveryLogs({
  webhook,
  deliveries,
  onBack,
  onRefresh,
  onRetry,
}: DeliveryLogsProps) {
  const [expandedDelivery, setExpandedDelivery] = useState<number | null>(null);
  const [isRefreshing, setIsRefreshing] = useState(false);
  const [isRetrying, setIsRetrying] = useState(false);

  const handleRefresh = async () => {
    setIsRefreshing(true);
    await onRefresh();
    setTimeout(() => setIsRefreshing(false), 500);
  };

  const handleRetry = async () => {
    setIsRetrying(true);
    await onRetry();
    setTimeout(() => {
      setIsRetrying(false);
      handleRefresh();
    }, 1000);
  };

  const getStatusIcon = (delivery: WebhookDelivery) => {
    if (delivery.success) {
      return <CheckCircle className="w-5 h-5 text-green-400" />;
    }
    if (delivery.status === 0 || !delivery.status) {
      return <Clock className="w-5 h-5 text-yellow-400" />;
    }
    return <XCircle className="w-5 h-5 text-red-400" />;
  };

  const getStatusBadge = (delivery: WebhookDelivery) => {
    if (delivery.success) {
      return (
        <Badge className="bg-green-500/20 text-green-300 border-green-500/30">
          Success ({delivery.status})
        </Badge>
      );
    }
    if (delivery.status === 0 || !delivery.status) {
      return (
        <Badge className="bg-yellow-500/20 text-yellow-300 border-yellow-500/30">
          Pending
        </Badge>
      );
    }
    return (
      <Badge className="bg-red-500/20 text-red-300 border-red-500/30">
        Failed ({delivery.status || 'Error'})
      </Badge>
    );
  };

  const copyJson = (data: any) => {
    navigator.clipboard.writeText(JSON.stringify(data, null, 2));
  };

  const formatDeliveryTime = (timestamp: string) => {
    try {
      const date = new Date(timestamp);
      return format(date, 'MMM dd, yyyy HH:mm:ss');
    } catch {
      return timestamp;
    }
  };

  const formatTimeAgo = (timestamp: string) => {
    try {
      return formatDistanceToNow(new Date(timestamp), { addSuffix: true });
    } catch {
      return 'Unknown';
    }
  };

  // Group deliveries by date
  const groupedDeliveries = deliveries.reduce((groups, delivery) => {
    const date = format(new Date(delivery.timestamp), 'yyyy-MM-dd');
    if (!groups[date]) {
      groups[date] = [];
    }
    groups[date].push(delivery);
    return groups;
  }, {} as Record<string, WebhookDelivery[]>);

  const successCount = deliveries.filter(d => d.success).length;
  const failureCount = deliveries.filter(d => !d.success && d.status !== 0).length;
  const pendingCount = deliveries.filter(d => d.status === 0 || !d.status).length;

  return (
    <div className="space-y-6">
      {/* Header */}
      <CardGlass variant="elevated" gradient>
        <div className="flex items-center justify-between mb-6">
          <div className="flex items-center gap-3">
            <Button
              variant="ghost-glass"
              size="sm"
              onClick={onBack}
            >
              <ArrowLeft className="w-4 h-4 mr-2" />
              Back
            </Button>
            <div>
              <h2 className="text-xl font-semibold text-white">Delivery Logs</h2>
              <p className="text-sm text-slate-400 mt-1">{webhook.url}</p>
            </div>
          </div>
          <div className="flex items-center gap-2">
            <Button
              variant="ghost-glass"
              onClick={handleRetry}
              disabled={isRetrying}
            >
              <Send className={`w-4 h-4 mr-2 ${isRetrying ? 'animate-pulse' : ''}`} />
              Test Webhook
            </Button>
            <Button
              variant="gradient-primary"
              onClick={handleRefresh}
              disabled={isRefreshing}
            >
              <RefreshCw className={`w-4 h-4 mr-2 ${isRefreshing ? 'animate-spin' : ''}`} />
              Refresh
            </Button>
          </div>
        </div>

        {/* Stats */}
        <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
          <div className="p-3 bg-slate-800/30 rounded-lg border border-white/5">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-xs text-slate-500">Total Deliveries</p>
                <p className="text-2xl font-bold text-white">{deliveries.length}</p>
              </div>
              <Activity className="w-5 h-5 text-teal-400" />
            </div>
          </div>

          <div className="p-3 bg-green-500/10 rounded-lg border border-green-500/20">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-xs text-slate-500">Successful</p>
                <p className="text-2xl font-bold text-green-400">{successCount}</p>
              </div>
              <CheckCircle className="w-5 h-5 text-green-400" />
            </div>
          </div>

          <div className="p-3 bg-red-500/10 rounded-lg border border-red-500/20">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-xs text-slate-500">Failed</p>
                <p className="text-2xl font-bold text-red-400">{failureCount}</p>
              </div>
              <XCircle className="w-5 h-5 text-red-400" />
            </div>
          </div>

          <div className="p-3 bg-yellow-500/10 rounded-lg border border-yellow-500/20">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-xs text-slate-500">Pending</p>
                <p className="text-2xl font-bold text-yellow-400">{pendingCount}</p>
              </div>
              <Clock className="w-5 h-5 text-yellow-400" />
            </div>
          </div>
        </div>
      </CardGlass>

      {/* Delivery List */}
      {deliveries.length > 0 ? (
        Object.entries(groupedDeliveries)
          .sort((a, b) => b[0].localeCompare(a[0]))
          .map(([date, dateDeliveries]) => (
            <div key={date} className="space-y-2">
              <div className="flex items-center gap-2 text-sm text-slate-400 mb-2">
                <Calendar className="w-4 h-4" />
                <span>{format(new Date(date), 'MMMM dd, yyyy')}</span>
                <Badge className="bg-slate-500/20 text-slate-300 border-slate-500/30">
                  {dateDeliveries.length} deliveries
                </Badge>
              </div>

              {dateDeliveries.map((delivery, index) => (
                <CardGlass key={index} variant="elevated">
                  <div
                    className="p-4 cursor-pointer"
                    onClick={() => setExpandedDelivery(
                      expandedDelivery === index ? null : index
                    )}
                  >
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-3">
                        {getStatusIcon(delivery)}
                        <div>
                          <div className="flex items-center gap-2">
                            <span className="font-medium text-white">
                              {delivery.event}
                            </span>
                            {getStatusBadge(delivery)}
                          </div>
                          <div className="flex items-center gap-3 text-xs text-slate-500 mt-1">
                            <span>{formatDeliveryTime(delivery.timestamp)}</span>
                            <span>•</span>
                            <span>{formatTimeAgo(delivery.timestamp)}</span>
                          </div>
                        </div>
                      </div>
                      <button className="text-slate-400 hover:text-white transition-colors">
                        {expandedDelivery === index ? (
                          <ChevronDown className="w-5 h-5" />
                        ) : (
                          <ChevronRight className="w-5 h-5" />
                        )}
                      </button>
                    </div>

                    {expandedDelivery === index && (
                      <div className="mt-4 pt-4 border-t border-white/10">
                        <div className="space-y-3">
                          {/* Request Details */}
                          <div>
                            <div className="flex items-center justify-between mb-2">
                              <span className="text-sm font-medium text-slate-300">
                                Request Details
                              </span>
                              <Button
                                variant="ghost-glass"
                                size="sm"
                                onClick={(e) => {
                                  e.stopPropagation();
                                  copyJson({
                                    event: delivery.event,
                                    timestamp: delivery.timestamp,
                                    webhookId: delivery.webhookId,
                                  });
                                }}
                              >
                                <Copy className="w-3 h-3 mr-1" />
                                Copy
                              </Button>
                            </div>
                            <div className="p-3 bg-slate-900/50 rounded border border-white/5">
                              <pre className="text-xs text-slate-300 font-mono">
                                {JSON.stringify({
                                  event: delivery.event,
                                  timestamp: delivery.timestamp,
                                  webhookId: delivery.webhookId,
                                }, null, 2)}
                              </pre>
                            </div>
                          </div>

                          {/* Response */}
                          {delivery.status && (
                            <div>
                              <div className="flex items-center justify-between mb-2">
                                <span className="text-sm font-medium text-slate-300">
                                  Response
                                </span>
                                <div className="flex items-center gap-2">
                                  <Badge className={
                                    delivery.success
                                      ? "bg-green-500/20 text-green-300 border-green-500/30"
                                      : "bg-red-500/20 text-red-300 border-red-500/30"
                                  }>
                                    HTTP {delivery.status}
                                  </Badge>
                                </div>
                              </div>
                              {delivery.error && (
                                <div className="p-3 bg-red-900/20 rounded border border-red-500/20">
                                  <div className="flex items-start gap-2">
                                    <AlertCircle className="w-4 h-4 text-red-400 mt-0.5" />
                                    <div className="flex-1">
                                      <p className="text-sm text-red-300 font-medium">Error</p>
                                      <p className="text-xs text-red-300/70 mt-1 font-mono">
                                        {delivery.error}
                                      </p>
                                    </div>
                                  </div>
                                </div>
                              )}
                            </div>
                          )}

                          {/* Payload Preview */}
                          <div>
                            <div className="flex items-center gap-2 mb-2">
                              <Code className="w-4 h-4 text-teal-400" />
                              <span className="text-sm font-medium text-slate-300">
                                Payload Preview
                              </span>
                            </div>
                            <div className="p-3 bg-slate-900/50 rounded border border-white/5">
                              <p className="text-xs text-slate-400">
                                {delivery.success
                                  ? 'Webhook delivered successfully'
                                  : delivery.status === 0
                                  ? 'Webhook delivery pending'
                                  : 'Webhook delivery failed'}
                              </p>
                            </div>
                          </div>
                        </div>
                      </div>
                    )}
                  </div>
                </CardGlass>
              ))}
            </div>
          ))
      ) : (
        <CardGlass variant="elevated" gradient>
          <div className="text-center py-12">
            <div className="w-16 h-16 rounded-full bg-slate-500/20 flex items-center justify-center mx-auto mb-4">
              <Activity className="w-8 h-8 text-slate-400" />
            </div>
            <h3 className="text-lg font-semibold text-white mb-2">
              No delivery logs yet
            </h3>
            <p className="text-slate-400 mb-6">
              Delivery logs will appear here when this webhook is triggered
            </p>
            <Button
              variant="gradient-primary"
              onClick={handleRetry}
            >
              <Send className="w-4 h-4 mr-2" />
              Send Test Event
            </Button>
          </div>
        </CardGlass>
      )}
    </div>
  );
}