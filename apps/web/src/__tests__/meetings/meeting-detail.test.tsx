/**
 * Meeting Detail Page Tests
 * Tests for meeting detail page with transcript
 */

import { render, screen, waitFor, fireEvent } from '@testing-library/react';
import { useRouter, useParams } from 'next/navigation';
import MeetingDetailPage from '@/app/(dashboard)/meetings/[id]/page';
import { useAuth } from '@/contexts/AuthContext';
import apiClient from '@/lib/api';

// Mock dependencies
jest.mock('next/navigation', () => ({
  useRouter: jest.fn(),
  useParams: jest.fn(),
}));

jest.mock('@/contexts/AuthContext', () => ({
  useAuth: jest.fn(),
}));

jest.mock('@/lib/api', () => ({
  default: {
    getMeetingDetail: jest.fn(),
    downloadTranscript: jest.fn(),
  },
}));

jest.mock('@/hooks/useSyncedPlayback', () => ({
  useSyncedPlayback: () => ({
    currentSegment: null,
    seekToSegment: jest.fn(),
    activeSegmentIndex: 0,
  }),
}));

// Mock components
jest.mock('@/components/meetings/MeetingPlayer', () => ({
  MeetingPlayer: ({ onTimeUpdate }: any) => (
    <div data-testid="meeting-player" onClick={() => onTimeUpdate(30)}>
      Meeting Player
    </div>
  ),
}));

jest.mock('@/components/meetings/SyncedTranscript', () => ({
  SyncedTranscript: ({ segments }: any) => (
    <div data-testid="synced-transcript">
      Transcript segments: {segments.length}
    </div>
  ),
}));

jest.mock('@/components/meetings/MeetingTabs', () => ({
  MeetingTabs: ({ activeTab, onTabChange, counts }: any) => (
    <div data-testid="meeting-tabs">
      <button onClick={() => onTabChange('transcript')}>Transcript</button>
      <button onClick={() => onTabChange('summary')}>Summary</button>
      <button onClick={() => onTabChange('action-items')}>
        Action Items ({counts.actionItems})
      </button>
      <button onClick={() => onTabChange('insights')}>Insights</button>
    </div>
  ),
  TabType: {},
}));

describe('MeetingDetailPage', () => {
  const mockRouter = {
    push: jest.fn(),
  };

  const mockUser = {
    id: 'user-123',
    email: 'test@example.com',
    name: 'Test User',
  };

  const mockMeeting = {
    id: 'meeting-1',
    title: 'Product Team Standup',
    scheduledStartAt: '2024-01-15T10:00:00Z',
    scheduledEndAt: '2024-01-15T10:30:00Z',
    actualStartAt: '2024-01-15T10:02:00Z',
    actualEndAt: '2024-01-15T10:28:00Z',
    duration: 1800,
    status: 'completed',
    platform: 'zoom',
    meetingUrl: 'https://zoom.us/j/123456',
    recordingUrl: 'https://example.com/recording.mp4',
    attendees: [
      {
        id: 'att-1',
        name: 'John Doe',
        email: 'john@example.com',
        role: 'host',
        speakingTime: 600,
      },
      {
        id: 'att-2',
        name: 'Jane Smith',
        email: 'jane@example.com',
        role: 'participant',
        speakingTime: 400,
      },
    ],
    transcript: {
      id: 'transcript-1',
      segments: [
        {
          id: 'seg-1',
          speaker: 'John Doe',
          text: 'Welcome everyone to our standup meeting.',
          startTime: 0,
          endTime: 5,
          confidence: 0.95,
        },
        {
          id: 'seg-2',
          speaker: 'Jane Smith',
          text: 'Thanks John. I completed the dashboard feature yesterday.',
          startTime: 5,
          endTime: 10,
          confidence: 0.92,
        },
      ],
      wordCount: 1500,
      language: 'en',
    },
    analysis: {
      summary: 'Team discussed project updates and next steps.',
      keyPoints: [
        'Dashboard feature completed',
        'API integration in progress',
        'Testing phase starting next week',
      ],
      actionItems: [
        {
          id: 'action-1',
          description: 'Review dashboard design with design team',
          assignee: 'John Doe',
          dueDate: '2024-01-20T00:00:00Z',
          priority: 'high',
          status: 'pending',
        },
        {
          id: 'action-2',
          description: 'Set up testing environment',
          assignee: 'Jane Smith',
          dueDate: '2024-01-18T00:00:00Z',
          priority: 'medium',
          status: 'in_progress',
        },
      ],
      sentiment: 0.7,
      topics: [
        { name: 'Product Development', relevance: 0.9, mentions: 8 },
        { name: 'Testing', relevance: 0.7, mentions: 5 },
        { name: 'Design Review', relevance: 0.6, mentions: 3 },
      ],
      nextSteps: ['Complete API integration', 'Prepare for testing phase'],
      decisions: ['Launch feature beta next Monday', 'Extend testing period to 2 weeks'],
    },
    recording: {
      id: 'rec-1',
      url: 'https://example.com/recording.mp4',
      duration: 1680,
      size: 250000000,
    },
  };

  beforeEach(() => {
    jest.clearAllMocks();
    (useRouter as jest.Mock).mockReturnValue(mockRouter);
    (useParams as jest.Mock).mockReturnValue({ id: 'meeting-1' });
  });

  test('redirects to login when user is not authenticated', async () => {
    (useAuth as jest.Mock).mockReturnValue({
      user: null,
      isLoading: false,
    });

    render(<MeetingDetailPage />);

    await waitFor(() => {
      expect(mockRouter.push).toHaveBeenCalledWith('/login');
    });
  });

  test('displays loading state while fetching meeting details', () => {
    (useAuth as jest.Mock).mockReturnValue({
      user: mockUser,
      isLoading: true,
    });

    render(<MeetingDetailPage />);

    const loadingIndicator = document.querySelector('.animate-spin');
    expect(loadingIndicator).toBeInTheDocument();
  });

  test('displays error state when meeting not found', async () => {
    (useAuth as jest.Mock).mockReturnValue({
      user: mockUser,
      isLoading: false,
    });

    (apiClient.getMeetingDetail as jest.Mock).mockResolvedValue(null);

    render(<MeetingDetailPage />);

    await waitFor(() => {
      expect(screen.getByText('Meeting not found')).toBeInTheDocument();
      expect(screen.getByText('Back to Meetings')).toBeInTheDocument();
    });
  });

  test('displays meeting details correctly', async () => {
    (useAuth as jest.Mock).mockReturnValue({
      user: mockUser,
      isLoading: false,
    });

    (apiClient.getMeetingDetail as jest.Mock).mockResolvedValue(mockMeeting);

    render(<MeetingDetailPage />);

    await waitFor(() => {
      expect(screen.getByText('Product Team Standup')).toBeInTheDocument();
      expect(screen.getByText('2 attendees')).toBeInTheDocument();
      expect(screen.getByTestId('meeting-player')).toBeInTheDocument();
      expect(screen.getByTestId('meeting-tabs')).toBeInTheDocument();
    });
  });

  test('handles transcript tab display', async () => {
    (useAuth as jest.Mock).mockReturnValue({
      user: mockUser,
      isLoading: false,
    });

    (apiClient.getMeetingDetail as jest.Mock).mockResolvedValue(mockMeeting);

    render(<MeetingDetailPage />);

    await waitFor(() => {
      expect(screen.getByTestId('synced-transcript')).toBeInTheDocument();
      expect(screen.getByText('Transcript segments: 2')).toBeInTheDocument();
    });
  });

  test('handles tab switching', async () => {
    (useAuth as jest.Mock).mockReturnValue({
      user: mockUser,
      isLoading: false,
    });

    (apiClient.getMeetingDetail as jest.Mock).mockResolvedValue(mockMeeting);

    render(<MeetingDetailPage />);

    await waitFor(() => {
      expect(screen.getByTestId('meeting-tabs')).toBeInTheDocument();
    });

    // Switch to summary tab
    const summaryButton = screen.getByText('Summary');
    fireEvent.click(summaryButton);

    await waitFor(() => {
      expect(screen.getByText('Team discussed project updates and next steps.')).toBeInTheDocument();
      expect(screen.getByText('Dashboard feature completed')).toBeInTheDocument();
    });
  });

  test('displays action items correctly', async () => {
    (useAuth as jest.Mock).mockReturnValue({
      user: mockUser,
      isLoading: false,
    });

    (apiClient.getMeetingDetail as jest.Mock).mockResolvedValue(mockMeeting);

    render(<MeetingDetailPage />);

    await waitFor(() => {
      const actionItemsButton = screen.getByText(/Action Items \(2\)/);
      fireEvent.click(actionItemsButton);
    });

    await waitFor(() => {
      expect(screen.getByText('Review dashboard design with design team')).toBeInTheDocument();
      expect(screen.getByText('Set up testing environment')).toBeInTheDocument();
      expect(screen.getByText('Assigned to: John Doe')).toBeInTheDocument();
    });
  });

  test('handles transcript download', async () => {
    (useAuth as jest.Mock).mockReturnValue({
      user: mockUser,
      isLoading: false,
    });

    (apiClient.getMeetingDetail as jest.Mock).mockResolvedValue(mockMeeting);
    (apiClient.downloadTranscript as jest.Mock).mockResolvedValue('pdf content');

    // Mock URL.createObjectURL and document.createElement
    const originalCreateObjectURL = window.URL.createObjectURL;
    const originalCreateElement = document.createElement.bind(document);

    window.URL.createObjectURL = jest.fn(() => 'blob:url');
    const mockClick = jest.fn();
    document.createElement = jest.fn((tag) => {
      const element = originalCreateElement(tag);
      if (tag === 'a') {
        element.click = mockClick;
      }
      return element;
    });

    render(<MeetingDetailPage />);

    await waitFor(() => {
      expect(screen.getByText('Download')).toBeInTheDocument();
    });

    const downloadButton = screen.getByText('Download');
    fireEvent.click(downloadButton);

    await waitFor(() => {
      expect(apiClient.downloadTranscript).toHaveBeenCalledWith('meeting-1', 'pdf');
      expect(mockClick).toHaveBeenCalled();
    });

    window.URL.createObjectURL = originalCreateObjectURL;
    document.createElement = originalCreateElement;
  });

  test('handles share functionality', async () => {
    (useAuth as jest.Mock).mockReturnValue({
      user: mockUser,
      isLoading: false,
    });

    (apiClient.getMeetingDetail as jest.Mock).mockResolvedValue(mockMeeting);

    // Mock clipboard API
    Object.assign(navigator, {
      clipboard: {
        writeText: jest.fn(),
      },
    });

    render(<MeetingDetailPage />);

    await waitFor(() => {
      expect(screen.getByText('Share')).toBeInTheDocument();
    });

    const shareButton = screen.getByText('Share');
    fireEvent.click(shareButton);

    await waitFor(() => {
      expect(navigator.clipboard.writeText).toHaveBeenCalledWith(
        expect.stringContaining('/meetings/meeting-1/shared')
      );
    });
  });

  test('displays insights tab with sentiment analysis', async () => {
    (useAuth as jest.Mock).mockReturnValue({
      user: mockUser,
      isLoading: false,
    });

    (apiClient.getMeetingDetail as jest.Mock).mockResolvedValue(mockMeeting);

    render(<MeetingDetailPage />);

    await waitFor(() => {
      const insightsButton = screen.getByText('Insights');
      fireEvent.click(insightsButton);
    });

    await waitFor(() => {
      expect(screen.getByText('Sentiment Analysis')).toBeInTheDocument();
      expect(screen.getByText('Topics Discussed')).toBeInTheDocument();
      expect(screen.getByText('Product Development')).toBeInTheDocument();
      expect(screen.getByText('8 mentions')).toBeInTheDocument();
    });
  });

  test('displays participant speaking time', async () => {
    (useAuth as jest.Mock).mockReturnValue({
      user: mockUser,
      isLoading: false,
    });

    (apiClient.getMeetingDetail as jest.Mock).mockResolvedValue(mockMeeting);

    render(<MeetingDetailPage />);

    await waitFor(() => {
      const insightsButton = screen.getByText('Insights');
      fireEvent.click(insightsButton);
    });

    await waitFor(() => {
      expect(screen.getByText('Participation')).toBeInTheDocument();
      expect(screen.getByText('John Doe')).toBeInTheDocument();
      expect(screen.getByText('Jane Smith')).toBeInTheDocument();
    });
  });

  test('handles time update from video player', async () => {
    (useAuth as jest.Mock).mockReturnValue({
      user: mockUser,
      isLoading: false,
    });

    (apiClient.getMeetingDetail as jest.Mock).mockResolvedValue(mockMeeting);

    render(<MeetingDetailPage />);

    await waitFor(() => {
      expect(screen.getByTestId('meeting-player')).toBeInTheDocument();
    });

    const player = screen.getByTestId('meeting-player');
    fireEvent.click(player);

    // Time update handled internally by component
    // This test verifies the player can trigger time updates
  });

  test('displays key decisions and next steps', async () => {
    (useAuth as jest.Mock).mockReturnValue({
      user: mockUser,
      isLoading: false,
    });

    (apiClient.getMeetingDetail as jest.Mock).mockResolvedValue(mockMeeting);

    render(<MeetingDetailPage />);

    await waitFor(() => {
      const summaryButton = screen.getByText('Summary');
      fireEvent.click(summaryButton);
    });

    await waitFor(() => {
      expect(screen.getByText('Decisions Made')).toBeInTheDocument();
      expect(screen.getByText('Launch feature beta next Monday')).toBeInTheDocument();
      expect(screen.getByText('Next Steps')).toBeInTheDocument();
      expect(screen.getByText('Complete API integration')).toBeInTheDocument();
    });
  });
});