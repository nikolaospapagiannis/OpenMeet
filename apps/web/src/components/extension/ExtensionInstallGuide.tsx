'use client';

import { useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Alert, AlertDescription } from '@/components/ui/alert';
import {
  Chrome,
  Download,
  CheckCircle,
  ArrowRight,
  ExternalLink,
  Copy,
  Info,
  Shield,
  Zap,
  Users,
  FileText,
  HelpCircle,
  Star,
} from 'lucide-react';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { toast } from 'sonner';

export default function ExtensionInstallGuide() {
  const [copiedId, setCopiedId] = useState(false);

  const extensionId = 'abcdefghijklmnopqrstuvwxyz123456'; // Placeholder
  const chromeStoreUrl = 'https://chrome.google.com/webstore/detail/openmeet-meeting-recorder/abcdefghijklmnopqrstuvwxyz123456';

  const copyExtensionId = () => {
    navigator.clipboard.writeText(extensionId);
    setCopiedId(true);
    toast.success('Extension ID copied to clipboard');
    setTimeout(() => setCopiedId(false), 2000);
  };

  const features = [
    {
      icon: <Zap className="h-5 w-5" />,
      title: 'Botless Recording',
      description: 'Record directly from your browser without external bots joining',
    },
    {
      icon: <Shield className="h-5 w-5" />,
      title: 'Privacy First',
      description: 'All recordings are processed securely with end-to-end encryption',
    },
    {
      icon: <Users className="h-5 w-5" />,
      title: 'Multi-Platform Support',
      description: 'Works with Zoom, Google Meet, Microsoft Teams, and Webex',
    },
    {
      icon: <FileText className="h-5 w-5" />,
      title: 'Instant Transcription',
      description: 'Get real-time transcriptions and AI-generated summaries',
    },
  ];

  const installSteps = [
    {
      number: 1,
      title: 'Open Chrome Web Store',
      description: 'Click the button below to visit the extension page',
      action: 'Visit Store',
    },
    {
      number: 2,
      title: 'Add to Chrome',
      description: 'Click the "Add to Chrome" button on the store page',
      action: 'Install',
    },
    {
      number: 3,
      title: 'Grant Permissions',
      description: 'Allow required permissions for meeting detection',
      action: 'Authorize',
    },
    {
      number: 4,
      title: 'Sign In',
      description: 'Connect your OpenMeet account to the extension',
      action: 'Connect',
    },
    {
      number: 5,
      title: 'Start Recording',
      description: 'Join any meeting and start recording with one click',
      action: 'Record',
    },
  ];

  const permissions = [
    {
      name: 'Tab Capture',
      description: 'Required to record audio and video from meeting tabs',
      required: true,
    },
    {
      name: 'Active Tab',
      description: 'Detect when you\'re in a supported meeting platform',
      required: true,
    },
    {
      name: 'Storage',
      description: 'Save your preferences and settings locally',
      required: true,
    },
    {
      name: 'Notifications',
      description: 'Alert you when recordings start or complete',
      required: false,
    },
    {
      name: 'Scripting',
      description: 'Inject recording controls into meeting pages',
      required: true,
    },
  ];

  const troubleshooting = [
    {
      issue: 'Extension not detecting meetings',
      solution: 'Ensure you\'ve granted all required permissions and refresh the meeting page',
    },
    {
      issue: 'Recording not starting',
      solution: 'Check that your microphone and camera permissions are enabled in Chrome',
    },
    {
      issue: 'No audio in recordings',
      solution: 'Enable "Share audio" when prompted by Chrome during screen capture',
    },
    {
      issue: 'Extension icon not visible',
      solution: 'Click the puzzle piece icon in Chrome toolbar and pin the OpenMeet extension',
    },
  ];

  return (
    <div className="space-y-6">
      {/* Hero Section */}
      <Card className="overflow-hidden">
        <div className="bg-gradient-to-r from-blue-600 to-purple-600 p-6 text-white">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-4">
              <div className="p-3 bg-white/20 rounded-lg backdrop-blur">
                <Chrome className="h-8 w-8" />
              </div>
              <div>
                <h2 className="text-2xl font-bold">OpenMeet Chrome Extension</h2>
                <p className="text-white/90 mt-1">
                  Record meetings directly from your browser
                </p>
              </div>
            </div>
            <div className="flex items-center gap-3">
              <Badge className="bg-white/20 text-white border-white/40">
                Version 1.0.0
              </Badge>
              <div className="flex items-center gap-1">
                <Star className="h-4 w-4 fill-yellow-400 text-yellow-400" />
                <Star className="h-4 w-4 fill-yellow-400 text-yellow-400" />
                <Star className="h-4 w-4 fill-yellow-400 text-yellow-400" />
                <Star className="h-4 w-4 fill-yellow-400 text-yellow-400" />
                <Star className="h-4 w-4 text-white/40" />
                <span className="ml-1 text-sm">4.5 (2.3k)</span>
              </div>
            </div>
          </div>
        </div>
        <CardContent className="p-6">
          <div className="flex flex-col sm:flex-row gap-4">
            <Button size="lg" className="flex-1" onClick={() => window.open(chromeStoreUrl, '_blank')}>
              <Download className="mr-2 h-5 w-5" />
              Install from Chrome Web Store
            </Button>
            <Button size="lg" variant="outline" className="flex-1">
              <ExternalLink className="mr-2 h-5 w-5" />
              View in Store
            </Button>
          </div>
          <div className="mt-4 p-3 bg-muted rounded-lg">
            <div className="flex items-center justify-between">
              <div className="text-sm">
                <span className="text-muted-foreground">Extension ID: </span>
                <code className="font-mono text-xs bg-background px-2 py-1 rounded">
                  {extensionId}
                </code>
              </div>
              <Button size="sm" variant="ghost" onClick={copyExtensionId}>
                {copiedId ? (
                  <CheckCircle className="h-4 w-4 text-green-600" />
                ) : (
                  <Copy className="h-4 w-4" />
                )}
              </Button>
            </div>
          </div>
        </CardContent>
      </Card>

      <Tabs defaultValue="features" className="space-y-4">
        <TabsList className="grid grid-cols-4 w-full">
          <TabsTrigger value="features">Features</TabsTrigger>
          <TabsTrigger value="install">Installation</TabsTrigger>
          <TabsTrigger value="permissions">Permissions</TabsTrigger>
          <TabsTrigger value="help">Help</TabsTrigger>
        </TabsList>

        <TabsContent value="features" className="space-y-4">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {features.map((feature) => (
              <Card key={feature.title}>
                <CardContent className="p-4">
                  <div className="flex gap-3">
                    <div className="p-2 bg-primary/10 rounded-lg text-primary">
                      {feature.icon}
                    </div>
                    <div>
                      <h3 className="font-semibold">{feature.title}</h3>
                      <p className="text-sm text-muted-foreground mt-1">
                        {feature.description}
                      </p>
                    </div>
                  </div>
                </CardContent>
              </Card>
            ))}
          </div>
        </TabsContent>

        <TabsContent value="install" className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle>Installation Steps</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="space-y-4">
                {installSteps.map((step, index) => (
                  <div
                    key={step.number}
                    className="flex gap-4 p-3 rounded-lg hover:bg-accent transition-colors"
                  >
                    <div className="flex-shrink-0">
                      <div className="w-8 h-8 bg-primary text-white rounded-full flex items-center justify-center font-semibold text-sm">
                        {step.number}
                      </div>
                    </div>
                    <div className="flex-1">
                      <h4 className="font-semibold">{step.title}</h4>
                      <p className="text-sm text-muted-foreground mt-0.5">
                        {step.description}
                      </p>
                    </div>
                    {index < installSteps.length - 1 && (
                      <ArrowRight className="h-5 w-5 text-muted-foreground self-center" />
                    )}
                  </div>
                ))}
              </div>
              <Alert className="mt-4">
                <Info className="h-4 w-4" />
                <AlertDescription>
                  After installation, refresh any open meeting tabs to activate the extension.
                </AlertDescription>
              </Alert>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="permissions" className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle>Required Permissions</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="space-y-3">
                {permissions.map((permission) => (
                  <div
                    key={permission.name}
                    className="flex items-start gap-3 p-3 rounded-lg border"
                  >
                    <Shield
                      className={`h-5 w-5 mt-0.5 ${
                        permission.required ? 'text-orange-600' : 'text-gray-400'
                      }`}
                    />
                    <div className="flex-1">
                      <div className="flex items-center gap-2">
                        <span className="font-medium">{permission.name}</span>
                        {permission.required && (
                          <Badge variant="secondary" className="text-xs">
                            Required
                          </Badge>
                        )}
                      </div>
                      <p className="text-sm text-muted-foreground mt-0.5">
                        {permission.description}
                      </p>
                    </div>
                  </div>
                ))}
              </div>
              <Alert className="mt-4 bg-blue-50 dark:bg-blue-950/30 border-blue-200 dark:border-blue-900">
                <Shield className="h-4 w-4 text-blue-600" />
                <AlertDescription className="text-blue-900 dark:text-blue-300">
                  We take your privacy seriously. All permissions are used solely for recording
                  functionality and your data is never shared with third parties.
                </AlertDescription>
              </Alert>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="help" className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle>Troubleshooting</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="space-y-3">
                {troubleshooting.map((item, index) => (
                  <div key={index} className="p-3 rounded-lg border">
                    <div className="flex items-start gap-3">
                      <HelpCircle className="h-5 w-5 text-orange-600 mt-0.5" />
                      <div className="flex-1">
                        <p className="font-medium text-sm">{item.issue}</p>
                        <p className="text-sm text-muted-foreground mt-1">
                          {item.solution}
                        </p>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle>Need More Help?</CardTitle>
            </CardHeader>
            <CardContent className="space-y-3">
              <Button variant="outline" className="w-full justify-start">
                <FileText className="mr-2 h-4 w-4" />
                Read Documentation
              </Button>
              <Button variant="outline" className="w-full justify-start">
                <Users className="mr-2 h-4 w-4" />
                Join Community Forum
              </Button>
              <Button variant="outline" className="w-full justify-start">
                <HelpCircle className="mr-2 h-4 w-4" />
                Contact Support
              </Button>
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>
    </div>
  );
}