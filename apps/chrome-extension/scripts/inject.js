/**
 * Injected Script
 * This script runs in the page context (not extension context)
 * Used to access page-level APIs that content scripts cannot access
 */

(function() {
  'use strict';

  console.log('[OpenMeet] Inject script loaded');

  // This script can access page context variables and functions
  // that are not accessible from content scripts

  // Example: Access to page's JavaScript objects
  // const pageAPI = window.somePageAPI;

  // Communicate with content script via custom events
  window.addEventListener('openmeet-page-event', (event) => {
    // Handle events from page
    console.log('[OpenMeet] Page event received', event.detail);
  });

  // Send messages to content script
  function sendToContentScript(data) {
    window.postMessage({
      type: 'openmeet-inject',
      data: data
    }, '*');
  }

  // Example: Monitor page state changes
  // This is useful for platforms that load meeting info dynamically

})();
