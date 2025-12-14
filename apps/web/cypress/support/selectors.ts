/**
 * Centralized Selectors
 * Consistent selectors for all test files
 */

export const selectors = {
  // Authentication
  auth: {
    emailInput: 'input[name="email"]',
    passwordInput: 'input[name="password"]',
    firstNameInput: 'input[name="firstName"]',
    lastNameInput: 'input[name="lastName"]',
    rememberMeCheckbox: 'input[type="checkbox"]',
    submitButton: 'button[type="submit"]',
    loginButton: '[data-testid="login-button"]',
    registerButton: '[data-testid="register-button"]',
    logoutButton: '[data-testid="logout-button"]',
    forgotPasswordLink: '[data-testid="forgot-password-link"]',
    googleOAuthButton: '[data-testid="oauth-google"]',
    microsoftOAuthButton: '[data-testid="oauth-microsoft"]',
    errorMessage: '[data-testid="error-message"]',
    successMessage: '[data-testid="success-message"]',
  },

  // Navigation
  nav: {
    userMenu: '[data-testid="user-menu"]',
    dashboardLink: '[data-testid="nav-dashboard"]',
    meetingsLink: '[data-testid="nav-meetings"]',
    analyticsLink: '[data-testid="nav-analytics"]',
    integrationsLink: '[data-testid="nav-integrations"]',
    settingsLink: '[data-testid="nav-settings"]',
  },

  // Meetings
  meetings: {
    list: '[data-testid="meetings-list"]',
    card: '[data-testid="meeting-card"]',
    title: '[data-testid="meeting-title"]',
    description: '[data-testid="meeting-description"]',
    statusBadge: '[data-testid="status-badge"]',
    createButton: '[data-testid="create-meeting-button"]',
    uploadButton: '[data-testid="upload-button"]',
    deleteButton: '[data-testid="delete-button"]',
    editButton: '[data-testid="edit-button"]',
    searchInput: 'input[placeholder="Search meetings"]',
    statusFilter: '[data-testid="status-filter"]',
    dateFilter: '[data-testid="date-filter"]',
    sortDropdown: '[data-testid="sort-dropdown"]',
    emptyState: '[data-testid="empty-state"]',
    loadingSpinner: '[data-testid="loading-spinner"]',
    paginationNext: '[data-testid="pagination-next"]',
    paginationPrev: '[data-testid="pagination-prev"]',
  },

  // Meeting Form
  meetingForm: {
    form: '[data-testid="meeting-form"]',
    titleInput: 'input[name="title"]',
    descriptionInput: 'textarea[name="description"]',
    dateInput: 'input[name="scheduledAt"]',
    participantsInput: '[data-testid="participants-input"]',
    fileInput: 'input[type="file"]',
    submitButton: 'button[type="submit"]',
    cancelButton: '[data-testid="cancel-button"]',
    validationError: '[data-testid="validation-error"]',
  },

  // Meeting Details
  meetingDetails: {
    container: '[data-testid="meeting-details"]',
    title: '[data-testid="meeting-title"]',
    description: '[data-testid="meeting-description"]',
    participantsList: '[data-testid="participants-list"]',
    participant: '[data-testid="participant"]',

    // Tabs
    transcriptTab: '[data-testid="transcript-tab"]',
    summaryTab: '[data-testid="summary-tab"]',
    commentsTab: '[data-testid="comments-tab"]',
    insightsTab: '[data-testid="insights-tab"]',

    // Transcript
    transcriptContent: '[data-testid="transcript-content"]',
    transcriptSegment: '[data-testid="transcript-segment"]',
    speaker: '[data-testid="speaker"]',
    timestamp: '[data-testid="timestamp"]',

    // Summary
    summaryOverview: '[data-testid="summary-overview"]',
    actionItems: '[data-testid="action-items"]',
    actionItem: '[data-testid="action-item"]',
    keyPoints: '[data-testid="key-points"]',
    decisions: '[data-testid="decisions"]',

    // Comments
    commentsList: '[data-testid="comments-list"]',
    comment: '[data-testid="comment"]',
    commentInput: 'textarea[placeholder="Add a comment"]',
    addCommentButton: '[data-testid="add-comment-button"]',
    deleteCommentButton: '[data-testid="delete-comment-button"]',

    // Playback
    audioPlayer: '[data-testid="audio-player"]',
    playButton: '[data-testid="play-button"]',
    pauseButton: '[data-testid="pause-button"]',
    seekBar: '[data-testid="seek-bar"]',
    volumeControl: '[data-testid="volume-control"]',
  },

  // Dashboard
  dashboard: {
    container: '[data-testid="dashboard"]',
    welcomeMessage: '[data-testid="welcome-message"]',
    statsCard: '[data-testid="stats-card"]',
    recentMeetings: '[data-testid="recent-meetings"]',
    upcomingMeetings: '[data-testid="upcoming-meetings"]',
    quickActions: '[data-testid="quick-actions"]',
  },

  // Analytics
  analytics: {
    container: '[data-testid="analytics"]',
    overviewCard: '[data-testid="overview-card"]',
    totalMeetings: '[data-testid="total-meetings"]',
    totalHours: '[data-testid="total-hours"]',
    avgDuration: '[data-testid="avg-duration"]',
    participantCount: '[data-testid="participant-count"]',

    // Charts
    chartContainer: '[data-testid="chart-container"]',
    lineChart: '[data-testid="line-chart"]',
    barChart: '[data-testid="bar-chart"]',
    pieChart: '[data-testid="pie-chart"]',

    // Filters
    dateRangeFilter: '[data-testid="date-range-filter"]',
    teamFilter: '[data-testid="team-filter"]',
    typeFilter: '[data-testid="type-filter"]',
    exportButton: '[data-testid="export-button"]',
  },

  // Integrations
  integrations: {
    container: '[data-testid="integrations"]',
    integrationCard: '[data-testid="integration-card"]',
    integrationName: '[data-testid="integration-name"]',
    integrationStatus: '[data-testid="integration-status"]',
    connectButton: '[data-testid="connect-button"]',
    disconnectButton: '[data-testid="disconnect-button"]',
    configureButton: '[data-testid="configure-button"]',
    testButton: '[data-testid="test-button"]',
    apiKeyInput: 'input[name="apiKey"]',
    apiSecretInput: 'input[name="apiSecret"]',
    saveButton: '[data-testid="save-button"]',
  },

  // Settings
  settings: {
    container: '[data-testid="settings"]',
    profileTab: '[data-testid="profile-tab"]',
    securityTab: '[data-testid="security-tab"]',
    notificationsTab: '[data-testid="notifications-tab"]',
    billingTab: '[data-testid="billing-tab"]',

    // Profile
    displayNameInput: 'input[name="displayName"]',
    emailInput: 'input[name="email"]',
    avatarUpload: '[data-testid="avatar-upload"]',

    // Security
    currentPasswordInput: 'input[name="currentPassword"]',
    newPasswordInput: 'input[name="newPassword"]',
    confirmPasswordInput: 'input[name="confirmPassword"]',
    twoFactorToggle: '[data-testid="2fa-toggle"]',

    // Notifications
    emailNotifications: '[data-testid="email-notifications"]',
    pushNotifications: '[data-testid="push-notifications"]',
    slackNotifications: '[data-testid="slack-notifications"]',
  },

  // Common UI Elements
  common: {
    toast: '[data-testid="toast"]',
    modal: '[data-testid="modal"]',
    modalClose: '[data-testid="modal-close"]',
    confirmButton: '[data-testid="confirm-button"]',
    cancelButton: '[data-testid="cancel-button"]',
    loadingOverlay: '[data-testid="loading-overlay"]',
    errorBoundary: '[data-testid="error-boundary"]',
    notFoundPage: '[data-testid="not-found"]',
  },
};

export default selectors;
