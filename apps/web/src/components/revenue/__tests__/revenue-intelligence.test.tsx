import { describe, it, expect, vi } from 'vitest';
import { render, screen, waitFor } from '@testing-library/react';
import { SessionProvider } from 'next-auth/react';
import { PipelineKanban } from '../PipelineKanban';
import { DealTimeline } from '../DealTimeline';
import { CompetitorMentions } from '../CompetitorMentions';
import { NextStepsAI } from '../NextStepsAI';
import { DealHealthScore } from '../DealHealthScore';
import { Deal, ActivityEntry, CompetitorMention, AIInsight } from '@/hooks/useRevenueIntelligence';

// Mock next-auth
vi.mock('next-auth/react', () => ({
  SessionProvider: ({ children }: { children: React.ReactNode }) => children,
  useSession: () => ({
    data: {
      user: {
        accessToken: 'test-token',
        email: 'test@example.com',
      },
    },
    status: 'authenticated',
  }),
}));

// Mock sample data
const mockDeal: Deal = {
  id: 'deal-1',
  name: 'Enterprise Deal',
  company: 'Acme Corp',
  value: 150000,
  stage: 'proposal',
  probability: 60,
  expectedCloseDate: '2024-03-01',
  owner: 'John Doe',
  lastActivity: '2024-01-15T10:00:00Z',
  healthScore: 75,
  nextSteps: ['Schedule demo', 'Send proposal'],
  competitors: ['Competitor A', 'Competitor B'],
  timeline: [],
  objections: ['Price concern', 'Integration complexity'],
  engagementLevel: 'medium',
  crmSynced: true,
  daysInStage: 15,
  sentiment: 'positive',
};

const mockActivities: ActivityEntry[] = [
  {
    id: 'activity-1',
    date: '2024-01-15T10:00:00Z',
    type: 'meeting',
    description: 'Discovery call with stakeholders',
    sentiment: 'positive',
    participants: ['John Doe', 'Jane Smith'],
  },
  {
    id: 'activity-2',
    date: '2024-01-14T14:00:00Z',
    type: 'competitor_mention',
    description: 'Client mentioned they are also evaluating Competitor A',
    sentiment: 'neutral',
  },
];

const mockCompetitors: CompetitorMention[] = [
  {
    competitor: 'Competitor A',
    count: 5,
    sentiment: 'negative',
    lastMentioned: '2024-01-14T14:00:00Z',
    context: ['Better pricing', 'More features'],
  },
  {
    competitor: 'Competitor B',
    count: 2,
    sentiment: 'neutral',
    lastMentioned: '2024-01-10T10:00:00Z',
    context: ['Similar solution'],
  },
];

const mockInsights: AIInsight[] = [
  {
    id: 'insight-1',
    type: 'next_step',
    priority: 'high',
    title: 'Schedule Technical Demo',
    description: 'Based on the recent discovery call, the client expressed interest in seeing a technical demo.',
    recommendation: 'Schedule a 1-hour technical demo focusing on integration capabilities within the next 3 days.',
    dealId: 'deal-1',
  },
  {
    id: 'insight-2',
    type: 'risk',
    priority: 'medium',
    title: 'Competitor Threat Detected',
    description: 'Multiple mentions of Competitor A indicate they are a serious contender.',
    recommendation: 'Prepare competitive differentiation document and address pricing concerns proactively.',
  },
];

describe('Revenue Intelligence Components', () => {
  describe('PipelineKanban', () => {
    it('renders pipeline stages correctly', () => {
      const { container } = render(
        <PipelineKanban
          deals={[mockDeal]}
          onDealMove={vi.fn()}
          onDealSelect={vi.fn()}
        />
      );

      // Check for stage columns
      expect(container.textContent).toContain('Discovery');
      expect(container.textContent).toContain('Qualification');
      expect(container.textContent).toContain('Proposal');
      expect(container.textContent).toContain('Negotiation');
      expect(container.textContent).toContain('Closed Won');
      expect(container.textContent).toContain('Closed Lost');
    });

    it('displays deal cards with correct information', () => {
      const { container } = render(
        <PipelineKanban
          deals={[mockDeal]}
          onDealMove={vi.fn()}
          onDealSelect={vi.fn()}
        />
      );

      expect(container.textContent).toContain('Enterprise Deal');
      expect(container.textContent).toContain('Acme Corp');
      expect(container.textContent).toContain('$150k');
      expect(container.textContent).toContain('75%');
    });
  });

  describe('DealTimeline', () => {
    it('renders activity timeline correctly', () => {
      const { container } = render(
        <DealTimeline
          activities={mockActivities}
          onActivityClick={vi.fn()}
        />
      );

      expect(container.textContent).toContain('Discovery call with stakeholders');
      expect(container.textContent).toContain('Client mentioned they are also evaluating Competitor A');
    });

    it('displays activity types and sentiments', () => {
      const { container } = render(
        <DealTimeline
          activities={mockActivities}
          onActivityClick={vi.fn()}
        />
      );

      expect(container.textContent).toContain('Meeting');
      expect(container.textContent).toContain('Competitor Mention');
      expect(container.textContent).toContain('positive');
      expect(container.textContent).toContain('neutral');
    });
  });

  describe('CompetitorMentions', () => {
    it('renders competitor information correctly', () => {
      const { container } = render(
        <CompetitorMentions
          competitors={mockCompetitors}
          onCompetitorClick={vi.fn()}
        />
      );

      expect(container.textContent).toContain('Competitor A');
      expect(container.textContent).toContain('Competitor B');
      expect(container.textContent).toContain('5');
      expect(container.textContent).toContain('2');
    });

    it('displays sentiment analysis', () => {
      const { container } = render(
        <CompetitorMentions
          competitors={mockCompetitors}
          onCompetitorClick={vi.fn()}
        />
      );

      expect(container.textContent).toContain('negative');
      expect(container.textContent).toContain('neutral');
    });
  });

  describe('NextStepsAI', () => {
    it('renders AI insights correctly', () => {
      const { container } = render(
        <NextStepsAI
          insights={mockInsights}
          deals={[mockDeal]}
          onInsightAction={vi.fn()}
          onRefresh={vi.fn()}
        />
      );

      expect(container.textContent).toContain('Schedule Technical Demo');
      expect(container.textContent).toContain('Competitor Threat Detected');
    });

    it('displays priority levels', () => {
      const { container } = render(
        <NextStepsAI
          insights={mockInsights}
          deals={[mockDeal]}
          onInsightAction={vi.fn()}
          onRefresh={vi.fn()}
        />
      );

      expect(container.textContent).toContain('high');
      expect(container.textContent).toContain('medium');
    });

    it('shows recommendations', () => {
      const { container } = render(
        <NextStepsAI
          insights={mockInsights}
          deals={[mockDeal]}
          onInsightAction={vi.fn()}
          onRefresh={vi.fn()}
        />
      );

      expect(container.textContent).toContain('Schedule a 1-hour technical demo');
      expect(container.textContent).toContain('Prepare competitive differentiation document');
    });
  });

  describe('DealHealthScore', () => {
    it('renders health score correctly', () => {
      const { container } = render(
        <DealHealthScore
          deal={mockDeal}
          detailed={true}
          onMetricClick={vi.fn()}
        />
      );

      expect(container.textContent).toContain('Enterprise Deal');
      expect(container.textContent).toContain('Acme Corp');
      expect(container.textContent).toContain('Score');
    });

    it('displays health metrics', () => {
      const { container } = render(
        <DealHealthScore
          deal={mockDeal}
          detailed={true}
          onMetricClick={vi.fn()}
        />
      );

      expect(container.textContent).toContain('Stage Duration');
      expect(container.textContent).toContain('Engagement Level');
      expect(container.textContent).toContain('Competitive Landscape');
      expect(container.textContent).toContain('Objection Management');
      expect(container.textContent).toContain('Overall Sentiment');
      expect(container.textContent).toContain('Timeline Risk');
    });

    it('shows deal value and probability', () => {
      const { container } = render(
        <DealHealthScore
          deal={mockDeal}
          detailed={false}
          onMetricClick={vi.fn()}
        />
      );

      expect(container.textContent).toContain('$150k');
      expect(container.textContent).toContain('60%');
    });
  });
});