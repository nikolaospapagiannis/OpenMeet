'use client';

import { useState, useMemo, useEffect, useCallback } from 'react';
import {
  Search, Star, Download, TrendingUp, Shield, Clock, Users,
  FileText, Mail, Calendar, Target, Brain, MessageSquare,
  BarChart3, Zap, Code, Bot, Sparkles, PenTool, Database,
  Loader2, RefreshCw, AlertCircle,
  Stethoscope, Scale, DollarSign, Briefcase, GraduationCap,
  Factory, Cog, Heart, Lightbulb, Megaphone, UserCheck, Settings
} from 'lucide-react';
import { CardGlass, CardGlassContent, CardGlassDescription, CardGlassHeader, CardGlassTitle } from '@/components/ui/card-glass';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import apiClient from '@/lib/api';

// API response type matching database schema
export interface AIAppFromAPI {
  id: string;
  slug: string;
  name: string;
  description: string;
  longDescription: string;
  icon: string;
  color: string;
  category: string;
  tags: string[];
  rating: number;
  isPremium: boolean;
  isNew: boolean;
  isTrending: boolean;
  isFeatured: boolean;
  features: string[];
  outputFormats: string[];
  temperature: number;
  maxTokens: number;
  createdAt: string;
  updatedAt: string;
}

// Legacy type for backward compatibility
export type AIApp = {
  id: string;
  name: string;
  description: string;
  longDescription?: string;
  icon: any;
  color: string;
  category: string;
  tags: string[];
  rating: number;
  downloads: number;
  installed: boolean;
  enabled: boolean;
  isPremium?: boolean;
  isNew?: boolean;
  isTrending?: boolean;
  author: string;
  version: string;
  updatedAt: string;
  features?: string[];
  requirements?: string[];
  outputFormats?: string[];
  customizable?: boolean;
};

// Icon mapping from string to Lucide icon component
const iconMap: Record<string, any> = {
  FileText,
  Mail,
  Calendar,
  Target,
  Brain,
  MessageSquare,
  BarChart3,
  Zap,
  Code,
  Bot,
  Sparkles,
  PenTool,
  Database,
  Search,
  Star,
  Download,
  TrendingUp,
  Shield,
  Clock,
  Users,
  Stethoscope,
  Scale,
  DollarSign,
  Briefcase,
  GraduationCap,
  Factory,
  Cog,
  Heart,
  Lightbulb,
  Megaphone,
  UserCheck,
  Settings,
};

// Convert API response to legacy format
function convertToLegacyFormat(app: AIAppFromAPI): AIApp {
  return {
    id: app.slug,
    name: app.name,
    description: app.description,
    longDescription: app.longDescription,
    icon: iconMap[app.icon] || Bot,
    color: app.color,
    category: app.category.charAt(0).toUpperCase() + app.category.slice(1).replace('_', ' '),
    tags: app.tags,
    rating: app.rating,
    downloads: Math.floor(Math.random() * 10000) + 1000, // Simulated for display
    installed: false,
    enabled: false,
    isPremium: app.isPremium,
    isNew: app.isNew,
    isTrending: app.isTrending,
    author: 'OpenMeet',
    version: '1.0.0',
    updatedAt: app.updatedAt,
    features: app.features,
    outputFormats: app.outputFormats,
    customizable: true,
  };
}

// Category type from API
interface CategoryOption {
  value: string;
  label: string;
  count: number;
}

interface AppMarketplaceProps {
  onInstallApp?: (app: AIApp) => void;
  onConfigureApp?: (app: AIApp) => void;
  installedApps?: string[];
}

export default function AppMarketplace({ onInstallApp, onConfigureApp, installedApps = [] }: AppMarketplaceProps) {
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedCategory, setSelectedCategory] = useState('all');
  const [sortBy, setSortBy] = useState('popular');
  const [activeTab, setActiveTab] = useState('all');

  // API data state
  const [apps, setApps] = useState<AIApp[]>([]);
  const [categories, setCategories] = useState<CategoryOption[]>([
    { value: 'all', label: 'All Categories', count: 0 }
  ]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [totalApps, setTotalApps] = useState(0);

  // Fetch apps from API
  const fetchApps = useCallback(async () => {
    try {
      setLoading(true);
      setError(null);

      // Build API params based on current filters
      const params: Record<string, string> = {
        pageSize: '100',
        sortBy: sortBy === 'popular' ? 'rating' : sortBy === 'newest' ? 'createdAt' : sortBy,
        sortOrder: sortBy === 'name' ? 'asc' : 'desc',
      };

      if (selectedCategory !== 'all') {
        params.category = selectedCategory.toLowerCase().replace(' ', '_');
      }

      if (searchQuery) {
        params.search = searchQuery;
      }

      // Filter by tab
      if (activeTab === 'trending') {
        params.isTrending = 'true';
      } else if (activeTab === 'new') {
        params.isNew = 'true';
      }

      const response = await apiClient.getAIApps(params);

      if (response.data) {
        const convertedApps = response.data.map(convertToLegacyFormat);
        setApps(convertedApps);
        setTotalApps(response.pagination?.total || response.data.length);
      }
    } catch (err) {
      console.error('Failed to fetch AI apps:', err);
      setError('Failed to load AI apps. Please try again.');
    } finally {
      setLoading(false);
    }
  }, [selectedCategory, searchQuery, sortBy, activeTab]);

  // Fetch categories from API
  const fetchCategories = useCallback(async () => {
    try {
      const response = await apiClient.getAIAppCategories();
      if (response.success && response.data) {
        setCategories(response.data);
      }
    } catch (err) {
      console.error('Failed to fetch categories:', err);
    }
  }, []);

  // Initial fetch
  useEffect(() => {
    fetchCategories();
  }, [fetchCategories]);

  // Fetch apps when filters change
  useEffect(() => {
    fetchApps();
  }, [fetchApps]);

  // Filter apps client-side for installed tab only (server handles other filters)
  const filteredApps = useMemo(() => {
    // For installed tab, filter client-side
    if (activeTab === 'installed') {
      return apps.filter(app => installedApps.includes(app.id) || app.installed);
    }
    // For other tabs, apps are already filtered by API
    return apps;
  }, [apps, activeTab, installedApps]);

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
      amber: { bg: 'bg-amber-500/20', text: 'text-white', icon: 'text-amber-400', border: 'border-amber-500/30' },
      violet: { bg: 'bg-violet-500/20', text: 'text-white', icon: 'text-violet-400', border: 'border-violet-500/30' },
      rose: { bg: 'bg-rose-500/20', text: 'text-white', icon: 'text-rose-400', border: 'border-rose-500/30' },
      emerald: { bg: 'bg-emerald-500/20', text: 'text-white', icon: 'text-emerald-400', border: 'border-emerald-500/30' },
    };
    return colors[color] || colors.blue;
  };

  return (
    <div className="space-y-6">
      {/* Header and Filters */}
      <div className="flex flex-col gap-4">
        <div className="flex items-center justify-between">
          <div>
            <h2 className="text-xl font-bold text-white">AI Apps Marketplace</h2>
            <p className="text-sm text-slate-400">Discover and install AI-powered apps to enhance your meetings</p>
          </div>
          <div className="flex items-center gap-2">
            {loading && (
              <Loader2 className="h-4 w-4 animate-spin text-purple-400" />
            )}
            <Badge variant="secondary" className="bg-purple-500/20 text-purple-400 border-purple-500/30">
              {totalApps} Apps Available
            </Badge>
            <Button
              variant="ghost"
              size="sm"
              onClick={() => fetchApps()}
              className="text-slate-400 hover:text-white"
              disabled={loading}
            >
              <RefreshCw className={`h-4 w-4 ${loading ? 'animate-spin' : ''}`} />
            </Button>
          </div>
        </div>

        {/* Search and Filters */}
        <div className="flex flex-col sm:flex-row gap-3">
          <div className="relative flex-1">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-slate-500" />
            <Input
              placeholder="Search apps by name, category, or tags..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="pl-10 bg-slate-900/50 border-white/10 text-white placeholder:text-slate-500"
            />
          </div>
          <Select value={selectedCategory} onValueChange={setSelectedCategory}>
            <SelectTrigger className="w-full sm:w-[180px] bg-slate-900/50 border-white/10 text-white">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              {categories.map(cat => (
                <SelectItem key={cat.value} value={cat.value}>{cat.label}</SelectItem>
              ))}
            </SelectContent>
          </Select>
          <Select value={sortBy} onValueChange={setSortBy}>
            <SelectTrigger className="w-full sm:w-[140px] bg-slate-900/50 border-white/10 text-white">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="popular">Most Popular</SelectItem>
              <SelectItem value="rating">Highest Rated</SelectItem>
              <SelectItem value="newest">Newest</SelectItem>
              <SelectItem value="name">Name (A-Z)</SelectItem>
            </SelectContent>
          </Select>
        </div>
      </div>

      {/* Tabs */}
      <Tabs value={activeTab} onValueChange={setActiveTab}>
        <TabsList className="bg-slate-900/50 border border-white/10">
          <TabsTrigger value="all">All Apps</TabsTrigger>
          <TabsTrigger value="installed">Installed</TabsTrigger>
          <TabsTrigger value="trending">
            <TrendingUp className="h-4 w-4 mr-1" />
            Trending
          </TabsTrigger>
          <TabsTrigger value="new">
            <Sparkles className="h-4 w-4 mr-1" />
            New
          </TabsTrigger>
        </TabsList>

        <TabsContent value={activeTab} className="mt-6">
          {/* Error State */}
          {error && (
            <div className="text-center py-12">
              <AlertCircle className="h-12 w-12 text-red-500 mx-auto mb-4" />
              <h3 className="text-lg font-semibold text-white mb-2">Failed to load apps</h3>
              <p className="text-slate-400 mb-4">{error}</p>
              <Button
                onClick={() => fetchApps()}
                className="bg-purple-600 hover:bg-purple-700"
              >
                <RefreshCw className="h-4 w-4 mr-2" />
                Try Again
              </Button>
            </div>
          )}

          {/* Loading State */}
          {loading && !error && (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
              {[1, 2, 3, 4, 5, 6].map((i) => (
                <CardGlass key={i} padding="none" className="animate-pulse">
                  <CardGlassHeader className="p-6 pb-4 border-b-0">
                    <div className="flex items-start justify-between mb-3">
                      <div className="w-12 h-12 bg-slate-700/50 rounded-xl" />
                      <div className="w-16 h-5 bg-slate-700/50 rounded" />
                    </div>
                    <div className="w-3/4 h-5 bg-slate-700/50 rounded mb-2" />
                    <div className="w-full h-4 bg-slate-700/50 rounded mb-1" />
                    <div className="w-2/3 h-4 bg-slate-700/50 rounded" />
                    <div className="flex gap-2 mt-3">
                      <div className="w-12 h-4 bg-slate-700/50 rounded" />
                      <div className="w-16 h-4 bg-slate-700/50 rounded" />
                      <div className="w-10 h-4 bg-slate-700/50 rounded" />
                    </div>
                  </CardGlassHeader>
                  <CardGlassContent className="p-6 pt-0">
                    <div className="w-full h-10 bg-slate-700/50 rounded" />
                  </CardGlassContent>
                </CardGlass>
              ))}
            </div>
          )}

          {/* Apps Grid */}
          {!loading && !error && (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
              {filteredApps.map((app) => {
                const Icon = app.icon;
                const colors = getColorClasses(app.color);
                const isInstalled = installedApps.includes(app.id) || app.installed;

                return (
                  <CardGlass
                    key={app.id}
                    hover
                    padding="none"
                    className="group"
                  >
                    <CardGlassHeader className="p-6 pb-4 border-b-0">
                      <div className="flex items-start justify-between mb-3">
                        <div className={`w-12 h-12 ${colors.bg} ${colors.border} border rounded-xl flex items-center justify-center transition-all duration-300 group-hover:scale-110`}>
                          <Icon className={`h-6 w-6 ${colors.icon}`} />
                        </div>
                        <div className="flex items-center gap-2">
                          {app.isPremium && (
                            <Badge className="bg-gradient-to-r from-amber-500/20 to-yellow-500/20 text-amber-400 border-amber-500/30 text-xs">
                              <Zap className="h-3 w-3 mr-1" />
                              Premium
                            </Badge>
                          )}
                          {app.isNew && (
                            <Badge className="bg-green-500/20 text-green-400 border-green-500/30 text-xs">
                              New
                            </Badge>
                          )}
                          {app.isTrending && (
                            <Badge className="bg-red-500/20 text-red-400 border-red-500/30 text-xs">
                              <TrendingUp className="h-3 w-3" />
                            </Badge>
                          )}
                        </div>
                      </div>
                      <CardGlassTitle className="text-lg text-white flex items-center gap-2">
                        {app.name}
                        {app.customizable && (
                          <span title="Customizable">
                            <Shield className="h-4 w-4 text-slate-500" />
                          </span>
                        )}
                      </CardGlassTitle>
                      <CardGlassDescription className="text-slate-400">{app.description}</CardGlassDescription>

                      {/* Stats */}
                      <div className="flex items-center gap-4 mt-3 text-xs text-slate-500">
                        <div className="flex items-center gap-1">
                          <Star className="h-3 w-3 text-yellow-500" />
                          <span>{app.rating}</span>
                        </div>
                        <div className="flex items-center gap-1">
                          <Download className="h-3 w-3" />
                          <span>{app.downloads.toLocaleString()}</span>
                        </div>
                        <div className="flex items-center gap-1">
                          <Clock className="h-3 w-3" />
                          <span>v{app.version}</span>
                        </div>
                      </div>

                      {/* Tags */}
                      <div className="flex flex-wrap gap-1 mt-3">
                        {app.tags.slice(0, 3).map(tag => (
                          <Badge key={tag} variant="outline" className="text-xs border-white/10 text-slate-400">
                            {tag}
                          </Badge>
                        ))}
                      </div>
                    </CardGlassHeader>
                    <CardGlassContent className="p-6 pt-0">
                      <div className="flex gap-2">
                        {isInstalled ? (
                          <>
                            <Button
                              variant="outline"
                              className="flex-1 border-green-500/30 text-green-400 hover:bg-green-500/10"
                              onClick={() => onConfigureApp?.(app)}
                            >
                              Configure
                            </Button>
                            <Button
                              variant="ghost"
                              size="sm"
                              className="text-slate-400 hover:text-red-400"
                            >
                              Uninstall
                            </Button>
                          </>
                        ) : (
                          <Button
                            className="w-full bg-purple-600 hover:bg-purple-700 text-white border-0"
                            onClick={() => onInstallApp?.(app)}
                          >
                            Install App
                          </Button>
                        )}
                      </div>
                    </CardGlassContent>
                  </CardGlass>
                );
              })}
            </div>
          )}

          {/* Empty State */}
          {!loading && !error && filteredApps.length === 0 && (
            <div className="text-center py-12">
              <Search className="h-12 w-12 text-slate-500 mx-auto mb-4" />
              <h3 className="text-lg font-semibold text-white mb-2">No apps found</h3>
              <p className="text-slate-400">Try adjusting your search or filters</p>
            </div>
          )}
        </TabsContent>
      </Tabs>
    </div>
  );
}