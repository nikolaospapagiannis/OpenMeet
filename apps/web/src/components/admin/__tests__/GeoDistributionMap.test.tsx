/**
 * GeoDistributionMap Component Tests
 * Unit tests for geographic distribution visualization
 */

import { render, screen, fireEvent, waitFor, act } from '@testing-library/react';
import { GeoDistributionMap } from '../GeoDistributionMap';

// Test data for API responses
const testGeoData = {
  success: true,
  data: {
    totalUsers: 15000,
    totalMeetings: 45000,
    countries: [
      {
        countryCode: 'US',
        countryName: 'United States',
        userCount: 5000,
        meetingCount: 15000,
        percentage: 33.3,
        trend: 'up',
      },
      {
        countryCode: 'GB',
        countryName: 'United Kingdom',
        userCount: 2500,
        meetingCount: 7500,
        percentage: 16.7,
        trend: 'stable',
      },
      {
        countryCode: 'DE',
        countryName: 'Germany',
        userCount: 2000,
        meetingCount: 6000,
        percentage: 13.3,
        trend: 'up',
      },
    ],
    lastUpdated: new Date().toISOString(),
  },
};

const testHeatmapData = {
  success: true,
  data: {
    resolution: 'country',
    points: [
      { lat: 37.7749, lng: -122.4194, intensity: 0.9, label: 'San Francisco' },
      { lat: 40.7128, lng: -74.006, intensity: 0.85, label: 'New York' },
      { lat: 51.5074, lng: -0.1278, intensity: 0.75, label: 'London' },
    ],
    bounds: { north: 60, south: -60, east: 180, west: -180 },
    generatedAt: new Date().toISOString(),
  },
};

describe('GeoDistributionMap', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    jest.useFakeTimers();

    // Setup fetch stub
    global.fetch = jest.fn().mockImplementation((url: string) => {
      if (url.includes('/geo/distribution')) {
        return Promise.resolve({
          ok: true,
          json: () => Promise.resolve(testGeoData),
        });
      }
      if (url.includes('/geo/heatmap')) {
        return Promise.resolve({
          ok: true,
          json: () => Promise.resolve(testHeatmapData),
        });
      }
      return Promise.reject(new Error('Unknown endpoint'));
    });
  });

  afterEach(() => {
    jest.useRealTimers();
    jest.restoreAllMocks();
  });

  describe('Rendering', () => {
    it('should render loading state initially', async () => {
      render(<GeoDistributionMap />);

      expect(screen.getByText('Loading geographic data...')).toBeInTheDocument();
    });

    it('should render with data after loading', async () => {
      render(<GeoDistributionMap />);

      await waitFor(() => {
        expect(screen.getByText('Geographic Distribution')).toBeInTheDocument();
      });
    });

    it('should display title correctly', async () => {
      render(<GeoDistributionMap />);

      await waitFor(() => {
        expect(screen.getByText('Geographic Distribution')).toBeInTheDocument();
      });
    });

    it('should apply custom className', async () => {
      const { container } = render(
        <GeoDistributionMap className="custom-class" />
      );

      await waitFor(() => {
        const wrapper = container.firstChild;
        expect(wrapper).toHaveClass('custom-class');
      });
    });
  });

  describe('Data Fetching', () => {
    it('should fetch geo distribution data on mount', async () => {
      render(<GeoDistributionMap authToken="test-token" />);

      await waitFor(() => {
        expect(global.fetch).toHaveBeenCalledWith(
          expect.stringContaining('/api/admin/analytics/geo/distribution'),
          expect.objectContaining({
            headers: expect.objectContaining({
              Authorization: 'Bearer test-token',
            }),
          })
        );
      });
    });

    it('should fetch heatmap data when showHeatmap is true', async () => {
      render(<GeoDistributionMap showHeatmap={true} />);

      await waitFor(() => {
        expect(global.fetch).toHaveBeenCalledWith(
          expect.stringContaining('/api/admin/analytics/geo/heatmap'),
          expect.any(Object)
        );
      });
    });

    it('should not fetch heatmap data when showHeatmap is false', async () => {
      render(<GeoDistributionMap showHeatmap={false} />);

      await waitFor(() => {
        expect(global.fetch).toHaveBeenCalledTimes(1); // Only geo distribution
      });
    });

    it('should include organizationId in request when provided', async () => {
      render(<GeoDistributionMap organizationId="org-123" />);

      await waitFor(() => {
        expect(global.fetch).toHaveBeenCalledWith(
          expect.stringContaining('organizationId=org-123'),
          expect.any(Object)
        );
      });
    });

    it('should include metric parameter in request', async () => {
      render(<GeoDistributionMap metric="meetings" />);

      await waitFor(() => {
        expect(global.fetch).toHaveBeenCalledWith(
          expect.stringContaining('metric=meetings'),
          expect.any(Object)
        );
      });
    });
  });

  describe('Refresh Functionality', () => {
    it('should auto-refresh at specified interval', async () => {
      render(<GeoDistributionMap refreshInterval={5000} />);

      await waitFor(() => {
        expect(global.fetch).toHaveBeenCalled();
      });

      // Advance timer
      act(() => {
        jest.advanceTimersByTime(5000);
      });

      await waitFor(() => {
        // Should have fetched again
        expect(global.fetch).toHaveBeenCalledTimes(4); // Initial (2) + refresh (2)
      });
    });

    it('should not auto-refresh when interval is 0', async () => {
      render(<GeoDistributionMap refreshInterval={0} />);

      await waitFor(() => {
        expect(global.fetch).toHaveBeenCalled();
      });

      const initialCallCount = (global.fetch as jest.Mock).mock.calls.length;

      act(() => {
        jest.advanceTimersByTime(60000);
      });

      expect(global.fetch).toHaveBeenCalledTimes(initialCallCount);
    });

    it('should have manual refresh button', async () => {
      render(<GeoDistributionMap />);

      await waitFor(() => {
        const refreshButton = document.querySelector('button[aria-label]') ||
          document.querySelector('button svg.lucide-refresh-cw')?.closest('button');
        expect(refreshButton).toBeInTheDocument();
      });
    });
  });

  describe('Map Visualization', () => {
    it('should render SVG map', async () => {
      render(<GeoDistributionMap />);

      await waitFor(() => {
        const svgElement = document.querySelector('svg');
        expect(svgElement).toBeInTheDocument();
      });
    });

    it('should render country markers', async () => {
      render(<GeoDistributionMap />);

      await waitFor(() => {
        const circles = document.querySelectorAll('svg circle');
        expect(circles.length).toBeGreaterThan(0);
      });
    });

    it('should render heatmap points when enabled', async () => {
      render(<GeoDistributionMap showHeatmap={true} />);

      await waitFor(() => {
        // Heatmap points are rendered as circles
        const circles = document.querySelectorAll('svg circle');
        expect(circles.length).toBeGreaterThan(0);
      });
    });

    it('should render legend', async () => {
      render(<GeoDistributionMap />);

      await waitFor(() => {
        expect(screen.getByText('Density:')).toBeInTheDocument();
      });
    });
  });

  describe('Country Selection', () => {
    it('should allow selecting a country', async () => {
      render(<GeoDistributionMap />);

      await waitFor(() => {
        expect(screen.getAllByText('United States').length).toBeGreaterThan(0);
      });

      const countryElements = screen.getAllByText('United States');
      const countryElement = countryElements[0].closest('div');
      if (countryElement) {
        fireEvent.click(countryElement);
      }

      // Selected country should be highlighted
      await waitFor(() => {
        expect(screen.getAllByText('United States').length).toBeGreaterThan(0);
      });
    });
  });

  describe('Statistics Display', () => {
    it('should display total users count', async () => {
      render(<GeoDistributionMap />);

      await waitFor(() => {
        expect(screen.getByText('Total Users')).toBeInTheDocument();
        expect(screen.getByText('15.0K')).toBeInTheDocument();
      });
    });

    it('should display total meetings count', async () => {
      render(<GeoDistributionMap />);

      await waitFor(() => {
        expect(screen.getByText('Total Meetings')).toBeInTheDocument();
        expect(screen.getByText('45.0K')).toBeInTheDocument();
      });
    });

    it('should display countries count', async () => {
      render(<GeoDistributionMap />);

      await waitFor(() => {
        expect(screen.getByText('Countries')).toBeInTheDocument();
        expect(screen.getByText('3')).toBeInTheDocument();
      });
    });
  });

  describe('Country List', () => {
    it('should display top countries list', async () => {
      render(<GeoDistributionMap />);

      await waitFor(() => {
        expect(screen.getByText('Top Countries')).toBeInTheDocument();
        expect(screen.getByText('United States')).toBeInTheDocument();
        expect(screen.getByText('United Kingdom')).toBeInTheDocument();
        expect(screen.getByText('Germany')).toBeInTheDocument();
      });
    });

    it('should limit displayed countries based on showTopCountries prop', async () => {
      render(<GeoDistributionMap showTopCountries={2} />);

      await waitFor(() => {
        expect(screen.getByText('United States')).toBeInTheDocument();
        expect(screen.getByText('United Kingdom')).toBeInTheDocument();
        // Germany should be hidden
        expect(screen.queryByText('Germany')).not.toBeInTheDocument();
      });
    });

    it('should have show all button when more countries exist', async () => {
      render(<GeoDistributionMap showTopCountries={2} />);

      await waitFor(() => {
        expect(screen.getByText(/Show All/)).toBeInTheDocument();
      });
    });

    it('should toggle showing all countries', async () => {
      render(<GeoDistributionMap showTopCountries={2} />);

      await waitFor(() => {
        const showAllButton = screen.getByText(/Show All/);
        fireEvent.click(showAllButton);
      });

      await waitFor(() => {
        expect(screen.getByText('Germany')).toBeInTheDocument();
      });
    });

    it('should display country percentages', async () => {
      render(<GeoDistributionMap />);

      await waitFor(() => {
        expect(screen.getByText('(33.3%)')).toBeInTheDocument();
      });
    });
  });

  describe('Error Handling', () => {
    it('should display error state when fetch fails', async () => {
      global.fetch = jest.fn().mockRejectedValue(new Error('Network error'));

      render(<GeoDistributionMap />);

      await waitFor(() => {
        expect(screen.getByText(/Network error/)).toBeInTheDocument();
      });
    });

    it('should show retry button on error', async () => {
      global.fetch = jest.fn().mockRejectedValue(new Error('Network error'));

      render(<GeoDistributionMap />);

      await waitFor(() => {
        expect(screen.getByText('Retry')).toBeInTheDocument();
      });
    });

    it('should retry fetch when retry button clicked', async () => {
      global.fetch = jest.fn()
        .mockRejectedValueOnce(new Error('Network error'))
        .mockRejectedValueOnce(new Error('Network error')) // heatmap also fails
        .mockResolvedValueOnce({
          ok: true,
          json: () => Promise.resolve(testGeoData),
        })
        .mockResolvedValueOnce({
          ok: true,
          json: () => Promise.resolve(testHeatmapData),
        });

      render(<GeoDistributionMap />);

      await waitFor(() => {
        expect(screen.getByText('Retry')).toBeInTheDocument();
      });

      fireEvent.click(screen.getByText('Retry'));

      await waitFor(() => {
        expect(global.fetch).toHaveBeenCalledTimes(4); // Initial fail + heatmap fail + retry distribution + retry heatmap
      });
    });

    it('should handle non-ok response', async () => {
      global.fetch = jest.fn().mockResolvedValue({
        ok: false,
        status: 500,
      });

      render(<GeoDistributionMap />);

      await waitFor(() => {
        expect(screen.getByText(/Failed to fetch geo data: 500/)).toBeInTheDocument();
      });
    });
  });

  describe('Last Updated Display', () => {
    it('should display last updated timestamp', async () => {
      render(<GeoDistributionMap />);

      await waitFor(() => {
        expect(screen.getByText(/Last updated:/)).toBeInTheDocument();
      });
    });
  });

  describe('Accessibility', () => {
    it('should have accessible heading', async () => {
      render(<GeoDistributionMap />);

      await waitFor(() => {
        const heading = screen.getByRole('heading', { level: 3 });
        expect(heading).toBeInTheDocument();
        expect(heading).toHaveTextContent('Geographic Distribution');
      });
    });

    it('should have accessible buttons', async () => {
      render(<GeoDistributionMap />);

      await waitFor(() => {
        const buttons = screen.getAllByRole('button');
        expect(buttons.length).toBeGreaterThan(0);
      });
    });
  });

  describe('Metric Toggle', () => {
    it('should render metric toggle buttons', async () => {
      render(<GeoDistributionMap />);

      await waitFor(() => {
        expect(screen.getByText('Users')).toBeInTheDocument();
        expect(screen.getByText('Meetings')).toBeInTheDocument();
      });
    });
  });
});
