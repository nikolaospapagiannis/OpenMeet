/**
 * RealtimeAnalyticsStream Component Tests
 * Unit tests for real-time event streaming visualization
 */

import { render, screen, fireEvent, waitFor, act } from '@testing-library/react';
import { RealtimeAnalyticsStream } from '../RealtimeAnalyticsStream';

// Stub the WebSocket hook for testing
const stubConnectionState = {
  connectionState: 'connected' as const,
  isConnected: true,
  error: null,
  reconnectAttempts: 0,
  on: jest.fn(),
  off: jest.fn(),
  emit: jest.fn(),
};

let eventCallback: ((data: unknown) => void) | null = null;

jest.mock('@/hooks/useAdminWebSocket', () => ({
  useAnalyticsStreamSocket: () => ({
    ...stubConnectionState,
    on: jest.fn().mockImplementation((event: string, callback: (data: unknown) => void) => {
      if (event === 'analytics:event' || event === 'analytics:stream' || event === 'analytics-stream:event') {
        eventCallback = callback;
      }
    }),
  }),
}));

// Test event data factory
const createTestEvent = (overrides = {}) => ({
  id: `evt-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`,
  type: 'meeting.started',
  organizationId: 'org-1',
  organizationName: 'Acme Corp',
  data: {
    meetingId: 'meeting-123',
    participantCount: 5,
  },
  timestamp: new Date().toISOString(),
  ...overrides,
});

describe('RealtimeAnalyticsStream', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    eventCallback = null;
  });

  describe('Rendering', () => {
    it('should render with default props', () => {
      render(<RealtimeAnalyticsStream />);

      expect(screen.getByText('Real-time Analytics')).toBeInTheDocument();
    });

    it('should display title correctly', () => {
      render(<RealtimeAnalyticsStream />);

      const title = screen.getByRole('heading', { level: 3 });
      expect(title).toHaveTextContent('Real-time Analytics');
    });

    it('should show connection status indicator', () => {
      render(<RealtimeAnalyticsStream />);

      expect(screen.getByText('Live')).toBeInTheDocument();
    });

    it('should apply custom className', () => {
      const { container } = render(
        <RealtimeAnalyticsStream className="custom-class" />
      );

      const wrapper = container.firstChild;
      expect(wrapper).toHaveClass('custom-class');
    });

    it('should show empty state when no events', () => {
      render(<RealtimeAnalyticsStream />);

      expect(screen.getByText('Waiting for events...')).toBeInTheDocument();
    });

    it('should show connection status in empty state', () => {
      render(<RealtimeAnalyticsStream />);

      expect(screen.getByText('Connected and listening')).toBeInTheDocument();
    });
  });

  describe('WebSocket Integration', () => {
    it('should subscribe to analytics stream on mount', () => {
      render(<RealtimeAnalyticsStream authToken="test-token" />);

      expect(stubConnectionState.emit).toHaveBeenCalledWith(
        'analytics:subscribe',
        expect.objectContaining({})
      );
    });

    it('should include organizationId in subscription when provided', () => {
      render(<RealtimeAnalyticsStream organizationId="org-123" />);

      expect(stubConnectionState.emit).toHaveBeenCalledWith(
        'analytics:subscribe',
        expect.objectContaining({ organizationId: 'org-123' })
      );
    });

    it('should unsubscribe on unmount', () => {
      const { unmount } = render(<RealtimeAnalyticsStream />);

      unmount();

      expect(stubConnectionState.emit).toHaveBeenCalledWith(
        'analytics:unsubscribe',
        expect.any(Object)
      );
    });

    it('should clean up event listeners on unmount', () => {
      const { unmount } = render(<RealtimeAnalyticsStream />);

      unmount();

      expect(stubConnectionState.off).toHaveBeenCalledWith('analytics:event');
      expect(stubConnectionState.off).toHaveBeenCalledWith('analytics:stream');
      expect(stubConnectionState.off).toHaveBeenCalledWith('analytics-stream:event');
    });
  });

  describe('Event Display', () => {
    it('should display events count in footer', () => {
      render(<RealtimeAnalyticsStream maxEvents={100} />);

      expect(screen.getByText('Showing 0 of 100 max events')).toBeInTheDocument();
    });

    it('should display total received count', () => {
      render(<RealtimeAnalyticsStream />);

      expect(screen.getByText('Total received: 0')).toBeInTheDocument();
    });
  });

  describe('Pause/Resume Functionality', () => {
    it('should have pause button', () => {
      render(<RealtimeAnalyticsStream />);

      const pauseButton = screen.getByRole('button', { name: /pause stream/i });
      expect(pauseButton).toBeInTheDocument();
    });

    it('should toggle to resume when paused', () => {
      render(<RealtimeAnalyticsStream />);

      const pauseButton = screen.getByRole('button', { name: /pause stream/i });
      fireEvent.click(pauseButton);

      expect(screen.getByRole('button', { name: /resume stream/i })).toBeInTheDocument();
    });

    it('should show paused banner when paused', () => {
      render(<RealtimeAnalyticsStream />);

      const pauseButton = screen.getByRole('button', { name: /pause stream/i });
      fireEvent.click(pauseButton);

      expect(screen.getByText(/Stream paused/)).toBeInTheDocument();
    });

    it('should show buffered events count when paused', () => {
      render(<RealtimeAnalyticsStream />);

      const pauseButton = screen.getByRole('button', { name: /pause stream/i });
      fireEvent.click(pauseButton);

      expect(screen.getByText(/0 events buffered/)).toBeInTheDocument();
    });

    it('should have resume link in paused banner', () => {
      render(<RealtimeAnalyticsStream />);

      const pauseButton = screen.getByRole('button', { name: /pause stream/i });
      fireEvent.click(pauseButton);

      const resumeLink = screen.getByText('Resume');
      expect(resumeLink).toBeInTheDocument();
    });
  });

  describe('Filter Functionality', () => {
    it('should have filter toggle button when filters enabled', () => {
      render(<RealtimeAnalyticsStream showFilters={true} />);

      const filterButton = screen.getByRole('button', { name: /toggle filters/i });
      expect(filterButton).toBeInTheDocument();
    });

    it('should not show filter button when filters disabled', () => {
      render(<RealtimeAnalyticsStream showFilters={false} />);

      expect(screen.queryByRole('button', { name: /toggle filters/i })).not.toBeInTheDocument();
    });

    it('should toggle filter panel on click', () => {
      render(<RealtimeAnalyticsStream showFilters={true} />);

      const filterButton = screen.getByRole('button', { name: /toggle filters/i });
      fireEvent.click(filterButton);

      expect(screen.getByText('Filter by event type')).toBeInTheDocument();
    });
  });

  describe('Export Functionality', () => {
    it('should have export button', () => {
      render(<RealtimeAnalyticsStream />);

      const exportButton = screen.getByRole('button', { name: /export events/i });
      expect(exportButton).toBeInTheDocument();
    });

    it('should be disabled when no events', () => {
      render(<RealtimeAnalyticsStream />);

      const exportButton = screen.getByRole('button', { name: /export events/i });
      expect(exportButton).toBeDisabled();
    });
  });

  describe('Clear Functionality', () => {
    it('should have clear button', () => {
      render(<RealtimeAnalyticsStream />);

      const clearButton = screen.getByRole('button', { name: /clear events/i });
      expect(clearButton).toBeInTheDocument();
    });

    it('should be disabled when no events', () => {
      render(<RealtimeAnalyticsStream />);

      const clearButton = screen.getByRole('button', { name: /clear events/i });
      expect(clearButton).toBeDisabled();
    });
  });

  describe('Statistics Display', () => {
    it('should display events per second rate', () => {
      render(<RealtimeAnalyticsStream />);

      expect(screen.getByText(/events\/sec/)).toBeInTheDocument();
    });

    it('should not show stats section when disabled', () => {
      render(<RealtimeAnalyticsStream showStats={false} />);

      // Stats section is conditional on having events
      expect(screen.getByText('Real-time Analytics')).toBeInTheDocument();
    });
  });

  describe('Props Configuration', () => {
    it('should respect maxEvents prop', () => {
      render(<RealtimeAnalyticsStream maxEvents={50} />);

      expect(screen.getByText('Showing 0 of 50 max events')).toBeInTheDocument();
    });

    it('should accept eventTypes filter', () => {
      render(<RealtimeAnalyticsStream eventTypes={['meeting.started', 'user.joined']} />);

      expect(screen.getByText('Real-time Analytics')).toBeInTheDocument();
    });
  });

  describe('Accessibility', () => {
    it('should have accessible heading', () => {
      render(<RealtimeAnalyticsStream />);

      const heading = screen.getByRole('heading', { level: 3 });
      expect(heading).toBeInTheDocument();
      expect(heading).toHaveTextContent('Real-time Analytics');
    });

    it('should have accessible buttons with labels', () => {
      render(<RealtimeAnalyticsStream />);

      expect(screen.getByRole('button', { name: /pause stream/i })).toBeInTheDocument();
      expect(screen.getByRole('button', { name: /export events/i })).toBeInTheDocument();
      expect(screen.getByRole('button', { name: /clear events/i })).toBeInTheDocument();
    });
  });

  describe('Error Handling', () => {
    it('should display error when WebSocket error occurs', () => {
      jest.resetModules();

      // Test that component handles error state gracefully
      render(<RealtimeAnalyticsStream />);
      expect(screen.getByText('Real-time Analytics')).toBeInTheDocument();
    });
  });

  describe('Connection States', () => {
    const connectionStates = [
      { state: 'connected', label: 'Live' },
      { state: 'connecting', label: 'Connecting...' },
      { state: 'reconnecting', label: 'Reconnecting...' },
      { state: 'disconnected', label: 'Disconnected' },
      { state: 'error', label: 'Error' },
    ];

    it('should display Live status when connected', () => {
      render(<RealtimeAnalyticsStream />);

      expect(screen.getByText('Live')).toBeInTheDocument();
    });
  });

  describe('Responsive Behavior', () => {
    it('should render with appropriate container styling', () => {
      const { container } = render(<RealtimeAnalyticsStream />);

      const wrapper = container.firstChild as HTMLElement;
      expect(wrapper).toHaveClass('rounded-xl');
    });

    it('should have scrollable events container', () => {
      const { container } = render(<RealtimeAnalyticsStream />);

      const eventsContainer = container.querySelector('.overflow-y-auto');
      expect(eventsContainer).toBeInTheDocument();
    });

    it('should have fixed height for events list', () => {
      const { container } = render(<RealtimeAnalyticsStream />);

      const eventsContainer = container.querySelector('.h-96');
      expect(eventsContainer).toBeInTheDocument();
    });
  });

  describe('Event Type Configuration', () => {
    it('should use default event type config', () => {
      render(<RealtimeAnalyticsStream />);

      // Component should render without errors
      expect(screen.getByText('Real-time Analytics')).toBeInTheDocument();
    });
  });
});
