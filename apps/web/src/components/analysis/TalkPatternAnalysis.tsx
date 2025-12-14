'use client';

import { useState, useEffect } from 'react';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { CardGlass } from '@/components/ui/card-glass';
import { Alert } from '@/components/ui/alert';
import { Button } from '@/components/ui/button';
import { LoadingSpinner } from '@/components/LoadingSpinner';
import { TalkTimeDistribution } from './TalkTimeDistribution';
import { SpeakerMetricsTable } from './SpeakerMetricsTable';
import { PaceAnalysisChart } from './PaceAnalysisChart';
import { InterruptionChart } from './InterruptionChart';
import { MonologueList } from './MonologueList';
import { QuestionAnalysis } from './QuestionAnalysis';
import { CoachingRecommendations } from './CoachingRecommendations';
import { RefreshCw, AlertCircle } from 'lucide-react';

// Types matching backend service
export interface TalkPatternAnalysisData {
  meetingId: string;
  overallMetrics: OverallMetrics;
  speakerMetrics: SpeakerMetrics[];
  paceAnalysis: PaceAnalysis;
  interruptions: Interruption[];
  monologues: Monologue[];
  questions: QuestionAnalysisData;
  silences: SilenceAnalysis;
  recommendations: string[];
  analysisTimestamp: Date;
}

export interface OverallMetrics {
  totalDuration: number;
  totalSpeakers: number;
  talkToListenRatio: number;
  averageSpeakingPace: number;
  totalInterruptions: number;
  totalMonologues: number;
  totalQuestions: number;
  silencePercentage: number;
}

export interface SpeakerMetrics {
  speaker: string;
  talkTime: number;
  talkTimePercentage: number;
  wordCount: number;
  averagePace: number;
  turnCount: number;
  averageTurnDuration: number;
  longestTurn: number;
  interruptionsMade: number;
  interruptionsReceived: number;
  questionsAsked: number;
  monologueCount: number;
}

export interface PaceAnalysis {
  overallPace: number;
  paceBySegment: PaceSegment[];
  paceVariation: 'consistent' | 'variable' | 'erratic';
  fastSegments: PaceSegment[];
  slowSegments: PaceSegment[];
  recommendations: string[];
}

export interface PaceSegment {
  startTime: number;
  endTime: number;
  speaker: string;
  pace: number;
  text: string;
}

export interface Interruption {
  id: string;
  timestamp: number;
  interrupter: string;
  interrupted: string;
  context: string;
  gapTime: number;
  type: 'overlap' | 'quick_takeover' | 'normal';
}

export interface Monologue {
  id: string;
  speaker: string;
  startTime: number;
  endTime: number;
  duration: number;
  wordCount: number;
  text: string;
  severity: 'excessive' | 'moderate' | 'acceptable';
  impact: string;
}

export interface QuestionAnalysisData {
  totalQuestions: number;
  questionRate: number;
  questionsByType: {
    openEnded: number;
    closed: number;
    rhetorical: number;
  };
  questionsBySpeaker: Record<string, number>;
  questionQuality: 'excellent' | 'good' | 'fair' | 'poor';
  examples: QuestionExample[];
}

export interface QuestionExample {
  question: string;
  speaker: string;
  timestamp: number;
  type: 'open' | 'closed' | 'rhetorical';
  quality: 'high' | 'medium' | 'low';
}

export interface SilenceAnalysis {
  totalSilenceDuration: number;
  silencePercentage: number;
  silenceCount: number;
  averageSilenceDuration: number;
  longestSilence: number;
  silenceSegments: SilenceSegment[];
  interpretation: string;
}

export interface SilenceSegment {
  startTime: number;
  endTime: number;
  duration: number;
  context: 'before_response' | 'mid_conversation' | 'awkward_pause' | 'natural';
}

interface TalkPatternAnalysisProps {
  meetingId: string;
}

export function TalkPatternAnalysis({ meetingId }: TalkPatternAnalysisProps) {
  const [data, setData] = useState<TalkPatternAnalysisData | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [refreshing, setRefreshing] = useState(false);

  const fetchAnalysis = async (forceRefresh = false) => {
    try {
      setError(null);
      if (forceRefresh) {
        setRefreshing(true);
      } else {
        setLoading(true);
      }

      const endpoint = forceRefresh
        ? `/api/meetings/${meetingId}/analyze-talk-patterns`
        : `/api/meetings/${meetingId}/talk-patterns`;

      const method = forceRefresh ? 'POST' : 'GET';

      const response = await fetch(endpoint, {
        method,
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${localStorage.getItem('token')}`,
        },
        credentials: 'include',
      });

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.error || 'Failed to fetch analysis');
      }

      const analysisData = await response.json();
      setData(analysisData);
    } catch (err: any) {
      console.error('Error fetching talk pattern analysis:', err);
      setError(err.message || 'Failed to load analysis');
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  };

  useEffect(() => {
    fetchAnalysis();
  }, [meetingId]);

  if (loading && !data) {
    return (
      <div className="flex items-center justify-center min-h-[400px]">
        <LoadingSpinner size="lg" text="Analyzing talk patterns..." />
      </div>
    );
  }

  if (error && !data) {
    return (
      <CardGlass variant="default">
        <div className="flex items-center gap-3 p-4 bg-red-500/10 rounded">
          <AlertCircle className="h-5 w-5" />
          <div className="flex-1">
            <h3 className="font-semibold">Analysis Error</h3>
            <p className="text-sm text-muted-foreground">{error}</p>
          </div>
          <Button
            onClick={() => fetchAnalysis(true)}
            variant="outline"
            size="sm"
          >
            <RefreshCw className="h-4 w-4 mr-2" />
            Retry
          </Button>
        </div>
      </CardGlass>
    );
  }

  if (!data) return null;

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-2xl font-bold text-white">Talk Pattern Analysis</h2>
          <p className="text-sm text-muted-foreground mt-1">
            Last analyzed: {new Date(data.analysisTimestamp).toLocaleString()}
          </p>
        </div>
        <Button
          onClick={() => fetchAnalysis(true)}
          disabled={refreshing}
          variant="outline"
          size="sm"
        >
          {refreshing ? (
            <>
              <LoadingSpinner size="sm" className="mr-2" />
              Refreshing...
            </>
          ) : (
            <>
              <RefreshCw className="h-4 w-4 mr-2" />
              Refresh Analysis
            </>
          )}
        </Button>
      </div>

      {/* Overall Metrics Summary */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        <CardGlass variant="default" className="p-4">
          <div className="text-sm text-muted-foreground">Total Duration</div>
          <div className="text-2xl font-bold text-white">
            {Math.floor(data.overallMetrics.totalDuration / 60)}m
          </div>
        </CardGlass>
        <CardGlass variant="default" className="p-4">
          <div className="text-sm text-muted-foreground">Speakers</div>
          <div className="text-2xl font-bold text-white">
            {data.overallMetrics.totalSpeakers}
          </div>
        </CardGlass>
        <CardGlass variant="default" className="p-4">
          <div className="text-sm text-muted-foreground">Avg. Pace</div>
          <div className="text-2xl font-bold text-white">
            {data.overallMetrics.averageSpeakingPace} WPM
          </div>
        </CardGlass>
        <CardGlass variant="default" className="p-4">
          <div className="text-sm text-muted-foreground">Questions</div>
          <div className="text-2xl font-bold text-white">
            {data.overallMetrics.totalQuestions}
          </div>
        </CardGlass>
      </div>

      {/* Main Analysis Tabs */}
      <Tabs defaultValue="overview" className="w-full">
        <TabsList className="grid w-full grid-cols-4 lg:grid-cols-7">
          <TabsTrigger value="overview">Overview</TabsTrigger>
          <TabsTrigger value="speakers">Speakers</TabsTrigger>
          <TabsTrigger value="pace">Pace</TabsTrigger>
          <TabsTrigger value="interruptions">Interruptions</TabsTrigger>
          <TabsTrigger value="monologues">Monologues</TabsTrigger>
          <TabsTrigger value="questions">Questions</TabsTrigger>
          <TabsTrigger value="coaching">Coaching</TabsTrigger>
        </TabsList>

        <TabsContent value="overview" className="space-y-6">
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            <TalkTimeDistribution speakerMetrics={data.speakerMetrics} />
            <SpeakerMetricsTable speakerMetrics={data.speakerMetrics} />
          </div>
        </TabsContent>

        <TabsContent value="speakers">
          <SpeakerMetricsTable
            speakerMetrics={data.speakerMetrics}
            detailed={true}
          />
        </TabsContent>

        <TabsContent value="pace">
          <PaceAnalysisChart paceAnalysis={data.paceAnalysis} />
        </TabsContent>

        <TabsContent value="interruptions">
          <InterruptionChart
            interruptions={data.interruptions}
            speakerMetrics={data.speakerMetrics}
          />
        </TabsContent>

        <TabsContent value="monologues">
          <MonologueList monologues={data.monologues} />
        </TabsContent>

        <TabsContent value="questions">
          <QuestionAnalysis questions={data.questions} />
        </TabsContent>

        <TabsContent value="coaching">
          <CoachingRecommendations
            recommendations={data.recommendations}
            overallMetrics={data.overallMetrics}
            paceAnalysis={data.paceAnalysis}
          />
        </TabsContent>
      </Tabs>
    </div>
  );
}