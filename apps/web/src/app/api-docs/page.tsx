'use client'

import Navigation from '@/components/Navigation'
import Footer from '@/components/Footer'
import {
  Code2,
  Zap,
  Shield,
  Globe,
  Database,
  Webhook,
  Key,
  Terminal,
  Book,
  Layers,
  ArrowRight,
  Check,
  Clock,
  Users,
  Building2,
  FileText,
  Activity,
  Bot,
  BarChart3,
  Sparkles,
  Copy,
  CheckCircle2
} from 'lucide-react'
import { useState } from 'react'

export default function ApiDocsPage() {
  const [copiedCode, setCopiedCode] = useState<string | null>(null)

  const copyCode = (id: string, code: string) => {
    navigator.clipboard.writeText(code)
    setCopiedCode(id)
    setTimeout(() => setCopiedCode(null), 2000)
  }

  const quickStartCode = {
    node: `import { OpenMeetClient } from '@openmeet/sdk';

const client = new OpenMeetClient({
  apiKey: process.env.NEBULA_AI_API_KEY
});

// Get all meetings
const meetings = await client.meetings.list({
  limit: 10,
  orderBy: 'created_at'
});

// Get transcript for a meeting
const transcript = await client.transcripts.get(
  meetings[0].id
);`,
    python: `from nebula_ai import OpenMeetClient

client = OpenMeetClient(
    api_key=os.environ["NEBULA_AI_API_KEY"]
)

# Get all meetings
meetings = client.meetings.list(
    limit=10,
    order_by="created_at"
)

# Get transcript for a meeting
transcript = client.transcripts.get(
    meetings[0]["id"]
)`,
    curl: `# Get all meetings
curl -X GET https://api.openmeet.com/v1/meetings \\
  -H "Authorization: Bearer YOUR_API_KEY" \\
  -H "Content-Type: application/json"

# Get transcript
curl -X GET https://api.openmeet.com/v1/transcripts/{id} \\
  -H "Authorization: Bearer YOUR_API_KEY"`
  }

  const [selectedLanguage, setSelectedLanguage] = useState<'node' | 'python' | 'curl'>('node')

  const endpoints = [
    {
      category: 'Meetings',
      icon: Users,
      endpoints: [
        { method: 'GET', path: '/meetings', description: 'List all meetings' },
        { method: 'GET', path: '/meetings/{id}', description: 'Get meeting details' },
        { method: 'POST', path: '/meetings', description: 'Create new meeting' },
        { method: 'DELETE', path: '/meetings/{id}', description: 'Delete meeting' }
      ]
    },
    {
      category: 'Transcriptions',
      icon: FileText,
      endpoints: [
        { method: 'GET', path: '/transcripts/{id}', description: 'Get transcript' },
        { method: 'POST', path: '/transcripts/generate', description: 'Generate transcript' },
        { method: 'GET', path: '/transcripts/{id}/summary', description: 'Get AI summary' }
      ]
    },
    {
      category: 'Users',
      icon: Users,
      endpoints: [
        { method: 'GET', path: '/users', description: 'List users' },
        { method: 'GET', path: '/users/{id}', description: 'Get user details' },
        { method: 'PUT', path: '/users/{id}', description: 'Update user' }
      ]
    },
    {
      category: 'Webhooks',
      icon: Webhook,
      endpoints: [
        { method: 'GET', path: '/webhooks', description: 'List webhooks' },
        { method: 'POST', path: '/webhooks', description: 'Create webhook' },
        { method: 'DELETE', path: '/webhooks/{id}', description: 'Delete webhook' }
      ]
    }
  ]

  const rateLimits = [
    { tier: 'Free', requests: '100 / hour', burst: '10 / second' },
    { tier: 'Starter', requests: '1,000 / hour', burst: '50 / second' },
    { tier: 'Pro', requests: '10,000 / hour', burst: '100 / second' },
    { tier: 'Enterprise', requests: 'Unlimited', burst: 'Custom' }
  ]

  const sdks = [
    { name: 'Node.js', icon: '📦', status: 'Stable', version: 'v2.1.0' },
    { name: 'Python', icon: '🐍', status: 'Stable', version: 'v2.0.3' },
    { name: 'Go', icon: '🔷', status: 'Beta', version: 'v1.0.0-beta' },
    { name: 'Ruby', icon: '💎', status: 'Coming Soon', version: '-' },
    { name: 'PHP', icon: '🐘', status: 'Coming Soon', version: '-' },
    { name: 'Java', icon: '☕', status: 'Coming Soon', version: '-' }
  ]

  const useCases = [
    {
      title: 'Custom Integrations',
      description: 'Build tailored workflows with your existing tools',
      icon: Layers,
      examples: ['CRM sync', 'Project management', 'Custom dashboards']
    },
    {
      title: 'Analytics & Insights',
      description: 'Extract deep insights from meeting data',
      icon: BarChart3,
      examples: ['Sentiment analysis', 'Topic tracking', 'Performance metrics']
    },
    {
      title: 'Automation',
      description: 'Automate meeting workflows and follow-ups',
      icon: Bot,
      examples: ['Auto-summaries', 'Task extraction', 'Email follow-ups']
    }
  ]

  return (
    <>
      <Navigation />
      <main className="min-h-screen" style={{ backgroundColor: 'var(--ff-bg-dark)' }}>
        {/* Hero Section */}
        <section className="relative pt-32 pb-20 px-4 overflow-hidden">
          <div className="absolute inset-0 bg-gradient-to-b from-purple-900/10 to-transparent" />
          <div className="absolute top-0 left-1/2 -translate-x-1/2 w-full max-w-6xl h-96 bg-gradient-to-r from-purple-600/20 via-purple-500/20 to-purple-600/20 blur-3xl" />

          <div className="max-w-7xl mx-auto relative">
            <div className="text-center mb-16">
              <div className="inline-flex items-center gap-2 px-4 py-2 rounded-full border mb-6"
                   style={{ borderColor: 'var(--ff-purple-500)', backgroundColor: 'var(--ff-purple-500)/10' }}>
                <Sparkles className="w-4 h-4" style={{ color: 'var(--ff-purple-500)' }} />
                <span className="text-sm font-medium" style={{ color: 'var(--ff-purple-500)' }}>
                  Developer API v1.0
                </span>
              </div>

              <h1 className="text-5xl md:text-7xl font-bold mb-6 bg-gradient-to-r from-white to-gray-400 bg-clip-text text-transparent">
                Build with OpenMeet API
              </h1>

              <p className="text-xl md:text-2xl mb-12 max-w-3xl mx-auto" style={{ color: 'var(--ff-text-secondary)' }}>
                Developer-first platform for building intelligent meeting experiences.
                RESTful APIs, webhooks, and SDKs for seamless integration.
              </p>

              <div className="flex flex-col sm:flex-row gap-4 justify-center">
                <button className="px-8 py-4 rounded-lg font-semibold text-white flex items-center justify-center gap-2 transition-all hover:scale-105"
                        style={{ backgroundColor: 'var(--ff-purple-500)' }}>
                  <Key className="w-5 h-5" />
                  Get API Key
                  <ArrowRight className="w-4 h-4" />
                </button>
                <button className="px-8 py-4 rounded-lg font-semibold border flex items-center justify-center gap-2 transition-all hover:scale-105"
                        style={{ borderColor: 'var(--ff-border)', color: 'var(--ff-text-primary)', backgroundColor: 'var(--ff-bg-layer)' }}>
                  <Book className="w-5 h-5" />
                  View Full Documentation
                </button>
              </div>
            </div>

            {/* Key Features */}
            <div className="grid md:grid-cols-4 gap-6">
              {[
                { icon: Zap, title: 'Lightning Fast', desc: '< 100ms response time' },
                { icon: Shield, title: 'Enterprise Security', desc: 'SOC2 & GDPR compliant' },
                { icon: Globe, title: '99.9% Uptime', desc: 'Global infrastructure' },
                { icon: Database, title: 'Real-time Data', desc: 'Webhooks & streaming' }
              ].map((feature, idx) => (
                <div key={idx} className="p-6 rounded-xl border backdrop-blur-sm"
                     style={{ borderColor: 'var(--ff-border)', backgroundColor: 'var(--ff-bg-layer)/50' }}>
                  <feature.icon className="w-8 h-8 mb-3" style={{ color: 'var(--ff-purple-500)' }} />
                  <h3 className="font-semibold mb-1" style={{ color: 'var(--ff-text-primary)' }}>
                    {feature.title}
                  </h3>
                  <p className="text-sm" style={{ color: 'var(--ff-text-secondary)' }}>
                    {feature.desc}
                  </p>
                </div>
              ))}
            </div>
          </div>
        </section>

        {/* API Overview */}
        <section className="py-20 px-4">
          <div className="max-w-7xl mx-auto">
            <div className="text-center mb-12">
              <h2 className="text-3xl md:text-4xl font-bold mb-4" style={{ color: 'var(--ff-text-primary)' }}>
                API Overview
              </h2>
              <p className="text-lg" style={{ color: 'var(--ff-text-secondary)' }}>
                Choose the right API for your use case
              </p>
            </div>

            <div className="grid md:grid-cols-3 gap-6 mb-12">
              <div className="p-6 rounded-xl border"
                   style={{ borderColor: 'var(--ff-border)', backgroundColor: 'var(--ff-bg-layer)' }}>
                <div className="flex items-center gap-3 mb-4">
                  <Code2 className="w-6 h-6" style={{ color: 'var(--ff-purple-500)' }} />
                  <h3 className="text-xl font-semibold" style={{ color: 'var(--ff-text-primary)' }}>REST API v1</h3>
                </div>
                <p className="mb-4" style={{ color: 'var(--ff-text-secondary)' }}>
                  Simple, resource-based API with predictable URLs and standard HTTP methods.
                </p>
                <ul className="space-y-2">
                  {['JSON responses', 'Pagination support', 'Filter & sort options'].map((item, idx) => (
                    <li key={idx} className="flex items-center gap-2 text-sm" style={{ color: 'var(--ff-text-secondary)' }}>
                      <Check className="w-4 h-4" style={{ color: 'var(--ff-purple-500)' }} />
                      {item}
                    </li>
                  ))}
                </ul>
              </div>

              <div className="p-6 rounded-xl border"
                   style={{ borderColor: 'var(--ff-border)', backgroundColor: 'var(--ff-bg-layer)' }}>
                <div className="flex items-center gap-3 mb-4">
                  <Terminal className="w-6 h-6" style={{ color: 'var(--ff-purple-500)' }} />
                  <h3 className="text-xl font-semibold" style={{ color: 'var(--ff-text-primary)' }}>GraphQL API</h3>
                </div>
                <p className="mb-4" style={{ color: 'var(--ff-text-secondary)' }}>
                  Flexible queries to get exactly what you need in a single request.
                </p>
                <ul className="space-y-2">
                  {['Type safety', 'Real-time subscriptions', 'Nested queries'].map((item, idx) => (
                    <li key={idx} className="flex items-center gap-2 text-sm" style={{ color: 'var(--ff-text-secondary)' }}>
                      <Check className="w-4 h-4" style={{ color: 'var(--ff-purple-500)' }} />
                      {item}
                    </li>
                  ))}
                </ul>
              </div>

              <div className="p-6 rounded-xl border"
                   style={{ borderColor: 'var(--ff-border)', backgroundColor: 'var(--ff-bg-layer)' }}>
                <div className="flex items-center gap-3 mb-4">
                  <Webhook className="w-6 h-6" style={{ color: 'var(--ff-purple-500)' }} />
                  <h3 className="text-xl font-semibold" style={{ color: 'var(--ff-text-primary)' }}>Webhooks</h3>
                </div>
                <p className="mb-4" style={{ color: 'var(--ff-text-secondary)' }}>
                  Real-time event notifications delivered to your endpoints.
                </p>
                <ul className="space-y-2">
                  {['Instant notifications', 'Retry logic', 'Event filtering'].map((item, idx) => (
                    <li key={idx} className="flex items-center gap-2 text-sm" style={{ color: 'var(--ff-text-secondary)' }}>
                      <Check className="w-4 h-4" style={{ color: 'var(--ff-purple-500)' }} />
                      {item}
                    </li>
                  ))}
                </ul>
              </div>
            </div>

            {/* Rate Limits */}
            <div className="p-8 rounded-xl border"
                 style={{ borderColor: 'var(--ff-border)', backgroundColor: 'var(--ff-bg-layer)' }}>
              <div className="flex items-center gap-3 mb-6">
                <Clock className="w-6 h-6" style={{ color: 'var(--ff-purple-500)' }} />
                <h3 className="text-2xl font-semibold" style={{ color: 'var(--ff-text-primary)' }}>
                  Rate Limits by Tier
                </h3>
              </div>
              <div className="grid md:grid-cols-4 gap-4">
                {rateLimits.map((limit, idx) => (
                  <div key={idx} className="p-4 rounded-lg border"
                       style={{
                         borderColor: limit.tier === 'Enterprise' ? 'var(--ff-purple-500)' : 'var(--ff-border)',
                         backgroundColor: 'var(--ff-bg-dark)'
                       }}>
                    <h4 className="font-semibold mb-2"
                        style={{ color: limit.tier === 'Enterprise' ? 'var(--ff-purple-500)' : 'var(--ff-text-primary)' }}>
                      {limit.tier}
                    </h4>
                    <p className="text-2xl font-bold mb-1" style={{ color: 'var(--ff-text-primary)' }}>
                      {limit.requests}
                    </p>
                    <p className="text-sm" style={{ color: 'var(--ff-text-secondary)' }}>
                      Burst: {limit.burst}
                    </p>
                  </div>
                ))}
              </div>
            </div>
          </div>
        </section>

        {/* Quick Start */}
        <section className="py-20 px-4" style={{ backgroundColor: 'var(--ff-bg-layer)' }}>
          <div className="max-w-7xl mx-auto">
            <div className="text-center mb-12">
              <h2 className="text-3xl md:text-4xl font-bold mb-4" style={{ color: 'var(--ff-text-primary)' }}>
                Quick Start
              </h2>
              <p className="text-lg" style={{ color: 'var(--ff-text-secondary)' }}>
                Get up and running in minutes with our SDKs
              </p>
            </div>

            <div className="mb-6">
              <div className="flex gap-2 p-1 rounded-lg inline-flex"
                   style={{ backgroundColor: 'var(--ff-bg-dark)' }}>
                {(['node', 'python', 'curl'] as const).map((lang) => (
                  <button
                    key={lang}
                    onClick={() => setSelectedLanguage(lang)}
                    className={`px-4 py-2 rounded-md font-medium transition-all ${
                      selectedLanguage === lang ? 'text-white' : ''
                    }`}
                    style={{
                      backgroundColor: selectedLanguage === lang ? 'var(--ff-purple-500)' : 'transparent',
                      color: selectedLanguage === lang ? 'white' : 'var(--ff-text-secondary)'
                    }}
                  >
                    {lang === 'node' ? 'Node.js' : lang === 'python' ? 'Python' : 'cURL'}
                  </button>
                ))}
              </div>
            </div>

            <div className="relative rounded-xl overflow-hidden"
                 style={{ backgroundColor: 'var(--ff-bg-dark)', border: '1px solid var(--ff-border)' }}>
              <div className="flex items-center justify-between px-6 py-4 border-b"
                   style={{ borderColor: 'var(--ff-border)' }}>
                <span className="text-sm font-medium" style={{ color: 'var(--ff-text-secondary)' }}>
                  {selectedLanguage === 'node' ? 'JavaScript' : selectedLanguage === 'python' ? 'Python' : 'Shell'}
                </span>
                <button
                  onClick={() => copyCode(selectedLanguage, quickStartCode[selectedLanguage])}
                  className="flex items-center gap-2 px-3 py-1 rounded-md transition-all hover:bg-white/10"
                >
                  {copiedCode === selectedLanguage ? (
                    <>
                      <CheckCircle2 className="w-4 h-4" style={{ color: 'var(--ff-purple-500)' }} />
                      <span className="text-sm" style={{ color: 'var(--ff-purple-500)' }}>Copied!</span>
                    </>
                  ) : (
                    <>
                      <Copy className="w-4 h-4" style={{ color: 'var(--ff-text-secondary)' }} />
                      <span className="text-sm" style={{ color: 'var(--ff-text-secondary)' }}>Copy</span>
                    </>
                  )}
                </button>
              </div>
              <pre className="p-6 overflow-x-auto">
                <code className="text-sm" style={{ color: 'var(--ff-text-primary)' }}>
                  {quickStartCode[selectedLanguage]}
                </code>
              </pre>
            </div>
          </div>
        </section>

        {/* Available Endpoints */}
        <section className="py-20 px-4">
          <div className="max-w-7xl mx-auto">
            <div className="text-center mb-12">
              <h2 className="text-3xl md:text-4xl font-bold mb-4" style={{ color: 'var(--ff-text-primary)' }}>
                Available Endpoints
              </h2>
              <p className="text-lg" style={{ color: 'var(--ff-text-secondary)' }}>
                Complete REST API reference for all resources
              </p>
            </div>

            <div className="grid md:grid-cols-2 gap-6">
              {endpoints.map((category, idx) => (
                <div key={idx} className="rounded-xl border overflow-hidden"
                     style={{ borderColor: 'var(--ff-border)', backgroundColor: 'var(--ff-bg-layer)' }}>
                  <div className="p-6 border-b flex items-center gap-3"
                       style={{ borderColor: 'var(--ff-border)', backgroundColor: 'var(--ff-bg-dark)' }}>
                    <category.icon className="w-5 h-5" style={{ color: 'var(--ff-purple-500)' }} />
                    <h3 className="text-xl font-semibold" style={{ color: 'var(--ff-text-primary)' }}>
                      {category.category}
                    </h3>
                  </div>
                  <div className="p-6 space-y-3">
                    {category.endpoints.map((endpoint, endIdx) => (
                      <div key={endIdx} className="flex items-start gap-3">
                        <span className={`px-2 py-1 rounded text-xs font-mono font-semibold ${
                          endpoint.method === 'GET' ? 'bg-green-500/20 text-green-400' :
                          endpoint.method === 'POST' ? 'bg-blue-500/20 text-blue-400' :
                          endpoint.method === 'PUT' ? 'bg-yellow-500/20 text-yellow-400' :
                          'bg-red-500/20 text-red-400'
                        }`}>
                          {endpoint.method}
                        </span>
                        <div className="flex-1">
                          <code className="text-sm font-mono" style={{ color: 'var(--ff-text-primary)' }}>
                            {endpoint.path}
                          </code>
                          <p className="text-sm mt-1" style={{ color: 'var(--ff-text-secondary)' }}>
                            {endpoint.description}
                          </p>
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              ))}
            </div>
          </div>
        </section>

        {/* Authentication */}
        <section className="py-20 px-4" style={{ backgroundColor: 'var(--ff-bg-layer)' }}>
          <div className="max-w-7xl mx-auto">
            <div className="text-center mb-12">
              <h2 className="text-3xl md:text-4xl font-bold mb-4" style={{ color: 'var(--ff-text-primary)' }}>
                Authentication
              </h2>
              <p className="text-lg" style={{ color: 'var(--ff-text-secondary)' }}>
                Secure your API requests with multiple auth methods
              </p>
            </div>

            <div className="grid md:grid-cols-2 gap-8">
              <div className="p-8 rounded-xl border"
                   style={{ borderColor: 'var(--ff-border)', backgroundColor: 'var(--ff-bg-dark)' }}>
                <div className="flex items-center gap-3 mb-4">
                  <Key className="w-6 h-6" style={{ color: 'var(--ff-purple-500)' }} />
                  <h3 className="text-xl font-semibold" style={{ color: 'var(--ff-text-primary)' }}>API Keys</h3>
                </div>
                <p className="mb-6" style={{ color: 'var(--ff-text-secondary)' }}>
                  Simple authentication for server-to-server communication. Generate keys in your dashboard.
                </p>
                <div className="p-4 rounded-lg" style={{ backgroundColor: 'var(--ff-bg-layer)' }}>
                  <code className="text-sm" style={{ color: 'var(--ff-text-primary)' }}>
                    Authorization: Bearer YOUR_API_KEY
                  </code>
                </div>
                <ul className="mt-6 space-y-2">
                  {['Rotate keys anytime', 'Scope permissions', 'IP whitelisting'].map((item, idx) => (
                    <li key={idx} className="flex items-center gap-2 text-sm" style={{ color: 'var(--ff-text-secondary)' }}>
                      <Check className="w-4 h-4" style={{ color: 'var(--ff-purple-500)' }} />
                      {item}
                    </li>
                  ))}
                </ul>
              </div>

              <div className="p-8 rounded-xl border"
                   style={{ borderColor: 'var(--ff-border)', backgroundColor: 'var(--ff-bg-dark)' }}>
                <div className="flex items-center gap-3 mb-4">
                  <Shield className="w-6 h-6" style={{ color: 'var(--ff-purple-500)' }} />
                  <h3 className="text-xl font-semibold" style={{ color: 'var(--ff-text-primary)' }}>OAuth 2.0</h3>
                </div>
                <p className="mb-6" style={{ color: 'var(--ff-text-secondary)' }}>
                  Industry-standard protocol for user authorization. Perfect for building apps.
                </p>
                <div className="p-4 rounded-lg" style={{ backgroundColor: 'var(--ff-bg-layer)' }}>
                  <code className="text-sm" style={{ color: 'var(--ff-text-primary)' }}>
                    https://auth.openmeet.com/oauth/authorize
                  </code>
                </div>
                <ul className="mt-6 space-y-2">
                  {['Authorization code flow', 'Refresh tokens', 'PKCE support'].map((item, idx) => (
                    <li key={idx} className="flex items-center gap-2 text-sm" style={{ color: 'var(--ff-text-secondary)' }}>
                      <Check className="w-4 h-4" style={{ color: 'var(--ff-purple-500)' }} />
                      {item}
                    </li>
                  ))}
                </ul>
              </div>
            </div>
          </div>
        </section>

        {/* SDKs */}
        <section className="py-20 px-4">
          <div className="max-w-7xl mx-auto">
            <div className="text-center mb-12">
              <h2 className="text-3xl md:text-4xl font-bold mb-4" style={{ color: 'var(--ff-text-primary)' }}>
                Official SDKs
              </h2>
              <p className="text-lg" style={{ color: 'var(--ff-text-secondary)' }}>
                Native libraries for your favorite languages
              </p>
            </div>

            <div className="grid md:grid-cols-3 gap-6">
              {sdks.map((sdk, idx) => (
                <div key={idx} className="p-6 rounded-xl border transition-all hover:scale-105"
                     style={{ borderColor: 'var(--ff-border)', backgroundColor: 'var(--ff-bg-layer)' }}>
                  <div className="flex items-center justify-between mb-4">
                    <div className="flex items-center gap-3">
                      <span className="text-2xl">{sdk.icon}</span>
                      <h3 className="text-xl font-semibold" style={{ color: 'var(--ff-text-primary)' }}>
                        {sdk.name}
                      </h3>
                    </div>
                    <span className={`px-2 py-1 rounded-full text-xs font-medium ${
                      sdk.status === 'Stable' ? 'bg-green-500/20 text-green-400' :
                      sdk.status === 'Beta' ? 'bg-yellow-500/20 text-yellow-400' :
                      'bg-gray-500/20 text-gray-400'
                    }`}>
                      {sdk.status}
                    </span>
                  </div>
                  <p className="text-sm" style={{ color: 'var(--ff-text-secondary)' }}>
                    {sdk.version !== '-' ? `Latest: ${sdk.version}` : 'In development'}
                  </p>
                  {sdk.status !== 'Coming Soon' && (
                    <button className="mt-4 text-sm font-medium flex items-center gap-1 transition-colors"
                            style={{ color: 'var(--ff-purple-500)' }}>
                      View on GitHub
                      <ArrowRight className="w-3 h-3" />
                    </button>
                  )}
                </div>
              ))}
            </div>
          </div>
        </section>

        {/* Use Cases */}
        <section className="py-20 px-4" style={{ backgroundColor: 'var(--ff-bg-layer)' }}>
          <div className="max-w-7xl mx-auto">
            <div className="text-center mb-12">
              <h2 className="text-3xl md:text-4xl font-bold mb-4" style={{ color: 'var(--ff-text-primary)' }}>
                Use Cases
              </h2>
              <p className="text-lg" style={{ color: 'var(--ff-text-secondary)' }}>
                Build powerful applications with OpenMeet API
              </p>
            </div>

            <div className="grid md:grid-cols-3 gap-8">
              {useCases.map((useCase, idx) => (
                <div key={idx} className="p-8 rounded-xl border"
                     style={{ borderColor: 'var(--ff-border)', backgroundColor: 'var(--ff-bg-dark)' }}>
                  <useCase.icon className="w-10 h-10 mb-4" style={{ color: 'var(--ff-purple-500)' }} />
                  <h3 className="text-xl font-semibold mb-3" style={{ color: 'var(--ff-text-primary)' }}>
                    {useCase.title}
                  </h3>
                  <p className="mb-6" style={{ color: 'var(--ff-text-secondary)' }}>
                    {useCase.description}
                  </p>
                  <div className="space-y-2">
                    {useCase.examples.map((example, exIdx) => (
                      <div key={exIdx} className="flex items-center gap-2">
                        <Activity className="w-4 h-4" style={{ color: 'var(--ff-purple-500)' }} />
                        <span className="text-sm" style={{ color: 'var(--ff-text-secondary)' }}>
                          {example}
                        </span>
                      </div>
                    ))}
                  </div>
                </div>
              ))}
            </div>
          </div>
        </section>

        {/* CTA Section */}
        <section className="py-20 px-4">
          <div className="max-w-4xl mx-auto text-center">
            <h2 className="text-3xl md:text-5xl font-bold mb-6" style={{ color: 'var(--ff-text-primary)' }}>
              Ready to build something amazing?
            </h2>
            <p className="text-xl mb-12" style={{ color: 'var(--ff-text-secondary)' }}>
              Get your API key and start building in minutes. Free tier available.
            </p>

            <div className="flex flex-col sm:flex-row gap-4 justify-center">
              <button className="px-8 py-4 rounded-lg font-semibold text-white flex items-center justify-center gap-2 transition-all hover:scale-105"
                      style={{ backgroundColor: 'var(--ff-purple-500)' }}>
                <Key className="w-5 h-5" />
                Get API Key
                <ArrowRight className="w-4 h-4" />
              </button>
              <button className="px-8 py-4 rounded-lg font-semibold border flex items-center justify-center gap-2 transition-all hover:scale-105"
                      style={{ borderColor: 'var(--ff-border)', color: 'var(--ff-text-primary)', backgroundColor: 'var(--ff-bg-layer)' }}>
                <Book className="w-5 h-5" />
                View Full Documentation
              </button>
            </div>

            <div className="mt-12 flex items-center justify-center gap-8">
              <div className="text-center">
                <p className="text-3xl font-bold" style={{ color: 'var(--ff-text-primary)' }}>10M+</p>
                <p className="text-sm" style={{ color: 'var(--ff-text-secondary)' }}>API calls daily</p>
              </div>
              <div className="text-center">
                <p className="text-3xl font-bold" style={{ color: 'var(--ff-text-primary)' }}>5,000+</p>
                <p className="text-sm" style={{ color: 'var(--ff-text-secondary)' }}>Developers</p>
              </div>
              <div className="text-center">
                <p className="text-3xl font-bold" style={{ color: 'var(--ff-text-primary)' }}>99.9%</p>
                <p className="text-sm" style={{ color: 'var(--ff-text-secondary)' }}>Uptime</p>
              </div>
            </div>
          </div>
        </section>
      </main>
      <Footer />
    </>
  )
}