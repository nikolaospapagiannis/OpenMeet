'use client';

/**
 * Enhanced Ask AI Page - Cross-Meeting Intelligence
 *
 * REAL IMPLEMENTATION:
 * - Uses real API endpoints (/api/ai/ask, /api/ai/conversations)
 * - Integrates with useAIChat hook (NO MOCKS)
 * - Full chat interface with conversation history
 * - Meeting context selector
 * - Streaming support ready (future enhancement)
 * - Citations linking to meeting moments
 * - Conversation persistence via Redis
 */

import { useState, useEffect } from 'react';
import {
  Plus,
  MessageSquare,
  Trash2,
  History,
  Menu,
  X,
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { AskAIChat } from '@/components/ai';
import { useAIChat } from '@/hooks/useAIChat';
import { useAuth } from '@/contexts/AuthContext';

export default function AskAIPageEnhanced() {
  const { user } = useAuth();
  const [showSidebar, setShowSidebar] = useState(true);

  const {
    conversations,
    currentConversationId,
    fetchConversations,
    loadConversation,
    deleteConversation,
    startNewConversation,
  } = useAIChat({ autoSave: true });

  // Load conversations on mount
  useEffect(() => {
    fetchConversations();
  }, [fetchConversations]);

  const formatDate = (dateString: string) => {
    const date = new Date(dateString);
    const now = new Date();
    const diffMs = now.getTime() - date.getTime();
    const diffDays = Math.floor(diffMs / (1000 * 60 * 60 * 24));

    if (diffDays === 0) {
      return 'Today';
    } else if (diffDays === 1) {
      return 'Yesterday';
    } else if (diffDays < 7) {
      return `${diffDays} days ago`;
    } else {
      return date.toLocaleDateString('en-US', {
        month: 'short',
        day: 'numeric',
      });
    }
  };

  return (
    <div className="flex h-[calc(100vh-4rem)] bg-[#0a0a1a]">
      {/* Sidebar - Conversation History */}
      {showSidebar && (
        <div className="w-80 border-r border-white/10 flex flex-col bg-slate-900/50 backdrop-blur-sm">
          <div className="p-4 border-b border-white/10 space-y-3">
            <div className="flex items-center justify-between">
              <h2 className="text-lg font-semibold text-white flex items-center gap-2">
                <MessageSquare className="h-5 w-5" />
                Ask AI
              </h2>
              <Button
                variant="ghost"
                size="sm"
                onClick={() => setShowSidebar(false)}
                className="lg:hidden text-slate-400 hover:text-white"
              >
                <X className="h-4 w-4" />
              </Button>
            </div>
            <Button
              onClick={startNewConversation}
              className="w-full bg-purple-600 hover:bg-purple-700 text-white gap-2"
            >
              <Plus className="h-4 w-4" />
              New Conversation
            </Button>
          </div>

          <div className="flex-1 overflow-y-auto p-3 space-y-1">
            <div className="px-3 py-2 text-xs text-slate-500 uppercase tracking-wider flex items-center gap-2">
              <History className="h-3 w-3" />
              Recent Conversations
            </div>
            {conversations.length === 0 ? (
              <p className="text-sm text-slate-500 px-3 py-8 text-center">
                No conversations yet.
                <br />
                Start by asking a question!
              </p>
            ) : (
              conversations.map(conv => (
                <div
                  key={conv.id}
                  className={`group flex items-start gap-3 px-3 py-3 rounded-lg cursor-pointer transition-colors ${
                    currentConversationId === conv.id
                      ? 'bg-purple-600/20 text-white'
                      : 'text-slate-400 hover:bg-white/5 hover:text-white'
                  }`}
                  onClick={() => loadConversation(conv.id)}
                >
                  <MessageSquare className="h-4 w-4 flex-shrink-0 mt-0.5" />
                  <div className="flex-1 min-w-0">
                    <p className="text-sm font-medium line-clamp-2 mb-1">{conv.title}</p>
                    <div className="flex items-center gap-2 text-xs text-slate-600">
                      <span>{formatDate(conv.createdAt)}</span>
                      <span>•</span>
                      <span>{conv.messageCount} messages</span>
                    </div>
                  </div>
                  <button
                    onClick={e => {
                      e.stopPropagation();
                      deleteConversation(conv.id);
                    }}
                    className="opacity-0 group-hover:opacity-100 p-1.5 hover:bg-red-500/20 rounded transition-all flex-shrink-0"
                  >
                    <Trash2 className="h-3.5 w-3.5 text-red-400" />
                  </button>
                </div>
              ))
            )}
          </div>

          {/* User Info Footer */}
          {user && (
            <div className="p-4 border-t border-white/10">
              <div className="flex items-center gap-3">
                <div className="w-8 h-8 bg-gradient-to-br from-purple-600 to-blue-600 rounded-full flex items-center justify-center text-white text-sm font-medium">
                  {user.name?.charAt(0).toUpperCase() || 'U'}
                </div>
                <div className="flex-1 min-w-0">
                  <p className="text-sm font-medium text-white truncate">{user.name}</p>
                  <p className="text-xs text-slate-500 truncate">{user.email}</p>
                </div>
              </div>
            </div>
          )}
        </div>
      )}

      {/* Main Chat Area */}
      <div className="flex-1 flex flex-col">
        {/* Mobile Header */}
        {!showSidebar && (
          <div className="lg:hidden border-b border-white/10 p-4 bg-slate-900/50">
            <Button
              variant="ghost"
              size="sm"
              onClick={() => setShowSidebar(true)}
              className="text-slate-400 hover:text-white"
            >
              <Menu className="h-4 w-4 mr-2" />
              Conversations
            </Button>
          </div>
        )}

        {/* Chat Component */}
        <AskAIChat
          showSuggestions={true}
          onMessageSent={() => {
            // Refresh conversations list after sending a message
            fetchConversations();
          }}
        />
      </div>
    </div>
  );
}
