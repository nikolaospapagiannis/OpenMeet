'use client';

import React, { useEffect, useState } from 'react';
import { useParams } from 'next/navigation';
import { Card } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import {
  Lock,
  Calendar,
  Clock,
  Users,
  FileText,
  AlertCircle,
  Eye,
  Loader2,
  CheckCircle,
} from 'lucide-react';
import apiClient from '@/lib/api';

interface SharedMeeting {
  id: string;
  title: string;
  description: string;
  scheduledStartAt: string;
  duration: number;
  participants: Array<{
    name: string;
    email: string;
  }>;
  summary: {
    overview: string;
    keyPoints: string[];
    actionItems: Array<{
      description: string;
      assignee?: string;
    }>;
    decisions: string[];
  };
  transcript: {
    fullText: string;
    segments: Array<{
      speaker: string;
      text: string;
      timestamp: number;
    }>;
  };
  permission: 'view' | 'comment' | 'edit';
  viewCount: number;
}

export default function SharedMeetingPage() {
  const params = useParams();
  const token = params.token as string;

  const [meeting, setMeeting] = useState<SharedMeeting | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [requiresPassword, setRequiresPassword] = useState(false);
  const [password, setPassword] = useState('');
  const [passwordError, setPasswordError] = useState('');

  useEffect(() => {
    loadSharedMeeting();
  }, [token]);

  const loadSharedMeeting = async (pwd?: string) => {
    try {
      setLoading(true);
      setPasswordError('');

      const response = await apiClient.post(`/shared/${token}`, {
        password: pwd || undefined,
      });

      setMeeting(response.data);
      setRequiresPassword(false);
    } catch (err: any) {
      if (err.response?.status === 401) {
        setRequiresPassword(true);
        setPasswordError('Invalid password. Please try again.');
      } else if (err.response?.status === 403) {
        if (err.response?.data?.error?.includes('password')) {
          setRequiresPassword(true);
        } else {
          setError(err.response?.data?.error || 'This link has expired or been revoked.');
        }
      } else if (err.response?.status === 404) {
        setError('This shared link does not exist.');
      } else {
        setError('Failed to load shared meeting. Please try again.');
      }
    } finally {
      setLoading(false);
    }
  };

  const handlePasswordSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (password.trim()) {
      loadSharedMeeting(password);
    }
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-slate-900 via-slate-800 to-slate-900 flex items-center justify-center">
        <div className="text-center">
          <Loader2 className="w-12 h-12 text-blue-500 animate-spin mx-auto mb-4" />
          <p className="text-slate-400">Loading shared meeting...</p>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-slate-900 via-slate-800 to-slate-900 flex items-center justify-center p-4">
        <Card className="max-w-md w-full p-8 bg-slate-800/50 border-slate-700/50 text-center">
          <div className="w-16 h-16 rounded-full bg-red-500/10 flex items-center justify-center mx-auto mb-4">
            <AlertCircle className="w-8 h-8 text-red-500" />
          </div>
          <h2 className="text-xl font-bold text-white mb-2">Access Denied</h2>
          <p className="text-slate-400">{error}</p>
        </Card>
      </div>
    );
  }

  if (requiresPassword && !meeting) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-slate-900 via-slate-800 to-slate-900 flex items-center justify-center p-4">
        <Card className="max-w-md w-full p-8 bg-slate-800/50 border-slate-700/50">
          <div className="w-16 h-16 rounded-full bg-blue-500/10 flex items-center justify-center mx-auto mb-4">
            <Lock className="w-8 h-8 text-blue-500" />
          </div>
          <h2 className="text-xl font-bold text-white mb-2 text-center">
            Password Protected
          </h2>
          <p className="text-slate-400 text-center mb-6">
            This meeting is password protected. Please enter the password to continue.
          </p>

          <form onSubmit={handlePasswordSubmit} className="space-y-4">
            <div>
              <Label className="text-slate-200">Password</Label>
              <Input
                type="password"
                placeholder="Enter password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                className="bg-slate-800/50 border-slate-700 mt-1"
                autoFocus
              />
              {passwordError && (
                <p className="text-sm text-red-400 mt-2">{passwordError}</p>
              )}
            </div>
            <Button type="submit" className="w-full bg-blue-600 hover:bg-blue-700">
              <Lock className="w-4 h-4 mr-2" />
              Unlock Meeting
            </Button>
          </form>
        </Card>
      </div>
    );
  }

  if (!meeting) {
    return null;
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-900 via-slate-800 to-slate-900">
      {/* Header */}
      <div className="border-b border-slate-700/50 bg-slate-900/50 backdrop-blur-sm sticky top-0 z-10">
        <div className="max-w-6xl mx-auto px-4 py-4">
          <div className="flex items-center justify-between">
            <div>
              <h1 className="text-2xl font-bold text-white">{meeting.title}</h1>
              <div className="flex items-center gap-4 mt-2 text-sm text-slate-400">
                <div className="flex items-center gap-1">
                  <Calendar className="w-4 h-4" />
                  {new Date(meeting.scheduledStartAt).toLocaleDateString()}
                </div>
                <div className="flex items-center gap-1">
                  <Clock className="w-4 h-4" />
                  {Math.floor(meeting.duration / 60)} min
                </div>
                <div className="flex items-center gap-1">
                  <Eye className="w-4 h-4" />
                  {meeting.viewCount} views
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Content */}
      <div className="max-w-6xl mx-auto px-4 py-8">
        <div className="grid gap-6">
          {/* Meeting Info */}
          {meeting.description && (
            <Card className="p-6 bg-slate-800/30 border-slate-700/50">
              <h2 className="text-lg font-semibold text-white mb-3">Description</h2>
              <p className="text-slate-300">{meeting.description}</p>
            </Card>
          )}

          {/* Participants */}
          {meeting.participants && meeting.participants.length > 0 && (
            <Card className="p-6 bg-slate-800/30 border-slate-700/50">
              <h2 className="text-lg font-semibold text-white mb-3 flex items-center gap-2">
                <Users className="w-5 h-5" />
                Participants ({meeting.participants.length})
              </h2>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                {meeting.participants.map((participant, index) => (
                  <div
                    key={index}
                    className="flex items-center gap-3 p-3 bg-slate-900/50 rounded-lg"
                  >
                    <div className="w-10 h-10 rounded-full bg-blue-500/20 flex items-center justify-center text-blue-400 font-semibold">
                      {participant.name.charAt(0).toUpperCase()}
                    </div>
                    <div>
                      <p className="text-sm font-medium text-white">{participant.name}</p>
                      <p className="text-xs text-slate-400">{participant.email}</p>
                    </div>
                  </div>
                ))}
              </div>
            </Card>
          )}

          {/* Summary */}
          {meeting.summary && (
            <Card className="p-6 bg-slate-800/30 border-slate-700/50">
              <h2 className="text-lg font-semibold text-white mb-4 flex items-center gap-2">
                <FileText className="w-5 h-5" />
                Meeting Summary
              </h2>

              {meeting.summary.overview && (
                <div className="mb-6">
                  <h3 className="text-sm font-semibold text-slate-300 mb-2">Overview</h3>
                  <p className="text-slate-400">{meeting.summary.overview}</p>
                </div>
              )}

              {meeting.summary.keyPoints && meeting.summary.keyPoints.length > 0 && (
                <div className="mb-6">
                  <h3 className="text-sm font-semibold text-slate-300 mb-2">
                    Key Points
                  </h3>
                  <ul className="space-y-2">
                    {meeting.summary.keyPoints.map((point, index) => (
                      <li key={index} className="flex items-start gap-2 text-slate-400">
                        <span className="text-blue-400 mt-1">•</span>
                        <span>{point}</span>
                      </li>
                    ))}
                  </ul>
                </div>
              )}

              {meeting.summary.actionItems && meeting.summary.actionItems.length > 0 && (
                <div className="mb-6">
                  <h3 className="text-sm font-semibold text-slate-300 mb-2">
                    Action Items
                  </h3>
                  <ul className="space-y-2">
                    {meeting.summary.actionItems.map((item, index) => (
                      <li
                        key={index}
                        className="flex items-start gap-2 text-slate-400 p-3 bg-slate-900/50 rounded-lg"
                      >
                        <CheckCircle className="w-5 h-5 text-green-400 shrink-0 mt-0.5" />
                        <div className="flex-1">
                          <p>{item.description}</p>
                          {item.assignee && (
                            <p className="text-xs text-slate-500 mt-1">
                              Assigned to: {item.assignee}
                            </p>
                          )}
                        </div>
                      </li>
                    ))}
                  </ul>
                </div>
              )}

              {meeting.summary.decisions && meeting.summary.decisions.length > 0 && (
                <div>
                  <h3 className="text-sm font-semibold text-slate-300 mb-2">Decisions</h3>
                  <ul className="space-y-2">
                    {meeting.summary.decisions.map((decision, index) => (
                      <li key={index} className="flex items-start gap-2 text-slate-400">
                        <span className="text-purple-400 mt-1">→</span>
                        <span>{decision}</span>
                      </li>
                    ))}
                  </ul>
                </div>
              )}
            </Card>
          )}

          {/* Transcript */}
          {meeting.transcript && meeting.transcript.segments && (
            <Card className="p-6 bg-slate-800/30 border-slate-700/50">
              <h2 className="text-lg font-semibold text-white mb-4">Transcript</h2>
              <div className="space-y-4 max-h-96 overflow-y-auto">
                {meeting.transcript.segments.map((segment, index) => (
                  <div key={index} className="flex gap-3">
                    <div className="text-xs text-slate-500 w-16 shrink-0 pt-1">
                      {new Date(segment.timestamp * 1000).toISOString().substr(14, 5)}
                    </div>
                    <div className="flex-1">
                      <p className="text-sm font-medium text-blue-400 mb-1">
                        {segment.speaker}
                      </p>
                      <p className="text-slate-300">{segment.text}</p>
                    </div>
                  </div>
                ))}
              </div>
            </Card>
          )}
        </div>

        {/* Footer */}
        <div className="mt-8 text-center text-sm text-slate-500">
          <p>
            Powered by OpenMeet • This is a {meeting.permission} only shared link
          </p>
        </div>
      </div>
    </div>
  );
}
