'use client';

import { useState } from 'react';
import {
  Sparkles, Code, Settings, FileText, Wand2, Plus, X,
  Copy, Save, Play, ChevronRight, AlertCircle, CheckCircle,
  Lightbulb, Database, Webhook, ArrowRight, Brain, Terminal
} from 'lucide-react';
import { CardGlass, CardGlassContent, CardGlassDescription, CardGlassHeader, CardGlassTitle } from '@/components/ui/card-glass';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Switch } from '@/components/ui/switch';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Badge } from '@/components/ui/badge';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { Slider } from '@/components/ui/slider';
import {
  Accordion,
  AccordionContent,
  AccordionItem,
  AccordionTrigger,
} from '@/components/ui/accordion';

export type CustomApp = {
  name: string;
  description: string;
  category: string;
  trigger: 'manual' | 'automatic' | 'scheduled';
  promptTemplate: string;
  inputSource: string[];
  outputFormat: string;
  parameters: Record<string, any>;
  webhooks?: {
    enabled: boolean;
    url?: string;
    events?: string[];
  };
  advanced?: {
    model?: string;
    temperature?: number;
    maxTokens?: number;
    topP?: number;
  };
};

const promptTemplates = [
  {
    id: 'summary',
    name: 'Meeting Summary',
    category: 'Productivity',
    template: `Summarize the following meeting transcript:

{{transcript}}

Focus on:
1. Key discussion points
2. Decisions made
3. Action items with owners
4. Next steps

Format the summary in a clear, professional manner.`,
    icon: FileText,
    color: 'blue'
  },
  {
    id: 'action-items',
    name: 'Action Items Extractor',
    category: 'Productivity',
    template: `Extract all action items from this meeting:

{{transcript}}

For each action item, include:
- Description of the task
- Assigned person (if mentioned)
- Due date (if mentioned)
- Priority level (based on context)

Format as a numbered list.`,
    icon: CheckCircle,
    color: 'green'
  },
  {
    id: 'sentiment',
    name: 'Sentiment Analyzer',
    category: 'Analytics',
    template: `Analyze the sentiment and emotional tone of this conversation:

{{transcript}}

Provide:
1. Overall sentiment (positive/neutral/negative)
2. Key emotional moments
3. Speaker-by-speaker sentiment breakdown
4. Recommendations for improving meeting atmosphere`,
    icon: Brain,
    color: 'purple'
  },
  {
    id: 'technical',
    name: 'Technical Documentation',
    category: 'Development',
    template: `Generate technical documentation from this meeting:

{{transcript}}

Extract and format:
1. Technical requirements discussed
2. Architecture decisions
3. Code snippets or examples mentioned
4. API endpoints or data schemas
5. Technical blockers or dependencies

Use markdown formatting with code blocks where appropriate.`,
    icon: Code,
    color: 'amber'
  },
  {
    id: 'sales',
    name: 'Sales Insights',
    category: 'Sales',
    template: `Analyze this sales meeting for key insights:

{{transcript}}

Identify:
1. Customer pain points
2. Objections raised
3. Features/benefits discussed
4. Next steps in sales process
5. Deal blockers
6. Competitor mentions

Provide actionable recommendations for closing the deal.`,
    icon: Database,
    color: 'orange'
  },
  {
    id: 'custom',
    name: 'Custom Template',
    category: 'Custom',
    template: '',
    icon: Wand2,
    color: 'slate'
  }
];

interface CustomAppBuilderProps {
  onSaveApp?: (app: CustomApp) => void;
  onTestApp?: (app: CustomApp) => void;
}

export default function CustomAppBuilder({ onSaveApp, onTestApp }: CustomAppBuilderProps) {
  const [activeStep, setActiveStep] = useState(0);
  const [selectedTemplate, setSelectedTemplate] = useState<string>('');
  const [appConfig, setAppConfig] = useState<CustomApp>({
    name: '',
    description: '',
    category: 'Productivity',
    trigger: 'manual',
    promptTemplate: '',
    inputSource: ['transcript'],
    outputFormat: 'markdown',
    parameters: {},
    webhooks: {
      enabled: false,
      url: '',
      events: []
    },
    advanced: {
      model: 'gpt-4',
      temperature: 0.7,
      maxTokens: 2000,
      topP: 0.9
    }
  });

  const steps = [
    { id: 0, name: 'Choose Template', icon: Wand2 },
    { id: 1, name: 'Configure Prompt', icon: Brain },
    { id: 2, name: 'Set Parameters', icon: Settings },
    { id: 3, name: 'Advanced Settings', icon: Terminal },
    { id: 4, name: 'Test & Deploy', icon: Play }
  ];

  const categories = [
    'Productivity',
    'Analytics',
    'Communication',
    'Sales',
    'Marketing',
    'Development',
    'Support',
    'Custom'
  ];

  const handleTemplateSelect = (templateId: string) => {
    setSelectedTemplate(templateId);
    const template = promptTemplates.find(t => t.id === templateId);
    if (template) {
      setAppConfig(prev => ({
        ...prev,
        promptTemplate: template.template,
        category: template.category !== 'Custom' ? template.category : prev.category
      }));
    }
  };

  const handleTestApp = () => {
    onTestApp?.(appConfig);
  };

  const handleSaveApp = () => {
    onSaveApp?.(appConfig);
  };

  const getColorClasses = (color: string) => {
    const colors: Record<string, string> = {
      blue: 'bg-blue-500/20 text-blue-400 border-blue-500/30',
      green: 'bg-green-500/20 text-green-400 border-green-500/30',
      purple: 'bg-purple-500/20 text-purple-400 border-purple-500/30',
      amber: 'bg-amber-500/20 text-amber-400 border-amber-500/30',
      orange: 'bg-orange-500/20 text-orange-400 border-orange-500/30',
      slate: 'bg-slate-500/20 text-slate-400 border-slate-500/30',
    };
    return colors[color] || colors.slate;
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-xl font-bold text-white flex items-center gap-2">
            <Sparkles className="h-5 w-5 text-purple-400" />
            Custom AI App Builder
          </h2>
          <p className="text-sm text-slate-400">Build your own AI-powered app with custom prompts and logic</p>
        </div>
      </div>

      {/* Progress Steps */}
      <div className="flex items-center justify-between mb-6">
        {steps.map((step, index) => {
          const Icon = step.icon;
          const isActive = activeStep === step.id;
          const isCompleted = activeStep > step.id;

          return (
            <div key={step.id} className="flex items-center flex-1">
              <button
                onClick={() => setActiveStep(step.id)}
                className={`flex items-center gap-2 p-3 rounded-lg transition-all ${
                  isActive
                    ? 'bg-purple-500/20 text-purple-400 border border-purple-500/30'
                    : isCompleted
                    ? 'bg-green-500/10 text-green-400 border border-green-500/20'
                    : 'bg-slate-800/50 text-slate-500 border border-white/5'
                }`}
              >
                <Icon className="h-4 w-4" />
                <span className="hidden sm:inline text-sm font-medium">{step.name}</span>
              </button>
              {index < steps.length - 1 && (
                <ChevronRight className="h-4 w-4 text-slate-600 mx-2" />
              )}
            </div>
          );
        })}
      </div>

      {/* Step Content */}
      <CardGlass>
        <CardGlassContent className="p-6">
          {/* Step 0: Choose Template */}
          {activeStep === 0 && (
            <div className="space-y-6">
              <div>
                <h3 className="text-lg font-semibold text-white mb-2">Choose a Template</h3>
                <p className="text-sm text-slate-400">Start with a pre-built template or create your own from scratch</p>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                {promptTemplates.map(template => {
                  const Icon = template.icon;
                  const isSelected = selectedTemplate === template.id;

                  return (
                    <button
                      key={template.id}
                      onClick={() => handleTemplateSelect(template.id)}
                      className={`p-4 rounded-lg border transition-all text-left ${
                        isSelected
                          ? 'bg-purple-500/20 border-purple-500/50'
                          : 'bg-slate-800/50 border-white/10 hover:border-purple-500/30'
                      }`}
                    >
                      <div className="flex items-start gap-3">
                        <div className={`p-2 rounded-lg ${getColorClasses(template.color)}`}>
                          <Icon className="h-5 w-5" />
                        </div>
                        <div className="flex-1">
                          <h4 className="font-medium text-white">{template.name}</h4>
                          <p className="text-xs text-slate-400 mt-1">{template.category}</p>
                        </div>
                        {isSelected && (
                          <CheckCircle className="h-5 w-5 text-purple-400" />
                        )}
                      </div>
                    </button>
                  );
                })}
              </div>

              <div className="flex justify-end">
                <Button
                  onClick={() => setActiveStep(1)}
                  disabled={!selectedTemplate}
                  className="bg-purple-600 hover:bg-purple-700 text-white"
                >
                  Continue
                  <ArrowRight className="h-4 w-4 ml-2" />
                </Button>
              </div>
            </div>
          )}

          {/* Step 1: Configure Prompt */}
          {activeStep === 1 && (
            <div className="space-y-6">
              <div>
                <h3 className="text-lg font-semibold text-white mb-2">Configure Your Prompt</h3>
                <p className="text-sm text-slate-400">Customize the AI prompt to match your specific needs</p>
              </div>

              <div className="space-y-4">
                <div>
                  <Label htmlFor="app-name">App Name</Label>
                  <Input
                    id="app-name"
                    placeholder="e.g., Sales Call Analyzer"
                    value={appConfig.name}
                    onChange={(e) => setAppConfig(prev => ({ ...prev, name: e.target.value }))}
                    className="bg-slate-900/50 border-white/10 text-white"
                  />
                </div>

                <div>
                  <Label htmlFor="app-description">Description</Label>
                  <Input
                    id="app-description"
                    placeholder="Brief description of what your app does"
                    value={appConfig.description}
                    onChange={(e) => setAppConfig(prev => ({ ...prev, description: e.target.value }))}
                    className="bg-slate-900/50 border-white/10 text-white"
                  />
                </div>

                <div>
                  <Label htmlFor="prompt-template">Prompt Template</Label>
                  <div className="mb-2">
                    <Alert className="bg-blue-500/10 border-blue-500/30">
                      <Lightbulb className="h-4 w-4 text-blue-400" />
                      <AlertDescription className="text-blue-300">
                        Use variables like {'{{transcript}}'}, {'{{speaker}}'}, {'{{date}}'} to inject dynamic content
                      </AlertDescription>
                    </Alert>
                  </div>
                  <Textarea
                    id="prompt-template"
                    rows={10}
                    value={appConfig.promptTemplate}
                    onChange={(e) => setAppConfig(prev => ({ ...prev, promptTemplate: e.target.value }))}
                    className="bg-slate-900/50 border-white/10 text-white font-mono text-sm"
                    placeholder="Enter your prompt template..."
                  />
                </div>

                <div className="flex items-center gap-2">
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => navigator.clipboard.writeText(appConfig.promptTemplate)}
                    className="border-white/10 text-slate-400"
                  >
                    <Copy className="h-4 w-4 mr-2" />
                    Copy
                  </Button>
                  <Button
                    variant="outline"
                    size="sm"
                    className="border-white/10 text-slate-400"
                  >
                    <Wand2 className="h-4 w-4 mr-2" />
                    AI Enhance
                  </Button>
                </div>
              </div>

              <div className="flex justify-between">
                <Button
                  variant="outline"
                  onClick={() => setActiveStep(0)}
                  className="border-white/10 text-slate-400"
                >
                  Back
                </Button>
                <Button
                  onClick={() => setActiveStep(2)}
                  disabled={!appConfig.name || !appConfig.promptTemplate}
                  className="bg-purple-600 hover:bg-purple-700 text-white"
                >
                  Continue
                  <ArrowRight className="h-4 w-4 ml-2" />
                </Button>
              </div>
            </div>
          )}

          {/* Step 2: Set Parameters */}
          {activeStep === 2 && (
            <div className="space-y-6">
              <div>
                <h3 className="text-lg font-semibold text-white mb-2">Set Parameters</h3>
                <p className="text-sm text-slate-400">Configure how your app processes and outputs data</p>
              </div>

              <div className="space-y-4">
                <div>
                  <Label htmlFor="category">Category</Label>
                  <Select
                    value={appConfig.category}
                    onValueChange={(value) => setAppConfig(prev => ({ ...prev, category: value }))}
                  >
                    <SelectTrigger id="category" className="bg-slate-900/50 border-white/10 text-white">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      {categories.map(cat => (
                        <SelectItem key={cat} value={cat}>{cat}</SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>

                <div>
                  <Label htmlFor="trigger">Trigger Type</Label>
                  <Select
                    value={appConfig.trigger}
                    onValueChange={(value: 'manual' | 'automatic' | 'scheduled') =>
                      setAppConfig(prev => ({ ...prev, trigger: value }))
                    }
                  >
                    <SelectTrigger id="trigger" className="bg-slate-900/50 border-white/10 text-white">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="manual">Manual (User triggered)</SelectItem>
                      <SelectItem value="automatic">Automatic (After each meeting)</SelectItem>
                      <SelectItem value="scheduled">Scheduled (At specific times)</SelectItem>
                    </SelectContent>
                  </Select>
                </div>

                <div>
                  <Label>Input Sources</Label>
                  <div className="space-y-2 mt-2">
                    {['transcript', 'audio', 'video', 'metadata', 'participants'].map(source => (
                      <label key={source} className="flex items-center gap-2">
                        <input
                          type="checkbox"
                          checked={appConfig.inputSource.includes(source)}
                          onChange={(e) => {
                            if (e.target.checked) {
                              setAppConfig(prev => ({
                                ...prev,
                                inputSource: [...prev.inputSource, source]
                              }));
                            } else {
                              setAppConfig(prev => ({
                                ...prev,
                                inputSource: prev.inputSource.filter(s => s !== source)
                              }));
                            }
                          }}
                          className="rounded border-white/10 bg-slate-900/50 text-purple-500"
                        />
                        <span className="text-sm text-slate-300 capitalize">{source}</span>
                      </label>
                    ))}
                  </div>
                </div>

                <div>
                  <Label htmlFor="output-format">Output Format</Label>
                  <Select
                    value={appConfig.outputFormat}
                    onValueChange={(value) => setAppConfig(prev => ({ ...prev, outputFormat: value }))}
                  >
                    <SelectTrigger id="output-format" className="bg-slate-900/50 border-white/10 text-white">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="markdown">Markdown</SelectItem>
                      <SelectItem value="json">JSON</SelectItem>
                      <SelectItem value="html">HTML</SelectItem>
                      <SelectItem value="plain">Plain Text</SelectItem>
                      <SelectItem value="csv">CSV</SelectItem>
                    </SelectContent>
                  </Select>
                </div>

                <div>
                  <Label>Meeting Type Filtering</Label>
                  <div className="space-y-2 mt-2">
                    {['Sales Calls', 'Team Meetings', '1-on-1s', 'Interviews', 'Webinars'].map(type => (
                      <label key={type} className="flex items-center gap-2">
                        <input
                          type="checkbox"
                          className="rounded border-white/10 bg-slate-900/50 text-purple-500"
                        />
                        <span className="text-sm text-slate-300">{type}</span>
                      </label>
                    ))}
                  </div>
                </div>
              </div>

              <div className="flex justify-between">
                <Button
                  variant="outline"
                  onClick={() => setActiveStep(1)}
                  className="border-white/10 text-slate-400"
                >
                  Back
                </Button>
                <Button
                  onClick={() => setActiveStep(3)}
                  className="bg-purple-600 hover:bg-purple-700 text-white"
                >
                  Continue
                  <ArrowRight className="h-4 w-4 ml-2" />
                </Button>
              </div>
            </div>
          )}

          {/* Step 3: Advanced Settings */}
          {activeStep === 3 && (
            <div className="space-y-6">
              <div>
                <h3 className="text-lg font-semibold text-white mb-2">Advanced Settings</h3>
                <p className="text-sm text-slate-400">Fine-tune AI model parameters and integrations</p>
              </div>

              <Tabs defaultValue="ai" className="w-full">
                <TabsList className="bg-slate-900/50 border border-white/10">
                  <TabsTrigger value="ai">AI Model</TabsTrigger>
                  <TabsTrigger value="webhooks">Webhooks</TabsTrigger>
                  <TabsTrigger value="permissions">Permissions</TabsTrigger>
                </TabsList>

                <TabsContent value="ai" className="space-y-4 mt-4">
                  <div>
                    <Label htmlFor="model">AI Model</Label>
                    <Select
                      value={appConfig.advanced?.model}
                      onValueChange={(value) => setAppConfig(prev => ({
                        ...prev,
                        advanced: { ...prev.advanced, model: value }
                      }))}
                    >
                      <SelectTrigger id="model" className="bg-slate-900/50 border-white/10 text-white">
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="gpt-4">GPT-4 (Most capable)</SelectItem>
                        <SelectItem value="gpt-3.5-turbo">GPT-3.5 Turbo (Fast)</SelectItem>
                        <SelectItem value="claude-2">Claude 2</SelectItem>
                        <SelectItem value="llama-2">Llama 2</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>

                  <div>
                    <Label htmlFor="temperature">Temperature: {appConfig.advanced?.temperature}</Label>
                    <Slider
                      id="temperature"
                      min={0}
                      max={1}
                      step={0.1}
                      value={[appConfig.advanced?.temperature || 0.7]}
                      onValueChange={([value]) => setAppConfig(prev => ({
                        ...prev,
                        advanced: { ...prev.advanced, temperature: value }
                      }))}
                      className="mt-2"
                    />
                    <p className="text-xs text-slate-500 mt-1">Higher = more creative, Lower = more focused</p>
                  </div>

                  <div>
                    <Label htmlFor="max-tokens">Max Tokens: {appConfig.advanced?.maxTokens}</Label>
                    <Slider
                      id="max-tokens"
                      min={100}
                      max={4000}
                      step={100}
                      value={[appConfig.advanced?.maxTokens || 2000]}
                      onValueChange={([value]) => setAppConfig(prev => ({
                        ...prev,
                        advanced: { ...prev.advanced, maxTokens: value }
                      }))}
                      className="mt-2"
                    />
                  </div>

                  <div>
                    <Label htmlFor="top-p">Top P: {appConfig.advanced?.topP}</Label>
                    <Slider
                      id="top-p"
                      min={0}
                      max={1}
                      step={0.1}
                      value={[appConfig.advanced?.topP || 0.9]}
                      onValueChange={([value]) => setAppConfig(prev => ({
                        ...prev,
                        advanced: { ...prev.advanced, topP: value }
                      }))}
                      className="mt-2"
                    />
                  </div>
                </TabsContent>

                <TabsContent value="webhooks" className="space-y-4 mt-4">
                  <div className="flex items-center justify-between">
                    <Label htmlFor="enable-webhooks">Enable Webhooks</Label>
                    <Switch
                      id="enable-webhooks"
                      checked={appConfig.webhooks?.enabled}
                      onCheckedChange={(checked) => setAppConfig(prev => ({
                        ...prev,
                        webhooks: { ...prev.webhooks, enabled: checked }
                      }))}
                    />
                  </div>

                  {appConfig.webhooks?.enabled && (
                    <>
                      <div>
                        <Label htmlFor="webhook-url">Webhook URL</Label>
                        <Input
                          id="webhook-url"
                          placeholder="https://api.example.com/webhook"
                          value={appConfig.webhooks?.url}
                          onChange={(e) => setAppConfig(prev => ({
                            ...prev,
                            webhooks: { ...prev.webhooks, url: e.target.value }
                          }))}
                          className="bg-slate-900/50 border-white/10 text-white"
                        />
                      </div>

                      <div>
                        <Label>Trigger Events</Label>
                        <div className="space-y-2 mt-2">
                          {['app.completed', 'app.failed', 'app.started'].map(event => (
                            <label key={event} className="flex items-center gap-2">
                              <input
                                type="checkbox"
                                className="rounded border-white/10 bg-slate-900/50 text-purple-500"
                              />
                              <span className="text-sm text-slate-300">{event}</span>
                            </label>
                          ))}
                        </div>
                      </div>
                    </>
                  )}
                </TabsContent>

                <TabsContent value="permissions" className="space-y-4 mt-4">
                  <div className="space-y-3">
                    <label className="flex items-center gap-2">
                      <input
                        type="checkbox"
                        defaultChecked
                        className="rounded border-white/10 bg-slate-900/50 text-purple-500"
                      />
                      <span className="text-sm text-slate-300">Read meeting transcripts</span>
                    </label>
                    <label className="flex items-center gap-2">
                      <input
                        type="checkbox"
                        defaultChecked
                        className="rounded border-white/10 bg-slate-900/50 text-purple-500"
                      />
                      <span className="text-sm text-slate-300">Write to meeting notes</span>
                    </label>
                    <label className="flex items-center gap-2">
                      <input
                        type="checkbox"
                        className="rounded border-white/10 bg-slate-900/50 text-purple-500"
                      />
                      <span className="text-sm text-slate-300">Send notifications</span>
                    </label>
                    <label className="flex items-center gap-2">
                      <input
                        type="checkbox"
                        className="rounded border-white/10 bg-slate-900/50 text-purple-500"
                      />
                      <span className="text-sm text-slate-300">Access calendar</span>
                    </label>
                    <label className="flex items-center gap-2">
                      <input
                        type="checkbox"
                        className="rounded border-white/10 bg-slate-900/50 text-purple-500"
                      />
                      <span className="text-sm text-slate-300">Export data</span>
                    </label>
                  </div>
                </TabsContent>
              </Tabs>

              <div className="flex justify-between">
                <Button
                  variant="outline"
                  onClick={() => setActiveStep(2)}
                  className="border-white/10 text-slate-400"
                >
                  Back
                </Button>
                <Button
                  onClick={() => setActiveStep(4)}
                  className="bg-purple-600 hover:bg-purple-700 text-white"
                >
                  Continue
                  <ArrowRight className="h-4 w-4 ml-2" />
                </Button>
              </div>
            </div>
          )}

          {/* Step 4: Test & Deploy */}
          {activeStep === 4 && (
            <div className="space-y-6">
              <div>
                <h3 className="text-lg font-semibold text-white mb-2">Test & Deploy</h3>
                <p className="text-sm text-slate-400">Test your app with sample data before deploying</p>
              </div>

              {/* App Summary */}
              <div className="bg-slate-900/50 rounded-lg p-4 border border-white/10">
                <h4 className="font-medium text-white mb-3">App Summary</h4>
                <div className="space-y-2 text-sm">
                  <div className="flex justify-between">
                    <span className="text-slate-400">Name:</span>
                    <span className="text-white">{appConfig.name || 'Unnamed App'}</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-slate-400">Category:</span>
                    <span className="text-white">{appConfig.category}</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-slate-400">Trigger:</span>
                    <span className="text-white capitalize">{appConfig.trigger}</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-slate-400">Output Format:</span>
                    <span className="text-white uppercase">{appConfig.outputFormat}</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-slate-400">AI Model:</span>
                    <span className="text-white">{appConfig.advanced?.model}</span>
                  </div>
                </div>
              </div>

              {/* Test Section */}
              <div>
                <Label htmlFor="test-input">Test Input</Label>
                <Textarea
                  id="test-input"
                  rows={6}
                  placeholder="Paste a sample transcript or meeting notes to test your app..."
                  className="bg-slate-900/50 border-white/10 text-white font-mono text-sm"
                />
              </div>

              <div className="flex gap-2">
                <Button
                  onClick={handleTestApp}
                  variant="outline"
                  className="border-purple-500/30 text-purple-400 hover:bg-purple-500/10"
                >
                  <Play className="h-4 w-4 mr-2" />
                  Test App
                </Button>
                <Button
                  variant="outline"
                  className="border-white/10 text-slate-400"
                >
                  <Code className="h-4 w-4 mr-2" />
                  View Code
                </Button>
              </div>

              {/* Test Results */}
              <Alert className="bg-green-500/10 border-green-500/30">
                <CheckCircle className="h-4 w-4 text-green-400" />
                <AlertDescription className="text-green-300">
                  Ready to deploy! Your app has been validated and is ready to use.
                </AlertDescription>
              </Alert>

              <div className="flex justify-between">
                <Button
                  variant="outline"
                  onClick={() => setActiveStep(3)}
                  className="border-white/10 text-slate-400"
                >
                  Back
                </Button>
                <div className="flex gap-2">
                  <Button
                    variant="outline"
                    className="border-white/10 text-slate-400"
                  >
                    Save as Draft
                  </Button>
                  <Button
                    onClick={handleSaveApp}
                    className="bg-purple-600 hover:bg-purple-700 text-white"
                  >
                    <Save className="h-4 w-4 mr-2" />
                    Deploy App
                  </Button>
                </div>
              </div>
            </div>
          )}
        </CardGlassContent>
      </CardGlass>
    </div>
  );
}