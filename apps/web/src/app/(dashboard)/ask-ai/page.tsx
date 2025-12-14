'use client';

import { useState, useRef, useEffect, useCallback } from 'react';
import {
  Send,
  Plus,
  MessageSquare,
  Trash2,
  Sparkles,
  Clock,
  FileText,
  ExternalLink,
  ChevronRight,
  Loader2,
  Bot,
  User,
  History,
  Lightbulb,
  Search,
  Calendar,
  Users,
  TrendingUp
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Textarea } from '@/components/ui/textarea';
import { CardGlass, CardGlassContent } from '@/components/ui/card-glass';
import { useAuth } from '@/contexts/AuthContext';

interface Message {
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
}

interface Conversation {
  id: string;
  title: string;
  createdAt: string;
  messageCount: number;
  lastMessage?: Message;
}

const SUGGESTED_QUESTIONS = [
  { icon: TrendingUp, text: "What were the key decisions made this week?", category: "Decisions" },
  { icon: Users, text: "Who spoke the most in recent meetings?", category: "Analytics" },
  { icon: FileText, text: "Summarize action items from the last 5 meetings", category: "Action Items" },
  { icon: Calendar, text: "What topics were discussed yesterday?", category: "Topics" },
  { icon: Search, text: "Find discussions about budget or pricing", category: "Search" },
  { icon: Lightbulb, text: "What are the main themes across my meetings?", category: "Insights" },
];

export default function AskAIPage() {
  const { user } = useAuth();
  const [messages, setMessages] = useState<Message[]>([]);
  const [input, setInput] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [conversations, setConversations] = useState<Conversation[]>([]);
  const [currentConversationId, setCurrentConversationId] = useState<string | null>(null);
  const [showSidebar, setShowSidebar] = useState(true);
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const textareaRef = useRef<HTMLTextAreaElement>(null);

  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  };

  useEffect(() => {
    scrollToBottom();
  }, [messages]);

  useEffect(() => {
    fetchConversations();
  }, []);

  const fetchConversations = async () => {
    try {
      const response = await fetch('/api/ai/conversations', {
        credentials: 'include',
      });
      if (response.ok) {
        const data = await response.json();
        setConversations(data.conversations || []);
      }
    } catch (error) {
      console.error('Failed to fetch conversations:', error);
    }
  };

  const loadConversation = async (conversationId: string) => {
    try {
      const response = await fetch(`/api/ai/conversations/${conversationId}`, {
        credentials: 'include',
      });
      if (response.ok) {
        const data = await response.json();
        setMessages(data.conversation.messages || []);
        setCurrentConversationId(conversationId);
      }
    } catch (error) {
      console.error('Failed to load conversation:', error);
    }
  };

  const startNewConversation = () => {
    setMessages([]);
    setCurrentConversationId(null);
    setInput('');
    textareaRef.current?.focus();
  };

  const deleteConversation = async (conversationId: string) => {
    try {
      await fetch(`/api/ai/conversations/${conversationId}`, {
        method: 'DELETE',
        credentials: 'include',
      });
      setConversations(prev => prev.filter(c => c.id !== conversationId));
      if (currentConversationId === conversationId) {
        startNewConversation();
      }
    } catch (error) {
      console.error('Failed to delete conversation:', error);
    }
  };

  const sendMessage = async (messageText?: string) => {
    const question = messageText || input.trim();
    if (!question || isLoading) return;

    const userMessage: Message = {
      role: 'user',
      content: question,
      timestamp: new Date().toISOString(),
    };

    setMessages(prev => [...prev, userMessage]);
    setInput('');
    setIsLoading(true);

    try {
      const response = await fetch('/api/ai/ask', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        credentials: 'include',
        body: JSON.stringify({
          question,
          conversationId: currentConversationId,
        }),
      });

      if (!response.ok) {
        throw new Error('Failed to get response');
      }

      const data = await response.json();

      const assistantMessage: Message = {
        role: 'assistant',
        content: data.answer,
        timestamp: new Date().toISOString(),
        sources: data.sources,
        suggestedFollowUps: data.suggestedFollowUps,
      };

      setMessages(prev => [...prev, assistantMessage]);

      if (data.conversationId && !currentConversationId) {
        setCurrentConversationId(data.conversationId);
        fetchConversations();
      }
    } catch (error) {
      console.error('Error:', error);
      setMessages(prev => [...prev, {
        role: 'assistant',
        content: 'Sorry, I encountered an error processing your request. Please try again.',
        timestamp: new Date().toISOString(),
      }]);
    } finally {
      setIsLoading(false);
    }
  };

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      sendMessage();
    }
  };

  const formatDate = (dateString: string) => {
    const date = new Date(dateString);
    return date.toLocaleDateString('en-US', {
      month: 'short',
      day: 'numeric',
      hour: '2-digit',
      minute: '2-digit'
    });
  };

  return (
    <div className="flex h-[calc(100vh-4rem)] bg-[#0a0a1a]">
      {/* Sidebar - Conversation History */}
      {showSidebar && (
        <div className="w-72 border-r border-white/10 flex flex-col bg-slate-900/50">
          <div className="p-4 border-b border-white/10">
            <Button
              onClick={startNewConversation}
              className="w-full bg-purple-600 hover:bg-purple-700 text-white gap-2"
            >
              <Plus className="h-4 w-4" />
              New Chat
            </Button>
          </div>

          <div className="flex-1 overflow-y-auto p-2 space-y-1">
            <div className="px-2 py-1 text-xs text-slate-500 uppercase tracking-wider flex items-center gap-2">
              <History className="h-3 w-3" />
              Recent Conversations
            </div>
            {conversations.length === 0 ? (
              <p className="text-sm text-slate-500 px-3 py-4 text-center">
                No conversations yet
              </p>
            ) : (
              conversations.map((conv) => (
                <div
                  key={conv.id}
                  className={`group flex items-center gap-2 px-3 py-2 rounded-lg cursor-pointer transition-colors ${
                    currentConversationId === conv.id
                      ? 'bg-purple-600/20 text-white'
                      : 'text-slate-400 hover:bg-white/5 hover:text-white'
                  }`}
                  onClick={() => loadConversation(conv.id)}
                >
                  <MessageSquare className="h-4 w-4 flex-shrink-0" />
                  <span className="flex-1 truncate text-sm">{conv.title}</span>
                  <button
                    onClick={(e) => {
                      e.stopPropagation();
                      deleteConversation(conv.id);
                    }}
                    className="opacity-0 group-hover:opacity-100 p-1 hover:bg-red-500/20 rounded transition-all"
                  >
                    <Trash2 className="h-3 w-3 text-red-400" />
                  </button>
                </div>
              ))
            )}
          </div>
        </div>
      )}

      {/* Main Chat Area */}
      <div className="flex-1 flex flex-col">
        {/* Messages Area */}
        <div className="flex-1 overflow-y-auto">
          {messages.length === 0 ? (
            /* Welcome Screen */
            <div className="h-full flex flex-col items-center justify-center p-8">
              <div className="w-16 h-16 bg-gradient-to-br from-purple-600 to-blue-600 rounded-2xl flex items-center justify-center mb-6 shadow-lg shadow-purple-500/25">
                <Sparkles className="h-8 w-8 text-white" />
              </div>
              <h1 className="text-3xl font-bold text-white mb-2">Ask AI</h1>
              <p className="text-slate-400 text-center mb-8 max-w-md">
                Query all your meetings with AI. Ask questions, get summaries, find insights across your entire meeting history.
              </p>

              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4 max-w-4xl w-full">
                {SUGGESTED_QUESTIONS.map((q, i) => {
                  const Icon = q.icon;
                  return (
                    <CardGlass
                      key={i}
                      hover
                      className="cursor-pointer group"
                      onClick={() => sendMessage(q.text)}
                    >
                      <CardGlassContent className="p-4">
                        <div className="flex items-start gap-3">
                          <div className="w-8 h-8 bg-purple-500/20 rounded-lg flex items-center justify-center flex-shrink-0 group-hover:bg-purple-500/30 transition-colors">
                            <Icon className="h-4 w-4 text-purple-400" />
                          </div>
                          <div>
                            <span className="text-xs text-purple-400 mb-1 block">{q.category}</span>
                            <p className="text-sm text-slate-300 group-hover:text-white transition-colors">
                              {q.text}
                            </p>
                          </div>
                        </div>
                      </CardGlassContent>
                    </CardGlass>
                  );
                })}
              </div>
            </div>
          ) : (
            /* Messages */
            <div className="max-w-4xl mx-auto py-6 px-4 space-y-6">
              {messages.map((message, index) => (
                <div
                  key={index}
                  className={`flex gap-4 ${message.role === 'user' ? 'justify-end' : 'justify-start'}`}
                >
                  {message.role === 'assistant' && (
                    <div className="w-8 h-8 bg-gradient-to-br from-purple-600 to-blue-600 rounded-lg flex items-center justify-center flex-shrink-0">
                      <Bot className="h-4 w-4 text-white" />
                    </div>
                  )}

                  <div className={`max-w-[80%] ${message.role === 'user' ? 'order-first' : ''}`}>
                    <div
                      className={`rounded-2xl px-4 py-3 ${
                        message.role === 'user'
                          ? 'bg-purple-600 text-white'
                          : 'bg-slate-800/80 text-slate-200 border border-white/10'
                      }`}
                    >
                      <p className="whitespace-pre-wrap">{message.content}</p>
                    </div>

                    {/* Sources */}
                    {message.sources && message.sources.length > 0 && (
                      <div className="mt-3 space-y-2">
                        <p className="text-xs text-slate-500 flex items-center gap-1">
                          <FileText className="h-3 w-3" />
                          Sources
                        </p>
                        <div className="flex flex-wrap gap-2">
                          {message.sources.map((source, i) => (
                            <a
                              key={i}
                              href={`/meetings/${source.meetingId}`}
                              className="inline-flex items-center gap-1 px-3 py-1.5 bg-slate-800/60 hover:bg-slate-700/60 rounded-lg text-xs text-slate-300 hover:text-white transition-colors border border-white/5"
                            >
                              <Calendar className="h-3 w-3" />
                              {source.meetingTitle}
                              <ExternalLink className="h-3 w-3 ml-1" />
                            </a>
                          ))}
                        </div>
                      </div>
                    )}

                    {/* Follow-up suggestions */}
                    {message.suggestedFollowUps && message.suggestedFollowUps.length > 0 && (
                      <div className="mt-3 space-y-2">
                        <p className="text-xs text-slate-500 flex items-center gap-1">
                          <Lightbulb className="h-3 w-3" />
                          Follow-up questions
                        </p>
                        <div className="flex flex-wrap gap-2">
                          {message.suggestedFollowUps.map((followUp, i) => (
                            <button
                              key={i}
                              onClick={() => sendMessage(followUp)}
                              className="inline-flex items-center gap-1 px-3 py-1.5 bg-purple-600/20 hover:bg-purple-600/30 rounded-lg text-xs text-purple-300 hover:text-purple-200 transition-colors border border-purple-500/20"
                            >
                              <ChevronRight className="h-3 w-3" />
                              {followUp}
                            </button>
                          ))}
                        </div>
                      </div>
                    )}

                    <p className="text-xs text-slate-600 mt-2">
                      {formatDate(message.timestamp)}
                    </p>
                  </div>

                  {message.role === 'user' && (
                    <div className="w-8 h-8 bg-slate-700 rounded-lg flex items-center justify-center flex-shrink-0">
                      <User className="h-4 w-4 text-slate-300" />
                    </div>
                  )}
                </div>
              ))}

              {isLoading && (
                <div className="flex gap-4">
                  <div className="w-8 h-8 bg-gradient-to-br from-purple-600 to-blue-600 rounded-lg flex items-center justify-center flex-shrink-0">
                    <Bot className="h-4 w-4 text-white" />
                  </div>
                  <div className="bg-slate-800/80 rounded-2xl px-4 py-3 border border-white/10">
                    <div className="flex items-center gap-2 text-slate-400">
                      <Loader2 className="h-4 w-4 animate-spin" />
                      <span>Analyzing your meetings...</span>
                    </div>
                  </div>
                </div>
              )}

              <div ref={messagesEndRef} />
            </div>
          )}
        </div>

        {/* Input Area */}
        <div className="border-t border-white/10 p-4 bg-slate-900/50">
          <div className="max-w-4xl mx-auto">
            <div className="relative">
              <Textarea
                ref={textareaRef}
                value={input}
                onChange={(e) => setInput(e.target.value)}
                onKeyDown={handleKeyDown}
                placeholder="Ask anything about your meetings..."
                className="min-h-[56px] max-h-[200px] resize-none pr-14 bg-slate-800/80 border-white/10 text-white placeholder:text-slate-500 focus:border-purple-500/50 focus:ring-purple-500/20 rounded-xl"
                disabled={isLoading}
              />
              <Button
                onClick={() => sendMessage()}
                disabled={!input.trim() || isLoading}
                className="absolute right-2 bottom-2 h-10 w-10 p-0 bg-purple-600 hover:bg-purple-700 disabled:bg-slate-700 disabled:text-slate-500 rounded-lg"
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
    </div>
  );
}
