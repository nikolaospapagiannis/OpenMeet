/**
 * Rate Limit Dashboard Component
 *
 * Displays comprehensive rate limiting metrics:
 * - Current usage and limits
 * - Top consumers
 * - Blocked IPs
 * - Alerts and violations
 * - Real-time charts
 */

'use client';

import React, { useState, useEffect } from 'react';
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';
import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert';
import { Progress } from '@/components/ui/progress';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import {
  AlertTriangle,
  Shield,
  TrendingUp,
  Users,
  Activity,
  Ban,
  CheckCircle,
  XCircle,
} from 'lucide-react';

interface RateLimitMetrics {
  totalRequests: number;
  rateLimitHits: number;
  blockedRequests: number;
  topConsumers: Array<{ identifier: string; count: number }>;
  topEndpoints: Array<{ endpoint: string; hits: number }>;
  blockedIPs: Array<{ ip: string; reason: string; blockedAt: string }>;
}

interface RateLimitStatus {
  limit: number;
  remaining: number;
  resetAt: string;
  tier: string;
}

interface Alert {
  id: string;
  type: string;
  severity: 'info' | 'warning' | 'critical';
  message: string;
  timestamp: string;
}

export function RateLimitDashboard() {
  const [metrics, setMetrics] = useState<RateLimitMetrics | null>(null);
  const [status, setStatus] = useState<RateLimitStatus | null>(null);
  const [alerts, setAlerts] = useState<Alert[]>([]);
  const [loading, setLoading] = useState(true);
  const [autoRefresh, setAutoRefresh] = useState(true);

  useEffect(() => {
    fetchData();

    const interval = autoRefresh
      ? setInterval(fetchData, 5000) // Refresh every 5 seconds
      : null;

    return () => {
      if (interval) clearInterval(interval);
    };
  }, [autoRefresh]);

  const fetchData = async () => {
    try {
      const [metricsRes, statusRes, alertsRes] = await Promise.all([
        fetch('/api/rate-limits/metrics'),
        fetch('/api/rate-limits/status'),
        fetch('/api/rate-limits/alerts'),
      ]);

      if (metricsRes.ok) {
        setMetrics(await metricsRes.json());
      }

      if (statusRes.ok) {
        setStatus(await statusRes.json());
      }

      if (alertsRes.ok) {
        setAlerts(await alertsRes.json());
      }
    } catch (error) {
      console.error('Failed to fetch rate limit data:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleUnblockIP = async (ip: string) => {
    try {
      await fetch(`/api/rate-limits/unblock/${ip}`, { method: 'POST' });
      fetchData();
    } catch (error) {
      console.error('Failed to unblock IP:', error);
    }
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center h-96">
        <div className="text-center">
          <Activity className="h-8 w-8 animate-spin mx-auto mb-4" />
          <p className="text-muted-foreground">Loading rate limit data...</p>
        </div>
      </div>
    );
  }

  const usagePercentage = status
    ? ((status.limit - status.remaining) / status.limit) * 100
    : 0;

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-3xl font-bold tracking-tight">Rate Limits</h2>
          <p className="text-muted-foreground">
            Monitor API usage, rate limits, and security events
          </p>
        </div>
        <div className="flex items-center gap-2">
          <Button
            variant={autoRefresh ? 'default' : 'outline'}
            onClick={() => setAutoRefresh(!autoRefresh)}
          >
            <Activity className="h-4 w-4 mr-2" />
            {autoRefresh ? 'Auto-refresh ON' : 'Auto-refresh OFF'}
          </Button>
          <Button variant="outline" onClick={fetchData}>
            Refresh Now
          </Button>
        </div>
      </div>

      {/* Current Status */}
      {status && (
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Shield className="h-5 w-5" />
              Current Rate Limit Status
            </CardTitle>
            <CardDescription>
              Your current API usage for the {status.tier} tier
            </CardDescription>
          </CardHeader>
          <CardContent>
            <div className="space-y-4">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm text-muted-foreground">Usage</p>
                  <p className="text-2xl font-bold">
                    {status.limit - status.remaining} / {status.limit}
                  </p>
                </div>
                <Badge variant={usagePercentage > 80 ? 'destructive' : 'default'}>
                  {status.tier.toUpperCase()}
                </Badge>
              </div>

              <Progress value={usagePercentage} className="h-2" />

              <div className="grid grid-cols-2 gap-4 text-sm">
                <div>
                  <p className="text-muted-foreground">Remaining</p>
                  <p className="font-semibold">{status.remaining} requests</p>
                </div>
                <div>
                  <p className="text-muted-foreground">Resets at</p>
                  <p className="font-semibold">
                    {new Date(status.resetAt).toLocaleTimeString()}
                  </p>
                </div>
              </div>
            </div>
          </CardContent>
        </Card>
      )}

      {/* Alerts */}
      {alerts.length > 0 && (
        <div className="space-y-2">
          {alerts.slice(0, 3).map((alert) => (
            <Alert
              key={alert.id}
              variant={alert.severity === 'critical' ? 'destructive' : 'default'}
            >
              <AlertTriangle className="h-4 w-4" />
              <AlertTitle className="capitalize">{alert.severity}</AlertTitle>
              <AlertDescription>{alert.message}</AlertDescription>
            </Alert>
          ))}
        </div>
      )}

      {/* Metrics Overview */}
      {metrics && (
        <div className="grid gap-4 md:grid-cols-3">
          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">Total Requests</CardTitle>
              <TrendingUp className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">{metrics.totalRequests}</div>
              <p className="text-xs text-muted-foreground">Last hour</p>
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">Rate Limit Hits</CardTitle>
              <AlertTriangle className="h-4 w-4 text-yellow-600" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">{metrics.rateLimitHits}</div>
              <p className="text-xs text-muted-foreground">
                {((metrics.rateLimitHits / metrics.totalRequests) * 100).toFixed(1)}% of
                total
              </p>
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">Blocked Requests</CardTitle>
              <Ban className="h-4 w-4 text-red-600" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">{metrics.blockedRequests}</div>
              <p className="text-xs text-muted-foreground">Suspicious activity</p>
            </CardContent>
          </Card>
        </div>
      )}

      {/* Detailed Tables */}
      {metrics && (
        <Tabs defaultValue="consumers" className="space-y-4">
          <TabsList>
            <TabsTrigger value="consumers">Top Consumers</TabsTrigger>
            <TabsTrigger value="endpoints">Top Endpoints</TabsTrigger>
            <TabsTrigger value="blocked">Blocked IPs</TabsTrigger>
          </TabsList>

          <TabsContent value="consumers" className="space-y-4">
            <Card>
              <CardHeader>
                <CardTitle>Top API Consumers</CardTitle>
                <CardDescription>
                  Users and IPs with highest request volume
                </CardDescription>
              </CardHeader>
              <CardContent>
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Identifier</TableHead>
                      <TableHead className="text-right">Requests</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {metrics.topConsumers.map((consumer) => (
                      <TableRow key={consumer.identifier}>
                        <TableCell className="font-mono text-sm">
                          {consumer.identifier}
                        </TableCell>
                        <TableCell className="text-right font-semibold">
                          {consumer.count}
                        </TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              </CardContent>
            </Card>
          </TabsContent>

          <TabsContent value="endpoints" className="space-y-4">
            <Card>
              <CardHeader>
                <CardTitle>Top Endpoints</CardTitle>
                <CardDescription>
                  Endpoints with most rate limit hits
                </CardDescription>
              </CardHeader>
              <CardContent>
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Endpoint</TableHead>
                      <TableHead className="text-right">Hits</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {metrics.topEndpoints.map((endpoint) => (
                      <TableRow key={endpoint.endpoint}>
                        <TableCell className="font-mono text-sm">
                          {endpoint.endpoint}
                        </TableCell>
                        <TableCell className="text-right font-semibold">
                          {endpoint.hits}
                        </TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              </CardContent>
            </Card>
          </TabsContent>

          <TabsContent value="blocked" className="space-y-4">
            <Card>
              <CardHeader>
                <CardTitle>Blocked IP Addresses</CardTitle>
                <CardDescription>
                  IPs currently blocked due to violations
                </CardDescription>
              </CardHeader>
              <CardContent>
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>IP Address</TableHead>
                      <TableHead>Reason</TableHead>
                      <TableHead>Blocked At</TableHead>
                      <TableHead className="text-right">Actions</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {metrics.blockedIPs.map((block) => (
                      <TableRow key={block.ip}>
                        <TableCell className="font-mono text-sm">{block.ip}</TableCell>
                        <TableCell>
                          <Badge variant="destructive">{block.reason}</Badge>
                        </TableCell>
                        <TableCell>
                          {new Date(block.blockedAt).toLocaleString()}
                        </TableCell>
                        <TableCell className="text-right">
                          <Button
                            size="sm"
                            variant="outline"
                            onClick={() => handleUnblockIP(block.ip)}
                          >
                            Unblock
                          </Button>
                        </TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              </CardContent>
            </Card>
          </TabsContent>
        </Tabs>
      )}
    </div>
  );
}
