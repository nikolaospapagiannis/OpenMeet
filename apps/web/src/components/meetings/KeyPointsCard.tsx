'use client';

import { useState } from 'react';
import {
  CheckCircle,
  Copy,
  Star,
  Clock,
  ChevronRight,
} from 'lucide-react';
import { Button } from '@/components/ui/button';

interface KeyPoint {
  id: string;
  text: string;
  timestamp?: number;
  importance?: 'low' | 'medium' | 'high';
}

interface KeyPointsCardProps {
  keyPoints: KeyPoint[];
  onSeekToTime?: (time: number) => void;
}

export function KeyPointsCard({ keyPoints, onSeekToTime }: KeyPointsCardProps) {
  const [copiedId, setCopiedId] = useState<string | null>(null);

  const handleCopyPoint = async (point: KeyPoint) => {
    try {
      await navigator.clipboard.writeText(point.text);
      setCopiedId(point.id);
      setTimeout(() => setCopiedId(null), 2000);
    } catch (error) {
      console.error('Failed to copy:', error);
    }
  };

  const formatTime = (seconds: number) => {
    const mins = Math.floor(seconds / 60);
    const secs = Math.floor(seconds % 60);
    return `${mins}:${secs.toString().padStart(2, '0')}`;
  };

  const getImportanceIcon = (importance?: string) => {
    if (importance === 'high') {
      return <Star className="h-4 w-4 text-amber-400 fill-amber-400" />;
    }
    return null;
  };

  const getImportanceStyle = (importance?: string) => {
    switch (importance) {
      case 'high':
        return 'border-l-4 border-amber-500 bg-amber-500/5';
      case 'medium':
        return 'border-l-4 border-blue-500 bg-blue-500/5';
      default:
        return 'border-l-2 border-slate-700';
    }
  };

  if (keyPoints.length === 0) {
    return (
      <div className="text-center py-8 text-slate-500">
        <p>No key points found</p>
      </div>
    );
  }

  return (
    <div className="space-y-3">
      {keyPoints.map((point, index) => (
        <div
          key={point.id}
          className={`group p-3 rounded-lg transition-all hover:bg-slate-800/60 ${getImportanceStyle(
            point.importance
          )}`}
        >
          <div className="flex items-start space-x-3">
            {/* Bullet/Icon */}
            <div className="flex-shrink-0 mt-0.5">
              {point.importance === 'high' ? (
                getImportanceIcon(point.importance)
              ) : (
                <CheckCircle className="h-4 w-4 text-emerald-400" />
              )}
            </div>

            {/* Content */}
            <div className="flex-1 min-w-0">
              <p className="text-slate-300 leading-relaxed">{point.text}</p>

              {/* Timestamp Link */}
              {point.timestamp !== undefined && onSeekToTime && (
                <button
                  onClick={() => onSeekToTime(point.timestamp!)}
                  className="mt-2 flex items-center space-x-1 text-xs text-purple-400 hover:text-purple-300 transition-colors group/timestamp"
                >
                  <Clock className="h-3 w-3" />
                  <span>{formatTime(point.timestamp)}</span>
                  <ChevronRight className="h-3 w-3 opacity-0 group-hover/timestamp:opacity-100 transition-opacity" />
                </button>
              )}
            </div>

            {/* Copy Button */}
            <Button
              variant="ghost"
              size="sm"
              onClick={() => handleCopyPoint(point)}
              className="opacity-0 group-hover:opacity-100 transition-opacity h-8 w-8 p-0 text-slate-400 hover:text-white flex-shrink-0"
            >
              {copiedId === point.id ? (
                <CheckCircle className="h-4 w-4 text-emerald-400" />
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
