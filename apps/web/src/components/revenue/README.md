# Revenue Intelligence Components

## Implementation Summary

This directory contains enhanced revenue intelligence components that provide pipeline management and AI-powered insights for the OpenMeet platform.

## Components Created

### 1. PipelineKanban.tsx
- **Purpose**: Interactive drag-and-drop kanban board for deal pipeline management
- **Features**:
  - Six deal stages: Discovery, Qualification, Proposal, Negotiation, Closed Won, Closed Lost
  - Drag-and-drop functionality using @dnd-kit/core
  - Visual health indicators and engagement levels
  - Competitor warnings and days-in-stage tracking
  - CRM sync status indicators
  - Real-time value calculations per stage

### 2. DealTimeline.tsx
- **Purpose**: Chronological activity timeline for deal interactions
- **Features**:
  - Activity types: meetings, emails, calls, notes, competitor mentions, objections
  - Sentiment analysis per activity (positive/neutral/negative)
  - Filterable by activity type
  - Expandable details with participant information
  - Summary statistics for activity types
  - Visual indicators for critical events

### 3. CompetitorMentions.tsx
- **Purpose**: Competitor intelligence tracking and sentiment analysis
- **Features**:
  - Competitor mention frequency tracking
  - Sentiment distribution (positive/neutral/negative)
  - Sortable by mentions, recency, or sentiment
  - Grid and list view modes
  - Context snippets from transcripts
  - Visual sentiment indicators

### 4. NextStepsAI.tsx
- **Purpose**: AI-generated actionable recommendations
- **Features**:
  - Four insight types: next steps, risks, opportunities, coaching
  - Priority levels (high/medium/low)
  - Filterable by type and priority
  - Action buttons for each recommendation type
  - Deal context linkage
  - Auto-refresh capability
  - Dismissable insights

### 5. DealHealthScore.tsx
- **Purpose**: Visual deal health assessment and risk indicators
- **Features**:
  - Animated circular progress indicator
  - Six health metrics:
    - Stage Duration (20% weight)
    - Engagement Level (25% weight)
    - Competitive Landscape (15% weight)
    - Objection Management (15% weight)
    - Overall Sentiment (15% weight)
    - Timeline Risk (10% weight)
  - Detailed and summary view modes
  - Actionable recommendations per metric
  - Visual status indicators

### 6. useRevenueIntelligence.ts (Hook)
- **Purpose**: Centralized data management for revenue intelligence
- **Features**:
  - Real-time data fetching with 30-second auto-refresh
  - Deal stage updates with optimistic UI updates
  - Health score calculations
  - Competitor sentiment analysis
  - AI recommendation fetching
  - Error handling and loading states
  - Session-based authentication

## Enhanced Main Page

### apps/web/src/app/(dashboard)/revenue/page.tsx
- **Enhancements**:
  - Four view modes: Overview, Pipeline Board, AI Intelligence, Activity Timeline
  - View switcher in header for easy navigation
  - Integration of all new components
  - Responsive layout for different screen sizes
  - Preserved existing components (PipelineFunnel, DealTable, WinLossChart)
  - Context-aware deal selection across views

## API Integration Points

The components expect the following API endpoints (to be implemented in backend):

1. `/api/revenue/deals-enhanced` - Enhanced deal data with timeline and health metrics
2. `/api/revenue/ai-insights` - AI-generated insights and recommendations
3. `/api/revenue/competitive-intelligence` - Competitor mention analysis
4. `/api/revenue/deals/:dealId/stage` - Update deal stage
5. `/api/revenue/deals/:dealId/recommendations` - Deal-specific AI recommendations

## Dependencies Added

- `@dnd-kit/core`: ^6.3.1 - Core drag and drop functionality
- `@dnd-kit/sortable`: ^10.0.0 - Sortable functionality for kanban
- `@dnd-kit/utilities`: ^3.2.2 - Utility functions for DnD

## Existing Dependencies Used

- `date-fns`: For date formatting and distance calculations
- `next-auth/react`: For session management and authentication
- `react`: Core React functionality

## TypeScript Interfaces

All components include comprehensive TypeScript interfaces for:
- Deal structure with 15+ properties
- Activity entries with type safety
- Competitor mentions with context
- AI insights with priority levels
- Pipeline stages with conversion metrics

## Testing

Created comprehensive test suite in `__tests__/revenue-intelligence.test.tsx` covering:
- Component rendering
- Data display
- User interactions
- Edge cases

## Performance Optimizations

- Memoized calculations using `useMemo`
- Optimistic UI updates for drag-and-drop
- Debounced API calls
- Virtual scrolling for large datasets (ready to implement)
- Lazy loading for timeline activities

## Accessibility Features

- Keyboard navigation support in kanban board
- ARIA labels for screen readers
- Color contrast compliant indicators
- Focus management for modals

## Future Enhancements

Ready for:
- Real-time WebSocket updates
- Advanced filtering and search
- Export functionality
- Custom stage configuration
- Deal velocity tracking
- Revenue forecasting integration
- Team collaboration features
- Mobile responsive improvements

## Usage

```tsx
import { PipelineKanban } from '@/components/revenue/PipelineKanban';
import { useRevenueIntelligence } from '@/hooks/useRevenueIntelligence';

function MyComponent() {
  const { deals, updateDealStage } = useRevenueIntelligence();

  return (
    <PipelineKanban
      deals={deals}
      onDealMove={updateDealStage}
      onDealSelect={handleDealSelect}
    />
  );
}
```