'use client';

import { useState, useCallback, useMemo } from 'react';
import { Switch } from '@/components/ui/switch';
import { Label } from '@/components/ui/label';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Card } from '@/components/ui/card';
import {
  Video,
  Users,
  Globe,
  CheckCircle,
  XCircle,
  Settings,
  TestTube,
  ExternalLink,
  AlertCircle,
} from 'lucide-react';
import { toast } from 'sonner';

interface Platform {
  id: keyof MeetingDetectionProps['enabledPlatforms'];
  name: string;
  icon: string;
  domains: string[];
  color: string;
  bgColor: string;
  description: string;
  features: string[];
}

interface MeetingDetectionProps {
  enabledPlatforms: {
    zoom: boolean;
    googleMeet: boolean;
    teams: boolean;
    webex: boolean;
  };
  onChange: (platforms: MeetingDetectionProps['enabledPlatforms']) => void;
}

const PLATFORMS: Platform[] = [
  {
    id: 'zoom',
    name: 'Zoom',
    icon: '🎥',
    domains: ['zoom.us', 'zoom.com'],
    color: 'text-blue-600',
    bgColor: 'bg-blue-100',
    description: 'Support for Zoom meetings and webinars',
    features: ['Audio recording', 'Screen capture', 'Participant detection', 'Chat export'],
  },
  {
    id: 'googleMeet',
    name: 'Google Meet',
    icon: '📹',
    domains: ['meet.google.com'],
    color: 'text-green-600',
    bgColor: 'bg-green-100',
    description: 'Full integration with Google Meet',
    features: ['Live captions', 'Auto-transcription', 'Calendar sync', 'Screen recording'],
  },
  {
    id: 'teams',
    name: 'Microsoft Teams',
    icon: '👥',
    domains: ['teams.microsoft.com', 'teams.live.com'],
    color: 'text-purple-600',
    bgColor: 'bg-purple-100',
    description: 'Microsoft Teams meetings and calls',
    features: ['Meeting recording', 'Chat history', 'File sharing detection', 'Presenter notes'],
  },
  {
    id: 'webex',
    name: 'Webex',
    icon: '🌐',
    domains: ['webex.com', '*.webex.com'],
    color: 'text-orange-600',
    bgColor: 'bg-orange-100',
    description: 'Cisco Webex meetings and events',
    features: ['Audio/video capture', 'Whiteboard capture', 'Breakout rooms', 'Q&A tracking'],
  },
];

export default function MeetingDetection({ enabledPlatforms, onChange }: MeetingDetectionProps) {
  const [testingPlatform, setTestingPlatform] = useState<string | null>(null);
  const [testResults, setTestResults] = useState<Record<string, boolean>>({});

  const testPlatform = useCallback(async (platformId: string) => {
    setTestingPlatform(platformId);

    // Simulate testing the platform connection
    await new Promise(resolve => setTimeout(resolve, 2000));

    // Mock test - in real implementation, would check actual platform
    const success = Math.random() > 0.3;
    setTestResults(prev => ({ ...prev, [platformId]: success }));
    setTestingPlatform(null);

    const platformName = PLATFORMS.find(p => p.id === platformId)?.name || platformId;
    if (success) {
      toast.success(`${platformName} platform test successful!`);
    } else {
      toast.error(`Failed to connect to ${platformName}. Please check permissions.`);
    }
  }, []);

  const handlePlatformToggle = useCallback((platformId: string, enabled: boolean) => {
    onChange({
      ...enabledPlatforms,
      [platformId]: enabled,
    });

    if (enabled) {
      const platformName = PLATFORMS.find(p => p.id === platformId)?.name;
      toast.success(`${platformName} enabled`);
    }
  }, [enabledPlatforms, onChange]);

  const enabledCount = useMemo(() =>
    Object.values(enabledPlatforms).filter(Boolean).length,
    [enabledPlatforms]
  );

  return (
    <div className="space-y-6">
      {/* Summary */}
      <div className="flex items-center justify-between p-4 bg-accent rounded-lg">
        <div>
          <p className="text-sm font-medium">Platform Detection</p>
          <p className="text-xs text-muted-foreground mt-0.5">
            {enabledCount} of {PLATFORMS.length} platforms enabled
          </p>
        </div>
        <div className="flex gap-2">
          <Button
            variant="outline"
            size="sm"
            onClick={() => {
              const allEnabled = Object.fromEntries(
                PLATFORMS.map(p => [p.id, true])
              ) as any;
              onChange(allEnabled);
              toast.success('All platforms enabled');
            }}
          >
            Enable All
          </Button>
          <Button
            variant="outline"
            size="sm"
            onClick={() => {
              const allDisabled = Object.fromEntries(
                PLATFORMS.map(p => [p.id, false])
              ) as any;
              onChange(allDisabled);
              toast.info('All platforms disabled');
            }}
          >
            Disable All
          </Button>
        </div>
      </div>

      {/* Platform Cards */}
      <div className="grid gap-4">
        {PLATFORMS.map((platform) => (
          <Card
            key={platform.id}
            className={`p-4 transition-all ${
              enabledPlatforms[platform.id as keyof typeof enabledPlatforms]
                ? 'border-primary/50 bg-accent/20'
                : 'opacity-75'
            }`}
          >
            <div className="space-y-4">
              {/* Header */}
              <div className="flex items-start justify-between">
                <div className="flex items-start gap-3">
                  <div className={`p-3 rounded-lg ${platform.bgColor}`}>
                    <span className="text-2xl">{platform.icon}</span>
                  </div>
                  <div className="flex-1">
                    <div className="flex items-center gap-2">
                      <h3 className="font-semibold">{platform.name}</h3>
                      {testResults[platform.id] !== undefined && (
                        <Badge variant={testResults[platform.id] ? "success" : "destructive"}>
                          {testResults[platform.id] ? (
                            <>
                              <CheckCircle className="mr-1 h-3 w-3" />
                              Tested
                            </>
                          ) : (
                            <>
                              <XCircle className="mr-1 h-3 w-3" />
                              Failed
                            </>
                          )}
                        </Badge>
                      )}
                    </div>
                    <p className="text-sm text-muted-foreground mt-1">
                      {platform.description}
                    </p>
                  </div>
                </div>
                <Switch
                  checked={enabledPlatforms[platform.id as keyof typeof enabledPlatforms]}
                  onCheckedChange={(checked) => handlePlatformToggle(platform.id, checked)}
                />
              </div>

              {/* Domains */}
              <div className="flex items-center gap-2 text-xs">
                <Globe className="h-3 w-3 text-muted-foreground" />
                <span className="text-muted-foreground">Domains:</span>
                {platform.domains.map((domain) => (
                  <Badge key={domain} variant="secondary" className="text-xs">
                    {domain}
                  </Badge>
                ))}
              </div>

              {/* Features */}
              {enabledPlatforms[platform.id as keyof typeof enabledPlatforms] && (
                <div className="pt-3 border-t space-y-2">
                  <p className="text-xs font-medium text-muted-foreground">Supported Features:</p>
                  <div className="flex flex-wrap gap-2">
                    {platform.features.map((feature) => (
                      <div
                        key={feature}
                        className="flex items-center gap-1 text-xs text-muted-foreground"
                      >
                        <CheckCircle className="h-3 w-3 text-green-600" />
                        <span>{feature}</span>
                      </div>
                    ))}
                  </div>
                </div>
              )}

              {/* Actions */}
              {enabledPlatforms[platform.id as keyof typeof enabledPlatforms] && (
                <div className="flex gap-2">
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => testPlatform(platform.id)}
                    disabled={testingPlatform === platform.id}
                  >
                    {testingPlatform === platform.id ? (
                      <>
                        <TestTube className="mr-2 h-3 w-3 animate-pulse" />
                        Testing...
                      </>
                    ) : (
                      <>
                        <TestTube className="mr-2 h-3 w-3" />
                        Test Connection
                      </>
                    )}
                  </Button>
                  <Button variant="ghost" size="sm">
                    <Settings className="mr-2 h-3 w-3" />
                    Configure
                  </Button>
                  <Button variant="ghost" size="sm">
                    <ExternalLink className="mr-2 h-3 w-3" />
                    Help
                  </Button>
                </div>
              )}
            </div>
          </Card>
        ))}
      </div>

      {/* Info Message */}
      <div className="p-4 bg-yellow-50 dark:bg-yellow-950/30 border border-yellow-200 dark:border-yellow-900 rounded-lg">
        <div className="flex gap-3">
          <AlertCircle className="h-4 w-4 text-yellow-600 dark:text-yellow-400 mt-0.5" />
          <div className="space-y-1">
            <p className="text-sm font-medium text-yellow-900 dark:text-yellow-300">
              Platform Requirements
            </p>
            <ul className="text-xs text-yellow-700 dark:text-yellow-400 space-y-1">
              <li>• Extension must have permission to access meeting domains</li>
              <li>• Some platforms may require additional authentication</li>
              <li>• Screen recording permissions may be needed for full functionality</li>
              <li>• Ensure pop-up blockers are disabled for meeting platforms</li>
            </ul>
          </div>
        </div>
      </div>
    </div>
  );
}