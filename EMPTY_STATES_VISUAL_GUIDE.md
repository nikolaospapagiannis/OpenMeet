# Empty States Visual Guide - OpenMeet

## 1. EmptyDashboard Component

```
┌─────────────────────────────────────────────────────────────────────┐
│ ┌─────────────────────────────────────────────────────────────────┐ │
│ │  ✨  Welcome to OpenMeet, John!                                │ │
│ │      Let's get you set up in just a few simple steps            │ │
│ │                                                                   │ │
│ │  Setup Progress                              75% Complete       │ │
│ │  ▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓░░░░░░░░                           │ │
│ └─────────────────────────────────────────────────────────────────┘ │
│                                                                       │
│ ┌─────────────────────────────────────────────────────────────────┐ │
│ │  Setup Checklist                           3 of 4 completed     │ │
│ │                                                                   │ │
│ │  ✓ [👤] Complete Your Profile                   ✓ Complete     │ │
│ │  ✓ [📅] Connect Your Calendar                   ✓ Complete     │ │
│ │  → [📹] Record Your First Meeting   [Next]  [Upload Meeting]   │ │
│ │  ○ [👥] Invite Team Members                   [Invite Team]    │ │
│ └─────────────────────────────────────────────────────────────────┘ │
│                                                                       │
│  Quick Actions →                                                     │
│ ┌──────────────────────────────┬──────────────────────────────────┐ │
│ │  📤 Upload Your First Meeting │  📅 Connect Your Calendar       │ │
│ │  Get AI-powered transcriptions│  Automatically join and record  │ │
│ │  summaries, and action items  │  meetings from your calendar    │ │
│ │  [📤 Upload Recording]        │  [📅 Connect Calendar]          │ │
│ ├──────────────────────────────┼──────────────────────────────────┤ │
│ │  👥 Invite Team Members       │  🌐 Install Chrome Extension    │ │
│ │  Collaborate with your team   │  Capture meetings directly from │ │
│ │  Share notes and insights     │  your browser with one-click    │ │
│ │  [👥 Invite Team]             │  [🌐 Get Extension]             │ │
│ └──────────────────────────────┴──────────────────────────────────┘ │
│                                                                       │
│ ┌─────────────────────────────────────────────────────────────────┐ │
│ │  ✨ Need Help Getting Started?                                  │ │
│ │  Check out our documentation, watch tutorial videos,            │ │
│ │  or reach out to our support team.                              │ │
│ │  [View Docs]  [Contact Support]                                 │ │
│ └─────────────────────────────────────────────────────────────────┘ │
└─────────────────────────────────────────────────────────────────────┘
```

**Color Scheme:**
- Header: Teal/Cyan gradient with orb effects
- Checklist items: Individual color themes (blue, purple, teal, emerald)
- Action cards: Color-coded borders and icons
- Background: Glassmorphism with backdrop blur

---

## 2. EmptyRecentMeetings Component

```
┌───────────────────────────────────────────────────────────┐
│                                                             │
│                    ┌─────────────┐                         │
│              ┌─────┤  📹         ├─────┐                   │
│              │     │    Video    │     │                   │
│              │  📄 └─────────────┘   ✨│                   │
│              │  bounce           pulse │                   │
│              └───────────────────────────┘                 │
│                                                             │
│               No Meetings Yet                               │
│                                                             │
│   Start capturing your meetings with AI-powered            │
│   transcription and summaries. Upload a recording          │
│   or connect your calendar to get started.                 │
│                                                             │
│   What you'll get with OpenMeet:                          │
│                                                             │
│   ✓  AI-powered transcription with speaker identification  │
│   ✓  Automatic summaries and key takeaways                 │
│   ✓  Action items extracted and tracked                    │
│   ✓  Search across all your meeting content                │
│   ✓  Share notes with your team instantly                  │
│                                                             │
│   ┌─────────────────────┐  ┌──────────────────────┐        │
│   │ 📤 Upload Recording │  │ 📅 Schedule Meeting  │        │
│   │   (Primary CTA)     │  │   (Ghost button)     │        │
│   └─────────────────────┘  └──────────────────────┘        │
│                                                             │
│   Supported formats: MP4, MP3, WAV, M4A (up to 4 hours)   │
│                                                             │
└───────────────────────────────────────────────────────────┘
```

**Features:**
- Centered layout with maximum width constraint
- Animated floating elements (bounce/pulse)
- Benefits list with checkmarks
- Dual call-to-action buttons
- File format helper text

---

## 3. EmptyTopics Component

```
┌────────────────────────────────────────────────────────────┐
│                                                              │
│              ┌────┐  ┌───┐  ┌────┐                          │
│              │ 🏷️ │  │ ✨│  │ 📈 │                          │
│              │Tag │  │AI │  │Trend│                         │
│              └────┘  └───┘  └────┘                          │
│                                                              │
│    [Product Launch]  [Q4 Strategy]  [Team Sync]             │
│                                                              │
│            No Topics Tracked Yet                             │
│                                                              │
│   Topics will appear after your first meeting.               │
│   OpenMeet automatically identifies and tracks recurring    │
│   themes, subjects, and discussion points across all your    │
│   conversations.                                             │
│                                                              │
│  ┌─────────────────┬─────────────────┬─────────────────┐   │
│  │ 💬 Auto-Detection│ 📈 Track Trends  │ 💡 Get Insights  │   │
│  │ AI identifies    │ See which topics│ Discover patterns│   │
│  │ key topics from  │ come up most    │ and connections  │   │
│  │ meeting content  │ frequently      │ across meetings  │   │
│  └─────────────────┴─────────────────┴─────────────────┘   │
│                                                              │
│           ┌─────────────────────────────────┐               │
│           │ 📤 Upload Your First Meeting    │               │
│           │      (Gradient Primary)         │               │
│           └─────────────────────────────────┘               │
│                                                              │
│   Topics are automatically generated from your               │
│   meeting transcripts                                        │
│                                                              │
└────────────────────────────────────────────────────────────┘
```

**Features:**
- Visual icon representation of topics
- Sample topic tags for context
- Three-column feature highlights
- Educational messaging
- Single primary CTA

---

## 4. SetupChecklist Component (Detailed View)

```
┌──────────────────────────────────────────────────────────────┐
│  Setup Checklist                      3 of 4 completed        │
├──────────────────────────────────────────────────────────────┤
│                                                                │
│  ┌──────────────────────────────────────────────────────────┐│
│  │ [👤] Complete Your Profile              ✅ ✓ Complete    ││
│  │      Add your name, photo, and preferences                ││
│  │      ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━          ││
│  │      (Completed - dimmed, hover shows checkmark overlay)  ││
│  └──────────────────────────────────────────────────────────┘│
│                                                                │
│  ┌──────────────────────────────────────────────────────────┐│
│  │ [📅] Connect Your Calendar              ✅ ✓ Complete    ││
│  │      Auto-join meetings from Google, Outlook, or Teams    ││
│  │      ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━          ││
│  │      (Completed - dimmed)                                 ││
│  └──────────────────────────────────────────────────────────┘│
│                                                                │
│  ┌──────────────────────────────────────────────────────────┐│
│  │ [📹] Record Your First Meeting  [Next]  [Upload Meeting→]││
│  │      Upload a recording or schedule a new meeting         ││
│  │      ┃━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━   ││
│  │      (Active - teal border glow, highlighted)             ││
│  └──────────────────────────────────────────────────────────┘│
│                                                                │
│  ┌──────────────────────────────────────────────────────────┐│
│  │ ○ [👥] Invite Team Members                 [Invite Team→]││
│  │      Collaborate and share meeting insights               ││
│  │      ░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░      ││
│  │      (Pending - subtle styling)                           ││
│  └──────────────────────────────────────────────────────────┘│
│                                                                │
│  ┌──────────────────────────────────────────────────────────┐│
│  │  ✅ Setup Complete!                                       ││
│  │  You're all set! Start recording meetings to unlock       ││
│  │  the full power of OpenMeet.                             ││
│  │  (Shows when all items complete)                          ││
│  └──────────────────────────────────────────────────────────┘│
│                                                                │
└──────────────────────────────────────────────────────────────┘
```

**Interactive States:**
- **Completed:** Dimmed with checkmark, hover overlay shows completion
- **Next (Active):** Highlighted with teal border, "Next" badge, action button
- **Pending:** Subtle styling, circle icon, action button available
- **All Complete:** Celebration message appears at bottom

**Color Coding:**
1. Profile (Blue): `#3B82F6` theme
2. Calendar (Purple): `#A855F7` theme
3. First Meeting (Teal): `#14B8A6` theme
4. Team (Emerald): `#10B981` theme

---

## Dashboard Integration Flow

### New User (No Meetings)
```
┌─────────────────────────────────────────────────────┐
│  DASHBOARD PAGE                                     │
├─────────────────────────────────────────────────────┤
│                                                     │
│  [EmptyDashboard Component - Full Width]           │
│  - Welcome message                                  │
│  - Progress bar                                     │
│  - Setup checklist                                  │
│  - Quick action cards (4x grid)                     │
│  - Help section                                     │
│                                                     │
│  ┌────────────────────────┐                        │
│  │ Right Sidebar          │                        │
│  │ - Unlimited Transcripts│                        │
│  │ - Upgrade Prompt       │                        │
│  └────────────────────────┘                        │
│                                                     │
└─────────────────────────────────────────────────────┘
```

### User with Some Progress (No Recent Meetings)
```
┌─────────────────────────────────────────────────────┐
│  DASHBOARD PAGE                                     │
├─────────────────────────────────────────────────────┤
│  Good Morning, John!                                │
│                                                     │
│  [Stats Cards: 0 Preps | 0 Tasks | 0 AI Apps]     │
│                                                     │
│  [EmptyTopics Component]                           │
│  - Topic icons and sample tags                      │
│  - Feature highlights (3-col)                       │
│  - Upload CTA                                       │
│                                                     │
│  [EmptyRecentMeetings Component]                   │
│  - Illustration with animations                     │
│  - Benefits list                                    │
│  - Upload + Schedule CTAs                          │
│                                                     │
│  ┌────────────────────────┐                        │
│  │ Right Sidebar          │                        │
│  │ - OpenMeet Widget     │                        │
│  │ - Calendar Settings    │                        │
│  │ - Upgrade Prompt       │                        │
│  └────────────────────────┘                        │
│                                                     │
└─────────────────────────────────────────────────────┘
```

### User with Meetings (Normal Dashboard)
```
┌─────────────────────────────────────────────────────┐
│  DASHBOARD PAGE                                     │
├─────────────────────────────────────────────────────┤
│  Good Morning, John!                                │
│                                                     │
│  [Stats Cards: 3 Preps | 5 Tasks | 2 AI Apps]     │
│                                                     │
│  Popular Topics                                     │
│  [Topic cards with actual data]                     │
│                                                     │
│  Recent Meetings                       [View More→] │
│  [Meeting list with cards]                          │
│  - Meeting 1                                        │
│  - Meeting 2                                        │
│  - Meeting 3                                        │
│                                                     │
│  ┌────────────────────────┐                        │
│  │ Right Sidebar          │                        │
│  │ - OpenMeet Widget     │                        │
│  │ - Upcoming Meetings    │                        │
│  │ - Upgrade Prompt       │                        │
│  └────────────────────────┘                        │
│                                                     │
└─────────────────────────────────────────────────────┘
```

---

## Key Design Principles Applied

### 1. Progressive Disclosure
- New users see full onboarding (EmptyDashboard)
- Users with some progress see section-specific empty states
- Users with data see full dashboard

### 2. Consistent Visual Language
- Glassmorphism cards throughout
- Color-coded icons for different features
- Gradient buttons for primary actions
- Ghost buttons for secondary actions

### 3. Clear Information Hierarchy
- Large, bold titles
- Descriptive subtitles
- Benefit lists with checkmarks
- Helper text for additional context

### 4. Actionable Guidance
- Every state has at least one CTA
- Links point to actual routes
- Action labels are verb-focused
- "Next" indicators show progression

### 5. Encouraging Tone
- "Welcome" not "Warning"
- "Get started" not "Nothing here"
- Benefits-focused messaging
- Celebration on completion

---

## File Structure

```
apps/web/src/components/empty-states/
├── EmptyDashboard.tsx          (208 lines) - Full onboarding experience
├── EmptyRecentMeetings.tsx     (99 lines)  - Meetings section empty state
├── EmptyTopics.tsx             (112 lines) - Topics section empty state
├── SetupChecklist.tsx          (222 lines) - Interactive checklist component
├── index.ts                    (9 lines)   - Barrel export
└── README.md                   - Detailed documentation

apps/web/src/app/(dashboard)/dashboard/page.tsx
└── Updated to integrate empty states conditionally
```

---

## Usage Examples

### In Dashboard Page
```tsx
// Check if user is new
const isNewUser = meetings.length === 0 && !setupProgress.firstMeeting;

if (isNewUser) {
  return <EmptyDashboard userName={getUserFirstName()} setupProgress={setupProgress} />;
}

// Section-specific empty states
<div className="mb-6">
  <EmptyTopics />
</div>

{meetings.length === 0 ? (
  <EmptyRecentMeetings />
) : (
  <MeetingsList meetings={meetings} />
)}
```

### Standalone Usage
```tsx
import { EmptyDashboard, EmptyRecentMeetings, EmptyTopics, SetupChecklist } from '@/components/empty-states';

// In any component
<EmptyRecentMeetings />
```

---

## Animation Details

### EmptyRecentMeetings
- Floating document icon: `animate-bounce`
- Sparkle icon: `animate-pulse`
- Icon container: `hover:scale-110`

### SetupChecklist
- Icon hover: `group-hover:scale-110`
- Card hover: `hover:scale-[1.02]`
- Completion overlay: `opacity-0 group-hover:opacity-100`

### EmptyDashboard
- Progress bar: `transition-all duration-500 ease-out`
- Action cards: `group-hover:scale-110` on icons
- Orb decorations: `blur-2xl` ambient effects

---

## Responsive Breakpoints

### Mobile (< 640px)
- Single column layouts
- Stacked buttons (full width)
- Reduced padding
- Smaller icon sizes

### Tablet (640px - 1024px)
- Two-column grids for action cards
- Side-by-side buttons
- Medium padding

### Desktop (> 1024px)
- Multi-column layouts
- Full sidebar
- Maximum visual polish
- Large decorative elements
