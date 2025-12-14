'use client';

import React, { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Mail, X, Loader2, Check } from 'lucide-react';
import { Badge } from '@/components/ui/badge';
import apiClient from '@/lib/api';

interface EmailInviteFormProps {
  meetingId: string;
  meetingTitle: string;
}

export function EmailInviteForm({ meetingId, meetingTitle }: EmailInviteFormProps) {
  const [emailInput, setEmailInput] = useState('');
  const [emails, setEmails] = useState<string[]>([]);
  const [message, setMessage] = useState('');
  const [loading, setLoading] = useState(false);
  const [success, setSuccess] = useState(false);

  const isValidEmail = (email: string) => {
    return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email);
  };

  const addEmail = () => {
    const trimmedEmail = emailInput.trim().toLowerCase();

    if (!trimmedEmail) return;

    if (!isValidEmail(trimmedEmail)) {
      alert('Please enter a valid email address');
      return;
    }

    if (emails.includes(trimmedEmail)) {
      alert('This email has already been added');
      return;
    }

    setEmails([...emails, trimmedEmail]);
    setEmailInput('');
  };

  const removeEmail = (email: string) => {
    setEmails(emails.filter((e) => e !== email));
  };

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter' || e.key === ',') {
      e.preventDefault();
      addEmail();
    }
  };

  const sendInvites = async () => {
    if (emails.length === 0) {
      alert('Please add at least one email address');
      return;
    }

    try {
      setLoading(true);

      await apiClient.post(`/meetings/${meetingId}/share/email`, {
        recipients: emails,
        message: message || undefined,
      });

      setSuccess(true);

      // Reset form after 2 seconds
      setTimeout(() => {
        setEmails([]);
        setMessage('');
        setSuccess(false);
      }, 2000);
    } catch (error) {
      console.error('Error sending invites:', error);
      alert('Failed to send invites. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="space-y-6">
      {success ? (
        <div className="flex flex-col items-center justify-center py-12 text-center">
          <div className="w-16 h-16 rounded-full bg-green-500/20 flex items-center justify-center mb-4">
            <Check className="w-8 h-8 text-green-500" />
          </div>
          <h3 className="text-lg font-semibold text-white mb-2">
            Invites Sent Successfully!
          </h3>
          <p className="text-sm text-slate-400">
            {emails.length} {emails.length === 1 ? 'person has' : 'people have'} been invited to view this meeting
          </p>
        </div>
      ) : (
        <>
          <div className="space-y-4">
            <div>
              <Label className="text-slate-200">Email Addresses</Label>
              <p className="text-xs text-slate-500 mb-2">
                Enter email addresses (press Enter or comma to add)
              </p>
              <div className="flex gap-2">
                <Input
                  type="email"
                  placeholder="email@example.com"
                  value={emailInput}
                  onChange={(e) => setEmailInput(e.target.value)}
                  onKeyDown={handleKeyDown}
                  className="bg-slate-800/50 border-slate-700"
                />
                <Button
                  onClick={addEmail}
                  variant="outline"
                  className="shrink-0"
                  disabled={!emailInput.trim()}
                >
                  Add
                </Button>
              </div>
            </div>

            {emails.length > 0 && (
              <div className="flex flex-wrap gap-2 p-3 bg-slate-800/30 rounded-lg border border-slate-700/50">
                {emails.map((email) => (
                  <Badge
                    key={email}
                    variant="secondary"
                    className="bg-slate-700/50 text-slate-200 flex items-center gap-1 px-3 py-1"
                  >
                    <Mail className="w-3 h-3" />
                    {email}
                    <button
                      onClick={() => removeEmail(email)}
                      className="ml-1 hover:text-red-400 transition-colors"
                    >
                      <X className="w-3 h-3" />
                    </button>
                  </Badge>
                ))}
              </div>
            )}

            <div>
              <Label className="text-slate-200">Personal Message (Optional)</Label>
              <p className="text-xs text-slate-500 mb-2">
                Add a personal message to include in the invitation email
              </p>
              <Textarea
                placeholder={`Hi, I wanted to share this meeting recording "${meetingTitle}" with you. Check it out!`}
                value={message}
                onChange={(e) => setMessage(e.target.value)}
                rows={4}
                className="bg-slate-800/50 border-slate-700"
              />
            </div>
          </div>

          <div className="border-t border-slate-700/50 pt-4">
            <div className="bg-blue-500/10 border border-blue-500/20 rounded-lg p-4 mb-4">
              <h4 className="text-sm font-medium text-blue-400 mb-2">
                What will they receive?
              </h4>
              <ul className="text-xs text-slate-400 space-y-1">
                <li>• A link to view the meeting recording</li>
                <li>• Access to the full transcript</li>
                <li>• Meeting summary and key points</li>
                {message && <li>• Your personal message</li>}
              </ul>
            </div>

            <Button
              onClick={sendInvites}
              disabled={loading || emails.length === 0}
              className="w-full bg-blue-600 hover:bg-blue-700"
            >
              {loading ? (
                <>
                  <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                  Sending Invites...
                </>
              ) : (
                <>
                  <Mail className="w-4 h-4 mr-2" />
                  Send Invites to {emails.length} {emails.length === 1 ? 'Person' : 'People'}
                </>
              )}
            </Button>
          </div>
        </>
      )}
    </div>
  );
}
