/**
 * Test Data Fixtures
 * Centralized test data for consistent testing across all suites
 */

export const testUsers = {
  validUser: {
    email: 'test@example.com',
    password: 'Test123!',
    firstName: 'Test',
    lastName: 'User',
  },
  adminUser: {
    email: 'admin@example.com',
    password: 'Admin123!',
    firstName: 'Admin',
    lastName: 'User',
  },
  newUser: {
    email: `new-user-${Date.now()}@example.com`,
    password: 'NewUser123!',
    firstName: 'New',
    lastName: 'User',
  },
  invalidUser: {
    email: 'invalid@example.com',
    password: 'WrongPassword!',
  },
};

export const testMeetings = {
  standardMeeting: {
    title: 'Team Standup Meeting',
    description: 'Daily standup with the engineering team',
    duration: 1800,
    participants: ['john@example.com', 'jane@example.com'],
  },
  clientMeeting: {
    title: 'Client Presentation',
    description: 'Q4 roadmap presentation for client',
    duration: 3600,
    participants: ['client@example.com', 'sales@example.com'],
  },
  oneonone: {
    title: '1:1 with Manager',
    description: 'Monthly 1:1 discussion',
    duration: 1800,
    participants: ['manager@example.com'],
  },
};

export const testIntegrations = {
  zoom: {
    name: 'Zoom',
    type: 'video_conferencing',
    credentials: {
      apiKey: 'test-zoom-api-key',
      apiSecret: 'test-zoom-api-secret',
    },
  },
  slack: {
    name: 'Slack',
    type: 'messaging',
    credentials: {
      token: 'xoxb-test-slack-token',
      channelId: 'C0123456789',
    },
  },
  calendar: {
    name: 'Google Calendar',
    type: 'calendar',
    credentials: {
      clientId: 'test-client-id',
      clientSecret: 'test-client-secret',
    },
  },
};

export const mockTranscript = {
  id: 'transcript-123',
  meetingId: 'meeting-123',
  segments: [
    {
      speaker: 'John Doe',
      text: 'Good morning everyone. Let\'s start with our standup.',
      timestamp: 0,
      duration: 3,
    },
    {
      speaker: 'Jane Smith',
      text: 'I completed the user authentication feature yesterday.',
      timestamp: 3,
      duration: 4,
    },
    {
      speaker: 'John Doe',
      text: 'Great work! Any blockers?',
      timestamp: 7,
      duration: 2,
    },
    {
      speaker: 'Jane Smith',
      text: 'No blockers at the moment.',
      timestamp: 9,
      duration: 2,
    },
  ],
  summary: {
    actionItems: [
      'Complete user authentication testing',
      'Deploy to staging environment',
      'Review PR #123',
    ],
    keyPoints: [
      'User authentication feature completed',
      'No current blockers',
      'On track for sprint goals',
    ],
    decisions: [
      'Approved deployment to staging',
      'Schedule code review for Friday',
    ],
  },
};

export const mockAnalytics = {
  overview: {
    totalMeetings: 156,
    totalHours: 234,
    averageDuration: 45,
    participantCount: 23,
  },
  charts: {
    meetingsOverTime: [
      { date: '2024-01-01', count: 12 },
      { date: '2024-01-02', count: 15 },
      { date: '2024-01-03', count: 10 },
      { date: '2024-01-04', count: 18 },
      { date: '2024-01-05', count: 14 },
    ],
    meetingsByType: [
      { type: 'Standup', count: 45 },
      { type: 'Client Meeting', count: 23 },
      { type: '1:1', count: 34 },
      { type: 'Team Sync', count: 54 },
    ],
  },
};

export const apiResponses = {
  loginSuccess: {
    statusCode: 200,
    body: {
      user: testUsers.validUser,
      accessToken: 'mock-access-token-123',
      refreshToken: 'mock-refresh-token-123',
    },
  },
  loginFailure: {
    statusCode: 401,
    body: {
      error: 'Invalid credentials',
      message: 'Email or password is incorrect',
    },
  },
  meetingsList: {
    statusCode: 200,
    body: {
      meetings: [
        {
          id: 'meeting-1',
          ...testMeetings.standardMeeting,
          status: 'completed',
          createdAt: '2024-01-01T10:00:00Z',
        },
        {
          id: 'meeting-2',
          ...testMeetings.clientMeeting,
          status: 'processing',
          createdAt: '2024-01-02T14:00:00Z',
        },
        {
          id: 'meeting-3',
          ...testMeetings.oneonone,
          status: 'completed',
          createdAt: '2024-01-03T16:00:00Z',
        },
      ],
      total: 3,
      page: 1,
      pageSize: 10,
    },
  },
  meetingCreate: {
    statusCode: 201,
    body: {
      id: 'new-meeting-123',
      status: 'pending',
      message: 'Meeting created successfully',
    },
  },
};

export const validationMessages = {
  email: {
    required: 'Email is required',
    invalid: 'Invalid email',
  },
  password: {
    required: 'Password is required',
    weak: 'Password must be',
    minLength: 'Password must be at least 8 characters',
  },
  meeting: {
    titleRequired: 'Title is required',
    fileRequired: 'Please upload a file',
    invalidFileType: 'Invalid file type',
  },
};

export const fileFixtures = {
  audioFile: 'sample-audio.mp3',
  videoFile: 'sample-video.mp4',
  largeFile: 'large-file.mp3',
  invalidFile: 'invalid-file.txt',
};

export default {
  testUsers,
  testMeetings,
  testIntegrations,
  mockTranscript,
  mockAnalytics,
  apiResponses,
  validationMessages,
  fileFixtures,
};
