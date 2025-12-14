'use client';

import { useState, useCallback } from 'react';
import { Plus, X, Upload, FileText, Calendar, Settings, Loader2, AlertCircle } from 'lucide-react';
import { CardGlass } from '@/components/ui/card-glass';
import { Button } from '@/components/ui/button-v2';
import { cn } from '@/lib/utils';

interface Action {
  icon: React.ReactNode;
  label: string;
  onClick: () => void | Promise<void>;
  color?: string;
  isLoading?: boolean;
  error?: string;
}

interface QuickActionsMenuProps {
  actions?: Action[];
  className?: string;
  position?: 'bottom-right' | 'bottom-left' | 'top-right' | 'top-left';
  onError?: (error: string, action: string) => void;
}

const defaultActions: Action[] = [
  {
    icon: <Upload className="w-5 h-5" />,
    label: 'Upload Audio',
    onClick: () => console.log('Upload'),
    color: 'from-teal-500 to-cyan-500'
  },
  {
    icon: <FileText className="w-5 h-5" />,
    label: 'New Transcript',
    onClick: () => console.log('Transcript'),
    color: 'from-purple-500 to-indigo-500'
  },
  {
    icon: <Calendar className="w-5 h-5" />,
    label: 'Schedule Meeting',
    onClick: () => console.log('Schedule'),
    color: 'from-blue-500 to-cyan-500'
  },
  {
    icon: <Settings className="w-5 h-5" />,
    label: 'Settings',
    onClick: () => console.log('Settings'),
    color: 'from-slate-500 to-slate-600'
  }
];

export function QuickActionsMenu({
  actions = defaultActions,
  className,
  position = 'bottom-right',
  onError
}: QuickActionsMenuProps) {
  const [isOpen, setIsOpen] = useState(false);
  const [loadingAction, setLoadingAction] = useState<string | null>(null);
  const [actionError, setActionError] = useState<{ action: string; error: string } | null>(null);

  const positionClasses = {
    'bottom-right': 'bottom-8 right-8',
    'bottom-left': 'bottom-8 left-8',
    'top-right': 'top-8 right-8',
    'top-left': 'top-8 left-8'
  };

  const menuPositionClasses = {
    'bottom-right': 'bottom-20 right-0',
    'bottom-left': 'bottom-20 left-0',
    'top-right': 'top-20 right-0',
    'top-left': 'top-20 left-0'
  };

  const handleActionClick = useCallback(async (action: Action, idx: number) => {
    setActionError(null);
    setLoadingAction(action.label);

    try {
      await action.onClick();
      setIsOpen(false);
    } catch (err: any) {
      const errorMessage = err?.message || 'Action failed';
      setActionError({ action: action.label, error: errorMessage });
      onError?.(errorMessage, action.label);
    } finally {
      setLoadingAction(null);
    }
  }, [onError]);

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'Escape') {
      setIsOpen(false);
    }
  };

  return (
    <div
      className={cn("fixed z-50", positionClasses[position], className)}
      onKeyDown={handleKeyDown}
    >
      {/* Actions Menu */}
      {isOpen && (
        <div className={cn(
          "absolute",
          menuPositionClasses[position]
        )}>
          <CardGlass
            variant="elevated"
            className={cn(
              "p-3 space-y-2 min-w-[200px]",
              "animate-in fade-in slide-in-from-bottom-4 duration-300"
            )}
          >
            {/* Error message */}
            {actionError && (
              <div className="p-2 rounded-lg bg-red-500/10 border border-red-500/30 flex items-center gap-2 mb-2 animate-in fade-in duration-200">
                <AlertCircle className="w-4 h-4 text-red-400 flex-shrink-0" />
                <span className="text-xs text-red-300">{actionError.error}</span>
                <button
                  onClick={() => setActionError(null)}
                  className="ml-auto text-red-400 hover:text-red-300"
                >
                  <X className="w-3 h-3" />
                </button>
              </div>
            )}

            {actions.map((action, idx) => {
              const isLoading = loadingAction === action.label || action.isLoading;
              const hasError = action.error || (actionError?.action === action.label);

              return (
                <button
                  key={idx}
                  onClick={() => handleActionClick(action, idx)}
                  disabled={isLoading}
                  className={cn(
                    "w-full flex items-center gap-3 p-3 rounded-lg",
                    "text-white text-left transition-all duration-200",
                    "hover:scale-105 active:scale-95",
                    "bg-gradient-to-r backdrop-blur-xl",
                    "from-slate-800/50 to-slate-900/50",
                    "hover:from-slate-700/50 hover:to-slate-800/50",
                    "border border-white/10 hover:border-white/20",
                    "shadow-lg hover:shadow-xl",
                    "group",
                    "focus:outline-none focus:ring-2 focus:ring-teal-500/50",
                    isLoading && "opacity-70 cursor-wait",
                    hasError && "border-red-500/30"
                  )}
                >
                  <div className={cn(
                    "w-10 h-10 rounded-lg flex items-center justify-center",
                    "bg-gradient-to-br shadow-lg transition-all duration-200",
                    "group-hover:scale-110 group-hover:shadow-xl",
                    hasError ? "from-red-500 to-rose-500" : action.color || "from-teal-500 to-cyan-500"
                  )}>
                    {isLoading ? (
                      <Loader2 className="w-5 h-5 animate-spin" />
                    ) : hasError ? (
                      <AlertCircle className="w-5 h-5" />
                    ) : (
                      action.icon
                    )}
                  </div>
                  <div className="flex-1">
                    <span className="font-medium">{action.label}</span>
                    {isLoading && (
                      <span className="block text-xs text-slate-400 mt-0.5">Loading...</span>
                    )}
                    {action.error && !isLoading && (
                      <span className="block text-xs text-red-400 mt-0.5">{action.error}</span>
                    )}
                  </div>
                </button>
              );
            })}
          </CardGlass>
        </div>
      )}

      {/* FAB Button */}
      <Button
        variant="gradient-primary"
        size="icon"
        className={cn(
          "w-16 h-16 rounded-full shadow-2xl transition-all duration-300",
          "hover:scale-110 active:scale-95",
          "shadow-teal-500/30 hover:shadow-teal-500/50",
          "focus:outline-none focus:ring-4 focus:ring-teal-500/30",
          isOpen && "rotate-45 scale-110 shadow-teal-500/50"
        )}
        onClick={() => setIsOpen(!isOpen)}
        aria-expanded={isOpen}
        aria-label={isOpen ? "Close quick actions menu" : "Open quick actions menu"}
      >
        {isOpen ? (
          <X className="w-6 h-6" />
        ) : (
          <Plus className="w-6 h-6" />
        )}

        {/* Ripple effect */}
        <div className="absolute inset-0 rounded-full">
          <div className="absolute inset-0 rounded-full border-2 border-teal-400/30 animate-ping" />
          <div
            className="absolute inset-0 rounded-full border-2 border-teal-400/20 animate-ping"
            style={{ animationDelay: '0.5s' }}
          />
        </div>

        {/* Glow effect */}
        <div className="absolute inset-0 rounded-full bg-gradient-to-r from-teal-500 to-cyan-500 blur-xl opacity-50 -z-10" />
      </Button>

      {/* Backdrop overlay */}
      {isOpen && (
        <div
          className="fixed inset-0 bg-black/20 backdrop-blur-sm -z-10 animate-in fade-in duration-300"
          onClick={() => setIsOpen(false)}
        />
      )}
    </div>
  );
}
