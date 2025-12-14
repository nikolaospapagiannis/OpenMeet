/**
 * Artillery Processor - WebSocket Operations
 * Handles Socket.IO event processing and real-time metrics
 */

module.exports = {
  /**
   * Setup WebSocket connection tracking
   */
  setupWebSocket: function(context, events, done) {
    context.vars.connectionId = `ws-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;
    context.vars.connectionStart = Date.now();

    return done();
  },

  /**
   * Track WebSocket events
   */
  trackWebSocketEvent: function(eventName, context, ee) {
    ee.emit('counter', `websocket.event.${eventName}`, 1);

    // Track event timing
    const now = Date.now();
    const elapsed = now - (context.vars.lastEventTime || now);
    context.vars.lastEventTime = now;

    ee.emit('histogram', 'websocket.event_interval', elapsed);
  },

  /**
   * Validate transcription update
   */
  validateTranscription: function(data, context, ee, next) {
    if (data && data.text) {
      ee.emit('counter', 'websocket.transcription.valid', 1);

      // Track transcription length
      ee.emit('histogram', 'websocket.transcription.length', data.text.length);
    } else {
      ee.emit('counter', 'websocket.transcription.invalid', 1);
    }

    return next();
  },

  /**
   * Generate realistic WebSocket messages
   */
  generateMessage: function(context, events, done) {
    const messageTypes = [
      'transcription-update',
      'highlight-created',
      'note-added',
      'reaction-sent',
      'user-joined',
      'user-left',
      'recording-started',
      'recording-stopped'
    ];

    context.vars.messageType = messageTypes[Math.floor(Math.random() * messageTypes.length)];
    context.vars.messagePayload = {
      timestamp: Date.now(),
      userId: `user-${Math.floor(Math.random() * 100)}`,
      meetingId: `meeting-${Math.floor(Math.random() * 50)}`
    };

    return done();
  },

  /**
   * Track connection stability
   */
  trackConnectionStability: function(context, events, done) {
    const connectionDuration = Date.now() - context.vars.connectionStart;

    if (connectionDuration > 60000) { // > 1 minute
      events.emit('counter', 'websocket.stable_connection', 1);
    }

    events.emit('histogram', 'websocket.connection_duration', connectionDuration);

    return done();
  },

  /**
   * Handle disconnection
   */
  handleDisconnect: function(context, ee, done) {
    const connectionDuration = Date.now() - context.vars.connectionStart;

    ee.emit('histogram', 'websocket.session_length', connectionDuration);
    ee.emit('counter', 'websocket.disconnected', 1);

    return done();
  },

  /**
   * Monitor message latency
   */
  measureMessageLatency: function(sendTime, receiveTime, ee) {
    const latency = receiveTime - sendTime;

    ee.emit('histogram', 'websocket.message_latency', latency);

    if (latency < 10) {
      ee.emit('counter', 'websocket.latency.excellent', 1);
    } else if (latency < 50) {
      ee.emit('counter', 'websocket.latency.good', 1);
    } else if (latency < 100) {
      ee.emit('counter', 'websocket.latency.acceptable', 1);
    } else {
      ee.emit('counter', 'websocket.latency.poor', 1);
    }
  }
};
