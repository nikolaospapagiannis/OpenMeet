'use client';

import Navigation from '@/components/Navigation';
import Footer from '@/components/Footer';
import {
  Layers,
  MessageSquare,
  Hash,
  FileText,
  CheckCircle,
  ArrowRight,
  Zap,
  Users,
  Bell,
  Share2
} from 'lucide-react';

const productivityIntegrations = [
  {
    name: 'Slack',
    description: 'Share meeting summaries and action items in channels',
    logo: '/integrations/slack-logo.svg',
    features: [
      'Channel notifications',
      'Thread summaries',
      'Action item tracking',
      'Private sharing'
    ],
    setupSteps: [
      'Install Slack app',
      'Choose channels',
      'Configure notifications'
    ]
  },
  {
    name: 'Microsoft Teams',
    description: 'Collaborate with meeting insights in Teams',
    logo: '/integrations/teams-logo.svg',
    features: [
      'Team channels',
      'Chat integration',
      'Meeting cards',
      'Adaptive cards'
    ],
    setupSteps: [
      'Add Teams app',
      'Select teams',
      'Set permissions'
    ]
  },
  {
    name: 'Notion',
    description: 'Create meeting notes and documentation automatically',
    logo: '/integrations/notion-logo.svg',
    features: [
      'Auto-create pages',
      'Database sync',
      'Template support',
      'Rich formatting'
    ],
    setupSteps: [
      'Connect Notion workspace',
      'Select databases',
      'Map templates'
    ]
  },
  {
    name: 'Asana',
    description: 'Turn action items into trackable tasks',
    logo: '/integrations/asana-logo.svg',
    features: [
      'Task creation',
      'Project mapping',
      'Due date sync',
      'Assignee detection'
    ],
    setupSteps: [
      'Authorize Asana',
      'Choose projects',
      'Enable auto-tasks'
    ]
  },
  {
    name: 'Trello',
    description: 'Create cards from meeting action items',
    logo: '/integrations/trello-logo.svg',
    features: [
      'Board integration',
      'Card creation',
      'Label mapping',
      'Checklist items'
    ],
    setupSteps: [
      'Connect Trello account',
      'Select boards',
      'Configure cards'
    ]
  },
  {
    name: 'Monday.com',
    description: 'Sync meeting data to your work OS',
    logo: '/integrations/monday-logo.svg',
    features: [
      'Item creation',
      'Status updates',
      'Timeline sync',
      'Custom fields'
    ],
    setupSteps: [
      'Link Monday account',
      'Choose workspaces',
      'Map columns'
    ]
  }
];

export default function ProductivityIntegrationsPage() {
  return (
    <div className="min-h-screen bg-[var(--ff-bg-dark)]">
      <Navigation />

      <main className="pt-24 pb-16">
        {/* Hero Section */}
        <section className="px-6 lg:px-8 max-w-7xl mx-auto mb-20">
          <div className="text-center max-w-3xl mx-auto">
            <div className="inline-flex items-center justify-center w-16 h-16 bg-[var(--ff-purple-500)]/10 rounded-2xl mb-6">
              <Layers className="w-8 h-8 text-[var(--ff-purple-500)]" />
            </div>
            <h1 className="text-5xl font-bold text-[var(--ff-text-primary)] mb-6">
              Productivity Integrations
            </h1>
            <p className="text-xl text-[var(--ff-text-secondary)] leading-relaxed">
              Connect OpenMeet with your team&apos;s productivity tools.
              Share insights, create tasks, and keep everyone aligned automatically.
            </p>
          </div>
        </section>

        {/* Benefits Section */}
        <section className="px-6 lg:px-8 max-w-7xl mx-auto mb-20">
          <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
            <div className="bg-[var(--ff-bg-layer)] border border-[var(--ff-border)] rounded-xl p-6">
              <div className="w-12 h-12 bg-[var(--ff-purple-500)]/10 rounded-xl flex items-center justify-center mb-4">
                <Share2 className="w-6 h-6 text-[var(--ff-purple-500)]" />
              </div>
              <h3 className="text-lg font-semibold text-[var(--ff-text-primary)] mb-2">
                Instant Sharing
              </h3>
              <p className="text-[var(--ff-text-secondary)]">
                Share meeting insights with your team in real-time
              </p>
            </div>
            <div className="bg-[var(--ff-bg-layer)] border border-[var(--ff-border)] rounded-xl p-6">
              <div className="w-12 h-12 bg-[var(--ff-purple-500)]/10 rounded-xl flex items-center justify-center mb-4">
                <Zap className="w-6 h-6 text-[var(--ff-purple-500)]" />
              </div>
              <h3 className="text-lg font-semibold text-[var(--ff-text-primary)] mb-2">
                Automated Workflows
              </h3>
              <p className="text-[var(--ff-text-secondary)]">
                Turn meeting outcomes into actionable tasks automatically
              </p>
            </div>
            <div className="bg-[var(--ff-bg-layer)] border border-[var(--ff-border)] rounded-xl p-6">
              <div className="w-12 h-12 bg-[var(--ff-purple-500)]/10 rounded-xl flex items-center justify-center mb-4">
                <Users className="w-6 h-6 text-[var(--ff-purple-500)]" />
              </div>
              <h3 className="text-lg font-semibold text-[var(--ff-text-primary)] mb-2">
                Team Alignment
              </h3>
              <p className="text-[var(--ff-text-secondary)]">
                Keep everyone on the same page with shared meeting notes
              </p>
            </div>
          </div>
        </section>

        {/* Integrations Grid */}
        <section className="px-6 lg:px-8 max-w-7xl mx-auto">
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
            {productivityIntegrations.map((integration, index) => (
              <div
                key={index}
                className="bg-[var(--ff-bg-layer)] border border-[var(--ff-border)] rounded-2xl p-8 hover:border-[var(--ff-purple-500)]/50 transition-colors"
              >
                <div className="flex items-start gap-6 mb-6">
                  <div className="w-16 h-16 bg-white/5 rounded-xl flex items-center justify-center">
                    {integration.name === 'Slack' && <Hash className="w-8 h-8 text-[var(--ff-purple-500)]" />}
                    {integration.name === 'Microsoft Teams' && <MessageSquare className="w-8 h-8 text-[var(--ff-purple-500)]" />}
                    {integration.name !== 'Slack' && integration.name !== 'Microsoft Teams' &&
                      <FileText className="w-8 h-8 text-[var(--ff-purple-500)]" />}
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

        {/* Workflow Section */}
        <section className="px-6 lg:px-8 max-w-7xl mx-auto mt-20">
          <div className="bg-[var(--ff-bg-layer)] border border-[var(--ff-border)] rounded-2xl p-12">
            <h2 className="text-3xl font-bold text-[var(--ff-text-primary)] mb-12 text-center">
              Automated Meeting Workflows
            </h2>
            <div className="max-w-4xl mx-auto">
              <div className="space-y-8">
                {/* Workflow Step 1 */}
                <div className="flex gap-6">
                  <div className="flex-shrink-0">
                    <div className="w-12 h-12 bg-[var(--ff-purple-500)] rounded-full flex items-center justify-center">
                      <span className="text-white font-bold">1</span>
                    </div>
                  </div>
                  <div className="flex-1">
                    <h3 className="text-xl font-semibold text-[var(--ff-text-primary)] mb-2">
                      Meeting Ends
                    </h3>
                    <p className="text-[var(--ff-text-secondary)] mb-4">
                      OpenMeet processes the recording and generates comprehensive notes
                    </p>
                    <div className="bg-[var(--ff-bg-dark)]/50 rounded-lg p-4 border border-[var(--ff-border)]">
                      <p className="text-sm text-[var(--ff-text-secondary)]">
                        AI extracts: Summary, Action Items, Decisions, Key Topics
                      </p>
                    </div>
                  </div>
                </div>

                {/* Workflow Step 2 */}
                <div className="flex gap-6">
                  <div className="flex-shrink-0">
                    <div className="w-12 h-12 bg-[var(--ff-purple-500)] rounded-full flex items-center justify-center">
                      <span className="text-white font-bold">2</span>
                    </div>
                  </div>
                  <div className="flex-1">
                    <h3 className="text-xl font-semibold text-[var(--ff-text-primary)] mb-2">
                      Auto-Distribution
                    </h3>
                    <p className="text-[var(--ff-text-secondary)] mb-4">
                      Meeting insights are automatically shared to your connected tools
                    </p>
                    <div className="grid grid-cols-2 gap-4">
                      <div className="bg-[var(--ff-bg-dark)]/50 rounded-lg p-3 border border-[var(--ff-border)]">
                        <div className="flex items-center gap-2 mb-1">
                          <Hash className="w-4 h-4 text-[var(--ff-purple-500)]" />
                          <span className="text-sm font-semibold text-[var(--ff-text-primary)]">Slack</span>
                        </div>
                        <p className="text-xs text-[var(--ff-text-secondary)]">
                          Summary posted to #team-updates
                        </p>
                      </div>
                      <div className="bg-[var(--ff-bg-dark)]/50 rounded-lg p-3 border border-[var(--ff-border)]">
                        <div className="flex items-center gap-2 mb-1">
                          <FileText className="w-4 h-4 text-[var(--ff-purple-500)]" />
                          <span className="text-sm font-semibold text-[var(--ff-text-primary)]">Notion</span>
                        </div>
                        <p className="text-xs text-[var(--ff-text-secondary)]">
                          Meeting page created
                        </p>
                      </div>
                    </div>
                  </div>
                </div>

                {/* Workflow Step 3 */}
                <div className="flex gap-6">
                  <div className="flex-shrink-0">
                    <div className="w-12 h-12 bg-[var(--ff-purple-500)] rounded-full flex items-center justify-center">
                      <span className="text-white font-bold">3</span>
                    </div>
                  </div>
                  <div className="flex-1">
                    <h3 className="text-xl font-semibold text-[var(--ff-text-primary)] mb-2">
                      Task Creation
                    </h3>
                    <p className="text-[var(--ff-text-secondary)] mb-4">
                      Action items become trackable tasks with assignees and due dates
                    </p>
                    <div className="bg-[var(--ff-bg-dark)]/50 rounded-lg p-4 border border-[var(--ff-border)]">
                      <div className="flex items-center gap-2">
                        <Bell className="w-4 h-4 text-[var(--ff-purple-500)]" />
                        <p className="text-sm text-[var(--ff-text-secondary)]">
                          3 tasks created in Asana with auto-assigned owners
                        </p>
                      </div>
                    </div>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </section>

        {/* Global CTA Section */}
        <section className="px-6 lg:px-8 max-w-7xl mx-auto mt-20">
          <div className="bg-gradient-to-r from-[var(--ff-purple-500)]/10 to-[var(--ff-purple-600)]/10 border border-[var(--ff-purple-500)]/20 rounded-2xl p-12 text-center">
            <h2 className="text-3xl font-bold text-[var(--ff-text-primary)] mb-4">
              Streamline Your Team&apos;s Workflow
            </h2>
            <p className="text-xl text-[var(--ff-text-secondary)] mb-8 max-w-2xl mx-auto">
              Connect your productivity tools and automate meeting follow-ups
            </p>
            <button className="bg-[var(--ff-purple-500)] hover:bg-[var(--ff-purple-600)] text-white font-semibold py-4 px-8 rounded-xl transition-colors inline-flex items-center gap-2 group">
              Connect Your Tools
              <ArrowRight className="w-5 h-5 group-hover:translate-x-1 transition-transform" />
            </button>
          </div>
        </section>
      </main>

      <Footer />
    </div>
  );
}