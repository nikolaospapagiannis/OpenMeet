/**
 * ChatMessage Component - Individual message display with markdown support
 *
 * Features:
 * - Markdown rendering for rich text responses
 * - Citation links to meeting timestamps
 * - Copy functionality
 * - Loading states
 * - User/Assistant styling
 */

'use client';

import React, { useState } from 'react';
import {
  Bot,
  User,
  Copy,
  Check,
  ExternalLink,
  Calendar,
  FileText,
  RefreshCw,
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Message } from '@/hooks/useAIChat';

interface ChatMessageProps {
  message: Message;
  isStreaming?: boolean;
  onCopy?: (content: string) => Promise<void>;
  onRegenerate?: () => Promise<void>;
  showRegenerate?: boolean;
}

export function ChatMessage({
  message,
  isStreaming = false,
  onCopy,
  onRegenerate,
  showRegenerate = false,
}: ChatMessageProps) {
  const [isCopied, setIsCopied] = useState(false);
  const isUser = message.role === 'user';

  const handleCopy = async () => {
    if (onCopy) {
      await onCopy(message.content);
      setIsCopied(true);
      setTimeout(() => setIsCopied(false), 2000);
    }
  };

  const formatDate = (dateString: string) => {
    const date = new Date(dateString);
    return date.toLocaleString('en-US', {
      month: 'short',
      day: 'numeric',
      hour: '2-digit',
      minute: '2-digit',
    });
  };

  const renderMarkdown = (content: string) => {
    // Simple markdown rendering without external library
    // Supports: **bold**, *italic*, `code`, [links](url), lists
    const lines = content.split('\n');
    const elements: React.ReactNode[] = [];

    let inCodeBlock = false;
    let codeBlockContent: string[] = [];

    lines.forEach((line, idx) => {
      // Code blocks
      if (line.startsWith('```')) {
        if (inCodeBlock) {
          elements.push(
            <pre key={`code-${idx}`} className="bg-slate-900 rounded-lg p-3 my-2 overflow-x-auto">
              <code className="text-sm text-slate-300">{codeBlockContent.join('\n')}</code>
            </pre>
          );
          codeBlockContent = [];
        }
        inCodeBlock = !inCodeBlock;
        return;
      }

      if (inCodeBlock) {
        codeBlockContent.push(line);
        return;
      }

      // Lists
      if (line.match(/^[-*]\s/)) {
        elements.push(
          <li key={idx} className="ml-4 mb-1">
            {formatInline(line.replace(/^[-*]\s/, ''))}
          </li>
        );
        return;
      }

      // Numbered lists
      if (line.match(/^\d+\.\s/)) {
        elements.push(
          <li key={idx} className="ml-4 mb-1 list-decimal">
            {formatInline(line.replace(/^\d+\.\s/, ''))}
          </li>
        );
        return;
      }

      // Headers
      if (line.startsWith('### ')) {
        elements.push(
          <h3 key={idx} className="text-lg font-semibold mt-3 mb-2">
            {formatInline(line.replace('### ', ''))}
          </h3>
        );
        return;
      }

      if (line.startsWith('## ')) {
        elements.push(
          <h2 key={idx} className="text-xl font-semibold mt-4 mb-2">
            {formatInline(line.replace('## ', ''))}
          </h2>
        );
        return;
      }

      // Regular paragraphs
      if (line.trim()) {
        elements.push(
          <p key={idx} className="mb-2">
            {formatInline(line)}
          </p>
        );
      } else {
        elements.push(<br key={idx} />);
      }
    });

    return elements;
  };

  const formatInline = (text: string): React.ReactNode => {
    // Split by code spans first
    const parts = text.split(/(`[^`]+`)/g);

    return parts.map((part, idx) => {
      // Code spans
      if (part.startsWith('`') && part.endsWith('`')) {
        return (
          <code key={idx} className="bg-slate-800 px-1.5 py-0.5 rounded text-sm">
            {part.slice(1, -1)}
          </code>
        );
      }

      // Bold
      let content: React.ReactNode = part;
      content = formatBold(content as string);
      content = formatItalic(content as string);
      content = formatLinks(content as string);

      return <React.Fragment key={idx}>{content}</React.Fragment>;
    });
  };

  const formatBold = (text: string): React.ReactNode => {
    const parts = text.split(/(\*\*[^*]+\*\*)/g);
    return parts.map((part, idx) => {
      if (part.startsWith('**') && part.endsWith('**')) {
        return <strong key={idx}>{part.slice(2, -2)}</strong>;
      }
      return part;
    });
  };

  const formatItalic = (text: string): React.ReactNode => {
    if (typeof text !== 'string') return text;
    const parts = text.split(/(\*[^*]+\*)/g);
    return parts.map((part, idx) => {
      if (part.startsWith('*') && part.endsWith('*') && !part.startsWith('**')) {
        return <em key={idx}>{part.slice(1, -1)}</em>;
      }
      return part;
    });
  };

  const formatLinks = (text: string): React.ReactNode => {
    if (typeof text !== 'string') return text;
    const linkRegex = /\[([^\]]+)\]\(([^)]+)\)/g;
    const parts: React.ReactNode[] = [];
    let lastIndex = 0;
    let match;

    while ((match = linkRegex.exec(text)) !== null) {
      if (match.index > lastIndex) {
        parts.push(text.substring(lastIndex, match.index));
      }
      parts.push(
        <a
          key={match.index}
          href={match[2]}
          target="_blank"
          rel="noopener noreferrer"
          className="text-purple-400 hover:text-purple-300 underline"
        >
          {match[1]}
        </a>
      );
      lastIndex = match.index + match[0].length;
    }

    if (lastIndex < text.length) {
      parts.push(text.substring(lastIndex));
    }

    return parts.length > 0 ? parts : text;
  };

  return (
    <div className={`flex gap-4 ${isUser ? 'justify-end' : 'justify-start'}`}>
      {!isUser && (
        <div className="w-8 h-8 bg-gradient-to-br from-purple-600 to-blue-600 rounded-lg flex items-center justify-center flex-shrink-0 shadow-lg">
          <Bot className="h-4 w-4 text-white" />
        </div>
      )}

      <div className={`max-w-[80%] ${isUser ? 'order-first' : ''}`}>
        <div
          className={`rounded-2xl px-4 py-3 ${
            isUser
              ? 'bg-purple-600 text-white'
              : 'bg-slate-800/80 text-slate-200 border border-white/10'
          }`}
        >
          {isUser ? (
            <p className="whitespace-pre-wrap">{message.content}</p>
          ) : (
            <div className="prose prose-invert prose-sm max-w-none">
              {renderMarkdown(message.content)}
              {isStreaming && (
                <span className="inline-block w-2 h-4 bg-purple-400 animate-pulse ml-1" />
              )}
            </div>
          )}
        </div>

        {/* Sources/Citations */}
        {message.sources && message.sources.length > 0 && (
          <div className="mt-3 space-y-2">
            <p className="text-xs text-slate-500 flex items-center gap-1">
              <FileText className="h-3 w-3" />
              Sources ({message.sources.length})
            </p>
            <div className="flex flex-wrap gap-2">
              {message.sources.map((source, i) => (
                <a
                  key={i}
                  href={`/meetings/${source.meetingId}`}
                  className="inline-flex items-center gap-1.5 px-3 py-1.5 bg-slate-800/60 hover:bg-slate-700/60 rounded-lg text-xs text-slate-300 hover:text-white transition-colors border border-white/5 group"
                  title={source.relevantContent}
                >
                  <Calendar className="h-3 w-3" />
                  <span className="font-medium">{source.meetingTitle}</span>
                  <span className="text-slate-500">
                    {new Date(source.meetingDate).toLocaleDateString()}
                  </span>
                  <ExternalLink className="h-3 w-3 ml-1 opacity-0 group-hover:opacity-100 transition-opacity" />
                </a>
              ))}
            </div>
          </div>
        )}

        {/* Confidence Score */}
        {message.confidence !== undefined && message.confidence < 0.7 && (
          <div className="mt-2 text-xs text-slate-500 italic">
            Note: This response may be less confident. Please verify from sources.
          </div>
        )}

        {/* Message Actions */}
        <div className="flex items-center gap-2 mt-2">
          <span className="text-xs text-slate-600">{formatDate(message.timestamp)}</span>

          {!isUser && (
            <div className="flex items-center gap-1 ml-auto">
              {onCopy && (
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={handleCopy}
                  className="h-6 px-2 text-slate-500 hover:text-slate-300"
                >
                  {isCopied ? (
                    <>
                      <Check className="h-3 w-3 mr-1" />
                      <span className="text-xs">Copied</span>
                    </>
                  ) : (
                    <>
                      <Copy className="h-3 w-3 mr-1" />
                      <span className="text-xs">Copy</span>
                    </>
                  )}
                </Button>
              )}

              {showRegenerate && onRegenerate && (
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={onRegenerate}
                  className="h-6 px-2 text-slate-500 hover:text-slate-300"
                >
                  <RefreshCw className="h-3 w-3 mr-1" />
                  <span className="text-xs">Regenerate</span>
                </Button>
              )}
            </div>
          )}
        </div>
      </div>

      {isUser && (
        <div className="w-8 h-8 bg-slate-700 rounded-lg flex items-center justify-center flex-shrink-0">
          <User className="h-4 w-4 text-slate-300" />
        </div>
      )}
    </div>
  );
}
