import { useState, useEffect, useCallback } from 'react';
import { useDispatch, useSelector } from 'react-redux';
import NetInfo from '@react-native-community/netinfo';
import { AppDispatch, RootState } from '../store';
import { syncOfflineMeetings } from '../store/slices/meetingsSlice';

interface UseOfflineSyncReturn {
  isOnline: boolean;
  isSyncing: boolean;
  lastSyncTime: Date | null;
  syncError: string | null;
  triggerSync: () => Promise<void>;
}

/**
 * Hook to manage offline sync status and operations
 */
export function useOfflineSync(): UseOfflineSyncReturn {
  const dispatch = useDispatch<AppDispatch>();
  const syncStatus = useSelector((state: RootState) => state.meetings.syncStatus);

  const [isOnline, setIsOnline] = useState(true);
  const [lastSyncTime, setLastSyncTime] = useState<Date | null>(null);
  const [syncError, setSyncError] = useState<string | null>(null);

  // Monitor network connectivity
  useEffect(() => {
    const unsubscribe = NetInfo.addEventListener((state) => {
      const online = state.isConnected && state.isInternetReachable;
      setIsOnline(!!online);

      // Auto-sync when coming back online
      if (online && !isOnline) {
        triggerSync();
      }
    });

    return () => unsubscribe();
  }, [isOnline]);

  // Trigger sync manually
  const triggerSync = useCallback(async () => {
    if (!isOnline) {
      setSyncError('Cannot sync while offline');
      return;
    }

    try {
      setSyncError(null);
      const resultAction = await dispatch(syncOfflineMeetings());

      if (syncOfflineMeetings.fulfilled.match(resultAction)) {
        setLastSyncTime(new Date());
      } else {
        setSyncError('Sync failed');
      }
    } catch (error) {
      setSyncError(error instanceof Error ? error.message : 'Sync failed');
    }
  }, [dispatch, isOnline]);

  return {
    isOnline,
    isSyncing: syncStatus === 'syncing',
    lastSyncTime,
    syncError,
    triggerSync,
  };
}

/**
 * Hook to check if a specific meeting is available offline
 */
export function useOfflineMeeting(meetingId: string) {
  const meetings = useSelector((state: RootState) => state.meetings.meetings);
  const meeting = meetings.find((m) => m.id === meetingId);

  return {
    isAvailableOffline: meeting?.isOfflineAvailable || false,
    downloadProgress: meeting?.downloadProgress || 0,
  };
}

/**
 * Hook to get offline storage statistics
 */
export function useOfflineStats() {
  const meetings = useSelector((state: RootState) => state.meetings.meetings);
  const offlineMeetings = meetings.filter((m) => m.isOfflineAvailable);

  return {
    totalOfflineMeetings: offlineMeetings.length,
    downloadingCount: meetings.filter(
      (m) => m.downloadProgress && m.downloadProgress < 100 && m.downloadProgress > 0
    ).length,
  };
}
