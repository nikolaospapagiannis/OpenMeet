/**
 * Test Utilities
 * Custom render function and test helpers for component testing
 */

import React, { ReactElement } from 'react';
import { render, RenderOptions, RenderResult } from '@testing-library/react';

// Custom render function with providers
function customRender(
  ui: ReactElement,
  options?: Omit<RenderOptions, 'wrapper'>
): RenderResult {
  const Wrapper = ({ children }: { children: React.ReactNode }) => {
    return <>{children}</>;
  };

  return render(ui, { wrapper: Wrapper, ...options });
}

// Re-export everything from testing-library
export * from '@testing-library/react';
export { customRender as render };

// Test data factories
export const createTestConcurrentUsersData = (overrides = {}) => ({
  type: 'global' as const,
  totalUsers: 1234,
  serverCount: 5,
  byOrganization: [
    { organizationId: 'org-1', organizationName: 'Acme Corp', count: 500 },
    { organizationId: 'org-2', organizationName: 'TechStart', count: 350 },
    { organizationId: 'org-3', organizationName: 'BigCo', count: 250 },
  ],
  timestamp: new Date().toISOString(),
  ...overrides,
});

export const createTestGeoDistributionData = (overrides = {}) => ({
  totalUsers: 15000,
  totalMeetings: 45000,
  countries: [
    {
      countryCode: 'US',
      countryName: 'United States',
      userCount: 5000,
      meetingCount: 15000,
      percentage: 33.3,
      trend: 'up' as const,
    },
    {
      countryCode: 'GB',
      countryName: 'United Kingdom',
      userCount: 2500,
      meetingCount: 7500,
      percentage: 16.7,
      trend: 'stable' as const,
    },
    {
      countryCode: 'DE',
      countryName: 'Germany',
      userCount: 2000,
      meetingCount: 6000,
      percentage: 13.3,
      trend: 'up' as const,
    },
  ],
  lastUpdated: new Date().toISOString(),
  ...overrides,
});

export const createTestHeatmapData = () => [
  { lat: 37.7749, lng: -122.4194, intensity: 0.9, label: 'San Francisco' },
  { lat: 40.7128, lng: -74.006, intensity: 0.85, label: 'New York' },
  { lat: 51.5074, lng: -0.1278, intensity: 0.75, label: 'London' },
  { lat: 52.52, lng: 13.405, intensity: 0.6, label: 'Berlin' },
  { lat: 35.6762, lng: 139.6503, intensity: 0.55, label: 'Tokyo' },
];

export const createTestAnalyticsEvent = (overrides = {}) => ({
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

// WebSocket hook simulation helper
export type ConnectionState = 'connected' | 'connecting' | 'reconnecting' | 'disconnected' | 'error';

export interface WebSocketTestHelpers {
  connectionState: ConnectionState;
  isConnected: boolean;
  error: Error | null;
  reconnectAttempts: number;
  simulateConnect: () => void;
  simulateDisconnect: () => void;
  simulateError: (error: Error) => void;
  simulateEvent: (eventName: string, data: unknown) => void;
}

export const createWebSocketTestHelpers = (): WebSocketTestHelpers => {
  const listeners = new Map<string, Set<(data: unknown) => void>>();

  return {
    connectionState: 'connected',
    isConnected: true,
    error: null,
    reconnectAttempts: 0,
    simulateConnect: () => {},
    simulateDisconnect: () => {},
    simulateError: () => {},
    simulateEvent: (eventName: string, data: unknown) => {
      const eventListeners = listeners.get(eventName);
      if (eventListeners) {
        eventListeners.forEach(listener => listener(data));
      }
    },
  };
};

// Wait for async updates
export const waitForNextTick = () =>
  new Promise(resolve => setTimeout(resolve, 0));

// Wait for specified time
export const waitFor = (ms: number) =>
  new Promise(resolve => setTimeout(resolve, ms));
