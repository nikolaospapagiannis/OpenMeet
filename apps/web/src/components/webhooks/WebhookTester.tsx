'use client';

import { useState } from 'react';
import {
  ArrowLeft,
  Send,
  Clock,
  CheckCircle,
  XCircle,
  AlertCircle,
  Copy,
  Code,
  Shield,
  Activity,
  RefreshCw,
  Globe,
} from 'lucide-react';
import { CardGlass } from '@/components/ui/card-glass';
import { Button } from '@/components/ui/button-v2';
import { Badge } from '@/components/ui/badge';
import { Webhook, TestWebhookResult } from '@/hooks/useWebhooks';

interface WebhookTesterProps {
  webhook: Webhook;
  onTest: () => Promise<TestWebhookResult>;
  onBack: () => void;
}

export function WebhookTester({ webhook, onTest, onBack }: WebhookTesterProps) {
  const [isLoading, setIsLoading] = useState(false);
  const [testResult, setTestResult] = useState<TestWebhookResult | null>(null);
  const [selectedEvent, setSelectedEvent] = useState(webhook.events[0] || 'meeting.created');
  const [showPayload, setShowPayload] = useState(false);
  const [copiedSection, setCopiedSection] = useState<string | null>(null);

  // Sample test payloads
  const testPayloads: Record<string, any> = {
    'meeting.created': {
      event: 'meeting.created',
      timestamp: new Date().toISOString(),
      data: {
        id: 'test-meeting-001',
        title: 'Test Meeting - Weekly Standup',
        scheduledAt: new Date(Date.now() + 86400000).toISOString(),
        duration: 30,
        organizer: {
          id: 'user-001',
          name: 'Test User',
          email: 'test@example.com',
        },
        participants: [
          { id: 'user-002', name: 'Jane Smith', email: 'jane@example.com' },
          { id: 'user-003', name: 'Bob Johnson', email: 'bob@example.com' },
        ],
      },
    },
    'meeting.completed': {
      event: 'meeting.completed',
      timestamp: new Date().toISOString(),
      data: {
        id: 'test-meeting-001',
        title: 'Test Meeting - Weekly Standup',
        completedAt: new Date().toISOString(),
        duration: 28,
        recordingUrl: 'https://example.com/recordings/test-001',
        transcriptReady: false,
      },
    },
    'transcript.ready': {
      event: 'transcript.ready',
      timestamp: new Date().toISOString(),
      data: {
        id: 'test-transcript-001',
        meetingId: 'test-meeting-001',
        status: 'completed',
        wordCount: 2456,
        summary: 'Test summary of the meeting discussion...',
        actionItems: [
          { text: 'Follow up on project timeline', assignee: 'Jane Smith' },
          { text: 'Review budget proposal', assignee: 'Bob Johnson' },
        ],
        downloadUrl: 'https://example.com/transcripts/test-001',
      },
    },
  };

  const handleTest = async () => {
    setIsLoading(true);
    setTestResult(null);

    try {
      const result = await onTest();
      setTestResult(result);
    } catch (error: any) {
      setTestResult({
        success: false,
        error: error.message || 'Test failed',
        message: 'An unexpected error occurred during the test',
      });
    } finally {
      setIsLoading(false);
    }
  };

  const copyToClipboard = (text: string, section: string) => {
    navigator.clipboard.writeText(text);
    setCopiedSection(section);
    setTimeout(() => setCopiedSection(null), 2000);
  };

  const formatUrl = (url: string) => {
    try {
      const urlObj = new URL(url);
      return `${urlObj.hostname}${urlObj.pathname}`;
    } catch {
      return url;
    }
  };

  const getTestStatusIcon = () => {
    if (!testResult) return null;
    if (testResult.success) {
      return <CheckCircle className="w-6 h-6 text-green-400" />;
    }
    return <XCircle className="w-6 h-6 text-red-400" />;
  };

  const getTestStatusColor = () => {
    if (!testResult) return 'slate';
    return testResult.success ? 'green' : 'red';
  };

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
              <h2 className="text-xl font-semibold text-white">Test Webhook</h2>
              <p className="text-sm text-slate-400 mt-1">Send test events to your webhook endpoint</p>
            </div>
          </div>
        </div>

        {/* Webhook Info */}
        <div className="p-4 bg-slate-800/30 rounded-lg border border-white/5">
          <div className="flex items-start gap-3">
            <div className="w-10 h-10 rounded-lg bg-gradient-to-br from-teal-500/20 to-cyan-500/20 border border-teal-500/30 flex items-center justify-center">
              <Globe className="w-5 h-5 text-teal-400" />
            </div>
            <div className="flex-1">
              <div className="flex items-center gap-2 mb-1">
                <span className="font-medium text-white">{formatUrl(webhook.url)}</span>
                {webhook.isActive ? (
                  <Badge className="bg-green-500/20 text-green-300 border-green-500/30">
                    Active
                  </Badge>
                ) : (
                  <Badge className="bg-slate-500/20 text-slate-300 border-slate-500/30">
                    Inactive
                  </Badge>
                )}
                {webhook.secret && (
                  <Badge className="bg-purple-500/20 text-purple-300 border-purple-500/30">
                    <Shield className="w-3 h-3 mr-1" />
                    Secured
                  </Badge>
                )}
              </div>
              <code className="text-xs text-slate-400 bg-slate-900/50 px-2 py-0.5 rounded">
                {webhook.url}
              </code>
            </div>
            <Button
              variant="ghost-glass"
              size="sm"
              onClick={() => copyToClipboard(webhook.url, 'url')}
            >
              <Copy className="w-3 h-3" />
            </Button>
          </div>
        </div>
      </CardGlass>

      {/* Event Selector */}
      <CardGlass variant="elevated">
        <div className="space-y-4">
          <h3 className="text-lg font-semibold text-white">Select Test Event</h3>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
            {webhook.events.map((event) => (
              <button
                key={event}
                onClick={() => setSelectedEvent(event)}
                className={`
                  flex items-center gap-3 p-3 rounded-lg border transition-all
                  ${selectedEvent === event
                    ? 'bg-teal-500/20 border-teal-500/50 text-white'
                    : 'bg-slate-800/30 border-white/10 text-slate-300 hover:bg-slate-800/50'
                  }
                `}
              >
                <Activity className="w-4 h-4 text-teal-400" />
                <span className="font-medium">{event}</span>
              </button>
            ))}
          </div>
        </div>
      </CardGlass>

      {/* Test Payload Preview */}
      <CardGlass variant="elevated">
        <div className="space-y-4">
          <div className="flex items-center justify-between">
            <h3 className="text-lg font-semibold text-white flex items-center gap-2">
              <Code className="w-5 h-5 text-teal-400" />
              Test Payload
            </h3>
            <Button
              variant="ghost-glass"
              size="sm"
              onClick={() => setShowPayload(!showPayload)}
            >
              {showPayload ? 'Hide' : 'Show'} Payload
            </Button>
          </div>

          {showPayload && (
            <div className="relative">
              <div className="p-4 bg-slate-900/50 rounded-lg border border-white/5 overflow-x-auto">
                <pre className="text-xs text-slate-300 font-mono">
                  {JSON.stringify(testPayloads[selectedEvent] || testPayloads['meeting.created'], null, 2)}
                </pre>
              </div>
              <Button
                variant="ghost-glass"
                size="sm"
                onClick={() => copyToClipboard(
                  JSON.stringify(testPayloads[selectedEvent] || testPayloads['meeting.created'], null, 2),
                  'payload'
                )}
                className="absolute top-2 right-2"
              >
                <Copy className="w-3 h-3 mr-1" />
                {copiedSection === 'payload' ? 'Copied!' : 'Copy'}
              </Button>
            </div>
          )}

          <div className="p-3 bg-amber-500/10 rounded-lg border border-amber-500/30">
            <div className="flex items-start gap-2">
              <AlertCircle className="w-4 h-4 text-amber-400 mt-0.5" />
              <div className="text-sm text-amber-300">
                <p className="font-medium">Test Mode</p>
                <p className="text-xs mt-1">
                  This will send a sample {selectedEvent} event to your webhook endpoint.
                  The payload contains test data that mimics a real event.
                </p>
              </div>
            </div>
          </div>
        </div>
      </CardGlass>

      {/* Test Result */}
      {testResult && (
        <CardGlass
          variant="elevated"
          className={`border-${getTestStatusColor()}-500/30`}
        >
          <div className="flex items-start gap-4">
            <div className={`
              w-12 h-12 rounded-full flex items-center justify-center
              ${testResult.success
                ? 'bg-green-500/20'
                : 'bg-red-500/20'
              }
            `}>
              {getTestStatusIcon()}
            </div>
            <div className="flex-1">
              <h4 className={`text-lg font-semibold ${
                testResult.success ? 'text-green-400' : 'text-red-400'
              }`}>
                {testResult.success ? 'Test Successful' : 'Test Failed'}
              </h4>
              <p className="text-sm text-slate-300 mt-1">
                {testResult.message}
              </p>
              {testResult.status && (
                <Badge className={`mt-2 ${
                  testResult.success
                    ? 'bg-green-500/20 text-green-300 border-green-500/30'
                    : 'bg-red-500/20 text-red-300 border-red-500/30'
                }`}>
                  HTTP {testResult.status}
                </Badge>
              )}
              {testResult.error && (
                <div className="mt-3 p-3 bg-red-900/20 rounded border border-red-500/20">
                  <code className="text-xs text-red-300 font-mono">
                    {testResult.error}
                  </code>
                </div>
              )}
            </div>
          </div>
        </CardGlass>
      )}

      {/* Test Button */}
      <div className="flex items-center justify-between p-6 bg-gradient-to-r from-slate-800/50 to-slate-900/50 rounded-lg border border-white/10">
        <div>
          <p className="text-white font-medium">Ready to test your webhook?</p>
          <p className="text-sm text-slate-400 mt-1">
            Send a test {selectedEvent} event to verify your integration
          </p>
        </div>
        <Button
          variant="gradient-primary"
          size="lg"
          onClick={handleTest}
          disabled={isLoading || !webhook.isActive}
        >
          {isLoading ? (
            <>
              <RefreshCw className="w-5 h-5 mr-2 animate-spin" />
              Testing...
            </>
          ) : (
            <>
              <Send className="w-5 h-5 mr-2" />
              Send Test Event
            </>
          )}
        </Button>
      </div>

      {!webhook.isActive && (
        <div className="p-4 bg-amber-500/10 rounded-lg border border-amber-500/30">
          <div className="flex items-start gap-2">
            <AlertCircle className="w-4 h-4 text-amber-400 mt-0.5" />
            <div>
              <p className="text-sm text-amber-300 font-medium">Webhook Inactive</p>
              <p className="text-xs text-amber-300/70 mt-1">
                This webhook is currently inactive. Activate it before testing.
              </p>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}