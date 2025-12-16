'use client';

import { useState, useEffect, useCallback } from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Switch } from '@/components/ui/switch';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Badge } from '@/components/ui/badge';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger, DropdownMenuSeparator, DropdownMenuLabel } from '@/components/ui/dropdown-menu';
import { Slider } from '@/components/ui/slider';
import { Progress } from '@/components/ui/progress';
import { Skeleton } from '@/components/ui/skeleton';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Separator } from '@/components/ui/separator';
import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert';
import {
  Brain,
  Bot,
  Cpu,
  DollarSign,
  Activity,
  Settings2,
  FileText,
  Shield,
  ChartBar,
  Plus,
  Edit,
  Trash2,
  MoreVertical,
  RefreshCw,
  Search,
  Filter,
  Download,
  Play,
  Pause,
  CheckCircle,
  XCircle,
  AlertTriangle,
  Info,
  Clock,
  Zap,
  TrendingUp,
  TrendingDown,
  Eye,
  EyeOff,
  Copy,
  RotateCcw,
  History,
  ChevronLeft,
  ChevronRight,
  Loader2,
  Key,
  Server,
  Globe,
} from 'lucide-react';

const API_BASE_URL = process.env.NEXT_PUBLIC_API_URL || '';

// Types
interface AIModel {
  id: string;
  name: string;
  provider: string;
  modelId: string;
  maxTokens: number;
  temperature: number;
  enabled: boolean;
  rateLimitRpm: number;
  rateLimitTpm: number;
  costPerInputToken?: number;
  costPerOutputToken?: number;
  description: string;
  tags: string[];
  hasApiKey: boolean;
  createdAt: string;
}

interface UsageSummary {
  totalRequests: number;
  totalTokens: number;
  totalInputTokens: number;
  totalOutputTokens: number;
  estimatedCost: number;
  averageLatency: number;
  successRate: number;
}

interface DailyUsage {
  date: string;
  requests: number;
  tokens: number;
  cost: number;
}

interface OrganizationUsage {
  organizationId: string;
  organizationName: string;
  totalRequests: number;
  totalTokens: number;
  estimatedCost: number;
}

interface ModelUsage {
  modelId: string;
  totalRequests: number;
  totalTokens: number;
  averageLatency: number;
  successRate: number;
  pricing: { input: number; output: number };
}

interface FeatureUsage {
  featureId: string;
  featureName: string;
  category: string;
  totalRequests: number;
  totalTokens: number;
  averageLatency: number;
  successRate: number;
}

interface PromptTemplate {
  id: string;
  name: string;
  description: string;
  category: string;
  enabled: boolean;
  version: number;
  systemPromptPreview: string;
  variableCount: number;
  createdAt: string;
}

interface PromptTemplateDetail extends PromptTemplate {
  systemPrompt: string;
  userPromptTemplate?: string;
  variables?: Array<{
    name: string;
    type: string;
    required: boolean;
    defaultValue?: unknown;
    description?: string;
  }>;
  modelConfig?: {
    preferredModel?: string;
    maxTokens?: number;
    temperature?: number;
  };
}

interface Guardrails {
  contentFiltering: {
    enabled: boolean;
    blockProfanity: boolean;
    blockHateSpeech: boolean;
    blockViolence: boolean;
    blockSexualContent: boolean;
    blockPII: boolean;
    customBlocklist: string[];
  };
  inputValidation: {
    enabled: boolean;
    maxInputLength: number;
    maxConversationTurns: number;
    allowedTopics: string[];
    blockedTopics: string[];
  };
  outputValidation: {
    enabled: boolean;
    maxOutputLength: number;
    requireCitations: boolean;
    enforceFormatting: boolean;
  };
  rateLimiting: {
    enabled: boolean;
    requestsPerMinute: number;
    tokensPerMinute: number;
    requestsPerDay: number;
    tokensPerDay: number;
  };
  monitoring: {
    logAllRequests: boolean;
    alertOnHighUsage: boolean;
    alertThresholdPercent: number;
    alertOnErrors: boolean;
    errorAlertThreshold: number;
  };
  updatedAt: string | null;
}

interface CostLimits {
  globalDailyLimit?: number;
  globalMonthlyLimit?: number;
  perOrganizationDailyLimit?: number;
  perOrganizationMonthlyLimit?: number;
  perUserDailyLimit?: number;
  perUserMonthlyLimit?: number;
  alertThresholds: number[];
  hardLimitAction: 'block' | 'throttle' | 'notify';
}

interface CostSummary {
  totalCost: number;
  totalInputTokens: number;
  totalOutputTokens: number;
  averageCostPerRequest: number;
}

interface CostByModel {
  model: string;
  inputTokens: number;
  outputTokens: number;
  cost: number;
}

interface DailyCost {
  date: string;
  cost: number;
}

interface PerformanceSummary {
  totalRequests: number;
  successRate: number;
  averageLatency: number;
  minLatency: number;
  maxLatency: number;
  p50Latency: number;
  p95Latency: number;
  p99Latency: number;
}

interface ModelPerformance {
  model: string;
  averageLatency: number;
  requestCount: number;
  successCount: number;
  errorCount: number;
  successRate: number;
}

interface HourlyDistribution {
  hour: number;
  requestCount: number;
  averageLatency: number;
}

interface AILog {
  id: string;
  aiAppId: string;
  aiAppName: string;
  model: string;
  category: string;
  userId: string;
  organizationId: string;
  inputTokens: number;
  outputTokens: number;
  totalTokens: number;
  duration: number;
  success: boolean;
  error?: string;
  cost: number;
  createdAt: string;
}

interface TestResult {
  success: boolean;
  latency: number;
  error?: string;
  response?: string;
}

export default function AIOperationsPage() {
  const [activeTab, setActiveTab] = useState('models');
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  // Models State
  const [models, setModels] = useState<AIModel[]>([]);
  const [modelsLoading, setModelsLoading] = useState(false);
  const [selectedModel, setSelectedModel] = useState<AIModel | null>(null);
  const [modelDialogOpen, setModelDialogOpen] = useState(false);
  const [modelFormMode, setModelFormMode] = useState<'create' | 'edit'>('create');
  const [testingModel, setTestingModel] = useState<string | null>(null);
  const [testResult, setTestResult] = useState<TestResult | null>(null);
  const [modelProviderFilter, setModelProviderFilter] = useState<string>('all');

  // Model Form State
  const [modelForm, setModelForm] = useState({
    id: '',
    name: '',
    provider: 'openai',
    modelId: '',
    apiKey: '',
    apiEndpoint: '',
    maxTokens: 4096,
    temperature: 0.7,
    topP: 1,
    frequencyPenalty: 0,
    presencePenalty: 0,
    enabled: true,
    rateLimitRpm: 60,
    rateLimitTpm: 100000,
    costPerInputToken: 0,
    costPerOutputToken: 0,
    description: '',
    tags: [] as string[],
  });

  // Usage State
  const [usageSummary, setUsageSummary] = useState<UsageSummary | null>(null);
  const [dailyUsage, setDailyUsage] = useState<DailyUsage[]>([]);
  const [orgUsage, setOrgUsage] = useState<OrganizationUsage[]>([]);
  const [modelUsage, setModelUsage] = useState<ModelUsage[]>([]);
  const [featureUsage, setFeatureUsage] = useState<FeatureUsage[]>([]);
  const [usagePeriod, setUsagePeriod] = useState('month');
  const [usageLoading, setUsageLoading] = useState(false);

  // Prompts State
  const [prompts, setPrompts] = useState<PromptTemplate[]>([]);
  const [promptsLoading, setPromptsLoading] = useState(false);
  const [selectedPrompt, setSelectedPrompt] = useState<PromptTemplateDetail | null>(null);
  const [promptDialogOpen, setPromptDialogOpen] = useState(false);
  const [promptFormMode, setPromptFormMode] = useState<'create' | 'edit'>('create');
  const [promptCategoryFilter, setPromptCategoryFilter] = useState<string>('all');

  // Prompt Form State
  const [promptForm, setPromptForm] = useState({
    id: '',
    name: '',
    description: '',
    category: 'general',
    systemPrompt: '',
    userPromptTemplate: '',
    enabled: true,
    variables: [] as Array<{ name: string; type: string; required: boolean; description: string }>,
    modelConfig: {
      preferredModel: '',
      maxTokens: 4096,
      temperature: 0.7,
    },
  });

  // Guardrails State
  const [guardrails, setGuardrails] = useState<Guardrails | null>(null);
  const [guardrailsLoading, setGuardrailsLoading] = useState(false);
  const [guardrailsSaving, setGuardrailsSaving] = useState(false);
  const [guardrailsEdited, setGuardrailsEdited] = useState(false);

  // Costs State
  const [costSummary, setCostSummary] = useState<CostSummary | null>(null);
  const [costByModel, setCostByModel] = useState<CostByModel[]>([]);
  const [dailyCosts, setDailyCosts] = useState<DailyCost[]>([]);
  const [costLimits, setCostLimits] = useState<CostLimits | null>(null);
  const [costPeriod, setCostPeriod] = useState('month');
  const [costsLoading, setCostsLoading] = useState(false);
  const [costLimitsDialogOpen, setCostLimitsDialogOpen] = useState(false);

  // Performance State
  const [performanceSummary, setPerformanceSummary] = useState<PerformanceSummary | null>(null);
  const [modelPerformance, setModelPerformance] = useState<ModelPerformance[]>([]);
  const [hourlyDistribution, setHourlyDistribution] = useState<HourlyDistribution[]>([]);
  const [errorBreakdown, setErrorBreakdown] = useState<Record<string, number>>({});
  const [performancePeriod, setPerformancePeriod] = useState('day');
  const [performanceLoading, setPerformanceLoading] = useState(false);

  // Logs State
  const [logs, setLogs] = useState<AILog[]>([]);
  const [logsLoading, setLogsLoading] = useState(false);
  const [logsPage, setLogsPage] = useState(1);
  const [logsTotalPages, setLogsTotalPages] = useState(1);
  const [logsTotal, setLogsTotal] = useState(0);
  const [logsStatusFilter, setLogsStatusFilter] = useState<string>('all');

  // Fetch Models
  const fetchModels = useCallback(async () => {
    setModelsLoading(true);
    try {
      const params = new URLSearchParams();
      if (modelProviderFilter !== 'all') {
        params.append('provider', modelProviderFilter);
      }
      const response = await fetch(`${API_BASE_URL}/api/admin/ai-operations/models?${params}`, {
        credentials: 'include',
      });
      if (!response.ok) throw new Error('Failed to fetch models');
      const data = await response.json();
      if (data.success) {
        setModels(data.data);
      } else {
        throw new Error(data.error || 'Failed to fetch models');
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to fetch models');
    } finally {
      setModelsLoading(false);
    }
  }, [modelProviderFilter]);

  // Fetch Usage Data
  const fetchUsage = useCallback(async () => {
    setUsageLoading(true);
    try {
      const [summaryRes, orgRes, modelRes, featureRes] = await Promise.all([
        fetch(`${API_BASE_URL}/api/admin/ai-operations/usage?period=${usagePeriod}`, { credentials: 'include' }),
        fetch(`${API_BASE_URL}/api/admin/ai-operations/usage/by-organization?period=${usagePeriod}`, { credentials: 'include' }),
        fetch(`${API_BASE_URL}/api/admin/ai-operations/usage/by-model?period=${usagePeriod}`, { credentials: 'include' }),
        fetch(`${API_BASE_URL}/api/admin/ai-operations/usage/by-feature?period=${usagePeriod}`, { credentials: 'include' }),
      ]);

      if (!summaryRes.ok || !orgRes.ok || !modelRes.ok || !featureRes.ok) {
        throw new Error('Failed to fetch usage data');
      }

      const [summaryData, orgData, modelData, featureData] = await Promise.all([
        summaryRes.json(),
        orgRes.json(),
        modelRes.json(),
        featureRes.json(),
      ]);

      if (summaryData.success) {
        setUsageSummary(summaryData.data.summary);
        setDailyUsage(summaryData.data.dailyBreakdown || []);
      }
      if (orgData.success) {
        setOrgUsage(orgData.data);
      }
      if (modelData.success) {
        setModelUsage(modelData.data);
      }
      if (featureData.success) {
        setFeatureUsage(featureData.data);
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to fetch usage data');
    } finally {
      setUsageLoading(false);
    }
  }, [usagePeriod]);

  // Fetch Prompts
  const fetchPrompts = useCallback(async () => {
    setPromptsLoading(true);
    try {
      const params = new URLSearchParams();
      if (promptCategoryFilter !== 'all') {
        params.append('category', promptCategoryFilter);
      }
      const response = await fetch(`${API_BASE_URL}/api/admin/ai-operations/prompts?${params}`, {
        credentials: 'include',
      });
      if (!response.ok) throw new Error('Failed to fetch prompts');
      const data = await response.json();
      if (data.success) {
        setPrompts(data.data);
      } else {
        throw new Error(data.error || 'Failed to fetch prompts');
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to fetch prompts');
    } finally {
      setPromptsLoading(false);
    }
  }, [promptCategoryFilter]);

  // Fetch Guardrails
  const fetchGuardrails = useCallback(async () => {
    setGuardrailsLoading(true);
    try {
      const response = await fetch(`${API_BASE_URL}/api/admin/ai-operations/guardrails`, {
        credentials: 'include',
      });
      if (!response.ok) throw new Error('Failed to fetch guardrails');
      const data = await response.json();
      if (data.success) {
        setGuardrails(data.data);
      } else {
        throw new Error(data.error || 'Failed to fetch guardrails');
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to fetch guardrails');
    } finally {
      setGuardrailsLoading(false);
    }
  }, []);

  // Fetch Costs
  const fetchCosts = useCallback(async () => {
    setCostsLoading(true);
    try {
      const response = await fetch(`${API_BASE_URL}/api/admin/ai-operations/costs?period=${costPeriod}`, {
        credentials: 'include',
      });
      if (!response.ok) throw new Error('Failed to fetch costs');
      const data = await response.json();
      if (data.success) {
        setCostSummary(data.data.summary);
        setCostByModel(data.data.costByModel || []);
        setDailyCosts(data.data.dailyTrend || []);
        setCostLimits(data.data.limits || null);
      } else {
        throw new Error(data.error || 'Failed to fetch costs');
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to fetch costs');
    } finally {
      setCostsLoading(false);
    }
  }, [costPeriod]);

  // Fetch Performance
  const fetchPerformance = useCallback(async () => {
    setPerformanceLoading(true);
    try {
      const response = await fetch(`${API_BASE_URL}/api/admin/ai-operations/performance?period=${performancePeriod}`, {
        credentials: 'include',
      });
      if (!response.ok) throw new Error('Failed to fetch performance');
      const data = await response.json();
      if (data.success) {
        setPerformanceSummary(data.data.summary);
        setModelPerformance(data.data.byModel || []);
        setHourlyDistribution(data.data.hourlyDistribution || []);
        setErrorBreakdown(data.data.errorBreakdown || {});
      } else {
        throw new Error(data.error || 'Failed to fetch performance');
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to fetch performance');
    } finally {
      setPerformanceLoading(false);
    }
  }, [performancePeriod]);

  // Fetch Logs
  const fetchLogs = useCallback(async () => {
    setLogsLoading(true);
    try {
      const params = new URLSearchParams();
      params.append('page', logsPage.toString());
      params.append('limit', '50');
      if (logsStatusFilter !== 'all') {
        params.append('status', logsStatusFilter);
      }
      const response = await fetch(`${API_BASE_URL}/api/admin/ai-operations/logs?${params}`, {
        credentials: 'include',
      });
      if (!response.ok) throw new Error('Failed to fetch logs');
      const data = await response.json();
      if (data.success) {
        setLogs(data.data);
        setLogsTotalPages(data.meta.totalPages);
        setLogsTotal(data.meta.total);
      } else {
        throw new Error(data.error || 'Failed to fetch logs');
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to fetch logs');
    } finally {
      setLogsLoading(false);
    }
  }, [logsPage, logsStatusFilter]);

  // Create/Update Model
  const saveModel = async () => {
    try {
      const url = modelFormMode === 'create'
        ? `${API_BASE_URL}/api/admin/ai-operations/models`
        : `${API_BASE_URL}/api/admin/ai-operations/models/${modelForm.id}`;
      const method = modelFormMode === 'create' ? 'POST' : 'PUT';

      const response = await fetch(url, {
        method,
        credentials: 'include',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(modelForm),
      });

      if (!response.ok) throw new Error('Failed to save model');
      const data = await response.json();
      if (data.success) {
        setModelDialogOpen(false);
        fetchModels();
        resetModelForm();
      } else {
        throw new Error(data.error || 'Failed to save model');
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to save model');
    }
  };

  // Delete Model
  const deleteModel = async (id: string) => {
    if (!confirm('Are you sure you want to delete this model configuration?')) return;
    try {
      const response = await fetch(`${API_BASE_URL}/api/admin/ai-operations/models/${id}`, {
        method: 'DELETE',
        credentials: 'include',
      });
      if (!response.ok) throw new Error('Failed to delete model');
      const data = await response.json();
      if (data.success) {
        fetchModels();
      } else {
        throw new Error(data.error || 'Failed to delete model');
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to delete model');
    }
  };

  // Test Model Connectivity
  const testModel = async (id: string) => {
    setTestingModel(id);
    setTestResult(null);
    try {
      const response = await fetch(`${API_BASE_URL}/api/admin/ai-operations/models/${id}/test`, {
        method: 'POST',
        credentials: 'include',
      });
      if (!response.ok) throw new Error('Failed to test model');
      const data = await response.json();
      if (data.success) {
        setTestResult(data.data.testResult);
      } else {
        throw new Error(data.error || 'Failed to test model');
      }
    } catch (err) {
      setTestResult({ success: false, latency: 0, error: err instanceof Error ? err.message : 'Test failed' });
    } finally {
      setTestingModel(null);
    }
  };

  // Create/Update Prompt
  const savePrompt = async () => {
    try {
      const url = promptFormMode === 'create'
        ? `${API_BASE_URL}/api/admin/ai-operations/prompts`
        : `${API_BASE_URL}/api/admin/ai-operations/prompts/${promptForm.id}`;
      const method = promptFormMode === 'create' ? 'POST' : 'PUT';

      const response = await fetch(url, {
        method,
        credentials: 'include',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(promptForm),
      });

      if (!response.ok) throw new Error('Failed to save prompt');
      const data = await response.json();
      if (data.success) {
        setPromptDialogOpen(false);
        fetchPrompts();
        resetPromptForm();
      } else {
        throw new Error(data.error || 'Failed to save prompt');
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to save prompt');
    }
  };

  // Delete Prompt
  const deletePrompt = async (id: string) => {
    if (!confirm('Are you sure you want to delete this prompt template?')) return;
    try {
      const response = await fetch(`${API_BASE_URL}/api/admin/ai-operations/prompts/${id}`, {
        method: 'DELETE',
        credentials: 'include',
      });
      if (!response.ok) throw new Error('Failed to delete prompt');
      const data = await response.json();
      if (data.success) {
        fetchPrompts();
      } else {
        throw new Error(data.error || 'Failed to delete prompt');
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to delete prompt');
    }
  };

  // Save Guardrails
  const saveGuardrails = async () => {
    if (!guardrails) return;
    setGuardrailsSaving(true);
    try {
      const response = await fetch(`${API_BASE_URL}/api/admin/ai-operations/guardrails`, {
        method: 'PUT',
        credentials: 'include',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(guardrails),
      });
      if (!response.ok) throw new Error('Failed to save guardrails');
      const data = await response.json();
      if (data.success) {
        setGuardrailsEdited(false);
        setGuardrails(data.data);
      } else {
        throw new Error(data.error || 'Failed to save guardrails');
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to save guardrails');
    } finally {
      setGuardrailsSaving(false);
    }
  };

  // Save Cost Limits
  const saveCostLimits = async () => {
    if (!costLimits) return;
    try {
      const response = await fetch(`${API_BASE_URL}/api/admin/ai-operations/costs/limits`, {
        method: 'PUT',
        credentials: 'include',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(costLimits),
      });
      if (!response.ok) throw new Error('Failed to save cost limits');
      const data = await response.json();
      if (data.success) {
        setCostLimitsDialogOpen(false);
        fetchCosts();
      } else {
        throw new Error(data.error || 'Failed to save cost limits');
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to save cost limits');
    }
  };

  // Reset Forms
  const resetModelForm = () => {
    setModelForm({
      id: '',
      name: '',
      provider: 'openai',
      modelId: '',
      apiKey: '',
      apiEndpoint: '',
      maxTokens: 4096,
      temperature: 0.7,
      topP: 1,
      frequencyPenalty: 0,
      presencePenalty: 0,
      enabled: true,
      rateLimitRpm: 60,
      rateLimitTpm: 100000,
      costPerInputToken: 0,
      costPerOutputToken: 0,
      description: '',
      tags: [],
    });
    setSelectedModel(null);
  };

  const resetPromptForm = () => {
    setPromptForm({
      id: '',
      name: '',
      description: '',
      category: 'general',
      systemPrompt: '',
      userPromptTemplate: '',
      enabled: true,
      variables: [],
      modelConfig: {
        preferredModel: '',
        maxTokens: 4096,
        temperature: 0.7,
      },
    });
    setSelectedPrompt(null);
  };

  // Edit Model
  const editModel = (model: AIModel) => {
    setModelForm({
      id: model.id,
      name: model.name,
      provider: model.provider,
      modelId: model.modelId,
      apiKey: '',
      apiEndpoint: '',
      maxTokens: model.maxTokens,
      temperature: model.temperature,
      topP: 1,
      frequencyPenalty: 0,
      presencePenalty: 0,
      enabled: model.enabled,
      rateLimitRpm: model.rateLimitRpm,
      rateLimitTpm: model.rateLimitTpm,
      costPerInputToken: model.costPerInputToken || 0,
      costPerOutputToken: model.costPerOutputToken || 0,
      description: model.description,
      tags: model.tags,
    });
    setModelFormMode('edit');
    setModelDialogOpen(true);
  };

  // Edit Prompt
  const editPrompt = async (id: string) => {
    try {
      const response = await fetch(`${API_BASE_URL}/api/admin/ai-operations/prompts/${id}`, {
        credentials: 'include',
      });
      if (!response.ok) throw new Error('Failed to fetch prompt');
      const data = await response.json();
      if (data.success) {
        const prompt = data.data;
        setPromptForm({
          id: prompt.id,
          name: prompt.name || '',
          description: prompt.description || '',
          category: prompt.category || 'general',
          systemPrompt: prompt.systemPrompt || '',
          userPromptTemplate: prompt.userPromptTemplate || '',
          enabled: prompt.enabled ?? true,
          variables: prompt.variables || [],
          modelConfig: prompt.modelConfig || { preferredModel: '', maxTokens: 4096, temperature: 0.7 },
        });
        setPromptFormMode('edit');
        setPromptDialogOpen(true);
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to fetch prompt');
    }
  };

  // Initial Load
  useEffect(() => {
    const loadInitialData = async () => {
      setLoading(true);
      await fetchModels();
      setLoading(false);
    };
    loadInitialData();
  }, [fetchModels]);

  // Tab Change Effect
  useEffect(() => {
    switch (activeTab) {
      case 'models':
        fetchModels();
        break;
      case 'usage':
        fetchUsage();
        break;
      case 'prompts':
        fetchPrompts();
        break;
      case 'guardrails':
        fetchGuardrails();
        break;
      case 'costs':
        fetchCosts();
        break;
      case 'performance':
        fetchPerformance();
        break;
      case 'logs':
        fetchLogs();
        break;
    }
  }, [activeTab, fetchModels, fetchUsage, fetchPrompts, fetchGuardrails, fetchCosts, fetchPerformance, fetchLogs]);

  // Format currency
  const formatCurrency = (value: number | undefined | null) => {
    if (value === undefined || value === null) return '$0.0000';
    return new Intl.NumberFormat('en-US', {
      style: 'currency',
      currency: 'USD',
      minimumFractionDigits: 4,
      maximumFractionDigits: 4,
    }).format(value);
  };

  // Format large numbers
  const formatNumber = (value: number | undefined | null) => {
    if (value === undefined || value === null) return '0';
    if (value >= 1000000) {
      return `${(value / 1000000).toFixed(2)}M`;
    }
    if (value >= 1000) {
      return `${(value / 1000).toFixed(1)}K`;
    }
    return value.toFixed(0);
  };

  // Get provider badge color
  const getProviderColor = (provider: string) => {
    switch (provider) {
      case 'openai':
        return 'bg-green-100 text-green-800';
      case 'anthropic':
        return 'bg-orange-100 text-orange-800';
      case 'google':
        return 'bg-blue-100 text-blue-800';
      case 'mistral':
        return 'bg-purple-100 text-purple-800';
      case 'azure':
        return 'bg-sky-100 text-sky-800';
      default:
        return 'bg-gray-100 text-gray-800';
    }
  };

  if (loading) {
    return (
      <div className="container mx-auto py-6 space-y-6">
        <Skeleton className="h-8 w-64" />
        <div className="grid grid-cols-4 gap-4">
          {[1, 2, 3, 4].map((i) => (
            <Skeleton key={i} className="h-32" />
          ))}
        </div>
        <Skeleton className="h-96" />
      </div>
    );
  }

  return (
    <div className="container mx-auto py-6 space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold flex items-center gap-2">
            <Brain className="h-8 w-8 text-purple-600" />
            AI/ML Operations
          </h1>
          <p className="text-muted-foreground">
            Manage AI models, prompts, guardrails, and monitor usage
          </p>
        </div>
      </div>

      {/* Error Alert */}
      {error && (
        <Alert variant="destructive">
          <AlertTriangle className="h-4 w-4" />
          <AlertTitle>Error</AlertTitle>
          <AlertDescription>{error}</AlertDescription>
          <Button variant="ghost" size="sm" onClick={() => setError(null)} className="ml-auto">
            Dismiss
          </Button>
        </Alert>
      )}

      {/* Tabs */}
      <Tabs value={activeTab} onValueChange={setActiveTab}>
        <TabsList className="grid grid-cols-7 w-full max-w-4xl">
          <TabsTrigger value="models" className="flex items-center gap-1">
            <Bot className="h-4 w-4" />
            Models
          </TabsTrigger>
          <TabsTrigger value="usage" className="flex items-center gap-1">
            <ChartBar className="h-4 w-4" />
            Usage
          </TabsTrigger>
          <TabsTrigger value="prompts" className="flex items-center gap-1">
            <FileText className="h-4 w-4" />
            Prompts
          </TabsTrigger>
          <TabsTrigger value="guardrails" className="flex items-center gap-1">
            <Shield className="h-4 w-4" />
            Guardrails
          </TabsTrigger>
          <TabsTrigger value="costs" className="flex items-center gap-1">
            <DollarSign className="h-4 w-4" />
            Costs
          </TabsTrigger>
          <TabsTrigger value="performance" className="flex items-center gap-1">
            <Activity className="h-4 w-4" />
            Performance
          </TabsTrigger>
          <TabsTrigger value="logs" className="flex items-center gap-1">
            <History className="h-4 w-4" />
            Logs
          </TabsTrigger>
        </TabsList>

        {/* Models Tab */}
        <TabsContent value="models" className="space-y-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <Select value={modelProviderFilter} onValueChange={setModelProviderFilter}>
                <SelectTrigger className="w-40">
                  <SelectValue placeholder="Provider" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">All Providers</SelectItem>
                  <SelectItem value="openai">OpenAI</SelectItem>
                  <SelectItem value="anthropic">Anthropic</SelectItem>
                  <SelectItem value="google">Google</SelectItem>
                  <SelectItem value="mistral">Mistral</SelectItem>
                  <SelectItem value="azure">Azure</SelectItem>
                  <SelectItem value="custom">Custom</SelectItem>
                </SelectContent>
              </Select>
              <Button variant="outline" size="icon" onClick={() => fetchModels()}>
                <RefreshCw className={`h-4 w-4 ${modelsLoading ? 'animate-spin' : ''}`} />
              </Button>
            </div>
            <Dialog open={modelDialogOpen} onOpenChange={setModelDialogOpen}>
              <DialogTrigger asChild>
                <Button onClick={() => { resetModelForm(); setModelFormMode('create'); }}>
                  <Plus className="h-4 w-4 mr-2" />
                  Add Model
                </Button>
              </DialogTrigger>
              <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
                <DialogHeader>
                  <DialogTitle>{modelFormMode === 'create' ? 'Add AI Model' : 'Edit AI Model'}</DialogTitle>
                  <DialogDescription>
                    Configure an AI model for use in the platform
                  </DialogDescription>
                </DialogHeader>
                <div className="grid gap-4 py-4">
                  <div className="grid grid-cols-2 gap-4">
                    <div className="space-y-2">
                      <Label htmlFor="model-id">Model ID</Label>
                      <Input
                        id="model-id"
                        value={modelForm.id}
                        onChange={(e) => setModelForm({ ...modelForm, id: e.target.value })}
                        placeholder="e.g., gpt-4o-primary"
                        disabled={modelFormMode === 'edit'}
                      />
                    </div>
                    <div className="space-y-2">
                      <Label htmlFor="model-name">Display Name</Label>
                      <Input
                        id="model-name"
                        value={modelForm.name}
                        onChange={(e) => setModelForm({ ...modelForm, name: e.target.value })}
                        placeholder="e.g., GPT-4o Primary"
                      />
                    </div>
                  </div>
                  <div className="grid grid-cols-2 gap-4">
                    <div className="space-y-2">
                      <Label htmlFor="model-provider">Provider</Label>
                      <Select value={modelForm.provider} onValueChange={(v) => setModelForm({ ...modelForm, provider: v })}>
                        <SelectTrigger>
                          <SelectValue />
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value="openai">OpenAI</SelectItem>
                          <SelectItem value="anthropic">Anthropic</SelectItem>
                          <SelectItem value="google">Google</SelectItem>
                          <SelectItem value="mistral">Mistral</SelectItem>
                          <SelectItem value="azure">Azure</SelectItem>
                          <SelectItem value="custom">Custom</SelectItem>
                        </SelectContent>
                      </Select>
                    </div>
                    <div className="space-y-2">
                      <Label htmlFor="model-model-id">Model Identifier</Label>
                      <Input
                        id="model-model-id"
                        value={modelForm.modelId}
                        onChange={(e) => setModelForm({ ...modelForm, modelId: e.target.value })}
                        placeholder="e.g., gpt-4o"
                      />
                    </div>
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="model-api-key">API Key</Label>
                    <Input
                      id="model-api-key"
                      type="password"
                      value={modelForm.apiKey}
                      onChange={(e) => setModelForm({ ...modelForm, apiKey: e.target.value })}
                      placeholder={modelFormMode === 'edit' ? 'Leave blank to keep existing' : 'Enter API key'}
                    />
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="model-endpoint">Custom API Endpoint (optional)</Label>
                    <Input
                      id="model-endpoint"
                      value={modelForm.apiEndpoint}
                      onChange={(e) => setModelForm({ ...modelForm, apiEndpoint: e.target.value })}
                      placeholder="https://api.example.com/v1"
                    />
                  </div>
                  <div className="grid grid-cols-2 gap-4">
                    <div className="space-y-2">
                      <Label>Max Tokens: {modelForm.maxTokens}</Label>
                      <Slider
                        value={[modelForm.maxTokens]}
                        onValueChange={([v]) => setModelForm({ ...modelForm, maxTokens: v })}
                        min={100}
                        max={200000}
                        step={100}
                      />
                    </div>
                    <div className="space-y-2">
                      <Label>Temperature: {modelForm.temperature}</Label>
                      <Slider
                        value={[modelForm.temperature]}
                        onValueChange={([v]) => setModelForm({ ...modelForm, temperature: v })}
                        min={0}
                        max={2}
                        step={0.1}
                      />
                    </div>
                  </div>
                  <div className="grid grid-cols-2 gap-4">
                    <div className="space-y-2">
                      <Label htmlFor="model-rpm">Rate Limit (RPM)</Label>
                      <Input
                        id="model-rpm"
                        type="number"
                        value={modelForm.rateLimitRpm}
                        onChange={(e) => setModelForm({ ...modelForm, rateLimitRpm: parseInt(e.target.value) })}
                      />
                    </div>
                    <div className="space-y-2">
                      <Label htmlFor="model-tpm">Rate Limit (TPM)</Label>
                      <Input
                        id="model-tpm"
                        type="number"
                        value={modelForm.rateLimitTpm}
                        onChange={(e) => setModelForm({ ...modelForm, rateLimitTpm: parseInt(e.target.value) })}
                      />
                    </div>
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="model-description">Description</Label>
                    <Textarea
                      id="model-description"
                      value={modelForm.description}
                      onChange={(e) => setModelForm({ ...modelForm, description: e.target.value })}
                      placeholder="Optional description"
                    />
                  </div>
                  <div className="flex items-center space-x-2">
                    <Switch
                      checked={modelForm.enabled}
                      onCheckedChange={(v) => setModelForm({ ...modelForm, enabled: v })}
                    />
                    <Label>Enabled</Label>
                  </div>
                </div>
                <DialogFooter>
                  <Button variant="outline" onClick={() => setModelDialogOpen(false)}>
                    Cancel
                  </Button>
                  <Button onClick={saveModel}>
                    {modelFormMode === 'create' ? 'Create Model' : 'Save Changes'}
                  </Button>
                </DialogFooter>
              </DialogContent>
            </Dialog>
          </div>

          {/* Test Result */}
          {testResult && (
            <Alert variant={testResult.success ? 'default' : 'destructive'}>
              {testResult.success ? <CheckCircle className="h-4 w-4" /> : <XCircle className="h-4 w-4" />}
              <AlertTitle>{testResult.success ? 'Connection Successful' : 'Connection Failed'}</AlertTitle>
              <AlertDescription>
                {testResult.success
                  ? `Latency: ${testResult.latency}ms - Response: "${testResult.response}"`
                  : testResult.error}
              </AlertDescription>
              <Button variant="ghost" size="sm" onClick={() => setTestResult(null)} className="ml-auto">
                Dismiss
              </Button>
            </Alert>
          )}

          {/* Models Table */}
          <Card>
            <CardContent className="p-0">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Name</TableHead>
                    <TableHead>Provider</TableHead>
                    <TableHead>Model ID</TableHead>
                    <TableHead>Max Tokens</TableHead>
                    <TableHead>Temperature</TableHead>
                    <TableHead>Rate Limits</TableHead>
                    <TableHead>Status</TableHead>
                    <TableHead className="text-right">Actions</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {modelsLoading ? (
                    [...Array(5)].map((_, i) => (
                      <TableRow key={i}>
                        {[...Array(8)].map((_, j) => (
                          <TableCell key={j}><Skeleton className="h-4 w-full" /></TableCell>
                        ))}
                      </TableRow>
                    ))
                  ) : models.length === 0 ? (
                    <TableRow>
                      <TableCell colSpan={8} className="text-center text-muted-foreground py-8">
                        No models configured. Add your first AI model to get started.
                      </TableCell>
                    </TableRow>
                  ) : (
                    models.map((model) => (
                      <TableRow key={model.id}>
                        <TableCell className="font-medium">
                          <div className="flex items-center gap-2">
                            <Bot className="h-4 w-4 text-muted-foreground" />
                            {model.name}
                          </div>
                        </TableCell>
                        <TableCell>
                          <Badge className={getProviderColor(model.provider)}>
                            {model.provider}
                          </Badge>
                        </TableCell>
                        <TableCell className="font-mono text-sm">{model.modelId}</TableCell>
                        <TableCell>{formatNumber(model.maxTokens)}</TableCell>
                        <TableCell>{model.temperature}</TableCell>
                        <TableCell className="text-xs">
                          <div>{model.rateLimitRpm} RPM</div>
                          <div className="text-muted-foreground">{formatNumber(model.rateLimitTpm)} TPM</div>
                        </TableCell>
                        <TableCell>
                          <Badge variant={model.enabled ? 'default' : 'secondary'}>
                            {model.enabled ? 'Active' : 'Disabled'}
                          </Badge>
                        </TableCell>
                        <TableCell className="text-right">
                          <DropdownMenu>
                            <DropdownMenuTrigger asChild>
                              <Button variant="ghost" size="icon">
                                <MoreVertical className="h-4 w-4" />
                              </Button>
                            </DropdownMenuTrigger>
                            <DropdownMenuContent align="end">
                              <DropdownMenuItem onClick={() => editModel(model)}>
                                <Edit className="h-4 w-4 mr-2" />
                                Edit
                              </DropdownMenuItem>
                              <DropdownMenuItem
                                onClick={() => testModel(model.id)}
                                disabled={testingModel === model.id}
                              >
                                {testingModel === model.id ? (
                                  <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                                ) : (
                                  <Zap className="h-4 w-4 mr-2" />
                                )}
                                Test Connection
                              </DropdownMenuItem>
                              <DropdownMenuSeparator />
                              <DropdownMenuItem
                                onClick={() => deleteModel(model.id)}
                                className="text-red-600"
                              >
                                <Trash2 className="h-4 w-4 mr-2" />
                                Delete
                              </DropdownMenuItem>
                            </DropdownMenuContent>
                          </DropdownMenu>
                        </TableCell>
                      </TableRow>
                    ))
                  )}
                </TableBody>
              </Table>
            </CardContent>
          </Card>
        </TabsContent>

        {/* Usage Tab */}
        <TabsContent value="usage" className="space-y-4">
          <div className="flex items-center justify-between">
            <Select value={usagePeriod} onValueChange={setUsagePeriod}>
              <SelectTrigger className="w-40">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="day">Today</SelectItem>
                <SelectItem value="week">This Week</SelectItem>
                <SelectItem value="month">This Month</SelectItem>
                <SelectItem value="quarter">This Quarter</SelectItem>
                <SelectItem value="year">This Year</SelectItem>
              </SelectContent>
            </Select>
            <Button variant="outline" size="icon" onClick={() => fetchUsage()}>
              <RefreshCw className={`h-4 w-4 ${usageLoading ? 'animate-spin' : ''}`} />
            </Button>
          </div>

          {/* Summary Cards */}
          <div className="grid grid-cols-4 gap-4">
            <Card>
              <CardHeader className="pb-2">
                <CardTitle className="text-sm font-medium text-muted-foreground">Total Requests</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold">
                  {usageLoading ? <Skeleton className="h-8 w-24" /> : formatNumber(usageSummary?.totalRequests || 0)}
                </div>
              </CardContent>
            </Card>
            <Card>
              <CardHeader className="pb-2">
                <CardTitle className="text-sm font-medium text-muted-foreground">Total Tokens</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold">
                  {usageLoading ? <Skeleton className="h-8 w-24" /> : formatNumber(usageSummary?.totalTokens || 0)}
                </div>
              </CardContent>
            </Card>
            <Card>
              <CardHeader className="pb-2">
                <CardTitle className="text-sm font-medium text-muted-foreground">Estimated Cost</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold">
                  {usageLoading ? <Skeleton className="h-8 w-24" /> : formatCurrency(usageSummary?.estimatedCost || 0)}
                </div>
              </CardContent>
            </Card>
            <Card>
              <CardHeader className="pb-2">
                <CardTitle className="text-sm font-medium text-muted-foreground">Success Rate</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold">
                  {usageLoading ? <Skeleton className="h-8 w-24" /> : `${(usageSummary?.successRate || 0).toFixed(1)}%`}
                </div>
              </CardContent>
            </Card>
          </div>

          {/* Usage by Organization */}
          <Card>
            <CardHeader>
              <CardTitle>Usage by Organization</CardTitle>
            </CardHeader>
            <CardContent>
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Organization</TableHead>
                    <TableHead className="text-right">Requests</TableHead>
                    <TableHead className="text-right">Tokens</TableHead>
                    <TableHead className="text-right">Estimated Cost</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {usageLoading ? (
                    [...Array(5)].map((_, i) => (
                      <TableRow key={i}>
                        {[...Array(4)].map((_, j) => (
                          <TableCell key={j}><Skeleton className="h-4 w-full" /></TableCell>
                        ))}
                      </TableRow>
                    ))
                  ) : orgUsage.length === 0 ? (
                    <TableRow>
                      <TableCell colSpan={4} className="text-center text-muted-foreground">
                        No organization usage data
                      </TableCell>
                    </TableRow>
                  ) : (
                    orgUsage.map((org) => (
                      <TableRow key={org.organizationId}>
                        <TableCell className="font-medium">{org.organizationName}</TableCell>
                        <TableCell className="text-right">{formatNumber(org.totalRequests)}</TableCell>
                        <TableCell className="text-right">{formatNumber(org.totalTokens)}</TableCell>
                        <TableCell className="text-right">{formatCurrency(org.estimatedCost)}</TableCell>
                      </TableRow>
                    ))
                  )}
                </TableBody>
              </Table>
            </CardContent>
          </Card>

          {/* Usage by Model */}
          <Card>
            <CardHeader>
              <CardTitle>Usage by Model</CardTitle>
            </CardHeader>
            <CardContent>
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Model</TableHead>
                    <TableHead className="text-right">Requests</TableHead>
                    <TableHead className="text-right">Tokens</TableHead>
                    <TableHead className="text-right">Avg Latency</TableHead>
                    <TableHead className="text-right">Success Rate</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {usageLoading ? (
                    [...Array(5)].map((_, i) => (
                      <TableRow key={i}>
                        {[...Array(5)].map((_, j) => (
                          <TableCell key={j}><Skeleton className="h-4 w-full" /></TableCell>
                        ))}
                      </TableRow>
                    ))
                  ) : modelUsage.length === 0 ? (
                    <TableRow>
                      <TableCell colSpan={5} className="text-center text-muted-foreground">
                        No model usage data
                      </TableCell>
                    </TableRow>
                  ) : (
                    modelUsage.map((model) => (
                      <TableRow key={model.modelId}>
                        <TableCell className="font-medium font-mono">{model.modelId}</TableCell>
                        <TableCell className="text-right">{formatNumber(model.totalRequests)}</TableCell>
                        <TableCell className="text-right">{formatNumber(model.totalTokens)}</TableCell>
                        <TableCell className="text-right">{model.averageLatency.toFixed(0)}ms</TableCell>
                        <TableCell className="text-right">
                          <Badge variant={model.successRate >= 95 ? 'default' : model.successRate >= 90 ? 'secondary' : 'destructive'}>
                            {model.successRate.toFixed(1)}%
                          </Badge>
                        </TableCell>
                      </TableRow>
                    ))
                  )}
                </TableBody>
              </Table>
            </CardContent>
          </Card>

          {/* Usage by Feature */}
          <Card>
            <CardHeader>
              <CardTitle>Usage by Feature</CardTitle>
            </CardHeader>
            <CardContent>
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Feature</TableHead>
                    <TableHead>Category</TableHead>
                    <TableHead className="text-right">Requests</TableHead>
                    <TableHead className="text-right">Tokens</TableHead>
                    <TableHead className="text-right">Success Rate</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {usageLoading ? (
                    [...Array(5)].map((_, i) => (
                      <TableRow key={i}>
                        {[...Array(5)].map((_, j) => (
                          <TableCell key={j}><Skeleton className="h-4 w-full" /></TableCell>
                        ))}
                      </TableRow>
                    ))
                  ) : featureUsage.length === 0 ? (
                    <TableRow>
                      <TableCell colSpan={5} className="text-center text-muted-foreground">
                        No feature usage data
                      </TableCell>
                    </TableRow>
                  ) : (
                    featureUsage.map((feature) => (
                      <TableRow key={feature.featureId}>
                        <TableCell className="font-medium">{feature.featureName}</TableCell>
                        <TableCell>
                          <Badge variant="outline">{feature.category}</Badge>
                        </TableCell>
                        <TableCell className="text-right">{formatNumber(feature.totalRequests)}</TableCell>
                        <TableCell className="text-right">{formatNumber(feature.totalTokens)}</TableCell>
                        <TableCell className="text-right">
                          <Badge variant={feature.successRate >= 95 ? 'default' : feature.successRate >= 90 ? 'secondary' : 'destructive'}>
                            {feature.successRate.toFixed(1)}%
                          </Badge>
                        </TableCell>
                      </TableRow>
                    ))
                  )}
                </TableBody>
              </Table>
            </CardContent>
          </Card>
        </TabsContent>

        {/* Prompts Tab */}
        <TabsContent value="prompts" className="space-y-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <Select value={promptCategoryFilter} onValueChange={setPromptCategoryFilter}>
                <SelectTrigger className="w-40">
                  <SelectValue placeholder="Category" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">All Categories</SelectItem>
                  <SelectItem value="general">General</SelectItem>
                  <SelectItem value="summarization">Summarization</SelectItem>
                  <SelectItem value="transcription">Transcription</SelectItem>
                  <SelectItem value="analysis">Analysis</SelectItem>
                  <SelectItem value="generation">Generation</SelectItem>
                </SelectContent>
              </Select>
              <Button variant="outline" size="icon" onClick={() => fetchPrompts()}>
                <RefreshCw className={`h-4 w-4 ${promptsLoading ? 'animate-spin' : ''}`} />
              </Button>
            </div>
            <Dialog open={promptDialogOpen} onOpenChange={setPromptDialogOpen}>
              <DialogTrigger asChild>
                <Button onClick={() => { resetPromptForm(); setPromptFormMode('create'); }}>
                  <Plus className="h-4 w-4 mr-2" />
                  Add Template
                </Button>
              </DialogTrigger>
              <DialogContent className="max-w-3xl max-h-[90vh] overflow-y-auto">
                <DialogHeader>
                  <DialogTitle>{promptFormMode === 'create' ? 'Create Prompt Template' : 'Edit Prompt Template'}</DialogTitle>
                  <DialogDescription>
                    Define a reusable prompt template for AI operations
                  </DialogDescription>
                </DialogHeader>
                <div className="grid gap-4 py-4">
                  <div className="grid grid-cols-2 gap-4">
                    <div className="space-y-2">
                      <Label htmlFor="prompt-id">Template ID</Label>
                      <Input
                        id="prompt-id"
                        value={promptForm.id}
                        onChange={(e) => setPromptForm({ ...promptForm, id: e.target.value })}
                        placeholder="e.g., meeting-summary"
                        disabled={promptFormMode === 'edit'}
                      />
                    </div>
                    <div className="space-y-2">
                      <Label htmlFor="prompt-name">Name</Label>
                      <Input
                        id="prompt-name"
                        value={promptForm.name}
                        onChange={(e) => setPromptForm({ ...promptForm, name: e.target.value })}
                        placeholder="e.g., Meeting Summary Generator"
                      />
                    </div>
                  </div>
                  <div className="grid grid-cols-2 gap-4">
                    <div className="space-y-2">
                      <Label htmlFor="prompt-category">Category</Label>
                      <Select value={promptForm.category} onValueChange={(v) => setPromptForm({ ...promptForm, category: v })}>
                        <SelectTrigger>
                          <SelectValue />
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value="general">General</SelectItem>
                          <SelectItem value="summarization">Summarization</SelectItem>
                          <SelectItem value="transcription">Transcription</SelectItem>
                          <SelectItem value="analysis">Analysis</SelectItem>
                          <SelectItem value="generation">Generation</SelectItem>
                        </SelectContent>
                      </Select>
                    </div>
                    <div className="space-y-2">
                      <Label htmlFor="prompt-description">Description</Label>
                      <Input
                        id="prompt-description"
                        value={promptForm.description}
                        onChange={(e) => setPromptForm({ ...promptForm, description: e.target.value })}
                        placeholder="Brief description"
                      />
                    </div>
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="prompt-system">System Prompt</Label>
                    <Textarea
                      id="prompt-system"
                      value={promptForm.systemPrompt}
                      onChange={(e) => setPromptForm({ ...promptForm, systemPrompt: e.target.value })}
                      placeholder="Enter the system prompt..."
                      className="min-h-[200px] font-mono text-sm"
                    />
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="prompt-user">User Prompt Template (optional)</Label>
                    <Textarea
                      id="prompt-user"
                      value={promptForm.userPromptTemplate}
                      onChange={(e) => setPromptForm({ ...promptForm, userPromptTemplate: e.target.value })}
                      placeholder="Enter the user prompt template with {{variables}}..."
                      className="min-h-[100px] font-mono text-sm"
                    />
                  </div>
                  <div className="flex items-center space-x-2">
                    <Switch
                      checked={promptForm.enabled}
                      onCheckedChange={(v) => setPromptForm({ ...promptForm, enabled: v })}
                    />
                    <Label>Enabled</Label>
                  </div>
                </div>
                <DialogFooter>
                  <Button variant="outline" onClick={() => setPromptDialogOpen(false)}>
                    Cancel
                  </Button>
                  <Button onClick={savePrompt}>
                    {promptFormMode === 'create' ? 'Create Template' : 'Save Changes'}
                  </Button>
                </DialogFooter>
              </DialogContent>
            </Dialog>
          </div>

          {/* Prompts Table */}
          <Card>
            <CardContent className="p-0">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Name</TableHead>
                    <TableHead>Category</TableHead>
                    <TableHead>Version</TableHead>
                    <TableHead>Variables</TableHead>
                    <TableHead>Status</TableHead>
                    <TableHead className="text-right">Actions</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {promptsLoading ? (
                    [...Array(5)].map((_, i) => (
                      <TableRow key={i}>
                        {[...Array(6)].map((_, j) => (
                          <TableCell key={j}><Skeleton className="h-4 w-full" /></TableCell>
                        ))}
                      </TableRow>
                    ))
                  ) : prompts.length === 0 ? (
                    <TableRow>
                      <TableCell colSpan={6} className="text-center text-muted-foreground py-8">
                        No prompt templates. Create your first template to get started.
                      </TableCell>
                    </TableRow>
                  ) : (
                    prompts.map((prompt) => (
                      <TableRow key={prompt.id}>
                        <TableCell>
                          <div className="font-medium">{prompt.name}</div>
                          <div className="text-sm text-muted-foreground">{prompt.description}</div>
                        </TableCell>
                        <TableCell>
                          <Badge variant="outline">{prompt.category}</Badge>
                        </TableCell>
                        <TableCell>v{prompt.version}</TableCell>
                        <TableCell>{prompt.variableCount}</TableCell>
                        <TableCell>
                          <Badge variant={prompt.enabled ? 'default' : 'secondary'}>
                            {prompt.enabled ? 'Active' : 'Disabled'}
                          </Badge>
                        </TableCell>
                        <TableCell className="text-right">
                          <DropdownMenu>
                            <DropdownMenuTrigger asChild>
                              <Button variant="ghost" size="icon">
                                <MoreVertical className="h-4 w-4" />
                              </Button>
                            </DropdownMenuTrigger>
                            <DropdownMenuContent align="end">
                              <DropdownMenuItem onClick={() => editPrompt(prompt.id)}>
                                <Edit className="h-4 w-4 mr-2" />
                                Edit
                              </DropdownMenuItem>
                              <DropdownMenuSeparator />
                              <DropdownMenuItem
                                onClick={() => deletePrompt(prompt.id)}
                                className="text-red-600"
                              >
                                <Trash2 className="h-4 w-4 mr-2" />
                                Delete
                              </DropdownMenuItem>
                            </DropdownMenuContent>
                          </DropdownMenu>
                        </TableCell>
                      </TableRow>
                    ))
                  )}
                </TableBody>
              </Table>
            </CardContent>
          </Card>
        </TabsContent>

        {/* Guardrails Tab */}
        <TabsContent value="guardrails" className="space-y-4">
          <div className="flex items-center justify-between">
            <div>
              <h2 className="text-xl font-semibold">AI Guardrails Configuration</h2>
              <p className="text-muted-foreground">Configure safety and rate limiting controls</p>
            </div>
            <div className="flex items-center gap-2">
              <Button variant="outline" size="icon" onClick={() => fetchGuardrails()}>
                <RefreshCw className={`h-4 w-4 ${guardrailsLoading ? 'animate-spin' : ''}`} />
              </Button>
              <Button
                onClick={saveGuardrails}
                disabled={!guardrailsEdited || guardrailsSaving}
              >
                {guardrailsSaving ? (
                  <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                ) : null}
                Save Changes
              </Button>
            </div>
          </div>

          {guardrailsLoading ? (
            <div className="grid grid-cols-2 gap-4">
              {[1, 2, 3, 4].map((i) => (
                <Skeleton key={i} className="h-64" />
              ))}
            </div>
          ) : guardrails ? (
            <div className="grid grid-cols-2 gap-4">
              {/* Content Filtering */}
              <Card>
                <CardHeader>
                  <CardTitle className="flex items-center gap-2">
                    <Shield className="h-5 w-5" />
                    Content Filtering
                  </CardTitle>
                </CardHeader>
                <CardContent className="space-y-4">
                  <div className="flex items-center justify-between">
                    <Label>Enable Content Filtering</Label>
                    <Switch
                      checked={guardrails.contentFiltering.enabled}
                      onCheckedChange={(v) => {
                        setGuardrails({
                          ...guardrails,
                          contentFiltering: { ...guardrails.contentFiltering, enabled: v }
                        });
                        setGuardrailsEdited(true);
                      }}
                    />
                  </div>
                  <Separator />
                  <div className="space-y-2">
                    {[
                      { key: 'blockProfanity', label: 'Block Profanity' },
                      { key: 'blockHateSpeech', label: 'Block Hate Speech' },
                      { key: 'blockViolence', label: 'Block Violence' },
                      { key: 'blockSexualContent', label: 'Block Sexual Content' },
                      { key: 'blockPII', label: 'Block PII' },
                    ].map(({ key, label }) => (
                      <div key={key} className="flex items-center justify-between">
                        <Label className="text-sm">{label}</Label>
                        <Switch
                          checked={(guardrails.contentFiltering as unknown as Record<string, boolean>)[key]}
                          onCheckedChange={(v) => {
                            setGuardrails({
                              ...guardrails,
                              contentFiltering: { ...guardrails.contentFiltering, [key]: v }
                            });
                            setGuardrailsEdited(true);
                          }}
                          disabled={!guardrails.contentFiltering.enabled}
                        />
                      </div>
                    ))}
                  </div>
                </CardContent>
              </Card>

              {/* Input Validation */}
              <Card>
                <CardHeader>
                  <CardTitle className="flex items-center gap-2">
                    <FileText className="h-5 w-5" />
                    Input Validation
                  </CardTitle>
                </CardHeader>
                <CardContent className="space-y-4">
                  <div className="flex items-center justify-between">
                    <Label>Enable Input Validation</Label>
                    <Switch
                      checked={guardrails.inputValidation.enabled}
                      onCheckedChange={(v) => {
                        setGuardrails({
                          ...guardrails,
                          inputValidation: { ...guardrails.inputValidation, enabled: v }
                        });
                        setGuardrailsEdited(true);
                      }}
                    />
                  </div>
                  <Separator />
                  <div className="space-y-4">
                    <div className="space-y-2">
                      <Label>Max Input Length</Label>
                      <Input
                        type="number"
                        value={guardrails.inputValidation.maxInputLength}
                        onChange={(e) => {
                          setGuardrails({
                            ...guardrails,
                            inputValidation: { ...guardrails.inputValidation, maxInputLength: parseInt(e.target.value) }
                          });
                          setGuardrailsEdited(true);
                        }}
                        disabled={!guardrails.inputValidation.enabled}
                      />
                    </div>
                    <div className="space-y-2">
                      <Label>Max Conversation Turns</Label>
                      <Input
                        type="number"
                        value={guardrails.inputValidation.maxConversationTurns}
                        onChange={(e) => {
                          setGuardrails({
                            ...guardrails,
                            inputValidation: { ...guardrails.inputValidation, maxConversationTurns: parseInt(e.target.value) }
                          });
                          setGuardrailsEdited(true);
                        }}
                        disabled={!guardrails.inputValidation.enabled}
                      />
                    </div>
                  </div>
                </CardContent>
              </Card>

              {/* Rate Limiting */}
              <Card>
                <CardHeader>
                  <CardTitle className="flex items-center gap-2">
                    <Zap className="h-5 w-5" />
                    Rate Limiting
                  </CardTitle>
                </CardHeader>
                <CardContent className="space-y-4">
                  <div className="flex items-center justify-between">
                    <Label>Enable Rate Limiting</Label>
                    <Switch
                      checked={guardrails.rateLimiting.enabled}
                      onCheckedChange={(v) => {
                        setGuardrails({
                          ...guardrails,
                          rateLimiting: { ...guardrails.rateLimiting, enabled: v }
                        });
                        setGuardrailsEdited(true);
                      }}
                    />
                  </div>
                  <Separator />
                  <div className="grid grid-cols-2 gap-4">
                    <div className="space-y-2">
                      <Label>Requests/Minute</Label>
                      <Input
                        type="number"
                        value={guardrails.rateLimiting.requestsPerMinute}
                        onChange={(e) => {
                          setGuardrails({
                            ...guardrails,
                            rateLimiting: { ...guardrails.rateLimiting, requestsPerMinute: parseInt(e.target.value) }
                          });
                          setGuardrailsEdited(true);
                        }}
                        disabled={!guardrails.rateLimiting.enabled}
                      />
                    </div>
                    <div className="space-y-2">
                      <Label>Tokens/Minute</Label>
                      <Input
                        type="number"
                        value={guardrails.rateLimiting.tokensPerMinute}
                        onChange={(e) => {
                          setGuardrails({
                            ...guardrails,
                            rateLimiting: { ...guardrails.rateLimiting, tokensPerMinute: parseInt(e.target.value) }
                          });
                          setGuardrailsEdited(true);
                        }}
                        disabled={!guardrails.rateLimiting.enabled}
                      />
                    </div>
                    <div className="space-y-2">
                      <Label>Requests/Day</Label>
                      <Input
                        type="number"
                        value={guardrails.rateLimiting.requestsPerDay}
                        onChange={(e) => {
                          setGuardrails({
                            ...guardrails,
                            rateLimiting: { ...guardrails.rateLimiting, requestsPerDay: parseInt(e.target.value) }
                          });
                          setGuardrailsEdited(true);
                        }}
                        disabled={!guardrails.rateLimiting.enabled}
                      />
                    </div>
                    <div className="space-y-2">
                      <Label>Tokens/Day</Label>
                      <Input
                        type="number"
                        value={guardrails.rateLimiting.tokensPerDay}
                        onChange={(e) => {
                          setGuardrails({
                            ...guardrails,
                            rateLimiting: { ...guardrails.rateLimiting, tokensPerDay: parseInt(e.target.value) }
                          });
                          setGuardrailsEdited(true);
                        }}
                        disabled={!guardrails.rateLimiting.enabled}
                      />
                    </div>
                  </div>
                </CardContent>
              </Card>

              {/* Monitoring */}
              <Card>
                <CardHeader>
                  <CardTitle className="flex items-center gap-2">
                    <Activity className="h-5 w-5" />
                    Monitoring
                  </CardTitle>
                </CardHeader>
                <CardContent className="space-y-4">
                  <div className="space-y-2">
                    {[
                      { key: 'logAllRequests', label: 'Log All Requests' },
                      { key: 'alertOnHighUsage', label: 'Alert on High Usage' },
                      { key: 'alertOnErrors', label: 'Alert on Errors' },
                    ].map(({ key, label }) => (
                      <div key={key} className="flex items-center justify-between">
                        <Label className="text-sm">{label}</Label>
                        <Switch
                          checked={(guardrails.monitoring as unknown as Record<string, boolean>)[key]}
                          onCheckedChange={(v) => {
                            setGuardrails({
                              ...guardrails,
                              monitoring: { ...guardrails.monitoring, [key]: v }
                            });
                            setGuardrailsEdited(true);
                          }}
                        />
                      </div>
                    ))}
                  </div>
                  <Separator />
                  <div className="space-y-2">
                    <Label>Alert Threshold (%)</Label>
                    <Slider
                      value={[guardrails.monitoring.alertThresholdPercent]}
                      onValueChange={([v]) => {
                        setGuardrails({
                          ...guardrails,
                          monitoring: { ...guardrails.monitoring, alertThresholdPercent: v }
                        });
                        setGuardrailsEdited(true);
                      }}
                      min={0}
                      max={100}
                      step={5}
                    />
                    <p className="text-sm text-muted-foreground">
                      Current: {guardrails.monitoring.alertThresholdPercent}%
                    </p>
                  </div>
                </CardContent>
              </Card>
            </div>
          ) : null}
        </TabsContent>

        {/* Costs Tab */}
        <TabsContent value="costs" className="space-y-4">
          <div className="flex items-center justify-between">
            <Select value={costPeriod} onValueChange={setCostPeriod}>
              <SelectTrigger className="w-40">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="day">Today</SelectItem>
                <SelectItem value="week">This Week</SelectItem>
                <SelectItem value="month">This Month</SelectItem>
                <SelectItem value="quarter">This Quarter</SelectItem>
                <SelectItem value="year">This Year</SelectItem>
              </SelectContent>
            </Select>
            <div className="flex items-center gap-2">
              <Button variant="outline" size="icon" onClick={() => fetchCosts()}>
                <RefreshCw className={`h-4 w-4 ${costsLoading ? 'animate-spin' : ''}`} />
              </Button>
              <Dialog open={costLimitsDialogOpen} onOpenChange={setCostLimitsDialogOpen}>
                <DialogTrigger asChild>
                  <Button variant="outline">
                    <Settings2 className="h-4 w-4 mr-2" />
                    Cost Limits
                  </Button>
                </DialogTrigger>
                <DialogContent>
                  <DialogHeader>
                    <DialogTitle>Configure Cost Limits</DialogTitle>
                    <DialogDescription>
                      Set spending limits for AI operations
                    </DialogDescription>
                  </DialogHeader>
                  {costLimits && (
                    <div className="grid gap-4 py-4">
                      <div className="grid grid-cols-2 gap-4">
                        <div className="space-y-2">
                          <Label>Global Daily Limit ($)</Label>
                          <Input
                            type="number"
                            value={costLimits.globalDailyLimit || ''}
                            onChange={(e) => setCostLimits({
                              ...costLimits,
                              globalDailyLimit: e.target.value ? parseFloat(e.target.value) : undefined
                            })}
                            placeholder="No limit"
                          />
                        </div>
                        <div className="space-y-2">
                          <Label>Global Monthly Limit ($)</Label>
                          <Input
                            type="number"
                            value={costLimits.globalMonthlyLimit || ''}
                            onChange={(e) => setCostLimits({
                              ...costLimits,
                              globalMonthlyLimit: e.target.value ? parseFloat(e.target.value) : undefined
                            })}
                            placeholder="No limit"
                          />
                        </div>
                      </div>
                      <div className="grid grid-cols-2 gap-4">
                        <div className="space-y-2">
                          <Label>Per Org Daily Limit ($)</Label>
                          <Input
                            type="number"
                            value={costLimits.perOrganizationDailyLimit || ''}
                            onChange={(e) => setCostLimits({
                              ...costLimits,
                              perOrganizationDailyLimit: e.target.value ? parseFloat(e.target.value) : undefined
                            })}
                            placeholder="No limit"
                          />
                        </div>
                        <div className="space-y-2">
                          <Label>Per Org Monthly Limit ($)</Label>
                          <Input
                            type="number"
                            value={costLimits.perOrganizationMonthlyLimit || ''}
                            onChange={(e) => setCostLimits({
                              ...costLimits,
                              perOrganizationMonthlyLimit: e.target.value ? parseFloat(e.target.value) : undefined
                            })}
                            placeholder="No limit"
                          />
                        </div>
                      </div>
                      <div className="space-y-2">
                        <Label>Hard Limit Action</Label>
                        <Select
                          value={costLimits.hardLimitAction}
                          onValueChange={(v: 'block' | 'throttle' | 'notify') => setCostLimits({
                            ...costLimits,
                            hardLimitAction: v
                          })}
                        >
                          <SelectTrigger>
                            <SelectValue />
                          </SelectTrigger>
                          <SelectContent>
                            <SelectItem value="block">Block Requests</SelectItem>
                            <SelectItem value="throttle">Throttle Requests</SelectItem>
                            <SelectItem value="notify">Notify Only</SelectItem>
                          </SelectContent>
                        </Select>
                      </div>
                    </div>
                  )}
                  <DialogFooter>
                    <Button variant="outline" onClick={() => setCostLimitsDialogOpen(false)}>
                      Cancel
                    </Button>
                    <Button onClick={saveCostLimits}>Save Limits</Button>
                  </DialogFooter>
                </DialogContent>
              </Dialog>
            </div>
          </div>

          {/* Cost Summary Cards */}
          <div className="grid grid-cols-4 gap-4">
            <Card>
              <CardHeader className="pb-2">
                <CardTitle className="text-sm font-medium text-muted-foreground">Total Cost</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold">
                  {costsLoading ? <Skeleton className="h-8 w-24" /> : formatCurrency(costSummary?.totalCost || 0)}
                </div>
              </CardContent>
            </Card>
            <Card>
              <CardHeader className="pb-2">
                <CardTitle className="text-sm font-medium text-muted-foreground">Input Tokens</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold">
                  {costsLoading ? <Skeleton className="h-8 w-24" /> : formatNumber(costSummary?.totalInputTokens || 0)}
                </div>
              </CardContent>
            </Card>
            <Card>
              <CardHeader className="pb-2">
                <CardTitle className="text-sm font-medium text-muted-foreground">Output Tokens</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold">
                  {costsLoading ? <Skeleton className="h-8 w-24" /> : formatNumber(costSummary?.totalOutputTokens || 0)}
                </div>
              </CardContent>
            </Card>
            <Card>
              <CardHeader className="pb-2">
                <CardTitle className="text-sm font-medium text-muted-foreground">Avg Cost/Request</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold">
                  {costsLoading ? <Skeleton className="h-8 w-24" /> : formatCurrency(costSummary?.averageCostPerRequest || 0)}
                </div>
              </CardContent>
            </Card>
          </div>

          {/* Cost by Model */}
          <Card>
            <CardHeader>
              <CardTitle>Cost by Model</CardTitle>
            </CardHeader>
            <CardContent>
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Model</TableHead>
                    <TableHead className="text-right">Input Tokens</TableHead>
                    <TableHead className="text-right">Output Tokens</TableHead>
                    <TableHead className="text-right">Cost</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {costsLoading ? (
                    [...Array(5)].map((_, i) => (
                      <TableRow key={i}>
                        {[...Array(4)].map((_, j) => (
                          <TableCell key={j}><Skeleton className="h-4 w-full" /></TableCell>
                        ))}
                      </TableRow>
                    ))
                  ) : costByModel.length === 0 ? (
                    <TableRow>
                      <TableCell colSpan={4} className="text-center text-muted-foreground">
                        No cost data available
                      </TableCell>
                    </TableRow>
                  ) : (
                    costByModel.map((model) => (
                      <TableRow key={model.model}>
                        <TableCell className="font-medium font-mono">{model.model}</TableCell>
                        <TableCell className="text-right">{formatNumber(model.inputTokens)}</TableCell>
                        <TableCell className="text-right">{formatNumber(model.outputTokens)}</TableCell>
                        <TableCell className="text-right">{formatCurrency(model.cost)}</TableCell>
                      </TableRow>
                    ))
                  )}
                </TableBody>
              </Table>
            </CardContent>
          </Card>
        </TabsContent>

        {/* Performance Tab */}
        <TabsContent value="performance" className="space-y-4">
          <div className="flex items-center justify-between">
            <Select value={performancePeriod} onValueChange={setPerformancePeriod}>
              <SelectTrigger className="w-40">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="day">Today</SelectItem>
                <SelectItem value="week">This Week</SelectItem>
                <SelectItem value="month">This Month</SelectItem>
              </SelectContent>
            </Select>
            <Button variant="outline" size="icon" onClick={() => fetchPerformance()}>
              <RefreshCw className={`h-4 w-4 ${performanceLoading ? 'animate-spin' : ''}`} />
            </Button>
          </div>

          {/* Performance Summary Cards */}
          <div className="grid grid-cols-4 gap-4">
            <Card>
              <CardHeader className="pb-2">
                <CardTitle className="text-sm font-medium text-muted-foreground">Success Rate</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold">
                  {performanceLoading ? <Skeleton className="h-8 w-24" /> : `${(performanceSummary?.successRate || 0).toFixed(1)}%`}
                </div>
              </CardContent>
            </Card>
            <Card>
              <CardHeader className="pb-2">
                <CardTitle className="text-sm font-medium text-muted-foreground">P50 Latency</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold">
                  {performanceLoading ? <Skeleton className="h-8 w-24" /> : `${(performanceSummary?.p50Latency || 0).toFixed(0)}ms`}
                </div>
              </CardContent>
            </Card>
            <Card>
              <CardHeader className="pb-2">
                <CardTitle className="text-sm font-medium text-muted-foreground">P95 Latency</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold">
                  {performanceLoading ? <Skeleton className="h-8 w-24" /> : `${(performanceSummary?.p95Latency || 0).toFixed(0)}ms`}
                </div>
              </CardContent>
            </Card>
            <Card>
              <CardHeader className="pb-2">
                <CardTitle className="text-sm font-medium text-muted-foreground">P99 Latency</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold">
                  {performanceLoading ? <Skeleton className="h-8 w-24" /> : `${(performanceSummary?.p99Latency || 0).toFixed(0)}ms`}
                </div>
              </CardContent>
            </Card>
          </div>

          {/* Performance by Model */}
          <Card>
            <CardHeader>
              <CardTitle>Performance by Model</CardTitle>
            </CardHeader>
            <CardContent>
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Model</TableHead>
                    <TableHead className="text-right">Requests</TableHead>
                    <TableHead className="text-right">Success</TableHead>
                    <TableHead className="text-right">Errors</TableHead>
                    <TableHead className="text-right">Avg Latency</TableHead>
                    <TableHead className="text-right">Success Rate</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {performanceLoading ? (
                    [...Array(5)].map((_, i) => (
                      <TableRow key={i}>
                        {[...Array(6)].map((_, j) => (
                          <TableCell key={j}><Skeleton className="h-4 w-full" /></TableCell>
                        ))}
                      </TableRow>
                    ))
                  ) : modelPerformance.length === 0 ? (
                    <TableRow>
                      <TableCell colSpan={6} className="text-center text-muted-foreground">
                        No performance data available
                      </TableCell>
                    </TableRow>
                  ) : (
                    modelPerformance.map((model) => (
                      <TableRow key={model.model}>
                        <TableCell className="font-medium font-mono">{model.model}</TableCell>
                        <TableCell className="text-right">{formatNumber(model.requestCount)}</TableCell>
                        <TableCell className="text-right text-green-600">{formatNumber(model.successCount)}</TableCell>
                        <TableCell className="text-right text-red-600">{formatNumber(model.errorCount)}</TableCell>
                        <TableCell className="text-right">{model.averageLatency.toFixed(0)}ms</TableCell>
                        <TableCell className="text-right">
                          <Badge variant={model.successRate >= 95 ? 'default' : model.successRate >= 90 ? 'secondary' : 'destructive'}>
                            {model.successRate.toFixed(1)}%
                          </Badge>
                        </TableCell>
                      </TableRow>
                    ))
                  )}
                </TableBody>
              </Table>
            </CardContent>
          </Card>

          {/* Error Breakdown */}
          {Object.keys(errorBreakdown).length > 0 && (
            <Card>
              <CardHeader>
                <CardTitle>Error Breakdown</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="grid grid-cols-4 gap-4">
                  {Object.entries(errorBreakdown).map(([errorType, count]) => (
                    <Card key={errorType}>
                      <CardContent className="pt-4">
                        <div className="text-sm font-medium text-muted-foreground">{errorType}</div>
                        <div className="text-2xl font-bold text-red-600">{count}</div>
                      </CardContent>
                    </Card>
                  ))}
                </div>
              </CardContent>
            </Card>
          )}
        </TabsContent>

        {/* Logs Tab */}
        <TabsContent value="logs" className="space-y-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <Select value={logsStatusFilter} onValueChange={(v) => { setLogsStatusFilter(v); setLogsPage(1); }}>
                <SelectTrigger className="w-32">
                  <SelectValue placeholder="Status" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">All</SelectItem>
                  <SelectItem value="success">Success</SelectItem>
                  <SelectItem value="error">Errors</SelectItem>
                </SelectContent>
              </Select>
              <Button variant="outline" size="icon" onClick={() => fetchLogs()}>
                <RefreshCw className={`h-4 w-4 ${logsLoading ? 'animate-spin' : ''}`} />
              </Button>
            </div>
            <div className="text-sm text-muted-foreground">
              Showing {logs.length} of {logsTotal} logs
            </div>
          </div>

          {/* Logs Table */}
          <Card>
            <CardContent className="p-0">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Time</TableHead>
                    <TableHead>Feature</TableHead>
                    <TableHead>Model</TableHead>
                    <TableHead className="text-right">Tokens</TableHead>
                    <TableHead className="text-right">Duration</TableHead>
                    <TableHead className="text-right">Cost</TableHead>
                    <TableHead>Status</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {logsLoading ? (
                    [...Array(10)].map((_, i) => (
                      <TableRow key={i}>
                        {[...Array(7)].map((_, j) => (
                          <TableCell key={j}><Skeleton className="h-4 w-full" /></TableCell>
                        ))}
                      </TableRow>
                    ))
                  ) : logs.length === 0 ? (
                    <TableRow>
                      <TableCell colSpan={7} className="text-center text-muted-foreground py-8">
                        No logs found
                      </TableCell>
                    </TableRow>
                  ) : (
                    logs.map((log) => (
                      <TableRow key={log.id}>
                        <TableCell className="text-sm">
                          {new Date(log.createdAt).toLocaleString()}
                        </TableCell>
                        <TableCell>
                          <div className="font-medium">{log.aiAppName}</div>
                          <div className="text-xs text-muted-foreground">{log.category}</div>
                        </TableCell>
                        <TableCell className="font-mono text-sm">{log.model}</TableCell>
                        <TableCell className="text-right">
                          <div>{formatNumber(log.totalTokens)}</div>
                          <div className="text-xs text-muted-foreground">
                            {formatNumber(log.inputTokens)} / {formatNumber(log.outputTokens)}
                          </div>
                        </TableCell>
                        <TableCell className="text-right">{log.duration}ms</TableCell>
                        <TableCell className="text-right">{formatCurrency(log.cost)}</TableCell>
                        <TableCell>
                          {log.success ? (
                            <Badge variant="default">Success</Badge>
                          ) : (
                            <Badge variant="destructive" title={log.error}>Error</Badge>
                          )}
                        </TableCell>
                      </TableRow>
                    ))
                  )}
                </TableBody>
              </Table>
            </CardContent>
          </Card>

          {/* Pagination */}
          {logsTotalPages > 1 && (
            <div className="flex items-center justify-center gap-2">
              <Button
                variant="outline"
                size="icon"
                onClick={() => setLogsPage(Math.max(1, logsPage - 1))}
                disabled={logsPage === 1 || logsLoading}
              >
                <ChevronLeft className="h-4 w-4" />
              </Button>
              <span className="text-sm">
                Page {logsPage} of {logsTotalPages}
              </span>
              <Button
                variant="outline"
                size="icon"
                onClick={() => setLogsPage(Math.min(logsTotalPages, logsPage + 1))}
                disabled={logsPage === logsTotalPages || logsLoading}
              >
                <ChevronRight className="h-4 w-4" />
              </Button>
            </div>
          )}
        </TabsContent>
      </Tabs>
    </div>
  );
}
