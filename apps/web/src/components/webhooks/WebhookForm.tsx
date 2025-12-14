'use client';

import { useState } from 'react';
import { Globe, Key, Save, X, Copy, Eye, EyeOff, RefreshCw } from 'lucide-react';
import { CardGlass } from '@/components/ui/card-glass';
import { Button } from '@/components/ui/button-v2';
import { Badge } from '@/components/ui/badge';
import { EventTypePicker } from './EventTypePicker';
import { Webhook, WebhookEvent } from '@/hooks/useWebhooks';

interface WebhookFormProps {
  webhook?: Webhook | null;
  availableEvents: WebhookEvent[];
  onSave: (data: { url: string; events: string[]; secret?: string }) => Promise<any>;
  onCancel: () => void;
}

export function WebhookForm({ webhook, availableEvents, onSave, onCancel }: WebhookFormProps) {
  const [url, setUrl] = useState(webhook?.url || '');
  const [selectedEvents, setSelectedEvents] = useState<string[]>(webhook?.events || []);
  const [secret, setSecret] = useState('');
  const [showSecret, setShowSecret] = useState(false);
  const [generateNewSecret, setGenerateNewSecret] = useState(!webhook);
  const [isLoading, setIsLoading] = useState(false);
  const [errors, setErrors] = useState<{ url?: string; events?: string; general?: string }>({});
  const [showSuccessSecret, setShowSuccessSecret] = useState<string | null>(null);

  const validateUrl = (value: string) => {
    try {
      new URL(value);
      if (!value.startsWith('http://') && !value.startsWith('https://')) {
        return 'URL must start with http:// or https://';
      }
      return null;
    } catch {
      return 'Please enter a valid URL';
    }
  };

  const generateSecret = () => {
    const chars = 'ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789';
    let result = 'whsec_';
    for (let i = 0; i < 32; i++) {
      result += chars.charAt(Math.floor(Math.random() * chars.length));
    }
    setSecret(result);
    setGenerateNewSecret(true);
  };

  const handleSubmit = async () => {
    const newErrors: typeof errors = {};

    const urlError = validateUrl(url);
    if (urlError) {
      newErrors.url = urlError;
    }

    if (selectedEvents.length === 0) {
      newErrors.events = 'Please select at least one event';
    }

    if (Object.keys(newErrors).length > 0) {
      setErrors(newErrors);
      return;
    }

    setIsLoading(true);
    setErrors({});

    try {
      const data: any = {
        url,
        events: selectedEvents,
      };

      if (generateNewSecret && secret) {
        data.secret = secret;
      }

      const result = await onSave(data);

      if (result.success && result.data?.secret) {
        // Show the secret from the response for new webhooks
        setShowSuccessSecret(result.data.secret);
      } else if (result.success) {
        onCancel();
      } else {
        setErrors({ general: result.error || 'Failed to save webhook' });
      }
    } catch (error: any) {
      setErrors({ general: error.message || 'An error occurred' });
    } finally {
      setIsLoading(false);
    }
  };

  const copySecret = (secretToCopy: string) => {
    navigator.clipboard.writeText(secretToCopy);
  };

  if (showSuccessSecret) {
    return (
      <CardGlass variant="elevated" gradient>
        <div className="space-y-6">
          <div className="text-center">
            <div className="w-16 h-16 bg-green-500/20 rounded-full flex items-center justify-center mx-auto mb-4">
              <Key className="w-8 h-8 text-green-400" />
            </div>
            <h3 className="text-xl font-semibold text-white mb-2">Webhook Created Successfully!</h3>
            <p className="text-slate-400">
              Save this secret key now. You won't be able to see it again.
            </p>
          </div>

          <div className="p-4 bg-slate-900/50 rounded-lg border border-green-500/30">
            <div className="flex items-center justify-between mb-2">
              <span className="text-sm text-slate-400">Webhook Secret</span>
              <Button
                variant="ghost-glass"
                size="sm"
                onClick={() => copySecret(showSuccessSecret)}
              >
                <Copy className="w-4 h-4 mr-2" />
                Copy
              </Button>
            </div>
            <code className="block text-sm text-green-300 font-mono break-all">
              {showSuccessSecret}
            </code>
          </div>

          <div className="p-4 bg-amber-500/10 rounded-lg border border-amber-500/30">
            <p className="text-sm text-amber-300">
              <strong>Important:</strong> Use this secret to verify webhook signatures in your application.
              This ensures requests are coming from our servers.
            </p>
          </div>

          <div className="flex justify-center">
            <Button
              variant="gradient-primary"
              onClick={onCancel}
            >
              Done
            </Button>
          </div>
        </div>
      </CardGlass>
    );
  }

  return (
    <CardGlass variant="elevated" gradient>
      <div className="flex items-center justify-between mb-6">
        <h2 className="text-xl font-semibold text-white">
          {webhook ? 'Edit Webhook' : 'Create New Webhook'}
        </h2>
        <Button
          variant="ghost-glass"
          size="sm"
          onClick={onCancel}
        >
          <X className="w-4 h-4" />
        </Button>
      </div>

      <div className="space-y-6">
        {errors.general && (
          <div className="p-4 rounded-lg bg-red-500/10 border border-red-500/20">
            <p className="text-sm text-red-300">{errors.general}</p>
          </div>
        )}

        <div>
          <label className="flex items-center gap-2 text-sm font-medium text-slate-300 mb-2">
            <Globe className="w-4 h-4 text-teal-400" />
            Webhook URL
          </label>
          <input
            type="url"
            placeholder="https://your-app.com/webhooks"
            value={url}
            onChange={(e) => setUrl(e.target.value)}
            className={`
              w-full px-4 py-3 rounded-lg bg-slate-800/50 border text-white
              placeholder:text-slate-500 focus:ring-2 focus:ring-teal-500/50
              focus:border-teal-500/50 outline-none transition-all
              ${errors.url ? 'border-red-500/50' : 'border-white/10'}
            `}
          />
          {errors.url && (
            <p className="text-sm text-red-400 mt-2">{errors.url}</p>
          )}
          <p className="text-sm text-slate-500 mt-2">
            We'll send POST requests to this URL when events occur
          </p>
        </div>

        {!webhook && (
          <div>
            <label className="flex items-center gap-2 text-sm font-medium text-slate-300 mb-2">
              <Key className="w-4 h-4 text-teal-400" />
              Secret Key (Optional)
            </label>
            <div className="flex gap-2">
              <div className="flex-1 relative">
                <input
                  type={showSecret ? 'text' : 'password'}
                  placeholder="Leave blank to auto-generate"
                  value={secret}
                  onChange={(e) => {
                    setSecret(e.target.value);
                    setGenerateNewSecret(true);
                  }}
                  className="w-full px-4 py-3 pr-10 rounded-lg bg-slate-800/50 border border-white/10 text-white placeholder:text-slate-500 focus:ring-2 focus:ring-teal-500/50 focus:border-teal-500/50 outline-none transition-all"
                />
                <button
                  type="button"
                  onClick={() => setShowSecret(!showSecret)}
                  className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 hover:text-white transition-colors"
                >
                  {showSecret ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                </button>
              </div>
              <Button
                variant="ghost-glass"
                onClick={generateSecret}
              >
                <RefreshCw className="w-4 h-4 mr-2" />
                Generate
              </Button>
            </div>
            <p className="text-sm text-slate-500 mt-2">
              Used to sign webhook payloads for security verification
            </p>
          </div>
        )}

        <div>
          <label className="text-sm font-medium text-slate-300 block mb-3">
            Event Subscriptions
            {errors.events && (
              <span className="text-red-400 ml-2">{errors.events}</span>
            )}
          </label>
          <div className="max-h-96 overflow-y-auto p-4 bg-slate-900/30 rounded-lg border border-white/5">
            <EventTypePicker
              availableEvents={availableEvents}
              selectedEvents={selectedEvents}
              onEventsChange={setSelectedEvents}
            />
          </div>
        </div>

        <div className="flex items-center justify-between pt-4 border-t border-white/10">
          <div>
            {selectedEvents.length > 0 && (
              <Badge className="bg-teal-500/20 text-teal-300 border-teal-500/30">
                {selectedEvents.length} events selected
              </Badge>
            )}
          </div>
          <div className="flex gap-3">
            <Button
              variant="ghost-glass"
              onClick={onCancel}
              disabled={isLoading}
            >
              Cancel
            </Button>
            <Button
              variant="gradient-primary"
              onClick={handleSubmit}
              disabled={isLoading}
            >
              <Save className="w-4 h-4 mr-2" />
              {isLoading ? 'Saving...' : (webhook ? 'Update Webhook' : 'Create Webhook')}
            </Button>
          </div>
        </div>
      </div>
    </CardGlass>
  );
}