/**
 * Google Meet Content Script
 * Detects meetings, captures audio/video, and handles transcription
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
  Logger.log('Google Meet content script loaded');

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
    // Check for meeting UI elements
    const meetingCode = document.querySelector('[data-meeting-code]')?.getAttribute('data-meeting-code');
    const callFrame = document.querySelector('[data-call-container]');
    const participantsList = document.querySelector('[aria-label*="participant"]');

    if (meetingCode && callFrame && !isInMeeting) {
      isInMeeting = true;
      meetingId = meetingCode;

      Logger.analytics('meeting_detected', { platform: 'google-meet' });
      
      // Get meeting details
      const meetingDetails = {
        id: meetingId,
        platform: 'Google Meet',
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
    } else if (!meetingCode && isInMeeting) {
      // Meeting ended
      handleMeetingEnd();
    }
  }

  // Get participants list
  function getParticipants() {
    const participantElements = document.querySelectorAll('[data-participant-id]');
    const participants = [];
    
    participantElements.forEach(element => {
      const name = element.querySelector('[data-self-name]')?.textContent || 
                   element.querySelector('[aria-label]')?.getAttribute('aria-label') || 
                   'Unknown';
      const id = element.getAttribute('data-participant-id');
      
      if (id && !participants.find(p => p.id === id)) {
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
          const stillPresent = currentParticipants.find(p => p.id === participant.id);
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

    // Monitor captions if available
    observeCaptions();

    // Monitor chat messages
    observeChat();
  }

  // Observe captions for transcription
  function observeCaptions() {
    const observer = new MutationObserver((mutations) => {
      mutations.forEach((mutation) => {
        if (mutation.target.classList && 
            mutation.target.classList.contains('a4cQT')) { // Google Meet caption class
          
          const captionText = mutation.target.textContent;
          const speaker = mutation.target.querySelector('.zs7s8d')?.textContent || 'Unknown';
          
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

    // Find caption container
    const captionContainer = document.querySelector('.a4cQT');
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

  // Observe chat messages
  function observeChat() {
    const observer = new MutationObserver((mutations) => {
      mutations.forEach((mutation) => {
        mutation.addedNodes.forEach((node) => {
          if (node.nodeType === Node.ELEMENT_NODE && 
              node.classList && 
              node.classList.contains('GDhqjd')) { // Chat message class
            
            const sender = node.querySelector('.YTbUzc')?.textContent || 'Unknown';
            const message = node.querySelector('.oIy2qc')?.textContent || '';
            const time = node.querySelector('.MuzmKe')?.textContent || '';

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
      });
    });

    // Find chat container
    const chatContainer = document.querySelector('[aria-label*="Chat"]');
    if (chatContainer) {
      observer.observe(chatContainer, {
        childList: true,
        subtree: true
      });
    }
  }

  // Handle meeting end
  function handleMeetingEnd() {
    isInMeeting = false;

    Logger.analytics('meeting_ended', { platform: 'google-meet' });
    
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

    Logger.analytics('recording_started', { platform: 'google-meet' });
    isRecording = true;

    try {
      // Get media stream
      const stream = await navigator.mediaDevices.getUserMedia({
        audio: {
          echoCancellation: true,
          noiseSuppression: true,
          autoGainControl: true
        },
        video: false
      });

      // Setup audio context for processing
      audioContext = new AudioContext();
      const source = audioContext.createMediaStreamSource(stream);
      
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

    } catch (error) {
      Logger.error('Failed to start recording', error);
      isRecording = false;
    }
  }

  // Stop recording
  function stopRecording() {
    if (!isRecording) return;

    Logger.analytics('recording_stopped', { platform: 'google-meet' });
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
      <div style="
        position: fixed;
        top: 20px;
        right: 20px;
        background: #ff4444;
        color: white;
        padding: 10px 20px;
        border-radius: 20px;
        font-family: Arial, sans-serif;
        font-size: 14px;
        display: flex;
        align-items: center;
        gap: 10px;
        z-index: 999999;
        box-shadow: 0 2px 10px rgba(0,0,0,0.3);
      ">
        <span style="
          width: 10px;
          height: 10px;
          background: white;
          border-radius: 50%;
          animation: blink 1s infinite;
        "></span>
        Recording with OpenMeet
      </div>
      <style>
        @keyframes blink {
          0%, 100% { opacity: 1; }
          50% { opacity: 0.3; }
        }
      </style>
    `;
    document.body.appendChild(indicator);
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
          <strong>${data.speaker}:</strong> ${data.text}
        `;
        transcriptDiv.appendChild(segment);
        transcriptDiv.scrollTop = transcriptDiv.scrollHeight;
      }
    }
  }

  // Initialize
  function initialize() {
    Logger.log('Initializing OpenMeet for Google Meet');

    // Check for meeting every 2 seconds
    setInterval(detectMeeting, 2000);

    // Initial check
    detectMeeting();

    // Inject custom styles
    injectStyles();
  }

  // Inject custom styles
  function injectStyles() {
    const style = document.createElement('style');
    style.textContent = `
      .openmeet-button {
        background: #4285f4;
        color: white;
        border: none;
        padding: 8px 16px;
        border-radius: 4px;
        cursor: pointer;
        font-family: 'Google Sans', Arial, sans-serif;
        font-size: 14px;
        margin: 0 8px;
      }

      .openmeet-button:hover {
        background: #3367d6;
      }

      .openmeet-button.recording {
        background: #ff4444;
      }

      .transcript-segment {
        padding: 8px;
        border-bottom: 1px solid #e0e0e0;
        font-size: 14px;
      }
    `;
    document.head.appendChild(style);
  }

  // Start
  initialize();

})();
