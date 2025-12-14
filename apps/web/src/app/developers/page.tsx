'use client';

import React, { useState } from 'react';
import Navigation from '@/components/Navigation';
import Footer from '@/components/Footer';
import { CheckIcon, ClipboardIcon, ChevronRightIcon } from 'lucide-react';

const DevelopersPage = () => {
  const [activeTab, setActiveTab] = useState('javascript');
  const [copiedCode, setCopiedCode] = useState<string | null>(null);

  const copyToClipboard = (code: string, id: string) => {
    navigator.clipboard.writeText(code);
    setCopiedCode(id);
    setTimeout(() => setCopiedCode(null), 2000);
  };

  const codeExamples = {
    javascript: {
      create: `// Create a new meeting
const response = await fetch('https://api.openmeet.com/v1/meetings', {
  method: 'POST',
  headers: {
    'Authorization': 'Bearer YOUR_API_KEY',
    'Content-Type': 'application/json'
  },
  body: JSON.stringify({
    title: 'Product Planning',
    participants: ['john@example.com', 'jane@example.com'],
    scheduledAt: '2024-01-15T10:00:00Z'
  })
});

const meeting = await response.json();
console.log(meeting.id); // meet_abc123`,
      transcript: `// Get meeting transcript
const response = await fetch('https://api.openmeet.com/v1/meetings/meet_abc123/transcript', {
  headers: {
    'Authorization': 'Bearer YOUR_API_KEY'
  }
});

const transcript = await response.json();
console.log(transcript.text);`,
      search: `// Search meetings
const response = await fetch('https://api.openmeet.com/v1/search', {
  method: 'POST',
  headers: {
    'Authorization': 'Bearer YOUR_API_KEY',
    'Content-Type': 'application/json'
  },
  body: JSON.stringify({
    query: 'budget discussion',
    filters: {
      dateRange: '2024-01-01:2024-01-31'
    }
  })
});

const results = await response.json();`
    },
    python: {
      create: `# Create a new meeting
import requests

response = requests.post(
    'https://api.openmeet.com/v1/meetings',
    headers={
        'Authorization': 'Bearer YOUR_API_KEY',
        'Content-Type': 'application/json'
    },
    json={
        'title': 'Product Planning',
        'participants': ['john@example.com', 'jane@example.com'],
        'scheduledAt': '2024-01-15T10:00:00Z'
    }
)

meeting = response.json()
print(meeting['id'])  # meet_abc123`,
      transcript: `# Get meeting transcript
import requests

response = requests.get(
    'https://api.openmeet.com/v1/meetings/meet_abc123/transcript',
    headers={'Authorization': 'Bearer YOUR_API_KEY'}
)

transcript = response.json()
print(transcript['text'])`,
      search: `# Search meetings
import requests

response = requests.post(
    'https://api.openmeet.com/v1/search',
    headers={
        'Authorization': 'Bearer YOUR_API_KEY',
        'Content-Type': 'application/json'
    },
    json={
        'query': 'budget discussion',
        'filters': {
            'dateRange': '2024-01-01:2024-01-31'
        }
    }
)

results = response.json()`
    },
    curl: {
      create: `# Create a new meeting
curl -X POST https://api.openmeet.com/v1/meetings \\
  -H "Authorization: Bearer YOUR_API_KEY" \\
  -H "Content-Type: application/json" \\
  -d '{
    "title": "Product Planning",
    "participants": ["john@example.com", "jane@example.com"],
    "scheduledAt": "2024-01-15T10:00:00Z"
  }'`,
      transcript: `# Get meeting transcript
curl https://api.openmeet.com/v1/meetings/meet_abc123/transcript \\
  -H "Authorization: Bearer YOUR_API_KEY"`,
      search: `# Search meetings
curl -X POST https://api.openmeet.com/v1/search \\
  -H "Authorization: Bearer YOUR_API_KEY" \\
  -H "Content-Type: application/json" \\
  -d '{
    "query": "budget discussion",
    "filters": {
      "dateRange": "2024-01-01:2024-01-31"
    }
  }'`
    }
  };

  const apiHighlights = [
    {
      title: 'REST API v1',
      description: 'Full CRUD operations',
      details: 'Complete RESTful API with standard HTTP methods for all resources',
      icon: (
        <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 9l3 3-3 3m5 0h3M5 20h14a2 2 0 002-2V6a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z" />
        </svg>
      )
    },
    {
      title: 'GraphQL API',
      description: 'Flexible queries + subscriptions',
      details: 'Query exactly what you need with real-time subscriptions',
      icon: (
        <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 10V3L4 14h7v7l9-11h-7z" />
        </svg>
      )
    },
    {
      title: 'WebSocket',
      description: 'Real-time events',
      details: 'Live updates for meetings, transcripts, and analytics',
      icon: (
        <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8.111 16.404a5.5 5.5 0 017.778 0M12 20h.01m-7.08-7.071c3.904-3.905 10.236-3.905 14.141 0M1.394 9.393c5.857-5.857 15.355-5.857 21.213 0" />
        </svg>
      )
    },
    {
      title: 'Webhooks',
      description: 'Event-driven integrations',
      details: 'Receive notifications when important events occur',
      icon: (
        <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13.828 10.172a4 4 0 00-5.656 0l-4 4a4 4 0 105.656 5.656l1.102-1.101m-.758-4.899a4 4 0 005.656 0l4-4a4 4 0 00-5.656-5.656l-1.1 1.1" />
        </svg>
      )
    }
  ];

  const pricingTiers = [
    { tier: 'Free', limit: '100 requests/day', description: 'Perfect for testing and development' },
    { tier: 'Pro', limit: '10,000 requests/day', description: 'For growing teams and applications' },
    { tier: 'Enterprise', limit: 'Unlimited', description: 'Custom limits and dedicated support' }
  ];

  return (
    <div className="min-h-screen bg-[#000211]">
      <Navigation />

      {/* Hero Section */}
      <section className="pt-32 pb-20 px-4 sm:px-6 lg:px-8">
        <div className="max-w-7xl mx-auto">
          <div className="text-center max-w-3xl mx-auto mb-12">
            <h1 className="text-5xl sm:text-6xl font-bold mb-6 bg-gradient-to-r from-white to-[#7a5af8] bg-clip-text text-transparent">
              Build with OpenMeet API
            </h1>
            <p className="text-xl text-gray-400 mb-8">
              Full REST + GraphQL API access to power your applications
            </p>

            {/* Quick Start Preview */}
            <div className="bg-[#0a0a1a] rounded-xl p-6 text-left border border-gray-800">
              <div className="flex items-center justify-between mb-4">
                <span className="text-sm text-gray-500">Quick Start</span>
                <button
                  onClick={() => copyToClipboard('npm install @openmeet/sdk', 'quickstart')}
                  className="text-gray-400 hover:text-white transition-colors"
                >
                  {copiedCode === 'quickstart' ? (
                    <CheckIcon className="w-4 h-4" />
                  ) : (
                    <ClipboardIcon className="w-4 h-4" />
                  )}
                </button>
              </div>
              <pre className="text-sm text-gray-300">
                <code>{`npm install @openmeet/sdk

import { OpenMeetClient } from '@openmeet/sdk';

const client = new OpenMeetClient('YOUR_API_KEY');
const meetings = await client.meetings.list();`}</code>
              </pre>
            </div>
          </div>
        </div>
      </section>

      {/* API Highlights */}
      <section className="py-20 px-4 sm:px-6 lg:px-8 bg-[#0a0a1a]/50">
        <div className="max-w-7xl mx-auto">
          <h2 className="text-3xl font-bold mb-12 text-center">API Capabilities</h2>
          <div className="grid md:grid-cols-2 lg:grid-cols-4 gap-6">
            {apiHighlights.map((highlight, index) => (
              <div
                key={index}
                className="bg-[#0a0a1a] rounded-xl p-6 border border-gray-800 hover:border-[#7a5af8]/50 transition-all"
              >
                <div className="flex items-center gap-3 mb-4 text-[#7a5af8]">
                  {highlight.icon}
                  <h3 className="font-semibold text-white">{highlight.title}</h3>
                </div>
                <p className="text-gray-400 text-sm mb-2">{highlight.description}</p>
                <p className="text-gray-500 text-xs">{highlight.details}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* Code Examples */}
      <section className="py-20 px-4 sm:px-6 lg:px-8">
        <div className="max-w-7xl mx-auto">
          <h2 className="text-3xl font-bold mb-12 text-center">Code Examples</h2>

          {/* Tab Navigation */}
          <div className="flex justify-center mb-8">
            <div className="inline-flex bg-[#0a0a1a] rounded-lg p-1 border border-gray-800">
              {['javascript', 'python', 'curl'].map((lang) => (
                <button
                  key={lang}
                  onClick={() => setActiveTab(lang)}
                  className={`px-6 py-2 rounded-md capitalize transition-all ${
                    activeTab === lang
                      ? 'bg-[#7a5af8] text-white'
                      : 'text-gray-400 hover:text-white'
                  }`}
                >
                  {lang === 'javascript' ? 'JavaScript' : lang === 'curl' ? 'cURL' : 'Python'}
                </button>
              ))}
            </div>
          </div>

          {/* Code Examples Grid */}
          <div className="grid lg:grid-cols-3 gap-6">
            {Object.entries(codeExamples[activeTab as keyof typeof codeExamples]).map(([key, code]) => (
              <div key={key} className="bg-[#0a0a1a] rounded-xl border border-gray-800">
                <div className="flex items-center justify-between p-4 border-b border-gray-800">
                  <span className="text-sm font-medium text-gray-300 capitalize">
                    {key === 'create' ? 'Create Meeting' : key === 'transcript' ? 'Get Transcript' : 'Search'}
                  </span>
                  <button
                    onClick={() => copyToClipboard(code, `${activeTab}-${key}`)}
                    className="text-gray-400 hover:text-white transition-colors"
                  >
                    {copiedCode === `${activeTab}-${key}` ? (
                      <CheckIcon className="w-4 h-4" />
                    ) : (
                      <ClipboardIcon className="w-4 h-4" />
                    )}
                  </button>
                </div>
                <pre className="p-4 text-xs text-gray-300 overflow-x-auto">
                  <code>{code}</code>
                </pre>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* SDK Section */}
      <section className="py-20 px-4 sm:px-6 lg:px-8 bg-[#0a0a1a]/50">
        <div className="max-w-7xl mx-auto">
          <div className="text-center mb-12">
            <h2 className="text-3xl font-bold mb-4">Official SDKs</h2>
            <p className="text-gray-400">Auto-generated SDKs for popular languages</p>
          </div>

          <div className="grid md:grid-cols-3 gap-6 max-w-4xl mx-auto">
            <div className="bg-[#0a0a1a] rounded-xl p-6 border border-gray-800">
              <h3 className="font-semibold mb-3">JavaScript/TypeScript</h3>
              <code className="text-sm text-[#7a5af8] block mb-4">npm install @openmeet/sdk</code>
              <a href="https://github.com/openmeet/js-sdk" className="text-gray-400 hover:text-white text-sm inline-flex items-center gap-1">
                View on GitHub <ChevronRightIcon className="w-3 h-3" />
              </a>
            </div>

            <div className="bg-[#0a0a1a] rounded-xl p-6 border border-gray-800">
              <h3 className="font-semibold mb-3">Python</h3>
              <code className="text-sm text-[#7a5af8] block mb-4">pip install openmeet-sdk</code>
              <a href="https://github.com/openmeet/python-sdk" className="text-gray-400 hover:text-white text-sm inline-flex items-center gap-1">
                View on GitHub <ChevronRightIcon className="w-3 h-3" />
              </a>
            </div>

            <div className="bg-[#0a0a1a] rounded-xl p-6 border border-gray-800">
              <h3 className="font-semibold mb-3">Go</h3>
              <code className="text-sm text-[#7a5af8] block mb-4">go get github.com/openmeet/go-sdk</code>
              <a href="https://github.com/openmeet/go-sdk" className="text-gray-400 hover:text-white text-sm inline-flex items-center gap-1">
                View on GitHub <ChevronRightIcon className="w-3 h-3" />
              </a>
            </div>
          </div>
        </div>
      </section>

      {/* Rate Limits & Pricing */}
      <section className="py-20 px-4 sm:px-6 lg:px-8">
        <div className="max-w-7xl mx-auto">
          <h2 className="text-3xl font-bold mb-12 text-center">Rate Limits & Pricing</h2>

          <div className="grid md:grid-cols-3 gap-6 max-w-4xl mx-auto">
            {pricingTiers.map((tier, index) => (
              <div
                key={index}
                className={`bg-[#0a0a1a] rounded-xl p-6 border ${
                  tier.tier === 'Pro' ? 'border-[#7a5af8]' : 'border-gray-800'
                }`}
              >
                <h3 className="text-xl font-semibold mb-2">{tier.tier}</h3>
                <p className="text-2xl font-bold text-[#7a5af8] mb-3">{tier.limit}</p>
                <p className="text-sm text-gray-400">{tier.description}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* Authentication */}
      <section className="py-20 px-4 sm:px-6 lg:px-8 bg-[#0a0a1a]/50">
        <div className="max-w-7xl mx-auto">
          <div className="max-w-3xl mx-auto text-center">
            <h2 className="text-3xl font-bold mb-8">Authentication</h2>

            <div className="grid md:grid-cols-3 gap-6 text-left">
              <div className="bg-[#0a0a1a] rounded-xl p-6 border border-gray-800">
                <h3 className="font-semibold mb-2">API Keys</h3>
                <p className="text-sm text-gray-400">Simple bearer token authentication for quick integration</p>
              </div>

              <div className="bg-[#0a0a1a] rounded-xl p-6 border border-gray-800">
                <h3 className="font-semibold mb-2">OAuth 2.0</h3>
                <p className="text-sm text-gray-400">Secure authorization flow for user-facing applications</p>
              </div>

              <div className="bg-[#0a0a1a] rounded-xl p-6 border border-gray-800">
                <h3 className="font-semibold mb-2">JWT Tokens</h3>
                <p className="text-sm text-gray-400">Stateless authentication with refresh token support</p>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* Quick Links */}
      <section className="py-20 px-4 sm:px-6 lg:px-8">
        <div className="max-w-7xl mx-auto">
          <h2 className="text-3xl font-bold mb-12 text-center">Developer Resources</h2>

          <div className="grid md:grid-cols-2 lg:grid-cols-4 gap-4 max-w-4xl mx-auto">
            <a
              href="/api-docs"
              className="bg-[#0a0a1a] rounded-xl p-4 border border-gray-800 hover:border-[#7a5af8]/50 transition-all flex items-center justify-between group"
            >
              <span>API Reference</span>
              <ChevronRightIcon className="w-4 h-4 text-gray-400 group-hover:text-[#7a5af8] transition-colors" />
            </a>

            <a
              href="/graphql"
              className="bg-[#0a0a1a] rounded-xl p-4 border border-gray-800 hover:border-[#7a5af8]/50 transition-all flex items-center justify-between group"
            >
              <span>GraphQL Playground</span>
              <ChevronRightIcon className="w-4 h-4 text-gray-400 group-hover:text-[#7a5af8] transition-colors" />
            </a>

            <a
              href="https://status.openmeet.com"
              className="bg-[#0a0a1a] rounded-xl p-4 border border-gray-800 hover:border-[#7a5af8]/50 transition-all flex items-center justify-between group"
            >
              <span>Status Page</span>
              <ChevronRightIcon className="w-4 h-4 text-gray-400 group-hover:text-[#7a5af8] transition-colors" />
            </a>

            <a
              href="/changelog"
              className="bg-[#0a0a1a] rounded-xl p-4 border border-gray-800 hover:border-[#7a5af8]/50 transition-all flex items-center justify-between group"
            >
              <span>Changelog</span>
              <ChevronRightIcon className="w-4 h-4 text-gray-400 group-hover:text-[#7a5af8] transition-colors" />
            </a>
          </div>
        </div>
      </section>

      {/* Get Started CTA */}
      <section className="py-20 px-4 sm:px-6 lg:px-8">
        <div className="max-w-4xl mx-auto">
          <div className="bg-gradient-to-r from-[#7a5af8]/20 to-transparent rounded-2xl p-12 border border-[#7a5af8]/30 text-center">
            <h2 className="text-3xl font-bold mb-4">Ready to Build?</h2>
            <p className="text-gray-400 mb-8">Get your API key and start integrating OpenMeet today</p>
            <a
              href="/dashboard"
              className="inline-flex items-center gap-2 bg-[#7a5af8] text-white px-8 py-3 rounded-lg font-medium hover:bg-[#6949d7] transition-colors"
            >
              Get Your API Key
              <ChevronRightIcon className="w-4 h-4" />
            </a>
          </div>
        </div>
      </section>

      <Footer />
    </div>
  );
};

export default DevelopersPage;