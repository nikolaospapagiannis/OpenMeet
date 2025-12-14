'use client';

import { useState } from 'react';
import { Target, Plus, Calendar, TrendingUp, Trash2, Pause, Play, CheckCircle, Clock, Edit2 } from 'lucide-react';
import {
  CardGlass,
  CardGlassContent,
  CardGlassHeader,
  CardGlassTitle
} from '@/components/ui/card-glass';
import { Button } from '@/components/ui/button';
import { CoachingGoal, CoachingMetrics } from '@/hooks/useCoaching';

interface CoachingGoalsProps {
  goals: CoachingGoal[];
  onCreateGoal?: (goal: Partial<CoachingGoal>) => void;
  onUpdateGoal?: (goalId: string, updates: Partial<CoachingGoal>) => void;
  onDeleteGoal?: (goalId: string) => void;
  isLoading?: boolean;
}

const METRIC_OPTIONS: { value: keyof CoachingMetrics; label: string; unit: string; defaultTarget: number }[] = [
  { value: 'talkToListenRatio', label: 'Talk-to-Listen Ratio', unit: '%', defaultTarget: 50 },
  { value: 'questionCount', label: 'Questions per Call', unit: '', defaultTarget: 15 },
  { value: 'openEndedQuestions', label: 'Open-ended Questions', unit: '', defaultTarget: 10 },
  { value: 'interruptionCount', label: 'Interruptions', unit: '', defaultTarget: 0 },
  { value: 'engagementScore', label: 'Engagement Score', unit: '%', defaultTarget: 80 },
  { value: 'averageResponseTime', label: 'Response Time', unit: 's', defaultTarget: 2 },
  { value: 'fillerWordsCount', label: 'Filler Words', unit: '', defaultTarget: 5 },
  { value: 'pace', label: 'Speaking Pace', unit: 'wpm', defaultTarget: 150 }
];

export function CoachingGoals({
  goals,
  onCreateGoal,
  onUpdateGoal,
  onDeleteGoal,
  isLoading
}: CoachingGoalsProps) {
  const [isCreating, setIsCreating] = useState(false);
  const [editingGoal, setEditingGoal] = useState<string | null>(null);
  const [newGoal, setNewGoal] = useState<Partial<CoachingGoal>>({
    name: '',
    description: '',
    targetValue: 0,
    metric: 'talkToListenRatio',
    deadline: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000).toISOString().split('T')[0],
    status: 'active'
  });

  const handleCreateGoal = () => {
    if (newGoal.name && newGoal.targetValue && onCreateGoal) {
      onCreateGoal({
        ...newGoal,
        currentValue: 0,
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString()
      });
      setIsCreating(false);
      setNewGoal({
        name: '',
        description: '',
        targetValue: 0,
        metric: 'talkToListenRatio',
        deadline: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000).toISOString().split('T')[0],
        status: 'active'
      });
    }
  };

  const getProgressPercentage = (goal: CoachingGoal): number => {
    if (goal.targetValue === 0) return 0;
    const progress = (goal.currentValue / goal.targetValue) * 100;
    return Math.min(Math.max(progress, 0), 100);
  };

  const getGoalStatus = (goal: CoachingGoal): { color: string; label: string; icon: any } => {
    const progress = getProgressPercentage(goal);
    const daysRemaining = Math.ceil((new Date(goal.deadline).getTime() - Date.now()) / (1000 * 60 * 60 * 24));

    if (goal.status === 'completed') {
      return { color: '#22c55e', label: 'Completed', icon: CheckCircle };
    }
    if (goal.status === 'paused') {
      return { color: '#6b7280', label: 'Paused', icon: Pause };
    }
    if (daysRemaining < 0) {
      return { color: '#ef4444', label: 'Overdue', icon: Clock };
    }
    if (daysRemaining <= 7 && progress < 75) {
      return { color: '#f59e0b', label: 'At Risk', icon: Clock };
    }
    if (progress >= 100) {
      return { color: '#22c55e', label: 'Achieved', icon: CheckCircle };
    }
    return { color: '#3b82f6', label: 'In Progress', icon: TrendingUp };
  };

  const activeGoals = goals.filter(g => g.status === 'active');
  const completedGoals = goals.filter(g => g.status === 'completed');
  const pausedGoals = goals.filter(g => g.status === 'paused');

  return (
    <CardGlass>
      <CardGlassHeader>
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 bg-[var(--ff-purple-500)]/10 rounded-lg flex items-center justify-center">
              <Target className="h-6 w-6 text-[var(--ff-purple-500)]" />
            </div>
            <div>
              <CardGlassTitle>Coaching Goals</CardGlassTitle>
              <p className="text-xs text-[var(--ff-text-muted)] mt-0.5">
                Track your performance improvement objectives
              </p>
            </div>
          </div>
          <Button
            onClick={() => setIsCreating(true)}
            className="px-4 py-2 bg-[var(--ff-purple-500)] text-white rounded-lg hover:bg-[var(--ff-purple-600)] transition-all flex items-center gap-2"
          >
            <Plus className="h-4 w-4" />
            New Goal
          </Button>
        </div>
      </CardGlassHeader>
      <CardGlassContent className="space-y-4">
        {/* Goal Creation Form */}
        {isCreating && (
          <div className="bg-[var(--ff-bg-dark)] rounded-xl border border-[var(--ff-purple-500)]/30 p-4 space-y-4">
            <h3 className="text-sm font-semibold text-[var(--ff-text-primary)]">Create New Goal</h3>

            <div className="grid grid-cols-2 gap-4">
              <div>
                <label className="text-xs text-[var(--ff-text-muted)] block mb-1">Goal Name</label>
                <input
                  type="text"
                  value={newGoal.name}
                  onChange={(e) => setNewGoal({ ...newGoal, name: e.target.value })}
                  placeholder="e.g., Improve Discovery Skills"
                  className="w-full px-3 py-2 bg-[var(--ff-bg-layer)] border border-[var(--ff-border)] rounded-lg text-sm text-[var(--ff-text-primary)] placeholder-[var(--ff-text-muted)] focus:outline-none focus:border-[var(--ff-purple-500)]"
                />
              </div>

              <div>
                <label className="text-xs text-[var(--ff-text-muted)] block mb-1">Metric</label>
                <select
                  value={newGoal.metric}
                  onChange={(e) => {
                    const metric = e.target.value as keyof CoachingMetrics;
                    const option = METRIC_OPTIONS.find(m => m.value === metric);
                    setNewGoal({
                      ...newGoal,
                      metric,
                      targetValue: option?.defaultTarget || 0
                    });
                  }}
                  className="w-full px-3 py-2 bg-[var(--ff-bg-layer)] border border-[var(--ff-border)] rounded-lg text-sm text-[var(--ff-text-primary)] focus:outline-none focus:border-[var(--ff-purple-500)]"
                >
                  {METRIC_OPTIONS.map(option => (
                    <option key={option.value} value={option.value}>
                      {option.label}
                    </option>
                  ))}
                </select>
              </div>
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div>
                <label className="text-xs text-[var(--ff-text-muted)] block mb-1">Target Value</label>
                <input
                  type="number"
                  value={newGoal.targetValue}
                  onChange={(e) => setNewGoal({ ...newGoal, targetValue: parseFloat(e.target.value) })}
                  className="w-full px-3 py-2 bg-[var(--ff-bg-layer)] border border-[var(--ff-border)] rounded-lg text-sm text-[var(--ff-text-primary)] focus:outline-none focus:border-[var(--ff-purple-500)]"
                />
              </div>

              <div>
                <label className="text-xs text-[var(--ff-text-muted)] block mb-1">Deadline</label>
                <input
                  type="date"
                  value={newGoal.deadline?.split('T')[0]}
                  onChange={(e) => setNewGoal({ ...newGoal, deadline: e.target.value })}
                  className="w-full px-3 py-2 bg-[var(--ff-bg-layer)] border border-[var(--ff-border)] rounded-lg text-sm text-[var(--ff-text-primary)] focus:outline-none focus:border-[var(--ff-purple-500)]"
                />
              </div>
            </div>

            <div>
              <label className="text-xs text-[var(--ff-text-muted)] block mb-1">Description (optional)</label>
              <textarea
                value={newGoal.description}
                onChange={(e) => setNewGoal({ ...newGoal, description: e.target.value })}
                placeholder="Describe your goal and how you'll achieve it..."
                rows={2}
                className="w-full px-3 py-2 bg-[var(--ff-bg-layer)] border border-[var(--ff-border)] rounded-lg text-sm text-[var(--ff-text-primary)] placeholder-[var(--ff-text-muted)] focus:outline-none focus:border-[var(--ff-purple-500)] resize-none"
              />
            </div>

            <div className="flex justify-end gap-2">
              <Button
                onClick={() => {
                  setIsCreating(false);
                  setNewGoal({
                    name: '',
                    description: '',
                    targetValue: 0,
                    metric: 'talkToListenRatio',
                    deadline: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000).toISOString().split('T')[0],
                    status: 'active'
                  });
                }}
                className="px-4 py-2 bg-[var(--ff-bg-layer)] text-[var(--ff-text-secondary)] rounded-lg hover:bg-[var(--ff-border)]"
              >
                Cancel
              </Button>
              <Button
                onClick={handleCreateGoal}
                disabled={!newGoal.name || !newGoal.targetValue}
                className="px-4 py-2 bg-[var(--ff-purple-500)] text-white rounded-lg hover:bg-[var(--ff-purple-600)] disabled:opacity-50"
              >
                Create Goal
              </Button>
            </div>
          </div>
        )}

        {/* Active Goals */}
        {activeGoals.length > 0 && (
          <div className="space-y-3">
            <h3 className="text-sm font-semibold text-[var(--ff-text-primary)]">Active Goals</h3>
            {activeGoals.map((goal) => {
              const status = getGoalStatus(goal);
              const StatusIcon = status.icon;
              const progress = getProgressPercentage(goal);
              const daysRemaining = Math.ceil((new Date(goal.deadline).getTime() - Date.now()) / (1000 * 60 * 60 * 24));
              const metricConfig = METRIC_OPTIONS.find(m => m.value === goal.metric);

              return (
                <div
                  key={goal.id}
                  className="bg-[var(--ff-bg-dark)] rounded-xl border border-[var(--ff-border)] hover:border-[var(--ff-purple-500)]/30 transition-all p-4"
                >
                  <div className="flex items-start justify-between mb-3">
                    <div className="flex-1">
                      <div className="flex items-center gap-2 mb-1">
                        <h4 className="font-medium text-[var(--ff-text-primary)]">{goal.name}</h4>
                        <span
                          className="px-2 py-0.5 rounded-full text-xs font-medium flex items-center gap-1"
                          style={{
                            backgroundColor: `${status.color}20`,
                            color: status.color
                          }}
                        >
                          <StatusIcon className="h-3 w-3" />
                          {status.label}
                        </span>
                      </div>
                      {goal.description && (
                        <p className="text-xs text-[var(--ff-text-muted)] mb-2">{goal.description}</p>
                      )}
                      <div className="flex items-center gap-4 text-xs text-[var(--ff-text-muted)]">
                        <span>{metricConfig?.label}</span>
                        <span className="flex items-center gap-1">
                          <Calendar className="h-3 w-3" />
                          {daysRemaining > 0 ? `${daysRemaining} days left` : 'Overdue'}
                        </span>
                      </div>
                    </div>
                    <div className="flex items-center gap-1">
                      <button
                        onClick={() => onUpdateGoal?.(goal.id, { status: 'paused' })}
                        className="p-1.5 bg-[var(--ff-bg-layer)] text-[var(--ff-text-secondary)] rounded hover:bg-[var(--ff-border)] transition-all"
                      >
                        <Pause className="h-3.5 w-3.5" />
                      </button>
                      <button
                        onClick={() => onDeleteGoal?.(goal.id)}
                        className="p-1.5 bg-[var(--ff-bg-layer)] text-red-500 rounded hover:bg-red-500/10 transition-all"
                      >
                        <Trash2 className="h-3.5 w-3.5" />
                      </button>
                    </div>
                  </div>

                  {/* Progress Bar */}
                  <div className="space-y-2">
                    <div className="flex items-center justify-between text-xs">
                      <span className="text-[var(--ff-text-muted)]">Progress</span>
                      <span className="text-[var(--ff-text-primary)] font-medium">
                        {goal.currentValue} / {goal.targetValue} {metricConfig?.unit}
                      </span>
                    </div>
                    <div className="h-2 bg-[var(--ff-bg-layer)] rounded-full overflow-hidden">
                      <div
                        className="h-full rounded-full transition-all duration-500"
                        style={{
                          width: `${progress}%`,
                          backgroundColor: progress >= 100 ? '#22c55e' : status.color
                        }}
                      />
                    </div>
                    <div className="flex items-center justify-between text-xs">
                      <span className="text-[var(--ff-text-muted)]">{progress.toFixed(0)}% complete</span>
                      {progress >= 100 && (
                        <button
                          onClick={() => onUpdateGoal?.(goal.id, { status: 'completed' })}
                          className="text-green-500 hover:text-green-600 font-medium"
                        >
                          Mark as Complete
                        </button>
                      )}
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        )}

        {/* Completed Goals */}
        {completedGoals.length > 0 && (
          <div className="space-y-3">
            <h3 className="text-sm font-semibold text-[var(--ff-text-primary)]">Completed Goals</h3>
            {completedGoals.map((goal) => (
              <div
                key={goal.id}
                className="bg-[var(--ff-bg-dark)] rounded-lg border border-green-500/20 p-3 opacity-75"
              >
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <CheckCircle className="h-4 w-4 text-green-500" />
                    <span className="text-sm text-[var(--ff-text-primary)] line-through">{goal.name}</span>
                  </div>
                  <span className="text-xs text-green-500">
                    Completed {new Date(goal.updatedAt).toLocaleDateString()}
                  </span>
                </div>
              </div>
            ))}
          </div>
        )}

        {/* Empty State */}
        {goals.length === 0 && !isCreating && (
          <div className="text-center py-8">
            <Target className="h-12 w-12 mx-auto text-[var(--ff-text-muted)] mb-3" />
            <p className="text-[var(--ff-text-muted)]">No goals set yet</p>
            <p className="text-xs text-[var(--ff-text-muted)] mt-1">
              Create your first goal to start tracking progress
            </p>
          </div>
        )}
      </CardGlassContent>
    </CardGlass>
  );
}