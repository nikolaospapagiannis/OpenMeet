'use client';

import React, { useState } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Alert, AlertDescription } from '@/components/ui/alert';
import {
  Code2,
  Copy,
  Download,
  Package,
  Terminal,
  CheckCircle,
  FileCode,
  GitBranch,
  Zap,
  Shield,
  Globe,
} from 'lucide-react';
import { toast } from 'sonner';

const JAVASCRIPT_EXAMPLE = `// Install the SDK
// npm install @openmeet/sdk

import { OpenMeetAI } from '@openmeet/sdk';

// Initialize the client
const nebula = new OpenMeetAI({
  apiKey: process.env.NEBULA_API_KEY,
  // Optional: Override default configuration
  baseURL: 'https://api.openmeet.com',
  timeout: 30000,
  maxRetries: 3,
});

// Transcribe audio
async function transcribeAudio() {
  try {
    const result = await nebula.transcriptions.create({
      audio_url: 'https://example.com/audio.mp3',
      language: 'en',
      diarization: true,
      punctuation: true,
      formatTimestamps: true,
    });

    console.log('Transcription ID:', result.id);
    console.log('Status:', result.status);
    console.log('Text:', result.text);
  } catch (error) {
    console.error('Error:', error);
  }
}

// Analyze conversation
async function analyzeConversation() {
  const analysis = await nebula.analysis.create({
    transcript_id: 'trans_123456',
    types: ['summary', 'action_items', 'sentiment'],
  });

  console.log('Summary:', analysis.summary);
  console.log('Action Items:', analysis.action_items);
  console.log('Sentiment:', analysis.sentiment);
}

// Stream real-time transcription
async function streamTranscription() {
  const stream = await nebula.transcriptions.stream({
    audio_stream: audioStream, // Your audio stream
    language: 'en',
    interim_results: true,
  });

  stream.on('transcript', (data) => {
    console.log('Transcript:', data.text);
  });

  stream.on('error', (error) => {
    console.error('Stream error:', error);
  });
}`;

const PYTHON_EXAMPLE = `# Install the SDK
# pip install openmeet

from nebula_ai import OpenMeetAI
import os

# Initialize the client
client = OpenMeetAI(
    api_key=os.environ.get("NEBULA_API_KEY"),
    # Optional: Override default configuration
    base_url="https://api.openmeet.com",
    timeout=30,
    max_retries=3,
)

# Transcribe audio
def transcribe_audio():
    try:
        result = client.transcriptions.create(
            audio_url="https://example.com/audio.mp3",
            language="en",
            diarization=True,
            punctuation=True,
            format_timestamps=True,
        )

        print(f"Transcription ID: {result.id}")
        print(f"Status: {result.status}")
        print(f"Text: {result.text}")
    except Exception as e:
        print(f"Error: {e}")

# Analyze conversation
def analyze_conversation():
    analysis = client.analysis.create(
        transcript_id="trans_123456",
        types=["summary", "action_items", "sentiment"],
    )

    print(f"Summary: {analysis.summary}")
    print(f"Action Items: {analysis.action_items}")
    print(f"Sentiment: {analysis.sentiment}")

# Async support
import asyncio

async def async_transcribe():
    async with OpenMeetAI(api_key=os.environ.get("NEBULA_API_KEY")) as client:
        result = await client.transcriptions.create_async(
            audio_url="https://example.com/audio.mp3",
            language="en",
        )
        print(result.text)

# Stream real-time transcription
def stream_transcription(audio_stream):
    stream = client.transcriptions.stream(
        audio_stream=audio_stream,
        language="en",
        interim_results=True,
    )

    for transcript in stream:
        print(f"Transcript: {transcript.text}")`;

const CURL_EXAMPLE = `# Authentication
# All requests must include the Authorization header with your API key

# Transcribe audio
curl -X POST https://api.openmeet.com/v1/transcriptions \\
  -H "Authorization: Bearer YOUR_API_KEY" \\
  -H "Content-Type: application/json" \\
  -d '{
    "audio_url": "https://example.com/audio.mp3",
    "language": "en",
    "diarization": true,
    "punctuation": true,
    "format_timestamps": true
  }'

# Get transcription status
curl -X GET https://api.openmeet.com/v1/transcriptions/trans_123456 \\
  -H "Authorization: Bearer YOUR_API_KEY"

# Analyze conversation
curl -X POST https://api.openmeet.com/v1/analysis \\
  -H "Authorization: Bearer YOUR_API_KEY" \\
  -H "Content-Type: application/json" \\
  -d '{
    "transcript_id": "trans_123456",
    "types": ["summary", "action_items", "sentiment"]
  }'

# List meetings
curl -X GET "https://api.openmeet.com/v1/meetings?limit=10&offset=0" \\
  -H "Authorization: Bearer YOUR_API_KEY"

# Create meeting
curl -X POST https://api.openmeet.com/v1/meetings \\
  -H "Authorization: Bearer YOUR_API_KEY" \\
  -H "Content-Type: application/json" \\
  -d '{
    "title": "Weekly Team Sync",
    "participants": ["john@example.com", "jane@example.com"],
    "scheduled_at": "2024-12-10T10:00:00Z",
    "duration": 60
  }'

# Upload file for transcription
curl -X POST https://api.openmeet.com/v1/transcriptions/upload \\
  -H "Authorization: Bearer YOUR_API_KEY" \\
  -F "file=@/path/to/audio.mp3" \\
  -F "language=en" \\
  -F "diarization=true"`;

const GO_EXAMPLE = `// Install the SDK
// go get github.com/openmeet/nebula-go

package main

import (
    "context"
    "fmt"
    "log"
    "os"

    "github.com/openmeet/nebula-go"
)

func main() {
    // Initialize the client
    client := nebula.NewClient(
        nebula.WithAPIKey(os.Getenv("NEBULA_API_KEY")),
        // Optional: Override default configuration
        nebula.WithBaseURL("https://api.openmeet.com"),
        nebula.WithTimeout(30),
        nebula.WithMaxRetries(3),
    )

    // Transcribe audio
    ctx := context.Background()
    result, err := client.Transcriptions.Create(ctx, &nebula.TranscriptionRequest{
        AudioURL:         "https://example.com/audio.mp3",
        Language:         "en",
        Diarization:      true,
        Punctuation:      true,
        FormatTimestamps: true,
    })
    if err != nil {
        log.Fatal(err)
    }

    fmt.Printf("Transcription ID: %s\\n", result.ID)
    fmt.Printf("Status: %s\\n", result.Status)
    fmt.Printf("Text: %s\\n", result.Text)

    // Analyze conversation
    analysis, err := client.Analysis.Create(ctx, &nebula.AnalysisRequest{
        TranscriptID: "trans_123456",
        Types:        []string{"summary", "action_items", "sentiment"},
    })
    if err != nil {
        log.Fatal(err)
    }

    fmt.Printf("Summary: %s\\n", analysis.Summary)
    fmt.Printf("Action Items: %v\\n", analysis.ActionItems)
    fmt.Printf("Sentiment: %s\\n", analysis.Sentiment)
}

// Stream real-time transcription
func streamTranscription(client *nebula.Client, audioStream io.Reader) {
    stream, err := client.Transcriptions.Stream(context.Background(), &nebula.StreamRequest{
        AudioStream:     audioStream,
        Language:        "en",
        InterimResults:  true,
    })
    if err != nil {
        log.Fatal(err)
    }
    defer stream.Close()

    for {
        transcript, err := stream.Recv()
        if err != nil {
            if err == io.EOF {
                break
            }
            log.Printf("Stream error: %v", err)
            continue
        }
        fmt.Printf("Transcript: %s\\n", transcript.Text)
    }
}`;

const SDK_FEATURES = [
  {
    icon: <Zap className="h-5 w-5" />,
    title: 'Automatic Retries',
    description: 'Built-in exponential backoff and retry logic for resilient integrations',
  },
  {
    icon: <Shield className="h-5 w-5" />,
    title: 'Type Safety',
    description: 'Full TypeScript and Python type hints for better developer experience',
  },
  {
    icon: <Globe className="h-5 w-5" />,
    title: 'Global Edge Network',
    description: 'Automatic routing to the nearest data center for optimal latency',
  },
  {
    icon: <GitBranch className="h-5 w-5" />,
    title: 'Streaming Support',
    description: 'Real-time streaming APIs for live transcription and analysis',
  },
];

export default function SDKDocs() {
  const [selectedTab, setSelectedTab] = useState('javascript');

  const copyToClipboard = (text: string) => {
    navigator.clipboard.writeText(text);
    toast.success('Copied to clipboard');
  };

  const getInstallCommand = (language: string) => {
    switch (language) {
      case 'javascript':
        return 'npm install @openmeet/sdk';
      case 'python':
        return 'pip install openmeet';
      case 'go':
        return 'go get github.com/openmeet/nebula-go';
      default:
        return '';
    }
  };

  const getCodeExample = (language: string) => {
    switch (language) {
      case 'javascript':
        return JAVASCRIPT_EXAMPLE;
      case 'python':
        return PYTHON_EXAMPLE;
      case 'curl':
        return CURL_EXAMPLE;
      case 'go':
        return GO_EXAMPLE;
      default:
        return '';
    }
  };

  return (
    <div className="space-y-6">
      {/* SDK Features */}
      <Card>
        <CardHeader>
          <CardTitle>SDK Features</CardTitle>
          <CardDescription>
            Our SDKs provide a seamless integration experience with enterprise-grade features
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {SDK_FEATURES.map((feature, index) => (
              <div key={index} className="flex gap-3">
                <div className="flex-shrink-0 mt-1">{feature.icon}</div>
                <div>
                  <h4 className="font-medium mb-1">{feature.title}</h4>
                  <p className="text-sm text-muted-foreground">{feature.description}</p>
                </div>
              </div>
            ))}
          </div>
        </CardContent>
      </Card>

      {/* Language Tabs */}
      <Card>
        <CardHeader>
          <div className="flex items-center justify-between">
            <div>
              <CardTitle>SDK Documentation</CardTitle>
              <CardDescription>
                Choose your preferred programming language to get started
              </CardDescription>
            </div>
            <div className="flex gap-2">
              <Button variant="outline" size="sm">
                <FileCode className="h-4 w-4 mr-2" />
                API Reference
              </Button>
              <Button variant="outline" size="sm">
                <Download className="h-4 w-4 mr-2" />
                Download SDK
              </Button>
            </div>
          </div>
        </CardHeader>
        <CardContent>
          <Tabs value={selectedTab} onValueChange={setSelectedTab}>
            <TabsList className="grid w-full grid-cols-4">
              <TabsTrigger value="javascript">JavaScript</TabsTrigger>
              <TabsTrigger value="python">Python</TabsTrigger>
              <TabsTrigger value="curl">cURL</TabsTrigger>
              <TabsTrigger value="go">Go</TabsTrigger>
            </TabsList>

            <TabsContent value={selectedTab} className="space-y-4">
              {/* Installation */}
              {selectedTab !== 'curl' && (
                <div>
                  <div className="flex items-center justify-between mb-2">
                    <Label className="text-sm font-medium">Installation</Label>
                    <Badge variant="secondary">Latest: v1.2.3</Badge>
                  </div>
                  <div className="flex gap-2">
                    <div className="flex-1 bg-muted p-3 rounded-lg font-mono text-sm">
                      <Terminal className="inline-block h-4 w-4 mr-2 text-muted-foreground" />
                      {getInstallCommand(selectedTab)}
                    </div>
                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={() => copyToClipboard(getInstallCommand(selectedTab))}
                    >
                      <Copy className="h-4 w-4" />
                    </Button>
                  </div>
                </div>
              )}

              {/* Requirements */}
              {selectedTab !== 'curl' && (
                <Alert>
                  <CheckCircle className="h-4 w-4" />
                  <AlertDescription>
                    {selectedTab === 'javascript' && 'Requires Node.js 16.0+ or modern browsers with ES6 support'}
                    {selectedTab === 'python' && 'Requires Python 3.7+ with async support for streaming features'}
                    {selectedTab === 'go' && 'Requires Go 1.18+ with module support enabled'}
                  </AlertDescription>
                </Alert>
              )}

              {/* Code Example */}
              <div>
                <div className="flex items-center justify-between mb-2">
                  <Label className="text-sm font-medium">Example Code</Label>
                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={() => copyToClipboard(getCodeExample(selectedTab))}
                  >
                    <Copy className="h-4 w-4 mr-2" />
                    Copy All
                  </Button>
                </div>
                <div className="bg-slate-950 rounded-lg overflow-hidden">
                  <pre className="p-4 overflow-x-auto">
                    <code className="text-sm text-slate-100">{getCodeExample(selectedTab)}</code>
                  </pre>
                </div>
              </div>

              {/* Additional Resources */}
              <div className="flex gap-2 pt-4">
                <Button variant="outline" size="sm">
                  <Package className="h-4 w-4 mr-2" />
                  {selectedTab === 'javascript' && 'View on NPM'}
                  {selectedTab === 'python' && 'View on PyPI'}
                  {selectedTab === 'go' && 'View on pkg.go.dev'}
                  {selectedTab === 'curl' && 'OpenAPI Spec'}
                </Button>
                <Button variant="outline" size="sm">
                  <GitBranch className="h-4 w-4 mr-2" />
                  View on GitHub
                </Button>
                <Button variant="outline" size="sm">
                  <Code2 className="h-4 w-4 mr-2" />
                  More Examples
                </Button>
              </div>
            </TabsContent>
          </Tabs>
        </CardContent>
      </Card>

      {/* Rate Limits & Best Practices */}
      <Card>
        <CardHeader>
          <CardTitle>Rate Limits & Best Practices</CardTitle>
          <CardDescription>
            Guidelines for optimal API usage and performance
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div className="space-y-2">
              <h4 className="font-medium">Rate Limits</h4>
              <ul className="text-sm space-y-1 text-muted-foreground">
                <li>• Default: 1,000 requests/hour</li>
                <li>• Burst: 100 requests/minute</li>
                <li>• Concurrent: 10 parallel requests</li>
                <li>• File upload: 100MB max size</li>
              </ul>
            </div>
            <div className="space-y-2">
              <h4 className="font-medium">Best Practices</h4>
              <ul className="text-sm space-y-1 text-muted-foreground">
                <li>• Use webhook callbacks for long operations</li>
                <li>• Implement exponential backoff on errors</li>
                <li>• Cache responses when appropriate</li>
                <li>• Use batch endpoints for multiple items</li>
              </ul>
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}

// Add missing Label import
const Label = ({ children, className }: { children: React.ReactNode; className?: string }) => (
  <label className={className}>{children}</label>
);