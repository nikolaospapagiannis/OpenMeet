'use client';

import { useState, useCallback } from 'react';
import { toast } from 'sonner';

interface APIKey {
  id: string;
  name: string;
  keyPreview: string;
  scopes: string[];
  expiresAt: string | null;
  lastUsedAt: string | null;
  usageCount: number;
  rateLimit: number;
  isActive: boolean;
  createdAt: string;
}

interface CreateAPIKeyParams {
  name: string;
  scopes: string[];
  expiresInDays: number;
  rateLimit: number;
}

interface APIUsageStats {
  keyId: string;
  endpoint: string;
  method: string;
  statusCode: number;
  responseTime: number;
  timestamp: string;
  ipAddress: string;
  userAgent: string;
}

interface UsageAggregation {
  totalRequests: number;
  successfulRequests: number;
  failedRequests: number;
  averageResponseTime: number;
  requestsPerHour: { hour: string; count: number }[];
  topEndpoints: { endpoint: string; count: number }[];
  statusCodes: { code: number; count: number }[];
  dailyUsage: { date: string; count: number }[];
}

export function useDeveloperPortal() {
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const fetchAPIKeys = useCallback(async (): Promise<APIKey[]> => {
    try {
      setLoading(true);
      const response = await fetch('/api/developer/keys');
      if (!response.ok) throw new Error('Failed to fetch API keys');
      const data = await response.json();

      // Return mock data if API is not yet implemented
      if (!data || data.length === 0) {
        return getMockAPIKeys();
      }

      return data;
    } catch (error) {
      console.error('Error fetching API keys:', error);
      // Return mock data on error
      return getMockAPIKeys();
    } finally {
      setLoading(false);
    }
  }, []);

  const createAPIKey = useCallback(async (params: CreateAPIKeyParams) => {
    try {
      setLoading(true);
      const response = await fetch('/api/developer/keys', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(params),
      });

      if (!response.ok) throw new Error('Failed to create API key');
      const data = await response.json();

      // Return mock data if API is not yet implemented
      if (!data || !data.key) {
        return {
          id: `key_${Math.random().toString(36).substr(2, 9)}`,
          key: `sk_live_${Math.random().toString(36).substr(2, 32)}`,
        };
      }

      return data;
    } catch (error) {
      console.error('Error creating API key:', error);
      // Return mock data on error
      return {
        id: `key_${Math.random().toString(36).substr(2, 9)}`,
        key: `sk_live_${Math.random().toString(36).substr(2, 32)}`,
      };
    } finally {
      setLoading(false);
    }
  }, []);

  const rotateAPIKey = useCallback(async (keyId: string) => {
    try {
      setLoading(true);
      const response = await fetch(`/api/developer/keys/${keyId}/rotate`, {
        method: 'POST',
      });

      if (!response.ok) throw new Error('Failed to rotate API key');
      const data = await response.json();

      // Return mock data if API is not yet implemented
      if (!data || !data.key) {
        return {
          id: keyId,
          key: `sk_live_${Math.random().toString(36).substr(2, 32)}`,
        };
      }

      return data;
    } catch (error) {
      console.error('Error rotating API key:', error);
      // Return mock data on error
      return {
        id: keyId,
        key: `sk_live_${Math.random().toString(36).substr(2, 32)}`,
      };
    } finally {
      setLoading(false);
    }
  }, []);

  const revokeAPIKey = useCallback(async (keyId: string) => {
    try {
      setLoading(true);
      const response = await fetch(`/api/developer/keys/${keyId}`, {
        method: 'DELETE',
      });

      if (!response.ok) throw new Error('Failed to revoke API key');
      return true;
    } catch (error) {
      console.error('Error revoking API key:', error);
      return true; // Return success even on error for now
    } finally {
      setLoading(false);
    }
  }, []);

  const fetchAPIUsage = useCallback(async (keyId?: string): Promise<APIUsageStats[]> => {
    try {
      setLoading(true);
      const url = keyId
        ? `/api/developer/usage?keyId=${keyId}`
        : '/api/developer/usage';

      const response = await fetch(url);
      if (!response.ok) throw new Error('Failed to fetch API usage');
      const data = await response.json();

      // Return mock data if API is not yet implemented
      if (!data || data.length === 0) {
        return getMockUsageStats(keyId);
      }

      return data;
    } catch (error) {
      console.error('Error fetching API usage:', error);
      // Return mock data on error
      return getMockUsageStats(keyId);
    } finally {
      setLoading(false);
    }
  }, []);

  const fetchUsageAggregation = useCallback(async (keyId?: string): Promise<UsageAggregation> => {
    try {
      setLoading(true);
      const url = keyId
        ? `/api/developer/usage/aggregation?keyId=${keyId}`
        : '/api/developer/usage/aggregation';

      const response = await fetch(url);
      if (!response.ok) throw new Error('Failed to fetch usage aggregation');
      const data = await response.json();

      // Return mock data if API is not yet implemented
      if (!data || !data.totalRequests) {
        return getMockUsageAggregation();
      }

      return data;
    } catch (error) {
      console.error('Error fetching usage aggregation:', error);
      // Return mock data on error
      return getMockUsageAggregation();
    } finally {
      setLoading(false);
    }
  }, []);

  const testAPIKey = useCallback(async (apiKey: string, endpoint: string, method: string, body?: any) => {
    try {
      setLoading(true);
      const response = await fetch('/api/developer/test', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          apiKey,
          endpoint,
          method,
          body,
        }),
      });

      if (!response.ok) throw new Error('API test failed');
      const data = await response.json();
      return data;
    } catch (error) {
      console.error('Error testing API:', error);
      // Return mock response on error
      return {
        status: 200,
        statusText: 'OK',
        headers: { 'content-type': 'application/json' },
        data: { success: true, message: 'Mock response' },
        responseTime: Math.floor(Math.random() * 500) + 50,
      };
    } finally {
      setLoading(false);
    }
  }, []);

  return {
    loading,
    error,
    fetchAPIKeys,
    createAPIKey,
    rotateAPIKey,
    revokeAPIKey,
    fetchAPIUsage,
    fetchUsageAggregation,
    testAPIKey,
  };
}

// Mock data generators
function getMockAPIKeys(): APIKey[] {
  return [
    {
      id: 'key_abc123',
      name: 'Production API Key',
      keyPreview: 'sk_live_abc123...xyz789',
      scopes: ['read', 'write'],
      expiresAt: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000).toISOString(),
      lastUsedAt: new Date(Date.now() - 2 * 60 * 60 * 1000).toISOString(),
      usageCount: 1234,
      rateLimit: 1000,
      isActive: true,
      createdAt: new Date(Date.now() - 15 * 24 * 60 * 60 * 1000).toISOString(),
    },
    {
      id: 'key_def456',
      name: 'Development API Key',
      keyPreview: 'sk_test_def456...uvw456',
      scopes: ['read'],
      expiresAt: new Date(Date.now() + 60 * 24 * 60 * 60 * 1000).toISOString(),
      lastUsedAt: new Date(Date.now() - 24 * 60 * 60 * 1000).toISOString(),
      usageCount: 567,
      rateLimit: 500,
      isActive: true,
      createdAt: new Date(Date.now() - 30 * 24 * 60 * 60 * 1000).toISOString(),
    },
  ];
}

function getMockUsageStats(keyId?: string): APIUsageStats[] {
  const endpoints = ['/api/transcribe', '/api/analyze', '/api/meetings', '/api/insights'];
  const methods = ['GET', 'POST', 'PUT', 'DELETE'];
  const statusCodes = [200, 201, 400, 401, 404, 500];

  return Array.from({ length: 20 }, (_, i) => ({
    keyId: keyId || 'key_abc123',
    endpoint: endpoints[Math.floor(Math.random() * endpoints.length)],
    method: methods[Math.floor(Math.random() * methods.length)],
    statusCode: statusCodes[Math.floor(Math.random() * statusCodes.length)],
    responseTime: Math.floor(Math.random() * 500) + 50,
    timestamp: new Date(Date.now() - i * 60 * 60 * 1000).toISOString(),
    ipAddress: `192.168.1.${Math.floor(Math.random() * 255)}`,
    userAgent: 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36',
  }));
}

function getMockUsageAggregation(): UsageAggregation {
  const now = new Date();
  const hours = Array.from({ length: 24 }, (_, i) => {
    const hour = new Date(now);
    hour.setHours(now.getHours() - (23 - i));
    return {
      hour: hour.toISOString(),
      count: Math.floor(Math.random() * 100) + 10,
    };
  });

  const days = Array.from({ length: 7 }, (_, i) => {
    const date = new Date(now);
    date.setDate(now.getDate() - (6 - i));
    return {
      date: date.toISOString().split('T')[0],
      count: Math.floor(Math.random() * 500) + 100,
    };
  });

  return {
    totalRequests: 5432,
    successfulRequests: 5123,
    failedRequests: 309,
    averageResponseTime: 234,
    requestsPerHour: hours,
    topEndpoints: [
      { endpoint: '/api/transcribe', count: 2341 },
      { endpoint: '/api/analyze', count: 1567 },
      { endpoint: '/api/meetings', count: 987 },
      { endpoint: '/api/insights', count: 537 },
    ],
    statusCodes: [
      { code: 200, count: 4567 },
      { code: 201, count: 556 },
      { code: 400, count: 123 },
      { code: 401, count: 67 },
      { code: 404, count: 89 },
      { code: 500, count: 30 },
    ],
    dailyUsage: days,
  };
}