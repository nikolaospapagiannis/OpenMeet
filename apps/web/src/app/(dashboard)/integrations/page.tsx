'use client';

export const dynamic = 'force-dynamic';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import {
  ArrowLeft,
  Calendar,
  Video,
  MessageSquare,
  Database,
  AlertCircle,
  ExternalLink,
  HardDrive,
  ListTodo,
} from 'lucide-react';

import { Button } from '@/components/ui/button';
import { CardGlass } from '@/components/ui/card-glass';
import { useAuth } from '@/contexts/AuthContext';
import { IntegrationCard } from '@/components/integrations/IntegrationCard';
import { useIntegrations } from '@/hooks/useIntegrations';

interface IntegrationTemplate {
  id: string;
  type: string;
  name: string;
  description: string;
  category: 'video' | 'calendar' | 'crm' | 'communication' | 'storage' | 'productivity';
  icon: any;
  features: string[];
  setupTime: string;
}

// Available integrations catalog
const integrationTemplates: IntegrationTemplate[] = [
  {
    id: 'zoom',
    type: 'zoom',
    name: 'Zoom',
    description: 'Automatically record and transcribe Zoom meetings',
    category: 'video',
    icon: Video,
    features: ['Auto-join meetings', 'Real-time transcription', 'Cloud recording', 'Speaker identification'],
    setupTime: '2 minutes',
  },
  {
    id: 'teams',
    type: 'teams',
    name: 'Microsoft Teams',
    description: 'Integrate with Microsoft Teams for seamless meeting capture',
    category: 'video',
    icon: Video,
    features: ['Bot integration', 'Channel notifications', 'File sync', 'Calendar sync'],
    setupTime: '5 minutes',
  },
  {
    id: 'meet',
    type: 'meet',
    name: 'Google Meet',
    description: 'Record and analyze Google Meet conversations',
    category: 'video',
    icon: Video,
    features: ['Chrome extension', 'Drive integration', 'Auto-transcription', 'Calendar sync'],
    setupTime: '3 minutes',
  },
  {
    id: 'google-calendar',
    type: 'meet',
    name: 'Google Calendar',
    description: 'Sync your calendar for automatic meeting detection',
    category: 'calendar',
    icon: Calendar,
    features: ['Auto-detection', 'Meeting reminders', 'Attendee sync', 'Recurring events'],
    setupTime: '1 minute',
  },
  {
    id: 'outlook',
    type: 'teams',
    name: 'Outlook Calendar',
    description: 'Connect your Outlook calendar for meeting scheduling',
    category: 'calendar',
    icon: Calendar,
    features: ['Exchange sync', 'Meeting rooms', 'Attendee availability', 'Event updates'],
    setupTime: '2 minutes',
  },
  {
    id: 'salesforce',
    type: 'salesforce',
    name: 'Salesforce',
    description: 'Sync meeting insights with your CRM',
    category: 'crm',
    icon: Database,
    features: ['Contact sync', 'Deal tracking', 'Activity logging', 'Custom fields'],
    setupTime: '10 minutes',
  },
  {
    id: 'hubspot',
    type: 'hubspot',
    name: 'HubSpot',
    description: 'Automatically log meetings and insights in HubSpot',
    category: 'crm',
    icon: Database,
    features: ['Contact enrichment', 'Deal association', 'Timeline events', 'Custom properties'],
    setupTime: '5 minutes',
  },
  {
    id: 'slack',
    type: 'slack',
    name: 'Slack',
    description: 'Share meeting summaries and action items in Slack',
    category: 'communication',
    icon: MessageSquare,
    features: ['Channel notifications', 'DM summaries', 'Bot commands', 'Thread replies'],
    setupTime: '2 minutes',
  },
  {
    id: 'google-drive',
    type: 'meet',
    name: 'Google Drive',
    description: 'Store meeting recordings and transcripts in Drive',
    category: 'storage',
    icon: HardDrive,
    features: ['Auto-upload recordings', 'Transcript storage', 'Folder organization', 'Sharing controls'],
    setupTime: '2 minutes',
  },
  {
    id: 'notion',
    type: 'notion',
    name: 'Notion',
    description: 'Export meeting notes and action items to Notion',
    category: 'productivity',
    icon: ListTodo,
    features: ['Page creation', 'Database sync', 'Template support', 'Rich formatting'],
    setupTime: '3 minutes',
  },
];

export default function IntegrationsPage() {
  const router = useRouter();
  const { user: _user } = useAuth();
  const { integrations, loading, error } = useIntegrations();
  const [filter, setFilter] = useState<string>('all');

  // Calculate stats
  const connectedCount = integrations.length;
  const lastSyncTime = integrations.reduce((latest, int) => {
    if (!int.lastSyncAt) return latest;
    const syncTime = new Date(int.lastSyncAt).getTime();
    return syncTime > latest ? syncTime : latest;
  }, 0);

  const categories = [
    { id: 'all', name: 'All Integrations', count: integrationTemplates.length },
    { id: 'video', name: 'Video Conferencing', count: integrationTemplates.filter(i => i.category === 'video').length },
    { id: 'calendar', name: 'Calendar', count: integrationTemplates.filter(i => i.category === 'calendar').length },
    { id: 'crm', name: 'CRM', count: integrationTemplates.filter(i => i.category === 'crm').length },
    { id: 'communication', name: 'Communication', count: integrationTemplates.filter(i => i.category === 'communication').length },
    { id: 'storage', name: 'Storage', count: integrationTemplates.filter(i => i.category === 'storage').length },
    { id: 'productivity', name: 'Productivity', count: integrationTemplates.filter(i => i.category === 'productivity').length },
  ];

  const filteredIntegrations = filter === 'all'
    ? integrationTemplates
    : integrationTemplates.filter(i => i.category === filter);

  // Map connected integrations to templates
  const getConnectedIntegration = (type: string) => {
    return integrations.find(int => int.type === type && int.isActive);
  };

  const formatLastSync = () => {
    if (lastSyncTime === 0) return 'Never';
    const now = Date.now();
    const diffMs = now - lastSyncTime;
    const diffMins = Math.floor(diffMs / 60000);
    if (diffMins < 1) return 'Just now';
    if (diffMins < 60) return `${diffMins}m ago`;
    const diffHours = Math.floor(diffMins / 60);
    if (diffHours < 24) return `${diffHours}h ago`;
    return `${Math.floor(diffHours / 24)}d ago`;
  };

  return (
    <div className="min-h-screen bg-[#0a0a1a]">
      {/* Header */}
      <header className="bg-slate-900/40 backdrop-blur-sm border-b border-[#1e293b] relative z-10">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex justify-between items-center h-16">
            <div className="flex items-center space-x-4">
              <button
                onClick={() => router.push('/dashboard')}
                className="text-slate-400 hover:text-white flex items-center transition-colors"
              >
                <ArrowLeft className="h-4 w-4 mr-1" />
                Back to Dashboard
              </button>
              <h1 className="text-xl font-semibold text-white">Integrations</h1>
            </div>
            <div className="flex items-center space-x-4">
              <span className="text-sm text-slate-400">
                {connectedCount} of {integrationTemplates.length} connected
              </span>
            </div>
          </div>
        </div>
      </header>

      <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        {/* Stats */}
        <div className="grid grid-cols-1 md:grid-cols-4 gap-6 mb-8">
          <CardGlass padding="none">
            <div className="p-6">
              <p className="text-sm font-medium text-slate-400 mb-2">Connected</p>
              <div className="text-2xl font-bold text-white">{connectedCount}</div>
              <p className="text-xs text-slate-500 mt-1">Active integrations</p>
            </div>
          </CardGlass>

          <CardGlass padding="none">
            <div className="p-6">
              <p className="text-sm font-medium text-slate-400 mb-2">Last Sync</p>
              <div className="text-2xl font-bold text-white">{formatLastSync()}</div>
              <p className={`text-xs mt-1 ${connectedCount > 0 ? 'text-green-400' : 'text-slate-500'}`}>
                {connectedCount > 0 ? 'All systems operational' : 'No integrations'}
              </p>
            </div>
          </CardGlass>

          <CardGlass padding="none">
            <div className="p-6">
              <p className="text-sm font-medium text-slate-400 mb-2">Available</p>
              <div className="text-2xl font-bold text-white">{integrationTemplates.length}</div>
              <p className="text-xs text-slate-500 mt-1">Integration options</p>
            </div>
          </CardGlass>

          <CardGlass padding="none">
            <div className="p-6">
              <p className="text-sm font-medium text-slate-400 mb-2">Categories</p>
              <div className="text-2xl font-bold text-white">{categories.length - 1}</div>
              <p className="text-xs text-slate-500 mt-1">Integration types</p>
            </div>
          </CardGlass>
        </div>

        {/* Category Filter */}
        <div className="mb-6">
          <div className="flex space-x-2 overflow-x-auto pb-2">
            {categories.map(category => (
              <button
                key={category.id}
                onClick={() => setFilter(category.id)}
                className={`px-4 py-2 rounded-lg text-sm font-medium whitespace-nowrap transition-all duration-200 border ${
                  filter === category.id
                    ? 'bg-purple-600 text-white border-purple-500'
                    : 'bg-slate-900/50 text-slate-300 border-white/10 hover:bg-slate-800/50 hover:border-white/20'
                }`}
              >
                {category.name} ({category.count})
              </button>
            ))}
          </div>
        </div>

        {/* Loading State */}
        {loading && (
          <div className="text-center py-12">
            <p className="text-slate-400">Loading integrations...</p>
          </div>
        )}

        {/* Error State */}
        {error && (
          <CardGlass className="border-red-500/20 mb-6">
            <div className="p-6">
              <div className="flex items-center text-red-400 mb-2">
                <AlertCircle className="h-5 w-5 mr-2" />
                <h3 className="font-semibold">Error Loading Integrations</h3>
              </div>
              <p className="text-sm text-slate-300">{error}</p>
            </div>
          </CardGlass>
        )}

        {/* Integrations Grid */}
        {!loading && (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {filteredIntegrations.map((template) => (
              <IntegrationCard
                key={template.id}
                id={template.id}
                type={template.type}
                name={template.name}
                description={template.description}
                category={template.category}
                icon={template.icon}
                features={template.features}
                setupTime={template.setupTime}
                connectedIntegration={getConnectedIntegration(template.type)}
              />
            ))}
          </div>
        )}

        {/* Help Section */}
        <CardGlass className="mt-8 bg-gradient-to-r from-purple-900/30 to-blue-900/30 border-purple-500/30">
          <div className="p-6">
            <h3 className="flex items-center text-white font-semibold mb-2">
              <AlertCircle className="h-5 w-5 mr-2 text-purple-400" />
              Need Help?
            </h3>
            <p className="text-sm text-[var(--ff-text-secondary)] mb-4">
              Having trouble connecting an integration? Check out our documentation or contact support.
            </p>
            <div className="flex space-x-4">
              <Button
                variant="outline"
                size="sm"
                className="border-purple-500/30 text-purple-300 hover:bg-purple-500/20 hover:border-purple-500/50 hover:text-purple-200"
              >
                <ExternalLink className="h-4 w-4 mr-2" />
                View Documentation
              </Button>
              <Button
                variant="outline"
                size="sm"
                className="border-purple-500/30 text-purple-300 hover:bg-purple-500/20 hover:border-purple-500/50 hover:text-purple-200"
              >
                Contact Support
              </Button>
            </div>
          </div>
        </CardGlass>
      </main>
    </div>
  );
}
