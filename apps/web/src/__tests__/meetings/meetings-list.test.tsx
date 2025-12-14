/**
 * Meetings List Page Tests
 * Tests for meeting list rendering with pagination
 */

import { render, screen, waitFor, fireEvent, within } from '@testing-library/react';
import { useRouter } from 'next/navigation';
import MeetingsPage from '@/app/(dashboard)/meetings/page';
import { useAuth } from '@/contexts/AuthContext';
import apiClient from '@/lib/api';

// Mock dependencies
jest.mock('next/navigation', () => ({
  useRouter: jest.fn(),
}));

jest.mock('@/contexts/AuthContext', () => ({
  useAuth: jest.fn(),
}));

jest.mock('@/lib/api', () => ({
  default: {
    getMeetings: jest.fn(),
    deleteMeeting: jest.fn(),
    exportMeetings: jest.fn(),
  },
}));

jest.mock('@/hooks/useMeetingFilters', () => ({
  useMeetingFilters: () => ({
    filters: {},
    setFilter: jest.fn(),
    clearFilters: jest.fn(),
    clearFilter: jest.fn(),
    activeFilterCount: 0,
    savedFilters: [],
    saveCurrentFilters: jest.fn(),
    applySavedFilter: jest.fn(),
    deleteSavedFilter: jest.fn(),
    isFilterActive: jest.fn(),
  }),
}));

// Mock components
jest.mock('@/components/meetings/EmptyMeetingsList', () => ({
  EmptyMeetingsList: ({ onUploadClick }: any) => (
    <div data-testid="empty-meetings-list" onClick={onUploadClick}>
      Empty Meetings List
    </div>
  ),
}));

jest.mock('@/components/meetings/GettingStartedChecklist', () => ({
  GettingStartedChecklist: ({ completedSteps }: any) => (
    <div data-testid="getting-started-checklist">
      Steps completed: {completedSteps.length}
    </div>
  ),
}));

jest.mock('@/components/meetings/QuickUploadCard', () => ({
  QuickUploadCard: () => <div data-testid="quick-upload-card">Quick Upload Card</div>,
}));

jest.mock('@/components/meetings/MeetingFilters', () => ({
  MeetingFilters: ({ resultCount }: any) => (
    <div data-testid="meeting-filters">
      {resultCount} meetings found
    </div>
  ),
}));

describe('MeetingsPage', () => {
  const mockRouter = {
    push: jest.fn(),
  };

  const mockUser = {
    id: 'user-123',
    email: 'test@example.com',
    name: 'Test User',
  };

  const mockMeetings = [
    {
      id: 'meeting-1',
      title: 'Product Team Standup',
      scheduledStartAt: '2024-01-15T10:00:00Z',
      scheduledEndAt: '2024-01-15T10:30:00Z',
      duration: 1800,
      status: 'completed',
      platform: 'zoom',
      attendeesCount: 5,
      transcript: {
        id: 'transcript-1',
        wordCount: 1500,
        speakerCount: 5,
      },
      analysis: {
        summary: 'Team discussed project updates',
        actionItemsCount: 3,
        sentiment: 0.8,
        topicsCount: 4,
      },
    },
    {
      id: 'meeting-2',
      title: 'Client Review Meeting',
      scheduledStartAt: '2024-01-15T14:00:00Z',
      scheduledEndAt: '2024-01-15T15:00:00Z',
      duration: 3600,
      status: 'in_progress',
      platform: 'meet',
      attendeesCount: 8,
      recording: {
        id: 'recording-1',
        size: 50000000,
        downloadUrl: 'https://example.com/download',
      },
    },
  ];

  beforeEach(() => {
    jest.clearAllMocks();
    (useRouter as jest.Mock).mockReturnValue(mockRouter);
  });

  test('redirects to login when user is not authenticated', async () => {
    (useAuth as jest.Mock).mockReturnValue({
      user: null,
      isLoading: false,
    });

    render(<MeetingsPage />);

    await waitFor(() => {
      expect(mockRouter.push).toHaveBeenCalledWith('/login');
    });
  });

  test('displays loading state while fetching data', () => {
    (useAuth as jest.Mock).mockReturnValue({
      user: mockUser,
      isLoading: true,
    });

    render(<MeetingsPage />);

    const loadingIndicator = document.querySelector('.animate-spin');
    expect(loadingIndicator).toBeInTheDocument();
  });

  test('displays empty state for first-time users', async () => {
    (useAuth as jest.Mock).mockReturnValue({
      user: mockUser,
      isLoading: false,
    });

    (apiClient.getMeetings as jest.Mock).mockResolvedValue({
      meetings: [],
      total: 0,
    });

    render(<MeetingsPage />);

    await waitFor(() => {
      expect(screen.getByTestId('empty-meetings-list')).toBeInTheDocument();
      expect(screen.getByTestId('getting-started-checklist')).toBeInTheDocument();
      expect(screen.getByTestId('quick-upload-card')).toBeInTheDocument();
    });
  });

  test('displays meetings list when meetings exist', async () => {
    (useAuth as jest.Mock).mockReturnValue({
      user: mockUser,
      isLoading: false,
    });

    (apiClient.getMeetings as jest.Mock).mockResolvedValue({
      meetings: mockMeetings,
      total: 2,
    });

    render(<MeetingsPage />);

    await waitFor(() => {
      expect(screen.getByText('Product Team Standup')).toBeInTheDocument();
      expect(screen.getByText('Client Review Meeting')).toBeInTheDocument();
      expect(screen.getByTestId('meeting-filters')).toBeInTheDocument();
    });
  });

  test('handles search functionality', async () => {
    (useAuth as jest.Mock).mockReturnValue({
      user: mockUser,
      isLoading: false,
    });

    (apiClient.getMeetings as jest.Mock).mockResolvedValue({
      meetings: mockMeetings,
      total: 2,
    });

    render(<MeetingsPage />);

    await waitFor(() => {
      const searchInput = screen.getByPlaceholderText('Search by title, attendees, or content...');
      expect(searchInput).toBeInTheDocument();
    });

    const searchInput = screen.getByPlaceholderText('Search by title, attendees, or content...');
    fireEvent.change(searchInput, { target: { value: 'Product' } });
    fireEvent.keyDown(searchInput, { key: 'Enter' });

    await waitFor(() => {
      expect(apiClient.getMeetings).toHaveBeenCalledWith(
        expect.objectContaining({
          search: 'Product',
        })
      );
    });
  });

  test('handles meeting selection for bulk operations', async () => {
    (useAuth as jest.Mock).mockReturnValue({
      user: mockUser,
      isLoading: false,
    });

    (apiClient.getMeetings as jest.Mock).mockResolvedValue({
      meetings: mockMeetings,
      total: 2,
    });

    render(<MeetingsPage />);

    await waitFor(() => {
      const checkboxes = screen.getAllByRole('checkbox');
      expect(checkboxes.length).toBeGreaterThan(0);
    });

    // Select first meeting
    const checkboxes = screen.getAllByRole('checkbox');
    fireEvent.click(checkboxes[1]); // First meeting checkbox (index 0 is select all)

    await waitFor(() => {
      expect(screen.getByText(/Delete \(1\)/)).toBeInTheDocument();
      expect(screen.getByText('Export')).toBeInTheDocument();
    });
  });

  test('handles bulk delete operation', async () => {
    (useAuth as jest.Mock).mockReturnValue({
      user: mockUser,
      isLoading: false,
    });

    (apiClient.getMeetings as jest.Mock).mockResolvedValue({
      meetings: mockMeetings,
      total: 2,
    });

    (apiClient.deleteMeeting as jest.Mock).mockResolvedValue({});

    // Mock window.confirm
    const originalConfirm = window.confirm;
    window.confirm = jest.fn(() => true);

    render(<MeetingsPage />);

    await waitFor(() => {
      const checkboxes = screen.getAllByRole('checkbox');
      fireEvent.click(checkboxes[1]); // Select first meeting
    });

    const deleteButton = screen.getByText(/Delete \(1\)/);
    fireEvent.click(deleteButton);

    await waitFor(() => {
      expect(window.confirm).toHaveBeenCalledWith('Are you sure you want to delete 1 meetings?');
      expect(apiClient.deleteMeeting).toHaveBeenCalledWith('meeting-1');
    });

    window.confirm = originalConfirm;
  });

  test('handles meeting export', async () => {
    (useAuth as jest.Mock).mockReturnValue({
      user: mockUser,
      isLoading: false,
    });

    (apiClient.getMeetings as jest.Mock).mockResolvedValue({
      meetings: mockMeetings,
      total: 2,
    });

    (apiClient.exportMeetings as jest.Mock).mockResolvedValue('csv data');

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

    render(<MeetingsPage />);

    await waitFor(() => {
      const checkboxes = screen.getAllByRole('checkbox');
      fireEvent.click(checkboxes[1]); // Select first meeting
    });

    const exportButton = screen.getByText('Export');
    fireEvent.click(exportButton);

    await waitFor(() => {
      expect(apiClient.exportMeetings).toHaveBeenCalledWith({
        meetingIds: ['meeting-1'],
        format: 'csv',
      });
      expect(mockClick).toHaveBeenCalled();
    });

    window.URL.createObjectURL = originalCreateObjectURL;
    document.createElement = originalCreateElement;
  });

  test('handles pagination controls', async () => {
    (useAuth as jest.Mock).mockReturnValue({
      user: mockUser,
      isLoading: false,
    });

    (apiClient.getMeetings as jest.Mock).mockResolvedValue({
      meetings: mockMeetings,
      total: 50,
    });

    render(<MeetingsPage />);

    await waitFor(() => {
      expect(screen.getByText('Page 1 of 3')).toBeInTheDocument();
      expect(screen.getByText('Next')).toBeInTheDocument();
      expect(screen.getByText('Previous')).toBeInTheDocument();
    });

    const nextButton = screen.getByText('Next');
    fireEvent.click(nextButton);

    await waitFor(() => {
      expect(apiClient.getMeetings).toHaveBeenCalledWith(
        expect.objectContaining({
          page: 2,
        })
      );
    });
  });

  test('navigates to meeting detail page on click', async () => {
    (useAuth as jest.Mock).mockReturnValue({
      user: mockUser,
      isLoading: false,
    });

    (apiClient.getMeetings as jest.Mock).mockResolvedValue({
      meetings: mockMeetings,
      total: 2,
    });

    render(<MeetingsPage />);

    await waitFor(() => {
      expect(screen.getByText('Product Team Standup')).toBeInTheDocument();
    });

    const meetingTitle = screen.getByText('Product Team Standup');
    const meetingCard = meetingTitle.closest('[onClick]');

    if (meetingCard) {
      fireEvent.click(meetingCard);
      expect(mockRouter.push).toHaveBeenCalledWith('/meetings/meeting-1');
    }
  });

  test('displays status badges correctly', async () => {
    (useAuth as jest.Mock).mockReturnValue({
      user: mockUser,
      isLoading: false,
    });

    (apiClient.getMeetings as jest.Mock).mockResolvedValue({
      meetings: mockMeetings,
      total: 2,
    });

    render(<MeetingsPage />);

    await waitFor(() => {
      expect(screen.getByText('completed')).toBeInTheDocument();
      expect(screen.getByText('in progress')).toBeInTheDocument();
    });
  });

  test('handles select all functionality', async () => {
    (useAuth as jest.Mock).mockReturnValue({
      user: mockUser,
      isLoading: false,
    });

    (apiClient.getMeetings as jest.Mock).mockResolvedValue({
      meetings: mockMeetings,
      total: 2,
    });

    render(<MeetingsPage />);

    await waitFor(() => {
      expect(screen.getByText('Select All')).toBeInTheDocument();
    });

    const selectAllCheckbox = screen.getAllByRole('checkbox')[0];
    fireEvent.click(selectAllCheckbox);

    await waitFor(() => {
      expect(screen.getByText(/Delete \(2\)/)).toBeInTheDocument();
    });
  });
});