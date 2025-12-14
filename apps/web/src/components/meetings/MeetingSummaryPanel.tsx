'use client';

import { useState } from 'react';
import {
  ChevronDown,
  ChevronUp,
  Edit2,
  Save,
  X,
  RefreshCw,
  Sparkles,
  Loader2,
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import apiClient from '@/lib/api';
import { KeyPointsCard } from './KeyPointsCard';
import { ActionItemsList } from './ActionItemsList';
import { DecisionsList } from './DecisionsList';
import { SummaryExport } from './SummaryExport';

interface ActionItem {
  id: string;
  description: string;
  assignee?: string;
  dueDate?: string;
  priority: 'low' | 'medium' | 'high';
  status: 'pending' | 'in_progress' | 'completed';
}

interface KeyPoint {
  id: string;
  text: string;
  timestamp?: number;
  importance?: 'low' | 'medium' | 'high';
}

interface Decision {
  id: string;
  text: string;
  decidedBy?: string;
  timestamp?: number;
  context?: string;
}

interface MeetingSummary {
  id: string;
  overview: string;
  keyPoints: KeyPoint[];
  actionItems: ActionItem[];
  decisions: Decision[];
  followUps: string[];
  generatedAt: string;
  editHistory?: {
    editedAt: string;
    editedBy: string;
    changes: string;
  }[];
}

interface MeetingSummaryPanelProps {
  meetingId: string;
  summary: MeetingSummary;
  onSummaryUpdate?: (summary: MeetingSummary) => void;
  onSeekToTime?: (time: number) => void;
}

export function MeetingSummaryPanel({
  meetingId,
  summary: initialSummary,
  onSummaryUpdate,
  onSeekToTime,
}: MeetingSummaryPanelProps) {
  const [summary, setSummary] = useState<MeetingSummary>(initialSummary);
  const [isEditing, setIsEditing] = useState(false);
  const [editedOverview, setEditedOverview] = useState(summary.overview);
  const [isRegenerating, setIsRegenerating] = useState(false);
  const [isSaving, setIsSaving] = useState(false);
  const [expandedSections, setExpandedSections] = useState({
    overview: true,
    keyPoints: true,
    actionItems: true,
    decisions: true,
    followUps: true,
  });

  const toggleSection = (section: keyof typeof expandedSections) => {
    setExpandedSections((prev) => ({
      ...prev,
      [section]: !prev[section],
    }));
  };

  const handleEditStart = () => {
    setIsEditing(true);
    setEditedOverview(summary.overview);
  };

  const handleEditCancel = () => {
    setIsEditing(false);
    setEditedOverview(summary.overview);
  };

  const handleEditSave = async () => {
    setIsSaving(true);
    try {
      const response = await apiClient.patch(`/meetings/${meetingId}/summary`, {
        overview: editedOverview,
      });

      const updatedSummary = { ...summary, overview: editedOverview };
      setSummary(updatedSummary);
      onSummaryUpdate?.(updatedSummary);
      setIsEditing(false);
    } catch (error) {
      console.error('Failed to save summary:', error);
    } finally {
      setIsSaving(false);
    }
  };

  const handleRegenerate = async () => {
    setIsRegenerating(true);
    try {
      const response = await apiClient.post(`/meetings/${meetingId}/regenerate-summary`, {});
      setSummary(response);
      onSummaryUpdate?.(response);
    } catch (error) {
      console.error('Failed to regenerate summary:', error);
    } finally {
      setIsRegenerating(false);
    }
  };

  const SectionHeader = ({
    title,
    icon: Icon,
    section,
    count,
  }: {
    title: string;
    icon: any;
    section: keyof typeof expandedSections;
    count?: number;
  }) => (
    <button
      onClick={() => toggleSection(section)}
      className="w-full flex items-center justify-between p-4 hover:bg-slate-800/40 transition-colors group"
    >
      <div className="flex items-center space-x-2">
        <Icon className="h-5 w-5 text-purple-400" />
        <h3 className="text-lg font-semibold text-white">{title}</h3>
        {count !== undefined && (
          <span className="text-sm text-slate-400 bg-slate-800/60 px-2 py-0.5 rounded-full">
            {count}
          </span>
        )}
      </div>
      {expandedSections[section] ? (
        <ChevronUp className="h-5 w-5 text-slate-400 group-hover:text-white transition-colors" />
      ) : (
        <ChevronDown className="h-5 w-5 text-slate-400 group-hover:text-white transition-colors" />
      )}
    </button>
  );

  return (
    <div className="space-y-4">
      {/* Header Actions */}
      <div className="flex items-center justify-between">
        <div className="flex items-center space-x-2">
          <Sparkles className="h-5 w-5 text-purple-400" />
          <h2 className="text-xl font-bold text-white">AI Summary</h2>
        </div>
        <div className="flex items-center space-x-2">
          <SummaryExport meetingId={meetingId} summary={summary} />
          <Button
            variant="outline"
            size="sm"
            onClick={handleRegenerate}
            disabled={isRegenerating}
            className="border-slate-700 bg-slate-800/40 text-slate-300 hover:bg-slate-800/60 hover:text-white"
          >
            {isRegenerating ? (
              <>
                <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                Regenerating...
              </>
            ) : (
              <>
                <RefreshCw className="h-4 w-4 mr-2" />
                Regenerate
              </>
            )}
          </Button>
        </div>
      </div>

      {/* Overview Section */}
      <div className="bg-slate-900/40 border border-slate-800 rounded-lg overflow-hidden">
        <SectionHeader title="Overview" icon={Sparkles} section="overview" />
        {expandedSections.overview && (
          <div className="px-4 pb-4">
            {isEditing ? (
              <div className="space-y-3">
                <textarea
                  value={editedOverview}
                  onChange={(e) => setEditedOverview(e.target.value)}
                  className="w-full min-h-[120px] px-3 py-2 bg-slate-800/60 border border-slate-700 rounded-lg text-slate-300 focus:outline-none focus:ring-2 focus:ring-purple-500/50 resize-y"
                />
                <div className="flex items-center space-x-2">
                  <Button
                    size="sm"
                    onClick={handleEditSave}
                    disabled={isSaving}
                    className="bg-purple-600 hover:bg-purple-700"
                  >
                    {isSaving ? (
                      <>
                        <Loader2 className="h-3 w-3 mr-2 animate-spin" />
                        Saving...
                      </>
                    ) : (
                      <>
                        <Save className="h-3 w-3 mr-2" />
                        Save
                      </>
                    )}
                  </Button>
                  <Button
                    size="sm"
                    variant="outline"
                    onClick={handleEditCancel}
                    disabled={isSaving}
                    className="border-slate-700"
                  >
                    <X className="h-3 w-3 mr-2" />
                    Cancel
                  </Button>
                </div>
              </div>
            ) : (
              <div className="space-y-3">
                <p className="text-slate-300 leading-relaxed">{summary.overview}</p>
                <Button
                  size="sm"
                  variant="ghost"
                  onClick={handleEditStart}
                  className="text-slate-400 hover:text-white"
                >
                  <Edit2 className="h-3 w-3 mr-2" />
                  Edit
                </Button>
              </div>
            )}
            {summary.editHistory && summary.editHistory.length > 0 && (
              <div className="mt-3 text-xs text-slate-500">
                Last edited: {new Date(summary.editHistory[0].editedAt).toLocaleString()} by{' '}
                {summary.editHistory[0].editedBy}
              </div>
            )}
          </div>
        )}
      </div>

      {/* Key Points Section */}
      <div className="bg-slate-900/40 border border-slate-800 rounded-lg overflow-hidden">
        <SectionHeader
          title="Key Points"
          icon={Sparkles}
          section="keyPoints"
          count={summary.keyPoints.length}
        />
        {expandedSections.keyPoints && (
          <div className="px-4 pb-4">
            <KeyPointsCard
              keyPoints={summary.keyPoints}
              onSeekToTime={onSeekToTime}
            />
          </div>
        )}
      </div>

      {/* Action Items Section */}
      <div className="bg-slate-900/40 border border-slate-800 rounded-lg overflow-hidden">
        <SectionHeader
          title="Action Items"
          icon={Sparkles}
          section="actionItems"
          count={summary.actionItems.length}
        />
        {expandedSections.actionItems && (
          <div className="px-4 pb-4">
            <ActionItemsList
              meetingId={meetingId}
              actionItems={summary.actionItems}
              onUpdate={(items) => {
                const updatedSummary = { ...summary, actionItems: items };
                setSummary(updatedSummary);
                onSummaryUpdate?.(updatedSummary);
              }}
            />
          </div>
        )}
      </div>

      {/* Decisions Section */}
      {summary.decisions && summary.decisions.length > 0 && (
        <div className="bg-slate-900/40 border border-slate-800 rounded-lg overflow-hidden">
          <SectionHeader
            title="Decisions Made"
            icon={Sparkles}
            section="decisions"
            count={summary.decisions.length}
          />
          {expandedSections.decisions && (
            <div className="px-4 pb-4">
              <DecisionsList
                decisions={summary.decisions}
                onSeekToTime={onSeekToTime}
              />
            </div>
          )}
        </div>
      )}

      {/* Follow-ups Section */}
      {summary.followUps && summary.followUps.length > 0 && (
        <div className="bg-slate-900/40 border border-slate-800 rounded-lg overflow-hidden">
          <SectionHeader
            title="Follow-ups"
            icon={Sparkles}
            section="followUps"
            count={summary.followUps.length}
          />
          {expandedSections.followUps && (
            <div className="px-4 pb-4">
              <ul className="space-y-2">
                {summary.followUps.map((followUp, index) => (
                  <li key={index} className="flex items-start">
                    <div className="flex items-center justify-center w-5 h-5 rounded-full bg-blue-500/20 border border-blue-500/30 mr-2 mt-0.5 flex-shrink-0">
                      <span className="text-xs text-blue-400">{index + 1}</span>
                    </div>
                    <span className="text-slate-300">{followUp}</span>
                  </li>
                ))}
              </ul>
            </div>
          )}
        </div>
      )}
    </div>
  );
}
