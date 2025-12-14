'use client';

import React, { useState } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Separator } from '@/components/ui/separator';
import {
  Collapsible,
  CollapsibleContent,
  CollapsibleTrigger,
} from '@/components/ui/collapsible';
import {
  Copy,
  CheckCircle,
  AlertCircle,
  ChevronRight,
  ChevronDown,
  Rocket,
  Code2,
  Terminal,
  FileCode,
  BookOpen,
  Zap,
  PlayCircle,
  Key,
  Package,
  TestTube,
  Settings,
  Lightbulb,
  ArrowRight,
} from 'lucide-react';
import { toast } from 'sonner';

interface QuickStartProps {
  onSelectKey?: (keyId: string) => void;
}

const QUICKSTART_STEPS = [
  {
    id: 'api-key',
    title: 'Generate API Key',
    description: 'Create your first API key to authenticate requests',
    icon: <Key className="h-5 w-5" />,
    status: 'pending',
    content: `Navigate to the API Keys tab and click "Create API Key". Choose the appropriate permissions and rate limits for your use case.`,
    code: `// Store your API key securely
const API_KEY = process.env.NEBULA_API_KEY;`,
  },
  {
    id: 'install',
    title: 'Install SDK',
    description: 'Add OpenMeet SDK to your project',
    icon: <Package className="h-5 w-5" />,
    status: 'pending',
    content: `Install the SDK using your preferred package manager. The SDK provides type-safe methods and automatic retry logic.`,
    code: `# Using npm
npm install @openmeet/sdk

# Using yarn
yarn add @openmeet/sdk

# Using pnpm
pnpm add @openmeet/sdk`,
  },
  {
    id: 'initialize',
    title: 'Initialize Client',
    description: 'Configure the SDK with your API key',
    icon: <Settings className="h-5 w-5" />,
    status: 'pending',
    content: `Initialize the OpenMeet client with your API key and optional configuration parameters.`,
    code: `import { OpenMeetAI } from '@openmeet/sdk';

const client = new OpenMeetAI({
  apiKey: process.env.NEBULA_API_KEY,
  baseURL: 'https://api.openmeet.com', // Optional
  timeout: 30000, // Optional: 30 seconds
  maxRetries: 3, // Optional: retry failed requests
});`,
  },
  {
    id: 'first-request',
    title: 'Make First Request',
    description: 'Send your first API request',
    icon: <PlayCircle className="h-5 w-5" />,
    status: 'pending',
    content: `Make your first API call to transcribe audio or analyze conversations.`,
    code: `// Transcribe audio file
const transcription = await client.transcriptions.create({
  audio_url: 'https://example.com/audio.mp3',
  language: 'en',
  diarization: true,
});

console.log('Transcription:', transcription.text);
console.log('Speakers:', transcription.speakers);`,
  },
  {
    id: 'test',
    title: 'Test Integration',
    description: 'Verify everything is working correctly',
    icon: <TestTube className="h-5 w-5" />,
    status: 'pending',
    content: `Test your integration using the API Playground or by running the example code.`,
    code: `// Test your API key
async function testIntegration() {
  try {
    const response = await client.health.check();
    console.log('✅ API is working:', response);
  } catch (error) {
    console.error('❌ API error:', error);
  }
}

testIntegration();`,
  },
];

const USE_CASES = [
  {
    id: 'meeting-transcription',
    title: 'Meeting Transcription',
    description: 'Automatically transcribe and summarize team meetings',
    icon: <FileCode className="h-5 w-5" />,
    tags: ['Audio', 'Transcription', 'Summary'],
    code: `// Transcribe and summarize a meeting
async function processMeeting(audioUrl) {
  // Step 1: Transcribe the audio
  const transcription = await client.transcriptions.create({
    audio_url: audioUrl,
    language: 'en',
    diarization: true,
    punctuation: true,
  });

  // Step 2: Generate meeting summary
  const analysis = await client.analysis.create({
    transcript_id: transcription.id,
    types: ['summary', 'action_items', 'key_topics'],
  });

  return {
    transcript: transcription.text,
    summary: analysis.summary,
    actionItems: analysis.action_items,
    topics: analysis.key_topics,
  };
}`,
  },
  {
    id: 'real-time-captions',
    title: 'Real-time Captions',
    description: 'Stream live captions for video calls or presentations',
    icon: <Zap className="h-5 w-5" />,
    tags: ['Streaming', 'Real-time', 'Captions'],
    code: `// Stream real-time transcription
async function streamCaptions(audioStream) {
  const stream = await client.transcriptions.stream({
    audio_stream: audioStream,
    language: 'en',
    interim_results: true,
  });

  stream.on('transcript', (data) => {
    if (data.is_final) {
      console.log('Final:', data.text);
      // Display final caption
      displayCaption(data.text);
    } else {
      console.log('Interim:', data.text);
      // Show interim results
      displayInterimCaption(data.text);
    }
  });

  stream.on('error', (error) => {
    console.error('Stream error:', error);
  });
}`,
  },
  {
    id: 'sentiment-analysis',
    title: 'Customer Sentiment',
    description: 'Analyze customer calls for sentiment and insights',
    icon: <Lightbulb className="h-5 w-5" />,
    tags: ['Analysis', 'Sentiment', 'Insights'],
    code: `// Analyze customer sentiment
async function analyzeCustomerCall(transcriptId) {
  const analysis = await client.analysis.create({
    transcript_id: transcriptId,
    types: ['sentiment', 'emotions', 'topics'],
    options: {
      sentiment_granularity: 'sentence',
      emotion_detection: true,
    },
  });

  // Process results
  const insights = {
    overallSentiment: analysis.sentiment.overall,
    emotionBreakdown: analysis.emotions,
    criticalMoments: analysis.sentiment.timeline.filter(
      s => s.score < -0.5
    ),
    topics: analysis.topics,
  };

  return insights;
}`,
  },
];

const FAQ_ITEMS = [
  {
    question: 'What audio formats are supported?',
    answer: 'We support MP3, WAV, M4A, WebM, and most common audio/video formats. Files can be up to 2GB in size.',
  },
  {
    question: 'How accurate is the transcription?',
    answer: 'Our transcription accuracy is typically 95-98% for clear audio in supported languages. Accuracy may vary based on audio quality, accents, and background noise.',
  },
  {
    question: 'Can I use the API for real-time streaming?',
    answer: 'Yes! We support real-time streaming transcription with low latency. You can stream audio directly from your application and receive transcripts in real-time.',
  },
  {
    question: 'What languages are supported?',
    answer: 'We currently support 50+ languages including English, Spanish, French, German, Chinese, Japanese, and more. Check our docs for the full list.',
  },
  {
    question: 'How is billing calculated?',
    answer: 'Billing is based on audio minutes processed. We offer pay-as-you-go and monthly subscription plans. Real-time streaming is billed per minute of audio streamed.',
  },
];

export default function QuickStart({ onSelectKey }: QuickStartProps) {
  const [completedSteps, setCompletedSteps] = useState<string[]>([]);
  const [expandedUseCase, setExpandedUseCase] = useState<string | null>(null);
  const [expandedFaq, setExpandedFaq] = useState<string | null>(null);

  const copyToClipboard = (text: string) => {
    navigator.clipboard.writeText(text);
    toast.success('Copied to clipboard');
  };

  const markStepComplete = (stepId: string) => {
    if (!completedSteps.includes(stepId)) {
      setCompletedSteps([...completedSteps, stepId]);
      toast.success('Step completed!');
    }
  };

  const getStepStatus = (stepId: string) => {
    return completedSteps.includes(stepId) ? 'completed' : 'pending';
  };

  return (
    <div className="space-y-6">
      {/* Welcome Section */}
      <Card>
        <CardHeader>
          <div className="flex items-center gap-2">
            <Rocket className="h-6 w-6 text-primary" />
            <CardTitle className="text-2xl">Welcome to OpenMeet API</CardTitle>
          </div>
          <CardDescription>
            Get started with our powerful transcription and analysis API in just 5 minutes
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <div className="flex items-start gap-3">
              <div className="p-2 bg-primary/10 rounded-lg">
                <Zap className="h-5 w-5 text-primary" />
              </div>
              <div>
                <h4 className="font-medium mb-1">Lightning Fast</h4>
                <p className="text-sm text-muted-foreground">
                  Process hours of audio in minutes with our optimized pipeline
                </p>
              </div>
            </div>
            <div className="flex items-start gap-3">
              <div className="p-2 bg-primary/10 rounded-lg">
                <CheckCircle className="h-5 w-5 text-primary" />
              </div>
              <div>
                <h4 className="font-medium mb-1">High Accuracy</h4>
                <p className="text-sm text-muted-foreground">
                  95-98% transcription accuracy with advanced AI models
                </p>
              </div>
            </div>
            <div className="flex items-start gap-3">
              <div className="p-2 bg-primary/10 rounded-lg">
                <BookOpen className="h-5 w-5 text-primary" />
              </div>
              <div>
                <h4 className="font-medium mb-1">Comprehensive Docs</h4>
                <p className="text-sm text-muted-foreground">
                  Detailed documentation with examples in multiple languages
                </p>
              </div>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Getting Started Steps */}
      <Card>
        <CardHeader>
          <CardTitle>Getting Started</CardTitle>
          <CardDescription>
            Follow these steps to integrate OpenMeet into your application
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          {QUICKSTART_STEPS.map((step, index) => (
            <div key={step.id} className="relative">
              {index !== QUICKSTART_STEPS.length - 1 && (
                <div className="absolute left-6 top-14 bottom-0 w-px bg-border" />
              )}
              <Collapsible>
                <div className="flex items-start gap-4">
                  <div
                    className={`relative flex h-12 w-12 items-center justify-center rounded-full border-2 ${
                      getStepStatus(step.id) === 'completed'
                        ? 'border-green-500 bg-green-50'
                        : 'border-muted bg-background'
                    }`}
                  >
                    {getStepStatus(step.id) === 'completed' ? (
                      <CheckCircle className="h-6 w-6 text-green-500" />
                    ) : (
                      step.icon
                    )}
                  </div>
                  <div className="flex-1 space-y-2">
                    <CollapsibleTrigger className="flex w-full items-center justify-between">
                      <div className="text-left">
                        <h4 className="font-medium">{step.title}</h4>
                        <p className="text-sm text-muted-foreground">{step.description}</p>
                      </div>
                      <ChevronDown className="h-4 w-4 transition-transform ui-expanded:rotate-180" />
                    </CollapsibleTrigger>
                    <CollapsibleContent className="space-y-4">
                      <p className="text-sm">{step.content}</p>
                      <div className="relative">
                        <pre className="bg-muted p-4 rounded-lg overflow-x-auto">
                          <code className="text-sm">{step.code}</code>
                        </pre>
                        <Button
                          variant="ghost"
                          size="sm"
                          className="absolute top-2 right-2"
                          onClick={() => copyToClipboard(step.code)}
                        >
                          <Copy className="h-4 w-4" />
                        </Button>
                      </div>
                      <div className="flex gap-2">
                        <Button
                          size="sm"
                          onClick={() => markStepComplete(step.id)}
                          disabled={getStepStatus(step.id) === 'completed'}
                        >
                          {getStepStatus(step.id) === 'completed' ? (
                            <>
                              <CheckCircle className="h-4 w-4 mr-2" />
                              Completed
                            </>
                          ) : (
                            <>Mark as Complete</>
                          )}
                        </Button>
                        {step.id === 'api-key' && (
                          <Button
                            variant="outline"
                            size="sm"
                            onClick={() => onSelectKey?.('create')}
                          >
                            Go to API Keys
                            <ArrowRight className="h-4 w-4 ml-2" />
                          </Button>
                        )}
                      </div>
                    </CollapsibleContent>
                  </div>
                </div>
              </Collapsible>
            </div>
          ))}

          <Separator className="my-6" />

          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm text-muted-foreground">
                Progress: {completedSteps.length} of {QUICKSTART_STEPS.length} steps completed
              </p>
            </div>
            {completedSteps.length === QUICKSTART_STEPS.length && (
              <Badge variant="success" className="text-sm">
                <CheckCircle className="h-3 w-3 mr-1" />
                Setup Complete!
              </Badge>
            )}
          </div>
        </CardContent>
      </Card>

      {/* Use Cases */}
      <Card>
        <CardHeader>
          <CardTitle>Common Use Cases</CardTitle>
          <CardDescription>
            Explore popular integrations and implementation patterns
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          {USE_CASES.map((useCase) => (
            <Collapsible
              key={useCase.id}
              open={expandedUseCase === useCase.id}
              onOpenChange={(open) => setExpandedUseCase(open ? useCase.id : null)}
            >
              <CollapsibleTrigger className="w-full">
                <div className="flex items-center justify-between p-4 rounded-lg border hover:bg-accent/50 transition-colors">
                  <div className="flex items-center gap-3">
                    <div className="p-2 bg-primary/10 rounded-lg">{useCase.icon}</div>
                    <div className="text-left">
                      <h4 className="font-medium">{useCase.title}</h4>
                      <p className="text-sm text-muted-foreground">{useCase.description}</p>
                    </div>
                  </div>
                  <ChevronRight className="h-4 w-4 transition-transform ui-expanded:rotate-90" />
                </div>
              </CollapsibleTrigger>
              <CollapsibleContent className="px-4">
                <div className="mt-4 space-y-4">
                  <div className="flex gap-2">
                    {useCase.tags.map((tag) => (
                      <Badge key={tag} variant="secondary">
                        {tag}
                      </Badge>
                    ))}
                  </div>
                  <div className="relative">
                    <pre className="bg-slate-950 text-slate-100 p-4 rounded-lg overflow-x-auto">
                      <code className="text-sm">{useCase.code}</code>
                    </pre>
                    <Button
                      variant="ghost"
                      size="sm"
                      className="absolute top-2 right-2"
                      onClick={() => copyToClipboard(useCase.code)}
                    >
                      <Copy className="h-4 w-4" />
                    </Button>
                  </div>
                  <div className="flex gap-2">
                    <Button variant="outline" size="sm">
                      <BookOpen className="h-4 w-4 mr-2" />
                      View Full Tutorial
                    </Button>
                    <Button variant="outline" size="sm">
                      <Code2 className="h-4 w-4 mr-2" />
                      Download Example
                    </Button>
                  </div>
                </div>
              </CollapsibleContent>
            </Collapsible>
          ))}
        </CardContent>
      </Card>

      {/* FAQ */}
      <Card>
        <CardHeader>
          <CardTitle>Frequently Asked Questions</CardTitle>
          <CardDescription>
            Find answers to common questions about the API
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-2">
          {FAQ_ITEMS.map((faq, index) => (
            <Collapsible
              key={index}
              open={expandedFaq === faq.question}
              onOpenChange={(open) => setExpandedFaq(open ? faq.question : null)}
            >
              <CollapsibleTrigger className="flex w-full items-center justify-between p-4 hover:bg-accent/50 rounded-lg transition-colors">
                <span className="text-left font-medium">{faq.question}</span>
                <ChevronDown className="h-4 w-4 transition-transform ui-expanded:rotate-180" />
              </CollapsibleTrigger>
              <CollapsibleContent className="px-4 pb-4">
                <p className="text-sm text-muted-foreground">{faq.answer}</p>
              </CollapsibleContent>
            </Collapsible>
          ))}
        </CardContent>
      </Card>

      {/* Need Help */}
      <Alert>
        <AlertCircle className="h-4 w-4" />
        <AlertTitle>Need Help?</AlertTitle>
        <AlertDescription className="space-y-2">
          <p>
            Check out our comprehensive documentation or reach out to our support team.
          </p>
          <div className="flex gap-2 mt-3">
            <Button variant="outline" size="sm">
              <BookOpen className="h-4 w-4 mr-2" />
              Documentation
            </Button>
            <Button variant="outline" size="sm">
              <Terminal className="h-4 w-4 mr-2" />
              API Reference
            </Button>
            <Button variant="outline" size="sm">
              Contact Support
            </Button>
          </div>
        </AlertDescription>
      </Alert>
    </div>
  );
}