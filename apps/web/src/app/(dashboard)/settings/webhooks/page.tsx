'use client';

import { useState } from 'react';
import { Plus, Webhook, Shield, Activity, RefreshCw } from 'lucide-react';
import { CardGlass } from '@/components/ui/card-glass';
import { Button } from '@/components/ui/button-v2';
import { Badge } from '@/components/ui/badge';
import { WebhookList } from '@/components/webhooks/WebhookList';
import { WebhookForm } from '@/components/webhooks/WebhookForm';
import { DeliveryLogs } from '@/components/webhooks/DeliveryLogs';
import { WebhookTester } from '@/components/webhooks/WebhookTester';
import { useWebhooks, Webhook as WebhookType } from '@/hooks/useWebhooks';

export default function WebhooksPage() {
  const {
    webhooks,
    availableEvents,
    deliveries,
    isLoading,
    error,
    fetchWebhooks,
    createWebhook,
    updateWebhook,
    deleteWebhook,
    testWebhook,
    fetchDeliveries,
    regenerateSecret,
  } = useWebhooks();

  const [showForm, setShowForm] = useState(false);
  const [selectedWebhook, setSelectedWebhook] = useState<WebhookType | null>(null);
  const [showLogs, setShowLogs] = useState(false);
  const [showTester, setShowTester] = useState(false);
  const [logWebhookId, setLogWebhookId] = useState<string | null>(null);

  const handleCreate = () => {
    setSelectedWebhook(null);
    setShowForm(true);
    setShowLogs(false);
    setShowTester(false);
  };

  const handleEdit = (webhook: WebhookType) => {
    setSelectedWebhook(webhook);
    setShowForm(true);
    setShowLogs(false);
    setShowTester(false);
  };

  const handleViewLogs = async (webhook: WebhookType) => {
    setLogWebhookId(webhook.id);
    await fetchDeliveries(webhook.id);
    setShowLogs(true);
    setShowForm(false);
    setShowTester(false);
  };

  const handleTest = (webhook: WebhookType) => {
    setSelectedWebhook(webhook);
    setShowTester(true);
    setShowForm(false);
    setShowLogs(false);
  };

  const handleSave = async (data: { url: string; events: string[]; secret?: string }) => {
    let result;
    if (selectedWebhook) {
      result = await updateWebhook(selectedWebhook.id, data);
    } else {
      result = await createWebhook(data.url, data.events, data.secret);
    }

    if (result.success && !result.data?.secret) {
      setShowForm(false);
      setSelectedWebhook(null);
    }

    return result;
  };

  const handleDelete = async (id: string) => {
    const result = await deleteWebhook(id);
    if (result.success) {
      setSelectedWebhook(null);
      setShowForm(false);
    }
    return result;
  };

  const handleToggleActive = async (webhook: WebhookType) => {
    await updateWebhook(webhook.id, { isActive: !webhook.isActive });
  };

  const handleRegenerateSecret = async (webhook: WebhookType) => {
    const result = await regenerateSecret(webhook.id);
    return result;
  };

  const handleTestWebhook = async (webhook: WebhookType) => {
    const result = await testWebhook(webhook.id);
    // Refresh delivery logs after test
    if (showLogs && logWebhookId === webhook.id) {
      await fetchDeliveries(webhook.id);
    }
    return result;
  };

  if (showForm) {
    return (
      <div className="min-h-screen p-8 max-w-4xl mx-auto">
        <WebhookForm
          webhook={selectedWebhook}
          availableEvents={availableEvents}
          onSave={handleSave}
          onCancel={() => {
            setShowForm(false);
            setSelectedWebhook(null);
          }}
        />
      </div>
    );
  }

  if (showLogs && logWebhookId) {
    const webhook = webhooks.find(w => w.id === logWebhookId);
    if (webhook) {
      return (
        <div className="min-h-screen p-8 max-w-6xl mx-auto">
          <DeliveryLogs
            webhook={webhook}
            deliveries={deliveries}
            onBack={() => setShowLogs(false)}
            onRefresh={() => fetchDeliveries(logWebhookId)}
            onRetry={() => handleTestWebhook(webhook)}
          />
        </div>
      );
    }
  }

  if (showTester && selectedWebhook) {
    return (
      <div className="min-h-screen p-8 max-w-4xl mx-auto">
        <WebhookTester
          webhook={selectedWebhook}
          onTest={() => handleTestWebhook(selectedWebhook)}
          onBack={() => {
            setShowTester(false);
            setSelectedWebhook(null);
          }}
        />
      </div>
    );
  }

  return (
    <div className="min-h-screen p-8">
      <div className="max-w-7xl mx-auto">
        {/* Header */}
        <div className="mb-8">
          <div className="flex items-center justify-between mb-4">
            <div className="flex items-center gap-3">
              <div className="w-12 h-12 rounded-xl bg-gradient-to-br from-teal-500/20 to-cyan-500/20 border border-teal-500/30 flex items-center justify-center">
                <Webhook className="w-6 h-6 text-teal-400" />
              </div>
              <div>
                <h1 className="text-3xl font-bold text-white">Webhooks</h1>
                <p className="text-slate-400 mt-1">
                  Receive real-time notifications when events occur
                </p>
              </div>
            </div>
            <Button
              variant="gradient-primary"
              onClick={handleCreate}
              disabled={isLoading}
            >
              <Plus className="w-4 h-4 mr-2" />
              Create Webhook
            </Button>
          </div>

          {/* Stats */}
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mt-6">
            <CardGlass variant="elevated">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm text-slate-400">Total Webhooks</p>
                  <p className="text-2xl font-bold text-white mt-1">
                    {webhooks.length}
                  </p>
                </div>
                <div className="w-10 h-10 rounded-lg bg-teal-500/20 flex items-center justify-center">
                  <Webhook className="w-5 h-5 text-teal-400" />
                </div>
              </div>
            </CardGlass>

            <CardGlass variant="elevated">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm text-slate-400">Active Webhooks</p>
                  <p className="text-2xl font-bold text-white mt-1">
                    {webhooks.filter(w => w.isActive).length}
                  </p>
                </div>
                <div className="w-10 h-10 rounded-lg bg-green-500/20 flex items-center justify-center">
                  <Activity className="w-5 h-5 text-green-400" />
                </div>
              </div>
            </CardGlass>

            <CardGlass variant="elevated">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm text-slate-400">With Secrets</p>
                  <p className="text-2xl font-bold text-white mt-1">
                    {webhooks.filter(w => w.secret).length}
                  </p>
                </div>
                <div className="w-10 h-10 rounded-lg bg-purple-500/20 flex items-center justify-center">
                  <Shield className="w-5 h-5 text-purple-400" />
                </div>
              </div>
            </CardGlass>
          </div>
        </div>

        {/* Error Display */}
        {error && (
          <CardGlass variant="elevated" className="mb-6">
            <div className="flex items-center justify-between p-4 bg-red-500/10 rounded-lg border border-red-500/20">
              <p className="text-red-300">{error}</p>
              <Button
                variant="ghost-glass"
                size="sm"
                onClick={fetchWebhooks}
              >
                <RefreshCw className="w-4 h-4 mr-2" />
                Retry
              </Button>
            </div>
          </CardGlass>
        )}

        {/* Webhooks List */}
        <WebhookList
          webhooks={webhooks}
          onEdit={handleEdit}
          onDelete={handleDelete}
          onToggleActive={handleToggleActive}
          onViewLogs={handleViewLogs}
          onTest={handleTest}
          onRegenerateSecret={handleRegenerateSecret}
          isLoading={isLoading}
        />

        {/* Empty State */}
        {!isLoading && webhooks.length === 0 && (
          <CardGlass variant="elevated" gradient>
            <div className="text-center py-12">
              <div className="w-20 h-20 rounded-full bg-gradient-to-br from-teal-500/20 to-cyan-500/20 border border-teal-500/30 flex items-center justify-center mx-auto mb-4">
                <Webhook className="w-10 h-10 text-teal-400" />
              </div>
              <h3 className="text-xl font-semibold text-white mb-2">
                No webhooks configured
              </h3>
              <p className="text-slate-400 mb-6 max-w-md mx-auto">
                Set up webhooks to receive real-time notifications when important events occur in your workspace.
              </p>
              <Button
                variant="gradient-primary"
                onClick={handleCreate}
              >
                <Plus className="w-4 h-4 mr-2" />
                Create Your First Webhook
              </Button>
            </div>
          </CardGlass>
        )}
      </div>
    </div>
  );
}