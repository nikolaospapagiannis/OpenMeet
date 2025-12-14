/**
 * Microsoft Teams Content Script
 * Detects meetings, captures audio/video, and handles transcription for Teams Web
 */

// Logger utility for production-safe logging
const Logger = {
  log: (message, data) => {
    if (!('update_url' in chrome.runtime.getManifest())) {
      console.log(`[OpenMeet] ${message}`, data || '');
    }
  },
  error: (message, error) => {
    if (!('update_url' in chrome.runtime.getManifest())) {
      console.error(`[OpenMeet Error] ${message}`, error);
    }
  },
  analytics: (eventName, eventData) => {
    // Send analytics without PII
    chrome.runtime.sendMessage({
      action: 'analytics-event',
      event: eventName,
      data: eventData
    });
  }
};

(function() {
  Logger.log('Microsoft Teams content script loaded');

  // Meeting state
  let meetingId = null;
  let isInMeeting = false;
  let isRecording = false;
  let participants = [];
  let audioContext = null;
  let mediaRecorder = null;
  let audioChunks = [];

  // Detect meeting start
  function detectMeeting() {
    // Check for Teams meeting UI elements
    const meetingStage = document.querySelector('[data-tid="meeting-stage"]');
    const callingScreen = document.querySelector('.calling-screen');
    const meetingControls = document.querySelector('[data-tid="calling-controls"]');
    const videoGallery = document.querySelector('[data-tid="video-gallery"]');
    
    // Try to extract meeting ID from URL or page
    const urlMatch = window.location.href.match(/meetup-join\/([^/]+)/);
    const possibleMeetingId = urlMatch ? urlMatch[1] : null;

    if ((meetingStage || callingScreen || meetingControls || videoGallery) && !isInMeeting) {
      isInMeeting = true;
      meetingId = possibleMeetingId || generateMeetingId();

      Logger.analytics('meeting_detected', { platform: 'teams' });
      
      // Get meeting details
      const meetingDetails = {
        id: meetingId,
        platform: 'Microsoft Teams',
        url: window.location.href,
        title: getMeetingTitle(),
        startTime: new Date().toISOString(),
        participants: getParticipants()
      };

      // Notify background script
      chrome.runtime.sendMessage({
        action: 'meeting-detected',
        data: meetingDetails
      });

      // Start monitoring
      startMonitoring();
    } else if (!meetingStage && !callingScreen && !meetingControls && isInMeeting) {
      // Meeting ended
      handleMeetingEnd();
    }
  }

  // Get meeting title
  function getMeetingTitle() {
    // Try multiple selectors for meeting title
    const titleElement = document.querySelector(
      '[data-tid="meeting-title"], .meeting-title, [aria-label*="Meeting"], h1'
    );
    return titleElement?.textContent?.trim() || document.title;
  }

  // Generate a meeting ID if we can't extract one
  function generateMeetingId() {
    return 'teams-' + Date.now() + '-' + Math.random().toString(36).substr(2, 9);
  }

  // Get participants list
  function getParticipants() {
    const participants = [];
    
    // Try multiple selectors for participant list
    const participantElements = document.querySelectorAll(
      '[data-tid="participant-item"], [data-tid="roster-participant"], ' +
      '.participant-item, [role="listitem"][data-track-summary*="participant"]'
    );
    
    participantElements.forEach(element => {
      const name = element.querySelector(
        '[data-tid="participant-name"], .participant-name, [class*="displayName"]'
      )?.textContent || 
      element.getAttribute('aria-label') || 
      element.textContent?.trim() || 
      'Unknown';
      
      // Generate a unique ID for the participant
      const id = name.toLowerCase().replace(/\s+/g, '-') + '-' + Date.now();
      
      if (!participants.find(p => p.name === name)) {
        participants.push({
          id,
          name,
          joinedAt: new Date().toISOString(),
          isMuted: element.querySelector('[data-tid="mic-off-icon"]') !== null,
          isVideoOff: element.querySelector('[data-tid="video-off-icon"]') !== null
        });
      }
    });

    return participants;
  }

  // Start monitoring meeting
  function startMonitoring() {
    // Monitor participants
    setInterval(() => {
      if (isInMeeting) {
        const currentParticipants = getParticipants();
        
        // Check for new participants
        currentParticipants.forEach(participant => {
          if (!participants.find(p => p.id === participant.id)) {
            Logger.analytics('participant_joined', { count: participants.length + 1 });
            participants.push(participant);
            
            chrome.runtime.sendMessage({
              action: 'participant-joined',
              data: participant
            });
          }
        });

        // Check for left participants
        participants = participants.filter(participant => {
          const stillPresent = currentParticipants.find(p => p.name === participant.name);
          if (!stillPresent) {
            Logger.analytics('participant_left', { count: participants.length - 1 });
            chrome.runtime.sendMessage({
              action: 'participant-left',
              data: participant
            });
          }
          return stillPresent;
        });
      }
    }, 5000);

    // Monitor live captions if available
    observeCaptions();

    // Monitor chat messages
    observeChat();

    // Monitor reactions
    observeReactions();

    // Monitor raised hands
    observeRaisedHands();
  }

  // Observe captions for transcription
  function observeCaptions() {
    const observer = new MutationObserver((mutations) => {
      mutations.forEach((mutation) => {
        // Teams caption selectors
        if (mutation.target.classList && (
          mutation.target.classList.contains('ui-chat__messageheader') ||
          mutation.target.classList.contains('live-caption') ||
          mutation.target.getAttribute('data-tid') === 'closed-caption'
        )) {
          const captionElement = mutation.target;
          const speaker = extractSpeakerFromCaption(captionElement) || 'Unknown';
          const text = extractTextFromCaption(captionElement);
          
          if (text && text.trim()) {
            const segment = {
              speaker,
              text,
              timestamp: new Date().toISOString(),
              meetingId
            };

            // Send to background script (no console log - contains PII)
            chrome.runtime.sendMessage({
              action: 'transcript-segment',
              data: segment
            });
          }
        }
      });
    });

    // Find caption container
    const captionContainer = document.querySelector(
      '[data-tid="closed-captions-renderer"], .live-captions-container, [role="log"]'
    );
    
    if (captionContainer) {
      observer.observe(captionContainer, {
        childList: true,
        subtree: true,
        characterData: true
      });
    } else {
      // Retry after a delay
      setTimeout(observeCaptions, 2000);
    }
  }

  // Extract speaker name from caption element
  function extractSpeakerFromCaption(element) {
    // Try to find speaker name in various ways
    const speakerElement = element.querySelector(
      '[data-tid="message-author-name"], .ui-chat__messageauthor, [class*="speaker"]'
    );
    
    if (speakerElement) {
      return speakerElement.textContent.trim();
    }

    // Check parent elements for speaker info
    const parent = element.closest('[data-tid="chat-pane-message"]');
    if (parent) {
      const author = parent.querySelector('[data-tid="message-author-name"]');
      if (author) {
        return author.textContent.trim();
      }
    }

    return null;
  }

  // Extract text from caption element
  function extractTextFromCaption(element) {
    const textElement = element.querySelector(
      '[data-tid="message-text-content"], .ui-chat__messagecontent, [class*="caption-text"]'
    );
    
    return textElement?.textContent?.trim() || element.textContent?.trim();
  }

  // Observe chat messages
  function observeChat() {
    const observer = new MutationObserver((mutations) => {
      mutations.forEach((mutation) => {
        mutation.addedNodes.forEach((node) => {
          if (node.nodeType === Node.ELEMENT_NODE) {
            // Teams chat message selectors
            if (node.getAttribute('data-tid') === 'chat-pane-message' ||
                node.classList?.contains('ui-chat__message')) {
              
              const sender = node.querySelector(
                '[data-tid="message-author-name"], .ui-chat__messageauthor'
              )?.textContent || 'Unknown';
              
              const message = node.querySelector(
                '[data-tid="message-text-content"], .ui-chat__messagecontent'
              )?.textContent || '';
              
              const time = node.querySelector(
                '[data-tid="message-timestamp"], .ui-chat__messagetime'
              )?.textContent || new Date().toLocaleTimeString();

              if (message) {
                // No console log - chat messages contain PII

                chrome.runtime.sendMessage({
                  action: 'chat-message',
                  data: {
                    sender,
                    message,
                    time,
                    meetingId
                  }
                });
              }
            }
          }
        });
      });
    });

    // Find chat container
    const chatContainer = document.querySelector(
      '[data-tid="chat-pane-list"], .ui-chat__list, [role="log"][aria-label*="Chat"]'
    );
    
    if (chatContainer) {
      observer.observe(chatContainer, {
        childList: true,
        subtree: true
      });
    }
  }

  // Observe reactions
  function observeReactions() {
    const observer = new MutationObserver((mutations) => {
      mutations.forEach((mutation) => {
        mutation.addedNodes.forEach((node) => {
          if (node.nodeType === Node.ELEMENT_NODE) {
            // Look for reaction elements
            if (node.getAttribute('data-tid')?.includes('reaction') ||
                node.classList?.contains('meeting-reaction')) {
              
              const reaction = node.getAttribute('aria-label') ||
                             node.textContent || '';
              const participant = 'Unknown'; // Teams doesn't always show who reacted

              // No console log - reactions may contain PII

              chrome.runtime.sendMessage({
                action: 'reaction',
                data: {
                  participant,
                  reaction,
                  timestamp: new Date().toISOString(),
                  meetingId
                }
              });
            }
          }
        });
      });
    });

    const reactionContainer = document.querySelector(
      '[data-tid="meeting-reactions"], .meeting-reactions-container'
    );
    
    if (reactionContainer) {
      observer.observe(reactionContainer, {
        childList: true,
        subtree: true
      });
    }
  }

  // Observe raised hands
  function observeRaisedHands() {
    const observer = new MutationObserver((mutations) => {
      mutations.forEach((mutation) => {
        if (mutation.target.getAttribute('data-tid') === 'raised-hand-indicator') {
          const participant = mutation.target.closest('[data-tid="participant-item"]')
            ?.querySelector('[data-tid="participant-name"]')?.textContent || 'Unknown';

          const isRaised = mutation.target.classList.contains('active');

          // No console log - participant names are PII

          chrome.runtime.sendMessage({
            action: 'hand-raised',
            data: {
              participant,
              isRaised,
              timestamp: new Date().toISOString(),
              meetingId
            }
          });
        }
      });
    });

    const participantList = document.querySelector('[data-tid="roster-list"]');
    if (participantList) {
      observer.observe(participantList, {
        attributes: true,
        subtree: true,
        attributeFilter: ['class']
      });
    }
  }

  // Handle meeting end
  function handleMeetingEnd() {
    isInMeeting = false;

    Logger.analytics('meeting_ended', { platform: 'teams' });
    
    // Stop recording if active
    if (isRecording) {
      stopRecording();
    }

    // Notify background script
    chrome.runtime.sendMessage({
      action: 'meeting-ended',
      data: {
        meetingId,
        endTime: new Date().toISOString(),
        participants,
        duration: calculateDuration()
      }
    });

    // Reset state
    meetingId = null;
    participants = [];
  }

  // Calculate meeting duration
  function calculateDuration() {
    // Try to find duration from UI
    const durationElement = document.querySelector('[data-tid="call-duration"]');
    return durationElement?.textContent || 'Unknown';
  }

  // Start recording
  async function startRecording() {
    if (isRecording) return;

    Logger.analytics('recording_started', { platform: 'teams' });
    isRecording = true;

    try {
      // Get media stream
      const stream = await navigator.mediaDevices.getUserMedia({
        audio: {
          echoCancellation: true,
          noiseSuppression: true,
          autoGainControl: true,
          sampleRate: 16000
        },
        video: false
      });

      // Setup audio context for processing
      audioContext = new AudioContext({ sampleRate: 16000 });
      const source = audioContext.createMediaStreamSource(stream);
      
      // Create analyzer for audio levels
      const analyzer = audioContext.createAnalyser();
      analyzer.fftSize = 256;
      source.connect(analyzer);
      
      // Create recorder
      mediaRecorder = new MediaRecorder(stream, {
        mimeType: 'audio/webm'
      });

      mediaRecorder.ondataavailable = (event) => {
        if (event.data.size > 0) {
          audioChunks.push(event.data);
          
          // Send audio chunk for real-time transcription
          const reader = new FileReader();
          reader.onloadend = () => {
            chrome.runtime.sendMessage({
              action: 'audio-chunk',
              data: {
                audio: reader.result,
                meetingId
              }
            });
          };
          reader.readAsDataURL(event.data);
        }
      };

      mediaRecorder.onstop = () => {
        // Create complete audio file
        const audioBlob = new Blob(audioChunks, { type: 'audio/webm' });
        audioChunks = [];
        
        // Send complete recording
        const reader = new FileReader();
        reader.onloadend = () => {
          chrome.runtime.sendMessage({
            action: 'recording-complete',
            data: {
              audio: reader.result,
              meetingId,
              duration: audioContext.currentTime
            }
          });
        };
        reader.readAsDataURL(audioBlob);
      };

      // Start recording
      mediaRecorder.start(1000); // Send chunks every second
      
      // Add visual indicator
      addRecordingIndicator();
      
      // Monitor audio levels
      monitorAudioLevels(analyzer);

    } catch (error) {
      Logger.error('Failed to start recording', error);
      isRecording = false;

      // Show error notification
      showNotification('error', 'Recording Failed', 'Unable to access microphone');
    }
  }

  // Monitor audio levels for speaker detection
  function monitorAudioLevels(analyzer) {
    const dataArray = new Uint8Array(analyzer.frequencyBinCount);
    
    const checkAudioLevel = () => {
      if (!isRecording) return;
      
      analyzer.getByteFrequencyData(dataArray);
      
      // Calculate average volume
      const average = dataArray.reduce((a, b) => a + b) / dataArray.length;
      
      // Update visual indicator based on audio level
      updateRecordingIndicator(average);
      
      // Detect speaking
      if (average > 30) {
        detectSpeaking();
      }
      
      requestAnimationFrame(checkAudioLevel);
    };
    
    checkAudioLevel();
  }

  // Detect who is speaking
  function detectSpeaking() {
    // Find active speaker indicator in Teams UI
    const activeSpeaker = document.querySelector(
      '[data-tid="participant-item"].speaking, ' +
      '[class*="speaking"], [class*="active-speaker"]'
    );
    
    if (activeSpeaker) {
      const speakerName = activeSpeaker.querySelector(
        '[data-tid="participant-name"]'
      )?.textContent || 'Unknown';

      // No console log - speaker names are PII
    }
  }

  // Stop recording
  function stopRecording() {
    if (!isRecording) return;

    Logger.analytics('recording_stopped', { platform: 'teams' });
    isRecording = false;

    if (mediaRecorder && mediaRecorder.state !== 'inactive') {
      mediaRecorder.stop();
    }

    if (audioContext) {
      audioContext.close();
      audioContext = null;
    }

    // Remove visual indicator
    removeRecordingIndicator();
  }

  // Add recording indicator
  function addRecordingIndicator() {
    // Check if indicator already exists
    if (document.getElementById('openmeet-recording-indicator')) return;
    
    const indicator = document.createElement('div');
    indicator.id = 'openmeet-recording-indicator';
    indicator.innerHTML = `
      <div class="openmeet-indicator-inner">
        <span class="openmeet-indicator-dot"></span>
        <span>Recording with OpenMeet</span>
        <span id="audio-level-indicator" style="
          width: 20px;
          height: 4px;
          background: rgba(255,255,255,0.3);
          border-radius: 2px;
          overflow: hidden;
          margin-left: 8px;
        ">
          <span id="audio-level-bar" style="
            display: block;
            height: 100%;
            width: 0%;
            background: white;
            transition: width 0.1s;
          "></span>
        </span>
      </div>
    `;
    document.body.appendChild(indicator);
  }

  // Update recording indicator with audio level
  function updateRecordingIndicator(level) {
    const bar = document.getElementById('audio-level-bar');
    if (bar) {
      const percentage = Math.min(100, (level / 128) * 100);
      bar.style.width = percentage + '%';
    }
  }

  // Remove recording indicator
  function removeRecordingIndicator() {
    const indicator = document.getElementById('openmeet-recording-indicator');
    if (indicator) {
      indicator.remove();
    }
  }

  // Show notification
  function showNotification(type, title, message) {
    const notification = document.createElement('div');
    notification.className = `openmeet-notification ${type}`;
    notification.innerHTML = `
      <div class="openmeet-notification-icon">
        ${type === 'success' ? '✅' : type === 'error' ? '❌' : 'ℹ️'}
      </div>
      <div class="openmeet-notification-content">
        <div class="openmeet-notification-title">${title}</div>
        <div class="openmeet-notification-message">${message}</div>
      </div>
    `;
    
    document.body.appendChild(notification);
    
    // Auto-remove after 5 seconds
    setTimeout(() => {
      notification.remove();
    }, 5000);
  }

  // Listen for messages from background script
  chrome.runtime.onMessage.addListener((request, sender, sendResponse) => {
    // No logging - messages may contain PII

    switch (request.action) {
      case 'start-recording':
        startRecording();
        sendResponse({ success: true });
        break;

      case 'stop-recording':
        stopRecording();
        sendResponse({ success: true });
        break;

      case 'check-meeting':
        detectMeeting();
        sendResponse({ 
          success: true, 
          isInMeeting,
          meetingId 
        });
        break;

      case 'get-participants':
        sendResponse({ 
          success: true, 
          participants: getParticipants() 
        });
        break;

      case 'transcript-update':
        // Display transcript update in UI
        displayTranscriptUpdate(request.data);
        sendResponse({ success: true });
        break;

      case 'ping':
        sendResponse({ success: true });
        break;

      default:
        sendResponse({ success: false, error: 'Unknown action' });
    }
  });

  // Display transcript update
  function displayTranscriptUpdate(data) {
    // Add transcript overlay if enabled
    const overlay = document.getElementById('openmeet-transcript-overlay');
    if (overlay) {
      const transcriptDiv = overlay.querySelector('#transcript-content');
      if (transcriptDiv) {
        const segment = document.createElement('div');
        segment.className = 'transcript-segment';
        segment.innerHTML = `
          <strong>${data.speaker}:</strong> 
          <span class="text">${data.text}</span>
          <div class="timestamp">${new Date(data.timestamp).toLocaleTimeString()}</div>
        `;
        transcriptDiv.appendChild(segment);
        transcriptDiv.scrollTop = transcriptDiv.scrollHeight;
      }
    }
  }

  // Initialize
  function initialize() {
    Logger.log('Initializing OpenMeet for Microsoft Teams');

    // Check for meeting every 2 seconds
    setInterval(detectMeeting, 2000);

    // Initial check
    detectMeeting();

    // Load CSS
    loadStyles();

    // Add keyboard shortcuts
    addKeyboardShortcuts();

    // Add meeting controls
    addMeetingControls();
  }

  // Load CSS styles
  function loadStyles() {
    const link = document.createElement('link');
    link.rel = 'stylesheet';
    link.type = 'text/css';
    link.href = chrome.runtime.getURL('styles/overlay.css');
    document.head.appendChild(link);
  }

  // Add keyboard shortcuts
  function addKeyboardShortcuts() {
    document.addEventListener('keydown', (e) => {
      // Ctrl/Cmd + Shift + R to toggle recording
      if ((e.ctrlKey || e.metaKey) && e.shiftKey && e.key === 'R') {
        e.preventDefault();
        if (isRecording) {
          stopRecording();
        } else {
          startRecording();
        }
      }
      
      // Ctrl/Cmd + Shift + T to toggle transcript
      if ((e.ctrlKey || e.metaKey) && e.shiftKey && e.key === 'T') {
        e.preventDefault();
        toggleTranscriptOverlay();
      }
    });
  }

  // Toggle transcript overlay
  function toggleTranscriptOverlay() {
    let overlay = document.getElementById('openmeet-transcript-overlay');
    
    if (overlay) {
      overlay.remove();
    } else {
      overlay = document.createElement('div');
      overlay.id = 'openmeet-transcript-overlay';
      overlay.innerHTML = `
        <div class="openmeet-transcript-header">
          <div class="openmeet-transcript-title">
            📝 Live Transcript
          </div>
          <div class="openmeet-transcript-controls">
            <button class="openmeet-transcript-btn" onclick="this.closest('#openmeet-transcript-overlay').remove()">✕</button>
          </div>
        </div>
        <div id="transcript-content"></div>
      `;
      document.body.appendChild(overlay);
    }
  }

  // Add meeting controls to Teams UI
  function addMeetingControls() {
    // Wait for Teams controls to load
    const checkForControls = setInterval(() => {
      const controlsBar = document.querySelector('[data-tid="calling-controls"]');
      
      if (controlsBar && !document.getElementById('openmeet-control-button')) {
        const openmeetButton = document.createElement('button');
        openmeetButton.id = 'openmeet-control-button';
        openmeetButton.className = 'openmeet-control-btn';
        openmeetButton.innerHTML = `
          <span style="font-size: 20px;">🔥</span>
          <span>OpenMeet</span>
        `;
        
        openmeetButton.addEventListener('click', () => {
          if (isRecording) {
            stopRecording();
            openmeetButton.classList.remove('active');
          } else {
            startRecording();
            openmeetButton.classList.add('active');
          }
        });
        
        // Insert before the "More" button if it exists
        const moreButton = controlsBar.querySelector('[data-tid="more-button"]');
        if (moreButton) {
          moreButton.parentNode.insertBefore(openmeetButton, moreButton);
        } else {
          controlsBar.appendChild(openmeetButton);
        }
        
        clearInterval(checkForControls);
      }
    }, 1000);
  }

  // Start
  initialize();

})();
