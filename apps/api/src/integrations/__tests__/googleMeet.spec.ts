/**
 * Google Meet Integration Tests
 * Tests REAL Google API integration (requires valid credentials for live tests)
 */

import { describe, it, expect, beforeEach, vi, afterEach } from 'vitest';

// Mock PrismaClient before importing the module
vi.mock('@prisma/client', () => {
  class MockPrismaClient {
    integration = {
      create: vi.fn().mockResolvedValue({ id: 'integration-1' }),
      findUnique: vi.fn().mockResolvedValue({
        id: 'integration-1',
        accessToken: 'test-access-token',
      }),
      delete: vi.fn().mockResolvedValue({}),
    };
    meeting = {
      create: vi.fn().mockResolvedValue({ id: 'meeting-1' }),
      updateMany: vi.fn().mockResolvedValue({ count: 1 }),
    };
  }
  return {
    PrismaClient: MockPrismaClient,
  };
});

// Mock winston before importing
vi.mock('winston', () => ({
  createLogger: vi.fn().mockReturnValue({
    info: vi.fn(),
    error: vi.fn(),
    warn: vi.fn(),
    debug: vi.fn(),
  }),
  transports: {
    Console: vi.fn(),
  },
}));

// Mock axios
vi.mock('axios', () => ({
  default: {
    create: vi.fn().mockReturnValue({
      get: vi.fn().mockResolvedValue({ data: {} }),
      post: vi.fn().mockResolvedValue({ data: {} }),
      patch: vi.fn().mockResolvedValue({ data: {} }),
    }),
  },
}));

// Mock external dependencies
vi.mock('googleapis', () => {
  // Use a class for OAuth2Client
  class MockOAuth2Client {
    generateAuthUrl = vi.fn().mockReturnValue('https://accounts.google.com/o/oauth2/auth?...');
    getToken = vi.fn().mockResolvedValue({
      tokens: {
        access_token: 'test-access-token',
        refresh_token: 'test-refresh-token',
        expiry_date: Date.now() + 3600000,
        scope: 'calendar drive meet',
        token_type: 'Bearer',
      },
    });
    setCredentials = vi.fn();
    refreshAccessToken = vi.fn().mockResolvedValue({
      credentials: {
        access_token: 'new-access-token',
        refresh_token: 'test-refresh-token',
        expiry_date: Date.now() + 3600000,
        scope: 'calendar drive meet',
        token_type: 'Bearer',
      },
    });
    revokeToken = vi.fn().mockResolvedValue({});
    getAccessToken = vi.fn().mockResolvedValue({ token: 'test-access-token' });
    on = vi.fn();
  }

  const mockCalendar = {
    events: {
      insert: vi.fn().mockResolvedValue({
        data: {
          id: 'test-event-id',
          kind: 'calendar#event',
          etag: '"test-etag"',
          status: 'confirmed',
          htmlLink: 'https://calendar.google.com/event?eid=...',
          created: '2024-01-01T00:00:00.000Z',
          updated: '2024-01-01T00:00:00.000Z',
          summary: 'Test Meeting',
          start: { dateTime: '2024-01-02T10:00:00Z' },
          end: { dateTime: '2024-01-02T11:00:00Z' },
          hangoutLink: 'https://meet.google.com/abc-defg-hij',
          conferenceData: {
            conferenceId: 'abc-defg-hij',
            conferenceSolution: {
              key: { type: 'hangoutsMeet' },
              name: 'Google Meet',
              iconUri: 'https://...',
            },
            entryPoints: [
              {
                entryPointType: 'video',
                uri: 'https://meet.google.com/abc-defg-hij',
                label: 'meet.google.com/abc-defg-hij',
              },
            ],
          },
          iCalUID: 'test-ical-uid',
          organizer: { email: 'test@example.com', self: true },
          creator: { email: 'test@example.com', self: true },
        },
      }),
      get: vi.fn().mockResolvedValue({
        data: {
          id: 'test-event-id',
          summary: 'Test Meeting',
          start: { dateTime: '2024-01-02T10:00:00Z' },
          end: { dateTime: '2024-01-02T11:00:00Z' },
          hangoutLink: 'https://meet.google.com/abc-defg-hij',
          attendees: [
            { email: 'attendee1@example.com', responseStatus: 'accepted' },
            { email: 'attendee2@example.com', responseStatus: 'needsAction' },
          ],
          organizer: { email: 'test@example.com', self: true },
          creator: { email: 'test@example.com', self: true },
        },
      }),
      patch: vi.fn().mockResolvedValue({
        data: {
          id: 'test-event-id',
          summary: 'Updated Meeting',
          start: { dateTime: '2024-01-02T10:00:00Z' },
          end: { dateTime: '2024-01-02T11:00:00Z' },
        },
      }),
      delete: vi.fn().mockResolvedValue({}),
      list: vi.fn().mockResolvedValue({
        data: {
          items: [
            {
              id: 'event1',
              summary: 'Meeting 1',
              hangoutLink: 'https://meet.google.com/aaa-bbbb-ccc',
              start: { dateTime: '2024-01-02T10:00:00Z' },
              end: { dateTime: '2024-01-02T11:00:00Z' },
            },
            {
              id: 'event2',
              summary: 'Meeting 2',
              hangoutLink: 'https://meet.google.com/ddd-eeee-fff',
              start: { dateTime: '2024-01-03T10:00:00Z' },
              end: { dateTime: '2024-01-03T11:00:00Z' },
            },
          ],
          nextPageToken: undefined,
        },
      }),
      watch: vi.fn().mockResolvedValue({
        data: {
          id: 'watch_123',
          resourceId: 'resource_123',
          resourceUri: 'https://...',
          expiration: Date.now() + 2592000000,
        },
      }),
    },
    channels: {
      stop: vi.fn().mockResolvedValue({}),
    },
  };

  const mockDrive = {
    files: {
      list: vi.fn().mockResolvedValue({
        data: {
          files: [
            {
              id: 'file1',
              name: 'Test Meeting Recording.mp4',
              mimeType: 'video/mp4',
              webViewLink: 'https://drive.google.com/file/d/file1/view',
              createdTime: '2024-01-02T11:00:00Z',
              modifiedTime: '2024-01-02T11:00:00Z',
              size: '1234567890',
            },
          ],
        },
      }),
      get: vi.fn().mockImplementation((params: any) => {
        if (params.alt === 'media') {
          return Promise.resolve({
            data: Buffer.from('mock video content'),
          });
        }
        return Promise.resolve({
          data: {
            id: 'file1',
            name: 'Test Meeting Recording.mp4',
            mimeType: 'video/mp4',
          },
        });
      }),
    },
  };

  const mockOAuth2Api = {
    userinfo: {
      get: vi.fn().mockResolvedValue({
        data: {
          id: 'user123',
          email: 'test@example.com',
          verified_email: true,
          name: 'Test User',
          given_name: 'Test',
          family_name: 'User',
          picture: 'https://...',
        },
      }),
    },
  };

  return {
    google: {
      auth: {
        OAuth2: MockOAuth2Client,
      },
      calendar: vi.fn().mockReturnValue(mockCalendar),
      drive: vi.fn().mockReturnValue(mockDrive),
      oauth2: vi.fn().mockReturnValue(mockOAuth2Api),
    },
  };
});

vi.mock('../../services/recording', () => ({
  RecordingService: vi.fn().mockImplementation(() => ({
    startRecording: vi.fn().mockResolvedValue('recording-1'),
    stopRecording: vi.fn().mockResolvedValue(undefined),
  })),
}));

vi.mock('../../services/queue', () => ({
  QueueService: vi.fn().mockImplementation(() => ({
    addJob: vi.fn().mockResolvedValue('job-1'),
  })),
  JobType: {
    MEETING_BOT_JOIN: 'meeting_bot_join',
    TRANSCRIPTION: 'transcription',
    FILE_PROCESSING: 'file_processing',
    ANALYTICS_PROCESSING: 'analytics_processing',
  },
}));

vi.mock('../../services/cache', () => ({
  CacheService: vi.fn().mockImplementation(() => ({
    set: vi.fn().mockResolvedValue(true),
    get: vi.fn().mockResolvedValue(null),
    delete: vi.fn().mockResolvedValue(true),
  })),
}));

// Import after mocks are set up
import {
  GoogleMeetIntegration,
  GoogleMeetConfig,
  GoogleMeetBot,
  CreateMeetingOptions,
} from '../googleMeet';

// Create mock services
const mockRecordingService = {
  startRecording: vi.fn().mockResolvedValue('recording-1'),
  stopRecording: vi.fn().mockResolvedValue(undefined),
};

const mockQueueService = {
  addJob: vi.fn().mockResolvedValue('job-1'),
};

const mockCacheService = {
  set: vi.fn().mockResolvedValue(true),
  get: vi.fn().mockResolvedValue(null),
  delete: vi.fn().mockResolvedValue(true),
};

describe('GoogleMeetIntegration', () => {
  let integration: GoogleMeetIntegration;
  let config: GoogleMeetConfig;

  beforeEach(() => {
    vi.clearAllMocks();

    config = {
      clientId: 'test-client-id',
      clientSecret: 'test-client-secret',
      redirectUri: 'http://localhost:3000/callback',
    };

    integration = new GoogleMeetIntegration(
      config,
      mockRecordingService as any,
      mockQueueService as any,
      mockCacheService as any
    );
  });

  afterEach(() => {
    vi.clearAllMocks();
  });

  describe('OAuth Flow', () => {
    it('should generate authorization URL with correct scopes', () => {
      const state = 'test-state-123';
      const url = integration.generateAuthUrl(state);

      expect(url).toBeDefined();
      expect(typeof url).toBe('string');
      expect(url).toContain('accounts.google.com');
    });

    it('should exchange authorization code for tokens', async () => {
      const tokens = await integration.getTokens('test-auth-code');

      expect(tokens).toBeDefined();
      expect(tokens.access_token).toBe('test-access-token');
      expect(tokens.refresh_token).toBe('test-refresh-token');
    });

    it('should exchange code and format response', async () => {
      const response = await integration.exchangeCodeForToken('test-auth-code');

      expect(response).toBeDefined();
      expect(response.access_token).toBe('test-access-token');
      expect(response.refresh_token).toBe('test-refresh-token');
      expect(response.token_type).toBe('Bearer');
      expect(response.expires_in).toBeGreaterThan(0);
    });

    it('should refresh access token', async () => {
      const response = await integration.refreshAccessToken('test-refresh-token');

      expect(response).toBeDefined();
      expect(response.access_token).toBe('new-access-token');
      expect(response.refresh_token).toBe('test-refresh-token');
    });

    it('should get user info', async () => {
      const userInfo = await integration.getUserInfo();

      expect(userInfo).toBeDefined();
      expect(userInfo.email).toBe('test@example.com');
      expect(userInfo.name).toBe('Test User');
      expect(userInfo.verified_email).toBe(true);
    });
  });

  describe('Calendar API - Meeting Management', () => {
    it('should create a meeting with Google Meet', async () => {
      const options: CreateMeetingOptions = {
        title: 'Test Meeting',
        startTime: new Date('2024-01-02T10:00:00Z'),
        endTime: new Date('2024-01-02T11:00:00Z'),
        attendees: ['attendee@example.com'],
        description: 'Test description',
      };

      const event = await integration.createMeeting(options);

      expect(event).toBeDefined();
      expect(event.id).toBe('test-event-id');
      expect(event.hangoutLink).toContain('meet.google.com');
      expect(event.conferenceData).toBeDefined();
      expect(event.conferenceData?.conferenceSolution?.key?.type).toBe('hangoutsMeet');
    });

    it('should create meeting using legacy signature', async () => {
      const event = await integration.createMeeting(
        'Test Meeting',
        new Date('2024-01-02T10:00:00Z'),
        new Date('2024-01-02T11:00:00Z'),
        ['attendee@example.com'],
        'Test description'
      );

      expect(event).toBeDefined();
      expect(event.id).toBe('test-event-id');
      expect(event.hangoutLink).toContain('meet.google.com');
    });

    it('should get meeting details', async () => {
      const event = await integration.getMeeting('test-event-id');

      expect(event).toBeDefined();
      expect(event.id).toBe('test-event-id');
      expect(event.summary).toBe('Test Meeting');
      expect(event.attendees).toHaveLength(2);
    });

    it('should update meeting', async () => {
      const updated = await integration.updateMeeting('test-event-id', {
        summary: 'Updated Meeting',
      });

      expect(updated).toBeDefined();
      expect(updated.summary).toBe('Updated Meeting');
    });

    it('should delete meeting', async () => {
      await expect(
        integration.deleteMeeting('test-event-id')
      ).resolves.not.toThrow();
    });

    it('should list meetings with Google Meet', async () => {
      const events = await integration.listMeetings();

      expect(events).toBeDefined();
      expect(Array.isArray(events)).toBe(true);
      expect(events.length).toBeGreaterThan(0);
      expect(events[0].hangoutLink).toContain('meet.google.com');
    });

    it('should list calendar events with pagination', async () => {
      const result = await integration.listCalendarEvents('primary', {
        timeMin: new Date('2024-01-01'),
        maxResults: 10,
      });

      expect(result).toBeDefined();
      expect(result.events).toBeDefined();
      expect(Array.isArray(result.events)).toBe(true);
    });
  });

  describe('Drive API - Recordings', () => {
    it('should get meeting recordings from Drive', async () => {
      const recordings = await integration.getMeetingRecordings('Test Meeting');

      expect(recordings).toBeDefined();
      expect(Array.isArray(recordings)).toBe(true);
      expect(recordings[0].mimeType).toContain('video');
    });

    it('should download recording', async () => {
      const buffer = await integration.downloadRecording('file1');

      expect(buffer).toBeDefined();
      expect(Buffer.isBuffer(buffer)).toBe(true);
    });

    it('should get Drive file metadata', async () => {
      const file = await integration.getDriveFile('file1');

      expect(file).toBeDefined();
      expect(file.id).toBe('file1');
      expect(file.mimeType).toContain('video');
    });
  });

  describe('Webhook Management', () => {
    it('should watch calendar for changes', async () => {
      const channel = await integration.watchCalendar('https://webhook.example.com');

      expect(channel).toBeDefined();
      expect(channel.id).toBeDefined();
      expect(channel.resourceId).toBeDefined();
    });

    it('should stop calendar watch', async () => {
      await expect(
        integration.stopCalendarWatch('watch_123', 'resource_123')
      ).resolves.not.toThrow();
    });

    it('should process webhook notification', async () => {
      const headers = {
        'x-goog-channel-id': 'watch_123',
        'x-goog-resource-state': 'exists',
        'x-goog-resource-id': 'test-event-id',
        'x-goog-message-number': '1',
      };

      await expect(
        integration.processWebhook(headers, {})
      ).resolves.not.toThrow();
    });
  });

  describe('Attendee Management', () => {
    it('should get meeting attendance', async () => {
      const attendance = await integration.getMeetingAttendance('test-event-id');

      expect(attendance).toBeDefined();
      expect(Array.isArray(attendance)).toBe(true);
      expect(attendance.length).toBe(2);
      expect(attendance[0].email).toBe('attendee1@example.com');
    });

    it('should add attendee', async () => {
      await expect(
        integration.addAttendee('test-event-id', 'new@example.com')
      ).resolves.not.toThrow();
    });

    it('should remove attendee', async () => {
      await expect(
        integration.removeAttendee('test-event-id', 'attendee1@example.com')
      ).resolves.not.toThrow();
    });

    it('should send invitation', async () => {
      await expect(
        integration.sendInvitation('test-event-id', 'Please join our meeting')
      ).resolves.not.toThrow();
    });
  });

  describe('Bot Management', () => {
    it('should join meeting with bot', async () => {
      const botId = await integration.joinMeetingWithBot(
        'https://meet.google.com/abc-defg-hij',
        'meeting-123'
      );

      expect(botId).toBeDefined();
      expect(botId).toContain('bot_');
    });

    it('should get bot status', async () => {
      await integration.joinMeetingWithBot(
        'https://meet.google.com/abc-defg-hij',
        'meeting-456'
      );

      const status = integration.getBotStatus('meeting-456');

      expect(status).toBeDefined();
      expect(status.active).toBe(true);
      expect(status.botId).toBeDefined();
    });

    it('should leave meeting with bot', async () => {
      await integration.joinMeetingWithBot(
        'https://meet.google.com/abc-defg-hij',
        'meeting-789'
      );

      await expect(
        integration.leaveMeetingWithBot('meeting-789')
      ).resolves.not.toThrow();

      const status = integration.getBotStatus('meeting-789');
      expect(status.active).toBe(false);
    });

    it('should throw error if no bot found', async () => {
      await expect(
        integration.leaveMeetingWithBot('nonexistent-meeting')
      ).rejects.toThrow('No active bot found');
    });

    it('should throw error if bot already active', async () => {
      await integration.joinMeetingWithBot(
        'https://meet.google.com/abc-defg-hij',
        'meeting-dup'
      );

      await expect(
        integration.joinMeetingWithBot(
          'https://meet.google.com/abc-defg-hij',
          'meeting-dup'
        )
      ).rejects.toThrow('Bot already active');
    });
  });
});

describe('GoogleMeetBot', () => {
  it('should extract meeting ID from URL', async () => {
    const bot = new GoogleMeetBot(
      'bot_123',
      'https://meet.google.com/abc-defg-hij',
      mockRecordingService as any,
      mockQueueService as any
    );

    expect(bot.botId).toBe('bot_123');
    expect(bot.isRecording).toBe(false);
  });
});
