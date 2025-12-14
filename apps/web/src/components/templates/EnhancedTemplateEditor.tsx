'use client';

import { useState, useRef, useEffect, useCallback, useMemo } from 'react';
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
  Heading3,
  Quote,
  Hash,
  Undo,
  Redo,
  Type,
  AlignLeft,
  AlignCenter,
  AlignRight,
  AlignJustify,
  Table,
  Image,
  Highlighter,
  Strikethrough,
  Subscript,
  Superscript,
  IndentIncrease,
  IndentDecrease,
  FileText,
  Variable,
  Palette,
  Save,
  Download,
  Upload,
  Eye,
  EyeOff,
  Maximize2,
  Minimize2,
  CheckSquare,
  Link,
  Unlink,
  RemoveFormatting,
  Copy,
  Scissors,
  Clipboard
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { CardGlass, CardGlassContent, CardGlassHeader, CardGlassTitle } from '@/components/ui/card-glass';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';
import { Slider } from '@/components/ui/slider';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Badge } from '@/components/ui/badge';
import { Separator } from '@/components/ui/separator';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { cn } from '@/lib/utils';
import EnhancedVariableInserter from './EnhancedVariableInserter';

interface EnhancedTemplateEditorProps {
  content: string;
  onChange: (content: string) => void;
  placeholder?: string;
  height?: string;
  onVariableInsert?: (variable: string) => void;
  readOnly?: boolean;
  showVariables?: boolean;
  usedVariables?: string[];
  showWordCount?: boolean;
  autoSave?: boolean;
  autoSaveInterval?: number;
  onAutoSave?: () => void;
  maxLength?: number;
  showToolbar?: boolean;
  toolbarPosition?: 'top' | 'bottom' | 'floating';
  enableCollaboration?: boolean;
  collaborators?: Array<{
    id: string;
    name: string;
    avatar: string;
    color: string;
    cursor?: { x: number; y: number };
  }>;
  onCursorMove?: (position: { x: number; y: number }) => void;
}

interface EditorCommand {
  icon: React.ElementType;
  command: string;
  arg?: string;
  tooltip: string;
  isActive?: () => boolean;
  handler?: () => void;
  group?: string;
}

interface TextStatistics {
  words: number;
  characters: number;
  charactersNoSpaces: number;
  sentences: number;
  paragraphs: number;
  readingTime: number;
}

export default function EnhancedTemplateEditor({
  content,
  onChange,
  placeholder = 'Start typing your template content...',
  height = '500px',
  onVariableInsert,
  readOnly = false,
  showVariables = true,
  usedVariables = [],
  showWordCount = true,
  autoSave = false,
  autoSaveInterval = 30000,
  onAutoSave,
  maxLength,
  showToolbar = true,
  toolbarPosition = 'top',
  enableCollaboration = false,
  collaborators = [],
  onCursorMove
}: EnhancedTemplateEditorProps) {
  const editorRef = useRef<HTMLDivElement>(null);
  const [selection, setSelection] = useState<Range | null>(null);
  const [history, setHistory] = useState<string[]>([content]);
  const [historyIndex, setHistoryIndex] = useState(0);
  const [activeFormats, setActiveFormats] = useState<Set<string>>(new Set());
  const [showVariablePanel, setShowVariablePanel] = useState(false);
  const [showPreview, setShowPreview] = useState(false);
  const [isFullscreen, setIsFullscreen] = useState(false);
  const [fontSize, setFontSize] = useState(14);
  const [lineHeight, setLineHeight] = useState(1.6);
  const [textStats, setTextStats] = useState<TextStatistics>({
    words: 0,
    characters: 0,
    charactersNoSpaces: 0,
    sentences: 0,
    paragraphs: 0,
    readingTime: 0
  });
  const [lastSaved, setLastSaved] = useState<Date | null>(null);
  const [unsavedChanges, setUnsavedChanges] = useState(false);
  const [selectedText, setSelectedText] = useState('');
  const [showColorPicker, setShowColorPicker] = useState(false);
  const [textColor, setTextColor] = useState('#000000');
  const [backgroundColor, setBackgroundColor] = useState('#ffffff');

  // Enhanced toolbar commands
  const formattingCommands: EditorCommand[] = [
    {
      icon: Bold,
      command: 'bold',
      tooltip: 'Bold (Ctrl+B)',
      isActive: () => document.queryCommandState('bold'),
      group: 'format'
    },
    {
      icon: Italic,
      command: 'italic',
      tooltip: 'Italic (Ctrl+I)',
      isActive: () => document.queryCommandState('italic'),
      group: 'format'
    },
    {
      icon: Underline,
      command: 'underline',
      tooltip: 'Underline (Ctrl+U)',
      isActive: () => document.queryCommandState('underline'),
      group: 'format'
    },
    {
      icon: Strikethrough,
      command: 'strikeThrough',
      tooltip: 'Strikethrough',
      isActive: () => document.queryCommandState('strikeThrough'),
      group: 'format'
    },
    {
      icon: Highlighter,
      command: 'hiliteColor',
      arg: 'yellow',
      tooltip: 'Highlight',
      isActive: () => document.queryCommandState('hiliteColor'),
      group: 'format'
    },
    {
      icon: Subscript,
      command: 'subscript',
      tooltip: 'Subscript',
      isActive: () => document.queryCommandState('subscript'),
      group: 'format'
    },
    {
      icon: Superscript,
      command: 'superscript',
      tooltip: 'Superscript',
      isActive: () => document.queryCommandState('superscript'),
      group: 'format'
    }
  ];

  const headingCommands: EditorCommand[] = [
    {
      icon: Heading1,
      command: 'formatBlock',
      arg: 'H1',
      tooltip: 'Heading 1',
      group: 'heading'
    },
    {
      icon: Heading2,
      command: 'formatBlock',
      arg: 'H2',
      tooltip: 'Heading 2',
      group: 'heading'
    },
    {
      icon: Heading3,
      command: 'formatBlock',
      arg: 'H3',
      tooltip: 'Heading 3',
      group: 'heading'
    },
    {
      icon: Type,
      command: 'formatBlock',
      arg: 'P',
      tooltip: 'Paragraph',
      group: 'heading'
    }
  ];

  const listCommands: EditorCommand[] = [
    {
      icon: List,
      command: 'insertUnorderedList',
      tooltip: 'Bullet List',
      isActive: () => document.queryCommandState('insertUnorderedList'),
      group: 'list'
    },
    {
      icon: ListOrdered,
      command: 'insertOrderedList',
      tooltip: 'Numbered List',
      isActive: () => document.queryCommandState('insertOrderedList'),
      group: 'list'
    },
    {
      icon: CheckSquare,
      command: 'insertHTML',
      arg: '<input type="checkbox"> ',
      tooltip: 'Checkbox',
      group: 'list'
    },
    {
      icon: Quote,
      command: 'formatBlock',
      arg: 'BLOCKQUOTE',
      tooltip: 'Quote',
      group: 'list'
    }
  ];

  const alignmentCommands: EditorCommand[] = [
    {
      icon: AlignLeft,
      command: 'justifyLeft',
      tooltip: 'Align Left',
      isActive: () => document.queryCommandState('justifyLeft'),
      group: 'align'
    },
    {
      icon: AlignCenter,
      command: 'justifyCenter',
      tooltip: 'Align Center',
      isActive: () => document.queryCommandState('justifyCenter'),
      group: 'align'
    },
    {
      icon: AlignRight,
      command: 'justifyRight',
      tooltip: 'Align Right',
      isActive: () => document.queryCommandState('justifyRight'),
      group: 'align'
    },
    {
      icon: AlignJustify,
      command: 'justifyFull',
      tooltip: 'Justify',
      isActive: () => document.queryCommandState('justifyFull'),
      group: 'align'
    }
  ];

  const indentCommands: EditorCommand[] = [
    {
      icon: IndentDecrease,
      command: 'outdent',
      tooltip: 'Decrease Indent',
      group: 'indent'
    },
    {
      icon: IndentIncrease,
      command: 'indent',
      tooltip: 'Increase Indent',
      group: 'indent'
    }
  ];

  const insertCommands: EditorCommand[] = [
    {
      icon: Link2,
      command: 'createLink',
      tooltip: 'Insert Link',
      handler: insertLink,
      group: 'insert'
    },
    {
      icon: Unlink,
      command: 'unlink',
      tooltip: 'Remove Link',
      group: 'insert'
    },
    {
      icon: Image,
      command: 'insertImage',
      tooltip: 'Insert Image',
      handler: insertImage,
      group: 'insert'
    },
    {
      icon: Table,
      command: 'insertTable',
      tooltip: 'Insert Table',
      handler: insertTable,
      group: 'insert'
    },
    {
      icon: Code,
      command: 'insertCode',
      tooltip: 'Insert Code Block',
      handler: insertCode,
      group: 'insert'
    },
    {
      icon: Variable,
      command: 'insertVariable',
      tooltip: 'Insert Variable',
      handler: () => setShowVariablePanel(!showVariablePanel),
      group: 'insert'
    }
  ];

  const editCommands: EditorCommand[] = [
    {
      icon: Copy,
      command: 'copy',
      tooltip: 'Copy (Ctrl+C)',
      group: 'edit'
    },
    {
      icon: Scissors,
      command: 'cut',
      tooltip: 'Cut (Ctrl+X)',
      group: 'edit'
    },
    {
      icon: Clipboard,
      command: 'paste',
      tooltip: 'Paste (Ctrl+V)',
      group: 'edit'
    },
    {
      icon: RemoveFormatting,
      command: 'removeFormat',
      tooltip: 'Clear Formatting',
      group: 'edit'
    }
  ];

  const historyCommands: EditorCommand[] = [
    {
      icon: Undo,
      command: 'undo',
      tooltip: 'Undo (Ctrl+Z)',
      group: 'history'
    },
    {
      icon: Redo,
      command: 'redo',
      tooltip: 'Redo (Ctrl+Y)',
      group: 'history'
    }
  ];

  // Calculate text statistics
  const calculateTextStats = useCallback((text: string): TextStatistics => {
    const plainText = text.replace(/<[^>]*>/g, '').trim();
    const words = plainText.split(/\\s+/).filter(word => word.length > 0);
    const sentences = plainText.split(/[.!?]+/).filter(s => s.trim().length > 0);
    const paragraphs = plainText.split(/\\n\\n+/).filter(p => p.trim().length > 0);

    return {
      words: words.length,
      characters: plainText.length,
      charactersNoSpaces: plainText.replace(/\\s/g, '').length,
      sentences: sentences.length,
      paragraphs: paragraphs.length,
      readingTime: Math.ceil(words.length / 200) // Average reading speed
    };
  }, []);

  // Initialize content
  useEffect(() => {
    if (editorRef.current && content !== editorRef.current.innerHTML) {
      editorRef.current.innerHTML = content;
      setTextStats(calculateTextStats(content));
    }
  }, [content, calculateTextStats]);

  // Auto-save functionality
  useEffect(() => {
    if (!autoSave || !unsavedChanges) return;

    const timer = setTimeout(() => {
      onAutoSave?.();
      setLastSaved(new Date());
      setUnsavedChanges(false);
    }, autoSaveInterval);

    return () => clearTimeout(timer);
  }, [autoSave, autoSaveInterval, unsavedChanges, onAutoSave]);

  // Save selection before toolbar click
  const saveSelection = () => {
    const sel = window.getSelection();
    if (sel && sel.rangeCount > 0) {
      setSelection(sel.getRangeAt(0));
      setSelectedText(sel.toString());
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
  const executeCommand = (command: string, arg?: string, handler?: () => void) => {
    if (readOnly) return;

    restoreSelection();

    if (handler) {
      handler();
      return;
    }

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

  // Insert link with dialog
  function insertLink() {
    const url = prompt('Enter URL:', 'https://');
    if (url) {
      restoreSelection();
      if (selectedText) {
        document.execCommand('createLink', false, url);
      } else {
        const linkText = prompt('Enter link text:', 'Link');
        if (linkText) {
          document.execCommand('insertHTML', false, `<a href="${url}">${linkText}</a>`);
        }
      }
      handleContentChange();
    }
  }

  // Insert image with dialog
  function insertImage() {
    const url = prompt('Enter image URL:', 'https://');
    if (url) {
      restoreSelection();
      const alt = prompt('Enter alt text:', 'Image');
      document.execCommand('insertHTML', false, `<img src="${url}" alt="${alt}" style="max-width: 100%;" />`);
      handleContentChange();
    }
  }

  // Insert table
  function insertTable() {
    restoreSelection();
    const rows = prompt('Number of rows:', '3');
    const cols = prompt('Number of columns:', '3');

    if (rows && cols) {
      let tableHTML = '<table style="border-collapse: collapse; width: 100%;">';
      for (let i = 0; i < parseInt(rows); i++) {
        tableHTML += '<tr>';
        for (let j = 0; j < parseInt(cols); j++) {
          tableHTML += '<td style="border: 1px solid #ddd; padding: 8px;">Cell</td>';
        }
        tableHTML += '</tr>';
      }
      tableHTML += '</table>';

      document.execCommand('insertHTML', false, tableHTML);
      handleContentChange();
    }
  }

  // Insert code block
  function insertCode() {
    restoreSelection();
    const sel = window.getSelection();
    if (sel && sel.rangeCount > 0) {
      const range = sel.getRangeAt(0);
      const selectedText = range.toString();

      const pre = document.createElement('pre');
      const code = document.createElement('code');
      code.style.backgroundColor = 'rgba(0, 0, 0, 0.05)';
      code.style.padding = '12px';
      code.style.borderRadius = '6px';
      code.style.fontFamily = 'monospace';
      code.style.display = 'block';
      code.style.overflowX = 'auto';
      code.textContent = selectedText || 'Enter code here';
      pre.appendChild(code);

      range.deleteContents();
      range.insertNode(pre);

      handleContentChange();
    }
  }

  // Insert variable at cursor
  const insertVariable = (variable: string) => {
    if (readOnly) return;

    restoreSelection();

    const sel = window.getSelection();
    if (sel && sel.rangeCount > 0) {
      const range = sel.getRangeAt(0);
      range.deleteContents();

      const span = document.createElement('span');
      span.className = 'template-variable';
      span.contentEditable = 'false';
      span.style.backgroundColor = 'rgba(147, 51, 234, 0.1)';
      span.style.color = '#9333ea';
      span.style.padding = '2px 6px';
      span.style.borderRadius = '4px';
      span.style.fontFamily = 'monospace';
      span.style.fontSize = '0.9em';
      span.style.margin = '0 2px';
      span.style.display = 'inline-block';
      span.textContent = variable;

      range.insertNode(span);

      // Add space after variable
      const space = document.createTextNode(' ');
      range.insertNode(space);

      // Move cursor after the inserted variable
      range.setStartAfter(space);
      range.setEndAfter(space);
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
    setUnsavedChanges(true);
    setTextStats(calculateTextStats(newContent));

    // Update history for undo/redo
    const newHistory = [...history.slice(0, historyIndex + 1), newContent];
    setHistory(newHistory);
    setHistoryIndex(newHistory.length - 1);
  }, [onChange, history, historyIndex, calculateTextStats]);

  // Update active format states
  const updateActiveFormats = () => {
    const formats = new Set<string>();
    [...formattingCommands, ...listCommands, ...alignmentCommands].forEach(cmd => {
      if (cmd.isActive && cmd.isActive()) {
        formats.add(cmd.command);
      }
    });
    setActiveFormats(formats);
  };

  // Handle keyboard shortcuts
  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (readOnly) return;

    // Track cursor movement for collaboration
    if (enableCollaboration && onCursorMove) {
      const sel = window.getSelection();
      if (sel && sel.rangeCount > 0) {
        const range = sel.getRangeAt(0);
        const rect = range.getBoundingClientRect();
        onCursorMove({ x: rect.left, y: rect.top });
      }
    }

    // Max length check
    if (maxLength && editorRef.current) {
      const currentLength = editorRef.current.textContent?.length || 0;
      if (currentLength >= maxLength && !['Backspace', 'Delete'].includes(e.key)) {
        e.preventDefault();
        return;
      }
    }

    // Keyboard shortcuts
    if ((e.metaKey || e.ctrlKey) && !e.shiftKey) {
      switch(e.key) {
        case 'b':
          e.preventDefault();
          executeCommand('bold');
          break;
        case 'i':
          e.preventDefault();
          executeCommand('italic');
          break;
        case 'u':
          e.preventDefault();
          executeCommand('underline');
          break;
        case 'z':
          e.preventDefault();
          executeCommand('undo');
          break;
        case 'y':
          e.preventDefault();
          executeCommand('redo');
          break;
        case 's':
          e.preventDefault();
          if (autoSave && onAutoSave) {
            onAutoSave();
            setLastSaved(new Date());
            setUnsavedChanges(false);
          }
          break;
        case 'k':
          e.preventDefault();
          insertLink();
          break;
      }
    } else if ((e.metaKey || e.ctrlKey) && e.shiftKey) {
      if (e.key === 'z') {
        e.preventDefault();
        executeCommand('redo');
      }
    }
  };

  // Export content
  const exportContent = (format: 'html' | 'markdown' | 'text') => {
    if (!editorRef.current) return;

    let exportData = '';
    const filename = `template-${new Date().toISOString()}.${format}`;

    switch(format) {
      case 'html':
        exportData = editorRef.current.innerHTML;
        break;
      case 'markdown':
        // Simple HTML to Markdown conversion (you might want to use a library for this)
        exportData = editorRef.current.innerHTML
          .replace(/<h1[^>]*>(.*?)<\/h1>/gi, '# $1\n')
          .replace(/<h2[^>]*>(.*?)<\/h2>/gi, '## $1\n')
          .replace(/<h3[^>]*>(.*?)<\/h3>/gi, '### $1\n')
          .replace(/<b[^>]*>(.*?)<\/b>/gi, '**$1**')
          .replace(/<strong[^>]*>(.*?)<\/strong>/gi, '**$1**')
          .replace(/<i[^>]*>(.*?)<\/i>/gi, '*$1*')
          .replace(/<em[^>]*>(.*?)<\/em>/gi, '*$1*')
          .replace(/<a[^>]+href="([^"]*)"[^>]*>(.*?)<\/a>/gi, '[$2]($1)')
          .replace(/<br[^>]*>/gi, '\n')
          .replace(/<p[^>]*>(.*?)<\/p>/gi, '$1\n\n')
          .replace(/<[^>]*>/g, '');
        break;
      case 'text':
        exportData = editorRef.current.textContent || '';
        break;
    }

    const blob = new Blob([exportData], { type: 'text/plain' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = filename;
    a.click();
    URL.revokeObjectURL(url);
  };

  // Toolbar component
  const renderToolbar = () => (
    <div className={cn(
      "border-b border-[var(--ff-border)] p-2 flex flex-wrap gap-1 items-center",
      toolbarPosition === 'floating' && "fixed top-20 left-1/2 transform -translate-x-1/2 z-50 bg-[var(--ff-bg-layer)] rounded-lg shadow-lg"
    )}>
      {/* History */}
      <div className="flex gap-1 pr-2 border-r border-[var(--ff-border)]">
        {historyCommands.map((cmd) => (
          <Button
            key={cmd.command}
            variant="ghost"
            size="sm"
            onClick={() => executeCommand(cmd.command, cmd.arg, cmd.handler)}
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
            onClick={() => executeCommand(cmd.command, cmd.arg, cmd.handler)}
            onMouseDown={saveSelection}
            title={cmd.tooltip}
            className={cn(
              "p-1 h-8 w-8",
              activeFormats.has(cmd.command) && "bg-[var(--ff-purple-500)] text-white"
            )}
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
            onClick={() => executeCommand(cmd.command, cmd.arg, cmd.handler)}
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
            onClick={() => executeCommand(cmd.command, cmd.arg, cmd.handler)}
            onMouseDown={saveSelection}
            title={cmd.tooltip}
            className={cn(
              "p-1 h-8 w-8",
              activeFormats.has(cmd.command) && "bg-[var(--ff-purple-500)] text-white"
            )}
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
            onClick={() => executeCommand(cmd.command, cmd.arg, cmd.handler)}
            onMouseDown={saveSelection}
            title={cmd.tooltip}
            className={cn(
              "p-1 h-8 w-8",
              activeFormats.has(cmd.command) && "bg-[var(--ff-purple-500)] text-white"
            )}
          >
            <cmd.icon className="w-4 h-4" />
          </Button>
        ))}
      </div>

      {/* Indent */}
      <div className="flex gap-1 pr-2 border-r border-[var(--ff-border)]">
        {indentCommands.map((cmd) => (
          <Button
            key={cmd.command}
            variant="ghost"
            size="sm"
            onClick={() => executeCommand(cmd.command, cmd.arg, cmd.handler)}
            onMouseDown={saveSelection}
            title={cmd.tooltip}
            className="p-1 h-8 w-8"
          >
            <cmd.icon className="w-4 h-4" />
          </Button>
        ))}
      </div>

      {/* Insert */}
      <div className="flex gap-1 pr-2 border-r border-[var(--ff-border)]">
        {insertCommands.map((cmd) => (
          <Button
            key={cmd.command}
            variant={cmd.command === 'insertVariable' && showVariablePanel ? 'default' : 'ghost'}
            size="sm"
            onClick={() => executeCommand(cmd.command, cmd.arg, cmd.handler)}
            onMouseDown={saveSelection}
            title={cmd.tooltip}
            className={cn(
              "p-1 h-8 w-8",
              cmd.command === 'insertVariable' && showVariablePanel && "bg-[var(--ff-purple-500)] text-white"
            )}
          >
            <cmd.icon className="w-4 h-4" />
          </Button>
        ))}
      </div>

      {/* Edit */}
      <div className="flex gap-1 pr-2 border-r border-[var(--ff-border)]">
        {editCommands.map((cmd) => (
          <Button
            key={cmd.command}
            variant="ghost"
            size="sm"
            onClick={() => executeCommand(cmd.command, cmd.arg, cmd.handler)}
            onMouseDown={saveSelection}
            title={cmd.tooltip}
            className="p-1 h-8 w-8"
          >
            <cmd.icon className="w-4 h-4" />
          </Button>
        ))}
      </div>

      {/* Color Picker */}
      <Popover open={showColorPicker} onOpenChange={setShowColorPicker}>
        <PopoverTrigger asChild>
          <Button
            variant="ghost"
            size="sm"
            title="Text Color"
            className="p-1 h-8 w-8"
          >
            <Palette className="w-4 h-4" />
          </Button>
        </PopoverTrigger>
        <PopoverContent className="w-64">
          <div className="space-y-4">
            <div>
              <Label>Text Color</Label>
              <div className="flex gap-2 mt-2">
                <Input
                  type="color"
                  value={textColor}
                  onChange={(e) => {
                    setTextColor(e.target.value);
                    restoreSelection();
                    document.execCommand('foreColor', false, e.target.value);
                    handleContentChange();
                  }}
                />
                <Input
                  type="text"
                  value={textColor}
                  onChange={(e) => setTextColor(e.target.value)}
                  className="flex-1"
                />
              </div>
            </div>
            <div>
              <Label>Background Color</Label>
              <div className="flex gap-2 mt-2">
                <Input
                  type="color"
                  value={backgroundColor}
                  onChange={(e) => {
                    setBackgroundColor(e.target.value);
                    restoreSelection();
                    document.execCommand('hiliteColor', false, e.target.value);
                    handleContentChange();
                  }}
                />
                <Input
                  type="text"
                  value={backgroundColor}
                  onChange={(e) => setBackgroundColor(e.target.value)}
                  className="flex-1"
                />
              </div>
            </div>
          </div>
        </PopoverContent>
      </Popover>

      {/* View Options */}
      <div className="flex gap-1 pr-2 border-r border-[var(--ff-border)]">
        <Popover>
          <PopoverTrigger asChild>
            <Button
              variant="ghost"
              size="sm"
              title="Font Size"
              className="p-1 h-8"
            >
              <Type className="w-4 h-4 mr-1" />
              {fontSize}px
            </Button>
          </PopoverTrigger>
          <PopoverContent className="w-48">
            <div className="space-y-2">
              <Label>Font Size: {fontSize}px</Label>
              <Slider
                value={[fontSize]}
                onValueChange={([value]) => setFontSize(value)}
                min={10}
                max={24}
                step={1}
              />
              <Label>Line Height: {lineHeight}</Label>
              <Slider
                value={[lineHeight * 10]}
                onValueChange={([value]) => setLineHeight(value / 10)}
                min={10}
                max={30}
                step={1}
              />
            </div>
          </PopoverContent>
        </Popover>

        <Button
          variant={showPreview ? 'default' : 'ghost'}
          size="sm"
          onClick={() => setShowPreview(!showPreview)}
          title="Toggle Preview"
          className={cn(
            "p-1 h-8 w-8",
            showPreview && "bg-[var(--ff-purple-500)] text-white"
          )}
        >
          {showPreview ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
        </Button>

        <Button
          variant="ghost"
          size="sm"
          onClick={() => setIsFullscreen(!isFullscreen)}
          title={isFullscreen ? 'Exit Fullscreen' : 'Enter Fullscreen'}
          className="p-1 h-8 w-8"
        >
          {isFullscreen ? <Minimize2 className="w-4 h-4" /> : <Maximize2 className="w-4 h-4" />}
        </Button>
      </div>

      {/* Export Options */}
      <div className="flex gap-1">
        <Popover>
          <PopoverTrigger asChild>
            <Button
              variant="ghost"
              size="sm"
              title="Export"
              className="p-1 h-8 w-8"
            >
              <Download className="w-4 h-4" />
            </Button>
          </PopoverTrigger>
          <PopoverContent className="w-48">
            <div className="space-y-2">
              <Button
                variant="ghost"
                size="sm"
                className="w-full justify-start"
                onClick={() => exportContent('html')}
              >
                Export as HTML
              </Button>
              <Button
                variant="ghost"
                size="sm"
                className="w-full justify-start"
                onClick={() => exportContent('markdown')}
              >
                Export as Markdown
              </Button>
              <Button
                variant="ghost"
                size="sm"
                className="w-full justify-start"
                onClick={() => exportContent('text')}
              >
                Export as Plain Text
              </Button>
            </div>
          </PopoverContent>
        </Popover>

        {autoSave && (
          <Button
            variant="ghost"
            size="sm"
            title={lastSaved ? `Last saved: ${lastSaved.toLocaleTimeString()}` : 'Not saved'}
            className="p-1 h-8"
            onClick={() => {
              onAutoSave?.();
              setLastSaved(new Date());
              setUnsavedChanges(false);
            }}
          >
            <Save className="w-4 h-4" />
            {unsavedChanges && <span className="ml-1 text-xs text-orange-500">*</span>}
          </Button>
        )}
      </div>
    </div>
  );

  return (
    <div className={cn(
      "relative",
      isFullscreen && "fixed inset-0 z-50 bg-[var(--ff-bg-dark)]"
    )}>
      <CardGlass className={cn(
        "h-full",
        isFullscreen && "rounded-none"
      )}>
        <CardGlassHeader className="flex items-center justify-between">
          <CardGlassTitle className="flex items-center gap-2">
            <Hash className="w-5 h-5" />
            Enhanced Template Editor
          </CardGlassTitle>
          {showWordCount && (
            <div className="flex gap-4 text-sm text-[var(--ff-text-muted)]">
              <span>{textStats.words} words</span>
              <span>{textStats.characters} characters</span>
              <span>{textStats.readingTime} min read</span>
              {maxLength && (
                <span className={cn(
                  textStats.characters > maxLength * 0.9 && "text-orange-500",
                  textStats.characters >= maxLength && "text-red-500"
                )}>
                  {textStats.characters}/{maxLength}
                </span>
              )}
            </div>
          )}
        </CardGlassHeader>
        <CardGlassContent className="p-0 h-full flex">
          <div className="flex-1 flex flex-col">
            {/* Toolbar */}
            {showToolbar && toolbarPosition === 'top' && !readOnly && renderToolbar()}

            {/* Main Content Area */}
            <div className="flex-1 flex">
              {/* Variable Panel */}
              {showVariables && showVariablePanel && (
                <div className="w-80 border-r border-[var(--ff-border)] overflow-y-auto">
                  <EnhancedVariableInserter
                    onInsert={insertVariable}
                    usedVariables={usedVariables}
                    position="inline"
                  />
                </div>
              )}

              {/* Editor and Preview */}
              <div className="flex-1 flex">
                <Tabs value={showPreview ? 'preview' : 'editor'} className="flex-1">
                  <TabsList className="hidden">
                    <TabsTrigger value="editor">Editor</TabsTrigger>
                    <TabsTrigger value="preview">Preview</TabsTrigger>
                  </TabsList>

                  <TabsContent value="editor" className="h-full m-0">
                    <div
                      ref={editorRef}
                      contentEditable={!readOnly}
                      className={cn(
                        "p-4 min-h-full focus:outline-none",
                        readOnly ? 'cursor-default' : 'cursor-text',
                        "template-editor"
                      )}
                      style={{
                        minHeight: height,
                        backgroundColor: 'var(--ff-bg-layer)',
                        color: 'var(--ff-text-primary)',
                        fontSize: `${fontSize}px`,
                        lineHeight: lineHeight
                      }}
                      onInput={handleContentChange}
                      onKeyDown={handleKeyDown}
                      onMouseUp={() => {
                        updateActiveFormats();
                        saveSelection();
                      }}
                      onKeyUp={updateActiveFormats}
                      suppressContentEditableWarning={true}
                      data-placeholder={placeholder}
                    />
                  </TabsContent>

                  {showPreview && (
                    <TabsContent value="preview" className="h-full m-0 p-4 overflow-y-auto">
                      <div
                        className="prose prose-invert max-w-none"
                        dangerouslySetInnerHTML={{ __html: content }}
                        style={{
                          fontSize: `${fontSize}px`,
                          lineHeight: lineHeight
                        }}
                      />
                    </TabsContent>
                  )}
                </Tabs>
              </div>
            </div>

            {/* Collaborator Cursors */}
            {enableCollaboration && collaborators.map(collaborator => (
              collaborator.cursor && (
                <div
                  key={collaborator.id}
                  className="absolute pointer-events-none z-10"
                  style={{
                    left: collaborator.cursor.x,
                    top: collaborator.cursor.y,
                    transform: 'translate(-50%, -100%)'
                  }}
                >
                  <div
                    className="w-0.5 h-5"
                    style={{ backgroundColor: collaborator.color }}
                  />
                  <div
                    className="px-2 py-1 rounded text-xs text-white whitespace-nowrap"
                    style={{ backgroundColor: collaborator.color }}
                  >
                    {collaborator.name}
                  </div>
                </div>
              )
            ))}

            {/* Bottom Toolbar */}
            {showToolbar && toolbarPosition === 'bottom' && !readOnly && renderToolbar()}
          </div>
        </CardGlassContent>
      </CardGlass>

      {/* Styles */}
      <style jsx global>{`
        .template-variable {
          user-select: none;
          cursor: default;
        }

        .template-editor:empty:before {
          content: attr(data-placeholder);
          color: var(--ff-text-muted);
          pointer-events: none;
        }

        .template-editor h1 {
          font-size: 2em;
          font-weight: bold;
          margin: 0.67em 0;
        }

        .template-editor h2 {
          font-size: 1.5em;
          font-weight: bold;
          margin: 0.83em 0;
        }

        .template-editor h3 {
          font-size: 1.17em;
          font-weight: bold;
          margin: 1em 0;
        }

        .template-editor blockquote {
          border-left: 4px solid var(--ff-purple-500);
          padding-left: 1em;
          margin: 1em 0;
          color: var(--ff-text-secondary);
        }

        .template-editor code {
          background-color: rgba(0, 0, 0, 0.1);
          padding: 2px 4px;
          border-radius: 4px;
          font-family: monospace;
          font-size: 0.9em;
        }

        .template-editor pre {
          background-color: rgba(0, 0, 0, 0.05);
          padding: 12px;
          border-radius: 6px;
          overflow-x: auto;
        }

        .template-editor pre code {
          background-color: transparent;
          padding: 0;
        }

        .template-editor a {
          color: var(--ff-purple-500);
          text-decoration: underline;
        }

        .template-editor ul,
        .template-editor ol {
          padding-left: 2em;
          margin: 1em 0;
        }

        .template-editor li {
          margin: 0.5em 0;
        }

        .template-editor table {
          border-collapse: collapse;
          width: 100%;
          margin: 1em 0;
        }

        .template-editor td,
        .template-editor th {
          border: 1px solid var(--ff-border);
          padding: 8px;
        }

        .template-editor th {
          background-color: rgba(0, 0, 0, 0.05);
          font-weight: bold;
        }

        .template-editor img {
          max-width: 100%;
          height: auto;
        }

        .template-editor input[type="checkbox"] {
          margin-right: 8px;
        }
      `}</style>
    </div>
  );
}