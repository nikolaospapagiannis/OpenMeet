'use client';

import React, { useState } from 'react';
import Navigation from '@/components/Navigation';
import Footer from '@/components/Footer';

type UpdateType = 'feature' | 'improvement' | 'fix';

interface ChangelogEntry {
  id: string;
  date: string;
  month: string;
  type: UpdateType;
  title: string;
  description: string;
  details?: string[];
  learnMoreUrl?: string;
  imageUrl?: string;
}

const changelogData: ChangelogEntry[] = [
  {
    id: 'multi-provider-ai',
    date: 'November 15, 2025',
    month: 'November 2025',
    type: 'feature',
    title: 'Multi-Provider AI Support',
    description: 'Seamlessly integrate with multiple AI providers for enhanced flexibility and reliability.',
    details: [
      'OpenAI, Anthropic, vLLM, Ollama, LM Studio',
      'Automatic provider failover',
      'Cost optimization across providers'
    ],
    learnMoreUrl: '#'
  },
  {
    id: 'meeting-quality-score',
    date: 'November 8, 2025',
    month: 'November 2025',
    type: 'feature',
    title: 'Meeting Quality Score',
    description: 'Get instant feedback on meeting effectiveness with AI-powered quality scoring.',
    details: [
      '1-10 effectiveness rating',
      'Actionable improvement suggestions',
      'Historical trend analysis'
    ],
    learnMoreUrl: '#'
  },
  {
    id: 'custom-fine-tuning',
    date: 'November 1, 2025',
    month: 'November 2025',
    type: 'feature',
    title: 'Custom Fine-Tuning',
    description: 'Train AI models on your organization\'s specific data and terminology.',
    details: [
      'Train models on your data',
      'Domain-specific understanding',
      'Privacy-first approach'
    ],
    learnMoreUrl: '#'
  },
  {
    id: 'react-native-app',
    date: 'October 20, 2025',
    month: 'October 2025',
    type: 'feature',
    title: 'React Native Mobile App',
    description: 'Access all features on the go with our new native mobile applications.',
    details: [
      'iOS and Android support',
      'Offline mode capability',
      'Push notifications',
      'Biometric authentication'
    ],
    learnMoreUrl: '#'
  },
  {
    id: 'graphql-subscriptions',
    date: 'October 5, 2025',
    month: 'October 2025',
    type: 'feature',
    title: 'GraphQL Subscriptions',
    description: 'Real-time data updates with WebSocket-based GraphQL subscriptions.',
    details: [
      'Real-time updates',
      'Reduced latency',
      'Automatic reconnection'
    ],
    learnMoreUrl: '#'
  },
  {
    id: 'white-label-platform',
    date: 'September 25, 2025',
    month: 'September 2025',
    type: 'feature',
    title: 'White-Label Platform',
    description: 'Completely rebrand the platform with your organization\'s identity.',
    details: [
      'Custom branding',
      'Domain customization',
      'Theme editor'
    ],
    learnMoreUrl: '#'
  },
  {
    id: 'advanced-rbac',
    date: 'September 10, 2025',
    month: 'September 2025',
    type: 'feature',
    title: 'Advanced RBAC',
    description: 'Granular role-based access control for enterprise security.',
    details: [
      'Custom role creation',
      'Permission inheritance',
      'Audit logging'
    ],
    learnMoreUrl: '#'
  },
  {
    id: 'performance-improvements',
    date: 'September 1, 2025',
    month: 'September 2025',
    type: 'improvement',
    title: 'Performance Optimizations',
    description: '50% faster load times and reduced memory usage across the platform.',
    learnMoreUrl: '#'
  },
  {
    id: 'bug-fixes-sept',
    date: 'August 28, 2025',
    month: 'August 2025',
    type: 'fix',
    title: 'Meeting Sync Issues Resolved',
    description: 'Fixed synchronization issues affecting calendar integrations.',
    learnMoreUrl: '#'
  }
];

const filterOptions = [
  { label: 'All', value: 'all' },
  { label: 'Features', value: 'feature' },
  { label: 'Improvements', value: 'improvement' },
  { label: 'Bug Fixes', value: 'fix' }
];

export default function ChangelogPage() {
  const [selectedFilter, setSelectedFilter] = useState<string>('all');
  const [email, setEmail] = useState('');

  const filteredEntries = changelogData.filter(entry =>
    selectedFilter === 'all' || entry.type === selectedFilter
  );

  const groupedEntries = filteredEntries.reduce((acc, entry) => {
    if (!acc[entry.month]) {
      acc[entry.month] = [];
    }
    acc[entry.month].push(entry);
    return acc;
  }, {} as Record<string, ChangelogEntry[]>);

  const getTypeBadgeColor = (type: UpdateType) => {
    switch (type) {
      case 'feature':
        return 'bg-purple-500/20 text-purple-400 border-purple-500/30';
      case 'improvement':
        return 'bg-blue-500/20 text-blue-400 border-blue-500/30';
      case 'fix':
        return 'bg-green-500/20 text-green-400 border-green-500/30';
      default:
        return 'bg-gray-500/20 text-gray-400 border-gray-500/30';
    }
  };

  const getTypeLabel = (type: UpdateType) => {
    switch (type) {
      case 'feature':
        return 'Feature';
      case 'improvement':
        return 'Improvement';
      case 'fix':
        return 'Bug Fix';
      default:
        return type;
    }
  };

  const handleSubscribe = (e: React.FormEvent) => {
    e.preventDefault();
    // Handle subscription logic here
    console.log('Subscribing email:', email);
    setEmail('');
  };

  return (
    <div className="min-h-screen bg-[#000211] text-white">
      <Navigation />

      <main className="relative pt-32 pb-24">
        {/* Background gradient */}
        <div className="absolute inset-0 bg-gradient-to-b from-purple-900/10 via-transparent to-transparent pointer-events-none" />

        <div className="relative max-w-6xl mx-auto px-6">
          {/* Hero Section */}
          <div className="text-center mb-16">
            <h1 className="text-5xl md:text-6xl font-bold mb-6 bg-gradient-to-r from-white to-gray-400 bg-clip-text text-transparent">
              What's New
            </h1>
            <p className="text-xl text-gray-400 mb-6">
              Stay up to date with the latest product updates and improvements
            </p>
            <a
              href="/changelog/rss"
              className="inline-flex items-center gap-2 text-purple-400 hover:text-purple-300 transition-colors"
            >
              <svg className="w-5 h-5" fill="currentColor" viewBox="0 0 20 20">
                <path d="M5 3a1 1 0 000 2c5.523 0 10 4.477 10 10a1 1 0 102 0C17 8.373 11.627 3 5 3z" />
                <path d="M4 9a1 1 0 011-1 7 7 0 017 7 1 1 0 11-2 0 5 5 0 00-5-5 1 1 0 01-1-1zM3 15a2 2 0 114 0 2 2 0 01-4 0z" />
              </svg>
              Subscribe to RSS Feed
            </a>
          </div>

          {/* Filter Buttons */}
          <div className="flex flex-wrap justify-center gap-3 mb-12">
            {filterOptions.map((option) => (
              <button
                key={option.value}
                onClick={() => setSelectedFilter(option.value)}
                className={`px-6 py-2 rounded-full border transition-all ${
                  selectedFilter === option.value
                    ? 'bg-[#7a5af8] border-[#7a5af8] text-white'
                    : 'bg-transparent border-gray-700 text-gray-400 hover:border-gray-600 hover:text-white'
                }`}
              >
                {option.label}
              </button>
            ))}
          </div>

          {/* Timeline */}
          <div className="relative">
            {/* Vertical line */}
            <div className="absolute left-0 md:left-1/2 transform md:-translate-x-1/2 w-0.5 h-full bg-gradient-to-b from-purple-500/50 via-purple-500/20 to-transparent" />

            {Object.entries(groupedEntries).map(([month, entries], monthIndex) => (
              <div key={month} className="relative mb-16">
                {/* Month label */}
                <div className="flex items-center justify-center mb-8">
                  <div className="bg-[#0a0a1a] border border-purple-500/30 px-6 py-2 rounded-full">
                    <span className="text-purple-400 font-semibold">{month}</span>
                  </div>
                </div>

                {/* Entries for this month */}
                {entries.map((entry, entryIndex) => (
                  <div
                    key={entry.id}
                    className={`relative flex items-center mb-12 ${
                      entryIndex % 2 === 0 ? 'md:flex-row' : 'md:flex-row-reverse'
                    }`}
                  >
                    {/* Timeline dot */}
                    <div className="absolute left-0 md:left-1/2 transform md:-translate-x-1/2 w-4 h-4 bg-purple-500 rounded-full border-4 border-[#000211] z-10" />

                    {/* Content card */}
                    <div className={`flex-1 ml-8 md:ml-0 ${
                      entryIndex % 2 === 0 ? 'md:pr-12 md:text-right' : 'md:pl-12 md:text-left'
                    }`}>
                      <div className={`inline-block max-w-xl ${
                        entryIndex % 2 === 0 ? 'md:ml-auto' : 'md:mr-auto'
                      }`}>
                        {/* Date */}
                        <div className={`text-sm text-gray-500 mb-2 ${
                          entryIndex % 2 === 0 ? 'md:text-right' : 'md:text-left'
                        }`}>
                          {entry.date}
                        </div>

                        {/* Card */}
                        <div className="bg-[#0a0a1a] border border-gray-800 rounded-xl p-6 hover:border-gray-700 transition-colors text-left">
                          {/* Type badge */}
                          <span className={`inline-flex items-center px-3 py-1 rounded-full text-xs font-medium border ${getTypeBadgeColor(entry.type)} mb-3`}>
                            {getTypeLabel(entry.type)}
                          </span>

                          {/* Title */}
                          <h3 className="text-xl font-semibold mb-2">{entry.title}</h3>

                          {/* Description */}
                          <p className="text-gray-400 mb-4">{entry.description}</p>

                          {/* Details list */}
                          {entry.details && (
                            <ul className="space-y-2 mb-4">
                              {entry.details.map((detail, idx) => (
                                <li key={idx} className="flex items-start gap-2 text-sm text-gray-500">
                                  <span className="text-purple-400 mt-1">•</span>
                                  <span>{detail}</span>
                                </li>
                              ))}
                            </ul>
                          )}

                          {/* Learn more link */}
                          {entry.learnMoreUrl && (
                            <a
                              href={entry.learnMoreUrl}
                              className="inline-flex items-center gap-2 text-purple-400 hover:text-purple-300 text-sm transition-colors"
                            >
                              Learn more
                              <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
                              </svg>
                            </a>
                          )}
                        </div>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            ))}
          </div>

          {/* Subscribe Section */}
          <div className="mt-24 max-w-2xl mx-auto">
            <div className="bg-gradient-to-r from-purple-900/20 to-blue-900/20 border border-purple-500/30 rounded-2xl p-8 text-center">
              <h2 className="text-2xl font-bold mb-3">Stay in the Loop</h2>
              <p className="text-gray-400 mb-6">
                Get notified about new features, improvements, and important updates
              </p>
              <form onSubmit={handleSubscribe} className="flex flex-col sm:flex-row gap-4 max-w-md mx-auto">
                <input
                  type="email"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  placeholder="Enter your email"
                  className="flex-1 px-4 py-3 bg-[#0a0a1a] border border-gray-700 rounded-lg text-white placeholder-gray-500 focus:outline-none focus:border-purple-500 transition-colors"
                  required
                />
                <button
                  type="submit"
                  className="px-6 py-3 bg-[#7a5af8] hover:bg-purple-600 rounded-lg font-medium transition-colors whitespace-nowrap"
                >
                  Subscribe
                </button>
              </form>
            </div>
          </div>
        </div>
      </main>

      <Footer />
    </div>
  );
}