'use client';

import { useState, useEffect, useCallback } from 'react';

interface UserProfile {
  id: string;
  email: string;
  firstName: string;
  lastName: string;
  avatarUrl?: string;
  phone?: string;
  jobTitle?: string;
  company?: string;
  location?: string;
  bio?: string;
  preferences?: {
    timezone?: string;
    language?: string;
    notifications?: {
      channels?: Record<string, boolean>;
      categories?: Array<{
        id: string;
        channels: Record<string, boolean>;
        frequency?: string;
      }>;
      digestFrequency?: string;
      quietHours?: {
        enabled: boolean;
        start: string;
        end: string;
      };
    };
    theme?: 'light' | 'dark' | 'system';
    dateFormat?: string;
    timeFormat?: '12h' | '24h';
    social?: {
      linkedIn?: string;
      twitter?: string;
      website?: string;
    };
  };
  role?: string;
  emailVerified?: boolean;
  mfaEnabled?: boolean;
  isActive?: boolean;
  lastLoginAt?: string;
  createdAt?: string;
  updatedAt?: string;
}

interface UseProfileSettingsReturn {
  profile: UserProfile | null;
  loading: boolean;
  error: string | null;
  updateProfile: (updates: Partial<UserProfile>) => Promise<void>;
  updateAvatar: (avatarUrl: string) => Promise<void>;
  updatePassword: (currentPassword: string, newPassword: string) => Promise<void>;
  updatePreferences: (preferences: Partial<UserProfile['preferences']>) => Promise<void>;
  deleteAccount: (confirmData: {
    email: string;
    password: string;
    confirmPhrase: string;
  }) => Promise<void>;
  exportData: () => Promise<void>;
  refreshProfile: () => Promise<void>;
}

export function useProfileSettings(userId?: string): UseProfileSettingsReturn {
  const [profile, setProfile] = useState<UserProfile | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  // Fetch user profile
  const fetchProfile = useCallback(async () => {
    if (!userId) {
      setLoading(false);
      return;
    }

    setLoading(true);
    setError(null);

    try {
      const response = await fetch('/api/users/me', {
        headers: {
          'x-user-id': userId,
        },
      });

      if (!response.ok) {
        throw new Error('Failed to fetch profile');
      }

      const data = await response.json();
      setProfile(data);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to load profile');
    } finally {
      setLoading(false);
    }
  }, [userId]);

  useEffect(() => {
    fetchProfile();
  }, [fetchProfile]);

  // Update profile information
  const updateProfile = async (updates: Partial<UserProfile>) => {
    if (!userId) {
      throw new Error('User ID is required');
    }

    try {
      const response = await fetch('/api/users/me', {
        method: 'PATCH',
        headers: {
          'Content-Type': 'application/json',
          'x-user-id': userId,
        },
        body: JSON.stringify(updates),
      });

      if (!response.ok) {
        throw new Error('Failed to update profile');
      }

      const updatedProfile = await response.json();
      setProfile(prev => ({ ...prev, ...updatedProfile }));
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to update profile');
      throw err;
    }
  };

  // Update avatar
  const updateAvatar = async (avatarUrl: string) => {
    if (!userId) {
      throw new Error('User ID is required');
    }

    try {
      const response = await fetch('/api/users/me/avatar', {
        method: 'PATCH',
        headers: {
          'Content-Type': 'application/json',
          'x-user-id': userId,
        },
        body: JSON.stringify({ avatarUrl }),
      });

      if (!response.ok) {
        throw new Error('Failed to update avatar');
      }

      setProfile(prev => prev ? { ...prev, avatarUrl } : null);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to update avatar');
      throw err;
    }
  };

  // Update password
  const updatePassword = async (currentPassword: string, newPassword: string) => {
    if (!userId) {
      throw new Error('User ID is required');
    }

    try {
      const response = await fetch('/api/users/me/change-password', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'x-user-id': userId,
        },
        body: JSON.stringify({ currentPassword, newPassword }),
      });

      if (!response.ok) {
        const data = await response.json();
        throw new Error(data.error || 'Failed to update password');
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to update password');
      throw err;
    }
  };

  // Update preferences
  const updatePreferences = async (preferences: Partial<UserProfile['preferences']>) => {
    if (!userId) {
      throw new Error('User ID is required');
    }

    try {
      const currentPreferences = profile?.preferences || {};
      const mergedPreferences = {
        ...currentPreferences,
        ...preferences,
      };

      const response = await fetch('/api/users/me', {
        method: 'PATCH',
        headers: {
          'Content-Type': 'application/json',
          'x-user-id': userId,
        },
        body: JSON.stringify({
          preferences: mergedPreferences,
        }),
      });

      if (!response.ok) {
        throw new Error('Failed to update preferences');
      }

      setProfile(prev => prev ? {
        ...prev,
        preferences: mergedPreferences,
      } : null);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to update preferences');
      throw err;
    }
  };

  // Delete account
  const deleteAccount = async (confirmData: {
    email: string;
    password: string;
    confirmPhrase: string;
  }) => {
    if (!userId) {
      throw new Error('User ID is required');
    }

    try {
      const response = await fetch('/api/users/me', {
        method: 'DELETE',
        headers: {
          'Content-Type': 'application/json',
          'x-user-id': userId,
        },
        body: JSON.stringify(confirmData),
      });

      if (!response.ok) {
        const data = await response.json();
        throw new Error(data.error || 'Failed to delete account');
      }

      // Clear profile after successful deletion
      setProfile(null);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to delete account');
      throw err;
    }
  };

  // Export user data
  const exportData = async () => {
    if (!userId) {
      throw new Error('User ID is required');
    }

    try {
      const response = await fetch('/api/users/me/export', {
        method: 'POST',
        headers: {
          'x-user-id': userId,
        },
      });

      if (!response.ok) {
        throw new Error('Failed to request data export');
      }

      // In a real implementation, this might trigger an email with a download link
      // or return a download URL
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to export data');
      throw err;
    }
  };

  // Refresh profile
  const refreshProfile = async () => {
    await fetchProfile();
  };

  return {
    profile,
    loading,
    error,
    updateProfile,
    updateAvatar,
    updatePassword,
    updatePreferences,
    deleteAccount,
    exportData,
    refreshProfile,
  };
}