'use client';

import { useState, useEffect } from 'react';
import {
  BarChart3,
  TrendingUp,
  Users,
  Calendar,
  Clock,
  Eye,
  Download,
  Share2,
  Star,
  Copy,
  Activity,
  PieChart,
  ArrowUp,
  ArrowDown,
  AlertCircle,
  Hash
} from 'lucide-react';

import { CardGlass, CardGlassContent, CardGlassHeader, CardGlassTitle } from '@/components/ui/card-glass';
import { Badge } from '@/components/ui/badge';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue
} from '@/components/ui/select';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Progress } from '@/components/ui/progress';

interface TemplateAnalyticsProps {
  templateId: string;
  templateName: string;
}

interface UsageStats {
  totalViews: number;
  totalUses: number;
  totalShares: number;
  totalDuplicates: number;
  averageRating: number;
  ratingCount: number;
  uniqueUsers: number;
  activeUsers: number;
}

interface UsageTrend {
  date: string;
  views: number;
  uses: number;
}

interface UserActivity {
  userId: string;
  userName: string;
  lastUsed: Date;
  usageCount: number;
  department?: string;
}

interface VariableUsage {
  variable: string;
  usageCount: number;
  fillRate: number;
}

export default function TemplateAnalytics({
  templateId,
  templateName
}: TemplateAnalyticsProps) {
  const [loading, setLoading] = useState(true);
  const [period, setPeriod] = useState('30d');
  const [stats, setStats] = useState<UsageStats>({
    totalViews: 0,
    totalUses: 0,
    totalShares: 0,
    totalDuplicates: 0,
    averageRating: 0,
    ratingCount: 0,
    uniqueUsers: 0,
    activeUsers: 0
  });
  const [trends, setTrends] = useState<UsageTrend[]>([]);
  const [topUsers, setTopUsers] = useState<UserActivity[]>([]);
  const [variableUsage, setVariableUsage] = useState<VariableUsage[]>([]);

  // Load analytics data
  useEffect(() => {
    loadAnalytics();
  }, [templateId, period]);

  const loadAnalytics = async () => {
    setLoading(true);

    // Mock data - replace with actual API call
    setTimeout(() => {
      // Generate mock stats
      setStats({
        totalViews: 1542,
        totalUses: 387,
        totalShares: 45,
        totalDuplicates: 12,
        averageRating: 4.6,
        ratingCount: 28,
        uniqueUsers: 156,
        activeUsers: 42
      });

      // Generate mock trends
      const mockTrends: UsageTrend[] = [];
      const days = period === '7d' ? 7 : period === '30d' ? 30 : 90;
      for (let i = 0; i < days; i++) {
        const date = new Date();
        date.setDate(date.getDate() - i);
        mockTrends.push({
          date: date.toISOString().split('T')[0],
          views: Math.floor(Math.random() * 100) + 20,
          uses: Math.floor(Math.random() * 30) + 5
        });
      }
      setTrends(mockTrends.reverse());

      // Mock top users
      setTopUsers([
        {
          userId: '1',
          userName: 'John Doe',
          lastUsed: new Date('2024-12-09T10:00:00'),
          usageCount: 45,
          department: 'Sales'
        },
        {
          userId: '2',
          userName: 'Jane Smith',
          lastUsed: new Date('2024-12-08T15:30:00'),
          usageCount: 38,
          department: 'Customer Success'
        },
        {
          userId: '3',
          userName: 'Bob Johnson',
          lastUsed: new Date('2024-12-07T09:15:00'),
          usageCount: 27,
          department: 'Sales'
        },
        {
          userId: '4',
          userName: 'Alice Chen',
          lastUsed: new Date('2024-12-06T14:20:00'),
          usageCount: 22,
          department: 'Engineering'
        },
        {
          userId: '5',
          userName: 'Mike Wilson',
          lastUsed: new Date('2024-12-05T11:45:00'),
          usageCount: 18,
          department: 'Marketing'
        }
      ]);

      // Mock variable usage
      setVariableUsage([
        { variable: '{{meeting.title}}', usageCount: 387, fillRate: 100 },
        { variable: '{{meeting.date}}', usageCount: 385, fillRate: 99.5 },
        { variable: '{{participant.names}}', usageCount: 380, fillRate: 98.2 },
        { variable: '{{meeting.time}}', usageCount: 342, fillRate: 88.4 },
        { variable: '{{company.name}}', usageCount: 298, fillRate: 77.0 },
        { variable: '{{sales.prospect}}', usageCount: 156, fillRate: 40.3 }
      ]);

      setLoading(false);
    }, 1000);
  };

  // Calculate conversion rate
  const conversionRate = stats.totalViews > 0
    ? ((stats.totalUses / stats.totalViews) * 100).toFixed(1)
    : '0';

  // Calculate growth
  const calculateGrowth = (current: number, previous: number) => {
    if (previous === 0) return 0;
    return ((current - previous) / previous * 100).toFixed(1);
  };

  // Format date
  const formatDate = (date: Date) => {
    const now = new Date();
    const diff = now.getTime() - date.getTime();
    const days = Math.floor(diff / (1000 * 60 * 60 * 24));

    if (days === 0) {
      const hours = Math.floor(diff / (1000 * 60 * 60));
      return hours === 0 ? 'Just now' : `${hours}h ago`;
    } else if (days === 1) {
      return 'Yesterday';
    } else if (days < 7) {
      return `${days}d ago`;
    } else {
      return date.toLocaleDateString();
    }
  };

  if (loading) {
    return (
      <CardGlass>
        <CardGlassContent className="py-8 text-center">
          <div className="animate-pulse space-y-4">
            <div className="h-32 bg-[var(--ff-bg-layer)] rounded-lg" />
            <div className="grid grid-cols-4 gap-4">
              {[...Array(4)].map((_, i) => (
                <div key={i} className="h-24 bg-[var(--ff-bg-layer)] rounded-lg" />
              ))}
            </div>
          </div>
        </CardGlassContent>
      </CardGlass>
    );
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h2 className="heading-m">Template Analytics</h2>
          <p className="paragraph-s text-[var(--ff-text-muted)]">{templateName}</p>
        </div>
        <Select value={period} onValueChange={setPeriod}>
          <SelectTrigger className="w-32">
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="7d">Last 7 days</SelectItem>
            <SelectItem value="30d">Last 30 days</SelectItem>
            <SelectItem value="90d">Last 90 days</SelectItem>
          </SelectContent>
        </Select>
      </div>

      {/* Key Metrics */}
      <div className="grid grid-cols-4 gap-4">
        <CardGlass>
          <CardGlassContent className="p-4">
            <div className="flex items-start justify-between">
              <div>
                <p className="text-xs text-[var(--ff-text-muted)]">Total Views</p>
                <p className="text-2xl font-bold mt-1">{stats.totalViews.toLocaleString()}</p>
                <div className="flex items-center gap-1 mt-2">
                  <ArrowUp className="w-3 h-3 text-green-500" />
                  <span className="text-xs text-green-500">+12.5%</span>
                </div>
              </div>
              <Eye className="w-5 h-5 text-[var(--ff-text-muted)]" />
            </div>
          </CardGlassContent>
        </CardGlass>

        <CardGlass>
          <CardGlassContent className="p-4">
            <div className="flex items-start justify-between">
              <div>
                <p className="text-xs text-[var(--ff-text-muted)]">Total Uses</p>
                <p className="text-2xl font-bold mt-1">{stats.totalUses.toLocaleString()}</p>
                <div className="flex items-center gap-1 mt-2">
                  <ArrowUp className="w-3 h-3 text-green-500" />
                  <span className="text-xs text-green-500">+8.3%</span>
                </div>
              </div>
              <Activity className="w-5 h-5 text-[var(--ff-text-muted)]" />
            </div>
          </CardGlassContent>
        </CardGlass>

        <CardGlass>
          <CardGlassContent className="p-4">
            <div className="flex items-start justify-between">
              <div>
                <p className="text-xs text-[var(--ff-text-muted)]">Conversion Rate</p>
                <p className="text-2xl font-bold mt-1">{conversionRate}%</p>
                <div className="flex items-center gap-1 mt-2">
                  <ArrowDown className="w-3 h-3 text-red-500" />
                  <span className="text-xs text-red-500">-2.1%</span>
                </div>
              </div>
              <TrendingUp className="w-5 h-5 text-[var(--ff-text-muted)]" />
            </div>
          </CardGlassContent>
        </CardGlass>

        <CardGlass>
          <CardGlassContent className="p-4">
            <div className="flex items-start justify-between">
              <div>
                <p className="text-xs text-[var(--ff-text-muted)]">Avg Rating</p>
                <div className="flex items-baseline gap-2 mt-1">
                  <p className="text-2xl font-bold">{stats.averageRating}</p>
                  <span className="text-xs text-[var(--ff-text-muted)]">({stats.ratingCount})</span>
                </div>
                <div className="flex gap-0.5 mt-2">
                  {[...Array(5)].map((_, i) => (
                    <Star
                      key={i}
                      className={`w-3 h-3 ${
                        i < Math.floor(stats.averageRating)
                          ? 'fill-yellow-500 text-yellow-500'
                          : 'text-[var(--ff-text-muted)]'
                      }`}
                    />
                  ))}
                </div>
              </div>
              <Star className="w-5 h-5 text-[var(--ff-text-muted)]" />
            </div>
          </CardGlassContent>
        </CardGlass>
      </div>

      {/* Detailed Analytics */}
      <Tabs defaultValue="usage">
        <TabsList className="grid w-full grid-cols-4">
          <TabsTrigger value="usage">Usage Trends</TabsTrigger>
          <TabsTrigger value="users">Top Users</TabsTrigger>
          <TabsTrigger value="variables">Variables</TabsTrigger>
          <TabsTrigger value="engagement">Engagement</TabsTrigger>
        </TabsList>

        <TabsContent value="usage" className="mt-4">
          <CardGlass>
            <CardGlassHeader>
              <CardGlassTitle className="flex items-center gap-2">
                <BarChart3 className="w-5 h-5" />
                Usage Over Time
              </CardGlassTitle>
            </CardGlassHeader>
            <CardGlassContent>
              {/* Simplified chart representation */}
              <div className="h-64 flex items-end gap-1">
                {trends.map((trend, index) => {
                  const maxViews = Math.max(...trends.map(t => t.views));
                  const height = (trend.views / maxViews) * 100;
                  return (
                    <div
                      key={index}
                      className="flex-1 bg-[var(--ff-purple-500)] rounded-t hover:bg-[var(--ff-purple-600)] transition-colors relative group"
                      style={{ height: `${height}%` }}
                    >
                      <div className="absolute -top-8 left-1/2 transform -translate-x-1/2 bg-[var(--ff-bg-dark)] border border-[var(--ff-border)] rounded px-2 py-1 opacity-0 group-hover:opacity-100 transition-opacity whitespace-nowrap text-xs">
                        {trend.views} views
                      </div>
                    </div>
                  );
                })}
              </div>
              <div className="flex justify-between mt-2 text-xs text-[var(--ff-text-muted)]">
                <span>{trends[0]?.date}</span>
                <span>{trends[trends.length - 1]?.date}</span>
              </div>
            </CardGlassContent>
          </CardGlass>
        </TabsContent>

        <TabsContent value="users" className="mt-4">
          <CardGlass>
            <CardGlassHeader>
              <CardGlassTitle className="flex items-center gap-2">
                <Users className="w-5 h-5" />
                Most Active Users
              </CardGlassTitle>
            </CardGlassHeader>
            <CardGlassContent>
              <div className="space-y-3">
                {topUsers.map((user, index) => (
                  <div key={user.userId} className="flex items-center justify-between p-3 bg-[var(--ff-bg-layer)] rounded-lg">
                    <div className="flex items-center gap-3">
                      <div className="w-8 h-8 rounded-full bg-[var(--ff-purple-500)]/20 flex items-center justify-center text-sm font-medium">
                        {index + 1}
                      </div>
                      <div>
                        <p className="font-medium text-sm">{user.userName}</p>
                        <p className="text-xs text-[var(--ff-text-muted)]">
                          {user.department} • Last used {formatDate(user.lastUsed)}
                        </p>
                      </div>
                    </div>
                    <div className="text-right">
                      <p className="font-medium text-sm">{user.usageCount}</p>
                      <p className="text-xs text-[var(--ff-text-muted)]">uses</p>
                    </div>
                  </div>
                ))}
              </div>

              <div className="mt-4 pt-4 border-t border-[var(--ff-border)]">
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <p className="text-xs text-[var(--ff-text-muted)]">Unique Users</p>
                    <p className="text-xl font-bold mt-1">{stats.uniqueUsers}</p>
                  </div>
                  <div>
                    <p className="text-xs text-[var(--ff-text-muted)]">Active This Week</p>
                    <p className="text-xl font-bold mt-1">{stats.activeUsers}</p>
                  </div>
                </div>
              </div>
            </CardGlassContent>
          </CardGlass>
        </TabsContent>

        <TabsContent value="variables" className="mt-4">
          <CardGlass>
            <CardGlassHeader>
              <CardGlassTitle className="flex items-center gap-2">
                <Hash className="w-5 h-5" />
                Variable Usage
              </CardGlassTitle>
            </CardGlassHeader>
            <CardGlassContent>
              <div className="space-y-4">
                {variableUsage.map(variable => (
                  <div key={variable.variable} className="space-y-2">
                    <div className="flex items-center justify-between">
                      <code className="text-sm text-[var(--ff-purple-500)]">
                        {variable.variable}
                      </code>
                      <span className="text-sm text-[var(--ff-text-muted)]">
                        {variable.usageCount} uses
                      </span>
                    </div>
                    <div className="space-y-1">
                      <Progress value={variable.fillRate} className="h-2" />
                      <p className="text-xs text-[var(--ff-text-muted)]">
                        {variable.fillRate}% fill rate
                      </p>
                    </div>
                  </div>
                ))}
              </div>

              <div className="mt-4 p-3 bg-[var(--ff-bg-layer)] rounded-lg">
                <div className="flex items-start gap-2">
                  <AlertCircle className="w-4 h-4 text-[var(--ff-text-muted)] mt-0.5" />
                  <div className="text-xs text-[var(--ff-text-secondary)]">
                    Variables with low fill rates may indicate they\'re not relevant for all use cases.
                    Consider making them optional or providing default values.
                  </div>
                </div>
              </div>
            </CardGlassContent>
          </CardGlass>
        </TabsContent>

        <TabsContent value="engagement" className="mt-4">
          <div className="grid grid-cols-2 gap-4">
            <CardGlass>
              <CardGlassHeader>
                <CardGlassTitle className="flex items-center gap-2">
                  <Share2 className="w-5 h-5" />
                  Sharing Stats
                </CardGlassTitle>
              </CardGlassHeader>
              <CardGlassContent>
                <div className="space-y-4">
                  <div className="flex items-center justify-between">
                    <span className="text-sm text-[var(--ff-text-secondary)]">Total Shares</span>
                    <span className="text-lg font-bold">{stats.totalShares}</span>
                  </div>
                  <div className="flex items-center justify-between">
                    <span className="text-sm text-[var(--ff-text-secondary)]">Duplicates Created</span>
                    <span className="text-lg font-bold">{stats.totalDuplicates}</span>
                  </div>
                  <div className="flex items-center justify-between">
                    <span className="text-sm text-[var(--ff-text-secondary)]">Share Rate</span>
                    <span className="text-lg font-bold">
                      {stats.totalUses > 0
                        ? ((stats.totalShares / stats.totalUses) * 100).toFixed(1)
                        : 0}%
                    </span>
                  </div>
                </div>
              </CardGlassContent>
            </CardGlass>

            <CardGlass>
              <CardGlassHeader>
                <CardGlassTitle className="flex items-center gap-2">
                  <PieChart className="w-5 h-5" />
                  Usage by Department
                </CardGlassTitle>
              </CardGlassHeader>
              <CardGlassContent>
                <div className="space-y-3">
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-2">
                      <div className="w-3 h-3 rounded-full bg-[var(--ff-purple-500)]" />
                      <span className="text-sm">Sales</span>
                    </div>
                    <span className="text-sm font-medium">45%</span>
                  </div>
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-2">
                      <div className="w-3 h-3 rounded-full bg-[var(--ff-blue-500)]" />
                      <span className="text-sm">Customer Success</span>
                    </div>
                    <span className="text-sm font-medium">28%</span>
                  </div>
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-2">
                      <div className="w-3 h-3 rounded-full bg-[var(--ff-green-500)]" />
                      <span className="text-sm">Engineering</span>
                    </div>
                    <span className="text-sm font-medium">15%</span>
                  </div>
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-2">
                      <div className="w-3 h-3 rounded-full bg-[var(--ff-orange-500)]" />
                      <span className="text-sm">Marketing</span>
                    </div>
                    <span className="text-sm font-medium">12%</span>
                  </div>
                </div>
              </CardGlassContent>
            </CardGlass>
          </div>
        </TabsContent>
      </Tabs>
    </div>
  );
}