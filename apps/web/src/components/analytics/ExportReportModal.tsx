'use client';

import { useState } from 'react';
import { Download, FileText, Table, X, Check, Calendar, Users, Clock } from 'lucide-react';
import { format } from 'date-fns';

interface ExportReportModalProps {
  isOpen: boolean;
  onClose: () => void;
  data: any; // Analytics data to export
  dateRange: { start: Date; end: Date };
}

type ExportFormat = 'csv' | 'pdf';
type ReportSection = 'overview' | 'meetings' | 'participants' | 'engagement' | 'trends';

const reportSections: Array<{ id: ReportSection; label: string; icon: any }> = [
  { id: 'overview', label: 'Overview Statistics', icon: FileText },
  { id: 'meetings', label: 'Meeting Analytics', icon: Calendar },
  { id: 'participants', label: 'Participant Data', icon: Users },
  { id: 'engagement', label: 'Engagement Metrics', icon: Clock },
  { id: 'trends', label: 'Trend Analysis', icon: Table },
];

export function ExportReportModal({ isOpen, onClose, data, dateRange }: ExportReportModalProps) {
  const [exportFormat, setExportFormat] = useState<ExportFormat>('csv');
  const [selectedSections, setSelectedSections] = useState<Set<ReportSection>>(
    new Set(['overview', 'meetings', 'participants'])
  );
  const [isExporting, setIsExporting] = useState(false);

  if (!isOpen) return null;

  const toggleSection = (section: ReportSection) => {
    const newSections = new Set(selectedSections);
    if (newSections.has(section)) {
      newSections.delete(section);
    } else {
      newSections.add(section);
    }
    setSelectedSections(newSections);
  };

  const generateCSV = () => {
    const rows: string[][] = [];
    const dateRangeStr = `${format(dateRange.start, 'MMM dd, yyyy')} - ${format(dateRange.end, 'MMM dd, yyyy')}`;

    // Header
    rows.push(['Analytics Report']);
    rows.push(['Date Range', dateRangeStr]);
    rows.push([]);

    // Overview Section
    if (selectedSections.has('overview') && data?.overview) {
      rows.push(['Overview Statistics']);
      rows.push(['Metric', 'Value']);
      rows.push(['Total Meetings', data.overview.totalMeetings.toString()]);
      rows.push(['Completed Meetings', data.overview.completedMeetings.toString()]);
      rows.push(['Total Duration (minutes)', data.overview.totalDurationMinutes.toString()]);
      rows.push(['Total Transcripts', data.overview.totalTranscripts.toString()]);
      rows.push(['Total Comments', data.overview.totalComments.toString()]);
      rows.push(['Active Users', data.overview.activeUsers.toString()]);
      rows.push(['Average Meeting Duration', data.overview.averageMeetingDuration.toString()]);
      rows.push([]);
    }

    // Participants Section
    if (selectedSections.has('participants') && data?.topParticipants) {
      rows.push(['Top Participants']);
      rows.push(['Email', 'Meeting Count', 'Total Talk Time (minutes)']);
      data.topParticipants.forEach((p: any) => {
        rows.push([p.email, p.meetingCount.toString(), p.totalTalkTimeMinutes.toString()]);
      });
      rows.push([]);
    }

    // Meeting Trends
    if (selectedSections.has('trends') && data?.trends?.meetingsByDay) {
      rows.push(['Meeting Trends']);
      rows.push(['Date', 'Meeting Count']);
      data.trends.meetingsByDay.forEach((day: any) => {
        rows.push([day.date, day.count.toString()]);
      });
      rows.push([]);
    }

    // Convert to CSV string
    const csvContent = rows.map(row => row.map(cell => `"${cell}"`).join(',')).join('\n');
    return csvContent;
  };

  const generatePDF = () => {
    // In a real implementation, we'd use a library like jsPDF or pdfmake
    // For now, we'll create a simple HTML report that can be printed to PDF
    const dateRangeStr = `${format(dateRange.start, 'MMM dd, yyyy')} - ${format(dateRange.end, 'MMM dd, yyyy')}`;

    const htmlContent = `
      <!DOCTYPE html>
      <html>
      <head>
        <title>Analytics Report</title>
        <style>
          body { font-family: Arial, sans-serif; margin: 40px; }
          h1 { color: #1e293b; }
          h2 { color: #475569; margin-top: 30px; }
          table { width: 100%; border-collapse: collapse; margin-top: 20px; }
          th, td { padding: 12px; text-align: left; border-bottom: 1px solid #e2e8f0; }
          th { background-color: #f8fafc; font-weight: bold; }
          .header { margin-bottom: 30px; }
          .date-range { color: #64748b; }
        </style>
      </head>
      <body>
        <div class="header">
          <h1>Analytics Report</h1>
          <p class="date-range">Date Range: ${dateRangeStr}</p>
        </div>

        ${selectedSections.has('overview') && data?.overview ? `
          <h2>Overview Statistics</h2>
          <table>
            <tr><th>Metric</th><th>Value</th></tr>
            <tr><td>Total Meetings</td><td>${data.overview.totalMeetings}</td></tr>
            <tr><td>Completed Meetings</td><td>${data.overview.completedMeetings}</td></tr>
            <tr><td>Total Duration</td><td>${data.overview.totalDurationMinutes} minutes</td></tr>
            <tr><td>Total Transcripts</td><td>${data.overview.totalTranscripts}</td></tr>
            <tr><td>Total Comments</td><td>${data.overview.totalComments}</td></tr>
            <tr><td>Active Users</td><td>${data.overview.activeUsers}</td></tr>
          </table>
        ` : ''}

        ${selectedSections.has('participants') && data?.topParticipants ? `
          <h2>Top Participants</h2>
          <table>
            <tr><th>Email</th><th>Meetings</th><th>Talk Time (min)</th></tr>
            ${data.topParticipants.map((p: any) => `
              <tr>
                <td>${p.email}</td>
                <td>${p.meetingCount}</td>
                <td>${p.totalTalkTimeMinutes}</td>
              </tr>
            `).join('')}
          </table>
        ` : ''}
      </body>
      </html>
    `;

    return htmlContent;
  };

  const handleExport = async () => {
    setIsExporting(true);

    try {
      let content: string;
      let filename: string;
      let mimeType: string;

      if (exportFormat === 'csv') {
        content = generateCSV();
        filename = `analytics-report-${format(new Date(), 'yyyy-MM-dd')}.csv`;
        mimeType = 'text/csv';
      } else {
        content = generatePDF();
        filename = `analytics-report-${format(new Date(), 'yyyy-MM-dd')}.html`;
        mimeType = 'text/html';
      }

      // Create blob and download
      const blob = new Blob([content], { type: mimeType });
      const url = window.URL.createObjectURL(blob);
      const link = document.createElement('a');
      link.href = url;
      link.download = filename;
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
      window.URL.revokeObjectURL(url);

      // Close modal after successful export
      setTimeout(() => {
        setIsExporting(false);
        onClose();
      }, 1500);
    } catch (error) {
      console.error('Export failed:', error);
      setIsExporting(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center">
      {/* Backdrop */}
      <div className="absolute inset-0 bg-black/60 backdrop-blur-sm" onClick={onClose} />

      {/* Modal */}
      <div className="relative bg-[#0f0f1f] border border-slate-700 rounded-xl shadow-2xl w-full max-w-2xl max-h-[80vh] overflow-hidden">
        {/* Header */}
        <div className="flex items-center justify-between p-6 border-b border-slate-700">
          <div>
            <h2 className="text-xl font-bold text-white">Export Analytics Report</h2>
            <p className="text-sm text-slate-400 mt-1">
              {format(dateRange.start, 'MMM dd, yyyy')} - {format(dateRange.end, 'MMM dd, yyyy')}
            </p>
          </div>
          <button
            onClick={onClose}
            className="p-2 hover:bg-slate-800 rounded-lg transition-colors"
          >
            <X className="w-5 h-5 text-slate-400" />
          </button>
        </div>

        {/* Content */}
        <div className="p-6 space-y-6 overflow-y-auto max-h-[calc(80vh-200px)]">
          {/* Format Selection */}
          <div>
            <h3 className="text-sm font-medium text-white mb-3">Export Format</h3>
            <div className="grid grid-cols-2 gap-3">
              <button
                onClick={() => setExportFormat('csv')}
                className={`p-4 rounded-lg border transition-all ${
                  exportFormat === 'csv'
                    ? 'bg-blue-500/10 border-blue-500/50 text-blue-400'
                    : 'bg-[#0a0a1a] border-slate-700 text-slate-300 hover:bg-slate-800/50'
                }`}
              >
                <Table className="w-6 h-6 mb-2" />
                <p className="font-medium">CSV</p>
                <p className="text-xs mt-1 opacity-70">Spreadsheet compatible</p>
              </button>
              <button
                onClick={() => setExportFormat('pdf')}
                className={`p-4 rounded-lg border transition-all ${
                  exportFormat === 'pdf'
                    ? 'bg-blue-500/10 border-blue-500/50 text-blue-400'
                    : 'bg-[#0a0a1a] border-slate-700 text-slate-300 hover:bg-slate-800/50'
                }`}
              >
                <FileText className="w-6 h-6 mb-2" />
                <p className="font-medium">PDF Report</p>
                <p className="text-xs mt-1 opacity-70">Formatted document</p>
              </button>
            </div>
          </div>

          {/* Section Selection */}
          <div>
            <h3 className="text-sm font-medium text-white mb-3">Include Sections</h3>
            <div className="space-y-2">
              {reportSections.map((section) => {
                const Icon = section.icon;
                const isSelected = selectedSections.has(section.id);
                return (
                  <button
                    key={section.id}
                    onClick={() => toggleSection(section.id)}
                    className={`w-full flex items-center justify-between p-3 rounded-lg border transition-all ${
                      isSelected
                        ? 'bg-blue-500/10 border-blue-500/50'
                        : 'bg-[#0a0a1a] border-slate-700 hover:bg-slate-800/50'
                    }`}
                  >
                    <div className="flex items-center gap-3">
                      <Icon className={`w-5 h-5 ${isSelected ? 'text-blue-400' : 'text-slate-400'}`} />
                      <span className={`text-sm ${isSelected ? 'text-white' : 'text-slate-300'}`}>
                        {section.label}
                      </span>
                    </div>
                    {isSelected && <Check className="w-4 h-4 text-blue-400" />}
                  </button>
                );
              })}
            </div>
          </div>

          {/* Export Summary */}
          <div className="bg-[#0a0a1a] rounded-lg p-4 border border-slate-700">
            <p className="text-xs text-slate-400 mb-2">Export Summary</p>
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-white">
                  {selectedSections.size} section{selectedSections.size !== 1 ? 's' : ''} selected
                </p>
                <p className="text-xs text-slate-500 mt-1">
                  Format: {exportFormat === 'csv' ? 'CSV (Comma-separated values)' : 'PDF Report'}
                </p>
              </div>
              <Download className="w-5 h-5 text-slate-400" />
            </div>
          </div>
        </div>

        {/* Footer */}
        <div className="flex items-center justify-end gap-3 p-6 border-t border-slate-700">
          <button
            onClick={onClose}
            className="px-4 py-2 text-sm text-slate-400 hover:text-white transition-colors"
          >
            Cancel
          </button>
          <button
            onClick={handleExport}
            disabled={selectedSections.size === 0 || isExporting}
            className={`px-6 py-2 text-sm font-medium rounded-lg transition-all flex items-center gap-2 ${
              selectedSections.size === 0
                ? 'bg-slate-700 text-slate-500 cursor-not-allowed'
                : isExporting
                ? 'bg-green-500 text-white'
                : 'bg-blue-500 text-white hover:bg-blue-600'
            }`}
          >
            {isExporting ? (
              <>
                <Check className="w-4 h-4" />
                Exported!
              </>
            ) : (
              <>
                <Download className="w-4 h-4" />
                Export Report
              </>
            )}
          </button>
        </div>
      </div>
    </div>
  );
}