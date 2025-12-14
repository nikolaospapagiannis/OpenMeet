# Chrome Extension Setup and Support Guide

## Overview

The OpenMeet Chrome Extension enables botless meeting recording directly from your browser, providing seamless integration with popular meeting platforms including Zoom, Google Meet, Microsoft Teams, and Webex.

## Features

### Core Capabilities
- **Botless Recording**: Record meetings without external bots joining
- **Multi-Platform Support**: Works with all major meeting platforms
- **Live Transcription**: Real-time transcription during meetings
- **Smart Detection**: Automatically detects when you join a meeting
- **Privacy Controls**: Granular control over recording preferences
- **Quick Recording**: One-click recording activation

## Component Structure

### 1. Extension Settings Page
**Location**: `/apps/web/src/app/(dashboard)/settings/extension/page.tsx`

Main settings interface providing:
- Extension connection status monitoring
- Recording preference configuration
- Platform-specific settings management
- Installation guide access

### 2. Extension Status Component
**Location**: `/apps/web/src/components/extension/ExtensionStatus.tsx`

Displays real-time extension status including:
- Installation state (installed/not installed)
- Connection status (connected/disconnected/connecting)
- Extension version information
- Last sync timestamp
- Active recording count
- Auto-refresh capability every 30 seconds

### 3. Bot Injection Settings Component
**Location**: `/apps/web/src/components/extension/BotInjectionSettings.tsx`

Configures recording behavior:
- **Bot Injection Modes**:
  - Auto-join: Automatically start recording all detected meetings
  - Ask before joining: Request permission for each meeting
  - Never auto-join: Manual recording only
- **Recording Options**:
  - Audio recording (required for transcription)
  - Video recording (optional, increases storage)
  - Slide/screen capture
  - Live captions generation

### 4. Meeting Detection Component
**Location**: `/apps/web/src/components/extension/MeetingDetection.tsx`

Platform-specific configuration:
- Enable/disable individual platforms (Zoom, Meet, Teams, Webex)
- Test platform connections
- View supported features per platform
- Domain configuration for custom meeting URLs
- Quick enable/disable all platforms

### 5. Quick Record Widget Component
**Location**: `/apps/web/src/components/extension/QuickRecordWidget.tsx`

Instant recording interface:
- Meeting title and participant entry
- Recording mode selection (audio/video/screen)
- Live recording status display
- Recording timer
- Share link generation for live viewing
- Pause/resume/stop controls

### 6. Extension Install Guide Component
**Location**: `/apps/web/src/components/extension/ExtensionInstallGuide.tsx`

Comprehensive installation guide:
- Step-by-step installation instructions
- Feature highlights
- Permission explanations
- Troubleshooting guides
- Support resources

## API Endpoints

### Core Recording Endpoints

#### Start Recording Session
```
POST /api/extension/sessions/start
```
Initiates a new recording session with meeting details.

#### Upload Audio Chunk
```
POST /api/extension/sessions/:sessionId/audio
```
Streams audio data in chunks for processing.

#### Capture Screenshot
```
POST /api/extension/sessions/:sessionId/screenshot
```
Captures and uploads meeting screenshots/slides.

#### End Recording Session
```
POST /api/extension/sessions/:sessionId/end
```
Finalizes the recording session.

### Settings & Configuration

#### Get Extension Settings
```
GET /api/extension/settings
```
Retrieves user-specific extension settings.

#### Update Extension Settings
```
PUT /api/extension/settings
```
Updates recording preferences and configurations.

#### Verify Connection
```
POST /api/extension/verify-connection
```
Verifies extension-to-server connectivity.

### Monitoring & Health

#### Health Check
```
GET /api/extension/health
```
Returns health status of extension services.

#### Error Reporting
```
POST /api/extension/error-report
```
Reports extension errors for debugging.

### Session Management

#### Get Session Details
```
GET /api/extension/sessions/:sessionId
```
Retrieves detailed information about a specific session.

#### Update Session Metadata
```
PATCH /api/extension/sessions/:sessionId
```
Updates session title, participants, tags, etc.

#### Delete Session
```
DELETE /api/extension/sessions/:sessionId
```
Removes a recording session.

#### Get Recording History
```
GET /api/extension/history
```
Lists user's recording history with filtering options.

### Analytics & Sync

#### Get Usage Analytics
```
GET /api/extension/analytics
```
Returns usage statistics and analytics.

#### Sync Data
```
POST /api/extension/sync
```
Synchronizes extension data with server.

## Installation Process

### Step 1: Install from Chrome Web Store
1. Visit the Chrome Web Store listing
2. Click "Add to Chrome"
3. Confirm installation when prompted

### Step 2: Grant Permissions
Required permissions:
- **Tab Capture**: Record audio/video from meeting tabs
- **Active Tab**: Detect meeting platforms
- **Storage**: Save preferences locally
- **Scripting**: Inject recording controls
- **Notifications**: Alert on recording events

### Step 3: Connect Account
1. Click extension icon in toolbar
2. Sign in with OpenMeet account
3. Authorize extension access

### Step 4: Configure Settings
1. Navigate to Settings > Extension
2. Set bot injection preferences
3. Enable desired platforms
4. Configure recording options

## Usage Guide

### Automatic Recording
When auto-join is enabled:
1. Extension detects meeting start
2. Automatically begins recording
3. Shows notification of recording status

### Manual Recording
For manual control:
1. Click extension icon during meeting
2. Press "Start Recording" button
3. Monitor recording status in popup

### Quick Recording Widget
From the dashboard:
1. Enter meeting details (optional)
2. Select recording modes
3. Click "Start Recording"
4. Share live link with participants

## Platform-Specific Features

### Zoom
- Audio/video recording
- Screen capture
- Participant detection
- Chat export support

### Google Meet
- Live captions
- Auto-transcription
- Calendar integration
- Screen recording

### Microsoft Teams
- Meeting recording
- Chat history capture
- File sharing detection
- Presenter notes

### Webex
- Audio/video capture
- Whiteboard capture
- Breakout room support
- Q&A tracking

## Security & Privacy

### Data Protection
- End-to-end encryption for recordings
- Local processing when possible
- Secure API communication
- No third-party data sharing

### Privacy Controls
- Per-meeting privacy settings
- Domain exclusion lists
- Team/organization visibility controls
- Recording consent management

## Troubleshooting

### Common Issues

#### Extension Not Detecting Meetings
- Refresh the meeting page
- Check granted permissions
- Verify platform is enabled in settings

#### Recording Not Starting
- Check microphone/camera permissions
- Ensure browser allows screen capture
- Verify extension is connected to account

#### No Audio in Recordings
- Enable "Share audio" during screen capture
- Check system audio settings
- Verify browser audio permissions

#### Extension Icon Not Visible
- Click puzzle piece icon in toolbar
- Pin OpenMeet extension
- Restart browser if needed

## Message Communication

The extension communicates with the web app using postMessage:

### Extension to Web App Messages
```javascript
// Status check response
window.postMessage({
  type: 'OPENMEET_STATUS_RESPONSE',
  activeRecordings: 0
}, '*');

// Active meeting found
window.postMessage({
  type: 'OPENMEET_ACTIVE_MEETING_FOUND',
  meeting: { platform, url, title }
}, '*');

// Extension pong (connection check)
window.postMessage({
  type: 'OPENMEET_EXTENSION_PONG',
  version: '1.0.0'
}, '*');
```

### Web App to Extension Messages
```javascript
// Check extension status
window.postMessage({ type: 'OPENMEET_STATUS_CHECK' }, '*');

// Start recording
window.postMessage({
  type: 'OPENMEET_START_RECORDING',
  data: { title, participants, settings, platform, url }
}, '*');

// Control recording
window.postMessage({ type: 'OPENMEET_PAUSE_RECORDING' }, '*');
window.postMessage({ type: 'OPENMEET_RESUME_RECORDING' }, '*');
window.postMessage({ type: 'OPENMEET_STOP_RECORDING' }, '*');

// Update settings
window.postMessage({
  type: 'OPENMEET_UPDATE_RECORDING_SETTINGS',
  settings: { audio, video, screen }
}, '*');

// Sync request
window.postMessage({
  type: 'OPENMEET_SYNC_REQUEST',
  settings
}, '*');
```

## Support Resources

### Documentation
- In-app installation guide
- Platform-specific guides
- API documentation
- Video tutorials

### Help Channels
- Community forum
- Email support
- Live chat assistance
- Knowledge base articles

## Development Notes

### Testing the Extension
1. Load extension in developer mode
2. Navigate to supported meeting platform
3. Verify detection and recording
4. Check API communication
5. Test all settings changes

### Key Files Modified/Created
- `/apps/web/src/app/(dashboard)/settings/extension/page.tsx` - Main settings page
- `/apps/web/src/components/extension/ExtensionStatus.tsx` - Status display
- `/apps/web/src/components/extension/BotInjectionSettings.tsx` - Recording preferences
- `/apps/web/src/components/extension/MeetingDetection.tsx` - Platform configuration
- `/apps/web/src/components/extension/QuickRecordWidget.tsx` - Quick recording interface
- `/apps/web/src/components/extension/ExtensionInstallGuide.tsx` - Installation guide
- `/apps/api/src/routes/chrome-extension.ts` - Enhanced API endpoints

### Extension Manifest
The extension uses Manifest V3 with the following key permissions:
- activeTab
- tabCapture
- storage
- notifications
- scripting

Host permissions for:
- https://*.zoom.us/*
- https://meet.google.com/*
- https://*.teams.microsoft.com/*
- https://*.webex.com/*

## Future Enhancements

### Planned Features
- Offline recording capability
- Advanced AI insights during meetings
- Custom platform support
- Browser extension for Firefox/Edge
- Mobile companion app integration
- Advanced analytics dashboard
- Team collaboration features

### API Improvements
- WebSocket support for real-time updates
- Batch upload optimization
- Compression for audio chunks
- Progressive upload resumption
- Enhanced error recovery

## Conclusion

The Chrome Extension provides a powerful, privacy-focused solution for meeting recording that integrates seamlessly with the OpenMeet platform. With comprehensive settings, multi-platform support, and user-friendly interfaces, it enables efficient meeting capture and transcription without the need for external bots.