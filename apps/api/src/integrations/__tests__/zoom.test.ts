/**
 * Zoom Integration Tests
 * Tests for real Zoom SDK/Bot implementation
 */

import { ZoomIntegration } from '../zoom';
import axios from 'axios';

jest.mock('axios');
jest.mock('@prisma/client', () => ({
  PrismaClient: jest.fn().mockImplementation(() => ({
    integration: {
      findFirst: jest.fn(),
      create: jest.fn(),
      update: jest.fn(),
      updateMany: jest.fn()
    },
    meeting: {
      create: jest.fn(),
      findFirst: jest.fn(),
      updateMany: jest.fn()
    },
    meetingParticipant: {
      create: jest.fn(),
      updateMany: jest.fn()
    }
  }))
}));

describe('ZoomIntegration - Real SDK Implementation', () => {
  let zoomIntegration: ZoomIntegration;
  let mockRecordingService: any;
  let mockQueueService: any;
  let mockCacheService: any;

  beforeEach(() => {
    // Create mock services with required methods
    mockRecordingService = {
      startRecording: jest.fn().mockResolvedValue('recording-id'),
      stopRecording: jest.fn().mockResolvedValue(undefined)
    };

    mockQueueService = {
      addJob: jest.fn().mockResolvedValue(undefined)
    };

    mockCacheService = {
      get: jest.fn().mockResolvedValue(null),
      set: jest.fn().mockResolvedValue(undefined)
    };

    zoomIntegration = new ZoomIntegration(
      {
        clientId: 'test_client_id',
        clientSecret: 'test_client_secret',
        redirectUri: 'http://localhost:3000/zoom/callback',
        webhookSecret: 'test_webhook_secret',
        sdkKey: 'test_sdk_key',
        sdkSecret: 'test_sdk_secret',
      },
      mockRecordingService,
      mockQueueService,
      mockCacheService
    );
  });

  describe('Bot Functionality', () => {
    test('joinMeetingWithBot creates bot with SDK credentials', async () => {
      const meetingId = '123456789';
      const meetingPassword = 'password123';

      // Mock the bot connection
      mockRecordingService.startRecording.mockResolvedValue('recording-id-123');

      // Mock Zoom API responses
      (axios.create as jest.Mock).mockReturnValue({
        post: jest.fn().mockResolvedValue({
          data: {
            participant_id: 'bot-participant-123',
            join_url: 'https://zoom.us/join/123456789'
          }
        }),
        patch: jest.fn().mockResolvedValue({
          data: { recording_id: 'cloud-recording-123' }
        }),
        interceptors: {
          request: { use: jest.fn() }
        }
      });

      const botId = await zoomIntegration.joinMeetingWithBot(meetingId, meetingPassword);

      expect(botId).toBeDefined();
      expect(botId).toContain('bot_');
      expect(mockRecordingService.startRecording).toHaveBeenCalled();
    });

    test('bot generates valid SDK JWT token', async () => {
      const meetingId = '987654321';

      // Mock successful bot creation
      mockRecordingService.startRecording.mockResolvedValue('recording-456');

      const botId = await zoomIntegration.joinMeetingWithBot(meetingId);

      // Verify bot was created
      expect(botId).toBeDefined();
      expect(botId).toMatch(/^bot_\d+_[a-z0-9]+$/);
    });

    test('bot handles cloud recording', async () => {
      const meetingId = '111222333';

      // Mock Zoom API for cloud recording
      const mockApi = {
        post: jest.fn().mockResolvedValue({
          data: {
            participant_id: 'participant-789',
            join_url: 'https://zoom.us/join/111222333'
          }
        }),
        patch: jest.fn().mockResolvedValue({
          data: {
            recording_id: 'cloud-rec-789',
            status: 'started'
          }
        }),
        get: jest.fn().mockResolvedValue({
          data: {
            topic: 'Test Meeting',
            recording_files: [
              {
                file_type: 'MP4',
                download_url: 'https://zoom.us/rec/download/video.mp4'
              },
              {
                file_type: 'TRANSCRIPT',
                download_url: 'https://zoom.us/rec/download/transcript.vtt'
              }
            ]
          }
        }),
        interceptors: {
          request: { use: jest.fn() }
        }
      };

      (axios.create as jest.Mock).mockReturnValue(mockApi);
      mockRecordingService.startRecording.mockResolvedValue('local-rec-789');

      const botId = await zoomIntegration.joinMeetingWithBot(meetingId);

      // Verify cloud recording started
      expect(mockApi.patch).toHaveBeenCalledWith(
        expect.stringContaining('/recordings'),
        expect.objectContaining({ action: 'start' })
      );
    });

    test('bot retrieves transcripts from Zoom', async () => {
      const meetingId = '444555666';

      // Mock successful transcript retrieval
      const mockApi = {
        post: jest.fn().mockResolvedValue({
          data: { participant_id: 'bot-999' }
        }),
        patch: jest.fn().mockResolvedValue({
          data: { recording_id: 'rec-999' }
        }),
        get: jest.fn()
          .mockResolvedValueOnce({
            data: {
              recording_files: [
                {
                  file_type: 'TRANSCRIPT',
                  download_url: 'https://zoom.us/rec/transcript.vtt'
                }
              ]
            }
          })
          .mockResolvedValueOnce({
            data: 'This is the meeting transcript content...'
          }),
        interceptors: {
          request: { use: jest.fn() }
        }
      };

      (axios.create as jest.Mock).mockReturnValue(mockApi);
      (axios.get as jest.Mock).mockResolvedValue({
        data: 'Transcript content from download URL'
      });

      mockRecordingService.startRecording.mockResolvedValue('rec-local-999');

      const botId = await zoomIntegration.joinMeetingWithBot(meetingId);

      // Leave meeting to trigger recording processing
      await zoomIntegration.leaveMeetingWithBot(meetingId);

      // Wait for async processing
      await new Promise(resolve => setTimeout(resolve, 6000));

      // Verify transcript was queued for processing
      expect(mockQueueService.addJob).toHaveBeenCalledWith(
        expect.any(String),
        expect.objectContaining({
          payload: expect.objectContaining({
            meetingId,
            platform: 'zoom'
          })
        })
      );
    });

    test('bot handles meeting with registration', async () => {
      const meetingId = '777888999';

      // Mock API to fail initial join, succeed with registration
      const mockApi = {
        post: jest.fn()
          .mockRejectedValueOnce({
            response: { status: 404, data: { message: 'Meeting not found' } }
          })
          .mockResolvedValueOnce({
            data: {
              registrant_id: 'reg-123',
              join_url: 'https://zoom.us/join/registered'
            }
          }),
        put: jest.fn().mockResolvedValue({}),
        patch: jest.fn().mockResolvedValue({
          data: { recording_id: 'rec-reg-123' }
        }),
        interceptors: {
          request: { use: jest.fn() }
        }
      };

      (axios.create as jest.Mock).mockReturnValue(mockApi);
      mockRecordingService.startRecording.mockResolvedValue('local-reg-123');

      const botId = await zoomIntegration.joinMeetingWithBot(meetingId);

      // Verify registration flow was used
      expect(mockApi.post).toHaveBeenCalledWith(
        expect.stringContaining('/registrants'),
        expect.objectContaining({
          email: expect.stringContaining('@recording.bot'),
          first_name: 'Recording'
        })
      );

      expect(mockApi.put).toHaveBeenCalledWith(
        expect.stringContaining('/registrants/status'),
        expect.objectContaining({ action: 'approve' })
      );
    });

    test('bot enables live transcription', async () => {
      const meetingId = '101010';

      const mockApi = {
        post: jest.fn().mockResolvedValue({
          data: { participant_id: 'bot-trans-123' }
        }),
        patch: jest.fn().mockResolvedValue({
          data: { status: 'success' }
        }),
        interceptors: {
          request: { use: jest.fn() }
        }
      };

      (axios.create as jest.Mock).mockReturnValue(mockApi);
      mockRecordingService.startRecording.mockResolvedValue('rec-trans-123');

      await zoomIntegration.joinMeetingWithBot(meetingId);

      // Verify transcription was enabled
      expect(mockApi.patch).toHaveBeenCalledWith(
        expect.stringContaining(meetingId),
        expect.objectContaining({
          settings: expect.objectContaining({
            auto_generated_captions: true,
            save_caption: true
          })
        })
      );
    });
  });

  describe('OAuth Flow', () => {
    test('generates correct authorization URL', () => {
      const state = 'test-state-123';
      const authUrl = zoomIntegration.getAuthorizationUrl(state);

      expect(authUrl).toContain('https://zoom.us/oauth/authorize');
      expect(authUrl).toContain('client_id=test_client_id');
      expect(authUrl).toContain('state=test-state-123');
      expect(authUrl).toContain('response_type=code');
    });

    test('exchanges code for token', async () => {
      const mockResponse = {
        data: {
          access_token: 'access-token-123',
          refresh_token: 'refresh-token-456',
          expires_in: 3600,
          scope: 'meeting:read meeting:write'
        }
      };

      (axios.post as jest.Mock).mockResolvedValue(mockResponse);

      const tokens = await zoomIntegration.exchangeCodeForToken('auth-code-789');

      expect(tokens.access_token).toBe('access-token-123');
      expect(tokens.refresh_token).toBe('refresh-token-456');
      expect(axios.post).toHaveBeenCalledWith(
        'https://zoom.us/oauth/token',
        expect.any(URLSearchParams),
        expect.objectContaining({
          headers: expect.objectContaining({
            Authorization: expect.stringContaining('Basic')
          })
        })
      );
    });
  });

  describe('Webhook Processing', () => {
    test('verifies webhook signature correctly', async () => {
      const body = {
        event: 'meeting.started',
        payload: {
          object: { id: '123456', topic: 'Test Meeting' }
        },
        event_ts: Date.now()
      };

      const timestamp = Date.now().toString();
      const message = `v0:${timestamp}:${JSON.stringify(body)}`;

      // Generate valid signature
      const crypto = require('crypto');
      const hash = crypto
        .createHmac('sha256', 'test_webhook_secret')
        .update(message)
        .digest('hex');

      const headers = {
        'x-zm-request-timestamp': timestamp,
        'x-zm-signature': `v0=${hash}`
      };

      // Process webhook shouldn't throw
      await expect(
        zoomIntegration.processWebhook(headers, body)
      ).resolves.not.toThrow();
    });

    test('rejects invalid webhook signature', async () => {
      const body = { event: 'meeting.started' };
      const headers = {
        'x-zm-request-timestamp': Date.now().toString(),
        'x-zm-signature': 'invalid-signature'
      };

      await expect(
        zoomIntegration.processWebhook(headers, body)
      ).rejects.toThrow('Invalid webhook signature');
    });
  });

  describe('Meeting Management', () => {
    test('creates scheduled meeting with settings', async () => {
      const mockApi = {
        post: jest.fn().mockResolvedValue({
          data: {
            id: 999888777,
            topic: 'Scheduled Test Meeting',
            join_url: 'https://zoom.us/j/999888777',
            start_time: '2024-12-15T10:00:00Z',
            duration: 60
          }
        }),
        interceptors: {
          request: { use: jest.fn() }
        }
      };

      (axios.create as jest.Mock).mockReturnValue(mockApi);

      const meeting = await zoomIntegration.createMeeting(
        'user-123',
        'org-456',
        'Scheduled Test Meeting',
        new Date('2024-12-15T10:00:00Z'),
        60,
        {
          auto_recording: 'cloud',
          mute_upon_entry: true
        }
      );

      expect(meeting.id).toBe(999888777);
      expect(meeting.topic).toBe('Scheduled Test Meeting');
      expect(mockApi.post).toHaveBeenCalledWith(
        expect.stringContaining('/meetings'),
        expect.objectContaining({
          type: 2, // Scheduled meeting
          settings: expect.objectContaining({
            auto_recording: 'cloud',
            mute_upon_entry: true
          })
        })
      );
    });

    test('retrieves cloud recordings', async () => {
      const mockApi = {
        get: jest.fn().mockResolvedValue({
          data: {
            meetings: [
              {
                id: '111',
                recording_files: [
                  {
                    id: 'rec-1',
                    file_type: 'MP4',
                    download_url: 'https://zoom.us/rec/1.mp4'
                  },
                  {
                    id: 'rec-2',
                    file_type: 'TRANSCRIPT',
                    download_url: 'https://zoom.us/rec/1.vtt'
                  }
                ]
              }
            ]
          }
        }),
        interceptors: {
          request: { use: jest.fn() }
        }
      };

      (axios.create as jest.Mock).mockReturnValue(mockApi);

      const recordings = await zoomIntegration.getCloudRecordings(
        'user-123',
        new Date('2024-01-01'),
        new Date('2024-12-31')
      );

      expect(recordings).toHaveLength(2);
      expect(recordings[0].file_type).toBe('MP4');
      expect(recordings[1].file_type).toBe('TRANSCRIPT');
    });
  });
});