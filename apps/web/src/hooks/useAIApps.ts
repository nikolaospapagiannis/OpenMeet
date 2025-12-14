'use client';

import { useState, useEffect, useCallback, useMemo } from 'react';
import type { AIApp } from '@/components/ai-apps/AppMarketplace';
import type { CustomApp } from '@/components/ai-apps/CustomAppBuilder';
import type { AppConfig } from '@/components/ai-apps/AppConfiguration';

export interface InstalledApp extends AIApp {
  config: AppConfig;
  installedAt: string;
  lastUsed?: string;
  usageCount: number;
}

export interface AppExecution {
  id: string;
  appId: string;
  meetingId: string;
  status: 'pending' | 'running' | 'completed' | 'failed';
  startTime: string;
  endTime?: string;
  output?: string;
  error?: string;
}

export interface AIAppsState {
  installedApps: InstalledApp[];
  customApps: CustomApp[];
  executions: AppExecution[];
  isLoading: boolean;
  error: string | null;
}

export function useAIApps() {
  const [state, setState] = useState<AIAppsState>({
    installedApps: [],
    customApps: [],
    executions: [],
    isLoading: false,
    error: null
  });

  // Load installed apps
  useEffect(() => {
    loadInstalledApps();
  }, []);

  const loadInstalledApps = async () => {
    setState(prev => ({ ...prev, isLoading: true, error: null }));
    try {
      // Simulate API call - in production, fetch from backend
      const mockInstalledApps: InstalledApp[] = [
        {
          id: 'calendar-scheduler',
          name: 'Calendar Scheduler',
          description: 'Smart scheduling assistant for your meetings',
          icon: 'Calendar',
          color: 'green',
          category: 'Productivity',
          tags: ['scheduling', 'calendar', 'availability'],
          rating: 4.9,
          downloads: 15300,
          installed: true,
          enabled: true,
          author: 'OpenMeet',
          version: '2.5.0',
          updatedAt: '2024-01-18',
          config: {
            enabled: true,
            triggers: {
              automatic: true,
              manual: false,
              scheduled: false,
            },
            meetingTypes: {
              all: true,
              specific: []
            },
            notifications: {
              enabled: true,
              email: false,
              inApp: true,
              slack: false
            },
            output: {
              format: 'markdown',
              destination: 'notes',
              autoSave: true,
              includeInTranscript: false
            },
            advanced: {
              priority: 5,
              timeout: 30,
              retryAttempts: 3,
              maxTokens: 2000,
              temperature: 0.7
            },
            customization: {
              variableMapping: {}
            },
            permissions: ['read_transcript', 'write_notes'],
            integrations: {
              calendar: true,
              email: false,
              slack: false,
              teams: false,
              crm: false
            }
          },
          installedAt: '2024-01-10',
          lastUsed: '2024-01-25',
          usageCount: 127
        },
        {
          id: 'smart-search',
          name: 'Smart Search',
          description: 'AI-powered search across all your transcripts',
          icon: 'Search',
          color: 'cyan',
          category: 'Productivity',
          tags: ['search', 'query', 'find', 'discover'],
          rating: 4.8,
          downloads: 11200,
          installed: true,
          enabled: false,
          author: 'OpenMeet',
          version: '2.8.0',
          updatedAt: '2024-01-21',
          config: {
            enabled: false,
            triggers: {
              automatic: false,
              manual: true,
              scheduled: false,
            },
            meetingTypes: {
              all: true,
              specific: []
            },
            notifications: {
              enabled: false,
              email: false,
              inApp: false,
              slack: false
            },
            output: {
              format: 'json',
              destination: 'notes',
              autoSave: false,
              includeInTranscript: false
            },
            advanced: {
              priority: 3,
              timeout: 20,
              retryAttempts: 2,
              maxTokens: 1500,
              temperature: 0.5
            },
            customization: {
              variableMapping: {}
            },
            permissions: ['read_transcript'],
            integrations: {
              calendar: false,
              email: false,
              slack: false,
              teams: false,
              crm: false
            }
          },
          installedAt: '2024-01-15',
          usageCount: 45
        }
      ];

      setState(prev => ({
        ...prev,
        installedApps: mockInstalledApps,
        isLoading: false
      }));
    } catch (error) {
      setState(prev => ({
        ...prev,
        error: 'Failed to load installed apps',
        isLoading: false
      }));
    }
  };

  const installApp = useCallback(async (app: AIApp): Promise<boolean> => {
    setState(prev => ({ ...prev, isLoading: true, error: null }));
    try {
      // Simulate API call
      await new Promise(resolve => setTimeout(resolve, 1000));

      const newInstalledApp: InstalledApp = {
        ...app,
        config: {
          enabled: true,
          triggers: {
            automatic: true,
            manual: false,
            scheduled: false,
          },
          meetingTypes: {
            all: true,
            specific: []
          },
          notifications: {
            enabled: true,
            email: false,
            inApp: true,
            slack: false
          },
          output: {
            format: 'markdown',
            destination: 'notes',
            autoSave: true,
            includeInTranscript: false
          },
          advanced: {
            priority: 5,
            timeout: 30,
            retryAttempts: 3,
            maxTokens: 2000,
            temperature: 0.7
          },
          customization: {
            variableMapping: {}
          },
          permissions: ['read_transcript', 'write_notes'],
          integrations: {
            calendar: false,
            email: false,
            slack: false,
            teams: false,
            crm: false
          }
        },
        installedAt: new Date().toISOString(),
        usageCount: 0
      };

      setState(prev => ({
        ...prev,
        installedApps: [...prev.installedApps, newInstalledApp],
        isLoading: false
      }));

      return true;
    } catch (error) {
      setState(prev => ({
        ...prev,
        error: 'Failed to install app',
        isLoading: false
      }));
      return false;
    }
  }, []);

  const uninstallApp = useCallback(async (appId: string): Promise<boolean> => {
    setState(prev => ({ ...prev, isLoading: true, error: null }));
    try {
      // Simulate API call
      await new Promise(resolve => setTimeout(resolve, 500));

      setState(prev => ({
        ...prev,
        installedApps: prev.installedApps.filter(app => app.id !== appId),
        isLoading: false
      }));

      return true;
    } catch (error) {
      setState(prev => ({
        ...prev,
        error: 'Failed to uninstall app',
        isLoading: false
      }));
      return false;
    }
  }, []);

  const updateAppConfig = useCallback(async (appId: string, config: AppConfig): Promise<boolean> => {
    setState(prev => ({ ...prev, isLoading: true, error: null }));
    try {
      // Simulate API call
      await new Promise(resolve => setTimeout(resolve, 500));

      setState(prev => ({
        ...prev,
        installedApps: prev.installedApps.map(app =>
          app.id === appId ? { ...app, config } : app
        ),
        isLoading: false
      }));

      return true;
    } catch (error) {
      setState(prev => ({
        ...prev,
        error: 'Failed to update app configuration',
        isLoading: false
      }));
      return false;
    }
  }, []);

  const createCustomApp = useCallback(async (app: CustomApp): Promise<boolean> => {
    setState(prev => ({ ...prev, isLoading: true, error: null }));
    try {
      // Simulate API call
      await new Promise(resolve => setTimeout(resolve, 1000));

      setState(prev => ({
        ...prev,
        customApps: [...prev.customApps, app],
        isLoading: false
      }));

      return true;
    } catch (error) {
      setState(prev => ({
        ...prev,
        error: 'Failed to create custom app',
        isLoading: false
      }));
      return false;
    }
  }, []);

  const executeApp = useCallback(async (
    appId: string,
    meetingId: string,
    input?: any
  ): Promise<AppExecution | null> => {
    setState(prev => ({ ...prev, isLoading: true, error: null }));
    try {
      // Create execution record
      const execution: AppExecution = {
        id: `exec-${Date.now()}`,
        appId,
        meetingId,
        status: 'pending',
        startTime: new Date().toISOString()
      };

      setState(prev => ({
        ...prev,
        executions: [...prev.executions, execution]
      }));

      // Simulate app execution
      await new Promise(resolve => setTimeout(resolve, 2000));

      // Update execution status
      const updatedExecution: AppExecution = {
        ...execution,
        status: 'completed',
        endTime: new Date().toISOString(),
        output: 'Sample output from the AI app execution...'
      };

      setState(prev => ({
        ...prev,
        executions: prev.executions.map(e =>
          e.id === execution.id ? updatedExecution : e
        ),
        isLoading: false
      }));

      // Update usage count
      setState(prev => ({
        ...prev,
        installedApps: prev.installedApps.map(app =>
          app.id === appId
            ? { ...app, lastUsed: new Date().toISOString(), usageCount: app.usageCount + 1 }
            : app
        )
      }));

      return updatedExecution;
    } catch (error) {
      setState(prev => ({
        ...prev,
        error: 'Failed to execute app',
        isLoading: false
      }));
      return null;
    }
  }, []);

  const getAppUsageStats = useCallback((appId: string) => {
    const app = state.installedApps.find(a => a.id === appId);
    const appExecutions = state.executions.filter(e => e.appId === appId);

    if (!app) return null;

    const successCount = appExecutions.filter(e => e.status === 'completed').length;
    const failCount = appExecutions.filter(e => e.status === 'failed').length;
    const totalCount = appExecutions.length;

    return {
      app,
      totalRuns: totalCount,
      successRate: totalCount > 0 ? (successCount / totalCount) * 100 : 0,
      failureRate: totalCount > 0 ? (failCount / totalCount) * 100 : 0,
      lastRun: app.lastUsed,
      averageTime: 3.2, // Mock value - calculate from executions in production
      executions: appExecutions
    };
  }, [state.installedApps, state.executions]);

  const testApp = useCallback(async (
    app: AIApp | CustomApp,
    testInput: string
  ): Promise<{ success: boolean; output?: string; error?: string }> => {
    setState(prev => ({ ...prev, isLoading: true, error: null }));
    try {
      // Simulate API call to test app
      await new Promise(resolve => setTimeout(resolve, 1500));

      // Mock successful test
      const testOutput = `Test output for ${app.name}:\n\nProcessed input successfully.\nGenerated summary with ${Math.floor(Math.random() * 10 + 5)} key points.`;

      setState(prev => ({ ...prev, isLoading: false }));

      return {
        success: true,
        output: testOutput
      };
    } catch (error) {
      setState(prev => ({
        ...prev,
        error: 'Failed to test app',
        isLoading: false
      }));
      return {
        success: false,
        error: 'Test failed: ' + (error as Error).message
      };
    }
  }, []);

  // Computed values
  const enabledApps = useMemo(
    () => state.installedApps.filter(app => app.config.enabled),
    [state.installedApps]
  );

  const recentExecutions = useMemo(
    () => state.executions.slice(-10).reverse(),
    [state.executions]
  );

  return {
    // State
    installedApps: state.installedApps,
    customApps: state.customApps,
    executions: state.executions,
    enabledApps,
    recentExecutions,
    isLoading: state.isLoading,
    error: state.error,

    // Actions
    installApp,
    uninstallApp,
    updateAppConfig,
    createCustomApp,
    executeApp,
    testApp,
    getAppUsageStats,
    reload: loadInstalledApps
  };
}