'use client';

import Navigation from '@/components/Navigation';
import Footer from '@/components/Footer';
import {
  Video,
  Users,
  Calendar,
  FileText,
  CheckCircle,
  ArrowRight,
  Zap,
  Shield,
  Clock,
  Globe
} from 'lucide-react';

const videoIntegrations = [
  {
    name: 'Zoom',
    description: 'Auto-join and record all your Zoom meetings',
    logo: '/integrations/zoom-logo.svg',
    features: [
      'Automatic meeting detection',
      'HD recording quality',
      'Speaker identification',
      'Cloud sync'
    ],
    setupSteps: [
      'Connect your Zoom account',
      'Enable auto-join settings',
      'Start recording automatically'
    ]
  },
  {
    name: 'Google Meet',
    description: 'Seamlessly integrate with Google Workspace',
    logo: '/integrations/google-meet-logo.svg',
    features: [
      'Calendar integration',
      'Real-time transcription',
      'Action item detection',
      'Google Drive export'
    ],
    setupSteps: [
      'Authorize Google account',
      'Select recording preferences',
      'Sync with calendar'
    ]
  },
  {
    name: 'Microsoft Teams',
    description: 'Enterprise-grade Teams integration',
    logo: '/integrations/teams-logo.svg',
    features: [
      'Channel recording',
      'Meeting summaries',
      'SharePoint integration',
      'Compliance ready'
    ],
    setupSteps: [
      'Connect Microsoft 365',
      'Configure permissions',
      'Enable for channels'
    ]
  },
  {
    name: 'Webex',
    description: 'Professional Webex meeting recording',
    logo: '/integrations/webex-logo.svg',
    features: [
      'End-to-end encryption',
      'Multi-language support',
      'Advanced analytics',
      'Custom workflows'
    ],
    setupSteps: [
      'Link Webex account',
      'Set recording rules',
      'Configure storage'
    ]
  }
];

export default function VideoIntegrationsPage() {
  return (
    <div className="min-h-screen bg-[var(--ff-bg-dark)]">
      <Navigation />

      <main className="pt-24 pb-16">
        {/* Hero Section */}
        <section className="px-6 lg:px-8 max-w-7xl mx-auto mb-20">
          <div className="text-center max-w-3xl mx-auto">
            <div className="inline-flex items-center justify-center w-16 h-16 bg-[var(--ff-purple-500)]/10 rounded-2xl mb-6">
              <Video className="w-8 h-8 text-[var(--ff-purple-500)]" />
            </div>
            <h1 className="text-5xl font-bold text-[var(--ff-text-primary)] mb-6">
              Video Conferencing Integrations
            </h1>
            <p className="text-xl text-[var(--ff-text-secondary)] leading-relaxed">
              Connect OpenMeet with your favorite video conferencing platforms.
              Auto-join meetings, record conversations, and never miss important details.
            </p>
          </div>
        </section>

        {/* Benefits Section */}
        <section className="px-6 lg:px-8 max-w-7xl mx-auto mb-20">
          <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
            <div className="bg-[var(--ff-bg-layer)] border border-[var(--ff-border)] rounded-xl p-6">
              <div className="w-12 h-12 bg-[var(--ff-purple-500)]/10 rounded-xl flex items-center justify-center mb-4">
                <Zap className="w-6 h-6 text-[var(--ff-purple-500)]" />
              </div>
              <h3 className="text-lg font-semibold text-[var(--ff-text-primary)] mb-2">
                Automatic Recording
              </h3>
              <p className="text-[var(--ff-text-secondary)]">
                Join and record meetings automatically without manual intervention
              </p>
            </div>
            <div className="bg-[var(--ff-bg-layer)] border border-[var(--ff-border)] rounded-xl p-6">
              <div className="w-12 h-12 bg-[var(--ff-purple-500)]/10 rounded-xl flex items-center justify-center mb-4">
                <Shield className="w-6 h-6 text-[var(--ff-purple-500)]" />
              </div>
              <h3 className="text-lg font-semibold text-[var(--ff-text-primary)] mb-2">
                Secure & Compliant
              </h3>
              <p className="text-[var(--ff-text-secondary)]">
                Enterprise-grade security with SOC 2 Type II compliance
              </p>
            </div>
            <div className="bg-[var(--ff-bg-layer)] border border-[var(--ff-border)] rounded-xl p-6">
              <div className="w-12 h-12 bg-[var(--ff-purple-500)]/10 rounded-xl flex items-center justify-center mb-4">
                <Clock className="w-6 h-6 text-[var(--ff-purple-500)]" />
              </div>
              <h3 className="text-lg font-semibold text-[var(--ff-text-primary)] mb-2">
                Save Hours Weekly
              </h3>
              <p className="text-[var(--ff-text-secondary)]">
                Eliminate manual note-taking and focus on the conversation
              </p>
            </div>
          </div>
        </section>

        {/* Integrations Grid */}
        <section className="px-6 lg:px-8 max-w-7xl mx-auto">
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
            {videoIntegrations.map((integration, index) => (
              <div
                key={index}
                className="bg-[var(--ff-bg-layer)] border border-[var(--ff-border)] rounded-2xl p-8 hover:border-[var(--ff-purple-500)]/50 transition-colors"
              >
                <div className="flex items-start gap-6 mb-6">
                  <div className="w-16 h-16 bg-white/5 rounded-xl flex items-center justify-center">
                    <Globe className="w-8 h-8 text-[var(--ff-purple-500)]" />
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

        {/* Global CTA Section */}
        <section className="px-6 lg:px-8 max-w-7xl mx-auto mt-20">
          <div className="bg-gradient-to-r from-[var(--ff-purple-500)]/10 to-[var(--ff-purple-600)]/10 border border-[var(--ff-purple-500)]/20 rounded-2xl p-12 text-center">
            <h2 className="text-3xl font-bold text-[var(--ff-text-primary)] mb-4">
              Ready to Transform Your Meetings?
            </h2>
            <p className="text-xl text-[var(--ff-text-secondary)] mb-8 max-w-2xl mx-auto">
              Connect your video conferencing tools and start capturing every important moment
            </p>
            <button className="bg-[var(--ff-purple-500)] hover:bg-[var(--ff-purple-600)] text-white font-semibold py-4 px-8 rounded-xl transition-colors inline-flex items-center gap-2 group">
              Get Started Free
              <ArrowRight className="w-5 h-5 group-hover:translate-x-1 transition-transform" />
            </button>
          </div>
        </section>
      </main>

      <Footer />
    </div>
  );
}