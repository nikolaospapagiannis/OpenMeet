'use client';

import { useState } from 'react';
import { CardGlass } from '@/components/ui/card-glass';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { MessageSquare, Clock, AlertTriangle, ChevronDown, ChevronUp, PlayCircle } from 'lucide-react';
import { Monologue } from './TalkPatternAnalysis';

interface MonologueListProps {
  monologues: Monologue[];
}

function formatDuration(seconds: number): string {
  const minutes = Math.floor(seconds / 60);
  const remainingSeconds = seconds % 60;
  if (minutes >= 2) {
    return `${minutes} minutes`;
  }
  return `${minutes}m ${remainingSeconds}s`;
}

function formatTime(seconds: number): string {
  const minutes = Math.floor(seconds / 60);
  const remainingSeconds = Math.floor(seconds % 60);
  return `${minutes}:${remainingSeconds.toString().padStart(2, '0')}`;
}

function getSeverityBadge(severity: string) {
  switch (severity) {
    case 'excessive':
      return <Badge variant="destructive" className="text-xs">Excessive</Badge>;
    case 'moderate':
      return <Badge variant="secondary" className="text-xs bg-amber-500/20 text-amber-400">Moderate</Badge>;
    case 'acceptable':
      return <Badge variant="secondary" className="text-xs bg-green-500/20 text-green-400">Acceptable</Badge>;
    default:
      return null;
  }
}

function getSeverityColor(severity: string): string {
  switch (severity) {
    case 'excessive':
      return 'border-red-500/30 bg-red-500/5';
    case 'moderate':
      return 'border-amber-500/30 bg-amber-500/5';
    case 'acceptable':
      return 'border-green-500/30 bg-green-500/5';
    default:
      return 'border-gray-700 bg-gray-800/50';
  }
}

export function MonologueList({ monologues }: MonologueListProps) {
  const [expandedMonologue, setExpandedMonologue] = useState<string | null>(null);
  const [filter, setFilter] = useState<'all' | 'excessive' | 'moderate'>('all');

  // Filter monologues based on severity
  const filteredMonologues = monologues.filter(m => {
    if (filter === 'all') return true;
    return m.severity === filter;
  });

  // Sort monologues by duration (longest first)
  const sortedMonologues = [...filteredMonologues].sort((a, b) => b.duration - a.duration);

  // Calculate statistics
  const stats = {
    total: monologues.length,
    excessive: monologues.filter(m => m.severity === 'excessive').length,
    moderate: monologues.filter(m => m.severity === 'moderate').length,
    acceptable: monologues.filter(m => m.severity === 'acceptable').length,
    totalDuration: monologues.reduce((sum, m) => sum + m.duration, 0),
    averageDuration: monologues.length > 0
      ? Math.round(monologues.reduce((sum, m) => sum + m.duration, 0) / monologues.length)
      : 0,
  };

  const handleJumpTo = (startTime: number) => {
    // This would trigger a jump in the video/audio player
    console.log('Jump to time:', formatTime(startTime));
    // Implement actual jump functionality when integrated with player
  };

  const toggleExpanded = (id: string) => {
    setExpandedMonologue(expandedMonologue === id ? null : id);
  };

  return (
    <div className="space-y-6">
      {/* Statistics Overview */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        <CardGlass variant="default" className="p-4">
          <div className="text-sm text-muted-foreground">Total Monologues</div>
          <div className="text-2xl font-bold text-white">{stats.total}</div>
        </CardGlass>
        <CardGlass variant="default" className="p-4">
          <div className="text-sm text-muted-foreground">Excessive</div>
          <div className="text-2xl font-bold text-red-400">{stats.excessive}</div>
        </CardGlass>
        <CardGlass variant="default" className="p-4">
          <div className="text-sm text-muted-foreground">Total Duration</div>
          <div className="text-2xl font-bold text-white">
            {formatDuration(stats.totalDuration)}
          </div>
        </CardGlass>
        <CardGlass variant="default" className="p-4">
          <div className="text-sm text-muted-foreground">Avg Duration</div>
          <div className="text-2xl font-bold text-white">
            {formatDuration(stats.averageDuration)}
          </div>
        </CardGlass>
      </div>

      {/* Main Monologue List */}
      <CardGlass variant="default" hover>
        <div className="flex items-center justify-between mb-6">
          <div className="flex items-center gap-2">
            <MessageSquare className="w-5 h-5 text-purple-400" />
            <h3 className="text-lg font-semibold text-white">Monologue Detection</h3>
          </div>
          {stats.excessive > 0 && (
            <Badge variant="destructive" className="text-xs">
              <AlertTriangle className="w-3 h-3 mr-1" />
              {stats.excessive} Excessive
            </Badge>
          )}
        </div>

        {/* Filter Buttons */}
        <div className="flex gap-2 mb-4">
          <Button
            size="sm"
            variant={filter === 'all' ? 'default' : 'outline'}
            onClick={() => setFilter('all')}
          >
            All ({stats.total})
          </Button>
          <Button
            size="sm"
            variant={filter === 'excessive' ? 'default' : 'outline'}
            onClick={() => setFilter('excessive')}
            className={filter === 'excessive' ? 'bg-red-500/20 border-red-500' : ''}
          >
            Excessive ({stats.excessive})
          </Button>
          <Button
            size="sm"
            variant={filter === 'moderate' ? 'default' : 'outline'}
            onClick={() => setFilter('moderate')}
            className={filter === 'moderate' ? 'bg-amber-500/20 border-amber-500' : ''}
          >
            Moderate ({stats.moderate})
          </Button>
        </div>

        {/* Monologue List */}
        <div className="space-y-3">
          {sortedMonologues.length > 0 ? (
            sortedMonologues.map((monologue) => (
              <div
                key={monologue.id}
                className={`p-4 rounded-lg border transition-all ${getSeverityColor(monologue.severity)}`}
              >
                <div className="flex items-start justify-between mb-2">
                  <div className="flex-1">
                    <div className="flex items-center gap-2 mb-1">
                      <span className="font-medium text-white">{monologue.speaker}</span>
                      {getSeverityBadge(monologue.severity)}
                      <Badge variant="outline" className="text-xs">
                        {formatDuration(monologue.duration)}
                      </Badge>
                    </div>
                    <div className="flex items-center gap-4 text-xs text-gray-400">
                      <span className="flex items-center gap-1">
                        <Clock className="w-3 h-3" />
                        {formatTime(monologue.startTime)} - {formatTime(monologue.endTime)}
                      </span>
                      <span>{monologue.wordCount} words</span>
                      <span>
                        {Math.round(monologue.wordCount / (monologue.duration / 60))} WPM
                      </span>
                    </div>
                  </div>
                  <div className="flex items-center gap-2">
                    <Button
                      size="sm"
                      variant="ghost"
                      onClick={() => handleJumpTo(monologue.startTime)}
                      className="text-purple-400 hover:text-purple-300"
                    >
                      <PlayCircle className="w-4 h-4 mr-1" />
                      Jump to
                    </Button>
                    <Button
                      size="sm"
                      variant="ghost"
                      onClick={() => toggleExpanded(monologue.id)}
                    >
                      {expandedMonologue === monologue.id ? (
                        <ChevronUp className="w-4 h-4" />
                      ) : (
                        <ChevronDown className="w-4 h-4" />
                      )}
                    </Button>
                  </div>
                </div>

                {/* Text Preview */}
                <div className="mt-2">
                  <p className="text-sm text-gray-300">
                    {expandedMonologue === monologue.id
                      ? monologue.text
                      : `${monologue.text.substring(0, 150)}${monologue.text.length > 150 ? '...' : ''}`}
                  </p>
                </div>

                {/* Impact Message */}
                {monologue.impact && (
                  <div className="mt-2 pt-2 border-t border-gray-700">
                    <p className="text-xs text-gray-400 flex items-start gap-1">
                      <AlertTriangle className="w-3 h-3 mt-0.5 flex-shrink-0" />
                      {monologue.impact}
                    </p>
                  </div>
                )}
              </div>
            ))
          ) : (
            <div className="text-center py-12 text-gray-400">
              <MessageSquare className="w-12 h-12 mx-auto mb-2 opacity-50" />
              <p className="text-sm">No monologues detected</p>
              <p className="text-xs mt-1">All speakers maintained brief, conversational turns</p>
            </div>
          )}
        </div>

        {/* Recommendations */}
        {stats.excessive > 0 && (
          <div className="mt-6 p-4 bg-red-500/10 rounded-lg border border-red-500/20">
            <h4 className="text-sm font-medium text-white mb-2 flex items-center gap-2">
              <AlertTriangle className="w-4 h-4 text-red-400" />
              Recommendations
            </h4>
            <ul className="space-y-1 text-sm text-gray-300">
              <li>• Break down long explanations into smaller segments</li>
              <li>• Pause periodically to check for understanding</li>
              <li>• Encourage questions and feedback during presentations</li>
              <li>• Use visual aids to reduce verbal explanation time</li>
            </ul>
          </div>
        )}
      </CardGlass>
    </div>
  );
}