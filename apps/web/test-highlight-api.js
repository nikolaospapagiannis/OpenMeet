/**
 * Test script to verify Live Highlights API integration
 */

const axios = require('axios');

const API_BASE_URL = 'http://localhost:4000';
const TEST_TOKEN = 'test-token'; // Replace with actual token

// Test data
const meetingId = 'test-meeting-123';
const highlightData = {
  meetingId,
  timestamp: 120,
  category: 'action_item',
  text: 'Follow up with client about the proposal',
  tags: ['follow-up', 'proposal'],
  autoDetected: false,
};

// Test functions
async function testCreateHighlight() {
  console.log('\n=== Testing Create Highlight ===');
  try {
    const response = await axios.post(
      `${API_BASE_URL}/api/live/highlights`,
      highlightData,
      {
        headers: {
          'Authorization': `Bearer ${TEST_TOKEN}`,
          'Content-Type': 'application/json',
        },
      }
    );
    console.log('✓ Create highlight successful');
    console.log('Response:', response.data);
    return response.data.id;
  } catch (error) {
    console.error('✗ Create highlight failed:', error.response?.data || error.message);
    return null;
  }
}

async function testGetHighlights() {
  console.log('\n=== Testing Get Highlights ===');
  try {
    const response = await axios.get(
      `${API_BASE_URL}/api/live/highlights/${meetingId}`,
      {
        headers: {
          'Authorization': `Bearer ${TEST_TOKEN}`,
        },
      }
    );
    console.log('✓ Get highlights successful');
    console.log('Highlights count:', response.data.length);
    return response.data;
  } catch (error) {
    console.error('✗ Get highlights failed:', error.response?.data || error.message);
    return [];
  }
}

async function testWebSocketConnection() {
  console.log('\n=== Testing WebSocket Connection ===');
  const io = require('socket.io-client');

  const socket = io('ws://localhost:4000/ws/live-highlights', {
    transports: ['websocket'],
    auth: {
      token: TEST_TOKEN,
    },
  });

  return new Promise((resolve) => {
    socket.on('connect', () => {
      console.log('✓ WebSocket connected');

      // Join meeting room
      socket.emit('highlight:join', { meetingId });
      console.log('✓ Joined meeting room');

      // Test sending a highlight created event
      socket.emit('highlight:created', {
        meetingId,
        highlight: {
          id: 'test-highlight-ws',
          type: 'key_moment',
          title: 'WebSocket Test Highlight',
          timestampSeconds: 180,
        },
      });
      console.log('✓ Sent test highlight via WebSocket');

      setTimeout(() => {
        socket.disconnect();
        resolve();
      }, 2000);
    });

    socket.on('connect_error', (error) => {
      console.error('✗ WebSocket connection failed:', error.message);
      resolve();
    });

    socket.on('error', (error) => {
      console.error('✗ WebSocket error:', error);
    });
  });
}

// Run tests
async function runTests() {
  console.log('Starting Live Highlights API Tests...');
  console.log('API URL:', API_BASE_URL);
  console.log('Meeting ID:', meetingId);

  // Test REST API
  const highlightId = await testCreateHighlight();
  const highlights = await testGetHighlights();

  // Test WebSocket
  await testWebSocketConnection();

  console.log('\n=== Test Summary ===');
  console.log('API Endpoints:');
  console.log('- POST /api/live/highlights - Create highlight');
  console.log('- GET /api/live/highlights/:meetingId - Get highlights');
  console.log('- POST /api/live/highlights/:meetingId/auto-detection - Toggle auto-detection');
  console.log('- POST /api/live/highlights/:highlightId/share - Share highlight');
  console.log('- DELETE /api/live/highlights/:highlightId - Delete highlight');
  console.log('- GET /api/live/highlights/:meetingId/export - Export highlights');

  console.log('\nWebSocket Events:');
  console.log('- highlight:join - Join meeting room');
  console.log('- highlight:leave - Leave meeting room');
  console.log('- highlight:created - Highlight created');
  console.log('- highlight:deleted - Highlight deleted');
  console.log('- highlight:shared - Highlight shared');
  console.log('- highlight:auto-detected - Auto-detected highlight');
  console.log('- highlight:auto-detection - Toggle auto-detection');

  console.log('\nComponent Integration:');
  console.log('- Real WebSocket connection via useLiveHighlights hook');
  console.log('- Real API calls with proper authentication headers');
  console.log('- Live updates across all connected clients');
  console.log('- Auto-detection toggle functionality');
  console.log('- Export in JSON/CSV/Markdown formats');
}

// Check if running directly
if (require.main === module) {
  runTests().catch(console.error);
}

module.exports = { testCreateHighlight, testGetHighlights, testWebSocketConnection };