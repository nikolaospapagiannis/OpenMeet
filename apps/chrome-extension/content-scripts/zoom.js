/**
 * Zoom Content Script
 * Detects meetings, captures audio/video, and handles transcription for Zoom Web Client
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
  Logger.log('Zoom content script loaded');

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
    // Check for Zoom meeting UI elements
    const meetingFrame = document.querySelector('#wc-container-left');
    const videoContainer = document.querySelector('.meeting-client');
    const meetingInfo = document.querySelector('.meeting-info-container');
    
    // Try to extract meeting ID from URL or page
    const urlMatch = window.location.pathname.match(/\/wc\/(\d+)\//);
    const possibleMeetingId = urlMatch ? urlMatch[1] : null;

    if ((meetingFrame || videoContainer || meetingInfo) && !isInMeeting) {
      isInMeeting = true;
      meetingId = possibleMeetingId || generateMeetingId();

      Logger.analytics('meeting_detected', { platform: 'zoom' });
      
      // Get meeting details
      const meetingDetails = {
        id: meetingId,
        platform: 'Zoom',
        url: window.location.href,
        title: document.title,
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
    } else if (!meetingFrame && !videoContainer && isInMeeting) {
      // Meeting ended
      handleMeetingEnd();
    }
  }

  // Generate a meeting ID if we can't extract one
  function generateMeetingId() {
    return 'zoom-' + Date.now() + '-' + Math.random().toString(36).substr(2, 9);
  }

  // Get participants list
  function getParticipants() {
    const participants = [];
    
    // Try multiple selectors for participant list
    const participantElements = document.querySelectorAll(
      '.participants-item, .participants-list-item, .participant-item, [class*="participant"]'
    );
    
    participantElements.forEach(element => {
      const name = element.querySelector('.participants-item__display-name, .participant-name, [class*="name"]')?.textContent || 
                   element.textContent?.trim() || 
                   'Unknown';
      
      // Generate a unique ID for the participant
      const id = name.toLowerCase().replace(/\s+/g, '-') + '-' + Date.now();
      
      if (!participants.find(p => p.name === name)) {
        participants.push({
          id,
          name,
          joinedAt: new Date().toISOString()
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

    // Monitor closed captions if available
    observeCaptions();

    // Monitor chat messages
    observeChat();

    // Monitor reactions
    observeReactions();
  }

  // Observe captions for transcription
  function observeCaptions() {
    const observer = new MutationObserver((mutations) => {
      mutations.forEach((mutation) => {
        // Zoom caption selectors
        const captionSelectors = [
          '.caption-container',
          '.closed-caption-container',
          '[class*="caption"]',
          '[class*="subtitle"]'
        ];

        captionSelectors.forEach(selector => {
          if (mutation.target.matches && mutation.target.matches(selector)) {
            const captionText = mutation.target.textContent;
            const speaker = extractSpeakerFromCaption(mutation.target) || 'Unknown';
            
            if (captionText && captionText.trim()) {
              const segment = {
                speaker,
                text: captionText,
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
    });

    // Find caption container
    const captionContainer = document.querySelector('.caption-window, .closed-caption-window, [class*="caption"]');
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
    const speakerElement = element.querySelector('[class*="speaker"], [class*="name"]');
    if (speakerElement) {
      return speakerElement.textContent.trim();
    }

    // Check if caption text contains speaker pattern (e.g., "John: Hello")
    const text = element.textContent;
    const speakerMatch = text.match(/^([^:]+):\s/);
    if (speakerMatch) {
      return speakerMatch[1].trim();
    }

    return null;
  }

  // Observe chat messages
  function observeChat() {
    const observer = new MutationObserver((mutations) => {
      mutations.forEach((mutation) => {
        mutation.addedNodes.forEach((node) => {
          if (node.nodeType === Node.ELEMENT_NODE) {
            // Zoom chat message selectors
            const chatSelectors = [
              '.chat-message',
              '.chat-item',
              '[class*="chat-message"]',
              '[class*="chat-item"]'
            ];

            chatSelectors.forEach(selector => {
              if (node.matches && node.matches(selector)) {
                const sender = node.querySelector('[class*="sender"], [class*="from"], [class*="name"]')?.textContent || 'Unknown';
                const message = node.querySelector('[class*="content"], [class*="text"], [class*="message"]')?.textContent || '';
                const time = node.querySelector('[class*="time"], [class*="timestamp"]')?.textContent || new Date().toLocaleTimeString();

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
            });
          }
        });
      });
    });

    // Find chat container
    const chatContainer = document.querySelector('.chat-container, .chat-panel, [class*="chat"]');
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
            if (node.classList && (
              node.classList.contains('reaction') ||
              node.classList.contains('emoji-reaction') ||
              node.className.includes('reaction')
            )) {
              const reaction = node.textContent || node.getAttribute('aria-label') || '';
              const participant = node.getAttribute('data-participant') || 'Unknown';

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

    const reactionContainer = document.querySelector('.reaction-container, [class*="reaction"]');
    if (reactionContainer) {
      observer.observe(reactionContainer, {
        childList: true,
        subtree: true
      });
    }
  }

  // Handle meeting end
  function handleMeetingEnd() {
    isInMeeting = false;

    Logger.analytics('meeting_ended', { platform: 'zoom' });
    
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
        participants
      }
    });

    // Reset state
    meetingId = null;
    participants = [];
  }

  // Start recording
  async function startRecording() {
    if (isRecording) return;

    Logger.analytics('recording_started', { platform: 'zoom' });
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
      
      requestAnimationFrame(checkAudioLevel);
    };
    
    checkAudioLevel();
  }

  // Stop recording
  function stopRecording() {
    if (!isRecording) return;

    Logger.analytics('recording_stopped', { platform: 'zoom' });
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
    Logger.log('Initializing OpenMeet for Zoom');

    // Check for meeting every 2 seconds
    setInterval(detectMeeting, 2000);

    // Initial check
    detectMeeting();

    // Load CSS
    loadStyles();

    // Add keyboard shortcuts
    addKeyboardShortcuts();
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

  // Start
  initialize();

})();
