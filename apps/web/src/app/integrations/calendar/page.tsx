'use client';

import Navigation from '@/components/Navigation';
import Footer from '@/components/Footer';
import {
  Calendar,
  CalendarDays,
  Clock,
  Bell,
  CheckCircle,
  ArrowRight,
  Zap,
  RefreshCw,
  Users,
  Link
} from 'lucide-react';

const calendarIntegrations = [
  {
    name: 'Google Calendar',
    description: 'Sync with Google Calendar for automatic meeting detection',
    logo: '/integrations/google-calendar-logo.svg',
    features: [
      'Auto-detect meetings',
      'Guest list sync',
      'Event reminders',
      'Recurring meeting support'
    ],
    setupSteps: [
      'Connect Google account',
      'Grant calendar permissions',
      'Select calendars to sync'
    ]
  },
  {
    name: 'Outlook Calendar',
    description: 'Full Microsoft 365 calendar integration',
    logo: '/integrations/outlook-logo.svg',
    features: [
      'Exchange sync',
      'Meeting room booking',
      'Attendee tracking',
      'Office 365 integration'
    ],
    setupSteps: [
      'Sign in with Microsoft',
      'Authorize calendar access',
      'Configure sync settings'
    ]
  },
  {
    name: 'Calendly',
    description: 'Automated scheduling with Calendly workflows',
    logo: '/integrations/calendly-logo.svg',
    features: [
      'Booking automation',
      'Buffer time management',
      'Custom event types',
      'Availability sync'
    ],
    setupSteps: [
      'Connect Calendly account',
      'Map event types',
      'Enable auto-recording'
    ]
  },
  {
    name: 'Apple Calendar',
    description: 'Native integration with iCloud Calendar',
    logo: '/integrations/apple-calendar-logo.svg',
    features: [
      'iCloud sync',
      'Shared calendars',
      'Time zone support',
      'Privacy focused'
    ],
    setupSteps: [
      'Sign in with Apple ID',
      'Allow calendar access',
      'Choose sync frequency'
    ]
  }
];

export default function CalendarIntegrationsPage() {
  return (
    <div className="min-h-screen bg-[var(--ff-bg-dark)]">
      <Navigation />

      <main className="pt-24 pb-16">
        {/* Hero Section */}
        <section className="px-6 lg:px-8 max-w-7xl mx-auto mb-20">
          <div className="text-center max-w-3xl mx-auto">
            <div className="inline-flex items-center justify-center w-16 h-16 bg-[var(--ff-purple-500)]/10 rounded-2xl mb-6">
              <Calendar className="w-8 h-8 text-[var(--ff-purple-500)]" />
            </div>
            <h1 className="text-5xl font-bold text-[var(--ff-text-primary)] mb-6">
              Calendar Integrations
            </h1>
            <p className="text-xl text-[var(--ff-text-secondary)] leading-relaxed">
              Sync OpenMeet with your calendar apps to automatically detect and join meetings.
              Never manually add meeting details again.
            </p>
          </div>
        </section>

        {/* Benefits Section */}
        <section className="px-6 lg:px-8 max-w-7xl mx-auto mb-20">
          <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
            <div className="bg-[var(--ff-bg-layer)] border border-[var(--ff-border)] rounded-xl p-6">
              <div className="w-12 h-12 bg-[var(--ff-purple-500)]/10 rounded-xl flex items-center justify-center mb-4">
                <RefreshCw className="w-6 h-6 text-[var(--ff-purple-500)]" />
              </div>
              <h3 className="text-lg font-semibold text-[var(--ff-text-primary)] mb-2">
                Real-time Sync
              </h3>
              <p className="text-[var(--ff-text-secondary)]">
                Instantly sync calendar changes and never miss a meeting
              </p>
            </div>
            <div className="bg-[var(--ff-bg-layer)] border border-[var(--ff-border)] rounded-xl p-6">
              <div className="w-12 h-12 bg-[var(--ff-purple-500)]/10 rounded-xl flex items-center justify-center mb-4">
                <Bell className="w-6 h-6 text-[var(--ff-purple-500)]" />
              </div>
              <h3 className="text-lg font-semibold text-[var(--ff-text-primary)] mb-2">
                Smart Reminders
              </h3>
              <p className="text-[var(--ff-text-secondary)]">
                Get notified before meetings start with recording reminders
              </p>
            </div>
            <div className="bg-[var(--ff-bg-layer)] border border-[var(--ff-border)] rounded-xl p-6">
              <div className="w-12 h-12 bg-[var(--ff-purple-500)]/10 rounded-xl flex items-center justify-center mb-4">
                <Users className="w-6 h-6 text-[var(--ff-purple-500)]" />
              </div>
              <h3 className="text-lg font-semibold text-[var(--ff-text-primary)] mb-2">
                Attendee Tracking
              </h3>
              <p className="text-[var(--ff-text-secondary)]">
                Automatically identify meeting participants and speakers
              </p>
            </div>
          </div>
        </section>

        {/* Integrations Grid */}
        <section className="px-6 lg:px-8 max-w-7xl mx-auto">
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
            {calendarIntegrations.map((integration, index) => (
              <div
                key={index}
                className="bg-[var(--ff-bg-layer)] border border-[var(--ff-border)] rounded-2xl p-8 hover:border-[var(--ff-purple-500)]/50 transition-colors"
              >
                <div className="flex items-start gap-6 mb-6">
                  <div className="w-16 h-16 bg-white/5 rounded-xl flex items-center justify-center">
                    <CalendarDays className="w-8 h-8 text-[var(--ff-purple-500)]" />
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

        {/* Feature Highlight Section */}
        <section className="px-6 lg:px-8 max-w-7xl mx-auto mt-20">
          <div className="bg-[var(--ff-bg-layer)] border border-[var(--ff-border)] rounded-2xl p-12">
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-12 items-center">
              <div>
                <h2 className="text-3xl font-bold text-[var(--ff-text-primary)] mb-6">
                  Intelligent Meeting Detection
                </h2>
                <p className="text-lg text-[var(--ff-text-secondary)] mb-8">
                  Our AI automatically detects meeting types, identifies external vs internal meetings,
                  and applies the right recording settings based on your preferences.
                </p>
                <div className="space-y-4">
                  <div className="flex items-start gap-3">
                    <Clock className="w-5 h-5 text-[var(--ff-purple-500)] mt-0.5" />
                    <div>
                      <h4 className="text-[var(--ff-text-primary)] font-semibold mb-1">
                        Time Zone Intelligence
                      </h4>
                      <p className="text-sm text-[var(--ff-text-secondary)]">
                        Automatically handles meetings across different time zones
                      </p>
                    </div>
                  </div>
                  <div className="flex items-start gap-3">
                    <Link className="w-5 h-5 text-[var(--ff-purple-500)] mt-0.5" />
                    <div>
                      <h4 className="text-[var(--ff-text-primary)] font-semibold mb-1">
                        Meeting Link Detection
                      </h4>
                      <p className="text-sm text-[var(--ff-text-secondary)]">
                        Extracts and connects to meeting links from any calendar event
                      </p>
                    </div>
                  </div>
                </div>
              </div>
              <div className="bg-gradient-to-br from-[var(--ff-purple-500)]/20 to-[var(--ff-purple-600)]/20 rounded-xl p-8 border border-[var(--ff-purple-500)]/30">
                <div className="space-y-4">
                  <div className="bg-[var(--ff-bg-dark)]/50 backdrop-blur-sm rounded-lg p-4">
                    <div className="flex items-center gap-3 mb-2">
                      <div className="w-2 h-2 bg-green-500 rounded-full"></div>
                      <span className="text-sm text-[var(--ff-text-secondary)]">Connected</span>
                    </div>
                    <p className="text-[var(--ff-text-primary)] font-semibold">Google Calendar</p>
                    <p className="text-sm text-[var(--ff-text-secondary)]">3 meetings today</p>
                  </div>
                  <div className="bg-[var(--ff-bg-dark)]/50 backdrop-blur-sm rounded-lg p-4">
                    <div className="flex items-center gap-3 mb-2">
                      <div className="w-2 h-2 bg-green-500 rounded-full"></div>
                      <span className="text-sm text-[var(--ff-text-secondary)]">Connected</span>
                    </div>
                    <p className="text-[var(--ff-text-primary)] font-semibold">Outlook Calendar</p>
                    <p className="text-sm text-[var(--ff-text-secondary)]">2 meetings today</p>
                  </div>
                  <div className="text-center mt-6">
                    <p className="text-[var(--ff-purple-500)] font-semibold">
                      5 meetings will be auto-recorded today
                    </p>
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
              Never Miss Another Meeting
            </h2>
            <p className="text-xl text-[var(--ff-text-secondary)] mb-8 max-w-2xl mx-auto">
              Connect your calendars and let OpenMeet handle the rest automatically
            </p>
            <button className="bg-[var(--ff-purple-500)] hover:bg-[var(--ff-purple-600)] text-white font-semibold py-4 px-8 rounded-xl transition-colors inline-flex items-center gap-2 group">
              Start Syncing Calendars
              <ArrowRight className="w-5 h-5 group-hover:translate-x-1 transition-transform" />
            </button>
          </div>
        </section>
      </main>

      <Footer />
    </div>
  );
}