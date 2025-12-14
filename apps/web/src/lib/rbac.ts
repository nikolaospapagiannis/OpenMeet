/**
 * Frontend RBAC Utilities
 * Client-side permission checking and access control
 *
 * Features:
 * - usePermission hook for components
 * - hasPermission function for programmatic checks
 * - ProtectedComponent wrapper
 * - Permission-aware UI utilities
 */

'use client';

import { useEffect, useState, ReactNode } from 'react';
import { useAuth } from '@/contexts/AuthContext';

// Types
export interface Permission {
  id: string;
  name: string;
  resource: string;
  action: string;
  description?: string;
  category?: string;
}

export interface Role {
  id: string;
  name: string;
  description?: string;
  permissions: Permission[];
}

// Permission cache (client-side)
let userPermissionsCache: string[] | null = null;
let cacheTimestamp: number = 0;
const CACHE_DURATION = 5 * 60 * 1000; // 5 minutes

/**
 * Fetch user permissions from API
 */
async function fetchUserPermissions(): Promise<string[]> {
  try {
    const response = await fetch('/api/rbac/users/me/permissions', {
      credentials: 'include',
    });

    if (!response.ok) {
      console.error('Failed to fetch permissions:', response.statusText);
      return [];
    }

    const data = await response.json();
    return data.data || [];
  } catch (error) {
    console.error('Error fetching permissions:', error);
    return [];
  }
}

/**
 * Get user permissions with caching
 */
async function getUserPermissions(force = false): Promise<string[]> {
  const now = Date.now();

  // Return cached permissions if still valid
  if (!force && userPermissionsCache && now - cacheTimestamp < CACHE_DURATION) {
    return userPermissionsCache;
  }

  // Fetch fresh permissions
  const permissions = await fetchUserPermissions();
  userPermissionsCache = permissions;
  cacheTimestamp = now;

  return permissions;
}

/**
 * Clear permission cache
 * Call this after role changes or permission updates
 */
export function clearPermissionCache(): void {
  userPermissionsCache = null;
  cacheTimestamp = 0;
}

/**
 * Check if user has a specific permission (programmatic)
 * @param permissionName - Permission to check (e.g., 'meetings.create')
 */
export async function hasPermission(permissionName: string): Promise<boolean> {
  const permissions = await getUserPermissions();
  return permissions.includes(permissionName);
}

/**
 * Check if user has ANY of the specified permissions
 */
export async function hasAnyPermission(permissionNames: string[]): Promise<boolean> {
  const permissions = await getUserPermissions();
  return permissionNames.some((perm) => permissions.includes(perm));
}

/**
 * Check if user has ALL of the specified permissions
 */
export async function hasAllPermissions(permissionNames: string[]): Promise<boolean> {
  const permissions = await getUserPermissions();
  return permissionNames.every((perm) => permissions.includes(perm));
}

/**
 * React Hook: Check if user has a permission
 * Returns loading state and permission status
 *
 * @example
 * const { hasPermission, loading } = usePermission('meetings.create');
 * if (loading) return <Spinner />;
 * if (!hasPermission) return null;
 * return <CreateButton />;
 */
export function usePermission(permissionName: string) {
  const [hasPermissionState, setHasPermissionState] = useState(false);
  const [loading, setLoading] = useState(true);
  const { isAuthenticated, user } = useAuth();

  useEffect(() => {
    if (!isAuthenticated || !user) {
      setHasPermissionState(false);
      setLoading(false);
      return;
    }

    const checkPermission = async () => {
      try {
        setLoading(true);
        const result = await hasPermission(permissionName);
        setHasPermissionState(result);
      } catch (error) {
        console.error('Permission check failed:', error);
        setHasPermissionState(false);
      } finally {
        setLoading(false);
      }
    };

    checkPermission();
  }, [permissionName, isAuthenticated, user]);

  return { hasPermission: hasPermissionState, loading };
}

/**
 * React Hook: Check if user has ANY of the permissions
 */
export function useAnyPermission(permissionNames: string[]) {
  const [hasPermissionState, setHasPermissionState] = useState(false);
  const [loading, setLoading] = useState(true);
  const { isAuthenticated, user } = useAuth();

  useEffect(() => {
    if (!isAuthenticated || !user) {
      setHasPermissionState(false);
      setLoading(false);
      return;
    }

    const checkPermission = async () => {
      try {
        setLoading(true);
        const result = await hasAnyPermission(permissionNames);
        setHasPermissionState(result);
      } catch (error) {
        console.error('Permission check failed:', error);
        setHasPermissionState(false);
      } finally {
        setLoading(false);
      }
    };

    checkPermission();
  }, [permissionNames.join(','), isAuthenticated, user]);

  return { hasPermission: hasPermissionState, loading };
}

/**
 * React Hook: Check if user has ALL of the permissions
 */
export function useAllPermissions(permissionNames: string[]) {
  const [hasPermissionState, setHasPermissionState] = useState(false);
  const [loading, setLoading] = useState(true);
  const { isAuthenticated, user } = useAuth();

  useEffect(() => {
    if (!isAuthenticated || !user) {
      setHasPermissionState(false);
      setLoading(false);
      return;
    }

    const checkPermission = async () => {
      try {
        setLoading(true);
        const result = await hasAllPermissions(permissionNames);
        setHasPermissionState(result);
      } catch (error) {
        console.error('Permission check failed:', error);
        setHasPermissionState(false);
      } finally {
        setLoading(false);
      }
    };

    checkPermission();
  }, [permissionNames.join(','), isAuthenticated, user]);

  return { hasPermission: hasPermissionState, loading };
}

/**
 * React Hook: Get all user permissions
 */
export function useUserPermissions() {
  const [permissions, setPermissions] = useState<string[]>([]);
  const [loading, setLoading] = useState(true);
  const { isAuthenticated, user } = useAuth();

  useEffect(() => {
    if (!isAuthenticated || !user) {
      setPermissions([]);
      setLoading(false);
      return;
    }

    const fetchPermissions = async () => {
      try {
        setLoading(true);
        const perms = await getUserPermissions();
        setPermissions(perms);
      } catch (error) {
        console.error('Failed to fetch permissions:', error);
        setPermissions([]);
      } finally {
        setLoading(false);
      }
    };

    fetchPermissions();
  }, [isAuthenticated, user]);

  return { permissions, loading, refetch: () => getUserPermissions(true) };
}

/**
 * Protected Component Wrapper
 * Only renders children if user has the required permission
 *
 * @example
 * <ProtectedComponent permission="meetings.create">
 *   <CreateMeetingButton />
 * </ProtectedComponent>
 *
 * @example With fallback
 * <ProtectedComponent
 *   permission="meetings.create"
 *   fallback={<div>You don't have permission to create meetings</div>}
 * >
 *   <CreateMeetingButton />
 * </ProtectedComponent>
 *
 * @example With loading state
 * <ProtectedComponent
 *   permission="meetings.create"
 *   loading={<Spinner />}
 * >
 *   <CreateMeetingButton />
 * </ProtectedComponent>
 */
export function ProtectedComponent({
  permission,
  anyOf,
  allOf,
  children,
  fallback = null,
  loading = null,
  showFallbackOnLoading = false,
}: {
  permission?: string;
  anyOf?: string[];
  allOf?: string[];
  children: ReactNode;
  fallback?: ReactNode;
  loading?: ReactNode;
  showFallbackOnLoading?: boolean;
}) {
  let permissionCheck: { hasPermission: boolean; loading: boolean };

  if (permission) {
    permissionCheck = usePermission(permission);
  } else if (anyOf) {
    permissionCheck = useAnyPermission(anyOf);
  } else if (allOf) {
    permissionCheck = useAllPermissions(allOf);
  } else {
    throw new Error('ProtectedComponent requires permission, anyOf, or allOf prop');
  }

  if (permissionCheck.loading) {
    if (showFallbackOnLoading) {
      return fallback;
    }
    return loading;
  }

  if (!permissionCheck.hasPermission) {
    return fallback;
  }

  return children;
}

/**
 * Permission-aware button helper
 * Check if button should be disabled based on permission
 * Usage: Use usePermission hook in your button component
 */
export function usePermissionButton(permission: string) {
  const { hasPermission: hasPermissionState, loading } = usePermission(permission);

  return {
    disabled: loading || !hasPermissionState,
    title: !hasPermissionState ? 'You do not have permission to perform this action' : undefined,
  };
}

/**
 * Check if user can perform an action on a resource
 * Uses API to check both role-based and resource-level permissions
 */
export async function canAccessResource(
  permission: string,
  resourceType: string,
  resourceId: string
): Promise<boolean> {
  try {
    const response = await fetch('/api/rbac/check-permission', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      credentials: 'include',
      body: JSON.stringify({
        permission,
        resourceType,
        resourceId,
      }),
    });

    if (!response.ok) {
      return false;
    }

    const result = await response.json();
    return result.granted || false;
  } catch (error) {
    console.error('Resource permission check failed:', error);
    return false;
  }
}

/**
 * Utility function to check if user has role
 */
export async function hasRole(roleName: string): Promise<boolean> {
  try {
    const response = await fetch('/api/rbac/users/me/roles', {
      credentials: 'include',
    });

    if (!response.ok) {
      return false;
    }

    const data = await response.json();
    const roles = data.data || [];
    return roles.some((r: any) => r.role.name === roleName);
  } catch (error) {
    console.error('Role check failed:', error);
    return false;
  }
}

/**
 * React Hook: Check if user has a role
 */
export function useRole(roleName: string) {
  const [hasRoleState, setHasRoleState] = useState(false);
  const [loading, setLoading] = useState(true);
  const { isAuthenticated, user } = useAuth();

  useEffect(() => {
    if (!isAuthenticated || !user) {
      setHasRoleState(false);
      setLoading(false);
      return;
    }

    const checkRole = async () => {
      try {
        setLoading(true);
        const result = await hasRole(roleName);
        setHasRoleState(result);
      } catch (error) {
        console.error('Role check failed:', error);
        setHasRoleState(false);
      } finally {
        setLoading(false);
      }
    };

    checkRole();
  }, [roleName, isAuthenticated, user]);

  return { hasRole: hasRoleState, loading };
}
