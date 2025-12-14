'use client';

import React, { useState, useEffect } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Badge } from '@/components/ui/badge';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { Separator } from '@/components/ui/separator';
import {
  Play,
  Copy,
  Send,
  FileJson,
  Code,
  Clock,
  CheckCircle,
  XCircle,
  AlertCircle,
  Loader2,
} from 'lucide-react';
import { toast } from 'sonner';
import { useDeveloperPortal } from '@/hooks/useDeveloperPortal';

interface APIPlaygroundProps {
  selectedKeyId?: string | null;
}

interface RequestHistory {
  id: string;
  endpoint: string;
  method: string;
  timestamp: string;
  status: number;
  responseTime: number;
  success: boolean;
}

const API_ENDPOINTS = [
  {
    category: 'Transcription',
    endpoints: [
      { path: '/api/transcribe', method: 'POST', description: 'Transcribe audio/video files' },
      { path: '/api/transcribe/{id}', method: 'GET', description: 'Get transcription status' },
    ],
  },
  {
    category: 'Analysis',
    endpoints: [
      { path: '/api/analyze', method: 'POST', description: 'Analyze conversation' },
      { path: '/api/insights', method: 'POST', description: 'Generate insights' },
      { path: '/api/sentiment', method: 'POST', description: 'Sentiment analysis' },
    ],
  },
  {
    category: 'Meetings',
    endpoints: [
      { path: '/api/meetings', method: 'GET', description: 'List all meetings' },
      { path: '/api/meetings/{id}', method: 'GET', description: 'Get meeting details' },
      { path: '/api/meetings', method: 'POST', description: 'Create new meeting' },
      { path: '/api/meetings/{id}', method: 'PUT', description: 'Update meeting' },
      { path: '/api/meetings/{id}', method: 'DELETE', description: 'Delete meeting' },
    ],
  },
];

const SAMPLE_PAYLOADS = {
  transcribe: JSON.stringify(
    {
      audio_url: 'https://example.com/audio.mp3',
      language: 'en',
      format: 'mp3',
      diarization: true,
    },
    null,
    2
  ),
  analyze: JSON.stringify(
    {
      transcript_id: 'trans_123456',
      analysis_types: ['summary', 'action_items', 'key_topics'],
    },
    null,
    2
  ),
  meeting: JSON.stringify(
    {
      title: 'Weekly Team Sync',
      participants: ['john@example.com', 'jane@example.com'],
      scheduled_at: '2024-12-10T10:00:00Z',
      duration: 60,
    },
    null,
    2
  ),
};

export default function APIPlayground({ selectedKeyId }: APIPlaygroundProps) {
  const [selectedEndpoint, setSelectedEndpoint] = useState('/api/meetings');
  const [method, setMethod] = useState('GET');
  const [apiKey, setApiKey] = useState('');
  const [requestBody, setRequestBody] = useState('');
  const [headers, setHeaders] = useState('{\n  "Content-Type": "application/json"\n}');
  const [queryParams, setQueryParams] = useState('');
  const [response, setResponse] = useState<any>(null);
  const [loading, setLoading] = useState(false);
  const [responseTime, setResponseTime] = useState<number | null>(null);
  const [requestHistory, setRequestHistory] = useState<RequestHistory[]>([]);

  const { testAPIKey } = useDeveloperPortal();

  useEffect(() => {
    // Load API key from localStorage or use selected key
    if (selectedKeyId) {
      const storedKey = localStorage.getItem(`api_key_${selectedKeyId}`);
      if (storedKey) {
        setApiKey(storedKey);
      }
    }
  }, [selectedKeyId]);

  const handleEndpointChange = (path: string) => {
    setSelectedEndpoint(path);
    // Auto-select method based on endpoint
    const endpoint = API_ENDPOINTS.flatMap(c => c.endpoints).find(e => e.path === path);
    if (endpoint) {
      setMethod(endpoint.method);
      // Set sample payload for POST/PUT requests
      if (['POST', 'PUT'].includes(endpoint.method)) {
        if (path.includes('transcribe')) {
          setRequestBody(SAMPLE_PAYLOADS.transcribe);
        } else if (path.includes('analyze') || path.includes('insights')) {
          setRequestBody(SAMPLE_PAYLOADS.analyze);
        } else if (path.includes('meeting')) {
          setRequestBody(SAMPLE_PAYLOADS.meeting);
        }
      } else {
        setRequestBody('');
      }
    }
  };

  const handleSendRequest = async () => {
    if (!apiKey) {
      toast.error('Please enter an API key');
      return;
    }

    setLoading(true);
    const startTime = Date.now();

    try {
      // Build full URL with query params
      let fullEndpoint = selectedEndpoint;
      if (queryParams) {
        fullEndpoint += `?${queryParams}`;
      }

      // Parse request body if provided
      let parsedBody = null;
      if (requestBody && ['POST', 'PUT', 'PATCH'].includes(method)) {
        try {
          parsedBody = JSON.parse(requestBody);
        } catch (e) {
          toast.error('Invalid JSON in request body');
          setLoading(false);
          return;
        }
      }

      // Send the request
      const result = await testAPIKey(apiKey, fullEndpoint, method, parsedBody);
      const endTime = Date.now();
      const duration = endTime - startTime;

      setResponse(result);
      setResponseTime(duration);

      // Add to history
      const historyItem: RequestHistory = {
        id: Math.random().toString(36).substr(2, 9),
        endpoint: fullEndpoint,
        method,
        timestamp: new Date().toISOString(),
        status: result.status || 200,
        responseTime: duration,
        success: result.status >= 200 && result.status < 300,
      };
      setRequestHistory(prev => [historyItem, ...prev.slice(0, 9)]);

      toast.success('Request sent successfully');
    } catch (error) {
      const endTime = Date.now();
      const duration = endTime - startTime;

      setResponse({
        error: true,
        message: error instanceof Error ? error.message : 'Request failed',
        status: 500,
      });
      setResponseTime(duration);

      // Add to history
      const historyItem: RequestHistory = {
        id: Math.random().toString(36).substr(2, 9),
        endpoint: selectedEndpoint,
        method,
        timestamp: new Date().toISOString(),
        status: 500,
        responseTime: duration,
        success: false,
      };
      setRequestHistory(prev => [historyItem, ...prev.slice(0, 9)]);

      toast.error('Request failed');
    } finally {
      setLoading(false);
    }
  };

  const copyToClipboard = (text: string) => {
    navigator.clipboard.writeText(text);
    toast.success('Copied to clipboard');
  };

  const generateCurlCommand = () => {
    let curl = `curl -X ${method} \\
  '${selectedEndpoint}' \\
  -H 'Authorization: Bearer ${apiKey}' \\
  -H 'Content-Type: application/json'`;

    if (requestBody && ['POST', 'PUT', 'PATCH'].includes(method)) {
      curl += ` \\
  -d '${requestBody.replace(/\n/g, '')}'`;
    }

    return curl;
  };

  const generateJavaScriptCode = () => {
    let code = `const response = await fetch('${selectedEndpoint}', {
  method: '${method}',
  headers: {
    'Authorization': 'Bearer ${apiKey}',
    'Content-Type': 'application/json'
  }`;

    if (requestBody && ['POST', 'PUT', 'PATCH'].includes(method)) {
      code += `,
  body: JSON.stringify(${requestBody})`;
    }

    code += `
});

const data = await response.json();
console.log(data);`;

    return code;
  };

  return (
    <div className="space-y-6">
      {/* Endpoint Selection */}
      <Card>
        <CardHeader>
          <CardTitle>API Endpoint</CardTitle>
          <CardDescription>Select an endpoint to test</CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <Label htmlFor="endpoint">Endpoint</Label>
              <Select value={selectedEndpoint} onValueChange={handleEndpointChange}>
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {API_ENDPOINTS.map((category) => (
                    <div key={category.category}>
                      <div className="px-2 py-1.5 text-sm font-semibold text-muted-foreground">
                        {category.category}
                      </div>
                      {category.endpoints.map((endpoint) => (
                        <SelectItem key={endpoint.path} value={endpoint.path}>
                          <div className="flex items-center gap-2">
                            <Badge
                              variant="outline"
                              className={
                                endpoint.method === 'GET'
                                  ? 'bg-blue-100 text-blue-800'
                                  : endpoint.method === 'POST'
                                  ? 'bg-green-100 text-green-800'
                                  : endpoint.method === 'PUT'
                                  ? 'bg-yellow-100 text-yellow-800'
                                  : 'bg-red-100 text-red-800'
                              }
                            >
                              {endpoint.method}
                            </Badge>
                            <span>{endpoint.path}</span>
                          </div>
                        </SelectItem>
                      ))}
                    </div>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div>
              <Label htmlFor="apiKey">API Key</Label>
              <Input
                id="apiKey"
                type="password"
                value={apiKey}
                onChange={(e) => setApiKey(e.target.value)}
                placeholder="sk_live_..."
              />
            </div>
          </div>

          {/* Query Parameters */}
          <div>
            <Label htmlFor="queryParams">Query Parameters (optional)</Label>
            <Input
              id="queryParams"
              value={queryParams}
              onChange={(e) => setQueryParams(e.target.value)}
              placeholder="key1=value1&key2=value2"
            />
          </div>
        </CardContent>
      </Card>

      {/* Request Configuration */}
      <Tabs defaultValue="body" className="w-full">
        <TabsList className="grid w-full grid-cols-3">
          <TabsTrigger value="body">Body</TabsTrigger>
          <TabsTrigger value="headers">Headers</TabsTrigger>
          <TabsTrigger value="code">Code Examples</TabsTrigger>
        </TabsList>

        <TabsContent value="body" className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle>Request Body</CardTitle>
              <CardDescription>
                {['POST', 'PUT', 'PATCH'].includes(method)
                  ? 'Enter JSON payload for the request'
                  : 'No body required for this method'}
              </CardDescription>
            </CardHeader>
            <CardContent>
              {['POST', 'PUT', 'PATCH'].includes(method) ? (
                <Textarea
                  value={requestBody}
                  onChange={(e) => setRequestBody(e.target.value)}
                  placeholder="Enter JSON payload..."
                  className="min-h-[200px] font-mono text-sm"
                />
              ) : (
                <Alert>
                  <AlertCircle className="h-4 w-4" />
                  <AlertDescription>
                    {method} requests do not require a request body.
                  </AlertDescription>
                </Alert>
              )}
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="headers" className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle>Request Headers</CardTitle>
              <CardDescription>Additional headers for the request</CardDescription>
            </CardHeader>
            <CardContent>
              <Textarea
                value={headers}
                onChange={(e) => setHeaders(e.target.value)}
                placeholder="Enter headers as JSON..."
                className="min-h-[150px] font-mono text-sm"
              />
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="code" className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle>Code Examples</CardTitle>
              <CardDescription>Copy and paste these examples in your application</CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              {/* cURL */}
              <div>
                <div className="flex items-center justify-between mb-2">
                  <Label>cURL</Label>
                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={() => copyToClipboard(generateCurlCommand())}
                  >
                    <Copy className="h-4 w-4" />
                  </Button>
                </div>
                <pre className="bg-muted p-4 rounded-lg overflow-x-auto">
                  <code className="text-sm">{generateCurlCommand()}</code>
                </pre>
              </div>

              {/* JavaScript */}
              <div>
                <div className="flex items-center justify-between mb-2">
                  <Label>JavaScript (Fetch API)</Label>
                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={() => copyToClipboard(generateJavaScriptCode())}
                  >
                    <Copy className="h-4 w-4" />
                  </Button>
                </div>
                <pre className="bg-muted p-4 rounded-lg overflow-x-auto">
                  <code className="text-sm">{generateJavaScriptCode()}</code>
                </pre>
              </div>
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>

      {/* Send Button */}
      <div className="flex justify-end">
        <Button onClick={handleSendRequest} disabled={loading} size="lg">
          {loading ? (
            <>
              <Loader2 className="h-4 w-4 mr-2 animate-spin" />
              Sending...
            </>
          ) : (
            <>
              <Send className="h-4 w-4 mr-2" />
              Send Request
            </>
          )}
        </Button>
      </div>

      {/* Response */}
      {response && (
        <Card>
          <CardHeader>
            <div className="flex items-center justify-between">
              <CardTitle>Response</CardTitle>
              <div className="flex items-center gap-4">
                {responseTime && (
                  <div className="flex items-center gap-2 text-sm text-muted-foreground">
                    <Clock className="h-4 w-4" />
                    {responseTime}ms
                  </div>
                )}
                <Badge
                  variant={
                    response.status >= 200 && response.status < 300
                      ? 'success'
                      : response.status >= 400 && response.status < 500
                      ? 'warning'
                      : 'destructive'
                  }
                >
                  {response.status} {response.statusText}
                </Badge>
              </div>
            </div>
          </CardHeader>
          <CardContent>
            <div className="space-y-4">
              {/* Response Headers */}
              {response.headers && (
                <div>
                  <Label className="text-sm text-muted-foreground mb-2">Headers</Label>
                  <pre className="bg-muted p-4 rounded-lg overflow-x-auto text-sm">
                    <code>{JSON.stringify(response.headers, null, 2)}</code>
                  </pre>
                </div>
              )}

              {/* Response Body */}
              <div>
                <div className="flex items-center justify-between mb-2">
                  <Label className="text-sm text-muted-foreground">Body</Label>
                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={() => copyToClipboard(JSON.stringify(response.data, null, 2))}
                  >
                    <Copy className="h-4 w-4" />
                  </Button>
                </div>
                <pre className="bg-muted p-4 rounded-lg overflow-x-auto text-sm">
                  <code>
                    {response.data
                      ? JSON.stringify(response.data, null, 2)
                      : 'No response body'}
                  </code>
                </pre>
              </div>
            </div>
          </CardContent>
        </Card>
      )}

      {/* Request History */}
      {requestHistory.length > 0 && (
        <Card>
          <CardHeader>
            <CardTitle>Request History</CardTitle>
            <CardDescription>Recent API requests from this session</CardDescription>
          </CardHeader>
          <CardContent>
            <div className="space-y-2">
              {requestHistory.map((item) => (
                <div
                  key={item.id}
                  className="flex items-center justify-between p-3 rounded-lg bg-muted hover:bg-muted/80 transition-colors"
                >
                  <div className="flex items-center gap-3">
                    {item.success ? (
                      <CheckCircle className="h-4 w-4 text-green-500" />
                    ) : (
                      <XCircle className="h-4 w-4 text-red-500" />
                    )}
                    <Badge
                      variant="outline"
                      className={
                        item.method === 'GET'
                          ? 'bg-blue-100 text-blue-800'
                          : item.method === 'POST'
                          ? 'bg-green-100 text-green-800'
                          : item.method === 'PUT'
                          ? 'bg-yellow-100 text-yellow-800'
                          : 'bg-red-100 text-red-800'
                      }
                    >
                      {item.method}
                    </Badge>
                    <code className="text-sm">{item.endpoint}</code>
                  </div>
                  <div className="flex items-center gap-4 text-sm text-muted-foreground">
                    <span>{item.status}</span>
                    <span>{item.responseTime}ms</span>
                    <span>{new Date(item.timestamp).toLocaleTimeString()}</span>
                  </div>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
      )}
    </div>
  );
}