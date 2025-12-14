'use client';

import { useState } from 'react';
import Link from 'next/link';
import Navigation from '@/components/Navigation';
import Footer from '@/components/Footer';
import { CardGlass } from '@/components/ui/card-glass';
import { Button } from '@/components/ui/button-v2';
import { cn } from '@/lib/utils';
import {
  Globe,
  Smartphone,
  Monitor,
  Chrome,
  Download,
  CheckCircle,
  ArrowRight,
  Zap,
  Shield,
  RefreshCw,
  Cloud,
  Wifi,
  Bell,
  Users,
  Calendar,
  MessageSquare,
  Mic,
  Video,
  FileText,
  BarChart3,
  Lock,
  Sparkles,
  Apple,
  Play,
  ChevronRight,
  Star,
  Laptop,
  TabletSmartphone,
  Bot,
  Puzzle,
  ArrowUpRight
} from 'lucide-react';

interface AppPlatform {
  id: string;
  name: string;
  tagline: string;
  icon: React.ElementType;
  color: string;
  description: string;
  features: string[];
  platforms?: string[];
  ctaText: string;
  ctaLink: string;
  badge?: string;
  available: boolean;
}

const appPlatforms: AppPlatform[] = [
  {
    id: 'web',
    name: 'Web Dashboard',
    tagline: 'Full-featured meeting intelligence',
    icon: Globe,
    color: 'from-purple-500 to-blue-500',
    description: 'Access your complete meeting workspace from any browser. No downloads required.',
    features: [
      'Real-time transcription',
      'Advanced analytics dashboard',
      'Team collaboration tools',
      'Unlimited cloud storage'
    ],
    ctaText: 'Launch Web App',
    ctaLink: '/login',
    badge: 'Most Popular',
    available: true
  },
  {
    id: 'mobile',
    name: 'Mobile App',
    tagline: 'Meetings on the go',
    icon: Smartphone,
    color: 'from-green-500 to-teal-500',
    description: 'Record and review meetings from your pocket. Available for iOS and Android.',
    features: [
      'In-person meeting recording',
      'Offline transcription',
      'Push notifications',
      'Voice memos & notes'
    ],
    platforms: ['iOS', 'Android'],
    ctaText: 'Download Mobile App',
    ctaLink: '#mobile-download',
    badge: 'New',
    available: true
  },
  {
    id: 'desktop',
    name: 'Desktop App',
    tagline: 'Native performance',
    icon: Monitor,
    color: 'from-blue-500 to-cyan-500',
    description: 'Powerful desktop application with advanced features and system integration.',
    features: [
      'System audio capture',
      'Local processing option',
      'Keyboard shortcuts',
      'Multi-window support'
    ],
    platforms: ['Windows', 'macOS', 'Linux'],
    ctaText: 'Download Desktop',
    ctaLink: '#desktop-download',
    available: true
  },
  {
    id: 'chrome',
    name: 'Chrome Extension',
    tagline: 'Capture any meeting',
    icon: Chrome,
    color: 'from-orange-500 to-red-500',
    description: 'Seamlessly integrate with Google Meet, Zoom, and Teams directly in your browser.',
    features: [
      'Auto-join scheduled meetings',
      'One-click recording',
      'Browser notifications',
      'Calendar integration'
    ],
    ctaText: 'Add to Chrome',
    ctaLink: '#chrome-extension',
    badge: 'Essential',
    available: true
  },
  {
    id: 'slack',
    name: 'Slack Bot',
    tagline: 'Team collaboration',
    icon: MessageSquare,
    color: 'from-purple-500 to-pink-500',
    description: 'Get meeting summaries and action items delivered directly to Slack channels.',
    features: [
      'Automatic summary sharing',
      'Action item tracking',
      'Team mentions',
      'Thread discussions'
    ],
    ctaText: 'Add to Slack',
    ctaLink: '#slack-bot',
    available: true
  },
  {
    id: 'teams',
    name: 'Teams Bot',
    tagline: 'Microsoft integration',
    icon: Users,
    color: 'from-indigo-500 to-purple-500',
    description: 'Native Microsoft Teams integration for enterprise collaboration.',
    features: [
      'Teams meeting recording',
      'Channel summaries',
      'Task creation',
      'SharePoint sync'
    ],
    ctaText: 'Add to Teams',
    ctaLink: '#teams-bot',
    badge: 'Enterprise',
    available: true
  }
];

const featureComparison = [
  { feature: 'Real-time transcription', web: true, mobile: true, desktop: true, chrome: true, slack: false, teams: false },
  { feature: 'Meeting recording', web: true, mobile: true, desktop: true, chrome: true, slack: false, teams: false },
  { feature: 'AI summaries', web: true, mobile: true, desktop: true, chrome: true, slack: true, teams: true },
  { feature: 'Action items', web: true, mobile: true, desktop: true, chrome: true, slack: true, teams: true },
  { feature: 'Team collaboration', web: true, mobile: false, desktop: true, chrome: false, slack: true, teams: true },
  { feature: 'Offline mode', web: false, mobile: true, desktop: true, chrome: false, slack: false, teams: false },
  { feature: 'Calendar sync', web: true, mobile: true, desktop: true, chrome: true, slack: false, teams: true },
  { feature: 'Custom integrations', web: true, mobile: false, desktop: true, chrome: false, slack: true, teams: true },
  { feature: 'Analytics dashboard', web: true, mobile: false, desktop: true, chrome: false, slack: false, teams: false },
  { feature: 'Voice commands', web: false, mobile: true, desktop: true, chrome: false, slack: false, teams: false },
];

export default function AppsPage() {
  const [expandedPlatform, setExpandedPlatform] = useState<string | null>(null);
  const [selectedComparison, setSelectedComparison] = useState<'all' | string>('all');

  return (
    <div className="min-h-screen bg-[var(--ff-bg-dark)]">
      <Navigation />

      {/* Hero Section */}
      <section className="relative pt-32 pb-20 overflow-hidden">
        {/* Background Effects */}
        <div className="absolute inset-0">
          <div className="absolute inset-0 bg-gradient-to-b from-purple-500/5 via-transparent to-transparent" />
          <div className="absolute top-0 left-1/4 w-96 h-96 bg-purple-500/10 rounded-full filter blur-3xl animate-pulse" />
          <div className="absolute bottom-0 right-1/4 w-96 h-96 bg-blue-500/10 rounded-full filter blur-3xl animate-pulse delay-1000" />
        </div>

        <div className="relative z-10 max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 text-center">
          <div className="flex justify-center mb-6">
            <div className="inline-flex items-center gap-2 px-4 py-2 rounded-full bg-purple-500/10 border border-purple-500/20">
              <Sparkles className="w-4 h-4 text-purple-400" />
              <span className="text-sm text-purple-400">Available on all platforms</span>
            </div>
          </div>

          <h1 className="text-5xl md:text-6xl font-bold mb-6 bg-gradient-to-r from-white to-gray-400 bg-clip-text text-transparent">
            OpenMeet Apps
          </h1>
          <p className="text-xl md:text-2xl text-[var(--ff-text-secondary)] mb-8 max-w-3xl mx-auto">
            Access your meeting intelligence anywhere, anytime. Native apps for every platform.
          </p>

          <div className="flex flex-wrap justify-center gap-4 mb-12">
            <Button variant="gradient-primary" size="lg" className="gap-2">
              <Download className="w-5 h-5" />
              Download Apps
            </Button>
            <Button variant="ghost-glass" size="lg" className="gap-2">
              <Play className="w-5 h-5" />
              Watch Demo
            </Button>
          </div>

          {/* Platform Icons Row */}
          <div className="flex justify-center items-center gap-8 flex-wrap">
            {appPlatforms.map((platform) => (
              <div
                key={platform.id}
                className="group cursor-pointer"
                onClick={() => setExpandedPlatform(platform.id === expandedPlatform ? null : platform.id)}
              >
                <div className="relative">
                  <div className={cn(
                    "w-16 h-16 rounded-2xl bg-gradient-to-br flex items-center justify-center",
                    "transform transition-all duration-300 group-hover:scale-110",
                    platform.color
                  )}>
                    <platform.icon className="w-8 h-8 text-white" />
                  </div>
                  {platform.badge && (
                    <span className="absolute -top-2 -right-2 px-2 py-0.5 text-xs font-semibold bg-purple-500 text-white rounded-full">
                      {platform.badge}
                    </span>
                  )}
                </div>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* Apps Grid Section */}
      <section className="py-20 relative">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="text-center mb-12">
            <h2 className="text-3xl md:text-4xl font-bold mb-4 text-white">
              Choose Your Platform
            </h2>
            <p className="text-lg text-[var(--ff-text-secondary)]">
              Seamless experience across all devices and integrations
            </p>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {appPlatforms.map((platform) => (
              <CardGlass key={platform.id} className="relative overflow-hidden group hover:scale-105 transition-transform duration-300">
                {platform.badge && (
                  <div className="absolute top-4 right-4 z-10">
                    <span className="px-3 py-1 text-xs font-semibold bg-purple-500/20 text-purple-400 rounded-full border border-purple-500/30">
                      {platform.badge}
                    </span>
                  </div>
                )}

                <div className="p-6">
                  <div className={cn(
                    "w-14 h-14 rounded-xl bg-gradient-to-br flex items-center justify-center mb-4",
                    platform.color
                  )}>
                    <platform.icon className="w-7 h-7 text-white" />
                  </div>

                  <h3 className="text-xl font-bold text-white mb-2">{platform.name}</h3>
                  <p className="text-sm text-purple-400 mb-3">{platform.tagline}</p>
                  <p className="text-[var(--ff-text-secondary)] mb-4">{platform.description}</p>

                  {platform.platforms && (
                    <div className="flex gap-2 mb-4">
                      {platform.platforms.map((p) => (
                        <span key={p} className="px-2 py-1 text-xs bg-gray-800/50 text-gray-400 rounded">
                          {p}
                        </span>
                      ))}
                    </div>
                  )}

                  <ul className="space-y-2 mb-6">
                    {platform.features.map((feature, idx) => (
                      <li key={idx} className="flex items-start gap-2 text-sm text-[var(--ff-text-secondary)]">
                        <CheckCircle className="w-4 h-4 text-green-400 mt-0.5 flex-shrink-0" />
                        <span>{feature}</span>
                      </li>
                    ))}
                  </ul>

                  <Button
                    variant={platform.id === 'web' ? 'gradient-primary' : 'glassmorphism'}
                    className="w-full gap-2"
                    disabled={!platform.available}
                  >
                    {platform.ctaText}
                    <ArrowRight className="w-4 h-4" />
                  </Button>
                </div>

                {/* Hover Effect */}
                <div className="absolute inset-0 bg-gradient-to-t from-purple-500/5 to-transparent opacity-0 group-hover:opacity-100 transition-opacity duration-300 pointer-events-none" />
              </CardGlass>
            ))}
          </div>
        </div>
      </section>

      {/* Feature Comparison Table */}
      <section className="py-20 bg-gradient-to-b from-transparent via-purple-500/5 to-transparent">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="text-center mb-12">
            <h2 className="text-3xl md:text-4xl font-bold mb-4 text-white">
              Platform Comparison
            </h2>
            <p className="text-lg text-[var(--ff-text-secondary)]">
              Find the perfect platform for your workflow
            </p>
          </div>

          <CardGlass className="overflow-hidden">
            <div className="overflow-x-auto">
              <table className="w-full">
                <thead>
                  <tr className="border-b border-gray-800">
                    <th className="text-left p-4 text-white font-semibold">Features</th>
                    {appPlatforms.map((platform) => (
                      <th key={platform.id} className="p-4 text-center">
                        <div className="flex flex-col items-center gap-2">
                          <platform.icon className="w-5 h-5 text-purple-400" />
                          <span className="text-sm text-white font-medium">{platform.name.split(' ')[0]}</span>
                        </div>
                      </th>
                    ))}
                  </tr>
                </thead>
                <tbody>
                  {featureComparison.map((row, idx) => (
                    <tr key={idx} className="border-b border-gray-800/50 hover:bg-purple-500/5 transition-colors">
                      <td className="p-4 text-[var(--ff-text-secondary)]">{row.feature}</td>
                      <td className="p-4 text-center">
                        {row.web ? (
                          <CheckCircle className="w-5 h-5 text-green-400 mx-auto" />
                        ) : (
                          <div className="w-5 h-5 mx-auto rounded-full bg-gray-800" />
                        )}
                      </td>
                      <td className="p-4 text-center">
                        {row.mobile ? (
                          <CheckCircle className="w-5 h-5 text-green-400 mx-auto" />
                        ) : (
                          <div className="w-5 h-5 mx-auto rounded-full bg-gray-800" />
                        )}
                      </td>
                      <td className="p-4 text-center">
                        {row.desktop ? (
                          <CheckCircle className="w-5 h-5 text-green-400 mx-auto" />
                        ) : (
                          <div className="w-5 h-5 mx-auto rounded-full bg-gray-800" />
                        )}
                      </td>
                      <td className="p-4 text-center">
                        {row.chrome ? (
                          <CheckCircle className="w-5 h-5 text-green-400 mx-auto" />
                        ) : (
                          <div className="w-5 h-5 mx-auto rounded-full bg-gray-800" />
                        )}
                      </td>
                      <td className="p-4 text-center">
                        {row.slack ? (
                          <CheckCircle className="w-5 h-5 text-green-400 mx-auto" />
                        ) : (
                          <div className="w-5 h-5 mx-auto rounded-full bg-gray-800" />
                        )}
                      </td>
                      <td className="p-4 text-center">
                        {row.teams ? (
                          <CheckCircle className="w-5 h-5 text-green-400 mx-auto" />
                        ) : (
                          <div className="w-5 h-5 mx-auto rounded-full bg-gray-800" />
                        )}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </CardGlass>
        </div>
      </section>

      {/* Cross-Platform Sync Section */}
      <section className="py-20 relative overflow-hidden">
        <div className="absolute inset-0">
          <div className="absolute inset-0 bg-gradient-to-r from-purple-500/10 via-transparent to-blue-500/10" />
        </div>

        <div className="relative z-10 max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-12 items-center">
            <div>
              <h2 className="text-3xl md:text-4xl font-bold mb-6 text-white">
                Seamless Cross-Platform Sync
              </h2>
              <p className="text-lg text-[var(--ff-text-secondary)] mb-8">
                Your meetings, transcriptions, and insights are automatically synchronized across all your devices in real-time.
              </p>

              <div className="space-y-6">
                <div className="flex items-start gap-4">
                  <div className="w-10 h-10 rounded-lg bg-purple-500/20 flex items-center justify-center flex-shrink-0">
                    <Cloud className="w-5 h-5 text-purple-400" />
                  </div>
                  <div>
                    <h3 className="font-semibold text-white mb-1">Cloud-First Architecture</h3>
                    <p className="text-sm text-[var(--ff-text-secondary)]">
                      All your data is securely stored in the cloud and instantly accessible from any device.
                    </p>
                  </div>
                </div>

                <div className="flex items-start gap-4">
                  <div className="w-10 h-10 rounded-lg bg-purple-500/20 flex items-center justify-center flex-shrink-0">
                    <RefreshCw className="w-5 h-5 text-purple-400" />
                  </div>
                  <div>
                    <h3 className="font-semibold text-white mb-1">Real-Time Updates</h3>
                    <p className="text-sm text-[var(--ff-text-secondary)]">
                      Changes made on one device instantly reflect across all your connected platforms.
                    </p>
                  </div>
                </div>

                <div className="flex items-start gap-4">
                  <div className="w-10 h-10 rounded-lg bg-purple-500/20 flex items-center justify-center flex-shrink-0">
                    <Shield className="w-5 h-5 text-purple-400" />
                  </div>
                  <div>
                    <h3 className="font-semibold text-white mb-1">Enterprise Security</h3>
                    <p className="text-sm text-[var(--ff-text-secondary)]">
                      End-to-end encryption ensures your sensitive meeting data remains private and secure.
                    </p>
                  </div>
                </div>

                <div className="flex items-start gap-4">
                  <div className="w-10 h-10 rounded-lg bg-purple-500/20 flex items-center justify-center flex-shrink-0">
                    <Wifi className="w-5 h-5 text-purple-400" />
                  </div>
                  <div>
                    <h3 className="font-semibold text-white mb-1">Offline Support</h3>
                    <p className="text-sm text-[var(--ff-text-secondary)]">
                      Work offline on mobile and desktop apps, with automatic sync when you reconnect.
                    </p>
                  </div>
                </div>
              </div>
            </div>

            <div className="relative">
              {/* Device Mockup Visualization */}
              <div className="relative h-[500px]">
                {/* Desktop in back */}
                <div className="absolute top-0 left-1/2 -translate-x-1/2 w-80 h-56 bg-gradient-to-br from-gray-800 to-gray-900 rounded-lg shadow-2xl">
                  <div className="h-full p-4">
                    <div className="h-full bg-black/50 rounded flex items-center justify-center">
                      <Monitor className="w-16 h-16 text-purple-400" />
                    </div>
                  </div>
                  <div className="absolute -bottom-4 left-1/2 -translate-x-1/2 w-20 h-4 bg-gray-800 rounded-b-lg" />
                </div>

                {/* Tablet middle left */}
                <div className="absolute top-32 left-0 w-48 h-32 bg-gradient-to-br from-gray-800 to-gray-900 rounded-lg shadow-xl transform -rotate-6">
                  <div className="h-full p-3">
                    <div className="h-full bg-black/50 rounded flex items-center justify-center">
                      <TabletSmartphone className="w-10 h-10 text-blue-400" />
                    </div>
                  </div>
                </div>

                {/* Phone front right */}
                <div className="absolute bottom-0 right-8 w-32 h-56 bg-gradient-to-br from-gray-800 to-gray-900 rounded-2xl shadow-xl transform rotate-6">
                  <div className="h-full p-3">
                    <div className="h-full bg-black/50 rounded-xl flex items-center justify-center">
                      <Smartphone className="w-10 h-10 text-green-400" />
                    </div>
                  </div>
                </div>

                {/* Sync Lines */}
                <div className="absolute inset-0">
                  <svg className="w-full h-full" viewBox="0 0 400 500">
                    <path
                      d="M200 100 L100 250 L300 400"
                      stroke="url(#gradient)"
                      strokeWidth="2"
                      fill="none"
                      strokeDasharray="5,5"
                      className="animate-pulse"
                    />
                    <defs>
                      <linearGradient id="gradient">
                        <stop offset="0%" stopColor="#7a5af8" />
                        <stop offset="100%" stopColor="#3b82f6" />
                      </linearGradient>
                    </defs>
                  </svg>
                </div>

                {/* Floating Elements */}
                <div className="absolute top-20 right-4 animate-bounce">
                  <div className="w-12 h-12 rounded-full bg-purple-500/20 flex items-center justify-center">
                    <Zap className="w-6 h-6 text-purple-400" />
                  </div>
                </div>
                <div className="absolute bottom-20 left-4 animate-bounce delay-300">
                  <div className="w-12 h-12 rounded-full bg-blue-500/20 flex items-center justify-center">
                    <RefreshCw className="w-6 h-6 text-blue-400" />
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* Download CTAs Section */}
      <section className="py-20 bg-gradient-to-b from-transparent via-purple-500/10 to-transparent">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="text-center mb-12">
            <h2 className="text-3xl md:text-4xl font-bold mb-4 text-white">
              Get Started in Seconds
            </h2>
            <p className="text-lg text-[var(--ff-text-secondary)]">
              Choose your preferred platform and start capturing insights today
            </p>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
            {/* Mobile Downloads */}
            <CardGlass className="p-6 text-center">
              <Smartphone className="w-12 h-12 text-purple-400 mx-auto mb-4" />
              <h3 className="font-semibold text-white mb-3">Mobile Apps</h3>
              <div className="space-y-3">
                <Button variant="glassmorphism" className="w-full gap-2" size="sm">
                  <Apple className="w-4 h-4" />
                  App Store
                </Button>
                <Button variant="glassmorphism" className="w-full gap-2" size="sm">
                  <Play className="w-4 h-4" />
                  Google Play
                </Button>
              </div>
            </CardGlass>

            {/* Desktop Downloads */}
            <CardGlass className="p-6 text-center">
              <Monitor className="w-12 h-12 text-blue-400 mx-auto mb-4" />
              <h3 className="font-semibold text-white mb-3">Desktop Apps</h3>
              <div className="space-y-3">
                <Button variant="glassmorphism" className="w-full gap-2" size="sm">
                  <Monitor className="w-4 h-4" />
                  Windows
                </Button>
                <Button variant="glassmorphism" className="w-full gap-2" size="sm">
                  <Apple className="w-4 h-4" />
                  macOS
                </Button>
              </div>
            </CardGlass>

            {/* Browser Extension */}
            <CardGlass className="p-6 text-center">
              <Chrome className="w-12 h-12 text-orange-400 mx-auto mb-4" />
              <h3 className="font-semibold text-white mb-3">Browser Extension</h3>
              <div className="space-y-3">
                <Button variant="glassmorphism" className="w-full gap-2" size="sm">
                  <Chrome className="w-4 h-4" />
                  Chrome Store
                </Button>
                <Button variant="glassmorphism" className="w-full gap-2" size="sm">
                  <Globe className="w-4 h-4" />
                  Firefox Add-ons
                </Button>
              </div>
            </CardGlass>

            {/* Integrations */}
            <CardGlass className="p-6 text-center">
              <Puzzle className="w-12 h-12 text-green-400 mx-auto mb-4" />
              <h3 className="font-semibold text-white mb-3">Integrations</h3>
              <div className="space-y-3">
                <Button variant="glassmorphism" className="w-full gap-2" size="sm">
                  <MessageSquare className="w-4 h-4" />
                  Slack App
                </Button>
                <Button variant="glassmorphism" className="w-full gap-2" size="sm">
                  <Users className="w-4 h-4" />
                  Teams App
                </Button>
              </div>
            </CardGlass>
          </div>

          {/* Stats */}
          <div className="mt-16 grid grid-cols-2 md:grid-cols-4 gap-8">
            <div className="text-center">
              <div className="text-3xl font-bold text-white mb-2">10M+</div>
              <div className="text-sm text-[var(--ff-text-secondary)]">Downloads</div>
            </div>
            <div className="text-center">
              <div className="text-3xl font-bold text-white mb-2">4.8</div>
              <div className="text-sm text-[var(--ff-text-secondary)]">Average Rating</div>
            </div>
            <div className="text-center">
              <div className="text-3xl font-bold text-white mb-2">6</div>
              <div className="text-sm text-[var(--ff-text-secondary)]">Platforms</div>
            </div>
            <div className="text-center">
              <div className="text-3xl font-bold text-white mb-2">150+</div>
              <div className="text-sm text-[var(--ff-text-secondary)]">Countries</div>
            </div>
          </div>
        </div>
      </section>

      {/* Final CTA */}
      <section className="py-20 relative">
        <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 text-center">
          <CardGlass className="p-12 bg-gradient-to-br from-purple-500/10 to-blue-500/10">
            <Star className="w-12 h-12 text-purple-400 mx-auto mb-6" />
            <h2 className="text-3xl font-bold mb-4 text-white">
              One Account, All Platforms
            </h2>
            <p className="text-lg text-[var(--ff-text-secondary)] mb-8 max-w-2xl mx-auto">
              Sign up once and access OpenMeet on all your devices. Your meetings, transcriptions, and insights follow you everywhere.
            </p>
            <div className="flex flex-wrap justify-center gap-4">
              <Button variant="gradient-primary" size="lg" className="gap-2">
                Start Free Trial
                <ArrowRight className="w-5 h-5" />
              </Button>
              <Button variant="ghost-glass" size="lg" className="gap-2">
                View Pricing
                <ChevronRight className="w-5 h-5" />
              </Button>
            </div>
          </CardGlass>
        </div>
      </section>

      <Footer />
    </div>
  );
}