import { useState, useCallback, useEffect } from 'react';
import apiClient from '@/lib/api';

export interface TeamMember {
  id: string;
  email: string;
  firstName?: string;
  lastName?: string;
  avatarUrl?: string;
  role: 'user' | 'admin' | 'super_admin';
  isActive: boolean;
  lastLoginAt?: string;
  createdAt: string;
}

export interface TeamInvite {
  id: string;
  email: string;
  role: string;
  status: string;
  expiresAt: string;
  createdAt: string;
  invitedBy: {
    id: string;
    firstName?: string;
    lastName?: string;
    email: string;
  };
}

export interface TeamActivity {
  id: string;
  action: string;
  actionLabel?: string;
  resourceType?: string;
  resourceId?: string;
  createdAt: string;
  user?: {
    id: string;
    firstName?: string;
    lastName?: string;
    email: string;
    avatarUrl?: string;
  };
  metadata?: any;
}

export interface SeatUsage {
  tier: string;
  maxSeats: number;
  usedSeats: number;
  availableSeats: number;
  pendingInvites: number;
  inactiveUsers: number;
  usage: {
    percentage: number;
    status: 'ok' | 'warning' | 'full';
  };
}

export function useTeamManagement() {
  const [teamMembers, setTeamMembers] = useState<TeamMember[]>([]);
  const [pendingInvites, setPendingInvites] = useState<TeamInvite[]>([]);
  const [activities, setActivities] = useState<TeamActivity[]>([]);
  const [seatUsage, setSeatUsage] = useState<SeatUsage | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Fetch team members
  const fetchTeamMembers = useCallback(async () => {
    try {
      setIsLoading(true);
      setError(null);
      const response = await apiClient.getTeamMembers();
      setTeamMembers(response.data || []);
    } catch (err) {
      setError('Failed to fetch team members');
      console.error('Error fetching team members:', err);
    } finally {
      setIsLoading(false);
    }
  }, []);

  // Fetch pending invites
  const fetchPendingInvites = useCallback(async () => {
    try {
      setIsLoading(true);
      setError(null);
      const response = await apiClient.getPendingInvites();
      setPendingInvites(response.data || []);
    } catch (err) {
      setError('Failed to fetch pending invites');
      console.error('Error fetching pending invites:', err);
    } finally {
      setIsLoading(false);
    }
  }, []);

  // Fetch activity log
  const fetchActivityLog = useCallback(async (params?: {
    page?: number;
    limit?: number;
    userId?: string;
    action?: string;
    startDate?: string;
    endDate?: string;
  }) => {
    try {
      setIsLoading(true);
      setError(null);
      const response = await apiClient.getTeamActivityLog(params);
      setActivities(response.data || []);
      return response;
    } catch (err) {
      setError('Failed to fetch activity log');
      console.error('Error fetching activity log:', err);
      return null;
    } finally {
      setIsLoading(false);
    }
  }, []);

  // Fetch seat usage
  const fetchSeatUsage = useCallback(async () => {
    try {
      setIsLoading(true);
      setError(null);
      const response = await apiClient.getSeatUsage();
      setSeatUsage(response);
    } catch (err) {
      setError('Failed to fetch seat usage');
      console.error('Error fetching seat usage:', err);
    } finally {
      setIsLoading(false);
    }
  }, []);

  // Invite team member
  const inviteTeamMember = useCallback(async (email: string, role: string = 'user') => {
    try {
      setIsLoading(true);
      setError(null);
      await apiClient.inviteTeamMember(email, role);
      await fetchPendingInvites();
      return { success: true };
    } catch (err: any) {
      const errorMessage = err.response?.data?.error || 'Failed to send invitation';
      setError(errorMessage);
      return { success: false, error: errorMessage };
    } finally {
      setIsLoading(false);
    }
  }, [fetchPendingInvites]);

  // Bulk invite team members
  const bulkInviteTeamMembers = useCallback(async (csvData: string, defaultRole?: string) => {
    try {
      setIsLoading(true);
      setError(null);
      const response = await apiClient.bulkInviteTeamMembers(csvData, defaultRole);
      await fetchPendingInvites();
      return { success: true, data: response };
    } catch (err: any) {
      const errorMessage = err.response?.data?.error || 'Failed to process bulk invitations';
      setError(errorMessage);
      return { success: false, error: errorMessage };
    } finally {
      setIsLoading(false);
    }
  }, [fetchPendingInvites]);

  // Resend invite
  const resendInvite = useCallback(async (inviteId: string) => {
    try {
      setIsLoading(true);
      setError(null);
      await apiClient.resendInvite(inviteId);
      return { success: true };
    } catch (err: any) {
      const errorMessage = err.response?.data?.error || 'Failed to resend invitation';
      setError(errorMessage);
      return { success: false, error: errorMessage };
    } finally {
      setIsLoading(false);
    }
  }, []);

  // Revoke invite
  const revokeInvite = useCallback(async (inviteId: string) => {
    try {
      setIsLoading(true);
      setError(null);
      await apiClient.revokeInvite(inviteId);
      await fetchPendingInvites();
      return { success: true };
    } catch (err: any) {
      const errorMessage = err.response?.data?.error || 'Failed to revoke invitation';
      setError(errorMessage);
      return { success: false, error: errorMessage };
    } finally {
      setIsLoading(false);
    }
  }, [fetchPendingInvites]);

  // Update team member role
  const updateMemberRole = useCallback(async (userId: string, role: string) => {
    try {
      setIsLoading(true);
      setError(null);
      await apiClient.updateTeamMemberRole(userId, role);
      await fetchTeamMembers();
      return { success: true };
    } catch (err: any) {
      const errorMessage = err.response?.data?.error || 'Failed to update role';
      setError(errorMessage);
      return { success: false, error: errorMessage };
    } finally {
      setIsLoading(false);
    }
  }, [fetchTeamMembers]);

  // Batch assign roles
  const assignRolesToMembers = useCallback(async (userIds: string[], role: string) => {
    try {
      setIsLoading(true);
      setError(null);
      const response = await apiClient.assignRolesToMembers(userIds, role);
      await fetchTeamMembers();
      return { success: true, data: response };
    } catch (err: any) {
      const errorMessage = err.response?.data?.error || 'Failed to assign roles';
      setError(errorMessage);
      return { success: false, error: errorMessage };
    } finally {
      setIsLoading(false);
    }
  }, [fetchTeamMembers]);

  // Remove team member
  const removeMember = useCallback(async (userId: string) => {
    try {
      setIsLoading(true);
      setError(null);
      await apiClient.removeTeamMember(userId);
      await fetchTeamMembers();
      return { success: true };
    } catch (err: any) {
      const errorMessage = err.response?.data?.error || 'Failed to remove member';
      setError(errorMessage);
      return { success: false, error: errorMessage };
    } finally {
      setIsLoading(false);
    }
  }, [fetchTeamMembers]);

  // Initial load
  useEffect(() => {
    fetchTeamMembers();
    fetchPendingInvites();
    fetchSeatUsage();
  }, [fetchTeamMembers, fetchPendingInvites, fetchSeatUsage]);

  return {
    // Data
    teamMembers,
    pendingInvites,
    activities,
    seatUsage,
    isLoading,
    error,

    // Actions
    fetchTeamMembers,
    fetchPendingInvites,
    fetchActivityLog,
    fetchSeatUsage,
    inviteTeamMember,
    bulkInviteTeamMembers,
    resendInvite,
    revokeInvite,
    updateMemberRole,
    assignRolesToMembers,
    removeMember,
  };
}