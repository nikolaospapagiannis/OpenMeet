'use client';

import { useState, useCallback } from 'react';
import { X, Upload, Download, Users, Info } from 'lucide-react';
import { Button } from '@/components/ui/button-v2';
import { CardGlass } from '@/components/ui/card-glass';

interface BulkInviteModalProps {
  isOpen: boolean;
  onClose: () => void;
  onInvite: (csvData: string, defaultRole?: string) => Promise<any>;
}

export function BulkInviteModal({ isOpen, onClose, onInvite }: BulkInviteModalProps) {
  const [csvContent, setCsvContent] = useState('');
  const [defaultRole, setDefaultRole] = useState<'user' | 'admin'>('user');
  const [isProcessing, setIsProcessing] = useState(false);
  const [results, setResults] = useState<any>(null);

  const sampleCSV = `email,role
john.doe@company.com,admin
jane.smith@company.com,user
mike.jones@company.com,user`;

  const handleFileUpload = useCallback((event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (!file) return;

    const reader = new FileReader();
    reader.onload = (e) => {
      const content = e.target?.result as string;
      setCsvContent(content);
    };
    reader.readAsText(file);
  }, []);

  const handleSubmit = async () => {
    if (!csvContent.trim()) return;

    setIsProcessing(true);
    setResults(null);

    try {
      const result = await onInvite(csvContent, defaultRole);
      if (result.success) {
        setResults(result.data.results);
        if (result.data.results.sent.length > 0 && !result.data.results.failed.length) {
          setTimeout(() => {
            onClose();
          }, 3000);
        }
      }
    } catch (error) {
      console.error('Bulk invite error:', error);
    } finally {
      setIsProcessing(false);
    }
  };

  const downloadTemplate = () => {
    const blob = new Blob([sampleCSV], { type: 'text/csv' });
    const url = window.URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = 'team-invite-template.csv';
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    window.URL.revokeObjectURL(url);
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm">
      <CardGlass variant="elevated" gradient className="w-full max-w-2xl max-h-[90vh] overflow-hidden">
        <div className="flex items-center justify-between p-6 border-b border-white/10">
          <div className="flex items-center gap-3">
            <Users className="w-5 h-5 text-teal-400" />
            <h2 className="text-xl font-semibold text-white">Bulk Invite Team Members</h2>
          </div>
          <button
            onClick={onClose}
            className="p-2 rounded-lg hover:bg-white/5 transition-colors"
            disabled={isProcessing}
          >
            <X className="w-5 h-5 text-slate-400" />
          </button>
        </div>

        <div className="p-6 space-y-6 overflow-y-auto max-h-[calc(90vh-180px)]">
          <div className="space-y-4">
            <div className="flex items-start gap-3 p-4 rounded-xl bg-blue-500/10 border border-blue-500/20">
              <Info className="w-5 h-5 text-blue-400 mt-0.5" />
              <div className="flex-1 space-y-2">
                <p className="text-sm text-blue-200">
                  Upload a CSV file with email addresses and optional roles to invite multiple team members at once.
                </p>
                <p className="text-xs text-blue-300/70">
                  CSV format: email (required), role (optional - defaults to selected role below)
                </p>
              </div>
            </div>

            <div className="space-y-2">
              <label className="block text-sm font-medium text-slate-300">
                Default Role for Invitees
              </label>
              <select
                value={defaultRole}
                onChange={(e) => setDefaultRole(e.target.value as 'user' | 'admin')}
                className="w-full px-4 py-2 rounded-lg bg-slate-800/50 border border-white/10 text-white focus:ring-2 focus:ring-teal-500/50 focus:border-teal-500/50"
                disabled={isProcessing}
              >
                <option value="user">Member</option>
                <option value="admin">Admin</option>
              </select>
              <p className="text-xs text-slate-500">
                This role will be used if not specified in the CSV
              </p>
            </div>

            <div className="space-y-2">
              <label className="block text-sm font-medium text-slate-300">
                CSV Content
              </label>
              <textarea
                value={csvContent}
                onChange={(e) => setCsvContent(e.target.value)}
                placeholder="Paste CSV content or upload a file..."
                className="w-full h-48 px-4 py-3 rounded-lg bg-slate-800/50 border border-white/10 text-white placeholder:text-slate-500 focus:ring-2 focus:ring-teal-500/50 focus:border-teal-500/50 font-mono text-sm"
                disabled={isProcessing}
              />
            </div>

            <div className="flex gap-3">
              <div className="relative">
                <input
                  type="file"
                  accept=".csv"
                  onChange={handleFileUpload}
                  className="absolute inset-0 w-full h-full opacity-0 cursor-pointer"
                  disabled={isProcessing}
                />
                <Button variant="ghost-glass" size="default" disabled={isProcessing}>
                  <Upload className="w-4 h-4 mr-2" />
                  Upload CSV
                </Button>
              </div>

              <Button
                variant="ghost-glass"
                size="default"
                onClick={downloadTemplate}
                disabled={isProcessing}
              >
                <Download className="w-4 h-4 mr-2" />
                Download Template
              </Button>
            </div>
          </div>

          {results && (
            <div className="space-y-3 p-4 rounded-xl bg-slate-800/30 border border-white/5">
              <h3 className="text-sm font-medium text-slate-300">Processing Results</h3>

              {results.sent?.length > 0 && (
                <div className="space-y-1">
                  <p className="text-sm text-green-400">
                    ✓ {results.sent.length} invitation(s) sent successfully
                  </p>
                  <div className="text-xs text-slate-500 max-h-20 overflow-y-auto">
                    {results.sent.join(', ')}
                  </div>
                </div>
              )}

              {results.existing?.length > 0 && (
                <div className="space-y-1">
                  <p className="text-sm text-yellow-400">
                    ⚠ {results.existing.length} user(s) already in organization
                  </p>
                  <div className="text-xs text-slate-500 max-h-20 overflow-y-auto">
                    {results.existing.join(', ')}
                  </div>
                </div>
              )}

              {results.failed?.length > 0 && (
                <div className="space-y-1">
                  <p className="text-sm text-red-400">
                    ✗ {results.failed.length} invitation(s) failed
                  </p>
                  <div className="text-xs text-slate-500 max-h-20 overflow-y-auto space-y-1">
                    {results.failed.map((f: any, i: number) => (
                      <div key={i}>{f.email}: {f.error}</div>
                    ))}
                  </div>
                </div>
              )}
            </div>
          )}
        </div>

        <div className="flex justify-end gap-3 p-6 border-t border-white/10">
          <Button
            variant="ghost-glass"
            size="default"
            onClick={onClose}
            disabled={isProcessing}
          >
            Cancel
          </Button>
          <Button
            variant="gradient-primary"
            size="default"
            onClick={handleSubmit}
            disabled={!csvContent.trim() || isProcessing}
          >
            {isProcessing ? 'Processing...' : 'Send Invitations'}
          </Button>
        </div>
      </CardGlass>
    </div>
  );
}