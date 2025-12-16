'use client';

import { useState, useEffect, useRef, useMemo } from 'react';
import {
  Search,
  Plus,
  X,
  ChevronRight,
  ChevronDown,
  Hash,
  Calendar,
  Clock,
  Users,
  Briefcase,
  Target,
  User,
  Building,
  FileText,
  Settings,
  Info,
  CheckCircle,
  Star,
  History,
  Code,
  AlertCircle,
  Copy,
  Filter,
  Sparkles,
  Database,
  Globe,
  Mail,
  Phone,
  MapPin,
  Link,
  Tag,
  DollarSign,
  TrendingUp,
  BarChart3,
  PieChart,
  Activity,
  Zap,
  Command,
  Check,
  Variable
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import { CardGlass, CardGlassContent, CardGlassHeader, CardGlassTitle } from '@/components/ui/card-glass';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogFooter
} from '@/components/ui/dialog';
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from '@/components/ui/tooltip';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Separator } from '@/components/ui/separator';
import { cn } from '@/lib/utils';

interface VariableCategory {
  id: string;
  name: string;
  icon: React.ElementType;
  description: string;
  color: string;
  variables: Variable[];
}

interface Variable {
  name: string;
  description: string;
  example: string;
  usage: number;
  required?: boolean;
  deprecated?: boolean;
  dataType?: 'string' | 'number' | 'date' | 'boolean' | 'array' | 'object';
  format?: string;
  defaultValue?: string;
  validationRules?: string[];
  category?: string;
  tags?: string[];
  relatedVariables?: string[];
  createdAt?: Date;
  updatedAt?: Date;
}

interface CustomVariable extends Variable {
  id: string;
  createdBy: string;
  isGlobal: boolean;
}

interface EnhancedVariableInserterProps {
  onInsert: (variable: string) => void;
  usedVariables?: string[];
  customVariables?: CustomVariable[];
  onCreateCustom?: (variable: CustomVariable) => void;
  onDeleteCustom?: (variableId: string) => void;
  position?: 'inline' | 'modal' | 'floating';
  showSearch?: boolean;
  showCategories?: boolean;
  showRecent?: boolean;
  showFavorites?: boolean;
  showCustom?: boolean;
  showSuggestions?: boolean;
  maxRecent?: number;
  enableAutocomplete?: boolean;
  placeholder?: string;
  className?: string;
}

export default function EnhancedVariableInserter({
  onInsert,
  usedVariables = [],
  customVariables = [],
  onCreateCustom,
  onDeleteCustom,
  position = 'inline',
  showSearch = true,
  showCategories = true,
  showRecent = true,
  showFavorites = true,
  showCustom = true,
  showSuggestions = true,
  maxRecent = 10,
  enableAutocomplete = true,
  placeholder = 'Search variables or type to filter...',
  className
}: EnhancedVariableInserterProps) {
  const [searchQuery, setSearchQuery] = useState('');
  const [expandedCategories, setExpandedCategories] = useState<Set<string>>(new Set(['meeting']));
  const [selectedVariable, setSelectedVariable] = useState<Variable | null>(null);
  const [showCreateDialog, setShowCreateDialog] = useState(false);
  const [newVariable, setNewVariable] = useState<Partial<CustomVariable>>({
    name: '',
    description: '',
    example: '',
    usage: 0,
    dataType: 'string',
    isGlobal: false,
    tags: []
  });
  const [recentlyUsed, setRecentlyUsed] = useState<string[]>([]);
  const [favoriteVariables, setFavoriteVariables] = useState<Set<string>>(new Set());
  const [activeTab, setActiveTab] = useState<'all' | 'recent' | 'favorites' | 'custom'>('all');
  const [showDetails, setShowDetails] = useState(false);
  const [autocompleteResults, setAutocompleteResults] = useState<Variable[]>([]);
  const [autocompleteIndex, setAutocompleteIndex] = useState(-1);
  const [showAutocomplete, setShowAutocomplete] = useState(false);
  const [copiedVariable, setCopiedVariable] = useState<string | null>(null);
  const searchInputRef = useRef<HTMLInputElement>(null);

  // Enhanced predefined variable categories
  const variableCategories: VariableCategory[] = [
    {
      id: 'meeting',
      name: 'Meeting Details',
      icon: Calendar,
      description: 'Meeting information and metadata',
      color: '#9333ea',
      variables: [
        {
          name: '{{meeting.title}}',
          description: 'The title of the meeting',
          example: 'Q4 Planning Review',
          usage: 145,
          required: true,
          dataType: 'string',
          tags: ['essential', 'header']
        },
        {
          name: '{{meeting.date}}',
          description: 'Date of the meeting',
          example: 'December 9, 2024',
          usage: 142,
          required: true,
          dataType: 'date',
          format: 'MMMM D, YYYY'
        },
        {
          name: '{{meeting.time}}',
          description: 'Start time of the meeting',
          example: '2:30 PM EST',
          usage: 89,
          dataType: 'string',
          format: 'h:mm A z'
        },
        {
          name: '{{meeting.duration}}',
          description: 'Duration of the meeting',
          example: '45 minutes',
          usage: 67,
          dataType: 'number'
        },
        {
          name: '{{meeting.location}}',
          description: 'Meeting location or link',
          example: 'Conference Room A / Zoom',
          usage: 95,
          dataType: 'string'
        },
        {
          name: '{{meeting.type}}',
          description: 'Type of meeting',
          example: 'Sales Call',
          usage: 78,
          dataType: 'string',
          tags: ['categorization']
        },
        {
          name: '{{meeting.id}}',
          description: 'Unique meeting identifier',
          example: 'MTG-2024-001234',
          usage: 45,
          dataType: 'string',
          tags: ['system', 'unique']
        },
        {
          name: '{{meeting.recording_url}}',
          description: 'Link to meeting recording',
          example: 'https://recording.example.com/...',
          usage: 82,
          dataType: 'string',
          format: 'url'
        },
        {
          name: '{{meeting.agenda}}',
          description: 'Meeting agenda items',
          example: '1. Review Q3 results\\n2. Plan Q4 strategy',
          usage: 71,
          dataType: 'string',
          tags: ['content']
        },
        {
          name: '{{meeting.notes}}',
          description: 'Meeting notes and minutes',
          example: 'Key discussion points...',
          usage: 93,
          dataType: 'string',
          tags: ['content']
        }
      ]
    },
    {
      id: 'participants',
      name: 'Participants',
      icon: Users,
      description: 'Attendee information',
      color: '#10b981',
      variables: [
        {
          name: '{{participants.count}}',
          description: 'Number of participants',
          example: '5',
          usage: 76,
          dataType: 'number'
        },
        {
          name: '{{participants.list}}',
          description: 'List of all participants',
          example: 'John Doe, Jane Smith, Bob Johnson',
          usage: 88,
          dataType: 'array'
        },
        {
          name: '{{participants.organizer}}',
          description: 'Meeting organizer',
          example: 'Sarah Williams',
          usage: 92,
          dataType: 'string',
          required: true
        },
        {
          name: '{{participants.presenter}}',
          description: 'Main presenter',
          example: 'Michael Chen',
          usage: 61,
          dataType: 'string'
        },
        {
          name: '{{participants.emails}}',
          description: 'Email addresses of participants',
          example: 'john@example.com, jane@example.com',
          usage: 54,
          dataType: 'array',
          tags: ['contact']
        },
        {
          name: '{{participants.external}}',
          description: 'External participants',
          example: 'Client representatives',
          usage: 43,
          dataType: 'array',
          tags: ['external']
        },
        {
          name: '{{participants.internal}}',
          description: 'Internal team members',
          example: 'Sales team',
          usage: 47,
          dataType: 'array',
          tags: ['internal']
        },
        {
          name: '{{participants.roles}}',
          description: 'Roles of participants',
          example: 'Sales Manager, Product Owner',
          usage: 38,
          dataType: 'array'
        }
      ]
    },
    {
      id: 'company',
      name: 'Company',
      icon: Building,
      description: 'Company and organization details',
      color: '#f59e0b',
      variables: [
        {
          name: '{{company.name}}',
          description: 'Company name',
          example: 'Acme Corporation',
          usage: 124,
          dataType: 'string',
          required: true
        },
        {
          name: '{{company.industry}}',
          description: 'Industry sector',
          example: 'Technology',
          usage: 67,
          dataType: 'string',
          tags: ['categorization']
        },
        {
          name: '{{company.size}}',
          description: 'Company size',
          example: '500-1000 employees',
          usage: 45,
          dataType: 'string'
        },
        {
          name: '{{company.website}}',
          description: 'Company website',
          example: 'https://example.com',
          usage: 78,
          dataType: 'string',
          format: 'url'
        },
        {
          name: '{{company.location}}',
          description: 'Company headquarters',
          example: 'San Francisco, CA',
          usage: 52,
          dataType: 'string',
          tags: ['location']
        },
        {
          name: '{{company.revenue}}',
          description: 'Annual revenue',
          example: '$10M - $50M',
          usage: 41,
          dataType: 'string',
          tags: ['financial']
        },
        {
          name: '{{company.stage}}',
          description: 'Company stage',
          example: 'Series B',
          usage: 39,
          dataType: 'string',
          tags: ['status']
        }
      ]
    },
    {
      id: 'deal',
      name: 'Deal Information',
      icon: DollarSign,
      description: 'Sales and deal details',
      color: '#ec4899',
      variables: [
        {
          name: '{{deal.value}}',
          description: 'Deal value',
          example: '$250,000',
          usage: 98,
          dataType: 'number',
          format: 'currency'
        },
        {
          name: '{{deal.stage}}',
          description: 'Current deal stage',
          example: 'Negotiation',
          usage: 87,
          dataType: 'string',
          tags: ['status']
        },
        {
          name: '{{deal.probability}}',
          description: 'Close probability',
          example: '75%',
          usage: 65,
          dataType: 'number',
          format: 'percentage'
        },
        {
          name: '{{deal.close_date}}',
          description: 'Expected close date',
          example: 'March 31, 2025',
          usage: 73,
          dataType: 'date'
        },
        {
          name: '{{deal.products}}',
          description: 'Products/services involved',
          example: 'Enterprise License, Support Package',
          usage: 58,
          dataType: 'array'
        },
        {
          name: '{{deal.owner}}',
          description: 'Deal owner/sales rep',
          example: 'Alex Thompson',
          usage: 69,
          dataType: 'string'
        },
        {
          name: '{{deal.competitor}}',
          description: 'Main competitor',
          example: 'CompetitorX',
          usage: 42,
          dataType: 'string'
        },
        {
          name: '{{deal.next_steps}}',
          description: 'Next action items',
          example: 'Send proposal by Friday',
          usage: 81,
          dataType: 'string',
          tags: ['action']
        }
      ]
    },
    {
      id: 'action',
      name: 'Action Items',
      icon: CheckCircle,
      description: 'Tasks and follow-ups',
      color: '#8b5cf6',
      variables: [
        {
          name: '{{actions.list}}',
          description: 'List of action items',
          example: '• Send proposal\\n• Schedule follow-up',
          usage: 94,
          dataType: 'array'
        },
        {
          name: '{{actions.count}}',
          description: 'Number of action items',
          example: '3',
          usage: 62,
          dataType: 'number'
        },
        {
          name: '{{actions.deadline}}',
          description: 'Earliest deadline',
          example: 'December 15, 2024',
          usage: 71,
          dataType: 'date'
        },
        {
          name: '{{actions.owners}}',
          description: 'Action item owners',
          example: 'John Doe, Jane Smith',
          usage: 58,
          dataType: 'array'
        },
        {
          name: '{{actions.priority}}',
          description: 'Priority actions',
          example: 'High priority: Contract review',
          usage: 49,
          dataType: 'string',
          tags: ['priority']
        },
        {
          name: '{{actions.completed}}',
          description: 'Completed actions',
          example: '2 of 5 completed',
          usage: 43,
          dataType: 'string',
          tags: ['status']
        }
      ]
    },
    {
      id: 'metrics',
      name: 'Analytics & Metrics',
      icon: BarChart3,
      description: 'Performance and analytics data',
      color: '#06b6d4',
      variables: [
        {
          name: '{{metrics.engagement_score}}',
          description: 'Meeting engagement score',
          example: '8.5/10',
          usage: 67,
          dataType: 'number'
        },
        {
          name: '{{metrics.talk_ratio}}',
          description: 'Talk time distribution',
          example: 'Client: 60%, Us: 40%',
          usage: 54,
          dataType: 'string',
          tags: ['analysis']
        },
        {
          name: '{{metrics.sentiment}}',
          description: 'Overall sentiment',
          example: 'Positive',
          usage: 61,
          dataType: 'string',
          tags: ['analysis']
        },
        {
          name: '{{metrics.key_topics}}',
          description: 'Main topics discussed',
          example: 'Pricing, Implementation, Support',
          usage: 72,
          dataType: 'array',
          tags: ['content']
        },
        {
          name: '{{metrics.questions_asked}}',
          description: 'Number of questions',
          example: '12 questions',
          usage: 48,
          dataType: 'number'
        },
        {
          name: '{{metrics.objections}}',
          description: 'Objections raised',
          example: 'Budget concerns, Timeline',
          usage: 56,
          dataType: 'array',
          tags: ['sales']
        },
        {
          name: '{{metrics.next_meeting_likelihood}}',
          description: 'Likelihood of follow-up',
          example: 'High (85%)',
          usage: 45,
          dataType: 'string',
          format: 'percentage',
          tags: ['prediction']
        }
      ]
    },
    {
      id: 'system',
      name: 'System Variables',
      icon: Settings,
      description: 'System-generated values',
      color: '#64748b',
      variables: [
        {
          name: '{{system.today}}',
          description: "Today's date",
          example: 'December 9, 2024',
          usage: 112,
          dataType: 'date'
        },
        {
          name: '{{system.current_time}}',
          description: 'Current time',
          example: '3:45 PM',
          usage: 67,
          dataType: 'string',
          format: 'time'
        },
        {
          name: '{{system.user_name}}',
          description: 'Current user name',
          example: 'John Doe',
          usage: 89,
          dataType: 'string'
        },
        {
          name: '{{system.user_email}}',
          description: 'Current user email',
          example: 'john@example.com',
          usage: 73,
          dataType: 'string',
          format: 'email'
        },
        {
          name: '{{system.template_name}}',
          description: 'Template being used',
          example: 'Sales Call Template',
          usage: 41,
          dataType: 'string'
        },
        {
          name: '{{system.template_version}}',
          description: 'Template version',
          example: 'v2.1.0',
          usage: 28,
          dataType: 'string',
          tags: ['version']
        },
        {
          name: '{{system.workspace}}',
          description: 'Current workspace',
          example: 'Sales Team',
          usage: 35,
          dataType: 'string'
        },
        {
          name: '{{system.quarter}}',
          description: 'Current quarter',
          example: 'Q4 2024',
          usage: 52,
          dataType: 'string'
        },
        {
          name: '{{system.week_number}}',
          description: 'Week of the year',
          example: 'Week 49',
          usage: 31,
          dataType: 'number'
        }
      ]
    }
  ];

  // Get all variables flattened
  const allVariables = useMemo(() => {
    const predefined = variableCategories.flatMap(cat => cat.variables);
    return [...predefined, ...customVariables];
  }, [customVariables]);

  // Filter variables based on search
  const filteredVariables = useMemo(() => {
    if (!searchQuery) return allVariables;

    const query = searchQuery.toLowerCase();
    return allVariables.filter(variable =>
      variable.name.toLowerCase().includes(query) ||
      variable.description.toLowerCase().includes(query) ||
      variable.example?.toLowerCase().includes(query) ||
      variable.tags?.some(tag => tag.toLowerCase().includes(query))
    );
  }, [allVariables, searchQuery]);

  // Get recent variables
  const recentVariables = useMemo(() => {
    return recentlyUsed
      .slice(0, maxRecent)
      .map(name => allVariables.find(v => v.name === name))
      .filter(Boolean) as Variable[];
  }, [recentlyUsed, allVariables, maxRecent]);

  // Get favorite variables
  const favoriteVariablesList = useMemo(() => {
    return Array.from(favoriteVariables)
      .map(name => allVariables.find(v => v.name === name))
      .filter(Boolean) as Variable[];
  }, [favoriteVariables, allVariables]);

  // Get suggested variables (based on context and usage)
  const suggestedVariables = useMemo(() => {
    // Simple suggestion logic - most used variables not yet in template
    return allVariables
      .filter(v => !usedVariables.includes(v.name))
      .sort((a, b) => (b.usage || 0) - (a.usage || 0))
      .slice(0, 5);
  }, [allVariables, usedVariables]);

  // Handle autocomplete
  useEffect(() => {
    if (!enableAutocomplete || !searchQuery || searchQuery.startsWith('{{')) {
      setShowAutocomplete(false);
      return;
    }

    const results = filteredVariables.slice(0, 10);
    setAutocompleteResults(results);
    setShowAutocomplete(results.length > 0);
  }, [searchQuery, filteredVariables, enableAutocomplete]);

  // Load saved data from localStorage
  useEffect(() => {
    const savedRecent = localStorage.getItem('template_recent_variables');
    const savedFavorites = localStorage.getItem('template_favorite_variables');

    if (savedRecent) {
      try {
        setRecentlyUsed(JSON.parse(savedRecent));
      } catch {}
    }

    if (savedFavorites) {
      try {
        setFavoriteVariables(new Set(JSON.parse(savedFavorites)));
      } catch {}
    }
  }, []);

  // Save recent variables
  const addToRecent = (variableName: string) => {
    const newRecent = [variableName, ...recentlyUsed.filter(v => v !== variableName)].slice(0, maxRecent * 2);
    setRecentlyUsed(newRecent);
    localStorage.setItem('template_recent_variables', JSON.stringify(newRecent));
  };

  // Toggle favorite
  const toggleFavorite = (variableName: string) => {
    const newFavorites = new Set(favoriteVariables);
    if (newFavorites.has(variableName)) {
      newFavorites.delete(variableName);
    } else {
      newFavorites.add(variableName);
    }
    setFavoriteVariables(newFavorites);
    localStorage.setItem('template_favorite_variables', JSON.stringify(Array.from(newFavorites)));
  };

  // Toggle category expansion
  const toggleCategory = (categoryId: string) => {
    const newExpanded = new Set(expandedCategories);
    if (newExpanded.has(categoryId)) {
      newExpanded.delete(categoryId);
    } else {
      newExpanded.add(categoryId);
    }
    setExpandedCategories(newExpanded);
  };

  // Handle variable insertion
  const handleInsert = (variable: Variable) => {
    onInsert(variable.name);
    addToRecent(variable.name);
    setSelectedVariable(null);
    setShowDetails(false);

    // Clear search after insertion
    if (searchInputRef.current) {
      searchInputRef.current.value = '';
      setSearchQuery('');
    }
  };

  // Copy variable to clipboard
  const copyToClipboard = (variableName: string) => {
    navigator.clipboard.writeText(variableName);
    setCopiedVariable(variableName);
    setTimeout(() => setCopiedVariable(null), 2000);
  };

  // Create custom variable
  const handleCreateCustomVariable = () => {
    if (!newVariable.name || !newVariable.description) {
      alert('Please provide a name and description for the variable');
      return;
    }

    const customVar: CustomVariable = {
      id: `custom_${Date.now()}`,
      name: newVariable.name.startsWith('{{') ? newVariable.name : `{{${newVariable.name}}}`,
      description: newVariable.description,
      example: newVariable.example || '',
      usage: 0,
      dataType: newVariable.dataType || 'string',
      isGlobal: newVariable.isGlobal || false,
      createdBy: 'current_user',
      tags: newVariable.tags || [],
      createdAt: new Date(),
      updatedAt: new Date()
    };

    onCreateCustom?.(customVar);
    setShowCreateDialog(false);
    setNewVariable({
      name: '',
      description: '',
      example: '',
      usage: 0,
      dataType: 'string',
      isGlobal: false,
      tags: []
    });
  };

  // Handle keyboard navigation for autocomplete
  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (!showAutocomplete) return;

    switch(e.key) {
      case 'ArrowDown':
        e.preventDefault();
        setAutocompleteIndex(prev =>
          prev < autocompleteResults.length - 1 ? prev + 1 : 0
        );
        break;
      case 'ArrowUp':
        e.preventDefault();
        setAutocompleteIndex(prev =>
          prev > 0 ? prev - 1 : autocompleteResults.length - 1
        );
        break;
      case 'Enter':
        e.preventDefault();
        if (autocompleteIndex >= 0 && autocompleteResults[autocompleteIndex]) {
          handleInsert(autocompleteResults[autocompleteIndex]);
        }
        break;
      case 'Escape':
        setShowAutocomplete(false);
        setAutocompleteIndex(-1);
        break;
    }
  };

  // Render variable item
  const renderVariableItem = (variable: Variable, showCategory = false) => (
    <div
      key={variable.name}
      className={cn(
        "group flex items-center justify-between p-2 rounded-lg hover:bg-[var(--ff-bg-hover)] cursor-pointer transition-all",
        usedVariables.includes(variable.name) && "opacity-60"
      )}
      onClick={() => handleInsert(variable)}
    >
      <div className="flex-1 min-w-0">
        <div className="flex items-center gap-2">
          <code className="text-sm font-mono text-[var(--ff-purple-500)]">
            {variable.name}
          </code>
          {variable.required && (
            <Badge variant="destructive" className="text-xs px-1 py-0">
              Required
            </Badge>
          )}
          {variable.deprecated && (
            <Badge variant="outline" className="text-xs px-1 py-0 text-orange-500">
              Deprecated
            </Badge>
          )}
          {favoriteVariables.has(variable.name) && (
            <Star className="w-3 h-3 text-yellow-500 fill-yellow-500" />
          )}
          {usedVariables.includes(variable.name) && (
            <Check className="w-3 h-3 text-green-500" />
          )}
        </div>
        <p className="text-xs text-[var(--ff-text-muted)] mt-1 truncate">
          {variable.description}
        </p>
        {variable.example && (
          <p className="text-xs text-[var(--ff-text-secondary)] mt-1 italic truncate">
            Example: {variable.example}
          </p>
        )}
        {showCategory && variable.category && (
          <Badge variant="outline" className="mt-1 text-xs">
            {variable.category}
          </Badge>
        )}
      </div>

      <div className="flex items-center gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
        <TooltipProvider>
          <Tooltip>
            <TooltipTrigger asChild>
              <Button
                variant="ghost"
                size="sm"
                className="p-1 h-6 w-6"
                onClick={(e) => {
                  e.stopPropagation();
                  setSelectedVariable(variable);
                  setShowDetails(true);
                }}
              >
                <Info className="w-3 h-3" />
              </Button>
            </TooltipTrigger>
            <TooltipContent>View details</TooltipContent>
          </Tooltip>
        </TooltipProvider>

        <TooltipProvider>
          <Tooltip>
            <TooltipTrigger asChild>
              <Button
                variant="ghost"
                size="sm"
                className="p-1 h-6 w-6"
                onClick={(e) => {
                  e.stopPropagation();
                  toggleFavorite(variable.name);
                }}
              >
                <Star className={cn(
                  "w-3 h-3",
                  favoriteVariables.has(variable.name) && "fill-yellow-500 text-yellow-500"
                )} />
              </Button>
            </TooltipTrigger>
            <TooltipContent>
              {favoriteVariables.has(variable.name) ? 'Remove from favorites' : 'Add to favorites'}
            </TooltipContent>
          </Tooltip>
        </TooltipProvider>

        <TooltipProvider>
          <Tooltip>
            <TooltipTrigger asChild>
              <Button
                variant="ghost"
                size="sm"
                className="p-1 h-6 w-6"
                onClick={(e) => {
                  e.stopPropagation();
                  copyToClipboard(variable.name);
                }}
              >
                {copiedVariable === variable.name ? (
                  <Check className="w-3 h-3 text-green-500" />
                ) : (
                  <Copy className="w-3 h-3" />
                )}
              </Button>
            </TooltipTrigger>
            <TooltipContent>Copy to clipboard</TooltipContent>
          </Tooltip>
        </TooltipProvider>

        {variable.usage && (
          <Badge variant="secondary" className="text-xs px-1 py-0">
            {variable.usage}
          </Badge>
        )}
      </div>
    </div>
  );

  const content = (
    <div className={cn("flex flex-col h-full", className)}>
      <CardGlassHeader className="pb-2">
        <CardGlassTitle className="flex items-center justify-between">
          <span className="flex items-center gap-2">
            <Variable className="w-5 h-5" />
            Variable Inserter
          </span>
          {showCustom && onCreateCustom && (
            <Button
              variant="outline"
              size="sm"
              onClick={() => setShowCreateDialog(true)}
              className="text-xs"
            >
              <Plus className="w-3 h-3 mr-1" />
              Custom
            </Button>
          )}
        </CardGlassTitle>
      </CardGlassHeader>

      <CardGlassContent className="flex-1 flex flex-col p-4">
        {/* Search */}
        {showSearch && (
          <div className="relative mb-4">
            <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-[var(--ff-text-muted)] w-4 h-4" />
            <Input
              ref={searchInputRef}
              type="text"
              placeholder={placeholder}
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              onKeyDown={handleKeyDown}
              className="pl-10 pr-10"
            />
            {searchQuery && (
              <Button
                variant="ghost"
                size="sm"
                className="absolute right-1 top-1/2 transform -translate-y-1/2 p-1 h-6 w-6"
                onClick={() => {
                  setSearchQuery('');
                  searchInputRef.current?.focus();
                }}
              >
                <X className="w-3 h-3" />
              </Button>
            )}

            {/* Autocomplete dropdown */}
            {showAutocomplete && (
              <div className="absolute top-full left-0 right-0 mt-1 bg-[var(--ff-bg-layer)] border border-[var(--ff-border)] rounded-lg shadow-lg z-50 max-h-64 overflow-y-auto">
                {autocompleteResults.map((variable, index) => (
                  <div
                    key={variable.name}
                    className={cn(
                      "px-3 py-2 hover:bg-[var(--ff-bg-hover)] cursor-pointer",
                      index === autocompleteIndex && "bg-[var(--ff-bg-hover)]"
                    )}
                    onClick={() => handleInsert(variable)}
                    onMouseEnter={() => setAutocompleteIndex(index)}
                  >
                    <div className="flex items-center justify-between">
                      <code className="text-sm font-mono text-[var(--ff-purple-500)]">
                        {variable.name}
                      </code>
                      <kbd className="text-xs bg-[var(--ff-bg-dark)] px-1 py-0.5 rounded">
                        Enter
                      </kbd>
                    </div>
                    <p className="text-xs text-[var(--ff-text-muted)] mt-0.5">
                      {variable.description}
                    </p>
                  </div>
                ))}
              </div>
            )}
          </div>
        )}

        {/* Tabs */}
        <Tabs value={activeTab} onValueChange={(v) => setActiveTab(v as any)} className="flex-1 flex flex-col">
          <TabsList className="grid grid-cols-4 mb-2">
            <TabsTrigger value="all">
              All
              {searchQuery && ` (${filteredVariables.length})`}
            </TabsTrigger>
            {showRecent && (
              <TabsTrigger value="recent">
                Recent
                {recentVariables.length > 0 && ` (${recentVariables.length})`}
              </TabsTrigger>
            )}
            {showFavorites && (
              <TabsTrigger value="favorites">
                <Star className="w-3 h-3 mr-1" />
                {favoriteVariablesList.length}
              </TabsTrigger>
            )}
            {showCustom && (
              <TabsTrigger value="custom">
                Custom
                {customVariables.length > 0 && ` (${customVariables.length})`}
              </TabsTrigger>
            )}
          </TabsList>

          <ScrollArea className="flex-1">
            {/* All Variables */}
            <TabsContent value="all" className="m-0">
              {showSuggestions && suggestedVariables.length > 0 && !searchQuery && (
                <div className="mb-4">
                  <div className="flex items-center gap-2 mb-2 text-sm text-[var(--ff-text-muted)]">
                    <Sparkles className="w-4 h-4" />
                    Suggested Variables
                  </div>
                  <div className="space-y-1">
                    {suggestedVariables.map(variable => renderVariableItem(variable, true))}
                  </div>
                  <Separator className="mt-4" />
                </div>
              )}

              {showCategories && !searchQuery ? (
                // Categorized view
                variableCategories.map(category => (
                  <div key={category.id} className="mb-4">
                    <button
                      onClick={() => toggleCategory(category.id)}
                      className="flex items-center gap-2 w-full p-2 hover:bg-[var(--ff-bg-hover)] rounded-lg transition-colors"
                    >
                      {expandedCategories.has(category.id) ? (
                        <ChevronDown className="w-4 h-4" />
                      ) : (
                        <ChevronRight className="w-4 h-4" />
                      )}
                      <category.icon className="w-4 h-4" style={{ color: category.color }} />
                      <span className="font-medium text-sm">{category.name}</span>
                      <Badge variant="secondary" className="ml-auto text-xs">
                        {category.variables.length}
                      </Badge>
                    </button>

                    {expandedCategories.has(category.id) && (
                      <div className="mt-2 ml-6 space-y-1">
                        {category.variables.map(variable => renderVariableItem(variable))}
                      </div>
                    )}
                  </div>
                ))
              ) : (
                // Filtered/Search view
                <div className="space-y-1">
                  {filteredVariables.map(variable => renderVariableItem(variable, true))}
                  {filteredVariables.length === 0 && (
                    <div className="text-center py-8 text-[var(--ff-text-muted)]">
                      <Search className="w-12 h-12 mx-auto mb-2 opacity-50" />
                      <p className="text-sm">No variables found</p>
                      {searchQuery && (
                        <p className="text-xs mt-1">Try adjusting your search</p>
                      )}
                    </div>
                  )}
                </div>
              )}
            </TabsContent>

            {/* Recent Variables */}
            {showRecent && (
              <TabsContent value="recent" className="m-0">
                {recentVariables.length > 0 ? (
                  <div className="space-y-1">
                    {recentVariables.map(variable => renderVariableItem(variable, true))}
                  </div>
                ) : (
                  <div className="text-center py-8 text-[var(--ff-text-muted)]">
                    <History className="w-12 h-12 mx-auto mb-2 opacity-50" />
                    <p className="text-sm">No recent variables</p>
                    <p className="text-xs mt-1">Variables you use will appear here</p>
                  </div>
                )}
              </TabsContent>
            )}

            {/* Favorite Variables */}
            {showFavorites && (
              <TabsContent value="favorites" className="m-0">
                {favoriteVariablesList.length > 0 ? (
                  <div className="space-y-1">
                    {favoriteVariablesList.map(variable => renderVariableItem(variable, true))}
                  </div>
                ) : (
                  <div className="text-center py-8 text-[var(--ff-text-muted)]">
                    <Star className="w-12 h-12 mx-auto mb-2 opacity-50" />
                    <p className="text-sm">No favorite variables</p>
                    <p className="text-xs mt-1">Star variables to add them here</p>
                  </div>
                )}
              </TabsContent>
            )}

            {/* Custom Variables */}
            {showCustom && (
              <TabsContent value="custom" className="m-0">
                {customVariables.length > 0 ? (
                  <div className="space-y-1">
                    {customVariables.map(variable => (
                      <div key={variable.id} className="relative">
                        {renderVariableItem(variable)}
                        {onDeleteCustom && (
                          <Button
                            variant="ghost"
                            size="sm"
                            className="absolute right-2 top-2 p-1 h-6 w-6 opacity-0 hover:opacity-100"
                            onClick={() => onDeleteCustom(variable.id)}
                          >
                            <X className="w-3 h-3" />
                          </Button>
                        )}
                      </div>
                    ))}
                  </div>
                ) : (
                  <div className="text-center py-8 text-[var(--ff-text-muted)]">
                    <Code className="w-12 h-12 mx-auto mb-2 opacity-50" />
                    <p className="text-sm">No custom variables</p>
                    <p className="text-xs mt-1">Create custom variables for your templates</p>
                    {onCreateCustom && (
                      <Button
                        variant="outline"
                        size="sm"
                        className="mt-4"
                        onClick={() => setShowCreateDialog(true)}
                      >
                        <Plus className="w-4 h-4 mr-2" />
                        Create Custom Variable
                      </Button>
                    )}
                  </div>
                )}
              </TabsContent>
            )}
          </ScrollArea>
        </Tabs>

        {/* Keyboard shortcuts hint */}
        {enableAutocomplete && (
          <div className="mt-2 pt-2 border-t border-[var(--ff-border)] flex items-center justify-between text-xs text-[var(--ff-text-muted)]">
            <div className="flex items-center gap-4">
              <span className="flex items-center gap-1">
                <kbd className="px-1 py-0.5 bg-[var(--ff-bg-dark)] rounded">↑↓</kbd>
                Navigate
              </span>
              <span className="flex items-center gap-1">
                <kbd className="px-1 py-0.5 bg-[var(--ff-bg-dark)] rounded">Enter</kbd>
                Insert
              </span>
              <span className="flex items-center gap-1">
                <kbd className="px-1 py-0.5 bg-[var(--ff-bg-dark)] rounded">Esc</kbd>
                Close
              </span>
            </div>
            <Command className="w-4 h-4" />
          </div>
        )}
      </CardGlassContent>

      {/* Variable Details Dialog */}
      <Dialog open={showDetails} onOpenChange={setShowDetails}>
        <DialogContent className="max-w-2xl">
          <DialogHeader>
            <DialogTitle>Variable Details</DialogTitle>
          </DialogHeader>
          {selectedVariable && (
            <div className="space-y-4">
              <div>
                <Label>Name</Label>
                <code className="block mt-1 p-2 bg-[var(--ff-bg-layer)] rounded font-mono text-[var(--ff-purple-500)]">
                  {selectedVariable.name}
                </code>
              </div>
              <div>
                <Label>Description</Label>
                <p className="mt-1 text-sm">{selectedVariable.description}</p>
              </div>
              {selectedVariable.example && (
                <div>
                  <Label>Example</Label>
                  <p className="mt-1 text-sm italic">{selectedVariable.example}</p>
                </div>
              )}
              <div className="flex gap-2 flex-wrap">
                {selectedVariable.dataType && (
                  <Badge variant="outline">Type: {selectedVariable.dataType}</Badge>
                )}
                {selectedVariable.format && (
                  <Badge variant="outline">Format: {selectedVariable.format}</Badge>
                )}
                {selectedVariable.required && (
                  <Badge variant="destructive">Required</Badge>
                )}
                {selectedVariable.deprecated && (
                  <Badge variant="outline" className="text-orange-500">Deprecated</Badge>
                )}
                <Badge variant="secondary">Used {selectedVariable.usage || 0} times</Badge>
              </div>
              {selectedVariable.tags && selectedVariable.tags.length > 0 && (
                <div>
                  <Label>Tags</Label>
                  <div className="flex gap-2 mt-1 flex-wrap">
                    {selectedVariable.tags.map(tag => (
                      <Badge key={tag} variant="secondary">
                        <Tag className="w-3 h-3 mr-1" />
                        {tag}
                      </Badge>
                    ))}
                  </div>
                </div>
              )}
              {selectedVariable.relatedVariables && selectedVariable.relatedVariables.length > 0 && (
                <div>
                  <Label>Related Variables</Label>
                  <div className="flex gap-2 mt-1 flex-wrap">
                    {selectedVariable.relatedVariables.map(related => (
                      <code key={related} className="text-xs font-mono text-[var(--ff-purple-500)] bg-[var(--ff-bg-layer)] px-2 py-1 rounded">
                        {related}
                      </code>
                    ))}
                  </div>
                </div>
              )}
              <div className="flex justify-end gap-2 pt-4">
                <Button
                  variant="outline"
                  onClick={() => {
                    copyToClipboard(selectedVariable.name);
                  }}
                >
                  <Copy className="w-4 h-4 mr-2" />
                  Copy
                </Button>
                <Button
                  onClick={() => {
                    handleInsert(selectedVariable);
                    setShowDetails(false);
                  }}
                >
                  Insert Variable
                </Button>
              </div>
            </div>
          )}
        </DialogContent>
      </Dialog>

      {/* Create Custom Variable Dialog */}
      <Dialog open={showCreateDialog} onOpenChange={setShowCreateDialog}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Create Custom Variable</DialogTitle>
            <DialogDescription>
              Define a custom variable for your templates
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-4">
            <div>
              <Label htmlFor="var-name">Variable Name</Label>
              <Input
                id="var-name"
                placeholder="e.g., custom.field_name"
                value={newVariable.name}
                onChange={(e) => setNewVariable({ ...newVariable, name: e.target.value })}
              />
              <p className="text-xs text-[var(--ff-text-muted)] mt-1">
                Will be wrapped in {'{{ }}'} automatically
              </p>
            </div>
            <div>
              <Label htmlFor="var-desc">Description</Label>
              <Textarea
                id="var-desc"
                placeholder="What does this variable represent?"
                value={newVariable.description}
                onChange={(e) => setNewVariable({ ...newVariable, description: e.target.value })}
                rows={2}
              />
            </div>
            <div>
              <Label htmlFor="var-example">Example Value</Label>
              <Input
                id="var-example"
                placeholder="e.g., Sample Value"
                value={newVariable.example}
                onChange={(e) => setNewVariable({ ...newVariable, example: e.target.value })}
              />
            </div>
            <div>
              <Label htmlFor="var-type">Data Type</Label>
              <select
                id="var-type"
                className="w-full p-2 bg-[var(--ff-bg-layer)] border border-[var(--ff-border)] rounded-lg"
                value={newVariable.dataType}
                onChange={(e) => setNewVariable({ ...newVariable, dataType: e.target.value as any })}
              >
                <option value="string">String</option>
                <option value="number">Number</option>
                <option value="date">Date</option>
                <option value="boolean">Boolean</option>
                <option value="array">Array</option>
                <option value="object">Object</option>
              </select>
            </div>
            <div className="flex items-center gap-2">
              <input
                type="checkbox"
                id="var-global"
                checked={newVariable.isGlobal}
                onChange={(e) => setNewVariable({ ...newVariable, isGlobal: e.target.checked })}
              />
              <Label htmlFor="var-global" className="cursor-pointer">
                Make this variable available globally
              </Label>
            </div>
            <div>
              <Label htmlFor="var-tags">Tags (comma-separated)</Label>
              <Input
                id="var-tags"
                placeholder="e.g., custom, sales, required"
                value={newVariable.tags?.join(', ') || ''}
                onChange={(e) => setNewVariable({
                  ...newVariable,
                  tags: e.target.value.split(',').map(t => t.trim()).filter(Boolean)
                })}
              />
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setShowCreateDialog(false)}>
              Cancel
            </Button>
            <Button onClick={handleCreateCustomVariable}>
              Create Variable
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );

  if (position === 'modal') {
    return (
      <Dialog open onOpenChange={() => {}}>
        <DialogContent className="max-w-4xl max-h-[80vh] p-0">
          {content}
        </DialogContent>
      </Dialog>
    );
  }

  if (position === 'floating') {
    return (
      <div className="fixed bottom-4 right-4 w-96 h-[600px] bg-[var(--ff-bg-dark)] rounded-lg shadow-xl border border-[var(--ff-border)] z-50">
        <CardGlass className="h-full">
          {content}
        </CardGlass>
      </div>
    );
  }

  return <CardGlass>{content}</CardGlass>;
}