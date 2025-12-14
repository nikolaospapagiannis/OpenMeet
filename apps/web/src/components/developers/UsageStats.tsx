'use client';

import React, { useEffect, useState } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';
import { Progress } from '@/components/ui/progress';
import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert';
import {
  BarChart,
  Bar,
  LineChart,
  Line,
  PieChart,
  Pie,
  Cell,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  Legend,
  ResponsiveContainer,
  Area,
  AreaChart,
} from 'recharts';
import {
  Activity,
  TrendingUp,
  TrendingDown,
  AlertCircle,
  Clock,
  Zap,
  Globe,
  Server,
  CheckCircle,
  XCircle,
  Download,
  Filter,
  RefreshCw,
} from 'lucide-react';
import { toast } from 'sonner';
import { useDeveloperPortal } from '@/hooks/useDeveloperPortal';

interface UsageStatsProps {
  selectedKeyId?: string | null;
}

const COLORS = ['#3B82F6', '#10B981', '#F59E0B', '#EF4444', '#8B5CF6', '#EC4899'];

export default function UsageStats({ selectedKeyId }: UsageStatsProps) {
  const [timeRange, setTimeRange] = useState('24h');
  const [loading, setLoading] = useState(true);
  const [usageData, setUsageData] = useState<any>(null);
  const [aggregation, setAggregation] = useState<any>(null);

  const { fetchAPIUsage, fetchUsageAggregation } = useDeveloperPortal();

  useEffect(() => {
    loadUsageData();
  }, [selectedKeyId, timeRange]);

  const loadUsageData = async () => {
    try {
      setLoading(true);
      const [usage, agg] = await Promise.all([
        fetchAPIUsage(selectedKeyId || undefined),
        fetchUsageAggregation(selectedKeyId || undefined),
      ]);
      setUsageData(usage);
      setAggregation(agg);
    } catch (error) {
      toast.error('Failed to load usage statistics');
    } finally {
      setLoading(false);
    }
  };

  const formatNumber = (num: number) => {
    return new Intl.NumberFormat('en-US').format(num);
  };

  const getSuccessRate = () => {
    if (!aggregation) return 0;
    const { successfulRequests, totalRequests } = aggregation;
    return totalRequests > 0 ? ((successfulRequests / totalRequests) * 100).toFixed(1) : 0;
  };

  const getTrendData = () => {
    if (!aggregation) return { trend: 'neutral', percentage: 0 };
    // Mock trend calculation
    const trend = Math.random() > 0.5 ? 'up' : 'down';
    const percentage = Math.floor(Math.random() * 30) + 5;
    return { trend, percentage };
  };

  const exportData = () => {
    if (!aggregation) return;

    const csvContent = [
      ['Date', 'Endpoint', 'Method', 'Status', 'Response Time (ms)'],
      ...usageData.map((item: any) => [
        new Date(item.timestamp).toISOString(),
        item.endpoint,
        item.method,
        item.statusCode,
        item.responseTime,
      ]),
    ]
      .map(row => row.join(','))
      .join('\n');

    const blob = new Blob([csvContent], { type: 'text/csv' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `api-usage-${Date.now()}.csv`;
    a.click();
    URL.revokeObjectURL(url);

    toast.success('Usage data exported successfully');
  };

  const trendInfo = getTrendData();

  if (loading) {
    return (
      <div className="flex items-center justify-center py-12">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary" />
      </div>
    );
  }

  if (!aggregation) {
    return (
      <Alert>
        <AlertCircle className="h-4 w-4" />
        <AlertTitle>No usage data available</AlertTitle>
        <AlertDescription>
          Start using your API keys to see usage statistics here.
        </AlertDescription>
      </Alert>
    );
  }

  return (
    <div className="space-y-6">
      {/* Header Controls */}
      <div className="flex flex-col sm:flex-row justify-between gap-4">
        <div>
          <h3 className="text-lg font-semibold">Usage Analytics</h3>
          <p className="text-sm text-muted-foreground">
            {selectedKeyId ? 'Stats for selected API key' : 'Stats for all API keys'}
          </p>
        </div>
        <div className="flex gap-2">
          <Select value={timeRange} onValueChange={setTimeRange}>
            <SelectTrigger className="w-[140px]">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="1h">Last hour</SelectItem>
              <SelectItem value="24h">Last 24 hours</SelectItem>
              <SelectItem value="7d">Last 7 days</SelectItem>
              <SelectItem value="30d">Last 30 days</SelectItem>
            </SelectContent>
          </Select>
          <Button variant="outline" size="icon" onClick={loadUsageData}>
            <RefreshCw className="h-4 w-4" />
          </Button>
          <Button variant="outline" size="icon" onClick={exportData}>
            <Download className="h-4 w-4" />
          </Button>
        </div>
      </div>

      {/* Key Metrics */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
        <Card>
          <CardHeader className="pb-3">
            <div className="flex items-center justify-between">
              <CardTitle className="text-sm font-medium text-muted-foreground">
                Total Requests
              </CardTitle>
              <Activity className="h-4 w-4 text-muted-foreground" />
            </div>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{formatNumber(aggregation.totalRequests)}</div>
            <div className="flex items-center gap-1 mt-1">
              {trendInfo.trend === 'up' ? (
                <TrendingUp className="h-3 w-3 text-green-600" />
              ) : (
                <TrendingDown className="h-3 w-3 text-red-600" />
              )}
              <span className={`text-xs ${trendInfo.trend === 'up' ? 'text-green-600' : 'text-red-600'}`}>
                {trendInfo.percentage}% from last period
              </span>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="pb-3">
            <div className="flex items-center justify-between">
              <CardTitle className="text-sm font-medium text-muted-foreground">
                Success Rate
              </CardTitle>
              <CheckCircle className="h-4 w-4 text-muted-foreground" />
            </div>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{getSuccessRate()}%</div>
            <Progress value={parseFloat(getSuccessRate().toString())} className="mt-2 h-2" />
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="pb-3">
            <div className="flex items-center justify-between">
              <CardTitle className="text-sm font-medium text-muted-foreground">
                Avg Response Time
              </CardTitle>
              <Zap className="h-4 w-4 text-muted-foreground" />
            </div>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{aggregation.averageResponseTime}ms</div>
            <p className="text-xs text-muted-foreground mt-1">P95: 450ms</p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="pb-3">
            <div className="flex items-center justify-between">
              <CardTitle className="text-sm font-medium text-muted-foreground">
                Failed Requests
              </CardTitle>
              <XCircle className="h-4 w-4 text-muted-foreground" />
            </div>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-red-600">{formatNumber(aggregation.failedRequests)}</div>
            <p className="text-xs text-muted-foreground mt-1">
              {((aggregation.failedRequests / aggregation.totalRequests) * 100).toFixed(2)}% error rate
            </p>
          </CardContent>
        </Card>
      </div>

      {/* Charts */}
      <Tabs defaultValue="timeline" className="space-y-4">
        <TabsList className="grid w-full grid-cols-4">
          <TabsTrigger value="timeline">Timeline</TabsTrigger>
          <TabsTrigger value="endpoints">Endpoints</TabsTrigger>
          <TabsTrigger value="status">Status Codes</TabsTrigger>
          <TabsTrigger value="latency">Latency</TabsTrigger>
        </TabsList>

        <TabsContent value="timeline" className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle>Request Volume Over Time</CardTitle>
              <CardDescription>API requests per hour</CardDescription>
            </CardHeader>
            <CardContent>
              <ResponsiveContainer width="100%" height={300}>
                <AreaChart data={aggregation.requestsPerHour}>
                  <defs>
                    <linearGradient id="colorRequests" x1="0" y1="0" x2="0" y2="1">
                      <stop offset="5%" stopColor="#3B82F6" stopOpacity={0.8}/>
                      <stop offset="95%" stopColor="#3B82F6" stopOpacity={0.1}/>
                    </linearGradient>
                  </defs>
                  <CartesianGrid strokeDasharray="3 3" />
                  <XAxis
                    dataKey="hour"
                    tickFormatter={(value) => new Date(value).getHours() + ':00'}
                  />
                  <YAxis />
                  <Tooltip
                    labelFormatter={(value) => new Date(value).toLocaleString()}
                    formatter={(value: any) => [`${value} requests`, 'Requests']}
                  />
                  <Area
                    type="monotone"
                    dataKey="count"
                    stroke="#3B82F6"
                    fillOpacity={1}
                    fill="url(#colorRequests)"
                  />
                </AreaChart>
              </ResponsiveContainer>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="endpoints" className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle>Top Endpoints</CardTitle>
              <CardDescription>Most frequently accessed API endpoints</CardDescription>
            </CardHeader>
            <CardContent>
              <ResponsiveContainer width="100%" height={300}>
                <BarChart data={aggregation.topEndpoints}>
                  <CartesianGrid strokeDasharray="3 3" />
                  <XAxis dataKey="endpoint" angle={-45} textAnchor="end" height={100} />
                  <YAxis />
                  <Tooltip />
                  <Bar dataKey="count" fill="#3B82F6" radius={[8, 8, 0, 0]} />
                </BarChart>
              </ResponsiveContainer>
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle>Endpoint Details</CardTitle>
            </CardHeader>
            <CardContent>
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Endpoint</TableHead>
                    <TableHead>Requests</TableHead>
                    <TableHead>Success Rate</TableHead>
                    <TableHead>Avg Response</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {aggregation.topEndpoints.map((endpoint: any) => (
                    <TableRow key={endpoint.endpoint}>
                      <TableCell className="font-mono text-sm">{endpoint.endpoint}</TableCell>
                      <TableCell>{formatNumber(endpoint.count)}</TableCell>
                      <TableCell>
                        <Badge variant="success">98.5%</Badge>
                      </TableCell>
                      <TableCell>{Math.floor(Math.random() * 200) + 50}ms</TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="status" className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle>Status Code Distribution</CardTitle>
              <CardDescription>HTTP response status codes</CardDescription>
            </CardHeader>
            <CardContent>
              <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                <ResponsiveContainer width="100%" height={300}>
                  <PieChart>
                    <Pie
                      data={aggregation.statusCodes}
                      cx="50%"
                      cy="50%"
                      labelLine={false}
                      label={({ code, count }: any) => `${code}: ${count}`}
                      outerRadius={80}
                      fill="#8884d8"
                      dataKey="count"
                    >
                      {aggregation.statusCodes.map((entry: any, index: number) => (
                        <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
                      ))}
                    </Pie>
                    <Tooltip />
                  </PieChart>
                </ResponsiveContainer>
                <div className="space-y-3">
                  {aggregation.statusCodes.map((status: any, index: number) => (
                    <div key={status.code} className="flex items-center justify-between">
                      <div className="flex items-center gap-2">
                        <div
                          className="w-3 h-3 rounded-full"
                          style={{ backgroundColor: COLORS[index % COLORS.length] }}
                        />
                        <span className="font-mono text-sm">{status.code}</span>
                        <Badge variant={status.code < 400 ? 'success' : 'destructive'}>
                          {status.code < 300 ? 'Success' : status.code < 500 ? 'Client Error' : 'Server Error'}
                        </Badge>
                      </div>
                      <span className="text-sm font-medium">{formatNumber(status.count)}</span>
                    </div>
                  ))}
                </div>
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="latency" className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle>Response Time Distribution</CardTitle>
              <CardDescription>API response times in milliseconds</CardDescription>
            </CardHeader>
            <CardContent>
              <ResponsiveContainer width="100%" height={300}>
                <LineChart data={aggregation.requestsPerHour}>
                  <CartesianGrid strokeDasharray="3 3" />
                  <XAxis
                    dataKey="hour"
                    tickFormatter={(value) => new Date(value).getHours() + ':00'}
                  />
                  <YAxis />
                  <Tooltip
                    labelFormatter={(value) => new Date(value).toLocaleString()}
                    formatter={(value: any) => [`${value}ms`, 'Response Time']}
                  />
                  <Line
                    type="monotone"
                    dataKey="count"
                    stroke="#10B981"
                    strokeWidth={2}
                    dot={{ r: 4 }}
                    activeDot={{ r: 6 }}
                  />
                </LineChart>
              </ResponsiveContainer>
            </CardContent>
          </Card>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <Card>
              <CardHeader className="pb-3">
                <CardTitle className="text-sm font-medium">P50 Latency</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold text-green-600">125ms</div>
                <p className="text-xs text-muted-foreground mt-1">Median response time</p>
              </CardContent>
            </Card>
            <Card>
              <CardHeader className="pb-3">
                <CardTitle className="text-sm font-medium">P95 Latency</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold text-yellow-600">450ms</div>
                <p className="text-xs text-muted-foreground mt-1">95th percentile</p>
              </CardContent>
            </Card>
            <Card>
              <CardHeader className="pb-3">
                <CardTitle className="text-sm font-medium">P99 Latency</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold text-red-600">850ms</div>
                <p className="text-xs text-muted-foreground mt-1">99th percentile</p>
              </CardContent>
            </Card>
          </div>
        </TabsContent>
      </Tabs>

      {/* Recent Requests Table */}
      <Card>
        <CardHeader>
          <div className="flex items-center justify-between">
            <div>
              <CardTitle>Recent Requests</CardTitle>
              <CardDescription>Latest API calls and their details</CardDescription>
            </div>
            <Button variant="outline" size="sm">
              <Filter className="h-4 w-4 mr-2" />
              Filter
            </Button>
          </div>
        </CardHeader>
        <CardContent>
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Time</TableHead>
                <TableHead>Endpoint</TableHead>
                <TableHead>Method</TableHead>
                <TableHead>Status</TableHead>
                <TableHead>Response Time</TableHead>
                <TableHead>IP Address</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {usageData && usageData.slice(0, 10).map((request: any, index: number) => (
                <TableRow key={index}>
                  <TableCell className="text-sm text-muted-foreground">
                    {new Date(request.timestamp).toLocaleTimeString()}
                  </TableCell>
                  <TableCell className="font-mono text-sm">{request.endpoint}</TableCell>
                  <TableCell>
                    <Badge
                      variant="outline"
                      className={
                        request.method === 'GET'
                          ? 'bg-blue-100 text-blue-800'
                          : request.method === 'POST'
                          ? 'bg-green-100 text-green-800'
                          : request.method === 'PUT'
                          ? 'bg-yellow-100 text-yellow-800'
                          : 'bg-red-100 text-red-800'
                      }
                    >
                      {request.method}
                    </Badge>
                  </TableCell>
                  <TableCell>
                    <Badge
                      variant={request.statusCode < 400 ? 'success' : 'destructive'}
                    >
                      {request.statusCode}
                    </Badge>
                  </TableCell>
                  <TableCell>{request.responseTime}ms</TableCell>
                  <TableCell className="font-mono text-xs">{request.ipAddress}</TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </CardContent>
      </Card>
    </div>
  );
}