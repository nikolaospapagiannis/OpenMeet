'use client';

import { useState } from 'react';
import { Sparkles, Zap, Plus, Settings, BarChart3, Wand2, Store, Layers } from 'lucide-react';
import { CardGlass, CardGlassContent, CardGlassDescription, CardGlassHeader, CardGlassTitle } from '@/components/ui/card-glass';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Badge } from '@/components/ui/badge';

// Import AI Apps components
import AppMarketplace, { type AIApp } from '@/components/ai-apps/AppMarketplace';
import CustomAppBuilder, { type CustomApp } from '@/components/ai-apps/CustomAppBuilder';
import AppConfiguration, { type AppConfig } from '@/components/ai-apps/AppConfiguration';
import AppUsageStats from '@/components/ai-apps/AppUsageStats';
import AppOutputPreview from '@/components/ai-apps/AppOutputPreview';
import { useAIApps } from '@/hooks/useAIApps';

export default function AIAppsPage() {
  const [activeTab, setActiveTab] = useState('marketplace');
  const [selectedApp, setSelectedApp] = useState<AIApp | null>(null);
  const [showConfiguration, setShowConfiguration] = useState(false);
  const [showStats, setShowStats] = useState(false);
  const [showOutput, setShowOutput] = useState(false);

  const {
    installedApps,
    enabledApps,
    isLoading,
    error,
    installApp,
    uninstallApp,
    updateAppConfig,
    createCustomApp,
    executeApp,
    testApp,
    getAppUsageStats
  } = useAIApps();

  const handleInstallApp = async (app: AIApp) => {
    const success = await installApp(app);
    if (success) {
      // Show success notification
      console.log(`Successfully installed ${app.name}`);
    }
  };

  const handleConfigureApp = (app: AIApp) => {
    setSelectedApp(app);
    setShowConfiguration(true);
    setActiveTab('configure');
  };

  const handleSaveConfig = async (config: AppConfig) => {
    if (selectedApp) {
      const success = await updateAppConfig(selectedApp.id, config);
      if (success) {
        console.log('Configuration saved successfully');
        setShowConfiguration(false);
      }
    }
  };

  const handleDeleteApp = async () => {
    if (selectedApp) {
      const success = await uninstallApp(selectedApp.id);
      if (success) {
        setSelectedApp(null);
        setShowConfiguration(false);
        setActiveTab('marketplace');
      }
    }
  };

  const handleSaveCustomApp = async (app: CustomApp) => {
    const success = await createCustomApp(app);
    if (success) {
      console.log('Custom app created successfully');
      setActiveTab('installed');
    }
  };

  const handleTestCustomApp = async (app: CustomApp) => {
    const result = await testApp(app as any, 'Test input data...');
    if (result.success) {
      console.log('Test successful:', result.output);
    } else {
      console.error('Test failed:', result.error);
    }
  };

  const handleViewStats = (app: AIApp) => {
    setSelectedApp(app);
    setShowStats(true);
    setActiveTab('stats');
  };

  const handleViewOutput = (app: AIApp) => {
    setSelectedApp(app);
    setShowOutput(true);
    setActiveTab('output');
  };

  const installedAppIds = installedApps.map(app => app.id);

  return (
    <div className="min-h-screen bg-[#0a0a1a] p-6">
      {/* Header */}
      <div className="mb-6">
        <div className="flex items-center justify-between">
          <div>
            <div className="flex items-center gap-2 mb-2">
              <Sparkles className="h-6 w-6 text-purple-400" />
              <h1 className="text-2xl font-bold text-white">AI Apps Platform</h1>
            </div>
            <p className="text-slate-400">
              Discover, build, and manage AI-powered apps to enhance your meetings
            </p>
          </div>
          <div className="flex items-center gap-3">
            <Badge variant="outline" className="border-purple-500/30 text-purple-400">
              {enabledApps.length} Active Apps
            </Badge>
            <Badge variant="outline" className="border-green-500/30 text-green-400">
              {installedApps.length} Installed
            </Badge>
          </div>
        </div>
      </div>

      {/* Featured Banner */}
      <CardGlass className="mb-6 bg-gradient-to-r from-purple-600/80 to-blue-600/80 border-purple-500/30">
        <div className="p-8">
          <div className="flex items-center justify-between">
            <div>
              <div className="flex items-center gap-2 mb-2">
                <Zap className="h-6 w-6 text-white" />
                <h2 className="text-xl font-bold text-white">Unlock AI Superpowers</h2>
              </div>
              <p className="text-purple-100 mb-4">
                Build custom AI apps or choose from our marketplace of pre-built solutions
              </p>
              <div className="flex gap-3">
                <Button
                  className="bg-white text-purple-600 hover:bg-purple-50"
                  onClick={() => setActiveTab('builder')}
                >
                  <Plus className="h-4 w-4 mr-2" />
                  Build Custom App
                </Button>
                <Button
                  variant="outline"
                  className="border-white/30 text-white hover:bg-white/10"
                  onClick={() => setActiveTab('marketplace')}
                >
                  <Store className="h-4 w-4 mr-2" />
                  Browse Marketplace
                </Button>
              </div>
            </div>
            <div className="text-6xl opacity-20">
              <Sparkles className="h-24 w-24 text-white" />
            </div>
          </div>
        </div>
      </CardGlass>

      {/* Main Content Tabs */}
      <Tabs value={activeTab} onValueChange={setActiveTab} className="space-y-6">
        <TabsList className="bg-slate-900/50 border border-white/10">
          <TabsTrigger value="marketplace">
            <Store className="h-4 w-4 mr-2" />
            Marketplace
          </TabsTrigger>
          <TabsTrigger value="installed">
            <Layers className="h-4 w-4 mr-2" />
            Installed Apps
          </TabsTrigger>
          <TabsTrigger value="builder">
            <Wand2 className="h-4 w-4 mr-2" />
            App Builder
          </TabsTrigger>
          {showConfiguration && (
            <TabsTrigger value="configure">
              <Settings className="h-4 w-4 mr-2" />
              Configure
            </TabsTrigger>
          )}
          {showStats && (
            <TabsTrigger value="stats">
              <BarChart3 className="h-4 w-4 mr-2" />
              Stats
            </TabsTrigger>
          )}
          {showOutput && (
            <TabsTrigger value="output">
              <Sparkles className="h-4 w-4 mr-2" />
              Output
            </TabsTrigger>
          )}
        </TabsList>

        {/* Marketplace Tab */}
        <TabsContent value="marketplace">
          <AppMarketplace
            onInstallApp={handleInstallApp}
            onConfigureApp={handleConfigureApp}
            installedApps={installedAppIds}
          />
        </TabsContent>

        {/* Installed Apps Tab */}
        <TabsContent value="installed">
          <div className="space-y-6">
            <div className="flex items-center justify-between">
              <div>
                <h2 className="text-xl font-bold text-white">Installed Apps</h2>
                <p className="text-sm text-slate-400">Manage your installed AI apps and their configurations</p>
              </div>
              <Button
                onClick={() => setActiveTab('marketplace')}
                className="bg-purple-600 hover:bg-purple-700 text-white"
              >
                <Plus className="h-4 w-4 mr-2" />
                Add More Apps
              </Button>
            </div>

            {installedApps.length === 0 ? (
              <CardGlass className="text-center py-12">
                <CardGlassContent>
                  <Store className="h-12 w-12 text-slate-500 mx-auto mb-4" />
                  <h3 className="text-lg font-semibold text-white mb-2">No Apps Installed</h3>
                  <p className="text-slate-400 mb-6">
                    Browse the marketplace to discover and install AI-powered apps
                  </p>
                  <Button
                    onClick={() => setActiveTab('marketplace')}
                    className="bg-purple-600 hover:bg-purple-700 text-white"
                  >
                    Browse Marketplace
                  </Button>
                </CardGlassContent>
              </CardGlass>
            ) : (
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                {installedApps.map((app) => {
                  const Icon = Store; // Default icon
                  return (
                    <CardGlass key={app.id} hover padding="none">
                      <CardGlassHeader className="p-6 pb-4">
                        <div className="flex items-start justify-between mb-3">
                          <div className="w-12 h-12 bg-purple-500/20 border border-purple-500/30 rounded-xl flex items-center justify-center">
                            <Icon className="h-6 w-6 text-purple-400" />
                          </div>
                          <Badge
                            variant="outline"
                            className={app.config.enabled ? 'border-green-500/30 text-green-400' : 'border-red-500/30 text-red-400'}
                          >
                            {app.config.enabled ? 'Enabled' : 'Disabled'}
                          </Badge>
                        </div>
                        <CardGlassTitle className="text-lg text-white">{app.name}</CardGlassTitle>
                        <CardGlassDescription className="text-slate-400">{app.description}</CardGlassDescription>
                        <div className="flex items-center gap-3 mt-3 text-xs text-slate-500">
                          <span>{app.usageCount} runs</span>
                          <span>Last used: {app.lastUsed ? new Date(app.lastUsed).toLocaleDateString() : 'Never'}</span>
                        </div>
                      </CardGlassHeader>
                      <CardGlassContent className="p-6 pt-0">
                        <div className="flex gap-2">
                          <Button
                            variant="outline"
                            size="sm"
                            onClick={() => handleConfigureApp(app)}
                            className="flex-1 border-white/10 text-slate-300"
                          >
                            <Settings className="h-4 w-4 mr-2" />
                            Configure
                          </Button>
                          <Button
                            variant="outline"
                            size="sm"
                            onClick={() => handleViewStats(app)}
                            className="flex-1 border-white/10 text-slate-300"
                          >
                            <BarChart3 className="h-4 w-4 mr-2" />
                            Stats
                          </Button>
                        </div>
                      </CardGlassContent>
                    </CardGlass>
                  );
                })}
              </div>
            )}
          </div>
        </TabsContent>

        {/* App Builder Tab */}
        <TabsContent value="builder">
          <CustomAppBuilder
            onSaveApp={handleSaveCustomApp}
            onTestApp={handleTestCustomApp}
          />
        </TabsContent>

        {/* Configuration Tab */}
        {showConfiguration && selectedApp && (
          <TabsContent value="configure">
            <AppConfiguration
              app={selectedApp}
              onSave={handleSaveConfig}
              onDelete={handleDeleteApp}
            />
          </TabsContent>
        )}

        {/* Stats Tab */}
        {showStats && selectedApp && (
          <TabsContent value="stats">
            <AppUsageStats app={selectedApp} />
          </TabsContent>
        )}

        {/* Output Tab */}
        {showOutput && selectedApp && (
          <TabsContent value="output">
            <AppOutputPreview
              app={selectedApp}
              format="markdown"
              timestamp="2 hours ago"
              meetingTitle="Product Strategy Discussion"
            />
          </TabsContent>
        )}
      </Tabs>
    </div>
  );
}