/**
 * Chrome Extension Popup Script
 * Handles UI interactions and communication with background script
 *
 * Configuration is loaded from config.js (generated from .env)
 */

// Logger utility for production-safe logging
const Logger = {
  log: (message, data) => {
    if (!('update_url' in chrome.runtime.getManifest())) {
      console.log('[OpenMeet] ' + message, data || '');
    }
  },
  error: (message, error) => {
    if (!('update_url' in chrome.runtime.getManifest())) {
      console.error('[OpenMeet Error] ' + message, error);
    }
  },
  analytics: (eventName, eventData) => {
    chrome.runtime.sendMessage({
      action: 'analytics-event',
      event: eventName,
      data: eventData
    });
  }
};

// State
let isAuthenticated = false;
let currentMeeting = null;
let recordingStatus = 'idle';
let settings = {
  autoRecord: true,
  notifyOnStart: true,
  saveToDrive: false
};

// DOM Elements
const elements = {
  status: document.getElementById('status'),
  loginView: document.getElementById('login-view'),
  mainView: document.getElementById('main-view'),
  loginForm: document.getElementById('login-form'),
  email: document.getElementById('email'),
  password: document.getElementById('password'),
  meetingCard: document.getElementById('meeting-card'),
  meetingTitle: document.getElementById('meeting-title'),
  meetingDuration: document.getElementById('meeting-duration'),
  meetingPlatformIcon: document.getElementById('meeting-platform-icon'),
  startRecording: document.getElementById('start-recording'),
  stopRecording: document.getElementById('stop-recording'),
  autoRecordToggle: document.getElementById('auto-record-toggle'),
  notificationsToggle: document.getElementById('notifications-toggle'),
  cloudSaveToggle: document.getElementById('cloud-save-toggle'),
  meetingsCount: document.getElementById('meetings-count'),
  hoursRecorded: document.getElementById('hours-recorded'),
  transcriptsCount: document.getElementById('transcripts-count'),
  actionItems: document.getElementById('action-items'),
  openDashboard: document.getElementById('open-dashboard'),
  viewSettings: document.getElementById('view-settings'),
  logout: document.getElementById('logout'),
  signupLink: document.getElementById('signup-link'),
  helpLink: document.getElementById('help-link'),
  privacyLink: document.getElementById('privacy-link'),
  termsLink: document.getElementById('terms-link')
};

// Initialize popup
async function initialize() {
  Logger.log('Initializing popup');
  await loadSettings();
  await checkAuthStatus();
  await updateStatus();
  setupEventListeners();
  setInterval(updateStatus, 1000);
}

// Load settings from storage
async function loadSettings() {
  chrome.storage.sync.get(['autoRecord', 'notifyOnStart', 'saveToDrive'], (result) => {
    settings = {
      autoRecord: result.autoRecord ?? true,
      notifyOnStart: result.notifyOnStart ?? true,
      saveToDrive: result.saveToDrive ?? false
    };
    updateToggle(elements.autoRecordToggle, settings.autoRecord);
    updateToggle(elements.notificationsToggle, settings.notifyOnStart);
    updateToggle(elements.cloudSaveToggle, settings.saveToDrive);
  });
}

// Check authentication status
async function checkAuthStatus() {
  chrome.storage.local.get(['authToken', 'user'], (result) => {
    isAuthenticated = !!result.authToken;
    if (isAuthenticated) {
      showMainView();
    } else {
      showLoginView();
    }
  });
}

// Update status from background
async function updateStatus() {
  chrome.runtime.sendMessage({ action: 'get-status' }, (response) => {
    if (response) {
      isAuthenticated = response.isAuthenticated;
      recordingStatus = response.recordingStatus;
      currentMeeting = response.currentMeeting;
      updateUI();
    }
  });
  chrome.tabs.query({ active: true, currentWindow: true }, (tabs) => {
    if (tabs[0]) {
      checkIfMeetingTab(tabs[0]);
    }
  });
}

// Check if current tab is a meeting
function checkIfMeetingTab(tab) {
  const meetingPatterns = [
    /https:\/\/meet\.google\.com\/.+/,
    /https:\/\/.*\.zoom\.us\/.+/,
    /https:\/\/teams\.microsoft\.com\/.+/
  ];
  const isMeeting = meetingPatterns.some(pattern => pattern.test(tab.url));
  if (isMeeting && currentMeeting) {
    elements.meetingCard.classList.remove('hidden');
    elements.meetingTitle.textContent = tab.title || 'Meeting in progress';
    if (tab.url.includes('google.com')) {
      elements.meetingPlatformIcon.textContent = '🎬';
    } else if (tab.url.includes('zoom.us')) {
      elements.meetingPlatformIcon.textContent = '🎥';
    } else if (tab.url.includes('teams.microsoft.com')) {
      elements.meetingPlatformIcon.textContent = '📹';
    }
  } else {
    elements.meetingTitle.textContent = isMeeting ? (tab.title || 'Meeting detected') : 'Ready to Record';
    elements.meetingDuration.textContent = isMeeting ? 'Click to start recording' : 'Click to record current tab';
  }
}

// Update UI based on state
function updateUI() {
  if (isAuthenticated) {
    if (recordingStatus === 'recording') {
      elements.status.textContent = 'Recording';
      elements.status.className = 'status recording';
      elements.startRecording.classList.add('hidden');
      elements.stopRecording.classList.remove('hidden');
    } else if (currentMeeting) {
      elements.status.textContent = 'In Meeting';
      elements.status.className = 'status connected';
      elements.startRecording.classList.remove('hidden');
      elements.stopRecording.classList.add('hidden');
    } else {
      elements.status.textContent = 'Connected';
      elements.status.className = 'status connected';
    }
  } else {
    elements.status.textContent = 'Disconnected';
    elements.status.className = 'status';
  }
  if (recordingStatus === 'recording' && currentMeeting) {
    const startTime = new Date(currentMeeting.startTime);
    const duration = Date.now() - startTime.getTime();
    const minutes = Math.floor(duration / 60000);
    const seconds = Math.floor((duration % 60000) / 1000);
    elements.meetingDuration.textContent = minutes + ':' + seconds.toString().padStart(2, '0');
  }
  updateStats();
}

// Update statistics - REAL API calls
async function updateStats() {
  try {
    const { authToken } = await chrome.storage.local.get(['authToken']);
    if (!authToken) {
      elements.meetingsCount.textContent = '0';
      elements.hoursRecorded.textContent = '0h';
      elements.transcriptsCount.textContent = '0';
      elements.actionItems.textContent = '0';
      return;
    }
    const response = await fetch(Config.STATS_URL, {
      method: 'GET',
      headers: {
        'Authorization': 'Bearer ' + authToken,
        'Content-Type': 'application/json'
      }
    });
    if (!response.ok) throw new Error('API error: ' + response.status);
    const stats = await response.json();
    elements.meetingsCount.textContent = stats.meetingsCount?.toString() || '0';
    elements.hoursRecorded.textContent = stats.hoursRecorded ? stats.hoursRecorded.toFixed(1) + 'h' : '0h';
    elements.transcriptsCount.textContent = stats.transcriptsCount?.toString() || '0';
    elements.actionItems.textContent = stats.actionItemsCount?.toString() || '0';
    chrome.storage.local.set({ cachedStats: stats });
  } catch (error) {
    Logger.error('Failed to fetch stats', error);
    chrome.storage.local.get(['cachedStats'], (result) => {
      if (result.cachedStats) {
        elements.meetingsCount.textContent = result.cachedStats.meetingsCount || '0';
        elements.hoursRecorded.textContent = result.cachedStats.hoursRecorded || '0h';
        elements.transcriptsCount.textContent = result.cachedStats.transcriptsCount || '0';
        elements.actionItems.textContent = result.cachedStats.actionItemsCount || '0';
      }
    });
  }
}

// Setup event listeners
function setupEventListeners() {
  elements.loginForm.addEventListener('submit', handleLogin);
  elements.startRecording.addEventListener('click', handleStartRecording);
  elements.stopRecording.addEventListener('click', handleStopRecording);
  elements.autoRecordToggle.addEventListener('click', () => {
    settings.autoRecord = !settings.autoRecord;
    updateToggle(elements.autoRecordToggle, settings.autoRecord);
    saveSetting('autoRecord', settings.autoRecord);
  });
  elements.notificationsToggle.addEventListener('click', () => {
    settings.notifyOnStart = !settings.notifyOnStart;
    updateToggle(elements.notificationsToggle, settings.notifyOnStart);
    saveSetting('notifyOnStart', settings.notifyOnStart);
  });
  elements.cloudSaveToggle.addEventListener('click', () => {
    settings.saveToDrive = !settings.saveToDrive;
    updateToggle(elements.cloudSaveToggle, settings.saveToDrive);
    saveSetting('saveToDrive', settings.saveToDrive);
  });
  elements.openDashboard.addEventListener('click', () => {
    chrome.tabs.create({ url: Config.DASHBOARD_URL });
  });
  elements.viewSettings.addEventListener('click', () => {
    chrome.tabs.create({ url: Config.SETTINGS_URL });
  });
  elements.logout.addEventListener('click', handleLogout);
  elements.signupLink.addEventListener('click', (e) => {
    e.preventDefault();
    chrome.tabs.create({ url: Config.REGISTER_URL });
  });
  elements.helpLink.addEventListener('click', (e) => {
    e.preventDefault();
    chrome.tabs.create({ url: Config.HELP_URL });
  });
  elements.privacyLink.addEventListener('click', (e) => {
    e.preventDefault();
    chrome.tabs.create({ url: Config.PRIVACY_URL });
  });
  elements.termsLink.addEventListener('click', (e) => {
    e.preventDefault();
    chrome.tabs.create({ url: Config.TERMS_URL });
  });
}

// Handle login
async function handleLogin(e) {
  e.preventDefault();
  const email = elements.email.value;
  const password = elements.password.value;
  elements.loginForm.querySelectorAll('input, button').forEach(el => {
    el.disabled = true;
  });
  chrome.runtime.sendMessage({
    action: 'authenticate',
    credentials: { email, password }
  }, (response) => {
    if (response && response.success) {
      isAuthenticated = true;
      showMainView();
      updateUI();
    } else {
      alert('Login failed. Please check your credentials.');
      elements.loginForm.querySelectorAll('input, button').forEach(el => {
        el.disabled = false;
      });
    }
  });
}

// Handle logout
async function handleLogout() {
  chrome.storage.local.remove(['authToken', 'user'], () => {
    isAuthenticated = false;
    showLoginView();
    updateUI();
  });
}

// Detect platform from URL
function detectPlatform(url) {
  if (url.includes('meet.google.com')) return 'google-meet';
  if (url.includes('zoom.us')) return 'zoom';
  if (url.includes('teams.microsoft.com')) return 'teams';
  return 'unknown';
}

// Handle start recording - sends to BACKGROUND script to create backend session
async function handleStartRecording() {
  chrome.tabs.query({ active: true, currentWindow: true }, (tabs) => {
    if (tabs[0]) {
      const meetingData = {
        platform: detectPlatform(tabs[0].url),
        url: tabs[0].url,
        title: tabs[0].title
      };
      // Send to BACKGROUND script (NOT content script) to create session
      chrome.runtime.sendMessage(
        { action: 'start-recording', data: meetingData },
        (response) => {
          if (chrome.runtime.lastError) {
            Logger.error('Failed to start recording', chrome.runtime.lastError);
            alert('Failed to start recording. Please try again.');
            return;
          }
          if (response && response.success) {
            recordingStatus = 'recording';
            updateUI();
          } else if (response && !response.success) {
            alert('Failed to start recording: ' + (response.error || 'Unknown error'));
          }
        }
      );
    }
  });
}

// Handle stop recording - sends to BACKGROUND script to end backend session
async function handleStopRecording() {
  chrome.runtime.sendMessage(
    { action: 'stop-recording' },
    (response) => {
      if (chrome.runtime.lastError) {
        Logger.error('Failed to stop recording', chrome.runtime.lastError);
      }
      recordingStatus = 'idle';
      updateUI();
    }
  );
}

// Update toggle UI
function updateToggle(toggle, isActive) {
  if (isActive) {
    toggle.classList.add('active');
  } else {
    toggle.classList.remove('active');
  }
}

// Save setting to storage
function saveSetting(key, value) {
  chrome.storage.sync.set({ [key]: value });
}

// Show login view
function showLoginView() {
  elements.loginView.classList.remove('hidden');
  elements.mainView.classList.add('hidden');
}

// Show main view
function showMainView() {
  elements.loginView.classList.add('hidden');
  elements.mainView.classList.remove('hidden');
}

// Initialize when DOM is ready
document.addEventListener('DOMContentLoaded', initialize);
