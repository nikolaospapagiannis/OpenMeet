import AsyncStorage from '@react-native-async-storage/async-storage';
import { api, apiHelpers } from './api';
import { Meeting } from '../store/slices/meetingsSlice';

const OFFLINE_STORAGE_PREFIX = '@offline_meeting_';
const OFFLINE_MEETINGS_KEY = '@offline_meetings_list';

interface OfflineMeeting extends Meeting {
  offlineData: {
    transcript: string;
    audioData?: string; // Base64 encoded audio
    videoData?: string; // Base64 encoded video
    downloadedAt: string;
  };
}

/**
 * Download meeting data for offline use
 */
export async function downloadMeetingOffline(
  meetingId: string,
  onProgress?: (progress: number) => void
): Promise<Meeting> {
  try {
    // 1. Fetch meeting details (10% of progress)
    const meetingResponse = await api.get(`/api/meetings/${meetingId}`);
    const meeting: Meeting = meetingResponse.data;
    onProgress?.(10);

    // 2. Download transcript (20% of progress)
    const transcriptResponse = await api.get(
      `/api/meetings/${meetingId}/transcript`
    );
    const transcript = transcriptResponse.data.transcript;
    onProgress?.(30);

    // 3. Download audio if available (50% of progress)
    let audioData: string | undefined;
    if (meeting.audioUrl) {
      const audioResponse = await apiHelpers.downloadFile(
        meeting.audioUrl,
        (fileProgress) => {
          onProgress?.(30 + (fileProgress / 100) * 40);
        }
      );
      const audioBlob = audioResponse.data;
      audioData = await blobToBase64(audioBlob);
    } else {
      onProgress?.(70);
    }

    // 4. Download video if available (30% of progress)
    let videoData: string | undefined;
    if (meeting.videoUrl) {
      const videoResponse = await apiHelpers.downloadFile(
        meeting.videoUrl,
        (fileProgress) => {
          onProgress?.(70 + (fileProgress / 100) * 20);
        }
      );
      const videoBlob = videoResponse.data;
      videoData = await blobToBase64(videoBlob);
    } else {
      onProgress?.(90);
    }

    // 5. Save to local storage
    const offlineMeeting: OfflineMeeting = {
      ...meeting,
      offlineData: {
        transcript,
        audioData,
        videoData,
        downloadedAt: new Date().toISOString(),
      },
      isOfflineAvailable: true,
    };

    await saveOfflineMeeting(offlineMeeting);
    onProgress?.(100);

    return offlineMeeting;
  } catch (error) {
    console.error('Failed to download meeting for offline use:', error);
    throw error;
  }
}

/**
 * Get meeting from offline storage
 */
export async function getMeetingFromStorage(
  meetingId: string
): Promise<OfflineMeeting | null> {
  try {
    const key = `${OFFLINE_STORAGE_PREFIX}${meetingId}`;
    const data = await AsyncStorage.getItem(key);

    if (!data) {
      return null;
    }

    return JSON.parse(data) as OfflineMeeting;
  } catch (error) {
    console.error('Failed to retrieve offline meeting:', error);
    return null;
  }
}

/**
 * Save meeting to offline storage
 */
async function saveOfflineMeeting(meeting: OfflineMeeting): Promise<void> {
  try {
    const key = `${OFFLINE_STORAGE_PREFIX}${meeting.id}`;
    await AsyncStorage.setItem(key, JSON.stringify(meeting));

    // Update list of offline meetings
    await addToOfflineMeetingsList(meeting.id);
  } catch (error) {
    console.error('Failed to save offline meeting:', error);
    throw error;
  }
}

/**
 * Delete meeting from offline storage
 */
export async function deleteOfflineMeeting(meetingId: string): Promise<void> {
  try {
    const key = `${OFFLINE_STORAGE_PREFIX}${meetingId}`;
    await AsyncStorage.removeItem(key);

    // Update list of offline meetings
    await removeFromOfflineMeetingsList(meetingId);
  } catch (error) {
    console.error('Failed to delete offline meeting:', error);
    throw error;
  }
}

/**
 * Get all offline meeting IDs
 */
export async function getOfflineMeetingIds(): Promise<string[]> {
  try {
    const data = await AsyncStorage.getItem(OFFLINE_MEETINGS_KEY);
    return data ? JSON.parse(data) : [];
  } catch (error) {
    console.error('Failed to get offline meetings list:', error);
    return [];
  }
}

/**
 * Add meeting ID to offline meetings list
 */
async function addToOfflineMeetingsList(meetingId: string): Promise<void> {
  const meetingIds = await getOfflineMeetingIds();

  if (!meetingIds.includes(meetingId)) {
    meetingIds.push(meetingId);
    await AsyncStorage.setItem(
      OFFLINE_MEETINGS_KEY,
      JSON.stringify(meetingIds)
    );
  }
}

/**
 * Remove meeting ID from offline meetings list
 */
async function removeFromOfflineMeetingsList(meetingId: string): Promise<void> {
  const meetingIds = await getOfflineMeetingIds();
  const updatedIds = meetingIds.filter((id) => id !== meetingId);

  await AsyncStorage.setItem(OFFLINE_MEETINGS_KEY, JSON.stringify(updatedIds));
}

/**
 * Get total size of offline storage
 */
export async function getOfflineStorageSize(): Promise<number> {
  try {
    const meetingIds = await getOfflineMeetingIds();
    let totalSize = 0;

    for (const meetingId of meetingIds) {
      const meeting = await getMeetingFromStorage(meetingId);
      if (meeting) {
        const meetingSize = JSON.stringify(meeting).length;
        totalSize += meetingSize;
      }
    }

    return totalSize;
  } catch (error) {
    console.error('Failed to calculate offline storage size:', error);
    return 0;
  }
}

/**
 * Clear all offline meetings
 */
export async function clearAllOfflineMeetings(): Promise<void> {
  try {
    const meetingIds = await getOfflineMeetingIds();

    for (const meetingId of meetingIds) {
      await deleteOfflineMeeting(meetingId);
    }

    await AsyncStorage.removeItem(OFFLINE_MEETINGS_KEY);
  } catch (error) {
    console.error('Failed to clear offline meetings:', error);
    throw error;
  }
}

/**
 * Sync offline meetings with server
 */
export async function syncOfflineMeetings(): Promise<Meeting[]> {
  try {
    const meetingIds = await getOfflineMeetingIds();
    const updatedMeetings: Meeting[] = [];

    for (const meetingId of meetingIds) {
      try {
        // Fetch latest meeting data from server
        const response = await api.get(`/api/meetings/${meetingId}`);
        const serverMeeting: Meeting = response.data;

        // Get local offline meeting
        const localMeeting = await getMeetingFromStorage(meetingId);

        if (localMeeting) {
          // Compare versions and update if server has newer data
          const serverDate = new Date(serverMeeting.date);
          const localDate = new Date(localMeeting.offlineData.downloadedAt);

          if (serverDate > localDate) {
            // Server has newer data, re-download
            await downloadMeetingOffline(meetingId);
            updatedMeetings.push(serverMeeting);
          }
        }
      } catch (error) {
        console.error(`Failed to sync meeting ${meetingId}:`, error);
        // Continue with other meetings
      }
    }

    return updatedMeetings;
  } catch (error) {
    console.error('Failed to sync offline meetings:', error);
    throw error;
  }
}

/**
 * Convert Blob to Base64 string
 */
function blobToBase64(blob: Blob): Promise<string> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onloadend = () => {
      if (typeof reader.result === 'string') {
        resolve(reader.result);
      } else {
        reject(new Error('Failed to convert blob to base64'));
      }
    };
    reader.onerror = reject;
    reader.readAsDataURL(blob);
  });
}

/**
 * Convert Base64 string to Blob
 */
export function base64ToBlob(base64: string): Blob {
  const parts = base64.split(';base64,');
  const contentType = parts[0].split(':')[1];
  const raw = atob(parts[1]);
  const rawLength = raw.length;
  const uInt8Array = new Uint8Array(rawLength);

  for (let i = 0; i < rawLength; ++i) {
    uInt8Array[i] = raw.charCodeAt(i);
  }

  return new Blob([uInt8Array], { type: contentType });
}
