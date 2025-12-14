'use client';

import { useState, useEffect } from 'react';
import { CheckCircle2, Circle, Upload, FileText, Scissors, Share2, X } from 'lucide-react';
import { CardGlass } from '@/components/ui/card-glass';
import { Button } from '@/components/ui/button';

interface ChecklistStep {
  id: string;
  title: string;
  description: string;
  icon: React.ReactNode;
  completed: boolean;
}

interface GettingStartedChecklistProps {
  completedSteps?: string[];
  onDismiss?: () => void;
}

/**
 * GettingStartedChecklist Component
 * Sidebar checklist to guide new users through their first meeting experience
 */
export function GettingStartedChecklist({
  completedSteps = [],
  onDismiss
}: GettingStartedChecklistProps) {
  const [dismissed, setDismissed] = useState(false);
  const [steps, setSteps] = useState<ChecklistStep[]>([
    {
      id: 'upload-meeting',
      title: 'Upload or record your first meeting',
      description: 'Get started by adding your first meeting recording',
      icon: <Upload className="h-5 w-5" />,
      completed: false
    },
    {
      id: 'review-summary',
      title: 'Review AI-generated summary',
      description: 'Check out the automated transcript and insights',
      icon: <FileText className="h-5 w-5" />,
      completed: false
    },
    {
      id: 'create-highlight',
      title: 'Create a highlight clip',
      description: 'Extract and save key moments from your meeting',
      icon: <Scissors className="h-5 w-5" />,
      completed: false
    },
    {
      id: 'share-team',
      title: 'Share with your team',
      description: 'Collaborate by sharing insights with teammates',
      icon: <Share2 className="h-5 w-5" />,
      completed: false
    }
  ]);

  // Update completed steps when prop changes
  useEffect(() => {
    setSteps(prevSteps =>
      prevSteps.map(step => ({
        ...step,
        completed: completedSteps.includes(step.id)
      }))
    );
  }, [completedSteps]);

  // Check if stored in localStorage
  useEffect(() => {
    const isDismissed = localStorage.getItem('gettingStartedDismissed') === 'true';
    setDismissed(isDismissed);
  }, []);

  const handleDismiss = () => {
    setDismissed(true);
    localStorage.setItem('gettingStartedDismissed', 'true');
    onDismiss?.();
  };

  const handleReopen = () => {
    setDismissed(false);
    localStorage.removeItem('gettingStartedDismissed');
  };

  const completedCount = steps.filter(step => step.completed).length;
  const totalSteps = steps.length;
  const progressPercentage = (completedCount / totalSteps) * 100;

  // If dismissed, show a small button to reopen
  if (dismissed) {
    return (
      <Button
        variant="outline"
        size="sm"
        onClick={handleReopen}
        className="border-slate-700 bg-slate-800/30 text-slate-300 hover:bg-slate-800/60 hover:text-white hover:border-slate-600"
      >
        <CheckCircle2 className="h-4 w-4 mr-2" />
        Getting Started
      </Button>
    );
  }

  return (
    <CardGlass variant="default" padding="md" className="w-full max-w-sm">
      {/* Header */}
      <div className="flex items-start justify-between mb-4">
        <div>
          <h3 className="text-lg font-semibold text-white mb-1">Getting Started</h3>
          <p className="text-sm text-slate-400">
            {completedCount} of {totalSteps} completed
          </p>
        </div>
        <button
          onClick={handleDismiss}
          className="text-slate-400 hover:text-white transition-colors p-1 rounded hover:bg-slate-800/50"
          aria-label="Dismiss checklist"
        >
          <X className="h-5 w-5" />
        </button>
      </div>

      {/* Progress Bar */}
      <div className="mb-6">
        <div className="bg-slate-800/50 rounded-full h-2 overflow-hidden">
          <div
            className="bg-gradient-to-r from-purple-500 to-cyan-500 h-full transition-all duration-500 ease-out"
            style={{ width: `${progressPercentage}%` }}
          />
        </div>
      </div>

      {/* Steps */}
      <div className="space-y-4">
        {steps.map((step, index) => (
          <div
            key={step.id}
            className={`flex items-start space-x-3 p-3 rounded-lg transition-all duration-200 ${
              step.completed
                ? 'bg-emerald-500/10 border border-emerald-500/20'
                : 'bg-slate-800/30 border border-slate-700/50 hover:bg-slate-800/50 hover:border-slate-600/50'
            }`}
          >
            {/* Step Icon/Checkbox */}
            <div className="flex-shrink-0 mt-0.5">
              {step.completed ? (
                <CheckCircle2 className="h-6 w-6 text-emerald-400" />
              ) : (
                <Circle className="h-6 w-6 text-slate-500" />
              )}
            </div>

            {/* Step Content */}
            <div className="flex-1 min-w-0">
              <div className="flex items-center space-x-2 mb-1">
                <div
                  className={`${
                    step.completed ? 'text-emerald-400' : 'text-slate-400'
                  }`}
                >
                  {step.icon}
                </div>
                <h4
                  className={`text-sm font-medium ${
                    step.completed ? 'text-white line-through' : 'text-white'
                  }`}
                >
                  {step.title}
                </h4>
              </div>
              <p
                className={`text-xs ${
                  step.completed ? 'text-slate-500' : 'text-slate-400'
                }`}
              >
                {step.description}
              </p>
            </div>

            {/* Step Number */}
            <div
              className={`flex-shrink-0 text-xs font-medium px-2 py-1 rounded ${
                step.completed
                  ? 'bg-emerald-500/20 text-emerald-400'
                  : 'bg-slate-700/50 text-slate-500'
              }`}
            >
              {index + 1}
            </div>
          </div>
        ))}
      </div>

      {/* Completion Message */}
      {completedCount === totalSteps && (
        <div className="mt-6 p-4 bg-gradient-to-r from-purple-500/20 to-cyan-500/20 border border-purple-500/30 rounded-lg">
          <div className="flex items-center space-x-3">
            <div className="bg-purple-500/20 p-2 rounded-lg">
              <CheckCircle2 className="h-6 w-6 text-purple-400" />
            </div>
            <div>
              <h4 className="text-sm font-semibold text-white mb-1">
                All set! You're a pro now!
              </h4>
              <p className="text-xs text-slate-400">
                You've completed all the getting started steps
              </p>
            </div>
          </div>
        </div>
      )}

      {/* Footer */}
      <div className="mt-6 pt-4 border-t border-slate-700/50">
        <p className="text-xs text-slate-500 text-center">
          Need help?{' '}
          <a
            href="/docs"
            className="text-purple-400 hover:text-purple-300 underline"
          >
            View documentation
          </a>
        </p>
      </div>
    </CardGlass>
  );
}
