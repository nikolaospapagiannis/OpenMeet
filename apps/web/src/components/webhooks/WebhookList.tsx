'use client';

import { useState } from 'react';
import {
  Webhook as WebhookIcon,
  Edit,
  Trash2,
  Power,
  TestTube,
  Activity,
  Key,
  AlertCircle,
  Clock,
  CheckCircle,
  XCircle,
  ExternalLink,
  Copy,
  RefreshCw,
} from 'lucide-react';
import { CardGlass } from '@/components/ui/card-glass';
import { Button } from '@/components/ui/button-v2';
import { Badge } from '@/components/ui/badge';
import { Webhook } from '@/hooks/useWebhooks';
import { formatDistanceToNow } from 'date-fns';

interface WebhookListProps {
  webhooks: Webhook[];
  onEdit: (webhook: Webhook) => void;
  onDelete: (id: string) => Promise<any>;
  onToggleActive: (webhook: Webhook) => void;
  onViewLogs: (webhook: Webhook) => void;
  onTest: (webhook: Webhook) => void;
  onRegenerateSecret: (webhook: Webhook) => Promise<any>;
  isLoading: boolean;
}

export function WebhookList({
  webhooks,
  onEdit,
  onDelete,
  onToggleActive,
  onViewLogs,
  onTest,
  onRegenerateSecret,
  isLoading,
}: WebhookListProps) {
  const [deletingId, setDeletingId] = useState<string | null>(null);
  const [regeneratingId, setRegeneratingId] = useState<string | null>(null);
  const [showSecretFor, setShowSecretFor] = useState<string | null>(null);
  const [newSecrets, setNewSecrets] = useState<Record<string, string>>({});

  const handleDelete = async (id: string) => {
    if (!confirm('Are you sure you want to delete this webhook?')) {
      return;
    }
    setDeletingId(id);
    try {
      await onDelete(id);
    } finally {
      setDeletingId(null);
    }
  };

  const handleRegenerateSecret = async (webhook: Webhook) => {
    if (!confirm('Are you sure you want to regenerate the secret? The old secret will stop working immediately.')) {
      return;
    }
    setRegeneratingId(webhook.id);
    try {
      const result = await onRegenerateSecret(webhook);
      if (result.success && result.secret) {
        setNewSecrets(prev => ({ ...prev, [webhook.id]: result.secret }));
        setShowSecretFor(webhook.id);
      }
    } finally {
      setRegeneratingId(null);
    }
  };

  const copyToClipboard = (text: string) => {
    navigator.clipboard.writeText(text);
  };

  const getStatusBadge = (webhook: Webhook) => {
    if (!webhook.isActive) {
      return (
        <Badge className="bg-slate-500/20 text-slate-300 border-slate-500/30">
          <Power className="w-3 h-3 mr-1" />
          Inactive
        </Badge>
      );
    }

    if (webhook.failureCount > 3) {
      return (
        <Badge className="bg-red-500/20 text-red-300 border-red-500/30">
          <XCircle className="w-3 h-3 mr-1" />
          Failing
        </Badge>
      );
    }

    return (
      <Badge className="bg-green-500/20 text-green-300 border-green-500/30">
        <CheckCircle className="w-3 h-3 mr-1" />
        Active
      </Badge>
    );
  };

  const formatUrl = (url: string) => {
    try {
      const urlObj = new URL(url);
      return `${urlObj.hostname}${urlObj.pathname}`;
    } catch {
      return url;
    }
  };

  if (isLoading && webhooks.length === 0) {
    return (
      <CardGlass variant="elevated" gradient>
        <div className="flex items-center justify-center py-8">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-teal-500"></div>
          <span className="ml-3 text-slate-400">Loading webhooks...</span>
        </div>
      </CardGlass>
    );
  }

  return (
    <div className="space-y-4">
      {webhooks.map((webhook) => (
        <CardGlass key={webhook.id} variant="elevated" gradient>
          <div className="p-6">
            <div className="flex items-start justify-between mb-4">
              <div className="flex items-start gap-3">
                <div className="w-10 h-10 rounded-lg bg-gradient-to-br from-teal-500/20 to-cyan-500/20 border border-teal-500/30 flex items-center justify-center">
                  <WebhookIcon className="w-5 h-5 text-teal-400" />
                </div>
                <div className="flex-1">
                  <div className="flex items-center gap-3 mb-2">
                    <h3 className="text-lg font-semibold text-white">
                      {formatUrl(webhook.url)}
                    </h3>
                    {getStatusBadge(webhook)}
                    {webhook.secret && (
                      <Badge className="bg-purple-500/20 text-purple-300 border-purple-500/30">
                        <Key className="w-3 h-3 mr-1" />
                        Secured
                      </Badge>
                    )}
                  </div>
                  <div className="flex items-center gap-2 text-sm text-slate-400">
                    <ExternalLink className="w-3 h-3" />
                    <code className="bg-slate-800/50 px-2 py-0.5 rounded text-xs">
                      {webhook.url}
                    </code>
                    <Button
                      variant="ghost-glass"
                      size="sm"
                      onClick={() => copyToClipboard(webhook.url)}
                      className="ml-1 p-1"
                    >
                      <Copy className="w-3 h-3" />
                    </Button>
                  </div>
                </div>
              </div>

              <div className="flex items-center gap-2">
                <Button
                  variant="ghost-glass"
                  size="sm"
                  onClick={() => onTest(webhook)}
                  title="Test Webhook"
                >
                  <TestTube className="w-4 h-4" />
                </Button>
                <Button
                  variant="ghost-glass"
                  size="sm"
                  onClick={() => onViewLogs(webhook)}
                  title="View Logs"
                >
                  <Activity className="w-4 h-4" />
                </Button>
                <Button
                  variant="ghost-glass"
                  size="sm"
                  onClick={() => onToggleActive(webhook)}
                  title={webhook.isActive ? 'Deactivate' : 'Activate'}
                >
                  <Power className={`w-4 h-4 ${webhook.isActive ? 'text-green-400' : 'text-slate-400'}`} />
                </Button>
                <Button
                  variant="ghost-glass"
                  size="sm"
                  onClick={() => onEdit(webhook)}
                  title="Edit"
                >
                  <Edit className="w-4 h-4" />
                </Button>
                <Button
                  variant="ghost-glass"
                  size="sm"
                  onClick={() => handleDelete(webhook.id)}
                  disabled={deletingId === webhook.id}
                  title="Delete"
                >
                  {deletingId === webhook.id ? (
                    <RefreshCw className="w-4 h-4 animate-spin" />
                  ) : (
                    <Trash2 className="w-4 h-4 text-red-400" />
                  )}
                </Button>
              </div>
            </div>

            {/* Events */}
            <div className="mb-4">
              <div className="flex items-center gap-2 mb-2">
                <span className="text-sm text-slate-400">Events:</span>
                <div className="flex flex-wrap gap-2">
                  {webhook.events.slice(0, 3).map((event) => (
                    <Badge
                      key={event}
                      className="bg-teal-500/20 text-teal-300 border-teal-500/30 text-xs"
                    >
                      {event}
                    </Badge>
                  ))}
                  {webhook.events.length > 3 && (
                    <Badge className="bg-slate-500/20 text-slate-300 border-slate-500/30 text-xs">
                      +{webhook.events.length - 3} more
                    </Badge>
                  )}
                </div>
              </div>
            </div>

            {/* Secret Management */}
            {webhook.secret && (
              <div className="mb-4 p-3 bg-slate-800/30 rounded-lg border border-white/5">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <Key className="w-4 h-4 text-purple-400" />
                    <span className="text-sm text-slate-300">Secret Key</span>
                  </div>
                  <Button
                    variant="ghost-glass"
                    size="sm"
                    onClick={() => handleRegenerateSecret(webhook)}
                    disabled={regeneratingId === webhook.id}
                  >
                    {regeneratingId === webhook.id ? (
                      <RefreshCw className="w-4 h-4 mr-2 animate-spin" />
                    ) : (
                      <RefreshCw className="w-4 h-4 mr-2" />
                    )}
                    Regenerate
                  </Button>
                </div>

                {showSecretFor === webhook.id && newSecrets[webhook.id] && (
                  <div className="mt-3 p-3 bg-green-500/10 rounded border border-green-500/30">
                    <p className="text-xs text-green-300 mb-2">New secret generated! Save it now:</p>
                    <div className="flex items-center gap-2">
                      <code className="flex-1 text-xs text-green-400 font-mono break-all">
                        {newSecrets[webhook.id]}
                      </code>
                      <Button
                        variant="ghost-glass"
                        size="sm"
                        onClick={() => copyToClipboard(newSecrets[webhook.id])}
                      >
                        <Copy className="w-3 h-3" />
                      </Button>
                    </div>
                    <p className="text-xs text-amber-300 mt-2">
                      ⚠️ This secret won't be shown again
                    </p>
                  </div>
                )}
              </div>
            )}

            {/* Stats */}
            <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
              <div className="text-center">
                <p className="text-xs text-slate-500 mb-1">Last Triggered</p>
                <p className="text-sm text-white">
                  {webhook.lastTriggeredAt
                    ? formatDistanceToNow(new Date(webhook.lastTriggeredAt), { addSuffix: true })
                    : 'Never'}
                </p>
              </div>
              <div className="text-center">
                <p className="text-xs text-slate-500 mb-1">Failure Count</p>
                <p className="text-sm text-white">
                  {webhook.failureCount > 0 ? (
                    <span className="text-red-400">{webhook.failureCount}</span>
                  ) : (
                    '0'
                  )}
                </p>
              </div>
              <div className="text-center">
                <p className="text-xs text-slate-500 mb-1">Created</p>
                <p className="text-sm text-white">
                  {formatDistanceToNow(new Date(webhook.createdAt), { addSuffix: true })}
                </p>
              </div>
              <div className="text-center">
                <p className="text-xs text-slate-500 mb-1">Updated</p>
                <p className="text-sm text-white">
                  {formatDistanceToNow(new Date(webhook.updatedAt), { addSuffix: true })}
                </p>
              </div>
            </div>

            {/* Warning for failing webhooks */}
            {webhook.isActive && webhook.failureCount > 3 && (
              <div className="mt-4 p-3 bg-red-500/10 rounded-lg border border-red-500/30">
                <div className="flex items-start gap-2">
                  <AlertCircle className="w-4 h-4 text-red-400 mt-0.5" />
                  <div>
                    <p className="text-sm text-red-300 font-medium">Webhook is failing</p>
                    <p className="text-xs text-red-300/70 mt-1">
                      This webhook has failed {webhook.failureCount} times. Check the delivery logs for details.
                    </p>
                  </div>
                </div>
              </div>
            )}
          </div>
        </CardGlass>
      ))}
    </div>
  );
}