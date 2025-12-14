'use client';

import { useState } from 'react';
import { CardGlass } from '@/components/ui/card-glass';
import { Badge } from '@/components/ui/badge';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';
import { Users, ArrowUp, ArrowDown, AlertTriangle, TrendingUp, TrendingDown } from 'lucide-react';
import { SpeakerMetrics } from './TalkPatternAnalysis';

interface SpeakerMetricsTableProps {
  speakerMetrics: SpeakerMetrics[];
  detailed?: boolean;
}

type SortField = 'speaker' | 'talkTime' | 'wordCount' | 'pace' | 'questions' | 'interruptions';
type SortOrder = 'asc' | 'desc';

function formatDuration(seconds: number): string {
  const minutes = Math.floor(seconds / 60);
  const remainingSeconds = seconds % 60;
  return `${minutes}m ${remainingSeconds}s`;
}

function getPaceStatus(pace: number): {
  status: 'optimal' | 'fast' | 'slow';
  color: string;
  icon?: React.ReactNode;
} {
  if (pace >= 120 && pace <= 150) {
    return { status: 'optimal', color: 'text-green-400' };
  } else if (pace > 150) {
    return {
      status: 'fast',
      color: 'text-amber-400',
      icon: <TrendingUp className="w-3 h-3 inline ml-1" />,
    };
  } else {
    return {
      status: 'slow',
      color: 'text-blue-400',
      icon: <TrendingDown className="w-3 h-3 inline ml-1" />,
    };
  }
}

export function SpeakerMetricsTable({ speakerMetrics, detailed = false }: SpeakerMetricsTableProps) {
  const [sortField, setSortField] = useState<SortField>('talkTime');
  const [sortOrder, setSortOrder] = useState<SortOrder>('desc');

  const handleSort = (field: SortField) => {
    if (sortField === field) {
      setSortOrder(sortOrder === 'asc' ? 'desc' : 'asc');
    } else {
      setSortField(field);
      setSortOrder('desc');
    }
  };

  const sortedMetrics = [...speakerMetrics].sort((a, b) => {
    let aValue: any;
    let bValue: any;

    switch (sortField) {
      case 'speaker':
        aValue = a.speaker;
        bValue = b.speaker;
        break;
      case 'talkTime':
        aValue = a.talkTime;
        bValue = b.talkTime;
        break;
      case 'wordCount':
        aValue = a.wordCount;
        bValue = b.wordCount;
        break;
      case 'pace':
        aValue = a.averagePace;
        bValue = b.averagePace;
        break;
      case 'questions':
        aValue = a.questionsAsked;
        bValue = b.questionsAsked;
        break;
      case 'interruptions':
        aValue = a.interruptionsMade;
        bValue = b.interruptionsMade;
        break;
      default:
        aValue = 0;
        bValue = 0;
    }

    if (typeof aValue === 'string') {
      return sortOrder === 'asc'
        ? aValue.localeCompare(bValue)
        : bValue.localeCompare(aValue);
    }

    return sortOrder === 'asc' ? aValue - bValue : bValue - aValue;
  });

  const SortIcon = ({ field }: { field: SortField }) => {
    if (sortField !== field) return null;
    return sortOrder === 'asc' ? (
      <ArrowUp className="w-3 h-3 inline ml-1" />
    ) : (
      <ArrowDown className="w-3 h-3 inline ml-1" />
    );
  };

  return (
    <CardGlass variant="default" hover>
      <div className="flex items-center gap-2 mb-6">
        <Users className="w-5 h-5 text-purple-400" />
        <h3 className="text-lg font-semibold text-white">
          {detailed ? 'Detailed Speaker Metrics' : 'Speaker Metrics'}
        </h3>
      </div>

      <div className="overflow-x-auto">
        <Table>
          <TableHeader>
            <TableRow className="border-gray-700">
              <TableHead
                className="text-gray-300 cursor-pointer hover:text-white"
                onClick={() => handleSort('speaker')}
              >
                Speaker <SortIcon field="speaker" />
              </TableHead>
              <TableHead
                className="text-gray-300 cursor-pointer hover:text-white"
                onClick={() => handleSort('talkTime')}
              >
                Talk Time <SortIcon field="talkTime" />
              </TableHead>
              <TableHead
                className="text-gray-300 cursor-pointer hover:text-white"
                onClick={() => handleSort('wordCount')}
              >
                Word Count <SortIcon field="wordCount" />
              </TableHead>
              <TableHead
                className="text-gray-300 cursor-pointer hover:text-white"
                onClick={() => handleSort('pace')}
              >
                Pace (WPM) <SortIcon field="pace" />
              </TableHead>
              <TableHead
                className="text-gray-300 cursor-pointer hover:text-white"
                onClick={() => handleSort('questions')}
              >
                Questions <SortIcon field="questions" />
              </TableHead>
              {detailed && (
                <>
                  <TableHead
                    className="text-gray-300 cursor-pointer hover:text-white"
                    onClick={() => handleSort('interruptions')}
                  >
                    Interruptions <SortIcon field="interruptions" />
                  </TableHead>
                  <TableHead className="text-gray-300">Turn Count</TableHead>
                  <TableHead className="text-gray-300">Avg Turn</TableHead>
                  <TableHead className="text-gray-300">Longest Turn</TableHead>
                  <TableHead className="text-gray-300">Monologues</TableHead>
                </>
              )}
            </TableRow>
          </TableHeader>
          <TableBody>
            {sortedMetrics.map((speaker, index) => {
              const paceStatus = getPaceStatus(speaker.averagePace);
              const isTopSpeaker = index === 0 && sortField === 'talkTime';

              return (
                <TableRow key={speaker.speaker} className="border-gray-700">
                  <TableCell className="font-medium text-white">
                    <div className="flex items-center gap-2">
                      {speaker.speaker}
                      {isTopSpeaker && (
                        <Badge variant="secondary" className="text-xs">
                          Lead
                        </Badge>
                      )}
                    </div>
                  </TableCell>
                  <TableCell className="text-gray-300">
                    <div className="flex items-center gap-2">
                      {formatDuration(speaker.talkTime)}
                      <span className="text-xs text-gray-500">
                        ({speaker.talkTimePercentage}%)
                      </span>
                    </div>
                  </TableCell>
                  <TableCell className="text-gray-300">
                    {speaker.wordCount.toLocaleString()}
                  </TableCell>
                  <TableCell className={paceStatus.color}>
                    <div className="flex items-center">
                      {speaker.averagePace}
                      {paceStatus.icon}
                      {paceStatus.status === 'fast' && speaker.averagePace > 160 && (
                        <AlertTriangle className="w-3 h-3 text-amber-400 ml-2" />
                      )}
                    </div>
                  </TableCell>
                  <TableCell className="text-gray-300">
                    {speaker.questionsAsked}
                  </TableCell>
                  {detailed && (
                    <>
                      <TableCell className="text-gray-300">
                        <div className="flex flex-col text-xs">
                          <span>Made: {speaker.interruptionsMade}</span>
                          <span className="text-gray-500">
                            Received: {speaker.interruptionsReceived}
                          </span>
                        </div>
                      </TableCell>
                      <TableCell className="text-gray-300">
                        {speaker.turnCount}
                      </TableCell>
                      <TableCell className="text-gray-300">
                        {speaker.averageTurnDuration.toFixed(1)}s
                      </TableCell>
                      <TableCell className="text-gray-300">
                        {formatDuration(speaker.longestTurn)}
                      </TableCell>
                      <TableCell className="text-gray-300">
                        {speaker.monologueCount > 0 ? (
                          <Badge
                            variant={speaker.monologueCount > 2 ? 'destructive' : 'secondary'}
                            className="text-xs"
                          >
                            {speaker.monologueCount}
                          </Badge>
                        ) : (
                          '-'
                        )}
                      </TableCell>
                    </>
                  )}
                </TableRow>
              );
            })}
          </TableBody>
        </Table>
      </div>

      {/* Insights Section */}
      {!detailed && speakerMetrics.length > 0 && (
        <div className="mt-4 pt-4 border-t border-gray-700">
          <p className="text-xs text-gray-400 uppercase tracking-wide mb-2">
            Quick Insights
          </p>
          <div className="space-y-1">
            {sortedMetrics.some(s => s.averagePace > 160) && (
              <p className="text-sm text-amber-400 flex items-center gap-1">
                <AlertTriangle className="w-3 h-3" />
                Some speakers are talking very fast (&gt;160 WPM)
              </p>
            )}
            {sortedMetrics.some(s => s.averagePace < 100) && (
              <p className="text-sm text-blue-400 flex items-center gap-1">
                <AlertTriangle className="w-3 h-3" />
                Some speakers are talking quite slowly (&lt;100 WPM)
              </p>
            )}
            {sortedMetrics[0]?.questionsAsked > sortedMetrics.reduce((sum, s) => sum + s.questionsAsked, 0) / 2 && (
              <p className="text-sm text-purple-400">
                {sortedMetrics[0].speaker} asked most of the questions
              </p>
            )}
          </div>
        </div>
      )}
    </CardGlass>
  );
}