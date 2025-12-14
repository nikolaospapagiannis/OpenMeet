'use client';

import React, { useState, useEffect } from 'react';
import { Shield, Globe, CheckCircle, AlertCircle, Copy, RefreshCw, Info, Loader, X } from 'lucide-react';
import { Button } from '@/components/ui/button-v2';
import { CardGlass } from '@/components/ui/card-glass';
import { Badge } from '@/components/ui/badge';

interface Domain {
  id: string;
  domain: string;
  status: 'pending' | 'verified' | 'failed';
  verificationMethod: 'dns_txt' | 'meta_tag' | 'file';
  verificationToken: string;
  verificationRecord: string;
  addedAt: Date;
  verifiedAt?: Date;
  lastChecked?: Date;
  errorMessage?: string;
}

interface DomainVerificationProps {
  domains?: Domain[];
  onAddDomain: (domain: string) => Promise<Domain>;
  onRemoveDomain: (domainId: string) => Promise<void>;
  onVerifyDomain: (domainId: string) => Promise<boolean>;
  organizationId: string;
}

export const DomainVerification: React.FC<DomainVerificationProps> = ({
  domains = [],
  onAddDomain,
  onRemoveDomain,
  onVerifyDomain,
  organizationId
}) => {
  const [domainList, setDomainList] = useState<Domain[]>(domains);
  const [newDomain, setNewDomain] = useState('');
  const [isAdding, setIsAdding] = useState(false);
  const [verifyingDomain, setVerifyingDomain] = useState<string | null>(null);
  const [removingDomain, setRemovingDomain] = useState<string | null>(null);
  const [selectedDomain, setSelectedDomain] = useState<Domain | null>(null);
  const [showInstructions, setShowInstructions] = useState(false);
  const [error, setError] = useState('');

  useEffect(() => {
    setDomainList(domains);
  }, [domains]);

  const validateDomain = (domain: string): boolean => {
    const domainRegex = /^([a-z0-9]+(-[a-z0-9]+)*\.)+[a-z]{2,}$/i;
    return domainRegex.test(domain);
  };

  const handleAddDomain = async () => {
    if (!newDomain) {
      setError('Please enter a domain');
      return;
    }

    if (!validateDomain(newDomain)) {
      setError('Please enter a valid domain (e.g., example.com)');
      return;
    }

    if (domainList.some(d => d.domain === newDomain)) {
      setError('This domain has already been added');
      return;
    }

    setIsAdding(true);
    setError('');
    try {
      const domain = await onAddDomain(newDomain);
      setDomainList([...domainList, domain]);
      setNewDomain('');
      setSelectedDomain(domain);
      setShowInstructions(true);
    } catch (error) {
      setError((error as Error).message || 'Failed to add domain');
    } finally {
      setIsAdding(false);
    }
  };

  const handleVerifyDomain = async (domainId: string) => {
    setVerifyingDomain(domainId);
    try {
      const verified = await onVerifyDomain(domainId);
      if (verified) {
        setDomainList(domainList.map(d =>
          d.id === domainId
            ? { ...d, status: 'verified', verifiedAt: new Date() }
            : d
        ));
      } else {
        setDomainList(domainList.map(d =>
          d.id === domainId
            ? { ...d, status: 'failed', lastChecked: new Date(), errorMessage: 'Verification failed. Please check your DNS records.' }
            : d
        ));
      }
    } catch (error) {
      console.error('Failed to verify domain:', error);
    } finally {
      setVerifyingDomain(null);
    }
  };

  const handleRemoveDomain = async (domainId: string) => {
    setRemovingDomain(domainId);
    try {
      await onRemoveDomain(domainId);
      setDomainList(domainList.filter(d => d.id !== domainId));
      if (selectedDomain?.id === domainId) {
        setSelectedDomain(null);
        setShowInstructions(false);
      }
    } catch (error) {
      console.error('Failed to remove domain:', error);
    } finally {
      setRemovingDomain(null);
    }
  };

  const copyToClipboard = (text: string) => {
    navigator.clipboard.writeText(text);
  };

  const getStatusColor = (status: Domain['status']) => {
    switch (status) {
      case 'verified':
        return 'text-green-400 bg-green-500/10 border-green-500/30';
      case 'failed':
        return 'text-red-400 bg-red-500/10 border-red-500/30';
      default:
        return 'text-amber-400 bg-amber-500/10 border-amber-500/30';
    }
  };

  const getStatusIcon = (status: Domain['status']) => {
    switch (status) {
      case 'verified':
        return <CheckCircle className="w-4 h-4" />;
      case 'failed':
        return <AlertCircle className="w-4 h-4" />;
      default:
        return <Info className="w-4 h-4" />;
    }
  };

  const formatDate = (date?: Date) => {
    if (!date) return 'Never';
    return new Date(date).toLocaleString();
  };

  return (
    <div className="space-y-6">
      {/* Domain List */}
      <CardGlass variant="default" hover>
        <div className="flex items-center gap-2 mb-6">
          <Globe className="w-5 h-5 text-blue-400" />
          <h2 className="text-xl font-semibold text-white">Domain Verification</h2>
          <Badge variant="outline" className="ml-auto">
            {domainList.filter(d => d.status === 'verified').length}/{domainList.length} verified
          </Badge>
        </div>

        {/* Add Domain Form */}
        <div className="mb-6">
          <label className="block text-sm font-medium text-slate-300 mb-2">
            Add Domain
          </label>
          <div className="flex gap-2">
            <input
              type="text"
              value={newDomain}
              onChange={(e) => setNewDomain(e.target.value)}
              onKeyPress={(e) => e.key === 'Enter' && handleAddDomain()}
              placeholder="example.com"
              className="flex-1 px-4 py-3 rounded-xl bg-slate-800/50 border border-white/10 text-white placeholder:text-slate-500 focus:ring-2 focus:ring-blue-500/50 focus:border-blue-500/50 outline-none transition-all"
            />
            <Button
              variant="gradient-primary"
              size="default"
              onClick={handleAddDomain}
              disabled={isAdding}
            >
              {isAdding ? (
                <Loader className="w-4 h-4 animate-spin" />
              ) : (
                'Add Domain'
              )}
            </Button>
          </div>
          {error && (
            <p className="text-xs text-red-400 mt-2 flex items-center gap-1">
              <AlertCircle className="w-3 h-3" />
              {error}
            </p>
          )}
          <p className="text-xs text-slate-500 mt-2">
            Add domains that your users will use to sign in with SSO
          </p>
        </div>

        {/* Domain List */}
        <div className="space-y-3">
          {domainList.map(domain => (
            <div
              key={domain.id}
              className={`p-4 rounded-xl border ${
                selectedDomain?.id === domain.id ? 'bg-slate-800/50 border-blue-500/50' : 'bg-slate-800/30 border-white/5'
              } transition-all`}
            >
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-3">
                  <div className={`p-2 rounded-lg border ${getStatusColor(domain.status)}`}>
                    {getStatusIcon(domain.status)}
                  </div>
                  <div>
                    <div className="flex items-center gap-2">
                      <span className="font-medium text-white">{domain.domain}</span>
                      <Badge
                        variant={
                          domain.status === 'verified' ? 'success' :
                          domain.status === 'failed' ? 'destructive' :
                          'warning'
                        }
                      >
                        {domain.status}
                      </Badge>
                    </div>
                    <div className="text-xs text-slate-500 mt-1">
                      {domain.status === 'verified'
                        ? `Verified ${formatDate(domain.verifiedAt)}`
                        : domain.status === 'failed'
                        ? `Last checked ${formatDate(domain.lastChecked)}`
                        : 'Pending verification'}
                    </div>
                  </div>
                </div>
                <div className="flex items-center gap-2">
                  {domain.status !== 'verified' && (
                    <>
                      <Button
                        variant="ghost-glass"
                        size="sm"
                        onClick={() => {
                          setSelectedDomain(domain);
                          setShowInstructions(true);
                        }}
                      >
                        Setup
                      </Button>
                      <Button
                        variant="ghost-glass"
                        size="sm"
                        onClick={() => handleVerifyDomain(domain.id)}
                        disabled={verifyingDomain === domain.id}
                      >
                        {verifyingDomain === domain.id ? (
                          <RefreshCw className="w-4 h-4 animate-spin" />
                        ) : (
                          'Verify'
                        )}
                      </Button>
                    </>
                  )}
                  <Button
                    variant="ghost-glass"
                    size="sm"
                    onClick={() => handleRemoveDomain(domain.id)}
                    disabled={removingDomain === domain.id}
                  >
                    {removingDomain === domain.id ? (
                      <Loader className="w-4 h-4 animate-spin" />
                    ) : (
                      <X className="w-4 h-4" />
                    )}
                  </Button>
                </div>
              </div>
              {domain.errorMessage && (
                <div className="mt-3 p-2 rounded-lg bg-red-500/10 border border-red-500/30">
                  <p className="text-xs text-red-400">{domain.errorMessage}</p>
                </div>
              )}
            </div>
          ))}
        </div>

        {domainList.length === 0 && (
          <div className="text-center py-8">
            <Globe className="w-12 h-12 text-slate-600 mx-auto mb-3" />
            <p className="text-sm text-slate-400">No domains configured yet</p>
            <p className="text-xs text-slate-500 mt-1">Add a domain to enable SSO for your users</p>
          </div>
        )}
      </CardGlass>

      {/* Verification Instructions */}
      {showInstructions && selectedDomain && (
        <CardGlass variant="default" hover>
          <div className="flex items-center justify-between mb-6">
            <div className="flex items-center gap-2">
              <Shield className="w-5 h-5 text-purple-400" />
              <h3 className="text-lg font-semibold text-white">
                Verify {selectedDomain.domain}
              </h3>
            </div>
            <button
              onClick={() => setShowInstructions(false)}
              className="text-slate-400 hover:text-white transition-colors"
            >
              <X className="w-5 h-5" />
            </button>
          </div>

          <div className="space-y-4">
            {/* Verification Method */}
            <div className="p-4 rounded-xl bg-purple-500/10 border border-purple-500/30">
              <h4 className="text-sm font-semibold text-purple-300 mb-2">
                DNS TXT Record Verification
              </h4>
              <p className="text-xs text-slate-400 mb-3">
                Add the following TXT record to your domain's DNS settings:
              </p>

              <div className="space-y-3">
                <div>
                  <div className="text-xs font-medium text-slate-400 mb-1">Record Type:</div>
                  <code className="block px-3 py-2 rounded-lg bg-slate-900/50 border border-white/5 text-purple-300 text-xs">
                    TXT
                  </code>
                </div>

                <div>
                  <div className="text-xs font-medium text-slate-400 mb-1">Host/Name:</div>
                  <div className="flex items-center gap-2">
                    <code className="flex-1 px-3 py-2 rounded-lg bg-slate-900/50 border border-white/5 text-purple-300 text-xs">
                      _nebula-sso-verification
                    </code>
                    <Button variant="ghost-glass" size="sm" onClick={() => copyToClipboard('_nebula-sso-verification')}>
                      <Copy className="w-3 h-3" />
                    </Button>
                  </div>
                </div>

                <div>
                  <div className="text-xs font-medium text-slate-400 mb-1">Value/Data:</div>
                  <div className="flex items-center gap-2">
                    <code className="flex-1 px-3 py-2 rounded-lg bg-slate-900/50 border border-white/5 text-purple-300 text-xs break-all">
                      {selectedDomain.verificationToken}
                    </code>
                    <Button variant="ghost-glass" size="sm" onClick={() => copyToClipboard(selectedDomain.verificationToken)}>
                      <Copy className="w-3 h-3" />
                    </Button>
                  </div>
                </div>

                <div>
                  <div className="text-xs font-medium text-slate-400 mb-1">TTL:</div>
                  <code className="block px-3 py-2 rounded-lg bg-slate-900/50 border border-white/5 text-purple-300 text-xs">
                    3600 (or default)
                  </code>
                </div>
              </div>
            </div>

            {/* Instructions by Provider */}
            <div className="p-4 rounded-xl bg-slate-800/30 border border-white/5">
              <h4 className="text-sm font-semibold text-slate-200 mb-3">
                Instructions by DNS Provider
              </h4>
              <div className="space-y-2 text-xs text-slate-400">
                <details className="cursor-pointer">
                  <summary className="hover:text-white transition-colors">Cloudflare</summary>
                  <ol className="mt-2 ml-4 space-y-1 list-decimal">
                    <li>Log in to your Cloudflare account</li>
                    <li>Select your domain</li>
                    <li>Go to DNS → Records</li>
                    <li>Click "Add record"</li>
                    <li>Select TXT as the type</li>
                    <li>Enter "_nebula-sso-verification" as the name</li>
                    <li>Paste the verification token as the content</li>
                    <li>Click "Save"</li>
                  </ol>
                </details>

                <details className="cursor-pointer">
                  <summary className="hover:text-white transition-colors">GoDaddy</summary>
                  <ol className="mt-2 ml-4 space-y-1 list-decimal">
                    <li>Log in to your GoDaddy account</li>
                    <li>Go to "My Products"</li>
                    <li>Select "DNS" next to your domain</li>
                    <li>Click "Add" in the Records section</li>
                    <li>Select TXT for Type</li>
                    <li>Enter "_nebula-sso-verification" for Host</li>
                    <li>Paste the verification token for Value</li>
                    <li>Click "Save"</li>
                  </ol>
                </details>

                <details className="cursor-pointer">
                  <summary className="hover:text-white transition-colors">AWS Route 53</summary>
                  <ol className="mt-2 ml-4 space-y-1 list-decimal">
                    <li>Sign in to AWS Console</li>
                    <li>Go to Route 53</li>
                    <li>Select your hosted zone</li>
                    <li>Click "Create record"</li>
                    <li>Enter "_nebula-sso-verification" for Record name</li>
                    <li>Select TXT for Record type</li>
                    <li>Paste the verification token in Value</li>
                    <li>Click "Create records"</li>
                  </ol>
                </details>
              </div>
            </div>

            {/* Verification Note */}
            <div className="p-4 rounded-xl bg-blue-500/10 border border-blue-500/30">
              <div className="flex items-start gap-3">
                <Info className="w-4 h-4 text-blue-400 flex-shrink-0 mt-0.5" />
                <div className="text-xs text-slate-400">
                  <p>DNS changes can take up to 48 hours to propagate, but usually complete within a few minutes.</p>
                  <p className="mt-2">Once you've added the record, click the "Verify" button to check the status.</p>
                </div>
              </div>
            </div>

            {/* Actions */}
            <div className="flex gap-3">
              <Button
                variant="gradient-primary"
                size="default"
                onClick={() => handleVerifyDomain(selectedDomain.id)}
                disabled={verifyingDomain === selectedDomain.id}
              >
                {verifyingDomain === selectedDomain.id ? (
                  <>
                    <RefreshCw className="w-4 h-4 mr-2 animate-spin" />
                    Verifying...
                  </>
                ) : (
                  'Verify Domain'
                )}
              </Button>
              <Button
                variant="ghost-glass"
                size="default"
                onClick={() => setShowInstructions(false)}
              >
                Close
              </Button>
            </div>
          </div>
        </CardGlass>
      )}
    </div>
  );
};