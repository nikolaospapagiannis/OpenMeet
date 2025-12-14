'use client';

import React, { useState, useEffect } from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Switch } from '@/components/ui/switch';
import { PermissionSelector } from './PermissionSelector';
import {
  Copy,
  Check,
  Link,
  QrCode,
  Lock,
  Calendar,
  Trash2,
  Loader2,
} from 'lucide-react';
import { QRCodeSVG } from 'qrcode.react';
import apiClient from '@/lib/api';

interface ShareLink {
  id: string;
  token: string;
  url: string;
  permission: 'view' | 'comment' | 'edit';
  expiresAt: Date | null;
  password: string | null;
  viewCount: number;
  createdAt: Date;
}

interface ShareLinkGeneratorProps {
  meetingId: string;
}

export function ShareLinkGenerator({ meetingId }: ShareLinkGeneratorProps) {
  const [shareLink, setShareLink] = useState<ShareLink | null>(null);
  const [loading, setLoading] = useState(false);
  const [copied, setCopied] = useState(false);
  const [showQR, setShowQR] = useState(false);

  // Link settings
  const [permission, setPermission] = useState<'view' | 'comment' | 'edit'>('view');
  const [hasExpiration, setHasExpiration] = useState(false);
  const [expirationDays, setExpirationDays] = useState(7);
  const [hasPassword, setHasPassword] = useState(false);
  const [password, setPassword] = useState('');

  useEffect(() => {
    loadExistingLink();
  }, [meetingId]);

  const loadExistingLink = async () => {
    try {
      setLoading(true);
      const response = await apiClient.get(`/meetings/${meetingId}/share-links`);
      if (response.data && response.data.length > 0) {
        const link = response.data[0];
        setShareLink({
          ...link,
          url: `${window.location.origin}/shared/${link.token}`,
          expiresAt: link.expiresAt ? new Date(link.expiresAt) : null,
        });
      }
    } catch (error) {
      console.error('Error loading share link:', error);
    } finally {
      setLoading(false);
    }
  };

  const generateLink = async () => {
    try {
      setLoading(true);
      const expiresAt = hasExpiration
        ? new Date(Date.now() + expirationDays * 24 * 60 * 60 * 1000)
        : null;

      const response = await apiClient.post(`/meetings/${meetingId}/share`, {
        permission,
        expiresAt,
        password: hasPassword ? password : null,
      });

      const newLink: ShareLink = {
        id: response.data.id,
        token: response.data.token,
        url: `${window.location.origin}/shared/${response.data.token}`,
        permission,
        expiresAt,
        password: hasPassword ? password : null,
        viewCount: 0,
        createdAt: new Date(),
      };

      setShareLink(newLink);
    } catch (error) {
      console.error('Error generating share link:', error);
      alert('Failed to generate share link. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  const copyToClipboard = async () => {
    if (!shareLink) return;

    try {
      await navigator.clipboard.writeText(shareLink.url);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    } catch (error) {
      console.error('Failed to copy:', error);
    }
  };

  const revokeLink = async () => {
    if (!shareLink) return;

    if (!confirm('Are you sure you want to revoke this share link? It will no longer be accessible.')) {
      return;
    }

    try {
      setLoading(true);
      await apiClient.delete(`/meetings/${meetingId}/share/${shareLink.id}`);
      setShareLink(null);
    } catch (error) {
      console.error('Error revoking link:', error);
      alert('Failed to revoke link. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="space-y-6">
      {!shareLink ? (
        <>
          <div className="space-y-4">
            <div>
              <Label className="text-slate-200">Permission Level</Label>
              <PermissionSelector value={permission} onChange={setPermission} />
            </div>

            <div className="flex items-center justify-between py-3 border-t border-slate-700/50">
              <div className="flex items-center gap-3">
                <Calendar className="w-5 h-5 text-slate-400" />
                <div>
                  <Label className="text-slate-200">Set Expiration Date</Label>
                  <p className="text-xs text-slate-500">
                    Link will expire after specified days
                  </p>
                </div>
              </div>
              <Switch checked={hasExpiration} onCheckedChange={setHasExpiration} />
            </div>

            {hasExpiration && (
              <div className="ml-8">
                <Label className="text-slate-200">Expires in (days)</Label>
                <Input
                  type="number"
                  min="1"
                  max="365"
                  value={expirationDays}
                  onChange={(e) => setExpirationDays(parseInt(e.target.value) || 7)}
                  className="w-32 bg-slate-800/50 border-slate-700"
                />
              </div>
            )}

            <div className="flex items-center justify-between py-3 border-t border-slate-700/50">
              <div className="flex items-center gap-3">
                <Lock className="w-5 h-5 text-slate-400" />
                <div>
                  <Label className="text-slate-200">Password Protection</Label>
                  <p className="text-xs text-slate-500">
                    Require password to access
                  </p>
                </div>
              </div>
              <Switch checked={hasPassword} onCheckedChange={setHasPassword} />
            </div>

            {hasPassword && (
              <div className="ml-8">
                <Label className="text-slate-200">Password</Label>
                <Input
                  type="password"
                  placeholder="Enter password"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  className="bg-slate-800/50 border-slate-700"
                />
              </div>
            )}
          </div>

          <Button
            onClick={generateLink}
            disabled={loading || (hasPassword && !password)}
            className="w-full bg-blue-600 hover:bg-blue-700"
          >
            {loading ? (
              <>
                <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                Generating...
              </>
            ) : (
              <>
                <Link className="w-4 h-4 mr-2" />
                Generate Share Link
              </>
            )}
          </Button>
        </>
      ) : (
        <>
          <div className="space-y-4">
            <div>
              <Label className="text-slate-200">Share Link</Label>
              <div className="flex items-center gap-2 mt-2">
                <Input
                  value={shareLink.url}
                  readOnly
                  className="bg-slate-800/50 border-slate-700 font-mono text-sm"
                />
                <Button
                  onClick={copyToClipboard}
                  variant="outline"
                  className="shrink-0"
                >
                  {copied ? (
                    <Check className="w-4 h-4 text-green-500" />
                  ) : (
                    <Copy className="w-4 h-4" />
                  )}
                </Button>
              </div>
            </div>

            <div className="flex items-center justify-between py-3 border-t border-slate-700/50">
              <div>
                <p className="text-sm font-medium text-slate-200">Permission</p>
                <p className="text-xs text-slate-500 capitalize">{shareLink.permission} only</p>
              </div>
              <div>
                <p className="text-sm font-medium text-slate-200">Views</p>
                <p className="text-xs text-slate-500">{shareLink.viewCount} views</p>
              </div>
            </div>

            {shareLink.expiresAt && (
              <div className="py-3 border-t border-slate-700/50">
                <p className="text-sm font-medium text-slate-200">Expires</p>
                <p className="text-xs text-slate-500">
                  {new Date(shareLink.expiresAt).toLocaleDateString()} at{' '}
                  {new Date(shareLink.expiresAt).toLocaleTimeString()}
                </p>
              </div>
            )}

            {shareLink.password && (
              <div className="py-3 border-t border-slate-700/50">
                <div className="flex items-center gap-2 text-sm text-slate-200">
                  <Lock className="w-4 h-4" />
                  Password protected
                </div>
              </div>
            )}

            <div className="flex items-center gap-3 pt-4 border-t border-slate-700/50">
              <Button
                onClick={() => setShowQR(!showQR)}
                variant="outline"
                className="flex-1"
              >
                <QrCode className="w-4 h-4 mr-2" />
                {showQR ? 'Hide' : 'Show'} QR Code
              </Button>
              <Button
                onClick={revokeLink}
                variant="destructive"
                className="flex-1"
                disabled={loading}
              >
                <Trash2 className="w-4 h-4 mr-2" />
                Revoke Link
              </Button>
            </div>

            {showQR && (
              <div className="flex justify-center p-6 bg-white rounded-lg">
                <QRCodeSVG value={shareLink.url} size={200} />
              </div>
            )}
          </div>
        </>
      )}
    </div>
  );
}
