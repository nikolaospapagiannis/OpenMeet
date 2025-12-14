'use client';

import React, { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { MessageSquare, Mail, Copy, Check, Loader2 } from 'lucide-react';
import { Card } from '@/components/ui/card';
import apiClient from '@/lib/api';

interface ShareToIntegrationsProps {
  meetingId: string;
  meetingTitle: string;
}

export function ShareToIntegrations({
  meetingId,
  meetingTitle,
}: ShareToIntegrationsProps) {
  const [slackChannel, setSlackChannel] = useState('');
  const [teamsChannel, setTeamsChannel] = useState('');
  const [loading, setLoading] = useState<string | null>(null);
  const [copiedSummary, setCopiedSummary] = useState(false);

  const shareToSlack = async () => {
    try {
      setLoading('slack');
      await apiClient.post(`/meetings/${meetingId}/summary/share/slack`, {
        channel: slackChannel || undefined,
      });
      alert('Successfully shared to Slack!');
    } catch (error) {
      console.error('Error sharing to Slack:', error);
      alert('Failed to share to Slack. Please make sure the integration is connected.');
    } finally {
      setLoading(null);
    }
  };

  const shareToTeams = async () => {
    try {
      setLoading('teams');
      await apiClient.post(`/meetings/${meetingId}/summary/share/teams`, {
        channel: teamsChannel || undefined,
      });
      alert('Successfully shared to Microsoft Teams!');
    } catch (error) {
      console.error('Error sharing to Teams:', error);
      alert('Failed to share to Teams. Please make sure the integration is connected.');
    } finally {
      setLoading(null);
    }
  };

  const copyFormattedSummary = async () => {
    try {
      setLoading('copy');

      // Fetch the meeting summary
      const summary = await apiClient.get(`/meetings/${meetingId}/summary`);

      // Format the summary for copying
      let formattedText = `**${meetingTitle}**\n\n`;

      if (summary.data.overview) {
        formattedText += `📝 Overview:\n${summary.data.overview}\n\n`;
      }

      if (summary.data.keyPoints && summary.data.keyPoints.length > 0) {
        formattedText += `🔑 Key Points:\n`;
        summary.data.keyPoints.forEach((point: string, index: number) => {
          formattedText += `${index + 1}. ${point}\n`;
        });
        formattedText += '\n';
      }

      if (summary.data.actionItems && summary.data.actionItems.length > 0) {
        formattedText += `✅ Action Items:\n`;
        summary.data.actionItems.forEach((item: any, index: number) => {
          formattedText += `${index + 1}. ${item.description}`;
          if (item.assignee) formattedText += ` (@${item.assignee})`;
          if (item.dueDate) formattedText += ` - Due: ${item.dueDate}`;
          formattedText += '\n';
        });
        formattedText += '\n';
      }

      if (summary.data.decisions && summary.data.decisions.length > 0) {
        formattedText += `🎯 Decisions:\n`;
        summary.data.decisions.forEach((decision: string, index: number) => {
          formattedText += `${index + 1}. ${decision}\n`;
        });
      }

      await navigator.clipboard.writeText(formattedText);
      setCopiedSummary(true);
      setTimeout(() => setCopiedSummary(false), 2000);
    } catch (error) {
      console.error('Error copying summary:', error);
      alert('Failed to copy summary. Please try again.');
    } finally {
      setLoading(null);
    }
  };

  return (
    <div className="space-y-6">
      <div className="space-y-4">
        {/* Slack Integration */}
        <Card className="p-4 bg-slate-800/30 border-slate-700/50">
          <div className="flex items-start gap-4">
            <div className="w-12 h-12 rounded-lg bg-purple-500/10 flex items-center justify-center shrink-0">
              <MessageSquare className="w-6 h-6 text-purple-400" />
            </div>
            <div className="flex-1">
              <h3 className="text-base font-semibold text-white mb-1">
                Share to Slack
              </h3>
              <p className="text-sm text-slate-400 mb-3">
                Share meeting summary to a Slack channel
              </p>
              <div className="space-y-3">
                <div>
                  <Label className="text-slate-300 text-sm">
                    Channel (Optional)
                  </Label>
                  <Input
                    placeholder="#general or leave empty for default"
                    value={slackChannel}
                    onChange={(e) => setSlackChannel(e.target.value)}
                    className="bg-slate-800/50 border-slate-700 mt-1"
                  />
                </div>
                <Button
                  onClick={shareToSlack}
                  disabled={loading === 'slack'}
                  className="w-full bg-purple-600 hover:bg-purple-700"
                >
                  {loading === 'slack' ? (
                    <>
                      <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                      Sharing...
                    </>
                  ) : (
                    <>
                      <MessageSquare className="w-4 h-4 mr-2" />
                      Share to Slack
                    </>
                  )}
                </Button>
              </div>
            </div>
          </div>
        </Card>

        {/* Microsoft Teams Integration */}
        <Card className="p-4 bg-slate-800/30 border-slate-700/50">
          <div className="flex items-start gap-4">
            <div className="w-12 h-12 rounded-lg bg-blue-500/10 flex items-center justify-center shrink-0">
              <MessageSquare className="w-6 h-6 text-blue-400" />
            </div>
            <div className="flex-1">
              <h3 className="text-base font-semibold text-white mb-1">
                Share to Microsoft Teams
              </h3>
              <p className="text-sm text-slate-400 mb-3">
                Share meeting summary to a Teams channel
              </p>
              <div className="space-y-3">
                <div>
                  <Label className="text-slate-300 text-sm">
                    Channel (Optional)
                  </Label>
                  <Input
                    placeholder="General or leave empty for default"
                    value={teamsChannel}
                    onChange={(e) => setTeamsChannel(e.target.value)}
                    className="bg-slate-800/50 border-slate-700 mt-1"
                  />
                </div>
                <Button
                  onClick={shareToTeams}
                  disabled={loading === 'teams'}
                  className="w-full bg-blue-600 hover:bg-blue-700"
                >
                  {loading === 'teams' ? (
                    <>
                      <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                      Sharing...
                    </>
                  ) : (
                    <>
                      <MessageSquare className="w-4 h-4 mr-2" />
                      Share to Teams
                    </>
                  )}
                </Button>
              </div>
            </div>
          </div>
        </Card>

        {/* Copy Formatted Summary */}
        <Card className="p-4 bg-slate-800/30 border-slate-700/50">
          <div className="flex items-start gap-4">
            <div className="w-12 h-12 rounded-lg bg-green-500/10 flex items-center justify-center shrink-0">
              {copiedSummary ? (
                <Check className="w-6 h-6 text-green-400" />
              ) : (
                <Copy className="w-6 h-6 text-green-400" />
              )}
            </div>
            <div className="flex-1">
              <h3 className="text-base font-semibold text-white mb-1">
                Copy Formatted Summary
              </h3>
              <p className="text-sm text-slate-400 mb-3">
                Copy a formatted summary to paste anywhere
              </p>
              <Button
                onClick={copyFormattedSummary}
                disabled={loading === 'copy'}
                variant="outline"
                className="w-full"
              >
                {loading === 'copy' ? (
                  <>
                    <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                    Copying...
                  </>
                ) : copiedSummary ? (
                  <>
                    <Check className="w-4 h-4 mr-2 text-green-500" />
                    Copied to Clipboard!
                  </>
                ) : (
                  <>
                    <Copy className="w-4 h-4 mr-2" />
                    Copy Summary
                  </>
                )}
              </Button>
            </div>
          </div>
        </Card>

        {/* Email Summary */}
        <Card className="p-4 bg-slate-800/30 border-slate-700/50">
          <div className="flex items-start gap-4">
            <div className="w-12 h-12 rounded-lg bg-orange-500/10 flex items-center justify-center shrink-0">
              <Mail className="w-6 h-6 text-orange-400" />
            </div>
            <div className="flex-1">
              <h3 className="text-base font-semibold text-white mb-1">
                Email Summary
              </h3>
              <p className="text-sm text-slate-400 mb-3">
                Send the meeting summary via email
              </p>
              <Button
                onClick={() => {
                  // This would typically open the email tab
                  alert('Switch to the Email tab to send invites');
                }}
                variant="outline"
                className="w-full"
              >
                <Mail className="w-4 h-4 mr-2" />
                Switch to Email Tab
              </Button>
            </div>
          </div>
        </Card>
      </div>

      <div className="bg-slate-800/30 border border-slate-700/50 rounded-lg p-4">
        <p className="text-sm text-slate-400">
          <strong className="text-slate-300">Note:</strong> Make sure the respective integrations
          (Slack, Teams) are connected in your settings before sharing.
        </p>
      </div>
    </div>
  );
}
