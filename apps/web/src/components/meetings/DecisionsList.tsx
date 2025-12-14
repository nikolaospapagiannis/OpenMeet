'use client';

import { useState } from 'react';
import {
  CheckCircle2,
  User,
  Clock,
  ChevronRight,
  MessageSquare,
  Copy,
} from 'lucide-react';
import { Button } from '@/components/ui/button';

interface Decision {
  id: string;
  text: string;
  decidedBy?: string;
  timestamp?: number;
  context?: string;
}

interface DecisionsListProps {
  decisions: Decision[];
  onSeekToTime?: (time: number) => void;
}

export function DecisionsList({ decisions, onSeekToTime }: DecisionsListProps) {
  const [copiedId, setCopiedId] = useState<string | null>(null);
  const [expandedContext, setExpandedContext] = useState<Set<string>>(new Set());

  const handleCopyDecision = async (decision: Decision) => {
    try {
      const text = `Decision: ${decision.text}${
        decision.decidedBy ? `\nDecided by: ${decision.decidedBy}` : ''
      }${decision.context ? `\nContext: ${decision.context}` : ''}`;
      await navigator.clipboard.writeText(text);
      setCopiedId(decision.id);
      setTimeout(() => setCopiedId(null), 2000);
    } catch (error) {
      console.error('Failed to copy:', error);
    }
  };

  const toggleContext = (id: string) => {
    setExpandedContext((prev) => {
      const newSet = new Set(prev);
      if (newSet.has(id)) {
        newSet.delete(id);
      } else {
        newSet.add(id);
      }
      return newSet;
    });
  };

  const formatTime = (seconds: number) => {
    const mins = Math.floor(seconds / 60);
    const secs = Math.floor(seconds % 60);
    return `${mins}:${secs.toString().padStart(2, '0')}`;
  };

  if (decisions.length === 0) {
    return (
      <div className="text-center py-8 text-slate-500">
        <p>No decisions recorded</p>
      </div>
    );
  }

  return (
    <div className="space-y-3">
      {decisions.map((decision) => (
        <div
          key={decision.id}
          className="group p-4 bg-slate-800/40 border border-slate-700 rounded-lg hover:border-slate-600 transition-all"
        >
          <div className="flex items-start space-x-3">
            {/* Icon */}
            <div className="flex-shrink-0 mt-0.5">
              <CheckCircle2 className="h-5 w-5 text-emerald-400" />
            </div>

            {/* Content */}
            <div className="flex-1 min-w-0">
              {/* Decision Text */}
              <p className="text-slate-200 font-medium mb-2">{decision.text}</p>

              {/* Metadata */}
              <div className="flex flex-wrap items-center gap-3 mb-2">
                {/* Decided By */}
                {decision.decidedBy && (
                  <div className="flex items-center space-x-1 text-sm text-slate-400">
                    <User className="h-3.5 w-3.5" />
                    <span>{decision.decidedBy}</span>
                  </div>
                )}

                {/* Timestamp */}
                {decision.timestamp !== undefined && onSeekToTime && (
                  <button
                    onClick={() => onSeekToTime(decision.timestamp!)}
                    className="flex items-center space-x-1 text-sm text-purple-400 hover:text-purple-300 transition-colors group/timestamp"
                  >
                    <Clock className="h-3.5 w-3.5" />
                    <span>{formatTime(decision.timestamp)}</span>
                    <ChevronRight className="h-3 w-3 opacity-0 group-hover/timestamp:opacity-100 transition-opacity" />
                  </button>
                )}
              </div>

              {/* Context */}
              {decision.context && (
                <div className="mt-2">
                  <button
                    onClick={() => toggleContext(decision.id)}
                    className="flex items-center space-x-1 text-sm text-slate-400 hover:text-white transition-colors"
                  >
                    <MessageSquare className="h-3.5 w-3.5" />
                    <span>
                      {expandedContext.has(decision.id) ? 'Hide context' : 'Show context'}
                    </span>
                  </button>

                  {expandedContext.has(decision.id) && (
                    <div className="mt-2 p-3 bg-slate-900/60 border border-slate-700 rounded-lg">
                      <p className="text-sm text-slate-400 leading-relaxed">{decision.context}</p>
                    </div>
                  )}
                </div>
              )}
            </div>

            {/* Copy Button */}
            <Button
              variant="ghost"
              size="sm"
              onClick={() => handleCopyDecision(decision)}
              className="opacity-0 group-hover:opacity-100 transition-opacity h-8 w-8 p-0 text-slate-400 hover:text-white flex-shrink-0"
            >
              {copiedId === decision.id ? (
                <CheckCircle2 className="h-4 w-4 text-emerald-400" />
              ) : (
                <Copy className="h-4 w-4" />
              )}
            </Button>
          </div>
        </div>
      ))}
    </div>
  );
}
