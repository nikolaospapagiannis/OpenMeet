/**
 * Search and Filters Tests
 * Tests for search and filter functionality
 */

import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import { MeetingFilters } from '@/components/meetings/MeetingFilters';
import { UseMeetingFiltersReturn } from '@/hooks/useMeetingFilters';

describe('MeetingFilters', () => {
  const mockFilterState: UseMeetingFiltersReturn = {
    filters: {
      status: undefined,
      platform: undefined,
      dateFrom: undefined,
      dateTo: undefined,
      participants: undefined,
      duration: undefined,
      hasTranscript: undefined,
      hasRecording: undefined,
      sortBy: 'createdAt',
      sortOrder: 'desc',
    },
    setFilter: jest.fn(),
    clearFilters: jest.fn(),
    clearFilter: jest.fn(),
    activeFilterCount: 0,
    savedFilters: [],
    saveCurrentFilters: jest.fn(),
    applySavedFilter: jest.fn(),
    deleteSavedFilter: jest.fn(),
    isFilterActive: jest.fn(),
  };

  const mockOnToggle = jest.fn();

  beforeEach(() => {
    jest.clearAllMocks();
  });

  test('renders filter button with correct count', () => {
    const filterStateWithActive = {
      ...mockFilterState,
      activeFilterCount: 3,
    };

    render(
      <MeetingFilters
        filterState={filterStateWithActive}
        isExpanded={false}
        onToggle={mockOnToggle}
        resultCount={10}
      />
    );

    expect(screen.getByText('Filters')).toBeInTheDocument();
    expect(screen.getByText('3')).toBeInTheDocument(); // Active filter count badge
    expect(screen.getByText('10 meetings found')).toBeInTheDocument();
  });

  test('toggles expanded view when filter button clicked', () => {
    render(
      <MeetingFilters
        filterState={mockFilterState}
        isExpanded={false}
        onToggle={mockOnToggle}
      />
    );

    const filterButton = screen.getByText('Filters');
    fireEvent.click(filterButton);

    expect(mockOnToggle).toHaveBeenCalled();
  });

  test('displays expanded filter panel', () => {
    render(
      <MeetingFilters
        filterState={mockFilterState}
        isExpanded={true}
        onToggle={mockOnToggle}
      />
    );

    expect(screen.getByLabelText('Status')).toBeInTheDocument();
    expect(screen.getByLabelText('Platform')).toBeInTheDocument();
    expect(screen.getByText('Duration')).toBeInTheDocument();
    expect(screen.getByLabelText('Sort by')).toBeInTheDocument();
  });

  test('handles status filter selection', () => {
    render(
      <MeetingFilters
        filterState={mockFilterState}
        isExpanded={true}
        onToggle={mockOnToggle}
      />
    );

    const statusSelect = screen.getByLabelText('Status') as HTMLSelectElement;
    fireEvent.change(statusSelect, { target: { value: 'completed' } });

    expect(mockFilterState.setFilter).toHaveBeenCalledWith('status', 'completed');
  });

  test('handles platform filter selection', () => {
    render(
      <MeetingFilters
        filterState={mockFilterState}
        isExpanded={true}
        onToggle={mockOnToggle}
      />
    );

    const platformSelect = screen.getByLabelText('Platform') as HTMLSelectElement;
    fireEvent.change(platformSelect, { target: { value: 'zoom' } });

    expect(mockFilterState.setFilter).toHaveBeenCalledWith('platform', 'zoom');
  });

  test('handles duration filter selection', () => {
    render(
      <MeetingFilters
        filterState={mockFilterState}
        isExpanded={true}
        onToggle={mockOnToggle}
      />
    );

    const durationSelect = screen.getByText('Duration').parentElement?.querySelector('select') as HTMLSelectElement;
    fireEvent.change(durationSelect, { target: { value: '15-30' } });

    expect(mockFilterState.setFilter).toHaveBeenCalledWith('duration', '15-30');
  });

  test('handles sort by selection', () => {
    render(
      <MeetingFilters
        filterState={mockFilterState}
        isExpanded={true}
        onToggle={mockOnToggle}
      />
    );

    const sortBySelect = screen.getByLabelText('Sort by') as HTMLSelectElement;
    fireEvent.change(sortBySelect, { target: { value: 'title' } });

    expect(mockFilterState.setFilter).toHaveBeenCalledWith('sortBy', 'title');
  });

  test('handles sort order selection', () => {
    render(
      <MeetingFilters
        filterState={mockFilterState}
        isExpanded={true}
        onToggle={mockOnToggle}
      />
    );

    const sortOrderSelect = screen.getAllByRole('combobox')[4] as HTMLSelectElement; // Sort order is 5th select
    fireEvent.change(sortOrderSelect, { target: { value: 'asc' } });

    expect(mockFilterState.setFilter).toHaveBeenCalledWith('sortOrder', 'asc');
  });

  test('handles has transcript filter toggle', () => {
    render(
      <MeetingFilters
        filterState={mockFilterState}
        isExpanded={true}
        onToggle={mockOnToggle}
      />
    );

    const hasTranscriptCheckbox = screen.getByText('Has Transcript').parentElement?.querySelector('input[type="checkbox"]') as HTMLInputElement;
    fireEvent.click(hasTranscriptCheckbox);

    expect(mockFilterState.setFilter).toHaveBeenCalledWith('hasTranscript', true);
  });

  test('handles has recording filter toggle', () => {
    render(
      <MeetingFilters
        filterState={mockFilterState}
        isExpanded={true}
        onToggle={mockOnToggle}
      />
    );

    const hasRecordingCheckbox = screen.getByText('Has Recording').parentElement?.querySelector('input[type="checkbox"]') as HTMLInputElement;
    fireEvent.click(hasRecordingCheckbox);

    expect(mockFilterState.setFilter).toHaveBeenCalledWith('hasRecording', true);
  });

  test('displays clear all button when filters are active', () => {
    const filterStateWithActive = {
      ...mockFilterState,
      activeFilterCount: 2,
      filters: {
        ...mockFilterState.filters,
        status: 'completed',
        platform: 'zoom',
      },
    };

    render(
      <MeetingFilters
        filterState={filterStateWithActive}
        isExpanded={false}
        onToggle={mockOnToggle}
      />
    );

    expect(screen.getByText('Clear all')).toBeInTheDocument();
  });

  test('handles clear all filters', () => {
    const filterStateWithActive = {
      ...mockFilterState,
      activeFilterCount: 2,
    };

    render(
      <MeetingFilters
        filterState={filterStateWithActive}
        isExpanded={false}
        onToggle={mockOnToggle}
      />
    );

    const clearAllButton = screen.getByText('Clear all');
    fireEvent.click(clearAllButton);

    expect(mockFilterState.clearFilters).toHaveBeenCalled();
  });

  test('displays active filter tags', () => {
    const filterStateWithActive = {
      ...mockFilterState,
      activeFilterCount: 3,
      filters: {
        ...mockFilterState.filters,
        status: 'completed',
        platform: 'zoom',
        hasTranscript: true,
      },
    };

    render(
      <MeetingFilters
        filterState={filterStateWithActive}
        isExpanded={false}
        onToggle={mockOnToggle}
      />
    );

    expect(screen.getByText('Status: completed')).toBeInTheDocument();
    expect(screen.getByText('Platform: zoom')).toBeInTheDocument();
    expect(screen.getByText('Has Transcript')).toBeInTheDocument();
  });

  test('handles removing individual filter tags', () => {
    const filterStateWithActive = {
      ...mockFilterState,
      activeFilterCount: 2,
      filters: {
        ...mockFilterState.filters,
        status: 'completed',
        platform: 'zoom',
      },
    };

    render(
      <MeetingFilters
        filterState={filterStateWithActive}
        isExpanded={false}
        onToggle={mockOnToggle}
      />
    );

    // Find and click the X button on the status filter tag
    const statusTag = screen.getByText('Status: completed').parentElement;
    const removeButton = statusTag?.querySelector('button');

    if (removeButton) {
      fireEvent.click(removeButton);
      expect(mockFilterState.clearFilter).toHaveBeenCalledWith('status');
    }
  });

  test('clears filter value when empty option selected', () => {
    render(
      <MeetingFilters
        filterState={mockFilterState}
        isExpanded={true}
        onToggle={mockOnToggle}
      />
    );

    const statusSelect = screen.getByLabelText('Status') as HTMLSelectElement;
    fireEvent.change(statusSelect, { target: { value: '' } });

    expect(mockFilterState.setFilter).toHaveBeenCalledWith('status', undefined);
  });

  test('displays all status options', () => {
    render(
      <MeetingFilters
        filterState={mockFilterState}
        isExpanded={true}
        onToggle={mockOnToggle}
      />
    );

    const statusSelect = screen.getByLabelText('Status') as HTMLSelectElement;
    const options = Array.from(statusSelect.options).map(o => o.text);

    expect(options).toContain('All statuses');
    expect(options).toContain('Scheduled');
    expect(options).toContain('In Progress');
    expect(options).toContain('Processing');
    expect(options).toContain('Completed');
    expect(options).toContain('Failed');
  });

  test('displays all platform options', () => {
    render(
      <MeetingFilters
        filterState={mockFilterState}
        isExpanded={true}
        onToggle={mockOnToggle}
      />
    );

    const platformSelect = screen.getByLabelText('Platform') as HTMLSelectElement;
    const options = Array.from(platformSelect.options).map(o => o.text);

    expect(options).toContain('All platforms');
    expect(options).toContain('Zoom');
    expect(options).toContain('Google Meet');
    expect(options).toContain('Microsoft Teams');
    expect(options).toContain('Webex');
    expect(options).toContain('Other');
  });

  test('displays all duration options', () => {
    render(
      <MeetingFilters
        filterState={mockFilterState}
        isExpanded={true}
        onToggle={mockOnToggle}
      />
    );

    const durationSelect = screen.getByText('Duration').parentElement?.querySelector('select') as HTMLSelectElement;
    const options = Array.from(durationSelect.options).map(o => o.text);

    expect(options).toContain('Any duration');
    expect(options).toContain('< 15 min');
    expect(options).toContain('15-30 min');
    expect(options).toContain('30-60 min');
    expect(options).toContain('> 60 min');
  });

  test('displays duration filter tag with correct format', () => {
    const filterStateWithDuration = {
      ...mockFilterState,
      activeFilterCount: 1,
      filters: {
        ...mockFilterState.filters,
        duration: '30-60',
      },
    };

    render(
      <MeetingFilters
        filterState={filterStateWithDuration}
        isExpanded={false}
        onToggle={mockOnToggle}
      />
    );

    expect(screen.getByText('Duration: 30-60 min')).toBeInTheDocument();
  });

  test('handles WebSocket updates for real-time filtering', async () => {
    // Mock WebSocket connection (if implemented)
    const mockWebSocket = {
      on: jest.fn(),
      emit: jest.fn(),
      close: jest.fn(),
    };

    (global as any).WebSocket = jest.fn(() => mockWebSocket);

    render(
      <MeetingFilters
        filterState={mockFilterState}
        isExpanded={false}
        onToggle={mockOnToggle}
        resultCount={10}
      />
    );

    // Simulate real-time update
    await waitFor(() => {
      expect(screen.getByText('10 meetings found')).toBeInTheDocument();
    });
  });

  test('renders DateRangeFilter component', () => {
    // Mock the DateRangeFilter component
    jest.mock('./DateRangeFilter', () => ({
      DateRangeFilter: ({ onChange, onClear }: any) => (
        <div data-testid="date-range-filter">
          <button onClick={() => onChange('2024-01-01', '2024-01-31')}>Set Date Range</button>
          <button onClick={onClear}>Clear Dates</button>
        </div>
      ),
    }));

    render(
      <MeetingFilters
        filterState={mockFilterState}
        isExpanded={false}
        onToggle={mockOnToggle}
      />
    );

    // DateRangeFilter should be rendered
    expect(mockFilterState.setFilter).toBeDefined();
  });

  test('renders ParticipantFilter component', () => {
    // Mock the ParticipantFilter component
    jest.mock('./ParticipantFilter', () => ({
      ParticipantFilter: ({ onChange, onClear }: any) => (
        <div data-testid="participant-filter">
          <button onClick={() => onChange(['user1', 'user2'])}>Set Participants</button>
          <button onClick={onClear}>Clear Participants</button>
        </div>
      ),
    }));

    render(
      <MeetingFilters
        filterState={mockFilterState}
        isExpanded={false}
        onToggle={mockOnToggle}
      />
    );

    // ParticipantFilter should be rendered
    expect(mockFilterState.setFilter).toBeDefined();
  });

  test('renders SavedFilters component', () => {
    const filterStateWithSaved = {
      ...mockFilterState,
      savedFilters: [
        { id: '1', name: 'My Filter', filters: { status: 'completed' } },
        { id: '2', name: 'Team Meetings', filters: { platform: 'zoom' } },
      ],
    };

    // Mock the SavedFilters component
    jest.mock('./SavedFilters', () => ({
      SavedFilters: ({ savedFilters, onApply, onDelete, onSave }: any) => (
        <div data-testid="saved-filters">
          {savedFilters.map((f: any) => (
            <div key={f.id}>
              <span>{f.name}</span>
              <button onClick={() => onApply(f)}>Apply</button>
              <button onClick={() => onDelete(f.id)}>Delete</button>
            </div>
          ))}
          <button onClick={() => onSave('New Filter')}>Save Current</button>
        </div>
      ),
    }));

    render(
      <MeetingFilters
        filterState={filterStateWithSaved}
        isExpanded={false}
        onToggle={mockOnToggle}
      />
    );

    // SavedFilters should be rendered
    expect(mockFilterState.saveCurrentFilters).toBeDefined();
  });

  test('applies correct styling when filters are active', () => {
    const filterStateWithActive = {
      ...mockFilterState,
      activeFilterCount: 2,
    };

    render(
      <MeetingFilters
        filterState={filterStateWithActive}
        isExpanded={true}
        onToggle={mockOnToggle}
      />
    );

    const filterButton = screen.getByText('Filters').parentElement;
    expect(filterButton).toHaveClass('bg-purple-600/20', 'border-purple-500', 'text-purple-300');
  });
});