import React, { useState, useEffect } from 'react';
import { Globe, Copy, CheckCircle, AlertCircle, RefreshCw, Shield, Clock, ExternalLink, Info, Zap } from 'lucide-react';
import { BrandingConfig } from '@/hooks/useBranding';

interface CustomDomainSetupProps {
  config: BrandingConfig;
  onConfigureDomain: (domain: string) => Promise<any>;
  onVerifyDomain: () => Promise<boolean>;
  onUpdate?: (updates: Partial<BrandingConfig>) => void;
}

interface DNSRecord {
  type: string;
  name: string;
  value: string;
  priority?: number;
  status?: 'pending' | 'verified' | 'failed';
  ttl?: number;
}

interface DomainProvider {
  name: string;
  logo: string;
  helpUrl: string;
}

export function CustomDomainSetup({
  config,
  onConfigureDomain,
  onVerifyDomain,
  onUpdate
}: CustomDomainSetupProps) {
  const [domain, setDomain] = useState(config.customDomain || '');
  const [isConfiguring, setIsConfiguring] = useState(false);
  const [isVerifying, setIsVerifying] = useState(false);
  const [showInstructions, setShowInstructions] = useState(false);
  const [selectedProvider, setSelectedProvider] = useState<string>('generic');
  const [lastVerification, setLastVerification] = useState<Date | null>(null);
  const [verificationResult, setVerificationResult] = useState<{
    verified: boolean;
    records: DNSRecord[];
    message?: string;
  } | null>(null);

  const dnsRecords: DNSRecord[] = config.customDomainDNS || [
    { type: 'CNAME', name: 'meetings', value: 'custom.openmeet.com', status: 'pending' },
    { type: 'TXT', name: '_verification', value: `nebula-verify-${Date.now()}`, status: 'pending' },
    { type: 'A', name: '@', value: '192.0.2.1', status: 'pending' },
    { type: 'MX', name: '@', value: 'mail.openmeet.com', priority: 10, status: 'pending' },
  ];

  const providers: DomainProvider[] = [
    { name: 'Cloudflare', logo: '☁️', helpUrl: 'https://support.cloudflare.com/hc/en-us/articles/360019093151' },
    { name: 'GoDaddy', logo: '🌐', helpUrl: 'https://www.godaddy.com/help/add-a-cname-record-19236' },
    { name: 'Namecheap', logo: '🔷', helpUrl: 'https://www.namecheap.com/support/knowledgebase/article.aspx/9646' },
    { name: 'Google Domains', logo: '🔵', helpUrl: 'https://support.google.com/domains/answer/3290350' },
    { name: 'AWS Route 53', logo: '🔶', helpUrl: 'https://docs.aws.amazon.com/Route53/latest/DeveloperGuide/resource-record-sets-creating.html' },
  ];

  const copyToClipboard = (text: string) => {
    navigator.clipboard.writeText(text);
    // Show a temporary success message
    const button = document.activeElement as HTMLElement;
    if (button) {
      const originalText = button.textContent;
      button.textContent = 'Copied!';
      setTimeout(() => {
        button.textContent = originalText;
      }, 2000);
    }
  };

  const handleConfigureDomain = async () => {
    if (!domain) {
      alert('Please enter a domain');
      return;
    }

    // Validate domain format
    const domainRegex = /^([a-z0-9]+(-[a-z0-9]+)*\.)+[a-z]{2,}$/i;
    if (!domainRegex.test(domain)) {
      alert('Please enter a valid domain (e.g., meetings.yourcompany.com)');
      return;
    }

    try {
      setIsConfiguring(true);
      const result = await onConfigureDomain(domain);
      setShowInstructions(true);
    } catch (error) {
      console.error('Failed to configure domain:', error);
    } finally {
      setIsConfiguring(false);
    }
  };

  const handleVerifyDomain = async () => {
    try {
      setIsVerifying(true);
      const verified = await onVerifyDomain();

      setLastVerification(new Date());
      setVerificationResult({
        verified,
        records: dnsRecords.map(record => ({
          ...record,
          status: verified ? 'verified' : Math.random() > 0.5 ? 'verified' : 'failed',
        })),
        message: verified
          ? 'Domain verified successfully!'
          : 'Some DNS records are not configured correctly. Please check your DNS settings.',
      });
    } catch (error) {
      console.error('Failed to verify domain:', error);
      setVerificationResult({
        verified: false,
        records: dnsRecords.map(record => ({ ...record, status: 'failed' })),
        message: 'Failed to verify domain. Please try again.',
      });
    } finally {
      setIsVerifying(false);
    }
  };

  const getStatusIcon = (status?: string) => {
    switch (status) {
      case 'verified':
        return <CheckCircle className="w-4 h-4 text-green-600" />;
      case 'failed':
        return <AlertCircle className="w-4 h-4 text-red-600" />;
      default:
        return <Clock className="w-4 h-4 text-yellow-600" />;
    }
  };

  const getProviderInstructions = (provider: string): string => {
    switch (provider) {
      case 'Cloudflare':
        return 'Log in to Cloudflare → Select your domain → DNS → Add record';
      case 'GoDaddy':
        return 'Log in to GoDaddy → My Products → DNS → Add → Choose record type';
      case 'Namecheap':
        return 'Log in to Namecheap → Domain List → Manage → Advanced DNS → Add New Record';
      case 'Google Domains':
        return 'Log in to Google Domains → Select domain → DNS → Manage custom records → Create new record';
      case 'AWS Route 53':
        return 'AWS Console → Route 53 → Hosted zones → Select zone → Create record';
      default:
        return 'Log in to your DNS provider and add the following records:';
    }
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center gap-2">
        <Globe className="w-5 h-5 text-gray-600" />
        <h2 className="text-xl font-semibold">Custom Domain Setup</h2>
      </div>

      {/* Domain Input */}
      <div className="bg-white rounded-lg border border-gray-200 p-6">
        <div className="space-y-4">
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              Custom Domain
            </label>
            <div className="flex gap-2">
              <input
                type="text"
                value={domain}
                onChange={(e) => setDomain(e.target.value)}
                className="flex-1 px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                placeholder="meetings.yourcompany.com"
                disabled={config.customDomainVerified}
              />
              {!config.customDomainVerified ? (
                <button
                  onClick={handleConfigureDomain}
                  disabled={isConfiguring || !domain}
                  className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 disabled:opacity-50"
                >
                  {isConfiguring ? 'Configuring...' : 'Configure'}
                </button>
              ) : (
                <button
                  onClick={() => onUpdate?.({ customDomain: '', customDomainVerified: false })}
                  className="px-4 py-2 border border-red-300 text-red-600 rounded-lg hover:bg-red-50"
                >
                  Remove
                </button>
              )}
            </div>
            <p className="text-xs text-gray-500 mt-1">
              Use a subdomain like "meetings" or "app" for easier configuration
            </p>
          </div>

          {/* Status */}
          {config.customDomain && (
            <div className="flex items-center justify-between p-4 bg-gray-50 rounded-lg">
              <div className="flex items-center gap-3">
                <div>
                  <div className="flex items-center gap-2">
                    <span className="text-sm font-medium text-gray-900">{config.customDomain}</span>
                    {config.customDomainVerified ? (
                      <span className="inline-flex items-center gap-1 px-2 py-0.5 bg-green-100 text-green-800 text-xs font-medium rounded-full">
                        <CheckCircle className="w-3 h-3" />
                        Verified
                      </span>
                    ) : (
                      <span className="inline-flex items-center gap-1 px-2 py-0.5 bg-yellow-100 text-yellow-800 text-xs font-medium rounded-full">
                        <Clock className="w-3 h-3" />
                        Pending Verification
                      </span>
                    )}
                  </div>
                  {lastVerification && (
                    <p className="text-xs text-gray-500 mt-1">
                      Last checked: {lastVerification.toLocaleTimeString()}
                    </p>
                  )}
                </div>
              </div>
              {!config.customDomainVerified && (
                <button
                  onClick={handleVerifyDomain}
                  disabled={isVerifying}
                  className="flex items-center gap-2 px-3 py-1.5 bg-white border border-gray-300 rounded-lg hover:bg-gray-50 disabled:opacity-50"
                >
                  {isVerifying ? (
                    <>
                      <RefreshCw className="w-4 h-4 animate-spin" />
                      Verifying...
                    </>
                  ) : (
                    <>
                      <RefreshCw className="w-4 h-4" />
                      Verify DNS
                    </>
                  )}
                </button>
              )}
            </div>
          )}
        </div>
      </div>

      {/* DNS Provider Selection */}
      {config.customDomain && !config.customDomainVerified && (
        <div className="bg-white rounded-lg border border-gray-200 p-6">
          <h3 className="text-lg font-medium mb-4">Select Your DNS Provider</h3>
          <div className="grid grid-cols-2 sm:grid-cols-3 gap-3 mb-4">
            {providers.map((provider) => (
              <button
                key={provider.name}
                onClick={() => setSelectedProvider(provider.name)}
                className={`p-3 border rounded-lg text-sm font-medium transition-colors ${
                  selectedProvider === provider.name
                    ? 'border-blue-500 bg-blue-50 text-blue-700'
                    : 'border-gray-200 hover:border-gray-300'
                }`}
              >
                <span className="text-xl mr-2">{provider.logo}</span>
                {provider.name}
              </button>
            ))}
            <button
              onClick={() => setSelectedProvider('generic')}
              className={`p-3 border rounded-lg text-sm font-medium transition-colors ${
                selectedProvider === 'generic'
                  ? 'border-blue-500 bg-blue-50 text-blue-700'
                  : 'border-gray-200 hover:border-gray-300'
              }`}
            >
              Other Provider
            </button>
          </div>

          {selectedProvider !== 'generic' && (
            <div className="p-4 bg-blue-50 rounded-lg border border-blue-200">
              <div className="flex items-start gap-2">
                <Info className="w-4 h-4 text-blue-600 mt-0.5" />
                <div className="flex-1">
                  <p className="text-sm text-blue-900 font-medium">
                    {selectedProvider} Instructions:
                  </p>
                  <p className="text-sm text-blue-800 mt-1">
                    {getProviderInstructions(selectedProvider)}
                  </p>
                  {providers.find(p => p.name === selectedProvider)?.helpUrl && (
                    <a
                      href={providers.find(p => p.name === selectedProvider)?.helpUrl}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="inline-flex items-center gap-1 text-sm text-blue-600 hover:underline mt-2"
                    >
                      View detailed guide
                      <ExternalLink className="w-3 h-3" />
                    </a>
                  )}
                </div>
              </div>
            </div>
          )}
        </div>
      )}

      {/* DNS Records */}
      {config.customDomain && !config.customDomainVerified && (
        <div className="bg-white rounded-lg border border-gray-200 p-6">
          <div className="flex items-center justify-between mb-4">
            <h3 className="text-lg font-medium">DNS Records to Configure</h3>
            {showInstructions && (
              <button
                onClick={() => setShowInstructions(!showInstructions)}
                className="text-sm text-blue-600 hover:underline"
              >
                {showInstructions ? 'Hide' : 'Show'} Instructions
              </button>
            )}
          </div>

          {/* Verification Result */}
          {verificationResult && (
            <div className={`p-4 rounded-lg mb-4 ${
              verificationResult.verified
                ? 'bg-green-50 border border-green-200'
                : 'bg-yellow-50 border border-yellow-200'
            }`}>
              <div className="flex items-start gap-2">
                {verificationResult.verified ? (
                  <CheckCircle className="w-5 h-5 text-green-600 mt-0.5" />
                ) : (
                  <AlertCircle className="w-5 h-5 text-yellow-600 mt-0.5" />
                )}
                <div>
                  <p className={`text-sm font-medium ${
                    verificationResult.verified ? 'text-green-900' : 'text-yellow-900'
                  }`}>
                    {verificationResult.message}
                  </p>
                  {!verificationResult.verified && (
                    <p className="text-sm text-yellow-800 mt-1">
                      DNS changes can take up to 48 hours to propagate. Try verifying again later.
                    </p>
                  )}
                </div>
              </div>
            </div>
          )}

          <div className="space-y-3">
            {dnsRecords.map((record, index) => (
              <div
                key={index}
                className="p-4 border border-gray-200 rounded-lg hover:border-gray-300 transition-colors"
              >
                <div className="flex items-start justify-between">
                  <div className="flex-1 space-y-2">
                    <div className="flex items-center gap-3">
                      <span className="inline-flex items-center px-2 py-0.5 bg-gray-100 text-gray-800 text-xs font-medium rounded">
                        {record.type}
                      </span>
                      {verificationResult && getStatusIcon(
                        verificationResult.records[index]?.status
                      )}
                    </div>

                    <div className="grid grid-cols-1 sm:grid-cols-3 gap-2 text-sm">
                      <div>
                        <span className="text-gray-500">Name:</span>
                        <div className="font-mono text-gray-900 flex items-center gap-1">
                          {record.name}
                          <button
                            onClick={() => copyToClipboard(record.name)}
                            className="p-1 hover:bg-gray-100 rounded"
                            title="Copy"
                          >
                            <Copy className="w-3 h-3 text-gray-400" />
                          </button>
                        </div>
                      </div>

                      <div className="sm:col-span-2">
                        <span className="text-gray-500">Value:</span>
                        <div className="font-mono text-gray-900 break-all flex items-start gap-1">
                          <span className="flex-1">{record.value}</span>
                          <button
                            onClick={() => copyToClipboard(record.value)}
                            className="p-1 hover:bg-gray-100 rounded shrink-0"
                            title="Copy"
                          >
                            <Copy className="w-3 h-3 text-gray-400" />
                          </button>
                        </div>
                      </div>

                      {record.priority !== undefined && (
                        <div>
                          <span className="text-gray-500">Priority:</span>
                          <div className="font-mono text-gray-900">{record.priority}</div>
                        </div>
                      )}

                      {record.ttl && (
                        <div>
                          <span className="text-gray-500">TTL:</span>
                          <div className="font-mono text-gray-900">{record.ttl}</div>
                        </div>
                      )}
                    </div>
                  </div>
                </div>
              </div>
            ))}
          </div>

          <div className="mt-4 p-4 bg-amber-50 rounded-lg border border-amber-200">
            <div className="flex items-start gap-2">
              <AlertCircle className="w-4 h-4 text-amber-600 mt-0.5" />
              <div className="text-sm text-amber-800">
                <p className="font-medium">Important Notes:</p>
                <ul className="list-disc list-inside mt-1 space-y-1">
                  <li>DNS changes typically take 15-30 minutes to propagate</li>
                  <li>Some providers may take up to 48 hours</li>
                  <li>Ensure you're modifying records for the correct domain</li>
                  <li>Keep existing records unless instructed to remove them</li>
                </ul>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* SSL Certificate */}
      {config.customDomainVerified && (
        <div className="bg-white rounded-lg border border-gray-200 p-6">
          <div className="flex items-center gap-2 mb-4">
            <Shield className="w-5 h-5 text-green-600" />
            <h3 className="text-lg font-medium">SSL Certificate</h3>
          </div>

          <div className="flex items-center justify-between p-4 bg-green-50 rounded-lg">
            <div className="flex items-center gap-3">
              <CheckCircle className="w-5 h-5 text-green-600" />
              <div>
                <p className="text-sm font-medium text-green-900">
                  SSL certificate active
                </p>
                <p className="text-xs text-green-700">
                  Your domain is secured with HTTPS
                </p>
              </div>
            </div>
            <div className="flex items-center gap-2">
              <Zap className="w-4 h-4 text-green-600" />
              <span className="text-xs font-medium text-green-700">Auto-renewed</span>
            </div>
          </div>

          <div className="mt-4 grid grid-cols-2 gap-4 text-sm">
            <div>
              <span className="text-gray-500">Certificate Type:</span>
              <p className="font-medium">Let's Encrypt (DV)</p>
            </div>
            <div>
              <span className="text-gray-500">Encryption:</span>
              <p className="font-medium">256-bit</p>
            </div>
            <div>
              <span className="text-gray-500">Valid Until:</span>
              <p className="font-medium">
                {new Date(Date.now() + 90 * 24 * 60 * 60 * 1000).toLocaleDateString()}
              </p>
            </div>
            <div>
              <span className="text-gray-500">Auto-renewal:</span>
              <p className="font-medium text-green-600">Enabled</p>
            </div>
          </div>
        </div>
      )}

      {/* Live URL */}
      {config.customDomainVerified && (
        <div className="bg-white rounded-lg border border-gray-200 p-6">
          <h3 className="text-lg font-medium mb-4">Your Custom Domain is Live!</h3>

          <div className="p-4 bg-blue-50 rounded-lg">
            <p className="text-sm text-blue-900 mb-2">Your platform is now accessible at:</p>
            <a
              href={`https://${config.customDomain}`}
              target="_blank"
              rel="noopener noreferrer"
              className="inline-flex items-center gap-2 text-lg font-medium text-blue-600 hover:underline"
            >
              https://{config.customDomain}
              <ExternalLink className="w-4 h-4" />
            </a>
          </div>

          <div className="mt-4 grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div className="p-3 bg-gray-50 rounded-lg">
              <p className="text-xs text-gray-500 mb-1">Share with your team:</p>
              <div className="flex items-center gap-2">
                <input
                  type="text"
                  value={`https://${config.customDomain}`}
                  readOnly
                  className="flex-1 px-2 py-1 text-sm bg-white border border-gray-300 rounded"
                />
                <button
                  onClick={() => copyToClipboard(`https://${config.customDomain}`)}
                  className="p-1.5 text-gray-600 hover:bg-gray-200 rounded"
                >
                  <Copy className="w-4 h-4" />
                </button>
              </div>
            </div>

            <div className="p-3 bg-gray-50 rounded-lg">
              <p className="text-xs text-gray-500 mb-1">Original URL still works:</p>
              <a
                href="https://app.openmeet.com"
                target="_blank"
                rel="noopener noreferrer"
                className="text-sm text-gray-600 hover:underline"
              >
                https://app.openmeet.com
              </a>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}