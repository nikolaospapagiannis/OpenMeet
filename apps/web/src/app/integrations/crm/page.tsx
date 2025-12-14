'use client';

import Navigation from '@/components/Navigation';
import Footer from '@/components/Footer';
import {
  Database,
  Users,
  TrendingUp,
  FileText,
  CheckCircle,
  ArrowRight,
  Zap,
  BarChart3,
  Target,
  Briefcase
} from 'lucide-react';

const crmIntegrations = [
  {
    name: 'Salesforce',
    description: 'Enterprise CRM integration for sales teams',
    logo: '/integrations/salesforce-logo.svg',
    features: [
      'Auto-log calls',
      'Deal tracking',
      'Contact enrichment',
      'Pipeline analytics'
    ],
    setupSteps: [
      'Connect Salesforce org',
      'Map custom fields',
      'Configure sync rules'
    ]
  },
  {
    name: 'HubSpot',
    description: 'All-in-one CRM for growing businesses',
    logo: '/integrations/hubspot-logo.svg',
    features: [
      'Contact sync',
      'Deal updates',
      'Activity logging',
      'Email integration'
    ],
    setupSteps: [
      'Authorize HubSpot',
      'Select pipelines',
      'Enable auto-logging'
    ]
  },
  {
    name: 'Pipedrive',
    description: 'Sales-focused CRM for closing more deals',
    logo: '/integrations/pipedrive-logo.svg',
    features: [
      'Activity tracking',
      'Deal progression',
      'Lead scoring',
      'Custom fields'
    ],
    setupSteps: [
      'Connect API key',
      'Configure pipelines',
      'Set up automation'
    ]
  },
  {
    name: 'Zoho CRM',
    description: 'Comprehensive CRM suite for all business sizes',
    logo: '/integrations/zoho-logo.svg',
    features: [
      'Lead management',
      'Call logging',
      'Analytics sync',
      'Workflow rules'
    ],
    setupSteps: [
      'Link Zoho account',
      'Grant permissions',
      'Map data fields'
    ]
  }
];

export default function CRMIntegrationsPage() {
  return (
    <div className="min-h-screen bg-[var(--ff-bg-dark)]">
      <Navigation />

      <main className="pt-24 pb-16">
        {/* Hero Section */}
        <section className="px-6 lg:px-8 max-w-7xl mx-auto mb-20">
          <div className="text-center max-w-3xl mx-auto">
            <div className="inline-flex items-center justify-center w-16 h-16 bg-[var(--ff-purple-500)]/10 rounded-2xl mb-6">
              <Database className="w-8 h-8 text-[var(--ff-purple-500)]" />
            </div>
            <h1 className="text-5xl font-bold text-[var(--ff-text-primary)] mb-6">
              CRM Integrations
            </h1>
            <p className="text-xl text-[var(--ff-text-secondary)] leading-relaxed">
              Automatically sync meeting notes, action items, and insights to your CRM.
              Keep your customer data updated without manual entry.
            </p>
          </div>
        </section>

        {/* Benefits Section */}
        <section className="px-6 lg:px-8 max-w-7xl mx-auto mb-20">
          <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
            <div className="bg-[var(--ff-bg-layer)] border border-[var(--ff-border)] rounded-xl p-6">
              <div className="w-12 h-12 bg-[var(--ff-purple-500)]/10 rounded-xl flex items-center justify-center mb-4">
                <TrendingUp className="w-6 h-6 text-[var(--ff-purple-500)]" />
              </div>
              <h3 className="text-lg font-semibold text-[var(--ff-text-primary)] mb-2">
                Boost Sales Velocity
              </h3>
              <p className="text-[var(--ff-text-secondary)]">
                Close deals faster with automatic call logging and follow-ups
              </p>
            </div>
            <div className="bg-[var(--ff-bg-layer)] border border-[var(--ff-border)] rounded-xl p-6">
              <div className="w-12 h-12 bg-[var(--ff-purple-500)]/10 rounded-xl flex items-center justify-center mb-4">
                <Target className="w-6 h-6 text-[var(--ff-purple-500)]" />
              </div>
              <h3 className="text-lg font-semibold text-[var(--ff-text-primary)] mb-2">
                Perfect Data Hygiene
              </h3>
              <p className="text-[var(--ff-text-secondary)]">
                Maintain accurate CRM records with automated data entry
              </p>
            </div>
            <div className="bg-[var(--ff-bg-layer)] border border-[var(--ff-border)] rounded-xl p-6">
              <div className="w-12 h-12 bg-[var(--ff-purple-500)]/10 rounded-xl flex items-center justify-center mb-4">
                <BarChart3 className="w-6 h-6 text-[var(--ff-purple-500)]" />
              </div>
              <h3 className="text-lg font-semibold text-[var(--ff-text-primary)] mb-2">
                Actionable Insights
              </h3>
              <p className="text-[var(--ff-text-secondary)]">
                Track conversation trends and customer sentiment automatically
              </p>
            </div>
          </div>
        </section>

        {/* Integrations Grid */}
        <section className="px-6 lg:px-8 max-w-7xl mx-auto">
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
            {crmIntegrations.map((integration, index) => (
              <div
                key={index}
                className="bg-[var(--ff-bg-layer)] border border-[var(--ff-border)] rounded-2xl p-8 hover:border-[var(--ff-purple-500)]/50 transition-colors"
              >
                <div className="flex items-start gap-6 mb-6">
                  <div className="w-16 h-16 bg-white/5 rounded-xl flex items-center justify-center">
                    <Briefcase className="w-8 h-8 text-[var(--ff-purple-500)]" />
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

        {/* Use Cases Section */}
        <section className="px-6 lg:px-8 max-w-7xl mx-auto mt-20">
          <div className="bg-[var(--ff-bg-layer)] border border-[var(--ff-border)] rounded-2xl p-12">
            <h2 className="text-3xl font-bold text-[var(--ff-text-primary)] mb-8 text-center">
              How Sales Teams Use OpenMeet + CRM
            </h2>
            <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
              <div className="text-center">
                <div className="w-16 h-16 bg-[var(--ff-purple-500)]/10 rounded-xl flex items-center justify-center mx-auto mb-4">
                  <Users className="w-8 h-8 text-[var(--ff-purple-500)]" />
                </div>
                <h3 className="text-lg font-semibold text-[var(--ff-text-primary)] mb-2">
                  Discovery Calls
                </h3>
                <p className="text-sm text-[var(--ff-text-secondary)]">
                  Capture customer pain points and requirements automatically logged to opportunities
                </p>
              </div>
              <div className="text-center">
                <div className="w-16 h-16 bg-[var(--ff-purple-500)]/10 rounded-xl flex items-center justify-center mx-auto mb-4">
                  <FileText className="w-8 h-8 text-[var(--ff-purple-500)]" />
                </div>
                <h3 className="text-lg font-semibold text-[var(--ff-text-primary)] mb-2">
                  Demo Sessions
                </h3>
                <p className="text-sm text-[var(--ff-text-secondary)]">
                  Track feature requests and objections, update deal stages automatically
                </p>
              </div>
              <div className="text-center">
                <div className="w-16 h-16 bg-[var(--ff-purple-500)]/10 rounded-xl flex items-center justify-center mx-auto mb-4">
                  <Zap className="w-8 h-8 text-[var(--ff-purple-500)]" />
                </div>
                <h3 className="text-lg font-semibold text-[var(--ff-text-primary)] mb-2">
                  Follow-ups
                </h3>
                <p className="text-sm text-[var(--ff-text-secondary)]">
                  Create tasks and reminders based on meeting outcomes and next steps
                </p>
              </div>
            </div>
          </div>
        </section>

        {/* Stats Section */}
        <section className="px-6 lg:px-8 max-w-7xl mx-auto mt-20">
          <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
            <div className="text-center">
              <div className="text-4xl font-bold text-[var(--ff-purple-500)] mb-2">
                73%
              </div>
              <p className="text-lg text-[var(--ff-text-primary)]">
                Reduction in CRM data entry
              </p>
            </div>
            <div className="text-center">
              <div className="text-4xl font-bold text-[var(--ff-purple-500)] mb-2">
                2.5hrs
              </div>
              <p className="text-lg text-[var(--ff-text-primary)]">
                Saved per rep weekly
              </p>
            </div>
            <div className="text-center">
              <div className="text-4xl font-bold text-[var(--ff-purple-500)] mb-2">
                98%
              </div>
              <p className="text-lg text-[var(--ff-text-primary)]">
                CRM data accuracy
              </p>
            </div>
          </div>
        </section>

        {/* Global CTA Section */}
        <section className="px-6 lg:px-8 max-w-7xl mx-auto mt-20">
          <div className="bg-gradient-to-r from-[var(--ff-purple-500)]/10 to-[var(--ff-purple-600)]/10 border border-[var(--ff-purple-500)]/20 rounded-2xl p-12 text-center">
            <h2 className="text-3xl font-bold text-[var(--ff-text-primary)] mb-4">
              Supercharge Your CRM
            </h2>
            <p className="text-xl text-[var(--ff-text-secondary)] mb-8 max-w-2xl mx-auto">
              Connect your CRM and eliminate manual data entry forever
            </p>
            <button className="bg-[var(--ff-purple-500)] hover:bg-[var(--ff-purple-600)] text-white font-semibold py-4 px-8 rounded-xl transition-colors inline-flex items-center gap-2 group">
              Connect Your CRM
              <ArrowRight className="w-5 h-5 group-hover:translate-x-1 transition-transform" />
            </button>
          </div>
        </section>
      </main>

      <Footer />
    </div>
  );
}