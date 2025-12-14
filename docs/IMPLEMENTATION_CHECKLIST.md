# OpenMeet - E2E User Journey Implementation Checklist

## MANDATORY VERIFICATION PROTOCOL
> All implementations MUST follow CLAUDE.md rules:
> - NO MOCKS, NO FAKES, NO PLACEHOLDERS
> - Real database operations (PostgreSQL + Prisma)
> - Real Redis caching
> - Real API integrations
> - Tests MUST be run and pass

---

## PHASE 1: CRITICAL (P0) - Authentication & Onboarding

### 1.1 Password Reset Flow
- [ ] Create `/app/forgot-password/page.tsx` - Request reset form
- [ ] Create `/app/reset-password/page.tsx` - Reset with token form
- [ ] Implement password reset API integration
- [ ] Add inline validation with Zod
- [ ] Add loading states and error handling
- [ ] Add success confirmation with redirect
- [ ] Write tests: `__tests__/forgot-password.test.tsx`
- [ ] Verify with real SendGrid email delivery

### 1.2 Email Verification Flow
- [ ] Create `/app/verify-email/page.tsx` - Verification landing
- [ ] Create `/app/verify-email/pending/page.tsx` - Pending state
- [ ] Create `/app/verify-email/success/page.tsx` - Success state
- [ ] Implement resend verification email
- [ ] Add countdown timer for resend
- [ ] Write tests: `__tests__/verify-email.test.tsx`
- [ ] Verify with real email verification flow

### 1.3 MFA Setup Flow
- [ ] Create `/app/(dashboard)/settings/security/page.tsx`
- [ ] Create `MFASetupWizard` component with QR code
- [ ] Create `MFAVerifyModal` component
- [ ] Implement TOTP verification
- [ ] Add backup codes generation and display
- [ ] Write tests: `__tests__/mfa-setup.test.tsx`

### 1.4 Onboarding Survey
- [ ] Create `OnboardingSurvey` component (multi-step wizard)
- [ ] Create `/app/onboarding/page.tsx`
- [ ] Implement survey steps: role, team size, goals, integrations
- [ ] Save preferences to user profile
- [ ] Personalize dashboard based on answers
- [ ] Write tests: `__tests__/onboarding.test.tsx`

---

## PHASE 2: CRITICAL (P0) - Meeting Upload & Processing

### 2.1 File Upload Flow
- [ ] Create `MeetingUploadModal` component
- [ ] Create `FileDropZone` component (drag & drop)
- [ ] Support formats: MP3, MP4, WAV, M4A, WebM, OGG
- [ ] Implement chunked upload for large files (up to 2GB)
- [ ] Add upload progress with cancel option
- [ ] Write tests: `__tests__/file-upload.test.tsx`
- [ ] Verify with real S3/MinIO upload

### 2.2 Processing Progress UI
- [ ] Create `ProcessingProgress` component
- [ ] Implement multi-phase progress visualization
- [ ] Connect to WebSocket for real-time updates
- [ ] Add phases: uploading, analyzing, transcribing, diarizing, summarizing
- [ ] Handle processing errors with retry option
- [ ] Write tests: `__tests__/processing-progress.test.tsx`

### 2.3 Meeting Result Display Enhancement
- [ ] Enhance `/app/(dashboard)/meetings/[id]/page.tsx`
- [ ] Add synchronized video/audio player with transcript
- [ ] Implement word-level highlighting during playback
- [ ] Add transcript search with highlighting
- [ ] Add speaker timeline visualization
- [ ] Write tests: `__tests__/meeting-detail.test.tsx`

---

## PHASE 3: CRITICAL (P0) - Empty States & First-Time UX

### 3.1 Dashboard Empty States
- [ ] Create `EmptyDashboard` component
- [ ] Add illustration and clear CTA
- [ ] Implement quick action cards
- [ ] Add progress indicator for setup completion
- [ ] Write tests: `__tests__/empty-states.test.tsx`

### 3.2 Meetings List Empty State
- [ ] Create `EmptyMeetingsList` component
- [ ] Add upload CTA with drag-drop hint
- [ ] Add calendar connect suggestion
- [ ] Implement "Getting Started" checklist
- [ ] Write tests: `__tests__/empty-meetings.test.tsx`

### 3.3 First-Time User Welcome
- [ ] Create `WelcomeModal` component
- [ ] Implement feature tour with tooltips
- [ ] Add skip option with "show later" preference
- [ ] Track onboarding completion in user preferences
- [ ] Write tests: `__tests__/welcome-modal.test.tsx`

---

## PHASE 4: HIGH (P1) - AI Features

### 4.1 Ask AI / Fred Assistant
- [ ] Create `/app/(dashboard)/ask-ai/page.tsx` enhancement
- [ ] Create `AskAIChat` component
- [ ] Implement cross-meeting search
- [ ] Add conversation history
- [ ] Add suggested questions
- [ ] Implement streaming responses
- [ ] Write tests: `__tests__/ask-ai.test.tsx`
- [ ] Verify with real vLLM/OpenAI API calls

### 4.2 AI Summary Enhancement
- [ ] Enhance `MeetingSummary` component
- [ ] Add expandable sections for key points, action items, decisions
- [ ] Implement action item export to task managers
- [ ] Add summary regeneration option
- [ ] Write tests: `__tests__/ai-summary.test.tsx`

### 4.3 Meeting Insights Panel
- [ ] Create `MeetingInsights` component
- [ ] Display sentiment analysis results
- [ ] Show talk time distribution
- [ ] Add question/answer highlighting
- [ ] Implement topic extraction display
- [ ] Write tests: `__tests__/meeting-insights.test.tsx`

---

## PHASE 5: HIGH (P1) - Search & Navigation

### 5.1 Global Search Enhancement
- [ ] Create `GlobalSearchModal` component (Cmd+K)
- [ ] Implement search across meetings, transcripts, participants
- [ ] Add recent searches
- [ ] Implement search filters (date, platform, participant)
- [ ] Add keyboard navigation
- [ ] Write tests: `__tests__/global-search.test.tsx`
- [ ] Verify with real Elasticsearch integration

### 5.2 Meeting Filters Enhancement
- [ ] Enhance meetings list with advanced filters
- [ ] Add date range picker
- [ ] Add platform filter (Zoom, Meet, Teams)
- [ ] Add participant filter with autocomplete
- [ ] Implement saved filter presets
- [ ] Write tests: `__tests__/meeting-filters.test.tsx`

---

## PHASE 6: HIGH (P1) - Real-Time Features

### 6.1 Live Transcription View
- [ ] Create `/app/(dashboard)/live/[sessionId]/page.tsx`
- [ ] Create `LiveTranscriptPanel` component
- [ ] Implement real-time caption display
- [ ] Add live speaker identification
- [ ] Implement bookmark creation during live session
- [ ] Write tests: `__tests__/live-transcription.test.tsx`
- [ ] Verify with real WebSocket connection

### 6.2 Real-Time Notifications
- [ ] Create `NotificationToast` component
- [ ] Implement WebSocket notification subscription
- [ ] Add notification center dropdown
- [ ] Implement notification preferences
- [ ] Write tests: `__tests__/notifications.test.tsx`

---

## PHASE 7: HIGH (P1) - Sharing & Collaboration

### 7.1 Meeting Sharing
- [ ] Create `ShareMeetingModal` component
- [ ] Implement share link generation
- [ ] Add permission levels (view, comment, edit)
- [ ] Add expiration date option
- [ ] Implement email invite
- [ ] Write tests: `__tests__/share-meeting.test.tsx`

### 7.2 Clip Creation & Sharing
- [ ] Enhance `ClipCreator` component
- [ ] Add timeline selection UI
- [ ] Implement clip preview
- [ ] Add direct share to Slack/Teams
- [ ] Write tests: `__tests__/clip-creator.test.tsx`

---

## PHASE 8: HIGH (P1) - Billing & Subscription

### 8.1 Pricing Page Enhancement
- [ ] Enhance `/app/pricing/page.tsx`
- [ ] Add plan comparison table
- [ ] Implement Stripe checkout integration
- [ ] Add annual/monthly toggle
- [ ] Write tests: `__tests__/pricing.test.tsx`

### 8.2 Billing Dashboard
- [ ] Create `/app/(dashboard)/settings/billing/page.tsx`
- [ ] Display current plan and usage
- [ ] Add upgrade/downgrade options
- [ ] Implement invoice history
- [ ] Add payment method management
- [ ] Write tests: `__tests__/billing.test.tsx`
- [ ] Verify with real Stripe API

---

## PHASE 9: MEDIUM (P2) - Integrations

### 9.1 Calendar Integration Enhancement
- [ ] Enhance `/app/(dashboard)/integrations/page.tsx`
- [ ] Add Google Calendar OAuth flow
- [ ] Add Microsoft Outlook OAuth flow
- [ ] Implement auto-join settings
- [ ] Display upcoming meetings from calendar
- [ ] Write tests: `__tests__/calendar-integration.test.tsx`

### 9.2 CRM Integration
- [ ] Create Salesforce connection flow
- [ ] Create HubSpot connection flow
- [ ] Implement meeting-to-deal linking
- [ ] Add automatic CRM activity logging
- [ ] Write tests: `__tests__/crm-integration.test.tsx`

### 9.3 Slack/Teams Integration
- [ ] Create Slack workspace connection
- [ ] Implement meeting summary posting
- [ ] Add slash commands for search
- [ ] Create Teams app connection
- [ ] Write tests: `__tests__/slack-teams.test.tsx`

---

## PHASE 10: MEDIUM (P2) - Settings & Administration

### 10.1 Profile Settings Enhancement
- [ ] Enhance `/app/(dashboard)/settings/page.tsx`
- [ ] Add avatar upload with crop
- [ ] Implement notification preferences
- [ ] Add language/timezone settings
- [ ] Write tests: `__tests__/profile-settings.test.tsx`

### 10.2 Team Management Enhancement
- [ ] Enhance `/app/(dashboard)/settings/team/page.tsx`
- [ ] Add bulk invite functionality
- [ ] Implement pending invites management
- [ ] Add team member activity log
- [ ] Write tests: `__tests__/team-management.test.tsx`

---

## VERIFICATION CHECKLIST (Required for each feature)

For EVERY feature above, verify:

```markdown
## Feature: [Name]

### Status: [ ] VERIFIED (X/Y tests passing) or [ ] BROKEN

### Test Execution:
```bash
pnpm vitest run [test-file]
```
[paste ACTUAL test command and output]

### Service Verification:
```bash
docker ps  # Services running
docker exec postgres psql -U openmeet -d openmeet_db -c 'SELECT...'  # Data verification
```

### Files Created:
- [filepath]: [what it does]

### What Actually Works:
- [specific capability with evidence]

### Known Issues:
- [any failures or limitations]
```

---

## IMPLEMENTATION ORDER

| Sprint | Week | Agents | Features |
|--------|------|--------|----------|
| 1 | 1-2 | 1-5 | Password Reset, Email Verify, MFA, Onboarding, Empty States |
| 1 | 2-3 | 6-10 | File Upload, Processing UI, Meeting Display, Welcome Modal, Dashboard Empty |
| 2 | 3-4 | 11-15 | Ask AI, AI Summary, Insights, Global Search, Filters |
| 2 | 4-5 | 16-20 | Live Transcription, Notifications, Sharing, Billing, Integrations |

---

## AGENT ASSIGNMENTS

| Agent | Focus Area | Primary Files |
|-------|------------|---------------|
| 1 | Password Reset Flow | forgot-password, reset-password pages |
| 2 | Email Verification Flow | verify-email pages |
| 3 | MFA Setup | security settings, MFA components |
| 4 | Onboarding Survey | onboarding page, survey wizard |
| 5 | File Upload System | upload modal, dropzone |
| 6 | Processing Progress UI | processing components, WebSocket |
| 7 | Meeting Detail Enhancement | meeting page, player, transcript |
| 8 | Empty States - Dashboard | empty state components |
| 9 | Empty States - Meetings | meetings list empty state |
| 10 | Welcome & Onboarding UI | welcome modal, tour |
| 11 | Ask AI Enhancement | ask-ai page, chat component |
| 12 | AI Summary Enhancement | summary components |
| 13 | Meeting Insights | insights panel, sentiment |
| 14 | Global Search | search modal, Cmd+K |
| 15 | Meeting Filters | filter components |
| 16 | Live Transcription | live page, real-time panel |
| 17 | Notifications System | notification components |
| 18 | Sharing Features | share modal, permissions |
| 19 | Billing Dashboard | billing page, Stripe |
| 20 | Integration Hub | integrations page, OAuth flows |

---

*Document Generated: $(date)*
*Follow CLAUDE.md verification protocol for ALL implementations*
