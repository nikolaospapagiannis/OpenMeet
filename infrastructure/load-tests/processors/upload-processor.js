/**
 * Artillery Processor - Upload Operations
 * Handles file upload simulation and validation
 */

const fs = require('fs');
const path = require('path');

module.exports = {
  /**
   * Prepare upload data
   */
  prepareUpload: function(context, events, done) {
    // Generate random meeting data
    const meetingId = `meeting-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;
    context.vars.meetingId = meetingId;
    context.vars.uploadTimestamp = new Date().toISOString();

    // Simulate different file sizes
    const fileSizes = ['small', 'medium', 'large'];
    context.vars.fileSize = fileSizes[Math.floor(Math.random() * fileSizes.length)];

    return done();
  },

  /**
   * Validate upload response
   */
  validateUpload: function(requestParams, response, context, ee, next) {
    if (response.statusCode === 200 || response.statusCode === 201) {
      try {
        const body = JSON.parse(response.body);

        if (body.meetingId || body.id) {
          ee.emit('counter', 'upload.success', 1);

          // Track upload size
          const contentLength = parseInt(response.headers['content-length'] || '0');
          ee.emit('histogram', 'upload.size', contentLength);
        }
      } catch (e) {
        ee.emit('counter', 'upload.parse_error', 1);
      }
    } else if (response.statusCode === 413) {
      ee.emit('counter', 'upload.too_large', 1);
    } else if (response.statusCode >= 500) {
      ee.emit('counter', 'upload.server_error', 1);
    }

    return next();
  },

  /**
   * Track upload progress
   */
  trackProgress: function(requestParams, response, context, ee, next) {
    const latency = response.timings?.total || 0;

    // Categorize upload speeds
    if (latency < 1000) {
      ee.emit('counter', 'upload.fast', 1);
    } else if (latency < 5000) {
      ee.emit('counter', 'upload.medium', 1);
    } else {
      ee.emit('counter', 'upload.slow', 1);
    }

    return next();
  },

  /**
   * Generate meeting metadata
   */
  generateMetadata: function(context, events, done) {
    const titles = [
      'Sales Call',
      'Team Standup',
      'Client Meeting',
      'Product Review',
      'Strategy Session',
      'All Hands',
      'Sprint Planning'
    ];

    const participants = Math.floor(Math.random() * 10) + 2;
    const duration = (Math.floor(Math.random() * 60) + 15) * 60; // 15-75 minutes

    context.vars.meetingTitle = titles[Math.floor(Math.random() * titles.length)];
    context.vars.participantCount = participants;
    context.vars.meetingDuration = duration;

    return done();
  }
};
