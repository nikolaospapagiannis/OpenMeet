/**
 * Chrome Extension Background Service Worker
 * Manages extension lifecycle, API communication, and meeting detection
 *
 * Configuration is loaded from config.js (generated from .env)
 */

// Import configuration and utilities
importScripts('config.js');
importScripts('utils/logger.js');

// Extension state
let authToken = null;
let currentMeeting = null;
let currentSessionId = null; // Backend session ID
let recordingStatus = 'idle'; // idle, recording, paused
let websocket = null;
let audioChunkIndex = 0;

// Initialize extension
chrome.runtime.onInstalled.addListener(() => {
  Logger.log('OpenMeet Extension installed');

  // Set default settings
  chrome.storage.sync.set({
    autoRecord: true,
    notifyOnStart: true,
    transcriptionLanguage: 'en-US',
    saveToDrive: false
  });

  // Create context menu items
  chrome.contextMenus.create({
    id: 'start-recording',
    title: 'Start Recording',
    contexts: ['page'],
    documentUrlPatterns: [
      'https://meet.google.com/*',
      'https://*.zoom.us/*',
      'https://teams.microsoft.com/*'
    ]
  });

  chrome.contextMenus.create({
    id: 'stop-recording',
    title: 'Stop Recording',
    contexts: ['page'],
    documentUrlPatterns: [
      'https://meet.google.com/*',
      'https://*.zoom.us/*',
      'https://teams.microsoft.com/*'
    ]
  });
});

// Handle messages from content scripts AND popup
chrome.runtime.onMessage.addListener((request, sender, sendResponse) => {
  switch (request.action) {
    case 'meeting-detected':
      handleMeetingDetected(request.data, sender.tab);
      sendResponse({ success: true });
      break;

    case 'meeting-ended':
      handleMeetingEnded(request.data, sender.tab);
      sendResponse({ success: true });
      break;

    case 'start-recording':
      // Handle start-recording from popup (sender.tab is undefined) OR from content script
      handleStartRecordingRequest(request.data, sender.tab)
        .then(result => sendResponse(result))
        .catch(error => sendResponse({ success: false, error: error.message }));
      return true; // Keep channel open for async response

    case 'stop-recording':
      stopRecording()
        .then(() => sendResponse({ success: true }))
        .catch(error => sendResponse({ success: false, error: error.message }));
      return true;

    case 'get-status':
      sendResponse({
        isAuthenticated: !!authToken,
        recordingStatus,
        currentMeeting,
        currentSessionId
      });
      break;

    case 'authenticate':
      authenticateUser(request.credentials)
        .then(result => sendResponse(result))
        .catch(error => sendResponse({ success: false, error: error.message }));
      return true;

    case 'logout':
      logout();
      sendResponse({ success: true });
      break;

    case 'capture-audio':
      captureAudioStream(sender.tab.id)
        .then(stream => sendResponse({ success: true, stream }))
        .catch(error => sendResponse({ success: false, error: error.message }));
      return true;

    case 'audio-chunk':
      handleAudioChunk(request.data);
      sendResponse({ success: true });
      break;

    case 'recording-complete':
      handleRecordingComplete(request.data);
      sendResponse({ success: true });
      break;

    case 'transcript-segment':
      handleTranscriptSegment(request.data);
      sendResponse({ success: true });
      break;

    case 'analytics-event':
      Logger.analytics(request.event, request.data);
      sendResponse({ success: true });
      break;

    case 'ping':
      sendResponse({ success: true });
      break;

    default:
      sendResponse({ success: false, error: 'Unknown action' });
  }
});

// Handle start-recording request (from popup or content script)
async function handleStartRecordingRequest(meetingData, senderTab) {
  // If called from popup, sender.tab is undefined, so get the active tab
  let tab = senderTab;
  if (!tab) {
    const tabs = await chrome.tabs.query({ active: true, currentWindow: true });
    if (tabs.length === 0) {
      throw new Error('No active tab found');
    }
    tab = tabs[0];
  }

  // If meetingData includes url, use it; otherwise use tab.url
  const meetingInfo = {
    platform: meetingData?.platform || 'unknown',
    url: meetingData?.url || tab.url,
    title: meetingData?.title || tab.title,
    id: meetingData?.id,
    participants: meetingData?.participants || []
  };

  await startRecording(meetingInfo, tab);
  return { success: true, sessionId: currentSessionId };
}

// Handle meeting detection - Start backend session
async function handleMeetingDetected(meetingData, tab) {
  Logger.analytics('meeting_detected', { platform: meetingData.platform });

  currentMeeting = {
    ...meetingData,
    tabId: tab.id,
    startTime: new Date().toISOString(),
    url: tab.url,
    title: tab.title
  };

  // Get auto-record setting
  const settings = await chrome.storage.sync.get(['autoRecord', 'notifyOnStart']);

  if (settings.autoRecord && authToken) {
    await startRecording(meetingData, tab);
  }

  if (settings.notifyOnStart) {
    chrome.notifications.create({
      type: 'basic',
      iconUrl: 'icons/icon-128.png',
      title: 'Meeting Detected',
      message: meetingData.platform + ' meeting detected. ' + (settings.autoRecord ? 'Recording started.' : 'Click to start recording.')
    });
  }

  // Update extension badge
  chrome.action.setBadgeText({ text: 'REC', tabId: tab.id });
  chrome.action.setBadgeBackgroundColor({ color: '#ff0000', tabId: tab.id });
}

// Handle meeting end - End backend session
async function handleMeetingEnded(data, tab) {
  Logger.analytics('meeting_ended', { hasMeeting: !!currentMeeting, hasSession: !!currentSessionId });

  if (recordingStatus === 'recording') {
    await stopRecording();
  }

  // Clear badge
  if (tab?.id) {
    chrome.action.setBadgeText({ text: '', tabId: tab.id });
  }

  currentMeeting = null;
}

// Start recording - Create backend session
async function startRecording(meetingData, tab) {
  if (!authToken) {
    Logger.error('Cannot start recording - not authenticated');
    chrome.notifications.create({
      type: 'basic',
      iconUrl: 'icons/icon-128.png',
      title: 'Authentication Required',
      message: 'Please log in to start recording.'
    });
    throw new Error('Not authenticated');
  }

  Logger.analytics('recording_started', { platform: meetingData?.platform });
  Logger.log('Starting recording', { meetingData, tabId: tab?.id });

  try {
    // Start backend session via /api/extension/sessions/start
    const sessionResponse = await fetch(Config.SESSIONS_URL + '/start', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': 'Bearer ' + authToken
      },
      body: JSON.stringify({
        platform: meetingData?.platform || 'unknown',
        meetingUrl: meetingData?.url || tab.url,
        meetingId: meetingData?.id,
        title: meetingData?.title || tab.title,
        participants: meetingData?.participants || []
      })
    });

    if (!sessionResponse.ok) {
      const error = await sessionResponse.json();
      throw new Error(error.error || 'Failed to start session');
    }

    const sessionData = await sessionResponse.json();
    currentSessionId = sessionData.session.id;
    audioChunkIndex = 0;

    Logger.log('Backend session started', { sessionId: currentSessionId });

    // Update current meeting info
    currentMeeting = {
      ...meetingData,
      tabId: tab.id,
      startTime: new Date().toISOString(),
      url: meetingData?.url || tab.url,
      title: meetingData?.title || tab.title
    };

    recordingStatus = 'recording';

    // Inject recording script
    try {
      await chrome.scripting.executeScript({
        target: { tabId: tab.id },
        files: ['scripts/recorder.js']
      });
    } catch (err) {
      Logger.warn('Failed to inject recorder script', err);
    }

    // Connect to WebSocket for real-time transcription
    connectWebSocket();

    // Send start recording message to content script
    try {
      chrome.tabs.sendMessage(tab.id, {
        action: 'start-recording',
        config: {
          sampleRate: 16000,
          channels: 1,
          language: 'en-US',
          sessionId: currentSessionId
        }
      });
    } catch (err) {
      Logger.warn('Failed to send start-recording to content script', err);
    }

    // Update UI
    chrome.action.setBadgeText({ text: 'REC', tabId: tab.id });
    chrome.action.setBadgeBackgroundColor({ color: '#ff0000', tabId: tab.id });

  } catch (error) {
    Logger.error('Failed to start recording session', error);
    chrome.notifications.create({
      type: 'basic',
      iconUrl: 'icons/icon-128.png',
      title: 'Recording Failed',
      message: 'Failed to start recording: ' + error.message
    });
    throw error;
  }
}

// Stop recording - End backend session
async function stopRecording() {
  Logger.analytics('recording_stopped', { sessionId: currentSessionId });

  recordingStatus = 'idle';

  if (currentMeeting) {
    // Send stop message to content script
    try {
      chrome.tabs.sendMessage(currentMeeting.tabId, {
        action: 'stop-recording'
      });
    } catch (err) {
      Logger.warn('Failed to send stop-recording to content script', err);
    }
  }

  // End backend session
  if (currentSessionId && authToken) {
    try {
      await fetch(Config.SESSIONS_URL + '/' + currentSessionId + '/end', {
        method: 'POST',
        headers: {
          'Authorization': 'Bearer ' + authToken
        }
      });
      Logger.log('Backend session ended', { sessionId: currentSessionId });
    } catch (error) {
      Logger.error('Failed to end backend session', error);
    }
  }

  // Disconnect WebSocket
  if (websocket) {
    websocket.close();
    websocket = null;
  }

  // Clear badge
  if (currentMeeting?.tabId) {
    chrome.action.setBadgeText({ text: '', tabId: currentMeeting.tabId });
  }

  // Reset session
  currentSessionId = null;
  audioChunkIndex = 0;
}

// Handle audio chunks - Upload to backend
async function handleAudioChunk(data) {
  if (!currentSessionId || !authToken) {
    return;
  }

  try {
    // Convert base64 audio to blob
    const audioBlob = base64ToBlob(data.audio, 'audio/webm');

    const formData = new FormData();
    formData.append('audio', audioBlob, 'chunk_' + audioChunkIndex + '.webm');
    formData.append('chunkIndex', audioChunkIndex.toString());
    formData.append('timestamp', Date.now().toString());
    formData.append('format', 'webm');
    formData.append('sampleRate', '16000');
    formData.append('channels', '1');

    const response = await fetch(Config.SESSIONS_URL + '/' + currentSessionId + '/audio', {
      method: 'POST',
      headers: {
        'Authorization': 'Bearer ' + authToken
      },
      body: formData
    });

    if (!response.ok) {
      throw new Error('Failed to upload audio chunk');
    }

    audioChunkIndex++;

  } catch (error) {
    Logger.error('Failed to upload audio chunk', error);
  }
}

// Handle complete recording - Final upload
async function handleRecordingComplete(data) {
  Logger.analytics('recording_complete', { hasData: !!data, sessionId: currentSessionId });

  if (data?.audio && currentSessionId && authToken) {
    try {
      // Upload final audio chunk
      const audioBlob = base64ToBlob(data.audio, 'audio/webm');

      const formData = new FormData();
      formData.append('audio', audioBlob, 'final_recording.webm');
      formData.append('chunkIndex', audioChunkIndex.toString());
      formData.append('timestamp', Date.now().toString());
      formData.append('format', 'webm');
      formData.append('isFinal', 'true');

      await fetch(Config.SESSIONS_URL + '/' + currentSessionId + '/audio', {
        method: 'POST',
        headers: {
          'Authorization': 'Bearer ' + authToken
        },
        body: formData
      });

    } catch (error) {
      Logger.error('Failed to upload final recording', error);
    }
  }

  chrome.notifications.create({
    type: 'basic',
    iconUrl: 'icons/icon-128.png',
    title: 'Recording Complete',
    message: 'Your meeting recording has been processed successfully.',
    buttons: [
      { title: 'View Meeting' },
      { title: 'Download Transcript' }
    ]
  });
}

// Connect to WebSocket for real-time features
function connectWebSocket() {
  if (websocket) return;

  try {
    websocket = new WebSocket(Config.WS_URL);

    websocket.onopen = () => {
      Logger.log('WebSocket connected');

      // Authenticate WebSocket connection
      if (authToken) {
        websocket.send(JSON.stringify({
          type: 'auth',
          token: authToken
        }));
      }

      // Join meeting room
      if (currentSessionId) {
        websocket.send(JSON.stringify({
          type: 'join-session',
          sessionId: currentSessionId
        }));
      }
    };

    websocket.onmessage = (event) => {
      try {
        const message = JSON.parse(event.data);
        handleWebSocketMessage(message);
      } catch (error) {
        Logger.error('Failed to parse WebSocket message', error);
      }
    };

    websocket.onerror = (error) => {
      Logger.error('WebSocket error', error);
    };

    websocket.onclose = () => {
      Logger.log('WebSocket disconnected');
      websocket = null;
    };
  } catch (error) {
    Logger.error('Failed to connect WebSocket', error);
  }
}

// Handle WebSocket messages
function handleWebSocketMessage(message) {
  switch (message.type) {
    case 'transcript-update':
      // Forward to content script
      if (currentMeeting) {
        chrome.tabs.sendMessage(currentMeeting.tabId, {
          action: 'transcript-update',
          data: message.data
        });
      }
      break;

    case 'analysis-update':
      // Store analysis data
      if (currentMeeting) {
        currentMeeting.analysis = message.data;
      }
      break;

    case 'session-update':
      // Handle session status updates
      Logger.log('Session update received', message.data);
      break;

    case 'error':
      Logger.error('WebSocket error message', message.data);
      break;
  }
}

// Handle transcript segments - Forward to backend via WebSocket
function handleTranscriptSegment(segment) {
  // Send to WebSocket for real-time processing
  if (websocket && websocket.readyState === WebSocket.OPEN) {
    websocket.send(JSON.stringify({
      type: 'transcript-segment',
      sessionId: currentSessionId,
      data: segment
    }));
  }

  // Store locally
  if (currentMeeting) {
    if (!currentMeeting.transcripts) {
      currentMeeting.transcripts = [];
    }
    currentMeeting.transcripts.push(segment);
  }
}

// Authenticate user
async function authenticateUser(credentials) {
  try {
    const response = await fetch(Config.AUTH_URL + '/login', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json'
      },
      body: JSON.stringify(credentials)
    });

    if (!response.ok) {
      const error = await response.json();
      throw new Error(error.message || 'Authentication failed');
    }

    const data = await response.json();
    authToken = data.accessToken;

    // Store token
    await chrome.storage.local.set({ authToken });

    // Verify connection with extension API
    await verifyExtensionConnection();

    return { success: true, user: data.user };
  } catch (error) {
    Logger.error('Authentication error', error);
    return { success: false, error: error.message };
  }
}

// Verify extension connection with backend
async function verifyExtensionConnection() {
  try {
    const response = await fetch(Config.VERIFY_CONNECTION_URL, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': 'Bearer ' + authToken
      },
      body: JSON.stringify({
        extensionVersion: chrome.runtime.getManifest().version
      })
    });

    if (response.ok) {
      const data = await response.json();
      Logger.log('Extension connection verified', data.features);
    }
  } catch (error) {
    Logger.warn('Failed to verify extension connection', error);
  }
}

// Logout
function logout() {
  authToken = null;
  chrome.storage.local.remove(['authToken']);

  if (recordingStatus === 'recording') {
    stopRecording();
  }
}

// Capture audio stream from tab
async function captureAudioStream(tabId) {
  try {
    const streamId = await chrome.tabCapture.getMediaStreamId({
      targetTabId: tabId
    });
    return streamId;
  } catch (error) {
    Logger.error('Failed to capture audio', error);
    throw error;
  }
}

// Convert base64 to Blob
function base64ToBlob(base64, mimeType) {
  // Handle data URL format
  const base64Data = base64.includes(',') ? base64.split(',')[1] : base64;

  const byteCharacters = atob(base64Data);
  const byteNumbers = new Array(byteCharacters.length);

  for (let i = 0; i < byteCharacters.length; i++) {
    byteNumbers[i] = byteCharacters.charCodeAt(i);
  }

  const byteArray = new Uint8Array(byteNumbers);
  return new Blob([byteArray], { type: mimeType });
}

// Handle context menu clicks
chrome.contextMenus.onClicked.addListener((info, tab) => {
  switch (info.menuItemId) {
    case 'start-recording':
      handleStartRecordingRequest({}, tab);
      break;
    case 'stop-recording':
      stopRecording();
      break;
  }
});

// Handle extension icon click
chrome.action.onClicked.addListener((tab) => {
  // Toggle recording
  if (recordingStatus === 'recording') {
    stopRecording();
  } else {
    // Send message to content script to check for meeting
    chrome.tabs.sendMessage(tab.id, { action: 'check-meeting' });
  }
});

// Load auth token on startup
chrome.storage.local.get(['authToken'], async (result) => {
  if (result.authToken) {
    authToken = result.authToken;
    Logger.log('Auth token loaded');

    // Verify connection
    await verifyExtensionConnection();
  }
});

// Handle tab updates
chrome.tabs.onUpdated.addListener((tabId, changeInfo, tab) => {
  if (changeInfo.status === 'complete' && tab.url) {
    // Check if this is a meeting URL
    const meetingPatterns = [
      /https:\/\/meet\.google\.com\/.+/,
      /https:\/\/.*\.zoom\.us\/.+/,
      /https:\/\/teams\.microsoft\.com\/.+/
    ];

    const isMeetingUrl = meetingPatterns.some(pattern => pattern.test(tab.url));

    if (isMeetingUrl) {
      // Inject content script if needed
      chrome.tabs.sendMessage(tabId, { action: 'ping' }, (response) => {
        if (chrome.runtime.lastError || !response) {
          // Content script not loaded, inject it
          const platform = tab.url.includes('google.com') ? 'google-meet' :
                          tab.url.includes('zoom.us') ? 'zoom' :
                          tab.url.includes('teams.microsoft.com') ? 'teams' : null;

          if (platform) {
            chrome.scripting.executeScript({
              target: { tabId },
              files: ['content-scripts/' + platform + '.js']
            }).catch(err => Logger.warn('Failed to inject content script', err));
          }
        }
      });
    }
  }
});

// Clean up on tab close
chrome.tabs.onRemoved.addListener((tabId) => {
  if (currentMeeting && currentMeeting.tabId === tabId) {
    handleMeetingEnded({}, { id: tabId });
  }
});

// Handle notification button clicks
chrome.notifications.onButtonClicked.addListener((notificationId, buttonIndex) => {
  if (buttonIndex === 0) {
    // View Meeting
    chrome.tabs.create({ url: Config.MEETINGS_PAGE_URL });
  } else if (buttonIndex === 1) {
    // Download Transcript
    chrome.tabs.create({ url: Config.MEETINGS_PAGE_URL });
  }
});

Logger.log('Background service worker initialized');
