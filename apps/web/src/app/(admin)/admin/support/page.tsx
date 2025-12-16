'use client';

import { useState, useEffect, useCallback } from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';

interface SupportTicket {
  id: string;
  subject: string;
  description: string;
  organization: {
    id: string;
    name: string;
  };
  status: 'open' | 'in_progress' | 'resolved' | 'closed';
  priority: 'low' | 'medium' | 'high' | 'urgent';
  assignee: {
    id: string;
    name: string;
    email: string;
  } | null;
  createdAt: string;
  updatedAt: string;
  createdBy: {
    id: string;
    name: string;
    email: string;
  };
  messages: Array<{
    id: string;
    content: string;
    createdAt: string;
    author: {
      id: string;
      name: string;
      email: string;
    };
  }>;
}

interface TicketStats {
  openTickets: number;
  inProgressTickets: number;
  avgResponseTime: number;
  slaCompliance: number;
}

interface Assignee {
  id: string;
  name: string;
  email: string;
}

interface Pagination {
  page: number;
  limit: number;
  total: number;
  totalPages: number;
}

const STATUS_CONFIG: Record<SupportTicket['status'], { label: string; bgColor: string; textColor: string }> = {
  open: { label: 'Open', bgColor: 'bg-yellow-100', textColor: 'text-yellow-800' },
  in_progress: { label: 'In Progress', bgColor: 'bg-blue-100', textColor: 'text-blue-800' },
  resolved: { label: 'Resolved', bgColor: 'bg-green-100', textColor: 'text-green-800' },
  closed: { label: 'Closed', bgColor: 'bg-gray-100', textColor: 'text-gray-800' },
};

const PRIORITY_CONFIG: Record<SupportTicket['priority'], { label: string; bgColor: string; textColor: string }> = {
  low: { label: 'Low', bgColor: 'bg-gray-100', textColor: 'text-gray-800' },
  medium: { label: 'Medium', bgColor: 'bg-yellow-100', textColor: 'text-yellow-800' },
  high: { label: 'High', bgColor: 'bg-orange-100', textColor: 'text-orange-800' },
  urgent: { label: 'Urgent', bgColor: 'bg-red-100', textColor: 'text-red-800' },
};

export default function SupportTicketsPage() {
  const [tickets, setTickets] = useState<SupportTicket[]>([]);
  const [stats, setStats] = useState<TicketStats | null>(null);
  const [assignees, setAssignees] = useState<Assignee[]>([]);
  const [pagination, setPagination] = useState<Pagination>({
    page: 1,
    limit: 10,
    total: 0,
    totalPages: 0,
  });

  const [isLoading, setIsLoading] = useState(true);
  const [isStatsLoading, setIsStatsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const [searchQuery, setSearchQuery] = useState('');
  const [statusFilter, setStatusFilter] = useState<string>('all');
  const [priorityFilter, setPriorityFilter] = useState<string>('all');
  const [assigneeFilter, setAssigneeFilter] = useState<string>('all');

  const [selectedTicket, setSelectedTicket] = useState<SupportTicket | null>(null);
  const [isDetailDialogOpen, setIsDetailDialogOpen] = useState(false);
  const [isCreateDialogOpen, setIsCreateDialogOpen] = useState(false);

  const [newTicket, setNewTicket] = useState({
    subject: '',
    description: '',
    priority: 'medium' as SupportTicket['priority'],
    organizationId: '',
  });
  const [isCreating, setIsCreating] = useState(false);

  const [replyContent, setReplyContent] = useState('');
  const [isReplying, setIsReplying] = useState(false);

  const fetchTickets = useCallback(async () => {
    setIsLoading(true);
    setError(null);

    try {
      const params = new URLSearchParams({
        page: pagination.page.toString(),
        limit: pagination.limit.toString(),
      });

      if (searchQuery) params.append('search', searchQuery);
      if (statusFilter !== 'all') params.append('status', statusFilter);
      if (priorityFilter !== 'all') params.append('priority', priorityFilter);
      if (assigneeFilter !== 'all') params.append('assigneeId', assigneeFilter);

      const response = await fetch('/api/admin/support/tickets?' + params.toString(), {
        method: 'GET',
        headers: { 'Content-Type': 'application/json' },
        credentials: 'include',
      });

      if (!response.ok) {
        const errorData = await response.json().catch(() => ({}));
        throw new Error(errorData.error || 'HTTP ' + response.status + ': Failed to fetch tickets');
      }

      const data = await response.json();
      setTickets(data.tickets || []);
      setPagination(prev => ({
        ...prev,
        total: data.pagination?.total || 0,
        totalPages: data.pagination?.totalPages || 0,
      }));
    } catch (err) {
      const message = err instanceof Error ? err.message : 'Failed to load tickets';
      setError(message);
      setTickets([]);
    } finally {
      setIsLoading(false);
    }
  }, [pagination.page, pagination.limit, searchQuery, statusFilter, priorityFilter, assigneeFilter]);

  const fetchStats = useCallback(async () => {
    setIsStatsLoading(true);

    try {
      const response = await fetch('/api/admin/support/tickets/stats', {
        method: 'GET',
        headers: { 'Content-Type': 'application/json' },
        credentials: 'include',
      });

      if (!response.ok) {
        throw new Error('Failed to fetch stats');
      }

      const data = await response.json();
      setStats(data);
    } catch (err) {
      setStats(null);
    } finally {
      setIsStatsLoading(false);
    }
  }, []);

  const fetchAssignees = useCallback(async () => {
    try {
      const response = await fetch('/api/admin/support/assignees', {
        method: 'GET',
        headers: { 'Content-Type': 'application/json' },
        credentials: 'include',
      });

      if (!response.ok) {
        throw new Error('Failed to fetch assignees');
      }

      const data = await response.json();
      setAssignees(data.assignees || []);
    } catch (err) {
      setAssignees([]);
    }
  }, []);

  useEffect(() => {
    fetchTickets();
  }, [fetchTickets]);

  useEffect(() => {
    fetchStats();
    fetchAssignees();
  }, [fetchStats, fetchAssignees]);

  const handleCreateTicket = async () => {
    if (!newTicket.subject.trim() || !newTicket.description.trim()) {
      return;
    }

    setIsCreating(true);

    try {
      const response = await fetch('/api/admin/support/tickets', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        credentials: 'include',
        body: JSON.stringify(newTicket),
      });

      if (!response.ok) {
        const errorData = await response.json().catch(() => ({}));
        throw new Error(errorData.error || 'Failed to create ticket');
      }

      setIsCreateDialogOpen(false);
      setNewTicket({ subject: '', description: '', priority: 'medium', organizationId: '' });
      fetchTickets();
      fetchStats();
    } catch (err) {
      const message = err instanceof Error ? err.message : 'Failed to create ticket';
      alert(message);
    } finally {
      setIsCreating(false);
    }
  };

  const handleUpdateStatus = async (ticketId: string, newStatus: SupportTicket['status']) => {
    try {
      const response = await fetch('/api/admin/support/tickets/' + ticketId, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        credentials: 'include',
        body: JSON.stringify({ status: newStatus }),
      });

      if (!response.ok) {
        const errorData = await response.json().catch(() => ({}));
        throw new Error(errorData.error || 'Failed to update status');
      }

      fetchTickets();
      fetchStats();

      if (selectedTicket?.id === ticketId) {
        setSelectedTicket(prev => prev ? { ...prev, status: newStatus } : null);
      }
    } catch (err) {
      const message = err instanceof Error ? err.message : 'Failed to update status';
      alert(message);
    }
  };

  const handleAssignTicket = async (ticketId: string, assigneeId: string | null) => {
    try {
      const response = await fetch('/api/admin/support/tickets/' + ticketId, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        credentials: 'include',
        body: JSON.stringify({ assigneeId }),
      });

      if (!response.ok) {
        const errorData = await response.json().catch(() => ({}));
        throw new Error(errorData.error || 'Failed to assign ticket');
      }

      fetchTickets();

      if (selectedTicket?.id === ticketId) {
        const updatedTicket = await response.json();
        setSelectedTicket(updatedTicket.ticket);
      }
    } catch (err) {
      const message = err instanceof Error ? err.message : 'Failed to assign ticket';
      alert(message);
    }
  };

  const handleReply = async () => {
    if (!selectedTicket || !replyContent.trim()) {
      return;
    }

    setIsReplying(true);

    try {
      const response = await fetch('/api/admin/support/tickets/' + selectedTicket.id + '/messages', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        credentials: 'include',
        body: JSON.stringify({ content: replyContent }),
      });

      if (!response.ok) {
        const errorData = await response.json().catch(() => ({}));
        throw new Error(errorData.error || 'Failed to send reply');
      }

      const data = await response.json();
      setSelectedTicket(prev => prev ? {
        ...prev,
        messages: [...prev.messages, data.message],
        updatedAt: new Date().toISOString(),
      } : null);
      setReplyContent('');
    } catch (err) {
      const message = err instanceof Error ? err.message : 'Failed to send reply';
      alert(message);
    } finally {
      setIsReplying(false);
    }
  };

  const handleRowClick = (ticket: SupportTicket) => {
    setSelectedTicket(ticket);
    setIsDetailDialogOpen(true);
  };

  const handlePageChange = (newPage: number) => {
    setPagination(prev => ({ ...prev, page: newPage }));
  };

  const formatDate = (dateString: string): string => {
    const date = new Date(dateString);
    return date.toLocaleDateString('en-US', {
      year: 'numeric',
      month: 'short',
      day: 'numeric',
    });
  };

  const formatResponseTime = (minutes: number): string => {
    if (minutes < 60) {
      return Math.round(minutes) + 'm';
    }
    const hours = minutes / 60;
    if (hours < 24) {
      return Math.round(hours) + 'h';
    }
    const days = hours / 24;
    return Math.round(days) + 'd';
  };

  const getRelativeTime = (dateString: string): string => {
    const date = new Date(dateString);
    const now = new Date();
    const diffMs = now.getTime() - date.getTime();
    const diffMins = Math.floor(diffMs / 60000);
    const diffHours = Math.floor(diffMins / 60);
    const diffDays = Math.floor(diffHours / 24);

    if (diffMins < 1) return 'Just now';
    if (diffMins < 60) return diffMins + 'm ago';
    if (diffHours < 24) return diffHours + 'h ago';
    if (diffDays < 7) return diffDays + 'd ago';
    return formatDate(dateString);
  };

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-gray-900 dark:text-white">Support Tickets</h1>
          <p className="text-sm text-gray-500 dark:text-gray-400 mt-1">
            Manage customer support tickets and inquiries
          </p>
        </div>
        <Button onClick={() => setIsCreateDialogOpen(true)}>
          <svg className="w-4 h-4 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" />
          </svg>
          Create Ticket
        </Button>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
        <div className="bg-white dark:bg-gray-800 rounded-lg border border-gray-200 dark:border-gray-700 p-4">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm font-medium text-gray-500 dark:text-gray-400">Open Tickets</p>
              {isStatsLoading ? (
                <div className="h-8 w-16 bg-gray-200 dark:bg-gray-700 rounded animate-pulse mt-1" />
              ) : (
                <p className="text-2xl font-bold text-gray-900 dark:text-white mt-1">
                  {stats?.openTickets ?? 0}
                </p>
              )}
            </div>
            <div className="p-3 bg-yellow-100 dark:bg-yellow-900/30 rounded-full">
              <svg className="w-6 h-6 text-yellow-600 dark:text-yellow-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M20 13V6a2 2 0 00-2-2H6a2 2 0 00-2 2v7m16 0v5a2 2 0 01-2 2H6a2 2 0 01-2-2v-5m16 0h-2.586a1 1 0 00-.707.293l-2.414 2.414a1 1 0 01-.707.293h-3.172a1 1 0 01-.707-.293l-2.414-2.414A1 1 0 006.586 13H4" />
              </svg>
            </div>
          </div>
        </div>

        <div className="bg-white dark:bg-gray-800 rounded-lg border border-gray-200 dark:border-gray-700 p-4">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm font-medium text-gray-500 dark:text-gray-400">In Progress</p>
              {isStatsLoading ? (
                <div className="h-8 w-16 bg-gray-200 dark:bg-gray-700 rounded animate-pulse mt-1" />
              ) : (
                <p className="text-2xl font-bold text-gray-900 dark:text-white mt-1">
                  {stats?.inProgressTickets ?? 0}
                </p>
              )}
            </div>
            <div className="p-3 bg-blue-100 dark:bg-blue-900/30 rounded-full">
              <svg className="w-6 h-6 text-blue-600 dark:text-blue-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" />
              </svg>
            </div>
          </div>
        </div>

        <div className="bg-white dark:bg-gray-800 rounded-lg border border-gray-200 dark:border-gray-700 p-4">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm font-medium text-gray-500 dark:text-gray-400">Avg Response Time</p>
              {isStatsLoading ? (
                <div className="h-8 w-16 bg-gray-200 dark:bg-gray-700 rounded animate-pulse mt-1" />
              ) : (
                <p className="text-2xl font-bold text-gray-900 dark:text-white mt-1">
                  {stats?.avgResponseTime ? formatResponseTime(stats.avgResponseTime) : 'N/A'}
                </p>
              )}
            </div>
            <div className="p-3 bg-purple-100 dark:bg-purple-900/30 rounded-full">
              <svg className="w-6 h-6 text-purple-600 dark:text-purple-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 10V3L4 14h7v7l9-11h-7z" />
              </svg>
            </div>
          </div>
        </div>

        <div className="bg-white dark:bg-gray-800 rounded-lg border border-gray-200 dark:border-gray-700 p-4">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm font-medium text-gray-500 dark:text-gray-400">SLA Compliance</p>
              {isStatsLoading ? (
                <div className="h-8 w-16 bg-gray-200 dark:bg-gray-700 rounded animate-pulse mt-1" />
              ) : (
                <p className="text-2xl font-bold text-gray-900 dark:text-white mt-1">
                  {stats?.slaCompliance !== undefined ? Math.round(stats.slaCompliance) + '%' : 'N/A'}
                </p>
              )}
            </div>
            <div className="p-3 bg-green-100 dark:bg-green-900/30 rounded-full">
              <svg className="w-6 h-6 text-green-600 dark:text-green-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
              </svg>
            </div>
          </div>
        </div>
      </div>

      <div className="bg-white dark:bg-gray-800 rounded-lg border border-gray-200 dark:border-gray-700">
        <div className="p-4 border-b border-gray-200 dark:border-gray-700">
          <div className="flex flex-col lg:flex-row gap-4">
            <div className="flex-1">
              <Input
                placeholder="Search tickets..."
                value={searchQuery}
                onChange={(e) => {
                  setSearchQuery(e.target.value);
                  setPagination(prev => ({ ...prev, page: 1 }));
                }}
                className="w-full"
              />
            </div>
            <div className="flex flex-wrap gap-2">
              <Select
                value={statusFilter}
                onValueChange={(value) => {
                  setStatusFilter(value);
                  setPagination(prev => ({ ...prev, page: 1 }));
                }}
              >
                <SelectTrigger className="w-[140px]">
                  <SelectValue placeholder="Status" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">All Statuses</SelectItem>
                  <SelectItem value="open">Open</SelectItem>
                  <SelectItem value="in_progress">In Progress</SelectItem>
                  <SelectItem value="resolved">Resolved</SelectItem>
                  <SelectItem value="closed">Closed</SelectItem>
                </SelectContent>
              </Select>

              <Select
                value={priorityFilter}
                onValueChange={(value) => {
                  setPriorityFilter(value);
                  setPagination(prev => ({ ...prev, page: 1 }));
                }}
              >
                <SelectTrigger className="w-[140px]">
                  <SelectValue placeholder="Priority" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">All Priorities</SelectItem>
                  <SelectItem value="low">Low</SelectItem>
                  <SelectItem value="medium">Medium</SelectItem>
                  <SelectItem value="high">High</SelectItem>
                  <SelectItem value="urgent">Urgent</SelectItem>
                </SelectContent>
              </Select>

              <Select
                value={assigneeFilter}
                onValueChange={(value) => {
                  setAssigneeFilter(value);
                  setPagination(prev => ({ ...prev, page: 1 }));
                }}
              >
                <SelectTrigger className="w-[160px]">
                  <SelectValue placeholder="Assignee" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">All Assignees</SelectItem>
                  <SelectItem value="unassigned">Unassigned</SelectItem>
                  {assignees.map((assignee) => (
                    <SelectItem key={assignee.id} value={assignee.id}>
                      {assignee.name}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          </div>
        </div>

        {error ? (
          <div className="p-8 text-center">
            <div className="inline-flex items-center justify-center w-12 h-12 rounded-full bg-red-100 dark:bg-red-900/30 mb-4">
              <svg className="w-6 h-6 text-red-600 dark:text-red-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" />
              </svg>
            </div>
            <p className="text-gray-900 dark:text-white font-medium mb-2">Failed to load tickets</p>
            <p className="text-gray-500 dark:text-gray-400 text-sm mb-4">{error}</p>
            <Button variant="outline" onClick={fetchTickets}>
              <svg className="w-4 h-4 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15" />
              </svg>
              Retry
            </Button>
          </div>
        ) : isLoading ? (
          <div className="p-8">
            <div className="space-y-4">
              {[...Array(5)].map((_, i) => (
                <div key={i} className="flex items-center space-x-4">
                  <div className="h-4 w-24 bg-gray-200 dark:bg-gray-700 rounded animate-pulse" />
                  <div className="h-4 w-48 bg-gray-200 dark:bg-gray-700 rounded animate-pulse" />
                  <div className="h-4 w-32 bg-gray-200 dark:bg-gray-700 rounded animate-pulse" />
                  <div className="h-4 w-20 bg-gray-200 dark:bg-gray-700 rounded animate-pulse" />
                  <div className="h-4 w-20 bg-gray-200 dark:bg-gray-700 rounded animate-pulse" />
                </div>
              ))}
            </div>
          </div>
        ) : tickets.length === 0 ? (
          <div className="p-8 text-center">
            <div className="inline-flex items-center justify-center w-12 h-12 rounded-full bg-gray-100 dark:bg-gray-700 mb-4">
              <svg className="w-6 h-6 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M20 13V6a2 2 0 00-2-2H6a2 2 0 00-2 2v7m16 0v5a2 2 0 01-2 2H6a2 2 0 01-2-2v-5m16 0h-2.586a1 1 0 00-.707.293l-2.414 2.414a1 1 0 01-.707.293h-3.172a1 1 0 01-.707-.293l-2.414-2.414A1 1 0 006.586 13H4" />
              </svg>
            </div>
            <p className="text-gray-900 dark:text-white font-medium mb-2">No tickets found</p>
            <p className="text-gray-500 dark:text-gray-400 text-sm">
              {searchQuery || statusFilter !== 'all' || priorityFilter !== 'all' || assigneeFilter !== 'all'
                ? 'Try adjusting your filters'
                : 'Create your first support ticket to get started'}
            </p>
          </div>
        ) : (
          <>
            <div className="overflow-x-auto">
              <table className="w-full">
                <thead>
                  <tr className="border-b border-gray-200 dark:border-gray-700 bg-gray-50 dark:bg-gray-800/50">
                    <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider">
                      ID
                    </th>
                    <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider">
                      Subject
                    </th>
                    <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider">
                      Organization
                    </th>
                    <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider">
                      Status
                    </th>
                    <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider">
                      Priority
                    </th>
                    <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider">
                      Assignee
                    </th>
                    <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider">
                      Created
                    </th>
                    <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider">
                      Last Updated
                    </th>
                    <th className="px-4 py-3 text-right text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider">
                      Actions
                    </th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-200 dark:divide-gray-700">
                  {tickets.map((ticket) => {
                    const statusConfig = STATUS_CONFIG[ticket.status];
                    const priorityConfig = PRIORITY_CONFIG[ticket.priority];

                    return (
                      <tr
                        key={ticket.id}
                        className="hover:bg-gray-50 dark:hover:bg-gray-800/50 cursor-pointer transition-colors"
                        onClick={() => handleRowClick(ticket)}
                      >
                        <td className="px-4 py-4 whitespace-nowrap">
                          <span className="text-sm font-mono text-gray-500 dark:text-gray-400">
                            #{ticket.id.slice(0, 8)}
                          </span>
                        </td>
                        <td className="px-4 py-4">
                          <div className="text-sm font-medium text-gray-900 dark:text-white truncate max-w-xs">
                            {ticket.subject}
                          </div>
                        </td>
                        <td className="px-4 py-4 whitespace-nowrap">
                          <span className="text-sm text-gray-500 dark:text-gray-400">
                            {ticket.organization.name}
                          </span>
                        </td>
                        <td className="px-4 py-4 whitespace-nowrap">
                          <span className={'inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ' + statusConfig.bgColor + ' ' + statusConfig.textColor}>
                            {statusConfig.label}
                          </span>
                        </td>
                        <td className="px-4 py-4 whitespace-nowrap">
                          <span className={'inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ' + priorityConfig.bgColor + ' ' + priorityConfig.textColor}>
                            {priorityConfig.label}
                          </span>
                        </td>
                        <td className="px-4 py-4 whitespace-nowrap">
                          {ticket.assignee ? (
                            <span className="text-sm text-gray-900 dark:text-white">
                              {ticket.assignee.name}
                            </span>
                          ) : (
                            <span className="text-sm text-gray-400 dark:text-gray-500 italic">
                              Unassigned
                            </span>
                          )}
                        </td>
                        <td className="px-4 py-4 whitespace-nowrap">
                          <span className="text-sm text-gray-500 dark:text-gray-400">
                            {formatDate(ticket.createdAt)}
                          </span>
                        </td>
                        <td className="px-4 py-4 whitespace-nowrap">
                          <span className="text-sm text-gray-500 dark:text-gray-400">
                            {getRelativeTime(ticket.updatedAt)}
                          </span>
                        </td>
                        <td className="px-4 py-4 whitespace-nowrap text-right">
                          <DropdownMenu>
                            <DropdownMenuTrigger asChild onClick={(e) => e.stopPropagation()}>
                              <Button variant="ghost" size="icon" className="h-8 w-8">
                                <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 5v.01M12 12v.01M12 19v.01M12 6a1 1 0 110-2 1 1 0 010 2zm0 7a1 1 0 110-2 1 1 0 010 2zm0 7a1 1 0 110-2 1 1 0 010 2z" />
                                </svg>
                              </Button>
                            </DropdownMenuTrigger>
                            <DropdownMenuContent align="end" onClick={(e) => e.stopPropagation()}>
                              <DropdownMenuItem onClick={() => handleRowClick(ticket)}>
                                View Details
                              </DropdownMenuItem>
                              <DropdownMenuSeparator />
                              <DropdownMenuItem
                                onClick={() => handleUpdateStatus(ticket.id, 'in_progress')}
                                disabled={ticket.status === 'in_progress'}
                              >
                                Mark In Progress
                              </DropdownMenuItem>
                              <DropdownMenuItem
                                onClick={() => handleUpdateStatus(ticket.id, 'resolved')}
                                disabled={ticket.status === 'resolved'}
                              >
                                Mark Resolved
                              </DropdownMenuItem>
                              <DropdownMenuItem
                                onClick={() => handleUpdateStatus(ticket.id, 'closed')}
                                disabled={ticket.status === 'closed'}
                              >
                                Close Ticket
                              </DropdownMenuItem>
                              <DropdownMenuSeparator />
                              <DropdownMenuItem onClick={() => handleAssignTicket(ticket.id, null)}>
                                Unassign
                              </DropdownMenuItem>
                            </DropdownMenuContent>
                          </DropdownMenu>
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>

            {pagination.totalPages > 1 && (
              <div className="px-4 py-3 border-t border-gray-200 dark:border-gray-700 flex items-center justify-between">
                <div className="text-sm text-gray-500 dark:text-gray-400">
                  Showing {((pagination.page - 1) * pagination.limit) + 1} to{' '}
                  {Math.min(pagination.page * pagination.limit, pagination.total)} of{' '}
                  {pagination.total} results
                </div>
                <div className="flex items-center space-x-2">
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => handlePageChange(pagination.page - 1)}
                    disabled={pagination.page <= 1}
                  >
                    Previous
                  </Button>
                  <div className="flex items-center space-x-1">
                    {[...Array(Math.min(5, pagination.totalPages))].map((_, i) => {
                      let pageNum: number;
                      if (pagination.totalPages <= 5) {
                        pageNum = i + 1;
                      } else if (pagination.page <= 3) {
                        pageNum = i + 1;
                      } else if (pagination.page >= pagination.totalPages - 2) {
                        pageNum = pagination.totalPages - 4 + i;
                      } else {
                        pageNum = pagination.page - 2 + i;
                      }

                      return (
                        <Button
                          key={pageNum}
                          variant={pagination.page === pageNum ? 'default' : 'outline'}
                          size="sm"
                          onClick={() => handlePageChange(pageNum)}
                          className="w-8 h-8 p-0"
                        >
                          {pageNum}
                        </Button>
                      );
                    })}
                  </div>
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => handlePageChange(pagination.page + 1)}
                    disabled={pagination.page >= pagination.totalPages}
                  >
                    Next
                  </Button>
                </div>
              </div>
            )}
          </>
        )}
      </div>

      <Dialog open={isDetailDialogOpen} onClose={() => setIsDetailDialogOpen(false)}>
        <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
          {selectedTicket && (
            <>
              <DialogHeader>
                <div className="flex items-start justify-between">
                  <div>
                    <DialogTitle className="text-xl">{selectedTicket.subject}</DialogTitle>
                    <DialogDescription className="mt-1">
                      Ticket #{selectedTicket.id.slice(0, 8)} - Created by {selectedTicket.createdBy.name}
                    </DialogDescription>
                  </div>
                  <div className="flex items-center space-x-2">
                    <span className={'inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ' + STATUS_CONFIG[selectedTicket.status].bgColor + ' ' + STATUS_CONFIG[selectedTicket.status].textColor}>
                      {STATUS_CONFIG[selectedTicket.status].label}
                    </span>
                    <span className={'inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ' + PRIORITY_CONFIG[selectedTicket.priority].bgColor + ' ' + PRIORITY_CONFIG[selectedTicket.priority].textColor}>
                      {PRIORITY_CONFIG[selectedTicket.priority].label}
                    </span>
                  </div>
                </div>
              </DialogHeader>

              <div className="space-y-4 py-4">
                <div className="grid grid-cols-2 gap-4 text-sm">
                  <div>
                    <span className="text-gray-500 dark:text-gray-400">Organization:</span>
                    <p className="font-medium text-gray-900 dark:text-white">{selectedTicket.organization.name}</p>
                  </div>
                  <div>
                    <span className="text-gray-500 dark:text-gray-400">Assignee:</span>
                    <div className="flex items-center mt-1">
                      <Select
                        value={selectedTicket.assignee?.id || 'unassigned'}
                        onValueChange={(value) => handleAssignTicket(selectedTicket.id, value === 'unassigned' ? null : value)}
                      >
                        <SelectTrigger className="w-full h-8">
                          <SelectValue />
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value="unassigned">Unassigned</SelectItem>
                          {assignees.map((assignee) => (
                            <SelectItem key={assignee.id} value={assignee.id}>
                              {assignee.name}
                            </SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                    </div>
                  </div>
                  <div>
                    <span className="text-gray-500 dark:text-gray-400">Created:</span>
                    <p className="font-medium text-gray-900 dark:text-white">{formatDate(selectedTicket.createdAt)}</p>
                  </div>
                  <div>
                    <span className="text-gray-500 dark:text-gray-400">Last Updated:</span>
                    <p className="font-medium text-gray-900 dark:text-white">{getRelativeTime(selectedTicket.updatedAt)}</p>
                  </div>
                </div>

                <div className="border-t border-gray-200 dark:border-gray-700 pt-4">
                  <h4 className="text-sm font-medium text-gray-900 dark:text-white mb-2">Description</h4>
                  <p className="text-sm text-gray-600 dark:text-gray-300 whitespace-pre-wrap">
                    {selectedTicket.description}
                  </p>
                </div>

                {selectedTicket.messages.length > 0 && (
                  <div className="border-t border-gray-200 dark:border-gray-700 pt-4">
                    <h4 className="text-sm font-medium text-gray-900 dark:text-white mb-3">Messages</h4>
                    <div className="space-y-3 max-h-64 overflow-y-auto">
                      {selectedTicket.messages.map((message) => (
                        <div key={message.id} className="bg-gray-50 dark:bg-gray-800 rounded-lg p-3">
                          <div className="flex items-center justify-between mb-1">
                            <span className="text-sm font-medium text-gray-900 dark:text-white">
                              {message.author.name}
                            </span>
                            <span className="text-xs text-gray-500 dark:text-gray-400">
                              {getRelativeTime(message.createdAt)}
                            </span>
                          </div>
                          <p className="text-sm text-gray-600 dark:text-gray-300 whitespace-pre-wrap">
                            {message.content}
                          </p>
                        </div>
                      ))}
                    </div>
                  </div>
                )}

                <div className="border-t border-gray-200 dark:border-gray-700 pt-4">
                  <h4 className="text-sm font-medium text-gray-900 dark:text-white mb-2">Reply</h4>
                  <Textarea
                    placeholder="Type your reply..."
                    value={replyContent}
                    onChange={(e) => setReplyContent(e.target.value)}
                    rows={3}
                  />
                </div>
              </div>

              <DialogFooter className="flex items-center justify-between">
                <div className="flex items-center space-x-2">
                  <Select
                    value={selectedTicket.status}
                    onValueChange={(value) => handleUpdateStatus(selectedTicket.id, value as SupportTicket['status'])}
                  >
                    <SelectTrigger className="w-[140px]">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="open">Open</SelectItem>
                      <SelectItem value="in_progress">In Progress</SelectItem>
                      <SelectItem value="resolved">Resolved</SelectItem>
                      <SelectItem value="closed">Closed</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
                <div className="flex items-center space-x-2">
                  <Button variant="outline" onClick={() => setIsDetailDialogOpen(false)}>
                    Close
                  </Button>
                  <Button
                    onClick={handleReply}
                    disabled={!replyContent.trim() || isReplying}
                  >
                    {isReplying ? 'Sending...' : 'Send Reply'}
                  </Button>
                </div>
              </DialogFooter>
            </>
          )}
        </DialogContent>
      </Dialog>

      <Dialog open={isCreateDialogOpen} onClose={() => setIsCreateDialogOpen(false)}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Create Support Ticket</DialogTitle>
            <DialogDescription>
              Create a new support ticket for tracking and resolution.
            </DialogDescription>
          </DialogHeader>

          <div className="space-y-4 py-4">
            <div>
              <label className="text-sm font-medium text-gray-900 dark:text-white mb-1.5 block">
                Subject
              </label>
              <Input
                placeholder="Brief description of the issue"
                value={newTicket.subject}
                onChange={(e) => setNewTicket(prev => ({ ...prev, subject: e.target.value }))}
              />
            </div>

            <div>
              <label className="text-sm font-medium text-gray-900 dark:text-white mb-1.5 block">
                Description
              </label>
              <Textarea
                placeholder="Detailed description of the issue..."
                value={newTicket.description}
                onChange={(e) => setNewTicket(prev => ({ ...prev, description: e.target.value }))}
                rows={4}
              />
            </div>

            <div>
              <label className="text-sm font-medium text-gray-900 dark:text-white mb-1.5 block">
                Priority
              </label>
              <Select
                value={newTicket.priority}
                onValueChange={(value) => setNewTicket(prev => ({ ...prev, priority: value as SupportTicket['priority'] }))}
              >
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="low">Low</SelectItem>
                  <SelectItem value="medium">Medium</SelectItem>
                  <SelectItem value="high">High</SelectItem>
                  <SelectItem value="urgent">Urgent</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </div>

          <DialogFooter>
            <Button variant="outline" onClick={() => setIsCreateDialogOpen(false)}>
              Cancel
            </Button>
            <Button
              onClick={handleCreateTicket}
              disabled={!newTicket.subject.trim() || !newTicket.description.trim() || isCreating}
            >
              {isCreating ? 'Creating...' : 'Create Ticket'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
