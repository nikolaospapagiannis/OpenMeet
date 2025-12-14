import { createSlice, PayloadAction, createAsyncThunk } from '@reduxjs/toolkit';
import { api } from '../../services/api';
import { downloadMeetingOffline, getMeetingFromStorage } from '../../services/offline';

export interface Meeting {
  id: string;
  title: string;
  date: string;
  duration: number;
  participants: string[];
  transcript?: string;
  summary?: string;
  audioUrl?: string;
  videoUrl?: string;
  isOfflineAvailable: boolean;
  downloadProgress?: number;
  tags?: string[];
  actionItems?: Array<{
    id: string;
    text: string;
    assignee?: string;
    completed: boolean;
  }>;
}

interface MeetingsState {
  meetings: Meeting[];
  selectedMeeting: Meeting | null;
  loading: boolean;
  error: string | null;
  searchQuery: string;
  filters: {
    dateFrom?: string;
    dateTo?: string;
    participants?: string[];
    tags?: string[];
  };
  offlineQueue: string[]; // Meeting IDs queued for offline download
  syncStatus: 'idle' | 'syncing' | 'success' | 'error';
}

const initialState: MeetingsState = {
  meetings: [],
  selectedMeeting: null,
  loading: false,
  error: null,
  searchQuery: '',
  filters: {},
  offlineQueue: [],
  syncStatus: 'idle',
};

// Async thunks
export const fetchMeetings = createAsyncThunk(
  'meetings/fetchAll',
  async (params?: {
    search?: string;
    dateFrom?: string;
    dateTo?: string;
    tags?: string[];
  }) => {
    const response = await api.get('/api/meetings', { params });
    return response.data;
  }
);

export const fetchMeetingDetail = createAsyncThunk(
  'meetings/fetchDetail',
  async (meetingId: string, { getState }) => {
    const state = getState() as { meetings: MeetingsState };

    // Check if meeting is available offline
    const offlineMeeting = state.meetings.meetings.find(
      m => m.id === meetingId && m.isOfflineAvailable
    );

    if (offlineMeeting) {
      const cachedMeeting = await getMeetingFromStorage(meetingId);
      if (cachedMeeting) {
        return cachedMeeting;
      }
    }

    // Fetch from API
    const response = await api.get(`/api/meetings/${meetingId}`);
    return response.data;
  }
);

export const searchMeetings = createAsyncThunk(
  'meetings/search',
  async (query: string) => {
    const response = await api.get('/api/meetings/search', {
      params: { q: query },
    });
    return response.data;
  }
);

export const downloadForOffline = createAsyncThunk(
  'meetings/downloadOffline',
  async (meetingId: string, { dispatch }) => {
    const meeting = await downloadMeetingOffline(meetingId, (progress) => {
      dispatch(updateDownloadProgress({ meetingId, progress }));
    });
    return meeting;
  }
);

export const syncOfflineMeetings = createAsyncThunk(
  'meetings/syncOffline',
  async (_, { getState }) => {
    const state = getState() as { meetings: MeetingsState };
    const offlineMeetings = state.meetings.meetings.filter(
      m => m.isOfflineAvailable
    );

    // Sync offline meetings with server
    const response = await api.post('/api/meetings/sync', {
      meetingIds: offlineMeetings.map(m => m.id),
    });

    return response.data;
  }
);

export const deleteMeeting = createAsyncThunk(
  'meetings/delete',
  async (meetingId: string) => {
    await api.delete(`/api/meetings/${meetingId}`);
    return meetingId;
  }
);

export const updateMeetingTags = createAsyncThunk(
  'meetings/updateTags',
  async ({ meetingId, tags }: { meetingId: string; tags: string[] }) => {
    const response = await api.patch(`/api/meetings/${meetingId}/tags`, { tags });
    return response.data;
  }
);

export const toggleActionItemComplete = createAsyncThunk(
  'meetings/toggleActionItem',
  async ({
    meetingId,
    actionItemId,
    completed,
  }: {
    meetingId: string;
    actionItemId: string;
    completed: boolean;
  }) => {
    const response = await api.patch(
      `/api/meetings/${meetingId}/action-items/${actionItemId}`,
      { completed }
    );
    return response.data;
  }
);

const meetingsSlice = createSlice({
  name: 'meetings',
  initialState,
  reducers: {
    setSearchQuery: (state, action: PayloadAction<string>) => {
      state.searchQuery = action.payload;
    },
    setFilters: (
      state,
      action: PayloadAction<MeetingsState['filters']>
    ) => {
      state.filters = action.payload;
    },
    clearFilters: (state) => {
      state.filters = {};
      state.searchQuery = '';
    },
    setSelectedMeeting: (state, action: PayloadAction<Meeting | null>) => {
      state.selectedMeeting = action.payload;
    },
    addToOfflineQueue: (state, action: PayloadAction<string>) => {
      if (!state.offlineQueue.includes(action.payload)) {
        state.offlineQueue.push(action.payload);
      }
    },
    removeFromOfflineQueue: (state, action: PayloadAction<string>) => {
      state.offlineQueue = state.offlineQueue.filter(
        id => id !== action.payload
      );
    },
    updateDownloadProgress: (
      state,
      action: PayloadAction<{ meetingId: string; progress: number }>
    ) => {
      const meeting = state.meetings.find(
        m => m.id === action.payload.meetingId
      );
      if (meeting) {
        meeting.downloadProgress = action.payload.progress;
      }
    },
    clearError: (state) => {
      state.error = null;
    },
  },
  extraReducers: (builder) => {
    builder
      // Fetch meetings
      .addCase(fetchMeetings.pending, (state) => {
        state.loading = true;
        state.error = null;
      })
      .addCase(fetchMeetings.fulfilled, (state, action) => {
        state.loading = false;
        state.meetings = action.payload;
      })
      .addCase(fetchMeetings.rejected, (state, action) => {
        state.loading = false;
        state.error = action.error.message || 'Failed to fetch meetings';
      })
      // Fetch meeting detail
      .addCase(fetchMeetingDetail.pending, (state) => {
        state.loading = true;
        state.error = null;
      })
      .addCase(fetchMeetingDetail.fulfilled, (state, action) => {
        state.loading = false;
        state.selectedMeeting = action.payload;
        // Update in meetings list if exists
        const index = state.meetings.findIndex(m => m.id === action.payload.id);
        if (index !== -1) {
          state.meetings[index] = action.payload;
        }
      })
      .addCase(fetchMeetingDetail.rejected, (state, action) => {
        state.loading = false;
        state.error = action.error.message || 'Failed to fetch meeting details';
      })
      // Search meetings
      .addCase(searchMeetings.pending, (state) => {
        state.loading = true;
      })
      .addCase(searchMeetings.fulfilled, (state, action) => {
        state.loading = false;
        state.meetings = action.payload;
      })
      .addCase(searchMeetings.rejected, (state, action) => {
        state.loading = false;
        state.error = action.error.message || 'Search failed';
      })
      // Download for offline
      .addCase(downloadForOffline.pending, (state, action) => {
        const meetingId = action.meta.arg;
        state.offlineQueue.push(meetingId);
      })
      .addCase(downloadForOffline.fulfilled, (state, action) => {
        const meetingId = action.payload.id;
        state.offlineQueue = state.offlineQueue.filter(id => id !== meetingId);
        const meeting = state.meetings.find(m => m.id === meetingId);
        if (meeting) {
          meeting.isOfflineAvailable = true;
          meeting.downloadProgress = 100;
        }
      })
      .addCase(downloadForOffline.rejected, (state, action) => {
        const meetingId = action.meta.arg;
        state.offlineQueue = state.offlineQueue.filter(id => id !== meetingId);
        state.error = 'Failed to download meeting for offline use';
      })
      // Sync offline meetings
      .addCase(syncOfflineMeetings.pending, (state) => {
        state.syncStatus = 'syncing';
      })
      .addCase(syncOfflineMeetings.fulfilled, (state, action) => {
        state.syncStatus = 'success';
        // Update meetings with synced data
        action.payload.forEach((syncedMeeting: Meeting) => {
          const index = state.meetings.findIndex(m => m.id === syncedMeeting.id);
          if (index !== -1) {
            state.meetings[index] = syncedMeeting;
          }
        });
      })
      .addCase(syncOfflineMeetings.rejected, (state) => {
        state.syncStatus = 'error';
      })
      // Delete meeting
      .addCase(deleteMeeting.fulfilled, (state, action) => {
        state.meetings = state.meetings.filter(m => m.id !== action.payload);
        if (state.selectedMeeting?.id === action.payload) {
          state.selectedMeeting = null;
        }
      })
      // Update tags
      .addCase(updateMeetingTags.fulfilled, (state, action) => {
        const meeting = state.meetings.find(m => m.id === action.payload.id);
        if (meeting) {
          meeting.tags = action.payload.tags;
        }
        if (state.selectedMeeting?.id === action.payload.id) {
          state.selectedMeeting.tags = action.payload.tags;
        }
      })
      // Toggle action item
      .addCase(toggleActionItemComplete.fulfilled, (state, action) => {
        const meeting = state.meetings.find(m => m.id === action.payload.meetingId);
        if (meeting?.actionItems) {
          const actionItem = meeting.actionItems.find(
            ai => ai.id === action.payload.actionItemId
          );
          if (actionItem) {
            actionItem.completed = action.payload.completed;
          }
        }
        if (state.selectedMeeting?.actionItems) {
          const actionItem = state.selectedMeeting.actionItems.find(
            ai => ai.id === action.payload.actionItemId
          );
          if (actionItem) {
            actionItem.completed = action.payload.completed;
          }
        }
      });
  },
});

export const {
  setSearchQuery,
  setFilters,
  clearFilters,
  setSelectedMeeting,
  addToOfflineQueue,
  removeFromOfflineQueue,
  updateDownloadProgress,
  clearError,
} = meetingsSlice.actions;

export default meetingsSlice.reducer;
