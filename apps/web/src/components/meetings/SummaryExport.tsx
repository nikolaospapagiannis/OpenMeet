'use client';

import { useState } from 'react';
import {
  Download,
  FileText,
  Mail,
  Copy,
  CheckCircle,
  Loader2,
  ChevronDown,
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
  DropdownMenuSeparator,
  DropdownMenuLabel,
} from '@/components/ui/dropdown-menu';
import apiClient from '@/lib/api';

interface MeetingSummary {
  id: string;
  overview: string;
  keyPoints: any[];
  actionItems: any[];
  decisions: any[];
  followUps: string[];
  generatedAt: string;
}

interface SummaryExportProps {
  meetingId: string;
  summary: MeetingSummary;
}

export function SummaryExport({ meetingId, summary }: SummaryExportProps) {
  const [isExporting, setIsExporting] = useState(false);
  const [copiedToClipboard, setCopiedToClipboard] = useState(false);
  const [exportingFormat, setExportingFormat] = useState<string | null>(null);

  const handleExportFormat = async (format: 'pdf' | 'docx' | 'markdown' | 'txt') => {
    setIsExporting(true);
    setExportingFormat(format);
    try {
      const response = await apiClient.get(`/meetings/${meetingId}/summary/export`, {
        params: { format },
        responseType: 'blob',
      });

      // Create download link
      const blob = new Blob([response], {
        type:
          format === 'pdf'
            ? 'application/pdf'
            : format === 'docx'
            ? 'application/vnd.openxmlformats-officedocument.wordprocessingml.document'
            : 'text/plain',
      });
      const url = window.URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `meeting-summary-${meetingId}.${format}`;
      a.click();
      window.URL.revokeObjectURL(url);
    } catch (error) {
      console.error(`Failed to export as ${format}:`, error);
    } finally {
      setIsExporting(false);
      setExportingFormat(null);
    }
  };

  const handleCopyToClipboard = async () => {
    try {
      // Format summary as text
      const text = formatSummaryAsText(summary);
      await navigator.clipboard.writeText(text);
      setCopiedToClipboard(true);
      setTimeout(() => setCopiedToClipboard(false), 2000);
    } catch (error) {
      console.error('Failed to copy to clipboard:', error);
    }
  };

  const handleSendEmail = async () => {
    setIsExporting(true);
    try {
      await apiClient.post(`/meetings/${meetingId}/summary/email`, {
        recipients: [], // Will be handled by backend or show modal to select
      });
      // Show success toast
    } catch (error) {
      console.error('Failed to send email:', error);
    } finally {
      setIsExporting(false);
    }
  };

  const handleSendToSlack = async () => {
    setIsExporting(true);
    try {
      await apiClient.post(`/meetings/${meetingId}/summary/share/slack`, {});
      // Show success toast
    } catch (error) {
      console.error('Failed to send to Slack:', error);
    } finally {
      setIsExporting(false);
    }
  };

  const handleSendToTeams = async () => {
    setIsExporting(true);
    try {
      await apiClient.post(`/meetings/${meetingId}/summary/share/teams`, {});
      // Show success toast
    } catch (error) {
      console.error('Failed to send to Teams:', error);
    } finally {
      setIsExporting(false);
    }
  };

  const formatSummaryAsText = (summary: MeetingSummary) => {
    let text = '# Meeting Summary\n\n';
    text += `Generated: ${new Date(summary.generatedAt).toLocaleString()}\n\n`;
    text += `## Overview\n${summary.overview}\n\n`;

    if (summary.keyPoints.length > 0) {
      text += '## Key Points\n';
      summary.keyPoints.forEach((point, i) => {
        text += `${i + 1}. ${point.text}\n`;
      });
      text += '\n';
    }

    if (summary.actionItems.length > 0) {
      text += '## Action Items\n';
      summary.actionItems.forEach((item, i) => {
        text += `${i + 1}. ${item.description}`;
        if (item.assignee) text += ` (Assigned to: ${item.assignee})`;
        if (item.dueDate) text += ` (Due: ${new Date(item.dueDate).toLocaleDateString()})`;
        text += ` [${item.priority} priority]\n`;
      });
      text += '\n';
    }

    if (summary.decisions && summary.decisions.length > 0) {
      text += '## Decisions Made\n';
      summary.decisions.forEach((decision, i) => {
        text += `${i + 1}. ${decision.text}`;
        if (decision.decidedBy) text += ` (Decided by: ${decision.decidedBy})`;
        text += '\n';
      });
      text += '\n';
    }

    if (summary.followUps && summary.followUps.length > 0) {
      text += '## Follow-ups\n';
      summary.followUps.forEach((followUp, i) => {
        text += `${i + 1}. ${followUp}\n`;
      });
      text += '\n';
    }

    return text;
  };

  return (
    <DropdownMenu>
      <DropdownMenuTrigger asChild>
        <Button
          variant="outline"
          size="sm"
          disabled={isExporting}
          className="border-slate-700 bg-slate-800/40 text-slate-300 hover:bg-slate-800/60 hover:text-white"
        >
          {isExporting && exportingFormat ? (
            <>
              <Loader2 className="h-4 w-4 mr-2 animate-spin" />
              Exporting...
            </>
          ) : (
            <>
              <Download className="h-4 w-4 mr-2" />
              Export
              <ChevronDown className="h-3 w-3 ml-1" />
            </>
          )}
        </Button>
      </DropdownMenuTrigger>
      <DropdownMenuContent
        align="end"
        className="w-56 bg-slate-900 border border-slate-700 rounded-lg shadow-xl p-1 z-50"
      >
        {/* Download Section */}
        <DropdownMenuLabel className="px-2 py-1.5 text-xs font-semibold text-slate-400">
          Download as
        </DropdownMenuLabel>
        <DropdownMenuItem
          onClick={() => handleExportFormat('pdf')}
          disabled={isExporting}
          className="px-2 py-1.5 text-sm text-slate-300 hover:bg-slate-800 rounded cursor-pointer flex items-center"
        >
          <FileText className="h-3.5 w-3.5 mr-2" />
          PDF Document
        </DropdownMenuItem>
        <DropdownMenuItem
          onClick={() => handleExportFormat('docx')}
          disabled={isExporting}
          className="px-2 py-1.5 text-sm text-slate-300 hover:bg-slate-800 rounded cursor-pointer flex items-center"
        >
          <FileText className="h-3.5 w-3.5 mr-2" />
          Word Document
        </DropdownMenuItem>
        <DropdownMenuItem
          onClick={() => handleExportFormat('markdown')}
          disabled={isExporting}
          className="px-2 py-1.5 text-sm text-slate-300 hover:bg-slate-800 rounded cursor-pointer flex items-center"
        >
          <FileText className="h-3.5 w-3.5 mr-2" />
          Markdown
        </DropdownMenuItem>
        <DropdownMenuItem
          onClick={() => handleExportFormat('txt')}
          disabled={isExporting}
          className="px-2 py-1.5 text-sm text-slate-300 hover:bg-slate-800 rounded cursor-pointer flex items-center"
        >
          <FileText className="h-3.5 w-3.5 mr-2" />
          Plain Text
        </DropdownMenuItem>

        <DropdownMenuSeparator className="my-1 h-px bg-slate-700" />

        {/* Copy Section */}
        <DropdownMenuItem
          onClick={handleCopyToClipboard}
          disabled={isExporting}
          className="px-2 py-1.5 text-sm text-slate-300 hover:bg-slate-800 rounded cursor-pointer flex items-center"
        >
          {copiedToClipboard ? (
            <>
              <CheckCircle className="h-3.5 w-3.5 mr-2 text-emerald-400" />
              Copied!
            </>
          ) : (
            <>
              <Copy className="h-3.5 w-3.5 mr-2" />
              Copy to Clipboard
            </>
          )}
        </DropdownMenuItem>

        <DropdownMenuSeparator className="my-1 h-px bg-slate-700" />

        {/* Share Section */}
        <DropdownMenuLabel className="px-2 py-1.5 text-xs font-semibold text-slate-400">
          Share to
        </DropdownMenuLabel>
        <DropdownMenuItem
          onClick={handleSendEmail}
          disabled={isExporting}
          className="px-2 py-1.5 text-sm text-slate-300 hover:bg-slate-800 rounded cursor-pointer flex items-center"
        >
          <Mail className="h-3.5 w-3.5 mr-2" />
          Email
        </DropdownMenuItem>
        <DropdownMenuItem
          onClick={handleSendToSlack}
          disabled={isExporting}
          className="px-2 py-1.5 text-sm text-slate-300 hover:bg-slate-800 rounded cursor-pointer flex items-center"
        >
          <svg
            className="h-3.5 w-3.5 mr-2"
            viewBox="0 0 24 24"
            fill="currentColor"
          >
            <path d="M5.042 15.165a2.528 2.528 0 0 1-2.52 2.523A2.528 2.528 0 0 1 0 15.165a2.527 2.527 0 0 1 2.522-2.52h2.52v2.52zM6.313 15.165a2.527 2.527 0 0 1 2.521-2.52 2.527 2.527 0 0 1 2.521 2.52v6.313A2.528 2.528 0 0 1 8.834 24a2.528 2.528 0 0 1-2.521-2.522v-6.313zM8.834 5.042a2.528 2.528 0 0 1-2.521-2.52A2.528 2.528 0 0 1 8.834 0a2.528 2.528 0 0 1 2.521 2.522v2.52H8.834zM8.834 6.313a2.528 2.528 0 0 1 2.521 2.521 2.528 2.528 0 0 1-2.521 2.521H2.522A2.528 2.528 0 0 1 0 8.834a2.528 2.528 0 0 1 2.522-2.521h6.312zM18.956 8.834a2.528 2.528 0 0 1 2.522-2.521A2.528 2.528 0 0 1 24 8.834a2.528 2.528 0 0 1-2.522 2.521h-2.522V8.834zM17.688 8.834a2.528 2.528 0 0 1-2.523 2.521 2.527 2.527 0 0 1-2.52-2.521V2.522A2.527 2.527 0 0 1 15.165 0a2.528 2.528 0 0 1 2.523 2.522v6.312zM15.165 18.956a2.528 2.528 0 0 1 2.523 2.522A2.528 2.528 0 0 1 15.165 24a2.527 2.527 0 0 1-2.52-2.522v-2.522h2.52zM15.165 17.688a2.527 2.527 0 0 1-2.52-2.523 2.526 2.526 0 0 1 2.52-2.52h6.313A2.527 2.527 0 0 1 24 15.165a2.528 2.528 0 0 1-2.522 2.523h-6.313z" />
          </svg>
          Slack
        </DropdownMenuItem>
        <DropdownMenuItem
          onClick={handleSendToTeams}
          disabled={isExporting}
          className="px-2 py-1.5 text-sm text-slate-300 hover:bg-slate-800 rounded cursor-pointer flex items-center"
        >
          <svg
            className="h-3.5 w-3.5 mr-2"
            viewBox="0 0 24 24"
            fill="currentColor"
          >
            <path d="M20.625 8.127v7.746a2.127 2.127 0 0 1-2.127 2.127h-7.746a2.127 2.127 0 0 1-2.127-2.127V8.127A2.127 2.127 0 0 1 10.752 6h7.746a2.127 2.127 0 0 1 2.127 2.127zM6.563 6.563V17.44a1.063 1.063 0 0 1-1.063 1.063H2.626A1.063 1.063 0 0 1 1.563 17.44V6.563A1.063 1.063 0 0 1 2.626 5.5H5.5a1.063 1.063 0 0 1 1.063 1.063z" />
          </svg>
          Microsoft Teams
        </DropdownMenuItem>
      </DropdownMenuContent>
    </DropdownMenu>
  );
}
