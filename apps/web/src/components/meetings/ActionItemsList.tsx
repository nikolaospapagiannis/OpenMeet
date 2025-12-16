'use client';

import { useState } from 'react';
import {
  CheckCircle2,
  Circle,
  Calendar,
  User,
  MoreVertical,
  ExternalLink,
  Loader2,
  ChevronDown,
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
  DropdownMenuSeparator,
  DropdownMenuLabel,
} from '@/components/ui/dropdown-menu';
import apiClient from '@/lib/api';

interface ActionItem {
  id: string;
  description: string;
  assignee?: string;
  dueDate?: string;
  priority: 'low' | 'medium' | 'high';
  status: 'pending' | 'in_progress' | 'completed';
}

interface ActionItemsListProps {
  meetingId: string;
  actionItems: ActionItem[];
  onUpdate?: (items: ActionItem[]) => void;
}

export function ActionItemsList({
  meetingId,
  actionItems: initialItems,
  onUpdate,
}: ActionItemsListProps) {
  const [items, setItems] = useState<ActionItem[]>(initialItems);
  const [editingItem, setEditingItem] = useState<string | null>(null);
  const [editedAssignee, setEditedAssignee] = useState('');
  const [editedDueDate, setEditedDueDate] = useState('');
  const [updatingItem, setUpdatingItem] = useState<string | null>(null);
  const [exportingTo, setExportingTo] = useState<string | null>(null);

  const handleToggleComplete = async (item: ActionItem) => {
    setUpdatingItem(item.id);
    try {
      const newStatus = item.status === 'completed' ? 'pending' : 'completed';
      const response = await apiClient.patch(`/meetings/${meetingId}/action-items/${item.id}`, {
        status: newStatus,
      });

      const updatedItems = items.map((i) =>
        i.id === item.id ? { ...i, status: newStatus as ActionItem['status'] } : i
      );
      setItems(updatedItems);
      onUpdate?.(updatedItems);
    } catch (error) {
      console.error('Failed to update action item:', error);
    } finally {
      setUpdatingItem(null);
    }
  };

  const handleUpdateAssignee = async (item: ActionItem) => {
    setUpdatingItem(item.id);
    try {
      const response = await apiClient.patch(`/meetings/${meetingId}/action-items/${item.id}`, {
        assignee: editedAssignee,
      });

      const updatedItems = items.map((i) =>
        i.id === item.id ? { ...i, assignee: editedAssignee } : i
      );
      setItems(updatedItems);
      onUpdate?.(updatedItems);
      setEditingItem(null);
    } catch (error) {
      console.error('Failed to update assignee:', error);
    } finally {
      setUpdatingItem(null);
    }
  };

  const handleUpdateDueDate = async (item: ActionItem) => {
    setUpdatingItem(item.id);
    try {
      const response = await apiClient.patch(`/meetings/${meetingId}/action-items/${item.id}`, {
        dueDate: editedDueDate,
      });

      const updatedItems = items.map((i) =>
        i.id === item.id ? { ...i, dueDate: editedDueDate } : i
      );
      setItems(updatedItems);
      onUpdate?.(updatedItems);
      setEditingItem(null);
    } catch (error) {
      console.error('Failed to update due date:', error);
    } finally {
      setUpdatingItem(null);
    }
  };

  const handleExportTo = async (item: ActionItem, integration: string) => {
    setExportingTo(item.id);
    try {
      await apiClient.post(`/meetings/${meetingId}/action-items/${item.id}/export`, {
        integration,
      });
      // Show success toast
    } catch (error) {
      console.error(`Failed to export to ${integration}:`, error);
    } finally {
      setExportingTo(null);
    }
  };

  const getPriorityColor = (priority: string) => {
    switch (priority) {
      case 'high':
        return 'bg-red-500/20 text-red-400 border-red-500/30';
      case 'medium':
        return 'bg-amber-500/20 text-amber-400 border-amber-500/30';
      case 'low':
        return 'bg-emerald-500/20 text-emerald-400 border-emerald-500/30';
      default:
        return 'bg-slate-500/20 text-slate-400 border-slate-500/30';
    }
  };

  if (items.length === 0) {
    return (
      <div className="text-center py-8 text-slate-500">
        <p>No action items found</p>
      </div>
    );
  }

  return (
    <div className="space-y-3">
      {items.map((item) => (
        <div
          key={item.id}
          className={`p-4 bg-slate-800/40 border rounded-lg transition-all ${
            item.status === 'completed'
              ? 'border-emerald-500/30 bg-emerald-500/5'
              : 'border-slate-700 hover:border-slate-600'
          }`}
        >
          <div className="flex items-start space-x-3">
            {/* Checkbox */}
            <button
              onClick={() => handleToggleComplete(item)}
              disabled={updatingItem === item.id}
              className="mt-0.5 flex-shrink-0 transition-transform hover:scale-110"
            >
              {updatingItem === item.id ? (
                <Loader2 className="h-5 w-5 text-purple-400 animate-spin" />
              ) : item.status === 'completed' ? (
                <CheckCircle2 className="h-5 w-5 text-emerald-400" />
              ) : (
                <Circle className="h-5 w-5 text-slate-400 hover:text-purple-400" />
              )}
            </button>

            {/* Content */}
            <div className="flex-1 min-w-0">
              <p
                className={`text-slate-200 font-medium mb-2 ${
                  item.status === 'completed' ? 'line-through text-slate-500' : ''
                }`}
              >
                {item.description}
              </p>

              <div className="flex flex-wrap items-center gap-3">
                {/* Assignee */}
                <div className="flex items-center space-x-2">
                  <User className="h-3.5 w-3.5 text-slate-400" />
                  {editingItem === `${item.id}-assignee` ? (
                    <div className="flex items-center space-x-1">
                      <Input
                        value={editedAssignee}
                        onChange={(e) => setEditedAssignee(e.target.value)}
                        placeholder="Assignee name"
                        className="h-7 w-32 text-sm bg-slate-900 border-slate-700"
                        onKeyDown={(e) => {
                          if (e.key === 'Enter') handleUpdateAssignee(item);
                          if (e.key === 'Escape') setEditingItem(null);
                        }}
                      />
                      <Button
                        size="sm"
                        onClick={() => handleUpdateAssignee(item)}
                        className="h-7 px-2 bg-purple-600 hover:bg-purple-700"
                      >
                        Save
                      </Button>
                    </div>
                  ) : (
                    <button
                      onClick={() => {
                        setEditingItem(`${item.id}-assignee`);
                        setEditedAssignee(item.assignee || '');
                      }}
                      className="text-sm text-slate-400 hover:text-white"
                    >
                      {item.assignee || 'Unassigned'}
                    </button>
                  )}
                </div>

                {/* Due Date */}
                <div className="flex items-center space-x-2">
                  <Calendar className="h-3.5 w-3.5 text-slate-400" />
                  {editingItem === `${item.id}-dueDate` ? (
                    <div className="flex items-center space-x-1">
                      <Input
                        type="date"
                        value={editedDueDate}
                        onChange={(e) => setEditedDueDate(e.target.value)}
                        className="h-7 w-36 text-sm bg-slate-900 border-slate-700"
                        onKeyDown={(e) => {
                          if (e.key === 'Enter') handleUpdateDueDate(item);
                          if (e.key === 'Escape') setEditingItem(null);
                        }}
                      />
                      <Button
                        size="sm"
                        onClick={() => handleUpdateDueDate(item)}
                        className="h-7 px-2 bg-purple-600 hover:bg-purple-700"
                      >
                        Save
                      </Button>
                    </div>
                  ) : (
                    <button
                      onClick={() => {
                        setEditingItem(`${item.id}-dueDate`);
                        setEditedDueDate(
                          item.dueDate ? new Date(item.dueDate).toISOString().split('T')[0] : ''
                        );
                      }}
                      className="text-sm text-slate-400 hover:text-white"
                    >
                      {item.dueDate
                        ? new Date(item.dueDate).toLocaleDateString()
                        : 'No due date'}
                    </button>
                  )}
                </div>

                {/* Priority Badge */}
                <span
                  className={`px-2 py-0.5 text-xs rounded-full font-medium border ${getPriorityColor(
                    item.priority
                  )}`}
                >
                  {item.priority}
                </span>
              </div>
            </div>

            {/* More Options */}
            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <Button
                  variant="ghost"
                  size="sm"
                  className="h-8 w-8 p-0 text-slate-400 hover:text-white"
                >
                  <MoreVertical className="h-4 w-4" />
                </Button>
              </DropdownMenuTrigger>
              <DropdownMenuContent
                align="end"
                className="w-48 bg-slate-900 border border-slate-700 rounded-lg shadow-xl p-1"
              >
                <DropdownMenuLabel className="px-2 py-1.5 text-xs font-semibold text-slate-400">
                  Export to
                </DropdownMenuLabel>
                <DropdownMenuItem
                  onClick={() => handleExportTo(item, 'asana')}
                  disabled={exportingTo === item.id}
                  className="px-2 py-1.5 text-sm text-slate-300 hover:bg-slate-800 rounded cursor-pointer flex items-center"
                >
                  <ExternalLink className="h-3.5 w-3.5 mr-2" />
                  Asana
                </DropdownMenuItem>
                <DropdownMenuItem
                  onClick={() => handleExportTo(item, 'jira')}
                  disabled={exportingTo === item.id}
                  className="px-2 py-1.5 text-sm text-slate-300 hover:bg-slate-800 rounded cursor-pointer flex items-center"
                >
                  <ExternalLink className="h-3.5 w-3.5 mr-2" />
                  Jira
                </DropdownMenuItem>
                <DropdownMenuItem
                  onClick={() => handleExportTo(item, 'notion')}
                  disabled={exportingTo === item.id}
                  className="px-2 py-1.5 text-sm text-slate-300 hover:bg-slate-800 rounded cursor-pointer flex items-center"
                >
                  <ExternalLink className="h-3.5 w-3.5 mr-2" />
                  Notion
                </DropdownMenuItem>
                <DropdownMenuSeparator className="my-1 h-px bg-slate-700" />
                <DropdownMenuItem
                  onClick={() => handleExportTo(item, 'slack')}
                  disabled={exportingTo === item.id}
                  className="px-2 py-1.5 text-sm text-slate-300 hover:bg-slate-800 rounded cursor-pointer flex items-center"
                >
                  <ExternalLink className="h-3.5 w-3.5 mr-2" />
                  Slack
                </DropdownMenuItem>
                <DropdownMenuItem
                  onClick={() => handleExportTo(item, 'teams')}
                  disabled={exportingTo === item.id}
                  className="px-2 py-1.5 text-sm text-slate-300 hover:bg-slate-800 rounded cursor-pointer flex items-center"
                >
                  <ExternalLink className="h-3.5 w-3.5 mr-2" />
                  Microsoft Teams
                </DropdownMenuItem>
              </DropdownMenuContent>
            </DropdownMenu>
          </div>
        </div>
      ))}
    </div>
  );
}
