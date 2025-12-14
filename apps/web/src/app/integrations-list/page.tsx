'use client';

import { useState, useMemo } from 'react';
import Navigation from '@/components/Navigation';
import Footer from '@/components/Footer';
import {
  Search, Video, Users, Calendar, MessageSquare,
  CheckSquare, FolderOpen, Zap, Code, ChevronRight,
  Plus, Filter, Grid3x3, List, ExternalLink,
  Building2, ArrowRight, Sparkles
} from 'lucide-react';

// Integration type definition
interface Integration {
  id: string;
  name: string;
  category: string;
  description: string;
  logo?: string; // Placeholder for logo URL
  status: 'available' | 'coming-soon' | 'beta';
  popular?: boolean;
}

// Categories with their icons
const categories = [
  { id: 'all', name: 'All Integrations', icon: Grid3x3 },
  { id: 'video', name: 'Video Conferencing', icon: Video },
  { id: 'crm', name: 'CRM', icon: Users },
  { id: 'calendar', name: 'Calendar', icon: Calendar },
  { id: 'messaging', name: 'Messaging', icon: MessageSquare },
  { id: 'tasks', name: 'Task Management', icon: CheckSquare },
  { id: 'storage', name: 'Storage', icon: FolderOpen },
  { id: 'automation', name: 'Automation', icon: Zap },
];

// All integrations data
const allIntegrations: Integration[] = [
  // Video Conferencing
  { id: 'zoom', name: 'Zoom', category: 'video', description: 'Host and record Zoom meetings with automatic transcription', status: 'available', popular: true },
  { id: 'google-meet', name: 'Google Meet', category: 'video', description: 'Seamlessly integrate with Google Meet for instant recording', status: 'available', popular: true },
  { id: 'teams', name: 'Microsoft Teams', category: 'video', description: 'Full Microsoft Teams integration with live transcription', status: 'available', popular: true },
  { id: 'webex', name: 'Webex', category: 'video', description: 'Connect Webex meetings for enterprise-grade recording', status: 'available' },

  // CRM
  { id: 'salesforce', name: 'Salesforce', category: 'crm', description: 'Sync meeting insights directly to Salesforce records', status: 'available', popular: true },
  { id: 'hubspot', name: 'HubSpot', category: 'crm', description: 'Automatically log calls and meetings in HubSpot CRM', status: 'available', popular: true },
  { id: 'pipedrive', name: 'Pipedrive', category: 'crm', description: 'Track deals and conversations in Pipedrive', status: 'available' },
  { id: 'dynamics', name: 'Dynamics 365', category: 'crm', description: 'Enterprise CRM integration with Microsoft Dynamics', status: 'beta' },

  // Calendar
  { id: 'google-calendar', name: 'Google Calendar', category: 'calendar', description: 'Auto-join scheduled meetings from Google Calendar', status: 'available', popular: true },
  { id: 'outlook', name: 'Outlook Calendar', category: 'calendar', description: 'Sync with Outlook for automatic meeting detection', status: 'available', popular: true },
  { id: 'ical', name: 'iCal', category: 'calendar', description: 'Support for standard iCal format and Apple Calendar', status: 'available' },
  { id: 'calendly', name: 'Calendly', category: 'calendar', description: 'Integrate scheduled Calendly meetings automatically', status: 'coming-soon' },

  // Messaging
  { id: 'slack', name: 'Slack', category: 'messaging', description: 'Share meeting summaries and action items to Slack channels', status: 'available', popular: true },
  { id: 'teams-chat', name: 'Teams Chat', category: 'messaging', description: 'Post updates directly to Microsoft Teams channels', status: 'available' },
  { id: 'discord', name: 'Discord', category: 'messaging', description: 'Send meeting insights to Discord servers', status: 'beta' },
  { id: 'whatsapp', name: 'WhatsApp Business', category: 'messaging', description: 'Share summaries via WhatsApp Business API', status: 'coming-soon' },

  // Task Management
  { id: 'asana', name: 'Asana', category: 'tasks', description: 'Create tasks from action items automatically in Asana', status: 'available', popular: true },
  { id: 'jira', name: 'Jira', category: 'tasks', description: 'Generate Jira tickets from meeting discussions', status: 'available', popular: true },
  { id: 'linear', name: 'Linear', category: 'tasks', description: 'Sync action items to Linear for modern teams', status: 'available' },
  { id: 'monday', name: 'Monday.com', category: 'tasks', description: 'Update Monday.com boards with meeting outcomes', status: 'available' },
  { id: 'trello', name: 'Trello', category: 'tasks', description: 'Create Trello cards from meeting action items', status: 'available' },
  { id: 'notion', name: 'Notion', category: 'tasks', description: 'Save meeting notes directly to Notion workspace', status: 'beta', popular: true },
  { id: 'clickup', name: 'ClickUp', category: 'tasks', description: 'Integrate meeting tasks with ClickUp workflows', status: 'coming-soon' },

  // Storage
  { id: 'google-drive', name: 'Google Drive', category: 'storage', description: 'Save recordings and transcripts to Google Drive', status: 'available', popular: true },
  { id: 'dropbox', name: 'Dropbox', category: 'storage', description: 'Store meeting files securely in Dropbox', status: 'available' },
  { id: 'onedrive', name: 'OneDrive', category: 'storage', description: 'Sync with Microsoft OneDrive for Business', status: 'available' },
  { id: 'box', name: 'Box', category: 'storage', description: 'Enterprise-grade storage with Box integration', status: 'beta' },
  { id: 's3', name: 'AWS S3', category: 'storage', description: 'Store recordings in your own S3 buckets', status: 'available' },

  // Automation
  { id: 'zapier', name: 'Zapier', category: 'automation', description: 'Connect with 5000+ apps through Zapier workflows', status: 'available', popular: true },
  { id: 'make', name: 'Make', category: 'automation', description: 'Build complex automation scenarios with Make', status: 'available' },
  { id: 'n8n', name: 'n8n', category: 'automation', description: 'Self-hosted workflow automation with n8n', status: 'beta' },
  { id: 'ifttt', name: 'IFTTT', category: 'automation', description: 'Simple if-this-then-that automation rules', status: 'coming-soon' },
  { id: 'power-automate', name: 'Power Automate', category: 'automation', description: 'Microsoft Power Automate for enterprise workflows', status: 'available' },
];

export default function IntegrationsListPage() {
  const [selectedCategory, setSelectedCategory] = useState('all');
  const [searchQuery, setSearchQuery] = useState('');
  const [viewMode, setViewMode] = useState<'grid' | 'list'>('grid');

  // Filter integrations based on category and search
  const filteredIntegrations = useMemo(() => {
    let filtered = allIntegrations;

    // Filter by category
    if (selectedCategory !== 'all') {
      filtered = filtered.filter(item => item.category === selectedCategory);
    }

    // Filter by search query
    if (searchQuery) {
      filtered = filtered.filter(item =>
        item.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
        item.description.toLowerCase().includes(searchQuery.toLowerCase())
      );
    }

    return filtered;
  }, [selectedCategory, searchQuery]);

  return (
    <div className="min-h-screen bg-[#000211]">
      <Navigation />

      <main className="pt-20">
        {/* Hero Section */}
        <section className="relative py-24 overflow-hidden">
          {/* Background gradient */}
          <div className="absolute inset-0 bg-gradient-to-b from-purple-900/20 via-transparent to-transparent" />

          <div className="container mx-auto px-6 relative z-10">
            <div className="text-center max-w-4xl mx-auto">
              <div className="inline-flex items-center gap-2 bg-purple-500/10 px-4 py-2 rounded-full mb-6 border border-purple-500/20">
                <Sparkles className="w-4 h-4 text-purple-400" />
                <span className="text-sm text-purple-300">40+ Integrations Available</span>
              </div>

              <h1 className="text-5xl md:text-6xl font-bold mb-6 text-white">
                Integrations That Work{' '}
                <span className="text-transparent bg-clip-text bg-gradient-to-r from-purple-400 to-pink-400">
                  For You
                </span>
              </h1>

              <p className="text-xl text-gray-300 mb-12 max-w-2xl mx-auto">
                Connect with the tools your team already uses. Seamlessly integrate your workflow
                and boost productivity with our growing ecosystem of partners.
              </p>

              {/* Search Bar */}
              <div className="max-w-2xl mx-auto">
                <div className="relative">
                  <Search className="absolute left-4 top-1/2 -translate-y-1/2 w-5 h-5 text-gray-400" />
                  <input
                    type="text"
                    placeholder="Search integrations..."
                    value={searchQuery}
                    onChange={(e) => setSearchQuery(e.target.value)}
                    className="w-full pl-12 pr-4 py-4 bg-[#0a0a1a] border border-gray-800 rounded-xl
                             text-white placeholder-gray-500 focus:outline-none focus:border-purple-500
                             transition-colors"
                  />
                </div>
              </div>
            </div>
          </div>
        </section>

        {/* Category Tabs and View Toggle */}
        <section className="py-8 border-b border-gray-800">
          <div className="container mx-auto px-6">
            <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-6">
              {/* Category Tabs */}
              <div className="flex flex-wrap gap-2">
                {categories.map(category => {
                  const Icon = category.icon;
                  return (
                    <button
                      key={category.id}
                      onClick={() => setSelectedCategory(category.id)}
                      className={`flex items-center gap-2 px-4 py-2 rounded-lg border transition-all ${
                        selectedCategory === category.id
                          ? 'bg-purple-500/20 border-purple-500 text-purple-300'
                          : 'bg-[#0a0a1a] border-gray-800 text-gray-400 hover:border-gray-700'
                      }`}
                    >
                      <Icon className="w-4 h-4" />
                      <span className="text-sm font-medium">{category.name}</span>
                      <span className="text-xs opacity-60">
                        ({category.id === 'all'
                          ? allIntegrations.length
                          : allIntegrations.filter(i => i.category === category.id).length})
                      </span>
                    </button>
                  );
                })}
              </div>

              {/* View Toggle */}
              <div className="flex items-center gap-2 bg-[#0a0a1a] rounded-lg p-1 border border-gray-800">
                <button
                  onClick={() => setViewMode('grid')}
                  className={`p-2 rounded-md transition-colors ${
                    viewMode === 'grid' ? 'bg-purple-500/20 text-purple-300' : 'text-gray-400 hover:text-white'
                  }`}
                >
                  <Grid3x3 className="w-4 h-4" />
                </button>
                <button
                  onClick={() => setViewMode('list')}
                  className={`p-2 rounded-md transition-colors ${
                    viewMode === 'list' ? 'bg-purple-500/20 text-purple-300' : 'text-gray-400 hover:text-white'
                  }`}
                >
                  <List className="w-4 h-4" />
                </button>
              </div>
            </div>
          </div>
        </section>

        {/* Integrations Grid/List */}
        <section className="py-16">
          <div className="container mx-auto px-6">
            {filteredIntegrations.length > 0 ? (
              <div className={
                viewMode === 'grid'
                  ? 'grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6'
                  : 'space-y-4 max-w-4xl mx-auto'
              }>
                {filteredIntegrations.map(integration => (
                  <div
                    key={integration.id}
                    className={`
                      bg-[#0a0a1a] border border-gray-800 rounded-xl p-6
                      hover:border-purple-500/50 transition-all duration-300
                      hover:shadow-lg hover:shadow-purple-500/10
                      ${viewMode === 'list' ? 'flex items-center justify-between' : ''}
                    `}
                  >
                    <div className={viewMode === 'list' ? 'flex items-center gap-6 flex-1' : ''}>
                      {/* Logo Placeholder */}
                      <div className={`
                        bg-gradient-to-br from-purple-500/20 to-pink-500/20
                        rounded-lg flex items-center justify-center
                        ${viewMode === 'grid' ? 'w-16 h-16 mb-4' : 'w-12 h-12'}
                      `}>
                        <Building2 className="w-6 h-6 text-purple-400" />
                      </div>

                      <div className={viewMode === 'list' ? 'flex-1' : ''}>
                        {/* Header with name and status */}
                        <div className="flex items-center justify-between mb-2">
                          <h3 className="text-lg font-semibold text-white">{integration.name}</h3>
                          {integration.popular && (
                            <span className="text-xs px-2 py-1 bg-purple-500/20 text-purple-300 rounded-full">
                              Popular
                            </span>
                          )}
                        </div>

                        {/* Category badge */}
                        <div className="mb-3">
                          <span className="text-xs px-2 py-1 bg-gray-800 text-gray-400 rounded-md">
                            {categories.find(c => c.id === integration.category)?.name}
                          </span>
                        </div>

                        {/* Description */}
                        <p className="text-sm text-gray-400 mb-4 line-clamp-2">
                          {integration.description}
                        </p>
                      </div>
                    </div>

                    {/* Action buttons */}
                    <div className={`flex ${viewMode === 'grid' ? 'gap-2' : 'items-center gap-3'}`}>
                      {integration.status === 'available' ? (
                        <button className="flex-1 px-4 py-2 bg-purple-500/20 text-purple-300 rounded-lg
                                         hover:bg-purple-500/30 transition-colors text-sm font-medium
                                         flex items-center justify-center gap-2">
                          Connect
                          <ChevronRight className="w-4 h-4" />
                        </button>
                      ) : integration.status === 'beta' ? (
                        <button className="flex-1 px-4 py-2 bg-yellow-500/20 text-yellow-300 rounded-lg
                                         hover:bg-yellow-500/30 transition-colors text-sm font-medium
                                         flex items-center justify-center gap-2">
                          Join Beta
                          <ExternalLink className="w-4 h-4" />
                        </button>
                      ) : (
                        <button className="flex-1 px-4 py-2 bg-gray-800 text-gray-500 rounded-lg
                                         cursor-not-allowed text-sm font-medium" disabled>
                          Coming Soon
                        </button>
                      )}

                      {viewMode === 'grid' && (
                        <button className="p-2 bg-gray-800 text-gray-400 rounded-lg hover:bg-gray-700
                                         hover:text-white transition-colors">
                          <ExternalLink className="w-4 h-4" />
                        </button>
                      )}
                    </div>
                  </div>
                ))}
              </div>
            ) : (
              <div className="text-center py-16">
                <div className="w-20 h-20 bg-gray-800 rounded-full flex items-center justify-center mx-auto mb-4">
                  <Search className="w-8 h-8 text-gray-600" />
                </div>
                <h3 className="text-xl font-semibold text-white mb-2">No integrations found</h3>
                <p className="text-gray-400">Try adjusting your search or filters</p>
              </div>
            )}
          </div>
        </section>

        {/* API & Webhooks Section */}
        <section className="py-20 bg-gradient-to-b from-transparent via-purple-900/10 to-transparent">
          <div className="container mx-auto px-6">
            <div className="max-w-4xl mx-auto">
              <div className="bg-[#0a0a1a] border border-gray-800 rounded-2xl p-8 md:p-12">
                <div className="grid md:grid-cols-2 gap-8 items-center">
                  <div>
                    <div className="inline-flex items-center gap-2 bg-purple-500/10 px-3 py-1 rounded-full mb-4 border border-purple-500/20">
                      <Code className="w-4 h-4 text-purple-400" />
                      <span className="text-xs text-purple-300">For Developers</span>
                    </div>

                    <h2 className="text-3xl font-bold text-white mb-4">
                      Build Your Own Integration
                    </h2>

                    <p className="text-gray-400 mb-6">
                      Access our comprehensive API and webhook system to create custom integrations
                      tailored to your specific workflow needs.
                    </p>

                    <ul className="space-y-3 mb-8">
                      <li className="flex items-start gap-3">
                        <div className="w-5 h-5 rounded-full bg-purple-500/20 flex items-center justify-center mt-0.5">
                          <div className="w-2 h-2 rounded-full bg-purple-400" />
                        </div>
                        <span className="text-gray-300">RESTful API with comprehensive documentation</span>
                      </li>
                      <li className="flex items-start gap-3">
                        <div className="w-5 h-5 rounded-full bg-purple-500/20 flex items-center justify-center mt-0.5">
                          <div className="w-2 h-2 rounded-full bg-purple-400" />
                        </div>
                        <span className="text-gray-300">Real-time webhooks for instant updates</span>
                      </li>
                      <li className="flex items-start gap-3">
                        <div className="w-5 h-5 rounded-full bg-purple-500/20 flex items-center justify-center mt-0.5">
                          <div className="w-2 h-2 rounded-full bg-purple-400" />
                        </div>
                        <span className="text-gray-300">SDKs for popular programming languages</span>
                      </li>
                    </ul>

                    <div className="flex gap-4">
                      <button className="px-6 py-3 bg-purple-600 text-white rounded-lg hover:bg-purple-700
                                       transition-colors font-medium flex items-center gap-2">
                        View API Docs
                        <ArrowRight className="w-4 h-4" />
                      </button>
                      <button className="px-6 py-3 bg-gray-800 text-white rounded-lg hover:bg-gray-700
                                       transition-colors font-medium">
                        Get API Key
                      </button>
                    </div>
                  </div>

                  <div className="hidden md:block">
                    <div className="bg-gradient-to-br from-purple-500/10 to-pink-500/10 rounded-xl p-8 border border-purple-500/20">
                      <pre className="text-sm text-gray-300 font-mono">
{`// Example API Integration
const response = await fetch(
  'https://api.yourdomain.com/v1/meetings',
  {
    headers: {
      'Authorization': 'Bearer YOUR_API_KEY',
      'Content-Type': 'application/json'
    },
    body: JSON.stringify({
      meetingId: '123456',
      action: 'transcribe'
    })
  }
);

const data = await response.json();
console.log(data.transcript);`}
                      </pre>
                    </div>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </section>

        {/* Request Integration CTA */}
        <section className="py-20">
          <div className="container mx-auto px-6">
            <div className="max-w-2xl mx-auto text-center">
              <div className="bg-gradient-to-br from-purple-900/20 to-pink-900/20 rounded-2xl p-8 md:p-12 border border-purple-500/20">
                <Plus className="w-12 h-12 text-purple-400 mx-auto mb-6" />

                <h2 className="text-3xl font-bold text-white mb-4">
                  Don't See Your Tool?
                </h2>

                <p className="text-gray-300 mb-8">
                  We're constantly adding new integrations based on user feedback.
                  Let us know which tools you'd like to see integrated next.
                </p>

                <form className="space-y-4" onSubmit={(e) => e.preventDefault()}>
                  <input
                    type="text"
                    placeholder="Tool or platform name"
                    className="w-full px-4 py-3 bg-[#0a0a1a] border border-gray-800 rounded-lg
                             text-white placeholder-gray-500 focus:outline-none focus:border-purple-500"
                  />

                  <textarea
                    placeholder="How would you use this integration? (optional)"
                    rows={3}
                    className="w-full px-4 py-3 bg-[#0a0a1a] border border-gray-800 rounded-lg
                             text-white placeholder-gray-500 focus:outline-none focus:border-purple-500
                             resize-none"
                  />

                  <button
                    type="submit"
                    className="w-full px-6 py-3 bg-purple-600 text-white rounded-lg hover:bg-purple-700
                             transition-colors font-medium flex items-center justify-center gap-2"
                  >
                    Request Integration
                    <ArrowRight className="w-4 h-4" />
                  </button>
                </form>

                <p className="text-sm text-gray-500 mt-4">
                  We review all requests and prioritize based on demand
                </p>
              </div>
            </div>
          </div>
        </section>

        {/* Stats Section */}
        <section className="py-16 border-t border-gray-800">
          <div className="container mx-auto px-6">
            <div className="grid grid-cols-2 md:grid-cols-4 gap-8">
              <div className="text-center">
                <div className="text-3xl font-bold text-white mb-2">40+</div>
                <div className="text-sm text-gray-400">Active Integrations</div>
              </div>
              <div className="text-center">
                <div className="text-3xl font-bold text-white mb-2">5M+</div>
                <div className="text-sm text-gray-400">API Calls Daily</div>
              </div>
              <div className="text-center">
                <div className="text-3xl font-bold text-white mb-2">99.9%</div>
                <div className="text-sm text-gray-400">Uptime SLA</div>
              </div>
              <div className="text-center">
                <div className="text-3xl font-bold text-white mb-2">24/7</div>
                <div className="text-sm text-gray-400">Developer Support</div>
              </div>
            </div>
          </div>
        </section>
      </main>

      <Footer />
    </div>
  );
}