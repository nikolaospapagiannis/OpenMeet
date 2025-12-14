'use client';

import { useEffect, useState, useRef } from 'react';
import { useRouter, useParams } from 'next/navigation';
import {
  Calendar,
  Clock,
  Users,
  FileText,
  Download,
  Share2,
  ChevronLeft,
  Copy,
  CheckCircle,
  AlertCircle,
  Bot,
  Sparkles,
  Target,
  TrendingUp,
  MessageSquare,
  Loader2,
  Scissors,
  LayoutTemplate,
  Send
} from 'lucide-react';

import { Button } from '@/components/ui/button';
import { CardGlass, CardGlassContent, CardGlassHeader, CardGlassTitle } from '@/components/ui/card-glass';
import { useAuth } from '@/contexts/AuthContext';
import apiClient from '@/lib/api';
import { formatDateTime, formatDuration, getPlatformIcon, getSentimentEmoji } from '@/lib/utils';
import { MeetingPlayer } from '@/components/meetings/MeetingPlayer';
import { SyncedTranscript } from '@/components/meetings/SyncedTranscript';
import { MeetingTabs, TabType } from '@/components/meetings/MeetingTabs';
import { useSyncedPlayback, TranscriptSegment as SyncedTranscriptSegment } from '@/hooks/useSyncedPlayback';

interface TranscriptSegment {
  id: string;
  speaker: string;
  text: string;
  startTime: number;
  endTime: number;
  confidence: number;
}

interface ActionItem {
  id: string;
  description: string;
  assignee?: string;
  dueDate?: string;
  priority: 'low' | 'medium' | 'high';
  status: 'pending' | 'in_progress' | 'completed';
}

interface Topic {
  name: string;
  relevance: number;
  mentions: number;
}

interface MeetingDetail {
  id: string;
  title: string;
  scheduledStartAt: string;
  scheduledEndAt: string;
  actualStartAt?: string;
  actualEndAt?: string;
  duration: number;
  status: string;
  platform: string;
  meetingUrl?: string;
  recordingUrl?: string;
  attendees: {
    id: string;
    name: string;
    email: string;
    role: string;
    speakingTime?: number;
  }[];
  transcript?: {
    id: string;
    segments: TranscriptSegment[];
    wordCount: number;
    language: string;
  };
  analysis?: {
    summary: string;
    keyPoints: string[];
    actionItems: ActionItem[];
    sentiment: number;
    topics: Topic[];
    nextSteps: string[];
    decisions: string[];
  };
  recording?: {
    id: string;
    url: string;
    duration: number;
    size: number;
  };
}

export default function MeetingDetailPage() {
  const router = useRouter();
  const params = useParams();
  const { user, isLoading: authLoading } = useAuth();
  const [meeting, setMeeting] = useState<MeetingDetail | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [activeTab, setActiveTab] = useState<TabType>('transcript');
  const [currentTime, setCurrentTime] = useState(0);
  const videoRef = useRef<HTMLVideoElement>(null);
  // AI Chat state
  const [aiQuestion, setAiQuestion] = useState('');
  const [aiMessages, setAiMessages] = useState<Array<{role: 'user' | 'assistant'; content: string; sources?: any[]}>>([])
  const [aiLoading, setAiLoading] = useState(false);

  // Templates state
  interface Template {
    id: string;
    name: string;
    description?: string;
    category: string;
    sections: { title: string; content: string }[];
    variables: string[];
    isPreBuilt?: boolean;
  }
  interface AppliedNotes {
    templateId: string;
    templateName: string;
    sections: { title: string; content: string }[];
    appliedAt: string;
  }
  const [templates, setTemplates] = useState<Template[]>([]);
  const [templatesLoading, setTemplatesLoading] = useState(false);
  const [selectedTemplate, setSelectedTemplate] = useState<Template | null>(null);
  const [variableValues, setVariableValues] = useState<Record<string, string>>({});
  const [applyingTemplate, setApplyingTemplate] = useState(false);
  const [appliedNotes, setAppliedNotes] = useState<AppliedNotes | null>(null);

  const meetingId = params?.id as string;

  // Convert transcript segments to synced format
  const syncedSegments: SyncedTranscriptSegment[] = meeting?.transcript?.segments.map(seg => ({
    id: seg.id,
    speaker: seg.speaker,
    text: seg.text,
    startTime: seg.startTime,
    endTime: seg.endTime,
    confidence: seg.confidence,
  })) || [];

  // Use synced playback hook
  const { currentSegment, seekToSegment, activeSegmentIndex } = useSyncedPlayback({
    segments: syncedSegments,
    videoRef,
  });

  useEffect(() => {
    if (!authLoading && !user) {
      router.push('/login');
    } else if (user && meetingId) {
      fetchMeetingDetail();
    }
  }, [user, authLoading, router, meetingId]);

  const fetchMeetingDetail = async () => {
    setIsLoading(true);
    try {
      const data = await apiClient.getMeetingDetail(meetingId);
      setMeeting(data);
    } catch (error) {
      console.error('Failed to fetch meeting detail:', error);
    } finally {
      setIsLoading(false);
    }
  };

  const handleDownloadTranscript = async () => {
    if (!meeting?.transcript) return;

    try {
      const data = await apiClient.downloadTranscript(meetingId, 'pdf');
      const blob = new Blob([data], { type: 'application/pdf' });
      const url = window.URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `${meeting.title}-transcript.pdf`;
      a.click();
    } catch (error) {
      console.error('Failed to download transcript:', error);
    }
  };

  const handleShareMeeting = async () => {
    try {
      const shareUrl = `${window.location.origin}/meetings/${meetingId}/shared`;
      await navigator.clipboard.writeText(shareUrl);
      // Show success toast
    } catch (error) {
      console.error('Failed to share meeting:', error);
    }
  };

  const handleCopyToClipboard = (text: string) => {
    navigator.clipboard.writeText(text);
    // Show success toast
  };

  const handleTimeUpdate = (time: number) => {
    setCurrentTime(time);
  };
  // AI Chat handler
  const handleAskAI = async () => {
    if (!aiQuestion.trim() || aiLoading) return;

    const question = aiQuestion.trim();
    setAiQuestion('');
    setAiMessages(prev => [...prev, { role: 'user', content: question }]);
    setAiLoading(true);

    try {
      const response = await apiClient.post('/ai-query/ask', {
        question,
        meetingId: meeting?.id,
      });

      const data = response.data;
      setAiMessages(prev => [...prev, {
        role: 'assistant',
        content: data.answer,
        sources: data.sources,
      }]);
    } catch (error) {
      console.error('AI query error:', error);
      setAiMessages(prev => [...prev, {
        role: 'assistant',
        content: 'Sorry, I encountered an error processing your question. Please try again.',
      }]);
    } finally {
      setAiLoading(false);
    }
  };

  // Fetch templates when tab is activated
  const fetchTemplates = async () => {
    if (templates.length > 0) return; // Already loaded
    setTemplatesLoading(true);
    try {
      const response = await apiClient.get('/templates');
      setTemplates(response.data.templates || []);
    } catch (error) {
      console.error('Failed to fetch templates:', error);
    } finally {
      setTemplatesLoading(false);
    }
  };

  // Handle template selection
  const handleSelectTemplate = (template: Template) => {
    setSelectedTemplate(template);
    setAppliedNotes(null);
    // Initialize variable values with meeting data
    const initialValues: Record<string, string> = {};
    if (template.variables) {
      template.variables.forEach(v => {
        const varName = v.replace(/[{}]/g, '');
        if (varName === 'meeting_title') initialValues[varName] = meeting?.title || '';
        else if (varName === 'date') initialValues[varName] = meeting ? formatDateTime(meeting.scheduledStartAt) : '';
        else if (varName === 'attendees') initialValues[varName] = meeting?.attendees.map(a => a.name).join(', ') || '';
        else initialValues[varName] = '';
      });
    }
    setVariableValues(initialValues);
  };

  // Apply template to meeting
  const handleApplyTemplate = async () => {
    if (!selectedTemplate || !meeting) return;
    setApplyingTemplate(true);
    try {
      const response = await apiClient.post(`/templates/${selectedTemplate.id}/apply`, {
        meetingId: meeting.id,
        variableValues,
      });
      setAppliedNotes(response.data.notes);
    } catch (error) {
      console.error('Failed to apply template:', error);
    } finally {
      setApplyingTemplate(false);
    }
  };

  // Fetch templates when tab changes to templates
  useEffect(() => {
    if (activeTab === 'templates') {
      fetchTemplates();
    }
  }, [activeTab]);

  if (authLoading || isLoading) {
    return (
      <div className="min-h-screen bg-[#0a0a1a] flex items-center justify-center">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-purple-500"></div>
      </div>
    );
  }

  if (!meeting) {
    return (
      <div className="min-h-screen bg-[#0a0a1a] flex items-center justify-center">
        <div className="text-center">
          <AlertCircle className="h-12 w-12 text-slate-500 mx-auto mb-4" />
          <p className="text-slate-400">Meeting not found</p>
          <Button className="mt-4" onClick={() => router.push('/meetings')}>
            Back to Meetings
          </Button>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-[#0a0a1a] flex flex-col">
      {/* Header */}
      <header className="bg-slate-900/40 backdrop-blur-sm border-b border-[#1e293b] sticky top-0 z-10">
        <div className="max-w-[1920px] mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex justify-between items-center h-16">
            <div className="flex items-center space-x-4">
              <button
                onClick={() => router.push('/meetings')}
                className="text-slate-400 hover:text-white flex items-center transition-colors"
              >
                <ChevronLeft className="h-4 w-4 mr-1" />
                Back to Meetings
              </button>
            </div>
            <div className="flex items-center space-x-2">
              <Button
                variant="outline"
                onClick={handleDownloadTranscript}
                className="border-[#1e293b] bg-slate-900/40 text-slate-300 hover:bg-slate-800/60 hover:text-white hover:border-purple-500/50"
              >
                <Download className="h-4 w-4 mr-2" />
                Download
              </Button>
              <Button
                variant="outline"
                onClick={handleShareMeeting}
                className="border-[#1e293b] bg-slate-900/40 text-slate-300 hover:bg-slate-800/60 hover:text-white hover:border-purple-500/50"
              >
                <Share2 className="h-4 w-4 mr-2" />
                Share
              </Button>
            </div>
          </div>
        </div>
      </header>

      <main className="flex-1 flex flex-col max-w-[1920px] mx-auto w-full px-4 sm:px-6 lg:px-8 py-6 gap-6">
        {/* Meeting Info Header */}
        <CardGlass className="shrink-0">
          <div className="flex items-start justify-between">
            <div className="flex items-start space-x-4">
              <div className="text-3xl">
                {getPlatformIcon(meeting.platform)}
              </div>
              <div>
                <h1 className="text-2xl font-bold text-white">{meeting.title}</h1>
                <div className="flex items-center space-x-6 mt-2 text-sm text-slate-400">
                  <span className="flex items-center">
                    <Calendar className="h-4 w-4 mr-1" />
                    {formatDateTime(meeting.scheduledStartAt)}
                  </span>
                  <span className="flex items-center">
                    <Clock className="h-4 w-4 mr-1" />
                    {formatDuration(meeting.duration)}
                  </span>
                  <span className="flex items-center">
                    <Users className="h-4 w-4 mr-1" />
                    {meeting.attendees.length} attendees
                  </span>
                </div>
              </div>
            </div>
            <span className={`px-3 py-1 text-sm rounded-full ${
              meeting.status === 'completed' ? 'bg-emerald-500/20 text-emerald-400 border border-emerald-500/30' :
              meeting.status === 'in_progress' ? 'bg-amber-500/20 text-amber-400 border border-amber-500/30' :
              'bg-slate-700/50 text-slate-400 border border-slate-600/30'
            }`}>
              {meeting.status}
            </span>
          </div>
        </CardGlass>

        {/* Split View: Player and Content */}
        <div className="flex-1 flex gap-6 min-h-0 overflow-hidden">
          {/* Left: Video Player */}
          <div className="flex-1 flex flex-col min-w-0">
            <CardGlass padding="none" className="h-full flex flex-col">
              <div className="flex-1">
                <MeetingPlayer
                  recordingUrl={meeting.recording?.url}
                  isVideo={true}
                  onTimeUpdate={handleTimeUpdate}
                  className="h-full"
                />
              </div>
            </CardGlass>
          </div>

          {/* Right: Tabbed Content with Transcript */}
          <div className="w-[480px] flex flex-col min-h-0">
            <CardGlass padding="none" className="flex-1 flex flex-col min-h-0">
              {/* Tabs */}
              <MeetingTabs
                activeTab={activeTab}
                onTabChange={setActiveTab}
                counts={{
                  actionItems: meeting.analysis?.actionItems?.length || 0,
                  comments: 0,
                  clips: 0,
                }}
              />

              {/* Tab Content */}
              <div className="flex-1 overflow-hidden">
                {activeTab === 'transcript' && meeting.transcript && (
                  <SyncedTranscript
                    segments={syncedSegments}
                    currentSegment={currentSegment}
                    activeSegmentIndex={activeSegmentIndex}
                    onSegmentClick={seekToSegment}
                    meetingTitle={meeting.title}
                  />
                )}

                {activeTab === 'summary' && meeting.analysis && (
                  <div className="h-full overflow-y-auto p-6 space-y-6">
                    {/* Summary */}
                    <div>
                      <h3 className="flex items-center text-lg font-semibold text-white mb-3">
                        <Sparkles className="h-5 w-5 mr-2 text-purple-400" />
                        Summary
                      </h3>
                      <p className="text-slate-300 leading-relaxed">{meeting.analysis.summary}</p>
                    </div>

                    {/* Key Points */}
                    <div>
                      <h3 className="flex items-center text-lg font-semibold text-white mb-3">
                        <Target className="h-5 w-5 mr-2 text-teal-400" />
                        Key Points
                      </h3>
                      <ul className="space-y-2">
                        {meeting.analysis.keyPoints.map((point, index) => (
                          <li key={index} className="flex items-start">
                            <CheckCircle className="h-4 w-4 text-emerald-400 mr-2 mt-0.5 flex-shrink-0" />
                            <span className="text-slate-300">{point}</span>
                          </li>
                        ))}
                      </ul>
                    </div>

                    {/* Decisions */}
                    {meeting.analysis.decisions && meeting.analysis.decisions.length > 0 && (
                      <div>
                        <h3 className="flex items-center text-lg font-semibold text-white mb-3">
                          <CheckCircle className="h-5 w-5 mr-2 text-green-400" />
                          Decisions Made
                        </h3>
                        <ul className="space-y-2">
                          {meeting.analysis.decisions.map((decision, index) => (
                            <li key={index} className="flex items-start">
                              <div className="w-1.5 h-1.5 rounded-full bg-green-400 mr-2 mt-2 flex-shrink-0" />
                              <span className="text-slate-300">{decision}</span>
                            </li>
                          ))}
                        </ul>
                      </div>
                    )}

                    {/* Next Steps */}
                    {meeting.analysis.nextSteps && meeting.analysis.nextSteps.length > 0 && (
                      <div>
                        <h3 className="flex items-center text-lg font-semibold text-white mb-3">
                          <Target className="h-5 w-5 mr-2 text-blue-400" />
                          Next Steps
                        </h3>
                        <ul className="space-y-2">
                          {meeting.analysis.nextSteps.map((step, index) => (
                            <li key={index} className="flex items-start">
                              <div className="flex items-center justify-center w-5 h-5 rounded-full bg-blue-500/20 border border-blue-500/30 mr-2 mt-0.5 flex-shrink-0">
                                <span className="text-xs text-blue-400">{index + 1}</span>
                              </div>
                              <span className="text-slate-300">{step}</span>
                            </li>
                          ))}
                        </ul>
                      </div>
                    )}
                  </div>
                )}

                {activeTab === 'action-items' && meeting.analysis && (
                  <div className="h-full overflow-y-auto p-6">
                    <div className="space-y-3">
                      {meeting.analysis.actionItems.map((item) => (
                        <div
                          key={item.id}
                          className="flex items-start justify-between p-4 bg-slate-800/40 border border-slate-700 rounded-lg hover:border-slate-600 transition-colors"
                        >
                          <div className="flex items-start space-x-3 flex-1">
                            <input
                              type="checkbox"
                              checked={item.status === 'completed'}
                              readOnly
                              className="mt-1 rounded border-slate-600 bg-slate-800 text-purple-500 focus:ring-purple-500/50"
                            />
                            <div className="flex-1">
                              <p className="text-slate-200 font-medium mb-1">{item.description}</p>
                              {item.assignee && (
                                <p className="text-sm text-slate-400">Assigned to: {item.assignee}</p>
                              )}
                              {item.dueDate && (
                                <p className="text-sm text-slate-500 mt-1">
                                  Due: {formatDateTime(item.dueDate)}
                                </p>
                              )}
                            </div>
                          </div>
                          <span
                            className={`px-2 py-1 text-xs rounded-full font-medium ${
                              item.priority === 'high'
                                ? 'bg-red-500/20 text-red-400 border border-red-500/30'
                                : item.priority === 'medium'
                                ? 'bg-amber-500/20 text-amber-400 border border-amber-500/30'
                                : 'bg-emerald-500/20 text-emerald-400 border border-emerald-500/30'
                            }`}
                          >
                            {item.priority}
                          </span>
                        </div>
                      ))}
                    </div>
                  </div>
                )}

                
                {activeTab === 'ask-ai' && (
                  <div className="h-full flex flex-col p-6">
                    <div className="flex-1 overflow-y-auto space-y-4 mb-4">
                      {aiMessages.length === 0 ? (
                        <div className="text-center text-slate-400 py-8">
                          <Bot className="h-12 w-12 mx-auto mb-3 text-purple-400" />
                          <h3 className="text-lg font-medium text-white mb-2">Ask AI about this meeting</h3>
                          <p className="text-sm">Get insights, summaries, or ask specific questions about the meeting content.</p>
                        </div>
                      ) : (
                        <div className="space-y-4">
                          {aiMessages.map((msg, idx) => (
                            <div key={idx} className={`flex ${msg.role === 'user' ? 'justify-end' : 'justify-start'}`}>
                              <div className={`max-w-[80%] p-4 rounded-lg ${msg.role === 'user' ? 'bg-purple-500/20 border border-purple-500/30' : 'bg-slate-800/50 border border-slate-700'}`}>
                                <p className="text-white text-sm whitespace-pre-wrap">{msg.content}</p>
                                {msg.sources && msg.sources.length > 0 && (
                                  <div className="mt-2 pt-2 border-t border-slate-600">
                                    <p className="text-xs text-slate-400">Sources:</p>
                                    {msg.sources.slice(0, 3).map((s: any, i: number) => (
                                      <p key={i} className="text-xs text-slate-500 truncate">{s.meetingTitle}</p>
                                    ))}
                                  </div>
                                )}
                              </div>
                            </div>
                          ))}
                          {aiLoading && (
                            <div className="flex justify-start">
                              <div className="bg-slate-800/50 border border-slate-700 p-4 rounded-lg">
                                <Loader2 className="h-5 w-5 animate-spin text-purple-400" />
                              </div>
                            </div>
                          )}
                        </div>
                      )}
                    </div>
                    <div className="flex gap-2">
                      <input
                        type="text"
                        value={aiQuestion}
                        onChange={(e) => setAiQuestion(e.target.value)}
                        onKeyDown={(e) => e.key === 'Enter' && handleAskAI()}
                        placeholder="Ask a question about this meeting..."
                        className="flex-1 px-4 py-2 bg-slate-800/50 border border-slate-700 rounded-lg text-white placeholder:text-slate-500 focus:outline-none focus:border-purple-500"
                        disabled={aiLoading}
                      />
                      <button
                        onClick={handleAskAI}
                        disabled={aiLoading || !aiQuestion.trim()}
                        className="px-4 py-2 bg-purple-500 hover:bg-purple-600 disabled:opacity-50 disabled:cursor-not-allowed text-white rounded-lg flex items-center gap-2"
                      >
                        {aiLoading ? <Loader2 className="h-4 w-4 animate-spin" /> : <Send className="h-4 w-4" />}
                        Ask
                      </button>
                    </div>
                  </div>
                )}

                {activeTab === 'templates' && (
                  <div className="h-full overflow-y-auto p-6">
                    {templatesLoading ? (
                      <div className="flex items-center justify-center py-8">
                        <Loader2 className="h-8 w-8 animate-spin text-teal-400" />
                      </div>
                    ) : appliedNotes ? (
                      /* Show applied notes */
                      <div className="space-y-4">
                        <div className="flex items-center justify-between mb-4">
                          <h3 className="text-lg font-medium text-white">
                            Generated Notes: {appliedNotes.templateName}
                          </h3>
                          <button
                            onClick={() => { setAppliedNotes(null); setSelectedTemplate(null); }}
                            className="text-sm text-slate-400 hover:text-white"
                          >
                            ← Back to templates
                          </button>
                        </div>
                        {appliedNotes.sections.map((section, idx) => (
                          <div key={idx} className="bg-slate-800/50 border border-slate-700 rounded-lg p-4">
                            <h4 className="text-white font-medium mb-2">{section.title}</h4>
                            <div className="text-slate-300 text-sm whitespace-pre-wrap">{section.content}</div>
                          </div>
                        ))}
                        <button
                          onClick={() => handleCopyToClipboard(appliedNotes.sections.map(s => `## ${s.title}\n${s.content}`).join('\n\n'))}
                          className="w-full py-2 bg-slate-700 hover:bg-slate-600 text-white rounded-lg flex items-center justify-center gap-2"
                        >
                          <Copy className="h-4 w-4" />
                          Copy All Notes
                        </button>
                      </div>
                    ) : selectedTemplate ? (
                      /* Show variable form for selected template */
                      <div className="space-y-4">
                        <div className="flex items-center justify-between mb-4">
                          <h3 className="text-lg font-medium text-white">{selectedTemplate.name}</h3>
                          <button
                            onClick={() => setSelectedTemplate(null)}
                            className="text-sm text-slate-400 hover:text-white"
                          >
                            ← Back
                          </button>
                        </div>
                        <p className="text-slate-400 text-sm">{selectedTemplate.description}</p>

                        {selectedTemplate.variables && selectedTemplate.variables.length > 0 && (
                          <div className="space-y-3">
                            <h4 className="text-sm font-medium text-white">Template Variables</h4>
                            {selectedTemplate.variables.map(variable => {
                              const varName = variable.replace(/[{}]/g, '');
                              return (
                                <div key={varName}>
                                  <label className="block text-xs text-slate-400 mb-1 capitalize">
                                    {varName.replace(/_/g, ' ')}
                                  </label>
                                  <input
                                    type="text"
                                    value={variableValues[varName] || ''}
                                    onChange={(e) => setVariableValues(prev => ({ ...prev, [varName]: e.target.value }))}
                                    className="w-full px-3 py-2 bg-slate-800/50 border border-slate-700 rounded-lg text-white text-sm focus:outline-none focus:border-teal-500"
                                    placeholder={`Enter ${varName.replace(/_/g, ' ')}`}
                                  />
                                </div>
                              );
                            })}
                          </div>
                        )}

                        <div className="pt-4">
                          <h4 className="text-sm font-medium text-white mb-2">Sections</h4>
                          <div className="space-y-2">
                            {selectedTemplate.sections.map((section, idx) => (
                              <div key={idx} className="flex items-center gap-2 text-sm text-slate-400">
                                <CheckCircle className="h-4 w-4 text-teal-400" />
                                {section.title}
                              </div>
                            ))}
                          </div>
                        </div>

                        <button
                          onClick={handleApplyTemplate}
                          disabled={applyingTemplate}
                          className="w-full py-3 bg-gradient-to-r from-teal-500 to-cyan-500 hover:from-teal-600 hover:to-cyan-600 disabled:opacity-50 text-white rounded-lg flex items-center justify-center gap-2"
                        >
                          {applyingTemplate ? (
                            <>
                              <Loader2 className="h-4 w-4 animate-spin" />
                              Applying...
                            </>
                          ) : (
                            <>
                              <Sparkles className="h-4 w-4" />
                              Apply Template
                            </>
                          )}
                        </button>
                      </div>
                    ) : (
                      /* Show template grid */
                      <div className="space-y-4">
                        <div className="flex items-center justify-between">
                          <h3 className="text-lg font-medium text-white">Select a Template</h3>
                          <span className="text-sm text-slate-400">{templates.length} templates</span>
                        </div>
                        <div className="grid gap-3">
                          {templates.map(template => (
                            <button
                              key={template.id}
                              onClick={() => handleSelectTemplate(template)}
                              className="text-left p-4 bg-slate-800/50 border border-slate-700 rounded-lg hover:border-teal-500/50 transition-colors"
                            >
                              <div className="flex items-start justify-between">
                                <div>
                                  <h4 className="text-white font-medium">{template.name}</h4>
                                  <p className="text-sm text-slate-400 mt-1">{template.description}</p>
                                </div>
                                {template.isPreBuilt && (
                                  <span className="text-xs px-2 py-1 bg-teal-500/20 text-teal-400 rounded-full border border-teal-500/30">
                                    Pre-built
                                  </span>
                                )}
                              </div>
                              <div className="flex items-center gap-2 mt-2">
                                <span className="text-xs text-slate-500 capitalize">{template.category?.replace(/_/g, ' ')}</span>
                                <span className="text-slate-600">•</span>
                                <span className="text-xs text-slate-500">{template.sections?.length || 0} sections</span>
                              </div>
                            </button>
                          ))}
                        </div>
                        {templates.length === 0 && (
                          <div className="text-center py-8">
                            <LayoutTemplate className="h-12 w-12 mx-auto mb-3 text-slate-600" />
                            <p className="text-slate-400">No templates available</p>
                            <button
                              onClick={() => router.push('/templates')}
                              className="mt-4 px-6 py-2 bg-slate-700 hover:bg-slate-600 text-white rounded-lg"
                            >
                              Create Template
                            </button>
                          </div>
                        )}
                      </div>
                    )}
                  </div>
                )}
                {activeTab === 'comments' && (
                  <div className="h-full flex items-center justify-center p-6">
                    <div className="text-center text-slate-500">
                      <MessageSquare className="h-12 w-12 mx-auto mb-2 opacity-50" />
                      <p>Comments feature coming soon</p>
                    </div>
                  </div>
                )}

                {activeTab === 'clips' && (
                  <div className="h-full flex items-center justify-center p-6">
                    <div className="text-center text-slate-500">
                      <Scissors className="h-12 w-12 mx-auto mb-2 opacity-50" />
                      <p>Clips feature coming soon</p>
                    </div>
                  </div>
                )}

                {activeTab === 'insights' && meeting.analysis && (
                  <div className="h-full overflow-y-auto p-6 space-y-6">
                    {/* Topics */}
                    <div>
                      <h3 className="flex items-center text-lg font-semibold text-white mb-3">
                        <MessageSquare className="h-5 w-5 mr-2 text-blue-400" />
                        Topics Discussed
                      </h3>
                      <div className="space-y-3">
                        {meeting.analysis.topics.map((topic, index) => (
                          <div
                            key={index}
                            className="flex items-center justify-between p-3 bg-slate-800/40 border border-slate-700 rounded-lg"
                          >
                            <span className="text-slate-300 font-medium">{topic.name}</span>
                            <div className="flex items-center space-x-3">
                              <span className="text-sm text-slate-400">{topic.mentions} mentions</span>
                              <div className="w-24 bg-slate-700 rounded-full h-2">
                                <div
                                  className="bg-gradient-to-r from-purple-500 to-teal-500 h-2 rounded-full"
                                  style={{ width: `${topic.relevance * 100}%` }}
                                />
                              </div>
                            </div>
                          </div>
                        ))}
                      </div>
                    </div>

                    {/* Sentiment */}
                    <div>
                      <h3 className="flex items-center text-lg font-semibold text-white mb-3">
                        <TrendingUp className="h-5 w-5 mr-2 text-green-400" />
                        Sentiment Analysis
                      </h3>
                      <div className="p-6 bg-slate-800/40 border border-slate-700 rounded-lg">
                        <div className="text-center">
                          <div className="text-5xl mb-3">
                            {getSentimentEmoji(meeting.analysis.sentiment)}
                          </div>
                          <p className="text-lg text-slate-200 font-medium mb-2">
                            {meeting.analysis.sentiment > 0.6
                              ? 'Positive'
                              : meeting.analysis.sentiment > 0.2
                              ? 'Neutral'
                              : 'Negative'}
                          </p>
                          <div className="mt-4 bg-slate-700 rounded-full h-3">
                            <div
                              className={`h-3 rounded-full transition-all ${
                                meeting.analysis.sentiment > 0.6
                                  ? 'bg-emerald-500'
                                  : meeting.analysis.sentiment > 0.2
                                  ? 'bg-amber-500'
                                  : 'bg-red-500'
                              }`}
                              style={{ width: `${(meeting.analysis.sentiment + 1) * 50}%` }}
                            />
                          </div>
                        </div>
                      </div>
                    </div>

                    {/* Attendee Stats */}
                    <div>
                      <h3 className="flex items-center text-lg font-semibold text-white mb-3">
                        <Users className="h-5 w-5 mr-2 text-purple-400" />
                        Participation
                      </h3>
                      <div className="space-y-2">
                        {meeting.attendees
                          .filter((a) => a.speakingTime && a.speakingTime > 0)
                          .sort((a, b) => (b.speakingTime || 0) - (a.speakingTime || 0))
                          .map((attendee) => (
                            <div
                              key={attendee.id}
                              className="flex items-center justify-between p-3 bg-slate-800/40 border border-slate-700 rounded-lg"
                            >
                              <div className="flex items-center space-x-3">
                                <div className="w-8 h-8 bg-gradient-to-br from-purple-500 to-teal-500 rounded-full flex items-center justify-center text-xs text-white font-medium">
                                  {attendee.name[0]}
                                </div>
                                <span className="text-slate-200">{attendee.name}</span>
                              </div>
                              <div className="flex items-center space-x-3">
                                <span className="text-sm text-slate-400">
                                  {formatDuration(attendee.speakingTime || 0)}
                                </span>
                                <div className="w-24 bg-slate-700 rounded-full h-2">
                                  <div
                                    className="bg-gradient-to-r from-purple-500 to-teal-500 h-2 rounded-full"
                                    style={{
                                      width: `${
                                        ((attendee.speakingTime || 0) / meeting.duration) * 100
                                      }%`,
                                    }}
                                  />
                                </div>
                              </div>
                            </div>
                          ))}
                      </div>
                    </div>
                  </div>
                )}
              </div>
            </CardGlass>
          </div>
        </div>
      </main>
    </div>
  );
}
