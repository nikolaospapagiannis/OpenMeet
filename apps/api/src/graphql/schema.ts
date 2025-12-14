/**
 * GraphQL Schema Type Definitions
 * Complete schema for OpenMeet
 */

import { gql } from 'apollo-server-express';

export const typeDefs = gql`
  scalar DateTime
  scalar JSON

  type Query {
    # Health check
    health: HealthStatus!

    # Authentication
    me: User!

    # Organizations
    organization(id: ID!): Organization
    organizations: [Organization!]!

    # Meetings
    meeting(id: ID!): Meeting
    meetings(
      page: Int
      limit: Int
      status: MeetingStatus
      workspaceId: ID
      search: String
      startDate: DateTime
      endDate: DateTime
      sortBy: String
      sortOrder: SortOrder
    ): MeetingConnection!

    # Transcriptions
    transcript(id: ID!): Transcript
    transcriptsByMeeting(meetingId: ID!): [Transcript!]!

    # Analytics
    dashboardAnalytics(
      period: AnalyticsPeriod
      startDate: DateTime
      endDate: DateTime
    ): DashboardAnalytics!

    meetingAnalytics(startDate: DateTime, endDate: DateTime): MeetingAnalytics!
    speakerAnalytics(email: String!, startDate: DateTime, endDate: DateTime): SpeakerAnalytics!

    # Integrations
    integration(id: ID!): Integration
    integrations: [Integration!]!

    # Webhooks
    webhook(id: ID!): Webhook
    webhooks: [Webhook!]!
    webhookEvents: [WebhookEvent!]!

    # Billing
    subscription: Subscription
    subscriptionPlans: [SubscriptionPlan!]!
    usage(startDate: DateTime, endDate: DateTime): UsageData!

    # Intelligence (Multi-Meeting AI)
    crossMeetingSearch(input: CrossMeetingSearchInput!): CrossMeetingSearchResult!
    meetingInsights(
      startDate: DateTime
      endDate: DateTime
      period: InsightsPeriod
    ): MeetingInsights!
    correlatedMeetings(meetingId: ID!, limit: Int): [CorrelatedMeeting!]!
  }

  type Mutation {
    # Authentication
    register(input: RegisterInput!): AuthPayload!
    login(input: LoginInput!): AuthPayload!
    logout: Boolean!
    refreshToken: AuthPayload!

    # Meetings
    createMeeting(input: CreateMeetingInput!): Meeting!
    updateMeeting(id: ID!, input: UpdateMeetingInput!): Meeting!
    deleteMeeting(id: ID!): Boolean!
    startMeeting(id: ID!): Meeting!
    completeMeeting(id: ID!): Meeting!

    # Transcriptions
    createTranscript(input: CreateTranscriptInput!): Transcript!
    updateTranscript(id: ID!, input: UpdateTranscriptInput!): Transcript!
    deleteTranscript(id: ID!): Boolean!

    # Organizations
    createOrganization(input: CreateOrganizationInput!): Organization!
    updateOrganization(id: ID!, input: UpdateOrganizationInput!): Organization!
    deleteOrganization(id: ID!): Boolean!
    inviteMember(organizationId: ID!, input: InviteMemberInput!): User!
    updateMemberRole(organizationId: ID!, memberId: ID!, role: UserRole!): User!
    removeMember(organizationId: ID!, memberId: ID!): Boolean!

    # Integrations
    deleteIntegration(id: ID!): Boolean!
    updateIntegration(id: ID!, input: UpdateIntegrationInput!): Integration!
    syncIntegration(id: ID!): SyncResult!

    # Webhooks
    createWebhook(input: CreateWebhookInput!): Webhook!
    updateWebhook(id: ID!, input: UpdateWebhookInput!): Webhook!
    deleteWebhook(id: ID!): Boolean!
    testWebhook(id: ID!): WebhookTestResult!
    regenerateWebhookSecret(id: ID!): WebhookSecret!

    # Billing
    createSubscription(input: CreateSubscriptionInput!): SubscriptionResult!
    cancelSubscription: Boolean!
    resumeSubscription: Boolean!
    addPaymentMethod(paymentMethodId: String!): PaymentMethod!
    removePaymentMethod(id: String!): Boolean!

    # Comments
    createComment(input: CreateCommentInput!): Comment!
    updateComment(id: ID!, content: String!): Comment!
    deleteComment(id: ID!): Boolean!
    resolveComment(id: ID!): Comment!

    # Soundbites
    createSoundbite(input: CreateSoundbiteInput!): Soundbite!
    updateSoundbite(id: ID!, input: UpdateSoundbiteInput!): Soundbite!
    deleteSoundbite(id: ID!): Boolean!

    # Intelligence (Multi-Meeting AI)
    askQuestion(input: AskQuestionInput!): AIAnswer!
    generateSuperSummary(input: SuperSummaryInput!): SuperSummary!
  }

  type Subscription {
    meetingUpdated(meetingId: ID!): Meeting!
    transcriptUpdated(meetingId: ID!): Transcript!
    commentAdded(meetingId: ID!): Comment!

    # Live Features Subscriptions
    liveTranscript(liveSessionId: ID!): LiveTranscriptSegment!
    liveBookmark(liveSessionId: ID!): LiveBookmark!
    liveInsight(liveSessionId: ID!): LiveInsight!
    liveReaction(liveSessionId: ID!): LiveReaction!
    liveParticipantJoined(meetingId: ID!): LiveParticipant!
    liveParticipantLeft(meetingId: ID!): LiveParticipant!
  }

  # Types
  type HealthStatus {
    status: String!
    timestamp: DateTime!
    services: ServiceStatus!
    version: String!
  }

  type ServiceStatus {
    database: String!
    redis: String!
    transcripts: String!
    elasticsearch: String!
  }

  type User {
    id: ID!
    email: String!
    firstName: String
    lastName: String
    avatarUrl: String
    role: UserRole!
    isActive: Boolean!
    lastLoginAt: DateTime
    organizationId: ID
    organization: Organization
    createdAt: DateTime!
    updatedAt: DateTime!
  }

  type Organization {
    id: ID!
    name: String!
    slug: String!
    domain: String
    logoUrl: String
    subscriptionTier: SubscriptionTier!
    subscriptionStatus: SubscriptionStatus!
    subscriptionExpiresAt: DateTime
    settings: JSON
    users: [User!]!
    workspaces: [Workspace!]!
    meetingCount: Int!
    integrationCount: Int!
    createdAt: DateTime!
    updatedAt: DateTime!
  }

  type Workspace {
    id: ID!
    name: String!
    description: String
    isDefault: Boolean!
    organizationId: ID!
    organization: Organization!
    meetings: [Meeting!]!
    memberCount: Int!
    createdAt: DateTime!
    updatedAt: DateTime!
  }

  type Meeting {
    id: ID!
    title: String!
    description: String
    status: MeetingStatus!
    scheduledStartAt: DateTime
    scheduledEndAt: DateTime
    actualStartAt: DateTime
    actualEndAt: DateTime
    durationSeconds: Int
    recordingSource: RecordingSource
    meetingUrl: String
    platform: String
    hostEmail: String
    participantCount: Int!
    organizationId: ID!
    organization: Organization!
    userId: ID!
    user: User!
    workspaceId: ID
    workspace: Workspace
    participants: [MeetingParticipant!]!
    recordings: [MeetingRecording!]!
    transcripts: [Transcript!]!
    summaries: [MeetingSummary!]!
    analytics: MeetingAnalyticsData
    comments: [Comment!]!
    soundbites: [Soundbite!]!
    createdAt: DateTime!
    updatedAt: DateTime!
  }

  type MeetingParticipant {
    id: ID!
    name: String
    email: String
    role: String!
    joinedAt: DateTime
    leftAt: DateTime
    talkTimeSeconds: Int!
    meetingId: ID!
    meeting: Meeting!
  }

  type MeetingRecording {
    id: ID!
    fileUrl: String!
    fileSizeBytes: String
    durationSeconds: Int
    format: String
    quality: String
    isVideo: Boolean!
    transcriptionStatus: String!
    meetingId: ID!
    createdAt: DateTime!
  }

  type Transcript {
    id: ID!
    language: String!
    wordCount: Int
    confidenceScore: Float
    isFinal: Boolean!
    meetingId: ID!
    meeting: Meeting!
    segments: [TranscriptSegment!]
    createdAt: DateTime!
    updatedAt: DateTime!
  }

  type TranscriptSegment {
    speaker: String!
    text: String!
    startTime: Float!
    endTime: Float!
    confidence: Float!
  }

  type MeetingSummary {
    id: ID!
    summaryType: String!
    title: String
    overview: String
    keyPoints: JSON!
    actionItems: JSON!
    decisions: JSON!
    questions: JSON!
    aiModel: String
    meetingId: ID!
    meeting: Meeting!
    createdAt: DateTime!
    updatedAt: DateTime!
  }

  type MeetingAnalyticsData {
    id: ID!
    talkTimeDistribution: JSON
    sentimentScores: JSON
    engagementScore: Float
    interruptionCount: Int!
    questionCount: Int!
    paceWpmAverage: Int
    topics: JSON!
    keywords: JSON!
  }

  type Comment {
    id: ID!
    content: String!
    timestampSeconds: Int
    isResolved: Boolean!
    resolvedAt: DateTime
    meetingId: ID!
    meeting: Meeting!
    userId: ID!
    user: User!
    parentCommentId: ID
    parentComment: Comment
    replies: [Comment!]!
    createdAt: DateTime!
    updatedAt: DateTime!
  }

  type Soundbite {
    id: ID!
    title: String
    startTimeSeconds: Int!
    endTimeSeconds: Int!
    transcriptSegment: String
    shareToken: String
    viewCount: Int!
    isPublic: Boolean!
    meetingId: ID!
    meeting: Meeting!
    userId: ID!
    user: User!
    createdAt: DateTime!
  }

  type Integration {
    id: ID!
    type: IntegrationType!
    name: String!
    isActive: Boolean!
    expiresAt: DateTime
    organizationId: ID!
    userId: ID
    user: User
    createdAt: DateTime!
    updatedAt: DateTime!
  }

  type Webhook {
    id: ID!
    url: String!
    events: [String!]!
    isActive: Boolean!
    lastTriggeredAt: DateTime
    failureCount: Int!
    organizationId: ID!
    createdAt: DateTime!
    updatedAt: DateTime!
  }

  type WebhookEvent {
    name: String!
    description: String!
  }

  type WebhookTestResult {
    success: Boolean!
    status: Int
    message: String!
  }

  type WebhookSecret {
    secret: String!
  }

  type Subscription {
    tier: SubscriptionTier!
    status: SubscriptionStatus!
    expiresAt: DateTime
    isActive: Boolean!
  }

  type SubscriptionPlan {
    id: String!
    name: String!
    price: Float!
    priceAnnual: Float
    interval: String!
    features: [String!]!
  }

  type SubscriptionResult {
    subscription: JSON!
  }

  type UsageData {
    period: DateRange!
    metrics: UsageMetrics!
  }

  type DateRange {
    start: DateTime!
    end: DateTime!
  }

  type UsageMetrics {
    totalMeetings: Int!
    transcriptionMinutes: Int!
    storageGB: Float!
    activeUsers: Int!
  }

  type PaymentMethod {
    id: String!
    brand: String!
    last4: String!
    expiryMonth: Int!
    expiryYear: Int!
  }

  type DashboardAnalytics {
    period: DateRange!
    overview: OverviewMetrics!
    trends: TrendData!
    topParticipants: [ParticipantMetrics!]!
  }

  type OverviewMetrics {
    totalMeetings: Int!
    completedMeetings: Int!
    totalDurationMinutes: Int!
    totalTranscripts: Int!
    totalSummaries: Int!
    totalComments: Int!
    activeUsers: Int!
    averageMeetingDuration: Int!
  }

  type TrendData {
    meetingsByDay: [DayCount!]!
  }

  type DayCount {
    date: String!
    count: Int!
  }

  type ParticipantMetrics {
    email: String!
    meetingCount: Int!
    totalTalkTimeMinutes: Int!
  }

  type MeetingAnalytics {
    period: DateRange!
    byStatus: [StatusCount!]!
    byPlatform: [PlatformCount!]!
    averageParticipants: Int!
  }

  type StatusCount {
    status: MeetingStatus!
    count: Int!
  }

  type PlatformCount {
    platform: String!
    count: Int!
  }

  type SpeakerAnalytics {
    period: DateRange!
    email: String!
    statistics: SpeakerStatistics!
    recentMeetings: [SpeakerMeetingData!]!
  }

  type SpeakerStatistics {
    meetingsAttended: Int!
    totalTalkTimeMinutes: Int!
    averageTalkTimeMinutes: Int!
  }

  type SpeakerMeetingData {
    meetingId: ID!
    title: String!
    date: DateTime
    talkTimeMinutes: Int!
    talkTimePercentage: String!
  }

  type SyncResult {
    message: String!
    jobId: String!
  }

  type MeetingConnection {
    data: [Meeting!]!
    total: Int!
    page: Int!
    limit: Int!
    totalPages: Int!
  }

  type AuthPayload {
    accessToken: String!
    refreshToken: String!
    user: User!
  }

  # Inputs
  input RegisterInput {
    email: String!
    password: String!
    firstName: String!
    lastName: String!
    organizationName: String
  }

  input LoginInput {
    email: String!
    password: String!
  }

  input CreateMeetingInput {
    title: String!
    description: String
    scheduledStartAt: DateTime
    scheduledEndAt: DateTime
    workspaceId: ID
    platform: String
    meetingUrl: String
    recordingSource: RecordingSource
    participants: [ParticipantInput!]
  }

  input ParticipantInput {
    email: String!
    name: String
    role: String
  }

  input UpdateMeetingInput {
    title: String
    description: String
    status: MeetingStatus
    scheduledStartAt: DateTime
    scheduledEndAt: DateTime
    actualStartAt: DateTime
    actualEndAt: DateTime
  }

  input CreateTranscriptInput {
    meetingId: ID!
    recordingId: ID
    language: String
    segments: [TranscriptSegmentInput!]!
  }

  input TranscriptSegmentInput {
    speaker: String!
    text: String!
    startTime: Float!
    endTime: Float!
    confidence: Float!
  }

  input UpdateTranscriptInput {
    isFinal: Boolean
    language: String
  }

  input CreateOrganizationInput {
    name: String!
    slug: String
    domain: String
    subscriptionTier: SubscriptionTier
  }

  input UpdateOrganizationInput {
    name: String
    domain: String
    logoUrl: String
    subscriptionTier: SubscriptionTier
    subscriptionStatus: SubscriptionStatus
    settings: JSON
  }

  input InviteMemberInput {
    email: String!
    role: UserRole
  }

  input UpdateIntegrationInput {
    isActive: Boolean
    settings: JSON
  }

  input CreateWebhookInput {
    url: String!
    events: [String!]!
    secret: String
  }

  input UpdateWebhookInput {
    url: String
    events: [String!]
    isActive: Boolean
  }

  input CreateSubscriptionInput {
    tier: SubscriptionTier!
    paymentMethodId: String
    billingEmail: String
  }

  input CreateCommentInput {
    meetingId: ID!
    content: String!
    timestampSeconds: Int
    parentCommentId: ID
  }

  input CreateSoundbiteInput {
    meetingId: ID!
    title: String
    startTimeSeconds: Int!
    endTimeSeconds: Int!
    isPublic: Boolean
  }

  input UpdateSoundbiteInput {
    title: String
    isPublic: Boolean
  }

  # Enums
  enum UserRole {
    user
    admin
    super_admin
  }

  enum SubscriptionTier {
    free
    pro
    business
    enterprise
  }

  enum SubscriptionStatus {
    active
    canceled
    past_due
    trialing
  }

  enum MeetingStatus {
    scheduled
    in_progress
    completed
    cancelled
    failed
    processing
  }

  enum RecordingSource {
    bot
    extension
    upload
    api
    mobile
  }

  enum IntegrationType {
    zoom
    teams
    google
    google_meet
    outlook
    meet
    webex
    slack
    salesforce
    hubspot
    google_calendar
  }

  enum AnalyticsPeriod {
    day
    week
    month
    thirty_days
    ninety_days
  }

  enum SortOrder {
    asc
    desc
  }

  enum InsightsPeriod {
    week
    month
    quarter
    year
  }

  # Intelligence Types
  type CrossMeetingSearchResult {
    query: String!
    totalResults: Int!
    results: [SearchResult!]!
  }

  type SearchResult {
    type: SearchResultType!
    meetingId: String
    transcriptId: String
    speaker: String
    text: String
    startTime: Float
    endTime: Float
    highlights: [String!]
    score: Float!
    meeting: MeetingRef
  }

  type MeetingRef {
    id: ID!
    title: String!
    scheduledAt: DateTime!
    platform: IntegrationType!
  }

  enum SearchResultType {
    transcript
    meeting
  }

  type AIAnswer {
    question: String!
    answer: String!
    sources: [MeetingSource!]!
    conversationId: String!
    confidence: Float!
  }

  type MeetingSource {
    meetingId: ID!
    meetingTitle: String!
    meetingDate: DateTime!
  }

  type SuperSummary {
    title: String!
    timeRange: TimeRange!
    meetingCount: Int!
    totalDuration: Int!
    summary: String!
    keyThemes: [String!]!
    recurringTopics: [RecurringTopic!]!
    actionItems: ActionItemsSummary!
    decisions: [String!]!
    insights: [String!]!
    recommendations: [String!]!
    meetings: [MeetingRef!]!
    generatedAt: DateTime!
  }

  type TimeRange {
    start: DateTime!
    end: DateTime!
  }

  type RecurringTopic {
    topic: String!
    frequency: Int!
    meetings: [String!]
  }

  type ActionItemsSummary {
    total: Int!
    completed: Int!
    pending: Int!
    overdue: Int!
    byOwner: JSON
  }

  type MeetingInsights {
    period: TimeRange!
    meetingCount: Int!
    totalDuration: Int!
    averageDuration: Int!
    averageMeetingsPerDay: Float!
    recurringTopics: [RecurringTopic!]!
    actionItems: ActionItemsInsight!
    topParticipants: [ParticipantStat!]!
    meetingsByPlatform: JSON!
    trends: Trends!
  }

  type ActionItemsInsight {
    total: Int!
    byOwner: JSON!
    completionRate: Int!
  }

  type ParticipantStat {
    email: String!
    name: String
    meetingCount: Int!
    totalTalkTime: Int!
  }

  type Trends {
    meetingsOverTime: [MeetingTrend!]!
  }

  type MeetingTrend {
    date: String!
    count: Int!
  }

  type CorrelatedMeeting {
    meeting: MeetingRef!
    correlationScore: Float!
    reasons: CorrelationReasons!
  }

  type CorrelationReasons {
    sharedTopics: [String!]!
    sharedParticipants: [String!]!
    timeDifferenceHours: Int!
  }

  # Intelligence Inputs
  input CrossMeetingSearchInput {
    query: String!
    meetingIds: [ID!]
    startDate: DateTime
    endDate: DateTime
    speakers: [String!]
    limit: Int
  }

  input AskQuestionInput {
    question: String!
    meetingIds: [ID!]
    conversationHistory: [ConversationMessage!]
  }

  input ConversationMessage {
    role: String!
    content: String!
  }

  input SuperSummaryInput {
    meetingIds: [ID!]!
    title: String
    timeRange: String
  }

  # ===========================
  # Video Intelligence Types (GAP #3 - Otter Competitor)
  # ===========================

  enum VideoProcessingStatus {
    pending
    processing
    completed
    failed
  }

  enum HighlightType {
    important_decision
    action_item
    question_answer
    key_moment
    screen_share
    custom
  }

  type Video {
    id: ID!
    meetingId: ID
    meeting: Meeting
    recordingId: ID
    recording: MeetingRecording
    organizationId: ID!
    userId: ID!
    s3Key: String!
    s3Bucket: String!
    fileUrl: String!
    thumbnailUrl: String
    fileName: String!
    fileSizeBytes: String!
    durationSeconds: Int
    width: Int
    height: Int
    fps: Int
    codec: String
    format: String
    bitrate: String
    processingStatus: VideoProcessingStatus!
    processingProgress: Int!
    processingError: String
    audioExtracted: Boolean!
    audioS3Key: String
    thumbnailsGenerated: Boolean!
    thumbnailS3Keys: [String!]!
    transcriptId: String
    metadata: JSON
    clips: [VideoClip!]!
    highlights: [VideoHighlight!]!
    screenShares: [VideoScreenShare!]!
    createdAt: DateTime!
    updatedAt: DateTime!
  }

  type VideoClip {
    id: ID!
    videoId: ID!
    video: Video!
    userId: ID!
    title: String
    description: String
    startTimeSeconds: Int!
    endTimeSeconds: Int!
    s3Key: String
    fileUrl: String
    thumbnailUrl: String
    shareToken: String
    isPublic: Boolean!
    viewCount: Int!
    downloadCount: Int!
    transcriptSegment: String
    metadata: JSON
    createdAt: DateTime!
    updatedAt: DateTime!
  }

  type VideoHighlight {
    id: ID!
    videoId: ID!
    video: Video!
    highlightType: HighlightType!
    title: String
    description: String
    startTimeSeconds: Int!
    endTimeSeconds: Int!
    confidence: Float!
    thumbnailUrl: String
    transcriptText: String
    aiDetected: Boolean!
    aiModel: String
    metadata: JSON
    createdAt: DateTime!
    updatedAt: DateTime!
  }

  type VideoScreenShare {
    id: ID!
    videoId: ID!
    video: Video!
    startTimeSeconds: Int!
    endTimeSeconds: Int!
    thumbnailUrl: String
    ocrText: String
    contentType: String
    confidence: Float!
    metadata: JSON
    createdAt: DateTime!
    updatedAt: DateTime!
  }

  type VideoPlaybackData {
    videoUrl: String!
    thumbnailUrl: String
    durationSeconds: Int
    width: Int
    height: Int
    transcriptSegments: [TranscriptSegment!]!
    subtitleUrl: String
    highlights: [VideoHighlight!]!
  }

  type VideoProcessingResult {
    videoId: ID!
    status: VideoProcessingStatus!
    progress: Int!
    message: String
  }

  # Video Queries
  extend type Query {
    video(id: ID!): Video
    videos(
      meetingId: ID
      page: Int
      limit: Int
      status: VideoProcessingStatus
    ): VideoConnection!
    videoPlayback(id: ID!): VideoPlaybackData!
    videoClips(videoId: ID!): [VideoClip!]!
  }

  # Video Mutations
  extend type Mutation {
    uploadVideo(input: UploadVideoInput!): Video!
    processVideo(input: ProcessVideoInput!): VideoProcessingResult!
    deleteVideo(id: ID!): Boolean!

    createVideoClip(input: CreateVideoClipInput!): VideoClip!
    deleteVideoClip(id: ID!): Boolean!

    generateVideoHighlights(input: GenerateHighlightsInput!): VideoHighlightsResult!
    analyzeScreenShares(videoId: ID!): ScreenShareAnalysisResult!
  }

  type VideoConnection {
    data: [Video!]!
    total: Int!
    page: Int!
    limit: Int!
    totalPages: Int!
  }

  type VideoHighlightsResult {
    videoId: ID!
    highlights: [VideoHighlight!]!
    count: Int!
  }

  type ScreenShareAnalysisResult {
    videoId: ID!
    screenShares: [VideoScreenShare!]!
    count: Int!
  }

  # Video Inputs
  input UploadVideoInput {
    meetingId: ID
    recordingId: ID
    title: String
  }

  input ProcessVideoInput {
    videoId: ID!
    extractAudio: Boolean
    generateThumbnails: Boolean
    thumbnailCount: Int
  }

  input CreateVideoClipInput {
    videoId: ID!
    startTimeSeconds: Int!
    endTimeSeconds: Int!
    title: String
    description: String
    isPublic: Boolean
  }

  input GenerateHighlightsInput {
    videoId: ID!
    transcriptText: String
    autoDetect: Boolean
  }

  # ============================================================================
  # LIVE FEATURES - Real-time Transcription, Collaboration & AI Assistance
  # ============================================================================

  enum LiveSessionStatus {
    active
    paused
    completed
    failed
  }

  enum LiveBookmarkType {
    manual
    action_item
    decision
    question
    key_moment
  }

  type LiveSession {
    id: ID!
    meetingId: ID!
    meeting: Meeting!
    status: LiveSessionStatus!
    startedAt: DateTime!
    endedAt: DateTime
    language: String!
    participantCount: Int!
    audioStreamUrl: String
    bookmarks: [LiveBookmark!]!
    transcriptSegments: [LiveTranscriptSegment!]!
    insights: [LiveInsight!]!
    reactions: [LiveReaction!]!
    metadata: JSON
    createdAt: DateTime!
    updatedAt: DateTime!
  }

  type LiveTranscriptSegment {
    id: ID!
    liveSessionId: ID!
    segmentIndex: Int!
    text: String!
    speaker: String
    speakerId: String
    startTime: Float!
    endTime: Float!
    confidence: Float!
    isFinal: Boolean!
    language: String
    words: JSON
    createdAt: DateTime!
  }

  type LiveBookmark {
    id: ID!
    liveSessionId: ID!
    meetingId: ID!
    userId: ID
    type: LiveBookmarkType!
    title: String!
    description: String
    timestampSeconds: Float!
    autoDetected: Boolean!
    tags: [String!]!
    metadata: JSON
    createdAt: DateTime!
    updatedAt: DateTime!
  }

  type LiveInsight {
    id: ID!
    liveSessionId: ID!
    insightType: String!
    content: String!
    confidence: Float!
    timestampSeconds: Float!
    speaker: String
    metadata: JSON
    createdAt: DateTime!
  }

  type LiveReaction {
    id: ID!
    liveSessionId: ID!
    userId: ID
    userName: String
    emoji: String!
    timestampSeconds: Float!
    createdAt: DateTime!
  }

  type LiveParticipant {
    userId: ID
    userName: String!
    joinedAt: DateTime!
    isActive: Boolean!
  }

  # Live Queries
  extend type Query {
    liveSession(id: ID!): LiveSession
    liveSessionByMeeting(meetingId: ID!): LiveSession
    liveTranscripts(liveSessionId: ID!, limit: Int, offset: Int): [LiveTranscriptSegment!]!
    liveBookmarks(liveSessionId: ID!): [LiveBookmark!]!
    liveInsights(liveSessionId: ID!, type: String): [LiveInsight!]!
    liveReactions(liveSessionId: ID!): [LiveReaction!]!
  }

  # Live Mutations
  extend type Mutation {
    createLiveSession(input: CreateLiveSessionInput!): LiveSession!
    updateLiveSessionStatus(id: ID!, status: LiveSessionStatus!): LiveSession!
    createLiveBookmark(input: CreateLiveBookmarkInput!): LiveBookmark!
    requestLiveSuggestions(liveSessionId: ID!, analysisTypes: [String!]): LiveSuggestionsResult!
  }

  # Live Inputs
  input CreateLiveSessionInput {
    meetingId: ID!
    language: String
  }

  input CreateLiveBookmarkInput {
    liveSessionId: ID!
    meetingId: ID!
    type: LiveBookmarkType
    title: String!
    description: String
    timestampSeconds: Float!
    tags: [String!]
  }

  type LiveSuggestionsResult {
    liveSessionId: ID!
    actionItems: JSON!
    questions: JSON!
    decisions: JSON!
    toneAnalysis: JSON!
    speakingTime: JSON!
    keywords: [String!]!
  }

  # ===========================
  # Workflow Automation (GAP #7)
  # ===========================

  enum TemplateType {
    one_on_one
    team_meeting
    client_call
    interview
    standup
    retrospective
    custom
  }

  enum FollowUpTrigger {
    meeting_end
    action_item_created
    deadline_approaching
    meeting_scheduled
    custom
  }

  enum FollowUpAction {
    send_email
    send_sms
    create_calendar_event
    send_webhook
    create_task
  }

  enum RuleTrigger {
    meeting_created
    meeting_completed
    transcript_ready
    summary_generated
    participant_joined
    action_item_created
    keyword_detected
    sentiment_detected
    duration_exceeded
    scheduled
  }

  enum RuleActionType {
    send_email
    send_sms
    add_tag
    assign_to_user
    create_task
    trigger_webhook
    move_to_workspace
    create_calendar_event
    send_notification
  }

  # Meeting Templates
  type MeetingTemplate {
    id: ID!
    organizationId: ID!
    userId: ID
    name: String!
    description: String
    type: TemplateType!
    templateData: JSON!
    variables: JSON!
    isActive: Boolean!
    usageCount: Int!
    metadata: JSON
    createdAt: DateTime!
    updatedAt: DateTime!
  }

  # Conversation Threads
  type ConversationThread {
    id: ID!
    organizationId: ID!
    title: String!
    topic: String
    participantEmails: [String!]!
    meetingIds: [String!]!
    messageCount: Int!
    lastActivityAt: DateTime!
    isArchived: Boolean!
    metadata: JSON
    createdAt: DateTime!
    updatedAt: DateTime!
  }

  type ThreadWithMeetings {
    id: ID!
    organizationId: ID!
    title: String!
    topic: String
    participantEmails: [String!]!
    meetingIds: [String!]!
    messageCount: Int!
    lastActivityAt: DateTime!
    isArchived: Boolean!
    meetings: [Meeting!]!
    createdAt: DateTime!
    updatedAt: DateTime!
  }

  # Follow-up Configuration
  type FollowUpConfig {
    id: ID!
    organizationId: ID!
    userId: ID
    name: String!
    description: String
    trigger: FollowUpTrigger!
    action: FollowUpAction!
    triggerConditions: JSON!
    actionConfig: JSON!
    delayMinutes: Int!
    isActive: Boolean!
    executionCount: Int!
    lastExecutedAt: DateTime
    metadata: JSON
    createdAt: DateTime!
    updatedAt: DateTime!
  }

  type FollowUpExecution {
    id: ID!
    configId: ID!
    meetingId: ID
    status: String!
    result: JSON
    errorMessage: String
    executedAt: DateTime
    createdAt: DateTime!
  }

  # Smart Scheduling
  type ScheduleSuggestion {
    id: ID!
    organizationId: ID!
    userId: ID!
    requestData: JSON!
    suggestions: [TimeSlot!]!
    selectedSlotIndex: Int
    status: String!
    expiresAt: DateTime!
    createdAt: DateTime!
    updatedAt: DateTime!
  }

  type TimeSlot {
    startTime: DateTime!
    endTime: DateTime!
    confidence: Float!
    attendeesAvailable: [String!]!
    conflicts: [String!]
  }

  # Automation Rules
  type AutomationRule {
    id: ID!
    organizationId: ID!
    userId: ID
    name: String!
    description: String
    trigger: RuleTrigger!
    conditions: JSON!
    actions: JSON!
    priority: Int!
    isActive: Boolean!
    executionCount: Int!
    lastExecutedAt: DateTime
    metadata: JSON
    createdAt: DateTime!
    updatedAt: DateTime!
  }

  type RuleExecution {
    id: ID!
    ruleId: ID!
    meetingId: ID
    triggeredBy: JSON!
    conditionsMet: Boolean!
    actionsResults: JSON!
    status: String!
    errorMessage: String
    executionTimeMs: Int
    createdAt: DateTime!
  }

  # Workflow Queries
  extend type Query {
    # Templates
    meetingTemplate(id: ID!): MeetingTemplate
    meetingTemplates(type: TemplateType, isActive: Boolean): [MeetingTemplate!]!
    suggestTemplate(input: TemplateSuggestionInput!): MeetingTemplate

    # Threads
    conversationThread(id: ID!): ThreadWithMeetings
    conversationThreads(
      search: String
      isArchived: Boolean
      limit: Int
      offset: Int
    ): [ConversationThread!]!

    # Follow-ups
    followUpConfig(id: ID!): FollowUpConfig
    followUpConfigs: [FollowUpConfig!]!
    followUpExecutions(configId: ID!): [FollowUpExecution!]!

    # Smart Scheduling
    scheduleSuggestion(id: ID!): ScheduleSuggestion
    smartSchedule(input: SmartScheduleInput!): [TimeSlot!]!

    # Automation Rules
    automationRule(id: ID!): AutomationRule
    automationRules(trigger: RuleTrigger, isActive: Boolean): [AutomationRule!]!
    ruleExecutions(ruleId: ID!, limit: Int): [RuleExecution!]!
  }

  # Workflow Mutations
  extend type Mutation {
    # Templates
    createMeetingTemplate(input: CreateTemplateInput!): MeetingTemplate!
    updateMeetingTemplate(id: ID!, input: UpdateTemplateInput!): MeetingTemplate!
    deleteMeetingTemplate(id: ID!): Boolean!
    applyTemplate(templateId: ID!, meetingId: ID!, variableValues: JSON): Boolean!

    # Threads
    createConversationThread(input: CreateThreadInput!): ConversationThread!
    autoLinkMeeting(meetingId: ID!, criteria: ThreadingCriteriaInput): String!

    # Follow-ups
    configureFollowUp(input: ConfigureFollowUpInput!): FollowUpConfig!
    updateFollowUpConfig(id: ID!, input: UpdateFollowUpInput!): FollowUpConfig!
    deleteFollowUpConfig(id: ID!): Boolean!
    executeFollowUp(configId: ID!, meetingId: ID!): FollowUpExecution!

    # Smart Scheduling
    requestSmartSchedule(input: SmartScheduleInput!): ScheduleSuggestion!

    # Automation Rules
    createAutomationRule(input: CreateAutomationRuleInput!): AutomationRule!
    updateAutomationRule(id: ID!, input: UpdateAutomationRuleInput!): AutomationRule!
    deleteAutomationRule(id: ID!): Boolean!
    testAutomationRule(trigger: RuleTrigger!, payload: JSON!, meetingId: ID): Boolean!
  }

  # Workflow Inputs
  input CreateTemplateInput {
    name: String!
    description: String
    type: TemplateType!
    templateData: JSON!
    variables: JSON
  }

  input UpdateTemplateInput {
    name: String
    description: String
    templateData: JSON
    variables: JSON
    isActive: Boolean
  }

  input TemplateSuggestionInput {
    title: String
    participants: [String!]
    duration: Int
  }

  input CreateThreadInput {
    title: String!
    topic: String
    participantEmails: [String!]!
    meetingIds: [String!]!
  }

  input ThreadingCriteriaInput {
    byTopic: Boolean
    byParticipants: Boolean
    byTimeWindow: Int
    minSimilarity: Float
  }

  input ConfigureFollowUpInput {
    name: String!
    description: String
    trigger: FollowUpTrigger!
    action: FollowUpAction!
    conditions: JSON
    config: JSON!
    delayMinutes: Int
  }

  input UpdateFollowUpInput {
    name: String
    description: String
    conditions: JSON
    config: JSON
    delayMinutes: Int
    isActive: Boolean
  }

  input SmartScheduleInput {
    duration: Int!
    participantEmails: [String!]!
    preferredTimes: [DateTime!]
    constraints: SchedulingConstraintsInput
    timezone: String
  }

  input SchedulingConstraintsInput {
    daysOfWeek: [Int!]
    startHour: Int
    endHour: Int
    excludeDates: [DateTime!]
  }

  input CreateAutomationRuleInput {
    name: String!
    description: String
    trigger: RuleTrigger!
    conditions: JSON!
    actions: JSON!
    priority: Int
  }

  input UpdateAutomationRuleInput {
    name: String
    description: String
    conditions: JSON
    actions: JSON
    isActive: Boolean
    priority: Int
  }

  # Revenue Intelligence (GAP #2 - Gong Competitor)
  type Deal {
    id: ID!
    name: String!
    amount: Float
    currency: String!
    stage: DealStage!
    probability: Int!
    expectedCloseDate: DateTime
    actualCloseDate: DateTime
    contactEmail: String
    contactName: String
    organizationId: ID!
    owner: User
    winLoss: WinLoss
    meetings: [Meeting!]!
    createdAt: DateTime!
    updatedAt: DateTime!
  }

  enum DealStage {
    prospecting
    qualification
    proposal
    negotiation
    closed_won
    closed_lost
  }

  type WinLoss {
    id: ID!
    dealId: ID!
    outcome: WinLossOutcome!
    closedDate: DateTime!
    dealAmount: Float
    competitorName: String
    lostReason: String
    winReason: String
    keyObjections: JSON!
    aiGeneratedInsights: String
    createdAt: DateTime!
  }

  enum WinLossOutcome {
    won
    lost
  }

  type Scorecard {
    id: ID!
    meetingId: ID!
    userId: ID!
    meeting: Meeting
    user: User
    deal: Deal
    talkRatio: Float
    questionCount: Int!
    monologueCount: Int!
    fillerWordCount: Int!
    paceWpm: Int
    overallScore: Int
    engagementScore: Int
    listeningScore: Int
    clarityScore: Int
    coachingInsights: JSON!
    strengths: JSON!
    improvements: JSON!
    createdAt: DateTime!
  }

  type PipelineMetrics {
    totalDeals: Int!
    totalValue: Float!
    averageDealSize: Float!
    winRate: Float!
    avgDealVelocity: Int!
    dealsByStage: JSON!
    topPerformers: [TopPerformer!]!
  }

  type TopPerformer {
    userId: ID!
    userName: String!
    dealsWon: Int!
    totalValue: Float!
  }

  type WinLossAnalysis {
    summary: WinLossSummary!
    commonObjections: [ObjectionData!]!
    topCompetitors: [CompetitorData!]!
    winningPatterns: [ReasonData!]!
    lossReasons: [ReasonData!]!
  }

  type WinLossSummary {
    totalDeals: Int!
    wins: Int!
    losses: Int!
    winRate: Float!
  }

  type ObjectionData {
    objection: String!
    count: Int!
  }

  type CompetitorData {
    name: String!
    losses: Int!
    avgDealSize: Float!
  }

  type ReasonData {
    reason: String!
    count: Int!
  }

  extend type Query {
    # Revenue Intelligence queries
    deal(id: ID!): Deal
    deals(stage: DealStage, search: String): [Deal!]!
    winLossAnalysis(startDate: DateTime, endDate: DateTime): WinLossAnalysis!
    scorecard(id: ID!): Scorecard
    userScorecards(userId: ID!, limit: Int): [Scorecard!]!
    pipelineMetrics: PipelineMetrics!
  }

  extend type Mutation {
    # Revenue Intelligence mutations
    createDeal(input: CreateDealInput!): Deal!
    updateDeal(id: ID!, input: UpdateDealInput!): Deal!
    recordWinLoss(input: RecordWinLossInput!): WinLoss!
    generateScorecard(meetingId: ID!, userId: ID, dealId: ID): Scorecard!
  }

  input CreateDealInput {
    name: String!
    amount: Float
    currency: String
    stage: DealStage
    probability: Int
    expectedCloseDate: DateTime
    contactEmail: String
    contactName: String
    ownerId: ID
    description: String
  }

  input UpdateDealInput {
    name: String
    amount: Float
    currency: String
    stage: DealStage
    probability: Int
    expectedCloseDate: DateTime
    actualCloseDate: DateTime
    contactEmail: String
    contactName: String
  }

  input RecordWinLossInput {
    dealId: ID!
    outcome: WinLossOutcome!
    closedDate: DateTime!
    dealAmount: Float
    competitorName: String
    lostReason: String
    winReason: String
    keyObjections: [String!]
  }
`;
