# AI Summary Components - Implementation Guide

## Overview

This document describes the enhanced AI summary components created for displaying meeting summaries with advanced features including editing, exporting, and integration with task management systems.

## Components Created

### 1. MeetingSummaryPanel

**Location:** `/home/user/openmeet/apps/web/src/components/meetings/MeetingSummaryPanel.tsx`

**Description:** Main container component that displays the entire meeting summary with collapsible sections.

**Features:**
- ✅ Expandable/collapsible sections (Overview, Key Points, Action Items, Decisions, Follow-ups)
- ✅ Edit capability for overview section with save/cancel
- ✅ Regenerate button to re-generate AI summary
- ✅ Export options via integrated SummaryExport component
- ✅ Edit history tracking
- ✅ Real-time updates with loading states

**Props:**
```typescript
interface MeetingSummaryPanelProps {
  meetingId: string;
  summary: MeetingSummary;
  onSummaryUpdate?: (summary: MeetingSummary) => void;
  onSeekToTime?: (time: number) => void;
}
```

**Usage Example:**
```tsx
import { MeetingSummaryPanel } from '@/components/meetings';

<MeetingSummaryPanel
  meetingId={meetingId}
  summary={meetingSummary}
  onSummaryUpdate={(updatedSummary) => {
    console.log('Summary updated:', updatedSummary);
  }}
  onSeekToTime={(time) => {
    // Jump video player to this time
    videoRef.current.currentTime = time;
  }}
/>
```

### 2. ActionItemsList

**Location:** `/home/user/openmeet/apps/web/src/components/meetings/ActionItemsList.tsx`

**Description:** Displays action items extracted from meeting with task management features.

**Features:**
- ✅ Checkbox to mark items as complete
- ✅ Inline editing for assignee
- ✅ Inline date picker for due dates
- ✅ Priority badges (low, medium, high)
- ✅ Export to task managers (Asana, Jira, Notion)
- ✅ Share to Slack/Teams
- ✅ Status tracking (pending, in_progress, completed)
- ✅ Visual strike-through for completed items

**Props:**
```typescript
interface ActionItemsListProps {
  meetingId: string;
  actionItems: ActionItem[];
  onUpdate?: (items: ActionItem[]) => void;
}
```

**Usage Example:**
```tsx
import { ActionItemsList } from '@/components/meetings';

<ActionItemsList
  meetingId={meetingId}
  actionItems={actionItems}
  onUpdate={(updatedItems) => {
    console.log('Action items updated:', updatedItems);
  }}
/>
```

### 3. KeyPointsCard

**Location:** `/home/user/openmeet/apps/web/src/components/meetings/KeyPointsCard.tsx`

**Description:** Displays key points from the meeting with timestamp links.

**Features:**
- ✅ Bullet point display with importance indicators
- ✅ Timestamp links that jump to meeting moment
- ✅ Copy individual points to clipboard
- ✅ Highlight important points with special styling
- ✅ Star icon for high-importance items

**Props:**
```typescript
interface KeyPointsCardProps {
  keyPoints: KeyPoint[];
  onSeekToTime?: (time: number) => void;
}
```

**Usage Example:**
```tsx
import { KeyPointsCard } from '@/components/meetings';

<KeyPointsCard
  keyPoints={keyPoints}
  onSeekToTime={(time) => {
    // Jump video player to this time
    videoRef.current.currentTime = time;
  }}
/>
```

### 4. DecisionsList

**Location:** `/home/user/openmeet/apps/web/src/components/meetings/DecisionsList.tsx`

**Description:** Displays decisions made during the meeting with context.

**Features:**
- ✅ Decision text with who made the decision
- ✅ Expandable context snippets
- ✅ Timestamp links to decision moment in video
- ✅ Copy entire decision with context
- ✅ Visual indicators for decision items

**Props:**
```typescript
interface DecisionsListProps {
  decisions: Decision[];
  onSeekToTime?: (time: number) => void;
}
```

**Usage Example:**
```tsx
import { DecisionsList } from '@/components/meetings';

<DecisionsList
  decisions={decisions}
  onSeekToTime={(time) => {
    videoRef.current.currentTime = time;
  }}
/>
```

### 5. SummaryExport

**Location:** `/home/user/openmeet/apps/web/src/components/meetings/SummaryExport.tsx`

**Description:** Export dropdown menu for downloading and sharing summaries.

**Features:**
- ✅ Export formats: PDF, Word (DOCX), Markdown, Plain Text
- ✅ Copy to clipboard
- ✅ Send via email
- ✅ Share to Slack
- ✅ Share to Microsoft Teams
- ✅ Loading states for export operations

**Props:**
```typescript
interface SummaryExportProps {
  meetingId: string;
  summary: MeetingSummary;
}
```

**Usage Example:**
```tsx
import { SummaryExport } from '@/components/meetings';

<SummaryExport
  meetingId={meetingId}
  summary={summary}
/>
```

## API Integration

### New API Methods Added

**Location:** `/home/user/openmeet/apps/web/src/lib/api.ts`

```typescript
// Summary endpoints
async getMeetingSummary(meetingId: string)
async updateMeetingSummary(meetingId: string, data: { overview?: string })
async regenerateMeetingSummary(meetingId: string)
async exportSummary(meetingId: string, format: 'pdf' | 'docx' | 'markdown' | 'txt')
async emailSummary(meetingId: string, recipients: string[])
async shareSummaryToSlack(meetingId: string, channel?: string)
async shareSummaryToTeams(meetingId: string, channel?: string)

// Action Items endpoints
async getActionItems(meetingId: string)
async updateActionItem(meetingId: string, actionItemId: string, data: {...})
async exportActionItem(meetingId: string, actionItemId: string, integration: string)
```

### Backend API Routes Required

These components expect the following backend API endpoints:

```
GET    /api/meetings/:id/summary
PATCH  /api/meetings/:id/summary
POST   /api/meetings/:id/regenerate-summary
GET    /api/meetings/:id/summary/export?format=pdf|docx|markdown|txt
POST   /api/meetings/:id/summary/email
POST   /api/meetings/:id/summary/share/slack
POST   /api/meetings/:id/summary/share/teams

GET    /api/meetings/:id/action-items
PATCH  /api/meetings/:id/action-items/:actionItemId
POST   /api/meetings/:id/action-items/:actionItemId/export
```

## Data Models

### MeetingSummary
```typescript
interface MeetingSummary {
  id: string;
  overview: string;
  keyPoints: KeyPoint[];
  actionItems: ActionItem[];
  decisions: Decision[];
  followUps: string[];
  generatedAt: string;
  editHistory?: {
    editedAt: string;
    editedBy: string;
    changes: string;
  }[];
}
```

### KeyPoint
```typescript
interface KeyPoint {
  id: string;
  text: string;
  timestamp?: number;
  importance?: 'low' | 'medium' | 'high';
}
```

### ActionItem
```typescript
interface ActionItem {
  id: string;
  description: string;
  assignee?: string;
  dueDate?: string;
  priority: 'low' | 'medium' | 'high';
  status: 'pending' | 'in_progress' | 'completed';
}
```

### Decision
```typescript
interface Decision {
  id: string;
  text: string;
  decidedBy?: string;
  timestamp?: number;
  context?: string;
}
```

## Integration Example

Complete example of using the MeetingSummaryPanel in a meeting detail page:

```tsx
'use client';

import { useState, useRef } from 'react';
import { MeetingSummaryPanel } from '@/components/meetings';
import { MeetingPlayer } from '@/components/meetings';

export default function MeetingDetailPage({ meetingId }: { meetingId: string }) {
  const [summary, setSummary] = useState<MeetingSummary | null>(null);
  const videoRef = useRef<HTMLVideoElement>(null);

  // Fetch summary on mount
  useEffect(() => {
    apiClient.getMeetingSummary(meetingId).then(setSummary);
  }, [meetingId]);

  const handleSeekToTime = (time: number) => {
    if (videoRef.current) {
      videoRef.current.currentTime = time;
      videoRef.current.play();
    }
  };

  if (!summary) return <LoadingSpinner />;

  return (
    <div className="grid grid-cols-2 gap-4">
      {/* Video Player */}
      <div>
        <MeetingPlayer videoRef={videoRef} />
      </div>

      {/* Summary Panel */}
      <div>
        <MeetingSummaryPanel
          meetingId={meetingId}
          summary={summary}
          onSummaryUpdate={setSummary}
          onSeekToTime={handleSeekToTime}
        />
      </div>
    </div>
  );
}
```

## Styling

All components use:
- **Tailwind CSS** for styling
- **Dark theme** with slate colors
- **Radix UI** for accessible dropdown menus
- **Lucide React** for icons
- **Smooth animations** for interactions

The design follows the existing app's futuristic glass-morphism aesthetic with:
- Glass-like backgrounds: `bg-slate-900/40`
- Borders: `border-slate-700`
- Hover effects: `hover:border-slate-600`
- Purple accent color: `text-purple-400`, `bg-purple-600`

## Features Implemented

### ✅ Core Requirements
- [x] Expandable sections for long summaries
- [x] Edit mode with corrections
- [x] Track edit history
- [x] One-click export to multiple formats
- [x] Timestamp links that jump to video moments
- [x] Action items with checkbox completion
- [x] Assignee and due date management
- [x] Export to task managers (Asana, Jira, Notion)
- [x] Share to communication tools (Slack, Teams)

### ✅ API Integration
- [x] GET /api/meetings/:id (includes summary)
- [x] POST /api/meetings/:id/regenerate-summary
- [x] PATCH /api/meetings/:id/summary (edit summary)
- [x] PATCH /api/meetings/:id/action-items/:id (update action items)

### ✅ UX Features
- [x] Collapsible sections
- [x] Loading states during operations
- [x] Copy to clipboard functionality
- [x] Inline editing for fields
- [x] Visual feedback (check marks, spinners)
- [x] Priority and status badges
- [x] Hover effects and transitions

## Testing

To test the components:

1. **Component Structure:**
   ```bash
   cd /home/user/openmeet/apps/web
   ls -la src/components/meetings/
   ```

2. **Check Exports:**
   ```bash
   cat src/components/meetings/index.ts
   ```

3. **Type Check:**
   ```bash
   pnpm type-check
   ```

## Next Steps

To fully integrate these components:

1. **Backend Implementation:** Implement the required API endpoints
2. **Database Schema:** Ensure database has fields for summaries, action items, etc.
3. **Integration Testing:** Test with real API responses
4. **E2E Tests:** Create Playwright tests for user flows
5. **Integration Setup:** Configure Asana, Jira, Notion, Slack, Teams OAuth

## Files Modified/Created

### Created Files:
- `/home/user/openmeet/apps/web/src/components/meetings/MeetingSummaryPanel.tsx`
- `/home/user/openmeet/apps/web/src/components/meetings/ActionItemsList.tsx`
- `/home/user/openmeet/apps/web/src/components/meetings/KeyPointsCard.tsx`
- `/home/user/openmeet/apps/web/src/components/meetings/DecisionsList.tsx`
- `/home/user/openmeet/apps/web/src/components/meetings/SummaryExport.tsx`
- `/home/user/openmeet/apps/web/src/components/ui/dropdown-menu.tsx`

### Modified Files:
- `/home/user/openmeet/apps/web/src/lib/api.ts` - Added summary and action item API methods
- `/home/user/openmeet/apps/web/src/components/meetings/index.ts` - Added new component exports
- `/home/user/openmeet/apps/web/src/components/ui/index.ts` - Added dropdown-menu export

## Notes

- All components follow the NO MOCKS, NO FAKES principle - they make real API calls
- Components use proper TypeScript typing
- Error handling is implemented for all API calls
- Loading states are shown during async operations
- Components are fully responsive and follow the app's design system
