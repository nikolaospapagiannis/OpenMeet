'use client';

import Navigation from '@/components/Navigation';
import Footer from '@/components/Footer';
import {
  Cloud,
  FolderOpen,
  Download,
  Upload,
  CheckCircle,
  ArrowRight,
  Shield,
  RefreshCw,
  HardDrive,
  Lock
} from 'lucide-react';

const storageIntegrations = [
  {
    name: 'Google Drive',
    description: 'Store recordings and transcripts in Google Drive',
    logo: '/integrations/google-drive-logo.svg',
    features: [
      'Auto-organize files',
      'Shared drives',
      'Team folders',
      'Version control'
    ],
    setupSteps: [
      'Connect Google account',
      'Select destination folder',
      'Configure permissions'
    ]
  },
  {
    name: 'Dropbox',
    description: 'Sync meeting content to Dropbox for Business',
    logo: '/integrations/dropbox-logo.svg',
    features: [
      'Smart sync',
      'Team spaces',
      'File recovery',
      'Link sharing'
    ],
    setupSteps: [
      'Authorize Dropbox',
      'Choose folder structure',
      'Set sync preferences'
    ]
  },
  {
    name: 'OneDrive',
    description: 'Enterprise storage with Microsoft OneDrive',
    logo: '/integrations/onedrive-logo.svg',
    features: [
      'SharePoint sync',
      'Compliance tools',
      'Advanced security',
      'Co-authoring'
    ],
    setupSteps: [
      'Sign in with Microsoft',
      'Select library',
      'Enable auto-upload'
    ]
  },
  {
    name: 'Box',
    description: 'Secure content management with Box',
    logo: '/integrations/box-logo.svg',
    features: [
      'Enterprise security',
      'Workflow automation',
      'Retention policies',
      'eSignature ready'
    ],
    setupSteps: [
      'Connect Box account',
      'Configure security',
      'Map folders'
    ]
  }
];

export default function StorageIntegrationsPage() {
  return (
    <div className="min-h-screen bg-[var(--ff-bg-dark)]">
      <Navigation />

      <main className="pt-24 pb-16">
        {/* Hero Section */}
        <section className="px-6 lg:px-8 max-w-7xl mx-auto mb-20">
          <div className="text-center max-w-3xl mx-auto">
            <div className="inline-flex items-center justify-center w-16 h-16 bg-[var(--ff-purple-500)]/10 rounded-2xl mb-6">
              <Cloud className="w-8 h-8 text-[var(--ff-purple-500)]" />
            </div>
            <h1 className="text-5xl font-bold text-[var(--ff-text-primary)] mb-6">
              Cloud Storage Integrations
            </h1>
            <p className="text-xl text-[var(--ff-text-secondary)] leading-relaxed">
              Automatically backup and organize your meeting recordings and transcripts
              in your preferred cloud storage platform.
            </p>
          </div>
        </section>

        {/* Benefits Section */}
        <section className="px-6 lg:px-8 max-w-7xl mx-auto mb-20">
          <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
            <div className="bg-[var(--ff-bg-layer)] border border-[var(--ff-border)] rounded-xl p-6">
              <div className="w-12 h-12 bg-[var(--ff-purple-500)]/10 rounded-xl flex items-center justify-center mb-4">
                <Shield className="w-6 h-6 text-[var(--ff-purple-500)]" />
              </div>
              <h3 className="text-lg font-semibold text-[var(--ff-text-primary)] mb-2">
                Secure Backup
              </h3>
              <p className="text-[var(--ff-text-secondary)]">
                Automatic backup with enterprise-grade encryption
              </p>
            </div>
            <div className="bg-[var(--ff-bg-layer)] border border-[var(--ff-border)] rounded-xl p-6">
              <div className="w-12 h-12 bg-[var(--ff-purple-500)]/10 rounded-xl flex items-center justify-center mb-4">
                <FolderOpen className="w-6 h-6 text-[var(--ff-purple-500)]" />
              </div>
              <h3 className="text-lg font-semibold text-[var(--ff-text-primary)] mb-2">
                Smart Organization
              </h3>
              <p className="text-[var(--ff-text-secondary)]">
                Auto-organize by date, project, or custom rules
              </p>
            </div>
            <div className="bg-[var(--ff-bg-layer)] border border-[var(--ff-border)] rounded-xl p-6">
              <div className="w-12 h-12 bg-[var(--ff-purple-500)]/10 rounded-xl flex items-center justify-center mb-4">
                <RefreshCw className="w-6 h-6 text-[var(--ff-purple-500)]" />
              </div>
              <h3 className="text-lg font-semibold text-[var(--ff-text-primary)] mb-2">
                Real-time Sync
              </h3>
              <p className="text-[var(--ff-text-secondary)]">
                Instant upload after meeting processing completes
              </p>
            </div>
          </div>
        </section>

        {/* Integrations Grid */}
        <section className="px-6 lg:px-8 max-w-7xl mx-auto">
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
            {storageIntegrations.map((integration, index) => (
              <div
                key={index}
                className="bg-[var(--ff-bg-layer)] border border-[var(--ff-border)] rounded-2xl p-8 hover:border-[var(--ff-purple-500)]/50 transition-colors"
              >
                <div className="flex items-start gap-6 mb-6">
                  <div className="w-16 h-16 bg-white/5 rounded-xl flex items-center justify-center">
                    <HardDrive className="w-8 h-8 text-[var(--ff-purple-500)]" />
                  </div>
                  <div className="flex-1">
                    <h3 className="text-2xl font-bold text-[var(--ff-text-primary)] mb-2">
                      {integration.name}
                    </h3>
                    <p className="text-[var(--ff-text-secondary)]">
                      {integration.description}
                    </p>
                  </div>
                </div>

                {/* Features */}
                <div className="mb-6">
                  <h4 className="text-sm font-semibold text-[var(--ff-text-primary)] uppercase tracking-wider mb-4">
                    Key Features
                  </h4>
                  <div className="grid grid-cols-2 gap-3">
                    {integration.features.map((feature, idx) => (
                      <div key={idx} className="flex items-center gap-2">
                        <CheckCircle className="w-4 h-4 text-[var(--ff-purple-500)]" />
                        <span className="text-sm text-[var(--ff-text-secondary)]">
                          {feature}
                        </span>
                      </div>
                    ))}
                  </div>
                </div>

                {/* Setup Steps */}
                <div className="mb-6">
                  <h4 className="text-sm font-semibold text-[var(--ff-text-primary)] uppercase tracking-wider mb-4">
                    Quick Setup
                  </h4>
                  <div className="space-y-3">
                    {integration.setupSteps.map((step, idx) => (
                      <div key={idx} className="flex items-center gap-3">
                        <div className="w-6 h-6 bg-[var(--ff-purple-500)]/20 rounded-full flex items-center justify-center flex-shrink-0">
                          <span className="text-xs text-[var(--ff-purple-500)] font-semibold">
                            {idx + 1}
                          </span>
                        </div>
                        <span className="text-sm text-[var(--ff-text-secondary)]">
                          {step}
                        </span>
                      </div>
                    ))}
                  </div>
                </div>

                {/* CTA Button */}
                <button className="w-full bg-[var(--ff-purple-500)] hover:bg-[var(--ff-purple-600)] text-white font-semibold py-3 px-6 rounded-xl transition-colors flex items-center justify-center gap-2 group">
                  Connect {integration.name}
                  <ArrowRight className="w-4 h-4 group-hover:translate-x-1 transition-transform" />
                </button>
              </div>
            ))}
          </div>
        </section>

        {/* Storage Features Section */}
        <section className="px-6 lg:px-8 max-w-7xl mx-auto mt-20">
          <div className="bg-[var(--ff-bg-layer)] border border-[var(--ff-border)] rounded-2xl p-12">
            <h2 className="text-3xl font-bold text-[var(--ff-text-primary)] mb-12 text-center">
              Advanced Storage Features
            </h2>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-12">
              {/* File Organization */}
              <div>
                <div className="flex items-center gap-3 mb-4">
                  <div className="w-10 h-10 bg-[var(--ff-purple-500)]/10 rounded-xl flex items-center justify-center">
                    <FolderOpen className="w-5 h-5 text-[var(--ff-purple-500)]" />
                  </div>
                  <h3 className="text-xl font-semibold text-[var(--ff-text-primary)]">
                    Smart File Organization
                  </h3>
                </div>
                <div className="space-y-3 ml-13">
                  <div className="bg-[var(--ff-bg-dark)]/50 rounded-lg p-3 border border-[var(--ff-border)]">
                    <p className="text-sm text-[var(--ff-text-secondary)]">
                      <span className="text-[var(--ff-purple-500)]">/2024/Q1/Sales/</span>
                      Weekly_Standup_Jan_15.mp4
                    </p>
                  </div>
                  <div className="bg-[var(--ff-bg-dark)]/50 rounded-lg p-3 border border-[var(--ff-border)]">
                    <p className="text-sm text-[var(--ff-text-secondary)]">
                      <span className="text-[var(--ff-purple-500)]">/Projects/Alpha/</span>
                      Design_Review_Meeting.pdf
                    </p>
                  </div>
                  <p className="text-sm text-[var(--ff-text-secondary)] mt-4">
                    Automatically organize files by date, project, team, or custom rules
                  </p>
                </div>
              </div>

              {/* File Formats */}
              <div>
                <div className="flex items-center gap-3 mb-4">
                  <div className="w-10 h-10 bg-[var(--ff-purple-500)]/10 rounded-xl flex items-center justify-center">
                    <Download className="w-5 h-5 text-[var(--ff-purple-500)]" />
                  </div>
                  <h3 className="text-xl font-semibold text-[var(--ff-text-primary)]">
                    Multiple Export Formats
                  </h3>
                </div>
                <div className="grid grid-cols-2 gap-3 ml-13">
                  <div className="bg-[var(--ff-bg-dark)]/50 rounded-lg p-3 border border-[var(--ff-border)]">
                    <p className="text-sm font-semibold text-[var(--ff-text-primary)] mb-1">MP4 Video</p>
                    <p className="text-xs text-[var(--ff-text-secondary)]">Full recording</p>
                  </div>
                  <div className="bg-[var(--ff-bg-dark)]/50 rounded-lg p-3 border border-[var(--ff-border)]">
                    <p className="text-sm font-semibold text-[var(--ff-text-primary)] mb-1">PDF</p>
                    <p className="text-xs text-[var(--ff-text-secondary)]">Transcript + notes</p>
                  </div>
                  <div className="bg-[var(--ff-bg-dark)]/50 rounded-lg p-3 border border-[var(--ff-border)]">
                    <p className="text-sm font-semibold text-[var(--ff-text-primary)] mb-1">TXT</p>
                    <p className="text-xs text-[var(--ff-text-secondary)]">Plain text</p>
                  </div>
                  <div className="bg-[var(--ff-bg-dark)]/50 rounded-lg p-3 border border-[var(--ff-border)]">
                    <p className="text-sm font-semibold text-[var(--ff-text-primary)] mb-1">SRT</p>
                    <p className="text-xs text-[var(--ff-text-secondary)]">Subtitles</p>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </section>

        {/* Security Section */}
        <section className="px-6 lg:px-8 max-w-7xl mx-auto mt-20">
          <div className="bg-gradient-to-r from-[var(--ff-purple-500)]/5 to-[var(--ff-purple-600)]/5 border border-[var(--ff-purple-500)]/20 rounded-2xl p-12">
            <div className="text-center max-w-3xl mx-auto">
              <Lock className="w-12 h-12 text-[var(--ff-purple-500)] mx-auto mb-6" />
              <h2 className="text-3xl font-bold text-[var(--ff-text-primary)] mb-4">
                Enterprise-Grade Security
              </h2>
              <p className="text-lg text-[var(--ff-text-secondary)] mb-8">
                Your data is protected with bank-level encryption, both in transit and at rest.
                We comply with SOC 2, GDPR, and HIPAA standards.
              </p>
              <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                <div className="bg-[var(--ff-bg-dark)]/50 backdrop-blur-sm rounded-lg p-4">
                  <p className="text-[var(--ff-purple-500)] font-semibold mb-1">256-bit AES</p>
                  <p className="text-sm text-[var(--ff-text-secondary)]">Encryption at rest</p>
                </div>
                <div className="bg-[var(--ff-bg-dark)]/50 backdrop-blur-sm rounded-lg p-4">
                  <p className="text-[var(--ff-purple-500)] font-semibold mb-1">TLS 1.3</p>
                  <p className="text-sm text-[var(--ff-text-secondary)]">Encryption in transit</p>
                </div>
                <div className="bg-[var(--ff-bg-dark)]/50 backdrop-blur-sm rounded-lg p-4">
                  <p className="text-[var(--ff-purple-500)] font-semibold mb-1">ISO 27001</p>
                  <p className="text-sm text-[var(--ff-text-secondary)]">Certified compliance</p>
                </div>
              </div>
            </div>
          </div>
        </section>

        {/* Storage Stats */}
        <section className="px-6 lg:px-8 max-w-7xl mx-auto mt-20">
          <div className="grid grid-cols-1 md:grid-cols-4 gap-8">
            <div className="text-center">
              <Upload className="w-8 h-8 text-[var(--ff-purple-500)] mx-auto mb-3" />
              <div className="text-3xl font-bold text-[var(--ff-text-primary)] mb-1">
                10TB+
              </div>
              <p className="text-sm text-[var(--ff-text-secondary)]">
                Data synced daily
              </p>
            </div>
            <div className="text-center">
              <RefreshCw className="w-8 h-8 text-[var(--ff-purple-500)] mx-auto mb-3" />
              <div className="text-3xl font-bold text-[var(--ff-text-primary)] mb-1">
                &lt;30s
              </div>
              <p className="text-sm text-[var(--ff-text-secondary)]">
                Average sync time
              </p>
            </div>
            <div className="text-center">
              <Shield className="w-8 h-8 text-[var(--ff-purple-500)] mx-auto mb-3" />
              <div className="text-3xl font-bold text-[var(--ff-text-primary)] mb-1">
                99.99%
              </div>
              <p className="text-sm text-[var(--ff-text-secondary)]">
                Uptime guarantee
              </p>
            </div>
            <div className="text-center">
              <HardDrive className="w-8 h-8 text-[var(--ff-purple-500)] mx-auto mb-3" />
              <div className="text-3xl font-bold text-[var(--ff-text-primary)] mb-1">
                Unlimited
              </div>
              <p className="text-sm text-[var(--ff-text-secondary)]">
                Storage included
              </p>
            </div>
          </div>
        </section>

        {/* Global CTA Section */}
        <section className="px-6 lg:px-8 max-w-7xl mx-auto mt-20">
          <div className="bg-gradient-to-r from-[var(--ff-purple-500)]/10 to-[var(--ff-purple-600)]/10 border border-[var(--ff-purple-500)]/20 rounded-2xl p-12 text-center">
            <h2 className="text-3xl font-bold text-[var(--ff-text-primary)] mb-4">
              Secure Your Meeting Data
            </h2>
            <p className="text-xl text-[var(--ff-text-secondary)] mb-8 max-w-2xl mx-auto">
              Connect your cloud storage and never lose important meeting content
            </p>
            <button className="bg-[var(--ff-purple-500)] hover:bg-[var(--ff-purple-600)] text-white font-semibold py-4 px-8 rounded-xl transition-colors inline-flex items-center gap-2 group">
              Connect Storage Platform
              <ArrowRight className="w-5 h-5 group-hover:translate-x-1 transition-transform" />
            </button>
          </div>
        </section>
      </main>

      <Footer />
    </div>
  );
}