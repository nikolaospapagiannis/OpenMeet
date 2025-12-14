# Zoom SDK Integration Documentation

## Overview

This document describes the real Zoom SDK/Bot integration implemented in the `zoom.ts` file. The integration provides full functionality for joining meetings, recording, and retrieving transcriptions using Zoom's official SDK and REST API v2.

## Key Features Implemented

### 1. Bot Authentication
- **SDK JWT Token Generation**: Uses Meeting SDK credentials to generate JWT tokens for bot authentication
- **Meeting Signatures**: Generates meeting-specific signatures for secure bot joining
- **OAuth 2.0 Flow**: Full OAuth implementation for user account connection

### 2. Meeting Bot Capabilities

#### Core Methods Implemented:

##### `joinMeetingAsBot(signature: string)`
- Joins Zoom meetings programmatically using the REST API
- Supports both regular meetings and meetings requiring registration
- Handles password-protected meetings
- Fallback mechanism for different meeting types

##### `startCloudRecording()`
- Triggers Zoom cloud recording via API
- Handles recording state management
- Provides error handling for already-started recordings

##### `getRecording()`
- Retrieves cloud recording files from Zoom
- Identifies video (MP4), audio (M4A), and transcript (VTT) files
- Returns download URLs for all recording artifacts

##### `getTranscript()`
- Downloads meeting transcripts from Zoom cloud
- Supports both VTT and text transcript formats
- Fallback to live transcription API when cloud transcript unavailable

##### `enableTranscription()`
- Enables automated captions and transcription for meetings
- Configures save settings for transcripts
- Sets up live transcription settings

### 3. Recording Management

The bot implements a dual recording strategy:
1. **Cloud Recording**: Primary recording via Zoom's cloud infrastructure
2. **Local Recording Service**: Backup recording for redundancy

### 4. Real-time Event Handling

The bot emits events for:
- `connected`: When bot successfully joins meeting
- `recording:started`: When recording begins
- `disconnected`: When bot leaves meeting
- `error`: On any failure conditions

## Configuration Requirements

### Environment Variables

```bash
# Required for Bot Authentication
ZOOM_SDK_KEY=your_sdk_key        # From Zoom App Marketplace
ZOOM_SDK_SECRET=your_sdk_secret  # From Zoom App Marketplace

# Required for OAuth Flow
ZOOM_CLIENT_ID=your_client_id
ZOOM_CLIENT_SECRET=your_client_secret
ZOOM_WEBHOOK_SECRET=webhook_secret
ZOOM_ACCOUNT_ID=account_id
```

### Zoom App Setup

1. **Create Meeting SDK App**:
   - Go to [Zoom App Marketplace](https://marketplace.zoom.us/)
   - Create a Meeting SDK app
   - Copy SDK Key and SDK Secret

2. **Create OAuth App** (for user authentication):
   - Create Server-to-Server OAuth app
   - Configure redirect URLs
   - Set required scopes:
     - `meeting:read`
     - `meeting:write`
     - `cloud_recording:read`
     - `cloud_recording:write`

3. **Configure Webhooks**:
   - Set webhook endpoint URL
   - Subscribe to events:
     - `meeting.started`
     - `meeting.ended`
     - `meeting.participant_joined`
     - `meeting.participant_left`
     - `recording.completed`

## API Endpoints Used

### Core Zoom APIs Integrated:

1. **Meeting Management**
   - `POST /meetings` - Create meetings
   - `GET /meetings/{meetingId}` - Get meeting details
   - `PATCH /meetings/{meetingId}` - Update meeting settings
   - `DELETE /meetings/{meetingId}` - Delete meetings

2. **Recording APIs**
   - `PATCH /meetings/{meetingId}/recordings` - Start/stop recording
   - `GET /meetings/{meetingId}/recordings` - Get recording files
   - `GET /meetings/{meetingId}/recordings/transcript` - Get transcript

3. **Bot/Participant APIs**
   - `POST /meetings/{meetingId}/join` - Join as bot
   - `POST /meetings/{meetingId}/registrants` - Register bot
   - `DELETE /meetings/{meetingId}/participants/{participantId}` - Leave meeting

## Usage Example

```typescript
import { ZoomIntegration } from './integrations/zoom';

// Initialize integration
const zoomIntegration = new ZoomIntegration(
  {
    clientId: process.env.ZOOM_CLIENT_ID,
    clientSecret: process.env.ZOOM_CLIENT_SECRET,
    redirectUri: 'https://your-app.com/zoom/callback',
    webhookSecret: process.env.ZOOM_WEBHOOK_SECRET,
    sdkKey: process.env.ZOOM_SDK_KEY,
    sdkSecret: process.env.ZOOM_SDK_SECRET,
  },
  recordingService,
  queueService,
  cacheService
);

// Join meeting with bot
const botId = await zoomIntegration.joinMeetingWithBot(
  meetingId,
  meetingPassword
);

// Bot will automatically:
// 1. Join the meeting
// 2. Start cloud recording
// 3. Enable transcription
// 4. Process recording when meeting ends
```

## Error Handling

The integration includes comprehensive error handling for:
- Invalid meeting IDs
- Authentication failures
- Recording permission issues
- Network timeouts
- API rate limits

## Security Considerations

1. **Token Security**:
   - SDK tokens expire after 2 hours
   - Tokens are generated per-request, never stored

2. **Webhook Verification**:
   - All webhooks validated using HMAC-SHA256
   - Signature verification prevents unauthorized events

3. **Meeting Access**:
   - Bots join as participants (not hosts)
   - Password handling for protected meetings
   - Registration approval for restricted meetings

## Limitations

1. **API Rate Limits**: Zoom enforces rate limits on API calls
2. **Recording Storage**: Cloud recordings count against account storage
3. **Concurrent Bots**: Number of simultaneous bots limited by plan
4. **Transcription Language**: Auto-transcription supports limited languages

## Testing

To test the integration:

1. Set up environment variables
2. Create a test meeting
3. Call `joinMeetingWithBot()` with meeting ID
4. Verify bot joins and recording starts
5. Check cloud recording availability after meeting ends

## Troubleshooting

### Common Issues:

1. **Bot fails to join**:
   - Verify SDK credentials are correct
   - Check meeting allows participants to join
   - Ensure meeting hasn't ended

2. **Recording doesn't start**:
   - Verify account has cloud recording enabled
   - Check storage availability
   - Ensure host permissions allow recording

3. **Transcript unavailable**:
   - Confirm transcription enabled for account
   - Wait for processing (can take several minutes)
   - Check language is supported

## Support

For issues related to:
- Zoom SDK: https://devforum.zoom.us/
- API Documentation: https://marketplace.zoom.us/docs/api-reference/
- Meeting SDK Guide: https://marketplace.zoom.us/docs/sdk/native-sdks/web/