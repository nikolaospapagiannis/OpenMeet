'use client';

import { useState } from 'react';
import {
  BarChart3, TrendingUp, Activity, Clock, Users, Calendar,
  FileText, CheckCircle, XCircle, AlertCircle, Download,
  RefreshCw, ArrowUp, ArrowDown, Minus, Filter, ChevronRight
} from 'lucide-react';
import { CardGlass, CardGlassContent, CardGlassDescription, CardGlassHeader, CardGlassTitle } from '@/components/ui/card-glass';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';
import type { AIApp } from './AppMarketplace';

interface AppUsageStatsProps {
  app?: AIApp;
  appId?: string;
}

type UsageData = {
  totalRuns: number;
  successRate: number;
  averageTime: number;
  lastRun: string;
  trend: 'up' | 'down' | 'stable';
  trendPercentage: number;
};

type DailyStats = {
  date: string;
  runs: number;
  success: number;
  failed: number;
  avgTime: number;
};

type MeetingTypeStats = {
  type: string;
  runs: number;
  successRate: number;
  avgTime: number;
};

type ErrorLog = {
  id: string;
  timestamp: string;
  error: string;
  meetingId: string;
  severity: 'low' | 'medium' | 'high';
};

export default function AppUsageStats({ app, appId }: AppUsageStatsProps) {
  const [timeRange, setTimeRange] = useState('7d');
  const [selectedMetric, setSelectedMetric] = useState('runs');

  // Mock data - in real app, this would come from API
  const usageData: UsageData = {
    totalRuns: 247,
    successRate: 94.3,
    averageTime: 3.2,
    lastRun: '2 hours ago',
    trend: 'up',
    trendPercentage: 12.5
  };

  const dailyStats: DailyStats[] = [
    { date: '2024-01-19', runs: 42, success: 40, failed: 2, avgTime: 3.1 },
    { date: '2024-01-20', runs: 38, success: 36, failed: 2, avgTime: 3.3 },
    { date: '2024-01-21', runs: 45, success: 43, failed: 2, avgTime: 3.0 },
    { date: '2024-01-22', runs: 31, success: 29, failed: 2, avgTime: 3.4 },
    { date: '2024-01-23', runs: 29, success: 28, failed: 1, avgTime: 3.2 },
    { date: '2024-01-24', runs: 35, success: 33, failed: 2, avgTime: 3.1 },
    { date: '2024-01-25', runs: 27, success: 26, failed: 1, avgTime: 3.3 }
  ];

  const meetingTypeStats: MeetingTypeStats[] = [
    { type: 'Sales Calls', runs: 89, successRate: 96.2, avgTime: 3.5 },
    { type: 'Team Meetings', runs: 67, successRate: 94.8, avgTime: 2.8 },
    { type: '1-on-1s', runs: 45, successRate: 93.1, avgTime: 3.1 },
    { type: 'Client Meetings', runs: 28, successRate: 92.5, avgTime: 3.8 },
    { type: 'Stand-ups', runs: 18, successRate: 95.0, avgTime: 2.2 }
  ];

  const errorLogs: ErrorLog[] = [
    {
      id: '1',
      timestamp: '2024-01-25 14:32:15',
      error: 'Timeout exceeded while processing transcript',
      meetingId: 'MTG-2024-0125-001',
      severity: 'medium'
    },
    {
      id: '2',
      timestamp: '2024-01-24 09:15:42',
      error: 'Failed to parse meeting data: Invalid JSON',
      meetingId: 'MTG-2024-0124-003',
      severity: 'high'
    },
    {
      id: '3',
      timestamp: '2024-01-23 16:45:33',
      error: 'Rate limit exceeded for AI model',
      meetingId: 'MTG-2024-0123-007',
      severity: 'low'
    }
  ];

  const getColorClasses = (color: string) => {
    const colors: Record<string, { bg: string; text: string; icon: string; border: string }> = {
      blue: { bg: 'bg-blue-500/20', text: 'text-white', icon: 'text-blue-400', border: 'border-blue-500/30' },
      orange: { bg: 'bg-orange-500/20', text: 'text-white', icon: 'text-orange-400', border: 'border-orange-500/30' },
      purple: { bg: 'bg-purple-500/20', text: 'text-white', icon: 'text-purple-400', border: 'border-purple-500/30' },
      green: { bg: 'bg-green-500/20', text: 'text-white', icon: 'text-green-400', border: 'border-green-500/30' },
      pink: { bg: 'bg-pink-500/20', text: 'text-white', icon: 'text-pink-400', border: 'border-pink-500/30' },
      teal: { bg: 'bg-teal-500/20', text: 'text-white', icon: 'text-teal-400', border: 'border-teal-500/30' },
      indigo: { bg: 'bg-indigo-500/20', text: 'text-white', icon: 'text-indigo-400', border: 'border-indigo-500/30' },
      cyan: { bg: 'bg-cyan-500/20', text: 'text-white', icon: 'text-cyan-400', border: 'border-cyan-500/30' },
    };
    return colors[color] || colors.blue;
  };

  const getSeverityColor = (severity: string) => {
    switch (severity) {
      case 'high': return 'text-red-400 bg-red-500/20 border-red-500/30';
      case 'medium': return 'text-yellow-400 bg-yellow-500/20 border-yellow-500/30';
      case 'low': return 'text-blue-400 bg-blue-500/20 border-blue-500/30';
      default: return 'text-slate-400 bg-slate-500/20 border-slate-500/30';
    }
  };

  const getTrendIcon = (trend: 'up' | 'down' | 'stable') => {
    switch (trend) {
      case 'up': return <ArrowUp className="h-4 w-4 text-green-400" />;
      case 'down': return <ArrowDown className="h-4 w-4 text-red-400" />;
      case 'stable': return <Minus className="h-4 w-4 text-yellow-400" />;
    }
  };

  const Icon = app?.icon || BarChart3;
  const colors = getColorClasses(app?.color || 'blue');

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-3">
          {app && (
            <>
              <div className={`w-10 h-10 ${colors.bg} ${colors.border} border rounded-lg flex items-center justify-center`}>
                <Icon className={`h-5 w-5 ${colors.icon}`} />
              </div>
              <div>
                <h2 className="text-xl font-bold text-white">{app.name} Usage Stats</h2>
                <p className="text-sm text-slate-400">Performance metrics and usage analytics</p>
              </div>
            </>
          )}
          {!app && (
            <div>
              <h2 className="text-xl font-bold text-white">App Usage Statistics</h2>
              <p className="text-sm text-slate-400">Performance metrics and usage analytics</p>
            </div>
          )}
        </div>
        <div className="flex items-center gap-3">
          <Select value={timeRange} onValueChange={setTimeRange}>
            <SelectTrigger className="w-[140px] bg-slate-900/50 border-white/10 text-white">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="24h">Last 24 hours</SelectItem>
              <SelectItem value="7d">Last 7 days</SelectItem>
              <SelectItem value="30d">Last 30 days</SelectItem>
              <SelectItem value="90d">Last 90 days</SelectItem>
            </SelectContent>
          </Select>
          <Button variant="outline" size="sm" className="border-white/10 text-slate-400">
            <Download className="h-4 w-4 mr-2" />
            Export
          </Button>
          <Button variant="outline" size="icon" className="border-white/10 text-slate-400">
            <RefreshCw className="h-4 w-4" />
          </Button>
        </div>
      </div>

      {/* Key Metrics */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
        <CardGlass>
          <CardGlassContent className="p-6">
            <div className="flex items-start justify-between">
              <div>
                <p className="text-sm text-slate-400 mb-1">Total Runs</p>
                <p className="text-2xl font-bold text-white">{usageData.totalRuns}</p>
                <div className="flex items-center gap-1 mt-2">
                  {getTrendIcon(usageData.trend)}
                  <span className={`text-xs ${usageData.trend === 'up' ? 'text-green-400' : usageData.trend === 'down' ? 'text-red-400' : 'text-yellow-400'}`}>
                    {usageData.trendPercentage}% vs last period
                  </span>
                </div>
              </div>
              <div className="p-2 bg-purple-500/20 rounded-lg border border-purple-500/30">
                <Activity className="h-5 w-5 text-purple-400" />
              </div>
            </div>
          </CardGlassContent>
        </CardGlass>

        <CardGlass>
          <CardGlassContent className="p-6">
            <div className="flex items-start justify-between">
              <div>
                <p className="text-sm text-slate-400 mb-1">Success Rate</p>
                <p className="text-2xl font-bold text-white">{usageData.successRate}%</p>
                <div className="flex items-center gap-1 mt-2">
                  <CheckCircle className="h-4 w-4 text-green-400" />
                  <span className="text-xs text-green-400">Above target</span>
                </div>
              </div>
              <div className="p-2 bg-green-500/20 rounded-lg border border-green-500/30">
                <CheckCircle className="h-5 w-5 text-green-400" />
              </div>
            </div>
          </CardGlassContent>
        </CardGlass>

        <CardGlass>
          <CardGlassContent className="p-6">
            <div className="flex items-start justify-between">
              <div>
                <p className="text-sm text-slate-400 mb-1">Avg Time</p>
                <p className="text-2xl font-bold text-white">{usageData.averageTime}s</p>
                <div className="flex items-center gap-1 mt-2">
                  <Clock className="h-4 w-4 text-blue-400" />
                  <span className="text-xs text-blue-400">Optimal range</span>
                </div>
              </div>
              <div className="p-2 bg-blue-500/20 rounded-lg border border-blue-500/30">
                <Clock className="h-5 w-5 text-blue-400" />
              </div>
            </div>
          </CardGlassContent>
        </CardGlass>

        <CardGlass>
          <CardGlassContent className="p-6">
            <div className="flex items-start justify-between">
              <div>
                <p className="text-sm text-slate-400 mb-1">Last Run</p>
                <p className="text-2xl font-bold text-white">{usageData.lastRun}</p>
                <div className="flex items-center gap-1 mt-2">
                  <Calendar className="h-4 w-4 text-slate-400" />
                  <span className="text-xs text-slate-400">Active</span>
                </div>
              </div>
              <div className="p-2 bg-slate-500/20 rounded-lg border border-slate-500/30">
                <Calendar className="h-5 w-5 text-slate-400" />
              </div>
            </div>
          </CardGlassContent>
        </CardGlass>
      </div>

      {/* Detailed Analytics */}
      <CardGlass>
        <CardGlassContent className="p-6">
          <Tabs defaultValue="usage" className="w-full">
            <TabsList className="bg-slate-900/50 border border-white/10 mb-6">
              <TabsTrigger value="usage">Usage Over Time</TabsTrigger>
              <TabsTrigger value="meetings">By Meeting Type</TabsTrigger>
              <TabsTrigger value="performance">Performance</TabsTrigger>
              <TabsTrigger value="errors">Error Logs</TabsTrigger>
            </TabsList>

            {/* Usage Over Time */}
            <TabsContent value="usage" className="space-y-4">
              <div className="flex items-center justify-between mb-4">
                <h3 className="text-lg font-semibold text-white">Daily Usage</h3>
                <Select value={selectedMetric} onValueChange={setSelectedMetric}>
                  <SelectTrigger className="w-[140px] bg-slate-900/50 border-white/10 text-white">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="runs">Total Runs</SelectItem>
                    <SelectItem value="success">Success Rate</SelectItem>
                    <SelectItem value="time">Avg Time</SelectItem>
                  </SelectContent>
                </Select>
              </div>

              {/* Simple Chart Visualization */}
              <div className="bg-slate-900/50 rounded-lg p-4 border border-white/10">
                <div className="flex items-end gap-2 h-40">
                  {dailyStats.map((day, index) => {
                    const height = selectedMetric === 'runs'
                      ? (day.runs / 50) * 100
                      : selectedMetric === 'success'
                      ? (day.success / day.runs) * 100
                      : (day.avgTime / 4) * 100;

                    return (
                      <div key={index} className="flex-1 flex flex-col items-center gap-2">
                        <div className="relative w-full flex items-end justify-center h-32">
                          <div
                            className="w-full bg-purple-500/50 rounded-t transition-all hover:bg-purple-500/70"
                            style={{ height: `${height}%` }}
                            title={`${day.date}: ${selectedMetric === 'runs' ? day.runs : selectedMetric === 'success' ? `${Math.round((day.success/day.runs) * 100)}%` : `${day.avgTime}s`}`}
                          />
                        </div>
                        <span className="text-xs text-slate-500">{day.date.split('-')[2]}</span>
                      </div>
                    );
                  })}
                </div>
              </div>

              {/* Data Table */}
              <div className="overflow-x-auto">
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Date</TableHead>
                      <TableHead className="text-right">Runs</TableHead>
                      <TableHead className="text-right">Success</TableHead>
                      <TableHead className="text-right">Failed</TableHead>
                      <TableHead className="text-right">Success Rate</TableHead>
                      <TableHead className="text-right">Avg Time</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {dailyStats.map((day) => (
                      <TableRow key={day.date}>
                        <TableCell className="font-medium">{day.date}</TableCell>
                        <TableCell className="text-right">{day.runs}</TableCell>
                        <TableCell className="text-right text-green-400">{day.success}</TableCell>
                        <TableCell className="text-right text-red-400">{day.failed}</TableCell>
                        <TableCell className="text-right">
                          <Badge variant="outline" className="border-green-500/30 text-green-400">
                            {Math.round((day.success / day.runs) * 100)}%
                          </Badge>
                        </TableCell>
                        <TableCell className="text-right">{day.avgTime}s</TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              </div>
            </TabsContent>

            {/* By Meeting Type */}
            <TabsContent value="meetings" className="space-y-4">
              <div className="flex items-center justify-between mb-4">
                <h3 className="text-lg font-semibold text-white">Usage by Meeting Type</h3>
                <Button variant="outline" size="sm" className="border-white/10 text-slate-400">
                  <Filter className="h-4 w-4 mr-2" />
                  Filter
                </Button>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                {meetingTypeStats.map((stat) => (
                  <div key={stat.type} className="bg-slate-900/50 rounded-lg p-4 border border-white/10">
                    <div className="flex items-center justify-between mb-3">
                      <h4 className="font-medium text-white">{stat.type}</h4>
                      <Badge variant="outline" className="border-white/10 text-slate-400">
                        {stat.runs} runs
                      </Badge>
                    </div>
                    <div className="space-y-2">
                      <div className="flex items-center justify-between">
                        <span className="text-sm text-slate-400">Success Rate</span>
                        <div className="flex items-center gap-2">
                          <div className="w-24 h-2 bg-slate-800 rounded-full overflow-hidden">
                            <div
                              className="h-full bg-green-500 rounded-full"
                              style={{ width: `${stat.successRate}%` }}
                            />
                          </div>
                          <span className="text-sm text-green-400">{stat.successRate}%</span>
                        </div>
                      </div>
                      <div className="flex items-center justify-between">
                        <span className="text-sm text-slate-400">Avg Time</span>
                        <span className="text-sm text-white">{stat.avgTime}s</span>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            </TabsContent>

            {/* Performance */}
            <TabsContent value="performance" className="space-y-4">
              <div className="flex items-center justify-between mb-4">
                <h3 className="text-lg font-semibold text-white">Performance Metrics</h3>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                <div className="bg-slate-900/50 rounded-lg p-4 border border-white/10">
                  <div className="flex items-center gap-3 mb-3">
                    <TrendingUp className="h-5 w-5 text-green-400" />
                    <h4 className="font-medium text-white">Reliability</h4>
                  </div>
                  <div className="space-y-2">
                    <div className="flex justify-between">
                      <span className="text-sm text-slate-400">Uptime</span>
                      <span className="text-sm text-white">99.9%</span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-sm text-slate-400">Error Rate</span>
                      <span className="text-sm text-white">0.8%</span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-sm text-slate-400">Timeout Rate</span>
                      <span className="text-sm text-white">0.3%</span>
                    </div>
                  </div>
                </div>

                <div className="bg-slate-900/50 rounded-lg p-4 border border-white/10">
                  <div className="flex items-center gap-3 mb-3">
                    <Clock className="h-5 w-5 text-blue-400" />
                    <h4 className="font-medium text-white">Speed</h4>
                  </div>
                  <div className="space-y-2">
                    <div className="flex justify-between">
                      <span className="text-sm text-slate-400">P50 Latency</span>
                      <span className="text-sm text-white">2.8s</span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-sm text-slate-400">P95 Latency</span>
                      <span className="text-sm text-white">4.2s</span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-sm text-slate-400">P99 Latency</span>
                      <span className="text-sm text-white">5.1s</span>
                    </div>
                  </div>
                </div>

                <div className="bg-slate-900/50 rounded-lg p-4 border border-white/10">
                  <div className="flex items-center gap-3 mb-3">
                    <Users className="h-5 w-5 text-purple-400" />
                    <h4 className="font-medium text-white">Usage</h4>
                  </div>
                  <div className="space-y-2">
                    <div className="flex justify-between">
                      <span className="text-sm text-slate-400">Active Users</span>
                      <span className="text-sm text-white">42</span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-sm text-slate-400">Daily Average</span>
                      <span className="text-sm text-white">35</span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-sm text-slate-400">Peak Usage</span>
                      <span className="text-sm text-white">89</span>
                    </div>
                  </div>
                </div>
              </div>
            </TabsContent>

            {/* Error Logs */}
            <TabsContent value="errors" className="space-y-4">
              <div className="flex items-center justify-between mb-4">
                <h3 className="text-lg font-semibold text-white">Recent Errors</h3>
                <Badge variant="outline" className="border-red-500/30 text-red-400">
                  {errorLogs.length} errors
                </Badge>
              </div>

              <div className="space-y-3">
                {errorLogs.map((log) => (
                  <div key={log.id} className="bg-slate-900/50 rounded-lg p-4 border border-white/10">
                    <div className="flex items-start justify-between mb-2">
                      <div className="flex items-center gap-3">
                        <AlertCircle className="h-5 w-5 text-red-400" />
                        <div>
                          <p className="font-medium text-white">{log.error}</p>
                          <p className="text-xs text-slate-500 mt-1">{log.timestamp}</p>
                        </div>
                      </div>
                      <Badge className={getSeverityColor(log.severity)}>
                        {log.severity}
                      </Badge>
                    </div>
                    <div className="flex items-center justify-between mt-3">
                      <span className="text-sm text-slate-400">Meeting ID: {log.meetingId}</span>
                      <Button variant="ghost" size="sm" className="text-purple-400 hover:text-purple-300">
                        View Details
                        <ChevronRight className="h-4 w-4 ml-1" />
                      </Button>
                    </div>
                  </div>
                ))}
              </div>

              {errorLogs.length === 0 && (
                <div className="text-center py-8">
                  <CheckCircle className="h-12 w-12 text-green-400 mx-auto mb-3" />
                  <p className="text-lg font-medium text-white">No errors detected</p>
                  <p className="text-sm text-slate-400">The app is running smoothly</p>
                </div>
              )}
            </TabsContent>
          </Tabs>
        </CardGlassContent>
      </CardGlass>
    </div>
  );
}