'use client';

import React, { useState, useCallback } from 'react';
import {
  X, Share2, Mail, Copy, Check, AlertCircle,
  MessageSquare, Users, Link2, Download, Send
} from 'lucide-react';

interface ClipShareModalProps {
  clipId: string;
  clipTitle: string;
  clipUrl: string;
  duration: number;
  thumbnailUrl?: string;
  onClose: () => void;
  authToken: string;
}

interface ShareDestination {
  id: string;
  name: string;
  icon: React.ReactNode;
  color: string;
  enabled: boolean;
}

export const ClipShareModal: React.FC<ClipShareModalProps> = ({
  clipId,
  clipTitle,
  clipUrl,
  duration,
  thumbnailUrl,
  onClose,
  authToken
}) => {
  const [selectedDestination, setSelectedDestination] = useState<string>('link');
  const [isSharing, setIsSharing] = useState(false);
  const [shareMessage, setShareMessage] = useState('');
  const [emailRecipients, setEmailRecipients] = useState('');
  const [slackChannel, setSlackChannel] = useState('');
  const [teamsChannel, setTeamsChannel] = useState('');
  const [copied, setCopied] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);
  const [includeTranscript, setIncludeTranscript] = useState(false);
  const [expirationDays, setExpirationDays] = useState(7);

  // Share destinations configuration
  const destinations: ShareDestination[] = [
    {
      id: 'link',
      name: 'Copy Link',
      icon: <Link2 className="w-5 h-5" />,
      color: 'var(--ff-purple-500)',
      enabled: true
    },
    {
      id: 'email',
      name: 'Email',
      icon: <Mail className="w-5 h-5" />,
      color: '#EA4335',
      enabled: true
    },
    {
      id: 'slack',
      name: 'Slack',
      icon: <MessageSquare className="w-5 h-5" />,
      color: '#4A154B',
      enabled: true
    },
    {
      id: 'teams',
      name: 'Microsoft Teams',
      icon: <Users className="w-5 h-5" />,
      color: '#5059C9',
      enabled: true
    }
  ];

  // Format duration
  const formatDuration = (seconds: number): string => {
    const mins = Math.floor(seconds / 60);
    const secs = Math.floor(seconds % 60);
    return `${mins}:${secs.toString().padStart(2, '0')}`;
  };

  // Copy link to clipboard
  const copyToClipboard = useCallback(async () => {
    try {
      const shareableUrl = await generateShareableLink();
      await navigator.clipboard.writeText(shareableUrl);
      setCopied(true);
      setSuccess('Link copied to clipboard!');
      setTimeout(() => {
        setCopied(false);
        setSuccess(null);
      }, 3000);
    } catch (err) {
      setError('Failed to copy link');
    }
  }, []);

  // Generate shareable link with expiration
  const generateShareableLink = async (): Promise<string> => {
    try {
      const response = await fetch(`/api/clips/${clipId}/share-link`, {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${authToken}`,
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({
          expirationDays,
          includeTranscript
        })
      });

      if (!response.ok) {
        throw new Error('Failed to generate share link');
      }

      const { shareUrl } = await response.json();
      return shareUrl;
    } catch (err) {
      console.error('Error generating share link:', err);
      return clipUrl; // Fallback to original URL
    }
  };

  // Share via email
  const shareViaEmail = async () => {
    if (!emailRecipients.trim()) {
      setError('Please enter email recipients');
      return;
    }

    setIsSharing(true);
    setError(null);

    try {
      const response = await fetch(`/api/clips/${clipId}/share`, {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${authToken}`,
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({
          destination: 'email',
          recipients: emailRecipients.split(',').map(email => email.trim()),
          message: shareMessage,
          includeTranscript,
          expirationDays
        })
      });

      if (!response.ok) {
        throw new Error('Failed to send email');
      }

      setSuccess('Email sent successfully!');
      setTimeout(() => {
        onClose();
      }, 2000);
    } catch (err) {
      setError('Failed to send email. Please try again.');
    } finally {
      setIsSharing(false);
    }
  };

  // Share to Slack
  const shareToSlack = async () => {
    if (!slackChannel.trim()) {
      setError('Please enter a Slack channel');
      return;
    }

    setIsSharing(true);
    setError(null);

    try {
      const shareUrl = await generateShareableLink();

      const response = await fetch(`/api/clips/${clipId}/share`, {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${authToken}`,
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({
          destination: 'slack',
          channel: slackChannel,
          message: shareMessage || `Check out this clip: ${clipTitle}`,
          clipUrl: shareUrl,
          thumbnailUrl,
          duration: formatDuration(duration),
          includeTranscript
        })
      });

      if (!response.ok) {
        throw new Error('Failed to share to Slack');
      }

      setSuccess('Shared to Slack successfully!');
      setTimeout(() => {
        onClose();
      }, 2000);
    } catch (err) {
      setError('Failed to share to Slack. Make sure Slack is connected.');
    } finally {
      setIsSharing(false);
    }
  };

  // Share to Microsoft Teams
  const shareToTeams = async () => {
    if (!teamsChannel.trim()) {
      setError('Please enter a Teams channel');
      return;
    }

    setIsSharing(true);
    setError(null);

    try {
      const shareUrl = await generateShareableLink();

      const response = await fetch(`/api/clips/${clipId}/share`, {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${authToken}`,
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({
          destination: 'teams',
          channel: teamsChannel,
          message: shareMessage || `Check out this clip: ${clipTitle}`,
          clipUrl: shareUrl,
          thumbnailUrl,
          duration: formatDuration(duration),
          includeTranscript
        })
      });

      if (!response.ok) {
        throw new Error('Failed to share to Teams');
      }

      setSuccess('Shared to Teams successfully!');
      setTimeout(() => {
        onClose();
      }, 2000);
    } catch (err) {
      setError('Failed to share to Teams. Make sure Teams is connected.');
    } finally {
      setIsSharing(false);
    }
  };

  // Handle share action based on destination
  const handleShare = () => {
    switch (selectedDestination) {
      case 'link':
        copyToClipboard();
        break;
      case 'email':
        shareViaEmail();
        break;
      case 'slack':
        shareToSlack();
        break;
      case 'teams':
        shareToTeams();
        break;
    }
  };

  // Render destination-specific fields
  const renderDestinationFields = () => {
    switch (selectedDestination) {
      case 'email':
        return (
          <div className="space-y-4">
            <div>
              <label className="block text-sm font-medium text-[var(--ff-text-secondary)] mb-2">
                Recipients (comma-separated)
              </label>
              <input
                type="text"
                value={emailRecipients}
                onChange={(e) => setEmailRecipients(e.target.value)}
                placeholder="john@example.com, jane@example.com"
                className="w-full px-4 py-2 bg-gray-800 border border-gray-700 rounded-lg text-white placeholder-[var(--ff-text-muted)] focus:outline-none focus:border-[var(--ff-purple-500)]"
              />
            </div>
          </div>
        );

      case 'slack':
        return (
          <div className="space-y-4">
            <div>
              <label className="block text-sm font-medium text-[var(--ff-text-secondary)] mb-2">
                Slack Channel
              </label>
              <input
                type="text"
                value={slackChannel}
                onChange={(e) => setSlackChannel(e.target.value)}
                placeholder="#general or @username"
                className="w-full px-4 py-2 bg-gray-800 border border-gray-700 rounded-lg text-white placeholder-[var(--ff-text-muted)] focus:outline-none focus:border-[var(--ff-purple-500)]"
              />
            </div>
          </div>
        );

      case 'teams':
        return (
          <div className="space-y-4">
            <div>
              <label className="block text-sm font-medium text-[var(--ff-text-secondary)] mb-2">
                Teams Channel
              </label>
              <input
                type="text"
                value={teamsChannel}
                onChange={(e) => setTeamsChannel(e.target.value)}
                placeholder="Channel name"
                className="w-full px-4 py-2 bg-gray-800 border border-gray-700 rounded-lg text-white placeholder-[var(--ff-text-muted)] focus:outline-none focus:border-[var(--ff-purple-500)]"
              />
            </div>
          </div>
        );

      case 'link':
        return (
          <div className="space-y-4">
            <div className="p-4 bg-gray-800 rounded-lg">
              <p className="text-sm text-[var(--ff-text-secondary)] mb-2">Share URL:</p>
              <div className="flex items-center gap-2">
                <input
                  type="text"
                  value={clipUrl}
                  readOnly
                  className="flex-1 px-3 py-2 bg-gray-900 border border-gray-700 rounded text-white text-sm"
                />
                <button
                  onClick={copyToClipboard}
                  className="p-2 bg-[var(--ff-purple-500)] text-white rounded hover:bg-[var(--ff-purple-600)] transition-colors"
                >
                  {copied ? <Check className="w-4 h-4" /> : <Copy className="w-4 h-4" />}
                </button>
              </div>
            </div>
          </div>
        );

      default:
        return null;
    }
  };

  return (
    <div className="fixed inset-0 bg-black bg-opacity-75 flex items-center justify-center p-4 z-50">
      <div className="bg-[var(--ff-bg-layer)] border border-[var(--ff-border)] rounded-xl max-w-2xl w-full max-h-[90vh] overflow-hidden flex flex-col">
        {/* Header */}
        <div className="flex items-center justify-between p-6 border-b border-gray-700">
          <div className="flex items-center gap-3">
            <Share2 className="w-6 h-6 text-[var(--ff-purple-500)]" />
            <h2 className="text-xl font-semibold text-white">Share Clip</h2>
          </div>
          <button
            onClick={onClose}
            className="p-2 rounded-lg hover:bg-gray-800 transition-colors text-[var(--ff-text-muted)]"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Content */}
        <div className="flex-1 overflow-y-auto p-6">
          {/* Clip info */}
          <div className="mb-6 p-4 bg-gray-800 rounded-lg flex items-center gap-4">
            {thumbnailUrl && (
              <img
                src={thumbnailUrl}
                alt={clipTitle}
                className="w-20 h-12 object-cover rounded"
              />
            )}
            <div className="flex-1">
              <h3 className="text-white font-medium">{clipTitle}</h3>
              <p className="text-sm text-[var(--ff-text-muted)] mt-1">
                Duration: {formatDuration(duration)}
              </p>
            </div>
          </div>

          {/* Destination selector */}
          <div className="mb-6">
            <label className="block text-sm font-medium text-[var(--ff-text-secondary)] mb-3">
              Share to:
            </label>
            <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
              {destinations.map((dest) => (
                <button
                  key={dest.id}
                  onClick={() => setSelectedDestination(dest.id)}
                  disabled={!dest.enabled}
                  className={`p-3 rounded-lg border transition-all ${
                    selectedDestination === dest.id
                      ? 'border-[var(--ff-purple-500)] bg-[var(--ff-purple-500)] bg-opacity-10'
                      : 'border-gray-700 hover:border-gray-600'
                  } ${!dest.enabled ? 'opacity-50 cursor-not-allowed' : ''}`}
                >
                  <div className="flex flex-col items-center gap-2">
                    <div style={{ color: dest.color }}>{dest.icon}</div>
                    <span className="text-xs text-white">{dest.name}</span>
                  </div>
                </button>
              ))}
            </div>
          </div>

          {/* Destination-specific fields */}
          {renderDestinationFields()}

          {/* Common fields */}
          {selectedDestination !== 'link' && (
            <div className="mt-6 space-y-4">
              <div>
                <label className="block text-sm font-medium text-[var(--ff-text-secondary)] mb-2">
                  Message (optional)
                </label>
                <textarea
                  value={shareMessage}
                  onChange={(e) => setShareMessage(e.target.value)}
                  placeholder="Add a message..."
                  rows={3}
                  className="w-full px-4 py-2 bg-gray-800 border border-gray-700 rounded-lg text-white placeholder-[var(--ff-text-muted)] focus:outline-none focus:border-[var(--ff-purple-500)]"
                />
              </div>
            </div>
          )}

          {/* Options */}
          <div className="mt-6 space-y-3">
            <label className="flex items-center gap-3 cursor-pointer">
              <input
                type="checkbox"
                checked={includeTranscript}
                onChange={(e) => setIncludeTranscript(e.target.checked)}
                className="w-4 h-4 text-[var(--ff-purple-500)] bg-gray-800 border-gray-600 rounded focus:ring-[var(--ff-purple-500)]"
              />
              <span className="text-sm text-[var(--ff-text-secondary)]">
                Include transcript
              </span>
            </label>

            <div className="flex items-center gap-3">
              <label className="text-sm text-[var(--ff-text-secondary)]">
                Link expires in:
              </label>
              <select
                value={expirationDays}
                onChange={(e) => setExpirationDays(parseInt(e.target.value))}
                className="px-3 py-1 bg-gray-800 border border-gray-700 rounded text-white text-sm focus:outline-none focus:border-[var(--ff-purple-500)]"
              >
                <option value={1}>1 day</option>
                <option value={7}>7 days</option>
                <option value={30}>30 days</option>
                <option value={0}>Never</option>
              </select>
            </div>
          </div>

          {/* Error/Success messages */}
          {error && (
            <div className="mt-4 p-3 bg-red-500 bg-opacity-10 border border-red-500 rounded-lg flex items-center gap-2">
              <AlertCircle className="w-4 h-4 text-red-500 flex-shrink-0" />
              <p className="text-sm text-red-500">{error}</p>
            </div>
          )}

          {success && (
            <div className="mt-4 p-3 bg-green-500 bg-opacity-10 border border-green-500 rounded-lg flex items-center gap-2">
              <Check className="w-4 h-4 text-green-500 flex-shrink-0" />
              <p className="text-sm text-green-500">{success}</p>
            </div>
          )}
        </div>

        {/* Footer */}
        <div className="p-6 border-t border-gray-700 flex justify-end gap-3">
          <button
            onClick={onClose}
            className="px-4 py-2 bg-gray-700 text-white rounded-lg hover:bg-gray-600 transition-colors"
          >
            Cancel
          </button>
          <button
            onClick={handleShare}
            disabled={isSharing}
            className="px-4 py-2 bg-[var(--ff-purple-500)] text-white rounded-lg hover:bg-[var(--ff-purple-600)] transition-colors flex items-center gap-2 disabled:opacity-50"
          >
            {isSharing ? (
              <>
                <div className="animate-spin rounded-full h-4 w-4 border-2 border-white border-t-transparent" />
                Sharing...
              </>
            ) : (
              <>
                <Send className="w-4 h-4" />
                Share
              </>
            )}
          </button>
        </div>
      </div>
    </div>
  );
};