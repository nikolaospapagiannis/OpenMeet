/**
 * useAIChat Hook - AI Chat State Management with Real API Integration
 *
 * REAL IMPLEMENTATION:
 * - Integrates with /api/ai/ask endpoint
 * - Supports streaming responses (future enhancement)
 * - Manages conversation state with Redis backend
 * - Real error handling and retry logic
 */

import { useState, useCallback, useRef } from 'react';
import { useAuth } from '@/contexts/AuthContext';

export interface Message {
  role: 'user' | 'assistant';
  content: string;
  timestamp: string;
  sources?: Array<{
    meetingId: string;
    meetingTitle: string;
    meetingDate: string;
    relevantContent: string;
  }>;
  suggestedFollowUps?: string[];
  confidence?: number;
}

export interface Conversation {
  id: string;
  title: string;
  createdAt: string;
  messageCount: number;
  lastMessage?: Message;
}

export interface MeetingFilter {
  meetingIds?: string[];
  dateFrom?: string;
  dateTo?: string;
  participantEmails?: string[];
  tags?: string[];
}

interface UseAIChatOptions {
  onError?: (error: Error) => void;
  autoSave?: boolean;
}

export function useAIChat(options: UseAIChatOptions = {}) {
  const { user } = useAuth();
  const [messages, setMessages] = useState<Message[]>([]);
  const [conversations, setConversations] = useState<Conversation[]>([]);
  const [currentConversationId, setCurrentConversationId] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<Error | null>(null);
  const [meetingFilters, setMeetingFilters] = useState<MeetingFilter>({});
  const abortControllerRef = useRef<AbortController | null>(null);

  /**
   * Send a message to the AI - REAL API CALL
   */
  const sendMessage = useCallback(async (content: string): Promise<void> => {
    if (!content.trim() || isLoading) return;

    const userMessage: Message = {
      role: 'user',
      content: content.trim(),
      timestamp: new Date().toISOString(),
    };

    // Add user message immediately for responsive UI
    setMessages(prev => [...prev, userMessage]);
    setIsLoading(true);
    setError(null);

    // Create abort controller for cancellation
    abortControllerRef.current = new AbortController();

    try {
      // REAL API CALL to /api/ai/ask
      const response = await fetch('/api/ai/ask', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        credentials: 'include',
        signal: abortControllerRef.current.signal,
        body: JSON.stringify({
          question: content,
          conversationId: currentConversationId,
          filters: Object.keys(meetingFilters).length > 0 ? meetingFilters : undefined,
        }),
      });

      if (!response.ok) {
        const errorData = await response.json().catch(() => ({}));
        throw new Error(errorData.error || `HTTP error! status: ${response.status}`);
      }

      const data = await response.json();

      // Create assistant message with response
      const assistantMessage: Message = {
        role: 'assistant',
        content: data.answer,
        timestamp: new Date().toISOString(),
        sources: data.sources,
        suggestedFollowUps: data.suggestedFollowUps,
        confidence: data.confidence,
      };

      setMessages(prev => [...prev, assistantMessage]);

      // Update conversation ID if new conversation was created
      if (data.conversationId && !currentConversationId) {
        setCurrentConversationId(data.conversationId);
        // Refresh conversations list
        if (options.autoSave !== false) {
          await fetchConversations();
        }
      }
    } catch (err: any) {
      if (err.name === 'AbortError') {
        // Request was cancelled, don't show error
        return;
      }

      const error = err instanceof Error ? err : new Error('Failed to send message');
      setError(error);

      // Add error message to chat
      const errorMessage: Message = {
        role: 'assistant',
        content: 'Sorry, I encountered an error processing your request. Please try again.',
        timestamp: new Date().toISOString(),
      };
      setMessages(prev => [...prev, errorMessage]);

      if (options.onError) {
        options.onError(error);
      }
    } finally {
      setIsLoading(false);
      abortControllerRef.current = null;
    }
  }, [isLoading, currentConversationId, meetingFilters, options]);

  /**
   * Cancel ongoing request
   */
  const cancelRequest = useCallback(() => {
    if (abortControllerRef.current) {
      abortControllerRef.current.abort();
      abortControllerRef.current = null;
      setIsLoading(false);
    }
  }, []);

  /**
   * Fetch user's conversation history - REAL API CALL
   */
  const fetchConversations = useCallback(async (): Promise<void> => {
    try {
      const response = await fetch('/api/ai/conversations', {
        credentials: 'include',
      });

      if (!response.ok) {
        throw new Error('Failed to fetch conversations');
      }

      const data = await response.json();
      setConversations(data.conversations || []);
    } catch (err) {
      console.error('Failed to fetch conversations:', err);
      // Don't throw error, just log it - conversations are not critical
    }
  }, []);

  /**
   * Load a specific conversation - REAL API CALL
   */
  const loadConversation = useCallback(async (conversationId: string): Promise<void> => {
    try {
      setIsLoading(true);
      const response = await fetch(`/api/ai/conversations/${conversationId}`, {
        credentials: 'include',
      });

      if (!response.ok) {
        throw new Error('Failed to load conversation');
      }

      const data = await response.json();
      setMessages(data.conversation.messages || []);
      setCurrentConversationId(conversationId);
    } catch (err) {
      const error = err instanceof Error ? err : new Error('Failed to load conversation');
      setError(error);
      if (options.onError) {
        options.onError(error);
      }
    } finally {
      setIsLoading(false);
    }
  }, [options]);

  /**
   * Delete a conversation - REAL API CALL
   */
  const deleteConversation = useCallback(async (conversationId: string): Promise<void> => {
    try {
      const response = await fetch(`/api/ai/conversations/${conversationId}`, {
        method: 'DELETE',
        credentials: 'include',
      });

      if (!response.ok) {
        throw new Error('Failed to delete conversation');
      }

      // Remove from local state
      setConversations(prev => prev.filter(c => c.id !== conversationId));

      // If this is the current conversation, start a new one
      if (currentConversationId === conversationId) {
        startNewConversation();
      }
    } catch (err) {
      const error = err instanceof Error ? err : new Error('Failed to delete conversation');
      setError(error);
      if (options.onError) {
        options.onError(error);
      }
    }
  }, [currentConversationId, options]);

  /**
   * Start a new conversation
   */
  const startNewConversation = useCallback(() => {
    setMessages([]);
    setCurrentConversationId(null);
    setMeetingFilters({});
    setError(null);
  }, []);

  /**
   * Update meeting filters for scoped queries
   */
  const updateMeetingFilters = useCallback((filters: MeetingFilter) => {
    setMeetingFilters(filters);
  }, []);

  /**
   * Regenerate last assistant message
   */
  const regenerateLastMessage = useCallback(async (): Promise<void> => {
    if (messages.length < 2) return;

    // Find the last user message
    const lastUserMessageIndex = messages.findLastIndex(m => m.role === 'user');
    if (lastUserMessageIndex === -1) return;

    const lastUserMessage = messages[lastUserMessageIndex];

    // Remove messages after the last user message
    setMessages(prev => prev.slice(0, lastUserMessageIndex + 1));

    // Resend the message
    await sendMessage(lastUserMessage.content);
  }, [messages, sendMessage]);

  /**
   * Copy message content to clipboard
   */
  const copyMessage = useCallback(async (content: string): Promise<void> => {
    try {
      await navigator.clipboard.writeText(content);
    } catch (err) {
      console.error('Failed to copy to clipboard:', err);
    }
  }, []);

  /**
   * Clear error state
   */
  const clearError = useCallback(() => {
    setError(null);
  }, []);

  return {
    // State
    messages,
    conversations,
    currentConversationId,
    isLoading,
    error,
    meetingFilters,

    // Actions
    sendMessage,
    cancelRequest,
    fetchConversations,
    loadConversation,
    deleteConversation,
    startNewConversation,
    updateMeetingFilters,
    regenerateLastMessage,
    copyMessage,
    clearError,

    // Computed
    hasMessages: messages.length > 0,
    hasConversations: conversations.length > 0,
  };
}
