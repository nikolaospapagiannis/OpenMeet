'use client';

import { useState, useRef, useEffect, useCallback } from 'react';
import {
  Bold,
  Italic,
  Underline,
  List,
  ListOrdered,
  Link2,
  Code,
  Heading1,
  Heading2,
  Quote,
  Minus,
  Plus,
  Hash,
  Undo,
  Redo,
  Type,
  AlignLeft,
  AlignCenter,
  AlignRight
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { CardGlass, CardGlassContent, CardGlassHeader, CardGlassTitle } from '@/components/ui/card-glass';

interface TemplateEditorProps {
  content: string;
  onChange: (content: string) => void;
  placeholder?: string;
  height?: string;
  onVariableInsert?: (variable: string) => void;
  readOnly?: boolean;
}

interface EditorCommand {
  icon: React.ElementType;
  command: string;
  arg?: string;
  tooltip: string;
  isActive?: () => boolean;
}

export default function TemplateEditor({
  content,
  onChange,
  placeholder = 'Start typing your template content...',
  height = '400px',
  onVariableInsert,
  readOnly = false
}: TemplateEditorProps) {
  const editorRef = useRef<HTMLDivElement>(null);
  const [selection, setSelection] = useState<Range | null>(null);
  const [history, setHistory] = useState<string[]>([content]);
  const [historyIndex, setHistoryIndex] = useState(0);
  const [activeFormats, setActiveFormats] = useState<Set<string>>(new Set());

  // Toolbar commands
  const formattingCommands: EditorCommand[] = [
    {
      icon: Bold,
      command: 'bold',
      tooltip: 'Bold (Ctrl+B)',
      isActive: () => document.queryCommandState('bold')
    },
    {
      icon: Italic,
      command: 'italic',
      tooltip: 'Italic (Ctrl+I)',
      isActive: () => document.queryCommandState('italic')
    },
    {
      icon: Underline,
      command: 'underline',
      tooltip: 'Underline (Ctrl+U)',
      isActive: () => document.queryCommandState('underline')
    }
  ];

  const headingCommands: EditorCommand[] = [
    {
      icon: Heading1,
      command: 'formatBlock',
      arg: 'H1',
      tooltip: 'Heading 1'
    },
    {
      icon: Heading2,
      command: 'formatBlock',
      arg: 'H2',
      tooltip: 'Heading 2'
    },
    {
      icon: Type,
      command: 'formatBlock',
      arg: 'P',
      tooltip: 'Paragraph'
    }
  ];

  const listCommands: EditorCommand[] = [
    {
      icon: List,
      command: 'insertUnorderedList',
      tooltip: 'Bullet List',
      isActive: () => document.queryCommandState('insertUnorderedList')
    },
    {
      icon: ListOrdered,
      command: 'insertOrderedList',
      tooltip: 'Numbered List',
      isActive: () => document.queryCommandState('insertOrderedList')
    },
    {
      icon: Quote,
      command: 'formatBlock',
      arg: 'BLOCKQUOTE',
      tooltip: 'Quote'
    }
  ];

  const alignmentCommands: EditorCommand[] = [
    {
      icon: AlignLeft,
      command: 'justifyLeft',
      tooltip: 'Align Left',
      isActive: () => document.queryCommandState('justifyLeft')
    },
    {
      icon: AlignCenter,
      command: 'justifyCenter',
      tooltip: 'Align Center',
      isActive: () => document.queryCommandState('justifyCenter')
    },
    {
      icon: AlignRight,
      command: 'justifyRight',
      tooltip: 'Align Right',
      isActive: () => document.queryCommandState('justifyRight')
    }
  ];

  const historyCommands: EditorCommand[] = [
    {
      icon: Undo,
      command: 'undo',
      tooltip: 'Undo (Ctrl+Z)'
    },
    {
      icon: Redo,
      command: 'redo',
      tooltip: 'Redo (Ctrl+Y)'
    }
  ];

  // Initialize content
  useEffect(() => {
    if (editorRef.current && content !== editorRef.current.innerHTML) {
      editorRef.current.innerHTML = content;
    }
  }, [content]);

  // Save selection before toolbar click
  const saveSelection = () => {
    const sel = window.getSelection();
    if (sel && sel.rangeCount > 0) {
      setSelection(sel.getRangeAt(0));
    }
  };

  // Restore selection after toolbar click
  const restoreSelection = () => {
    if (selection) {
      const sel = window.getSelection();
      sel?.removeAllRanges();
      sel?.addRange(selection);
    }
  };

  // Execute command
  const executeCommand = (command: string, arg?: string) => {
    if (readOnly) return;

    restoreSelection();

    if (command === 'undo') {
      if (historyIndex > 0) {
        const newIndex = historyIndex - 1;
        setHistoryIndex(newIndex);
        if (editorRef.current) {
          editorRef.current.innerHTML = history[newIndex];
        }
      }
      return;
    }

    if (command === 'redo') {
      if (historyIndex < history.length - 1) {
        const newIndex = historyIndex + 1;
        setHistoryIndex(newIndex);
        if (editorRef.current) {
          editorRef.current.innerHTML = history[newIndex];
        }
      }
      return;
    }

    document.execCommand(command, false, arg);
    handleContentChange();
    updateActiveFormats();
  };

  // Insert variable at cursor
  const insertVariable = (variable: string) => {
    if (readOnly) return;

    restoreSelection();

    // Insert variable at cursor position
    const sel = window.getSelection();
    if (sel && sel.rangeCount > 0) {
      const range = sel.getRangeAt(0);
      range.deleteContents();

      // Create a span for the variable with special styling
      const span = document.createElement('span');
      span.className = 'template-variable';
      span.contentEditable = 'false';
      span.style.backgroundColor = 'rgba(147, 51, 234, 0.1)';
      span.style.color = '#9333ea';
      span.style.padding = '2px 4px';
      span.style.borderRadius = '4px';
      span.style.fontFamily = 'monospace';
      span.style.fontSize = '0.9em';
      span.textContent = variable;

      range.insertNode(span);

      // Move cursor after the inserted variable
      range.setStartAfter(span);
      range.setEndAfter(span);
      sel.removeAllRanges();
      sel.addRange(range);
    }

    handleContentChange();
    onVariableInsert?.(variable);
  };

  // Handle content changes
  const handleContentChange = useCallback(() => {
    if (!editorRef.current) return;

    const newContent = editorRef.current.innerHTML;
    onChange(newContent);

    // Update history for undo/redo
    const newHistory = [...history.slice(0, historyIndex + 1), newContent];
    setHistory(newHistory);
    setHistoryIndex(newHistory.length - 1);
  }, [onChange, history, historyIndex]);

  // Update active format states
  const updateActiveFormats = () => {
    const formats = new Set<string>();
    formattingCommands.forEach(cmd => {
      if (cmd.isActive && cmd.isActive()) {
        formats.add(cmd.command);
      }
    });
    listCommands.forEach(cmd => {
      if (cmd.isActive && cmd.isActive()) {
        formats.add(cmd.command);
      }
    });
    alignmentCommands.forEach(cmd => {
      if (cmd.isActive && cmd.isActive()) {
        formats.add(cmd.command);
      }
    });
    setActiveFormats(formats);
  };

  // Handle keyboard shortcuts
  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (readOnly) return;

    // Cmd/Ctrl + B (Bold)
    if ((e.metaKey || e.ctrlKey) && e.key === 'b') {
      e.preventDefault();
      executeCommand('bold');
    }
    // Cmd/Ctrl + I (Italic)
    else if ((e.metaKey || e.ctrlKey) && e.key === 'i') {
      e.preventDefault();
      executeCommand('italic');
    }
    // Cmd/Ctrl + U (Underline)
    else if ((e.metaKey || e.ctrlKey) && e.key === 'u') {
      e.preventDefault();
      executeCommand('underline');
    }
    // Cmd/Ctrl + Z (Undo)
    else if ((e.metaKey || e.ctrlKey) && e.key === 'z' && !e.shiftKey) {
      e.preventDefault();
      executeCommand('undo');
    }
    // Cmd/Ctrl + Shift + Z or Cmd/Ctrl + Y (Redo)
    else if (((e.metaKey || e.ctrlKey) && e.key === 'z' && e.shiftKey) ||
             ((e.metaKey || e.ctrlKey) && e.key === 'y')) {
      e.preventDefault();
      executeCommand('redo');
    }
  };

  // Insert link
  const insertLink = () => {
    if (readOnly) return;

    const url = prompt('Enter URL:');
    if (url) {
      restoreSelection();
      executeCommand('createLink', url);
    }
  };

  // Insert code block
  const insertCode = () => {
    if (readOnly) return;

    restoreSelection();
    const sel = window.getSelection();
    if (sel && sel.rangeCount > 0) {
      const range = sel.getRangeAt(0);
      const selectedText = range.toString();

      const code = document.createElement('code');
      code.style.backgroundColor = 'rgba(0, 0, 0, 0.1)';
      code.style.padding = '2px 4px';
      code.style.borderRadius = '4px';
      code.style.fontFamily = 'monospace';
      code.textContent = selectedText || 'code';

      range.deleteContents();
      range.insertNode(code);

      handleContentChange();
    }
  };

  return (
    <CardGlass>
      <CardGlassHeader>
        <CardGlassTitle className="flex items-center gap-2">
          <Hash className="w-5 h-5" />
          Rich Text Editor
        </CardGlassTitle>
      </CardGlassHeader>
      <CardGlassContent className="p-0">
        {/* Toolbar */}
        {!readOnly && (
          <div className="border-b border-[var(--ff-border)] p-2 flex flex-wrap gap-1">
            {/* History */}
            <div className="flex gap-1 pr-2 border-r border-[var(--ff-border)]">
              {historyCommands.map((cmd) => (
                <Button
                  key={cmd.command}
                  variant="ghost"
                  size="sm"
                  onClick={() => executeCommand(cmd.command, cmd.arg)}
                  onMouseDown={saveSelection}
                  title={cmd.tooltip}
                  className="p-1 h-8 w-8"
                  disabled={
                    cmd.command === 'undo' ? historyIndex === 0 :
                    cmd.command === 'redo' ? historyIndex === history.length - 1 :
                    false
                  }
                >
                  <cmd.icon className="w-4 h-4" />
                </Button>
              ))}
            </div>

            {/* Formatting */}
            <div className="flex gap-1 pr-2 border-r border-[var(--ff-border)]">
              {formattingCommands.map((cmd) => (
                <Button
                  key={cmd.command}
                  variant={activeFormats.has(cmd.command) ? 'default' : 'ghost'}
                  size="sm"
                  onClick={() => executeCommand(cmd.command, cmd.arg)}
                  onMouseDown={saveSelection}
                  title={cmd.tooltip}
                  className={`p-1 h-8 w-8 ${
                    activeFormats.has(cmd.command)
                      ? 'bg-[var(--ff-purple-500)] text-white'
                      : ''
                  }`}
                >
                  <cmd.icon className="w-4 h-4" />
                </Button>
              ))}
            </div>

            {/* Headings */}
            <div className="flex gap-1 pr-2 border-r border-[var(--ff-border)]">
              {headingCommands.map((cmd) => (
                <Button
                  key={cmd.arg}
                  variant="ghost"
                  size="sm"
                  onClick={() => executeCommand(cmd.command, cmd.arg)}
                  onMouseDown={saveSelection}
                  title={cmd.tooltip}
                  className="p-1 h-8 w-8"
                >
                  <cmd.icon className="w-4 h-4" />
                </Button>
              ))}
            </div>

            {/* Lists */}
            <div className="flex gap-1 pr-2 border-r border-[var(--ff-border)]">
              {listCommands.map((cmd) => (
                <Button
                  key={cmd.command + (cmd.arg || '')}
                  variant={activeFormats.has(cmd.command) ? 'default' : 'ghost'}
                  size="sm"
                  onClick={() => executeCommand(cmd.command, cmd.arg)}
                  onMouseDown={saveSelection}
                  title={cmd.tooltip}
                  className={`p-1 h-8 w-8 ${
                    activeFormats.has(cmd.command)
                      ? 'bg-[var(--ff-purple-500)] text-white'
                      : ''
                  }`}
                >
                  <cmd.icon className="w-4 h-4" />
                </Button>
              ))}
            </div>

            {/* Alignment */}
            <div className="flex gap-1 pr-2 border-r border-[var(--ff-border)]">
              {alignmentCommands.map((cmd) => (
                <Button
                  key={cmd.command}
                  variant={activeFormats.has(cmd.command) ? 'default' : 'ghost'}
                  size="sm"
                  onClick={() => executeCommand(cmd.command, cmd.arg)}
                  onMouseDown={saveSelection}
                  title={cmd.tooltip}
                  className={`p-1 h-8 w-8 ${
                    activeFormats.has(cmd.command)
                      ? 'bg-[var(--ff-purple-500)] text-white'
                      : ''
                  }`}
                >
                  <cmd.icon className="w-4 h-4" />
                </Button>
              ))}
            </div>

            {/* Special */}
            <div className="flex gap-1">
              <Button
                variant="ghost"
                size="sm"
                onClick={insertLink}
                onMouseDown={saveSelection}
                title="Insert Link"
                className="p-1 h-8 w-8"
              >
                <Link2 className="w-4 h-4" />
              </Button>
              <Button
                variant="ghost"
                size="sm"
                onClick={insertCode}
                onMouseDown={saveSelection}
                title="Insert Code"
                className="p-1 h-8 w-8"
              >
                <Code className="w-4 h-4" />
              </Button>
            </div>
          </div>
        )}

        {/* Editor */}
        <div
          ref={editorRef}
          contentEditable={!readOnly}
          className={`p-4 min-h-[${height}] focus:outline-none ${
            readOnly ? 'cursor-default' : 'cursor-text'
          }`}
          style={{
            minHeight: height,
            backgroundColor: 'var(--ff-bg-layer)',
            color: 'var(--ff-text-primary)',
            fontSize: '14px',
            lineHeight: '1.6'
          }}
          onInput={handleContentChange}
          onKeyDown={handleKeyDown}
          onMouseUp={updateActiveFormats}
          onKeyUp={updateActiveFormats}
          suppressContentEditableWarning={true}
          data-placeholder={placeholder}
        />

        {/* Styles */}
        <style jsx global>{`
          .template-variable {
            user-select: none;
            cursor: default;
          }

          [contenteditable]:empty:before {
            content: attr(data-placeholder);
            color: var(--ff-text-muted);
            pointer-events: none;
          }

          [contenteditable] h1 {
            font-size: 2em;
            font-weight: bold;
            margin: 0.67em 0;
          }

          [contenteditable] h2 {
            font-size: 1.5em;
            font-weight: bold;
            margin: 0.83em 0;
          }

          [contenteditable] blockquote {
            border-left: 4px solid var(--ff-purple-500);
            padding-left: 1em;
            margin: 1em 0;
            color: var(--ff-text-secondary);
          }

          [contenteditable] code {
            background-color: rgba(0, 0, 0, 0.1);
            padding: 2px 4px;
            border-radius: 4px;
            font-family: monospace;
            font-size: 0.9em;
          }

          [contenteditable] a {
            color: var(--ff-purple-500);
            text-decoration: underline;
          }

          [contenteditable] ul,
          [contenteditable] ol {
            padding-left: 2em;
            margin: 1em 0;
          }

          [contenteditable] li {
            margin: 0.5em 0;
          }
        `}</style>
      </CardGlassContent>
    </CardGlass>
  );
}