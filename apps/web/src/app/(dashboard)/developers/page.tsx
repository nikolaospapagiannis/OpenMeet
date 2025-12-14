'use client';

import React, { useState } from 'react';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import APIKeyManager from '@/components/developers/APIKeyManager';
import APIPlayground from '@/components/developers/APIPlayground';
import SDKDocs from '@/components/developers/SDKDocs';
import UsageStats from '@/components/developers/UsageStats';
import QuickStart from '@/components/developers/QuickStart';
import { Code, Key, PlayCircle, BarChart, Rocket, Book } from 'lucide-react';

export default function DeveloperPortalPage() {
  const [selectedKeyId, setSelectedKeyId] = useState<string | null>(null);

  return (
    <div className="container mx-auto py-6 px-4 max-w-7xl">
      {/* Header */}
      <div className="mb-8">
        <h1 className="text-3xl font-bold mb-2">Developer Portal</h1>
        <p className="text-muted-foreground">
          Build powerful integrations with the OpenMeet API
        </p>
      </div>

      {/* Quick Stats */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4 mb-8">
        <Card>
          <CardHeader className="pb-3">
            <div className="flex items-center justify-between">
              <CardTitle className="text-sm font-medium text-muted-foreground">
                API Version
              </CardTitle>
              <Code className="h-4 w-4 text-muted-foreground" />
            </div>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">v1.0.0</div>
            <p className="text-xs text-muted-foreground mt-1">Latest stable</p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="pb-3">
            <div className="flex items-center justify-between">
              <CardTitle className="text-sm font-medium text-muted-foreground">
                Base URL
              </CardTitle>
              <Book className="h-4 w-4 text-muted-foreground" />
            </div>
          </CardHeader>
          <CardContent>
            <div className="text-sm font-mono truncate">api.openmeet.com</div>
            <p className="text-xs text-muted-foreground mt-1">Production</p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="pb-3">
            <div className="flex items-center justify-between">
              <CardTitle className="text-sm font-medium text-muted-foreground">
                Rate Limit
              </CardTitle>
              <BarChart className="h-4 w-4 text-muted-foreground" />
            </div>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">1,000</div>
            <p className="text-xs text-muted-foreground mt-1">Requests/hour</p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="pb-3">
            <div className="flex items-center justify-between">
              <CardTitle className="text-sm font-medium text-muted-foreground">
                Status
              </CardTitle>
              <div className="h-2 w-2 bg-green-500 rounded-full animate-pulse" />
            </div>
          </CardHeader>
          <CardContent>
            <div className="text-sm font-medium text-green-600">Operational</div>
            <p className="text-xs text-muted-foreground mt-1">All systems go</p>
          </CardContent>
        </Card>
      </div>

      {/* Main Content Tabs */}
      <Tabs defaultValue="quickstart" className="space-y-6">
        <TabsList className="grid grid-cols-5 w-full max-w-3xl">
          <TabsTrigger value="quickstart" className="flex items-center gap-2">
            <Rocket className="h-4 w-4" />
            Quick Start
          </TabsTrigger>
          <TabsTrigger value="keys" className="flex items-center gap-2">
            <Key className="h-4 w-4" />
            API Keys
          </TabsTrigger>
          <TabsTrigger value="playground" className="flex items-center gap-2">
            <PlayCircle className="h-4 w-4" />
            Playground
          </TabsTrigger>
          <TabsTrigger value="docs" className="flex items-center gap-2">
            <Book className="h-4 w-4" />
            SDK & Docs
          </TabsTrigger>
          <TabsTrigger value="usage" className="flex items-center gap-2">
            <BarChart className="h-4 w-4" />
            Usage
          </TabsTrigger>
        </TabsList>

        <TabsContent value="quickstart" className="mt-6">
          <QuickStart onSelectKey={setSelectedKeyId} />
        </TabsContent>

        <TabsContent value="keys" className="mt-6">
          <APIKeyManager onSelectKey={setSelectedKeyId} selectedKeyId={selectedKeyId} />
        </TabsContent>

        <TabsContent value="playground" className="mt-6">
          <APIPlayground selectedKeyId={selectedKeyId} />
        </TabsContent>

        <TabsContent value="docs" className="mt-6">
          <SDKDocs />
        </TabsContent>

        <TabsContent value="usage" className="mt-6">
          <UsageStats selectedKeyId={selectedKeyId} />
        </TabsContent>
      </Tabs>
    </div>
  );
}