# Meeting Insights Panel - Quick Start Guide

## Installation

The components are already installed and ready to use. No additional dependencies needed.

## Basic Usage

### 1. Import the Main Component

```tsx
import { MeetingInsightsPanel } from '@/components/analytics';
```

### 2. Prepare Your Data

```tsx
// Fetch from your API
const meetingData = await fetch(`/api/meetings/${meetingId}/analytics`);

// Or use sample data for testing
import { MeetingInsightsExample } from '@/components/analytics/MeetingInsightsExample';
```

### 3. Render the Component

```tsx
export default function MeetingAnalyticsPage({ meetingId }: { meetingId: string }) {
  const {
    insights,
    speakerData,
    sentimentData,
    topicData,
    questions,
    engagementData,
    duration
  } = useMeetingAnalytics(meetingId);

  return (
    <MeetingInsightsPanel
      meetingId={meetingId}
      insights={insights}
      speakerData={speakerData}
      sentimentData={sentimentData}
      topicData={topicData}
      questions={questions}
      engagementData={engagementData}
      duration={duration}
    />
  );
}
```

## Data Format Examples

### Insights Data
```typescript
const insights: Insight[] = [
  {
    type: 'success', // 'success' | 'warning' | 'info' | 'tip'
    title: 'Excellent Engagement',
    description: 'All participants actively contributed',
    metric: '92/100' // Optional
  }
];
```

### Speaker Data
```typescript
const speakerData: SpeakerData[] = [
  {
    speaker: 'John Smith',
    talkTime: 1200,          // seconds
    wordCount: 2400,
    talkTimePercentage: 35   // calculated percentage
  }
];
```

### Sentiment Data
```typescript
const sentimentData: SentimentData[] = [
  {
    timestamp: 120,          // seconds from start
    sentiment: 0.6,          // -1 to 1 range
    speaker: 'Sarah Johnson',
    text: 'Great to see the progress'
  }
];
```

### Topic Data
```typescript
const topicData: TopicData[] = [
  {
    topic: 'Product Roadmap',
    count: 15,               // number of mentions
    duration: 900,           // seconds spent
    segments: [
      {
        timestamp: 120,
        text: 'Let us review the roadmap'
      }
    ]
  }
];
```

### Questions Data
```typescript
const questions: Question[] = [
  {
    id: 'q1',
    speaker: 'Emily Davis',
    question: 'What is the timeline?',
    timestamp: 300,
    answered: true,
    answerSnippet: 'End of Q2',  // if answered
    answerTimestamp: 360          // if answered
  }
];
```

### Engagement Data
```typescript
const engagementData: EngagementData = {
  overallScore: 85,            // 0-100
  participationBalance: 78,    // 0-100
  questionRate: 88,            // 0-100
  interactionLevel: 92,        // 0-100
  comparisonToPrevious: {      // optional
    change: 12.5,
    trend: 'up'                // 'up' | 'down' | 'stable'
  }
};
```

## Using Individual Components

### TalkTimeChart
```tsx
import { TalkTimeChart } from '@/components/analytics';

<TalkTimeChart
  speakerData={speakerData}
  onSpeakerClick={(speaker) => filterTranscript(speaker)}
/>
```

### SentimentTimeline
```tsx
import { SentimentTimeline } from '@/components/analytics';

<SentimentTimeline
  data={sentimentData}
  duration={duration}
  onMomentClick={(timestamp) => seekToTimestamp(timestamp)}
/>
```

### TopicBreakdown
```tsx
import { TopicBreakdown } from '@/components/analytics';

<TopicBreakdown
  topics={topicData}
  onTopicClick={(topic) => filterByTopic(topic)}
/>
```

### QuestionAnalysis
```tsx
import { QuestionAnalysis } from '@/components/analytics';

<QuestionAnalysis
  questions={questions}
  onQuestionClick={(timestamp) => jumpToQuestion(timestamp)}
/>
```

### EngagementScore
```tsx
import { EngagementScore } from '@/components/analytics';

<EngagementScore
  data={engagementData}
  detailed={true}  // shows full breakdown
/>
```

## API Endpoints to Implement

Create these endpoints to fetch real data:

```typescript
// GET /api/meetings/:id/analytics
{
  insights: Insight[],
  duration: number
}

// GET /api/meetings/:id/speakers
{
  speakers: SpeakerData[]
}

// GET /api/meetings/:id/sentiment
{
  sentiment: SentimentData[]
}

// GET /api/meetings/:id/topics
{
  topics: TopicData[]
}

// GET /api/meetings/:id/questions
{
  questions: Question[]
}

// GET /api/meetings/:id/engagement
{
  engagement: EngagementData
}
```

## Styling Customization

### Using Tailwind Classes
```tsx
<MeetingInsightsPanel
  className="max-w-7xl mx-auto"
  // ... props
/>
```

### Custom Theme Colors
Override the default colors in your Tailwind config:

```js
// tailwind.config.js
module.exports = {
  theme: {
    extend: {
      colors: {
        'brand-purple': '#7a5af8',
        // ... your custom colors
      }
    }
  }
}
```

## Error Handling

```tsx
function MeetingAnalytics({ meetingId }: { meetingId: string }) {
  const { data, error, isLoading } = useMeetingAnalytics(meetingId);

  if (isLoading) {
    return <LoadingSpinner />;
  }

  if (error) {
    return <ErrorMessage error={error} />;
  }

  if (!data) {
    return <EmptyState message="No analytics available" />;
  }

  return <MeetingInsightsPanel {...data} />;
}
```

## Loading States

```tsx
<Suspense fallback={<AnalyticsSkeleton />}>
  <MeetingInsightsPanel {...props} />
</Suspense>
```

## Testing

### Unit Test Example
```tsx
import { render, screen } from '@testing-library/react';
import { TalkTimeChart } from '@/components/analytics';

describe('TalkTimeChart', () => {
  it('renders speaker data correctly', () => {
    const speakerData = [
      { speaker: 'John', talkTime: 600, wordCount: 1200, talkTimePercentage: 50 }
    ];

    render(<TalkTimeChart speakerData={speakerData} />);

    expect(screen.getByText('John')).toBeInTheDocument();
    expect(screen.getByText('50%')).toBeInTheDocument();
  });
});
```

## Performance Tips

### 1. Memoize Expensive Calculations
```tsx
const chartData = useMemo(() => {
  return processChartData(rawData);
}, [rawData]);
```

### 2. Virtualize Long Lists
```tsx
import { FixedSizeList } from 'react-window';

// For long question lists
<FixedSizeList
  height={600}
  itemCount={questions.length}
  itemSize={100}
>
  {QuestionRow}
</FixedSizeList>
```

### 3. Lazy Load Charts
```tsx
const TalkTimeChart = lazy(() => import('./TalkTimeChart'));

<Suspense fallback={<ChartSkeleton />}>
  <TalkTimeChart {...props} />
</Suspense>
```

## Common Patterns

### With React Query
```tsx
function MeetingAnalytics({ meetingId }: { meetingId: string }) {
  const { data } = useQuery({
    queryKey: ['meeting-analytics', meetingId],
    queryFn: () => fetchMeetingAnalytics(meetingId)
  });

  return <MeetingInsightsPanel {...data} />;
}
```

### With Redux
```tsx
function MeetingAnalytics({ meetingId }: { meetingId: string }) {
  const dispatch = useDispatch();
  const analytics = useSelector(selectMeetingAnalytics);

  useEffect(() => {
    dispatch(fetchAnalytics(meetingId));
  }, [meetingId]);

  return <MeetingInsightsPanel {...analytics} />;
}
```

### With Context
```tsx
const AnalyticsContext = createContext();

function MeetingAnalyticsProvider({ children, meetingId }) {
  const [analytics, setAnalytics] = useState(null);

  useEffect(() => {
    loadAnalytics(meetingId).then(setAnalytics);
  }, [meetingId]);

  return (
    <AnalyticsContext.Provider value={analytics}>
      {children}
    </AnalyticsContext.Provider>
  );
}

function MeetingInsightsView() {
  const analytics = useContext(AnalyticsContext);
  return <MeetingInsightsPanel {...analytics} />;
}
```

## Troubleshooting

### Charts Not Rendering
1. Check if Recharts is installed: `npm list recharts`
2. Verify data format matches expected interface
3. Check console for errors

### TypeScript Errors
1. Ensure all required props are provided
2. Check data types match interface definitions
3. Import types: `import type { SpeakerData } from '@/components/analytics'`

### Performance Issues
1. Reduce number of data points (sample large datasets)
2. Implement pagination for long lists
3. Use React.memo for child components
4. Debounce search/filter inputs

## Next Steps

1. **Connect to Backend:** Implement API endpoints
2. **Real Data:** Replace sample data with actual meeting analytics
3. **Export Features:** Add PDF/CSV export functionality
4. **Real-time Updates:** Implement WebSocket for live data
5. **User Preferences:** Save user's preferred view/filters

## Support & Resources

- **Documentation:** `/home/user/openmeet/MEETING_INSIGHTS_IMPLEMENTATION.md`
- **Visual Guide:** `/home/user/openmeet/ANALYTICS_VISUAL_GUIDE.md`
- **Example Usage:** `apps/web/src/components/analytics/MeetingInsightsExample.tsx`

## Quick Reference

### Props at a Glance
| Component | Required Props | Optional Props |
|-----------|---------------|----------------|
| MeetingInsightsPanel | meetingId | insights, speakerData, etc. |
| TalkTimeChart | speakerData | onSpeakerClick |
| SentimentTimeline | data, duration | onMomentClick |
| TopicBreakdown | topics | onTopicClick |
| QuestionAnalysis | questions | onQuestionClick |
| EngagementScore | data | detailed |

### Color Variables
- `--ff-purple-500`: #7a5af8
- `--ff-teal-500`: #14b8a6
- `--ff-blue-500`: #3b82f6
- `--ff-green-500`: #22c55e
- `--ff-amber-500`: #f59e0b
- `--ff-red-500`: #ef4444

That's it! You're ready to use the Meeting Insights Panel in your application.
