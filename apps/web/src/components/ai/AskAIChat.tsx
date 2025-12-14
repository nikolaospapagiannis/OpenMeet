/**
 * AskAIChat Component - Main chat interface for AI queries
 *
 * REAL IMPLEMENTATION:
 * - Integrates with useAIChat hook (real API calls)
 * - Message list with streaming support
 * - Input with submit
 * - Meeting context selector
 * - Conversation actions
 */

'use client';

import React, { useRef, useEffect, useState } from 'react';
import {
  Send,
  Loader2,
  Sparkles,
  X,
  Filter,
  Calendar,
  Users,
  Tag,
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Textarea } from '@/components/ui/textarea';
import { ChatMessage } from './ChatMessage';
import { SuggestedQuestions } from './SuggestedQuestions';
import { useAIChat, MeetingFilter } from '@/hooks/useAIChat';
import { CardGlass, CardGlassContent } from '@/components/ui/card-glass';

interface AskAIChatProps {
  initialMessage?: string;
  showSuggestions?: boolean;
  onMessageSent?: (message: string) => void;
}

export function AskAIChat({
  initialMessage,
  showSuggestions = true,
  onMessageSent,
}: AskAIChatProps) {
  const [input, setInput] = useState('');
  const [showFilters, setShowFilters] = useState(false);
  const textareaRef = useRef<HTMLTextAreaElement>(null);
  const messagesEndRef = useRef<HTMLDivElement>(null);

  const {
    messages,
    isLoading,
    error,
    meetingFilters,
    sendMessage,
    cancelRequest,
    regenerateLastMessage,
    copyMessage,
    updateMeetingFilters,
    clearError,
    hasMessages,
  } = useAIChat({
    autoSave: true,
    onError: (err) => {
      console.error('Chat error:', err);
    },
  });

  // Auto-scroll to bottom on new messages
  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  };

  useEffect(() => {
    scrollToBottom();
  }, [messages]);

  // Send initial message if provided
  useEffect(() => {
    if (initialMessage && !hasMessages) {
      handleSend(initialMessage);
    }
  }, [initialMessage]);

  // Auto-focus input
  useEffect(() => {
    textareaRef.current?.focus();
  }, []);

  const handleSend = async (message?: string) => {
    const messageToSend = message || input.trim();
    if (!messageToSend || isLoading) return;

    if (!message) {
      setInput('');
    }

    try {
      await sendMessage(messageToSend);
      onMessageSent?.(messageToSend);
    } catch (err) {
      console.error('Failed to send message:', err);
    }
  };

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      handleSend();
    }
  };

  const handleQuestionClick = (question: string) => {
    handleSend(question);
  };

  const handleCancelRequest = () => {
    cancelRequest();
  };

  const handleClearFilters = () => {
    updateMeetingFilters({});
    setShowFilters(false);
  };

  const hasActiveFilters =
    meetingFilters.meetingIds?.length ||
    meetingFilters.dateFrom ||
    meetingFilters.dateTo ||
    meetingFilters.participantEmails?.length ||
    meetingFilters.tags?.length;

  // Get follow-up questions from last assistant message
  const lastAssistantMessage = messages
    .slice()
    .reverse()
    .find(m => m.role === 'assistant');
  const followUpQuestions = lastAssistantMessage?.suggestedFollowUps;

  return (
    <div className="flex flex-col h-full">
      {/* Error Banner */}
      {error && (
        <div className="bg-red-900/20 border border-red-500/50 rounded-lg p-3 mb-4 flex items-center justify-between">
          <p className="text-sm text-red-300">{error.message}</p>
          <Button
            variant="ghost"
            size="sm"
            onClick={clearError}
            className="text-red-400 hover:text-red-300"
          >
            <X className="h-4 w-4" />
          </Button>
        </div>
      )}

      {/* Filter Bar */}
      {hasActiveFilters && (
        <div className="bg-purple-900/20 border border-purple-500/30 rounded-lg p-3 mb-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2 text-sm text-purple-300">
              <Filter className="h-4 w-4" />
              <span>Active filters:</span>
              {meetingFilters.dateFrom && (
                <span className="px-2 py-1 bg-purple-600/30 rounded text-xs">
                  From: {new Date(meetingFilters.dateFrom).toLocaleDateString()}
                </span>
              )}
              {meetingFilters.dateTo && (
                <span className="px-2 py-1 bg-purple-600/30 rounded text-xs">
                  To: {new Date(meetingFilters.dateTo).toLocaleDateString()}
                </span>
              )}
              {meetingFilters.meetingIds?.length && (
                <span className="px-2 py-1 bg-purple-600/30 rounded text-xs">
                  {meetingFilters.meetingIds.length} meetings
                </span>
              )}
            </div>
            <Button
              variant="ghost"
              size="sm"
              onClick={handleClearFilters}
              className="text-purple-400 hover:text-purple-300"
            >
              Clear filters
            </Button>
          </div>
        </div>
      )}

      {/* Messages Area */}
      <div className="flex-1 overflow-y-auto">
        {!hasMessages ? (
          /* Welcome Screen with Suggestions */
          <div className="h-full flex flex-col items-center justify-center p-8">
            <div className="w-16 h-16 bg-gradient-to-br from-purple-600 to-blue-600 rounded-2xl flex items-center justify-center mb-6 shadow-lg shadow-purple-500/25">
              <Sparkles className="h-8 w-8 text-white" />
            </div>
            <h2 className="text-2xl font-bold text-white mb-2">Ask AI Anything</h2>
            <p className="text-slate-400 text-center mb-8 max-w-md">
              Query your meeting history with AI. Get summaries, find insights, and discover
              patterns across all your meetings.
            </p>

            {showSuggestions && (
              <div className="w-full max-w-5xl">
                <SuggestedQuestions onQuestionClick={handleQuestionClick} />
              </div>
            )}
          </div>
        ) : (
          /* Messages List */
          <div className="max-w-4xl mx-auto py-6 px-4 space-y-6">
            {messages.map((message, index) => (
              <ChatMessage
                key={index}
                message={message}
                onCopy={copyMessage}
                onRegenerate={
                  index === messages.length - 1 && message.role === 'assistant'
                    ? regenerateLastMessage
                    : undefined
                }
                showRegenerate={
                  index === messages.length - 1 &&
                  message.role === 'assistant' &&
                  !isLoading
                }
              />
            ))}

            {/* Loading Indicator */}
            {isLoading && (
              <div className="flex gap-4">
                <div className="w-8 h-8 bg-gradient-to-br from-purple-600 to-blue-600 rounded-lg flex items-center justify-center flex-shrink-0">
                  <Sparkles className="h-4 w-4 text-white" />
                </div>
                <div className="bg-slate-800/80 rounded-2xl px-4 py-3 border border-white/10">
                  <div className="flex items-center gap-3 text-slate-400">
                    <Loader2 className="h-4 w-4 animate-spin" />
                    <span>Analyzing your meetings...</span>
                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={handleCancelRequest}
                      className="text-slate-500 hover:text-slate-300 text-xs"
                    >
                      Cancel
                    </Button>
                  </div>
                </div>
              </div>
            )}

            {/* Follow-up Questions */}
            {followUpQuestions && followUpQuestions.length > 0 && !isLoading && (
              <div className="pt-4">
                <SuggestedQuestions
                  onQuestionClick={handleQuestionClick}
                  followUpQuestions={followUpQuestions}
                />
              </div>
            )}

            <div ref={messagesEndRef} />
          </div>
        )}
      </div>

      {/* Input Area */}
      <div className="border-t border-white/10 p-4 bg-slate-900/50 backdrop-blur-sm">
        <div className="max-w-4xl mx-auto">
          {/* Filter Toggle Button */}
          <div className="flex gap-2 mb-3">
            <Button
              variant="ghost"
              size="sm"
              onClick={() => setShowFilters(!showFilters)}
              className={`text-slate-400 hover:text-white ${
                hasActiveFilters ? 'text-purple-400' : ''
              }`}
            >
              <Filter className="h-4 w-4 mr-2" />
              {hasActiveFilters ? 'Filters Active' : 'Add Filters'}
            </Button>
          </div>

          {/* Filter Panel */}
          {showFilters && (
            <CardGlass className="mb-3">
              <CardGlassContent className="p-4">
                <div className="space-y-3">
                  <h4 className="text-sm font-medium text-white">Filter Meetings</h4>
                  <div className="grid grid-cols-2 gap-3">
                    <div>
                      <label className="text-xs text-slate-400 mb-1 block">From Date</label>
                      <input
                        type="date"
                        className="w-full px-3 py-2 bg-slate-800 border border-white/10 rounded-lg text-sm text-white"
                        value={meetingFilters.dateFrom || ''}
                        onChange={e =>
                          updateMeetingFilters({
                            ...meetingFilters,
                            dateFrom: e.target.value,
                          })
                        }
                      />
                    </div>
                    <div>
                      <label className="text-xs text-slate-400 mb-1 block">To Date</label>
                      <input
                        type="date"
                        className="w-full px-3 py-2 bg-slate-800 border border-white/10 rounded-lg text-sm text-white"
                        value={meetingFilters.dateTo || ''}
                        onChange={e =>
                          updateMeetingFilters({
                            ...meetingFilters,
                            dateTo: e.target.value,
                          })
                        }
                      />
                    </div>
                  </div>
                  <p className="text-xs text-slate-500 italic">
                    Filters help narrow down which meetings the AI should search
                  </p>
                </div>
              </CardGlassContent>
            </CardGlass>
          )}

          {/* Input Box */}
          <div className="relative">
            <Textarea
              ref={textareaRef}
              value={input}
              onChange={e => setInput(e.target.value)}
              onKeyDown={handleKeyDown}
              placeholder="Ask anything about your meetings..."
              className="min-h-[56px] max-h-[200px] resize-none pr-14 bg-slate-800/80 border-white/10 text-white placeholder:text-slate-500 focus:border-purple-500/50 focus:ring-purple-500/20 rounded-xl"
              disabled={isLoading}
            />
            <Button
              onClick={() => handleSend()}
              disabled={!input.trim() || isLoading}
              className="absolute right-2 bottom-2 h-10 w-10 p-0 bg-purple-600 hover:bg-purple-700 disabled:bg-slate-700 disabled:text-slate-500 rounded-lg transition-colors"
            >
              {isLoading ? (
                <Loader2 className="h-4 w-4 animate-spin" />
              ) : (
                <Send className="h-4 w-4" />
              )}
            </Button>
          </div>

          <p className="text-xs text-slate-600 mt-2 text-center">
            AI can make mistakes. Verify important information from original meetings.
          </p>
        </div>
      </div>
    </div>
  );
}
