# Meeting Insights Panel - Visual Design Guide

## Component Visual Overview

### 1. MeetingInsightsPanel - Main Dashboard

```
┌─────────────────────────────────────────────────────────────────┐
│ ╔═══════════════════════════════════════════════════════════╗ │
│ ║ [Overview] [Engagement] [Sentiment] [Topics] [Questions]  ║ │
│ ╚═══════════════════════════════════════════════════════════╝ │
│                                                                 │
│ ┌────────────┐ ┌────────────┐ ┌────────────┐ ┌────────────┐  │
│ │ 👥 4       │ │ ⏱️ 40m     │ │ 💬 5       │ │ 📊 0.7     │  │
│ │ Participants│ │ Duration   │ │ Questions  │ │ Sentiment  │  │
│ └────────────┘ └────────────┘ └────────────┘ └────────────┘  │
│                                                                 │
│ ┌─ AI Insights ────────────────────────────────────────────┐  │
│ │ ✅ Excellent Engagement                                   │  │
│ │    All participants actively contributed (92/100)         │  │
│ │                                                            │  │
│ │ 💡 Follow-up Recommended                                  │  │
│ │    Consider scheduling follow-up for 3 pending items      │  │
│ └────────────────────────────────────────────────────────────┘  │
│                                                                 │
│ ┌─ Talk Time Chart ───────┐ ┌─ Engagement Score ──────┐     │
│ │      [Donut Chart]       │ │    [Radial Chart]       │     │
│ │   John: 35% (20m)        │ │        85              │     │
│ │   Sarah: 32% (18m)       │ │     [Excellent]         │     │
│ │   Mike: 21% (12m)        │ │                         │     │
│ │   Emily: 12% (7m)        │ │   vs Previous: +12.5%   │     │
│ └──────────────────────────┘ └─────────────────────────┘     │
└─────────────────────────────────────────────────────────────────┘
```

---

### 2. TalkTimeChart - Speaker Distribution

```
┌─────────────────────────────────────────────────────────────────┐
│ 🕐 Talk Time Distribution                       [🔍 Click Filter]│
│                                                                   │
│                      Total: 40m 0s                               │
│                                                                   │
│                         ╭─────╮                                  │
│                     ╭───┤ 35% ├───╮                             │
│                 ╭───┤ J │     │ S ├───╮                         │
│             ╭───┤ 12%│  ╰─────╯   │32%├───╮                     │
│         ╭───┤ E │    │   [40m]    │   │ M ├───╮                │
│         │    ╰───┴─────────────────────┴───╯   │                │
│                                                                   │
│ ┌─ Speakers ────────────────────────────────────────────────┐  │
│ │ ● John Smith        2,400 words     20m 0s         35%    │  │
│ │ ● Sarah Johnson     2,160 words     18m 0s         32%    │  │
│ │ ● Mike Chen         1,440 words     12m 0s         21%    │  │
│ │ ● Emily Davis         800 words      6m 40s        12%    │  │
│ └────────────────────────────────────────────────────────────┘  │
│                                                                   │
│ ℹ️ Key Insights:                                                 │
│ • Balanced participation across all speakers                     │
│                                                                   │
└─────────────────────────────────────────────────────────────────┘
```

**Chart Features:**
- Interactive donut chart with percentages
- Color-coded speakers (10 distinct colors)
- Click on pie slice or legend to filter transcript
- Hover for detailed tooltip with words/duration
- Speaking rate insights (>180 WPM flagged)

---

### 3. SentimentTimeline - Emotion Over Time

```
┌─────────────────────────────────────────────────────────────────┐
│ 📊 Sentiment Over Time                                          │
│                                                                   │
│ ┌──────┐ ┌──────┐ ┌──────┐ ┌──────┐                           │
│ │ 😐 0.7│ │ 😊 0.9│ │ 😢-0.3│ │ 📈+0.3│                        │
│ │ Avg  │ │ Max   │ │ Min   │ │ Trend │                          │
│ └──────┘ └──────┘ └──────┘ └──────┘                           │
│                                                                   │
│  1.0 │                              ╱╲                           │
│      │                          ╱╲ ╱  ╲                         │
│  0.5 │        ╱╲            ╱╲╱  ╲    ╲╱╲                      │
│ ─────┼────────╱──╲──────────╱─────────────────────────────     │
│      │           ╲╱                                              │
│ -0.5 │              ╲╱                                           │
│      │                                                            │
│ -1.0 └────────────────────────────────────────────────────>     │
│      0:00    10:00    20:00    30:00    40:00    Time           │
│                                                                   │
│ ┌─ Notable Moments ─────────────────────────────────────────┐  │
│ │ 😊 John: "Excellent work team, very excited" (28:00)  0.9 │  │
│ │ 😐 Mike: "That makes much more sense now" (20:00)     0.5 │  │
│ │ 😢 John: "This is a bit challenging" (12:00)         -0.3 │  │
│ └────────────────────────────────────────────────────────────┘  │
│                                                                   │
│ ✅ Sentiment improved throughout - positive trajectory           │
│                                                                   │
└─────────────────────────────────────────────────────────────────┘
```

**Chart Features:**
- Area chart with gradient fill
- Reference line at y=0 (neutral)
- Hover on any point to see speaker, text, timestamp
- Click moment to jump to transcript
- Notable moments marked with vertical dashed lines
- Color zones: Green (>0.5), Blue (-0.2 to 0.5), Red (<-0.2)

---

### 4. TopicBreakdown - Discussion Themes

```
┌─────────────────────────────────────────────────────────────────┐
│ 💬 Topic Breakdown            [Tag Cloud] [Bar Chart] ⚙️        │
│                                                                   │
│ ┌──────┐ ┌──────┐ ┌──────┐                                     │
│ │# 5   │ │💬 54 │ │⏱️ 50m│                                     │
│ │Topics│ │Mentions│ │Time │                                     │
│ └──────┘ └──────┘ └──────┘                                     │
│                                                                   │
│ ┌─ Tag Cloud View ──────────────────────────────────────────┐  │
│ │                                                             │  │
│ │     Product Roadmap (15)          Budget Review (12)      │  │
│ │                                                             │  │
│ │          Team Performance (10)                             │  │
│ │                                                             │  │
│ │      Technical Debt (8)      Customer Feedback (7)        │  │
│ │                                                             │  │
│ └────────────────────────────────────────────────────────────┘  │
│                                                                   │
│ ┌─ Topic Details ────────────────────────────────────────────┐  │
│ │ ● Product Roadmap      15 mentions    27.8%    15m 0s     │  │
│ │ ● Budget Review        12 mentions    22.2%    12m 0s     │  │
│ │ ● Team Performance     10 mentions    18.5%    10m 0s     │  │
│ │   [Expanded] Key Mentions:                                 │  │
│ │   6:00 - "Team velocity has increased significantly"       │  │
│ │   14:00 - "Great job on meeting the sprint goals"          │  │
│ │ ● Technical Debt        8 mentions    14.8%     8m 0s     │  │
│ │ ● Customer Feedback     7 mentions    13.0%     7m 0s     │  │
│ └────────────────────────────────────────────────────────────┘  │
│                                                                   │
│ 📌 Product Roadmap was most discussed with 15 mentions           │
│                                                                   │
└─────────────────────────────────────────────────────────────────┘
```

**View Modes:**
1. **Tag Cloud:** Size-based importance, click to filter
2. **Bar Chart:** Horizontal bars with frequency counts

**Features:**
- Dynamic sizing based on mention count
- Click any topic to expand segments
- Filter transcript by selected topic
- Percentage of total discussion time

---

### 5. QuestionAnalysis - Q&A Tracking

```
┌─────────────────────────────────────────────────────────────────┐
│ ❓ Question Analysis                                             │
│                                                                   │
│ ┌──────┐ ┌──────┐ ┌──────┐ ┌──────┐                           │
│ │❓ 5  │ │✅ 4  │ │❌ 1  │ │📊 80%│                            │
│ │Total │ │Answered│ │Pending│ │Rate │                            │
│ └──────┘ └──────┘ └──────┘ └──────┘                           │
│                                                                   │
│ [All (5)] [Answered (4)] [Unanswered (1)]    🔍 Search...       │
│                                                                   │
│ ┌─────────────────────────────────────────────────────────────┐ │
│ │ 👤 Emily Davis                          ✅ Answered    5:00 │ │
│ │ "What is the timeline for the new feature launch?"         │ │
│ │ ├─ Answer (6:00):                                          │ │
│ │ │  "We are targeting end of Q2 for the initial release"   │ │
│ │ └─ Click to jump to this moment                            │ │
│ └─────────────────────────────────────────────────────────────┘ │
│                                                                   │
│ ┌─────────────────────────────────────────────────────────────┐ │
│ │ 👤 Mike Chen                            ✅ Answered   10:00 │ │
│ │ "Do we have the resources needed for this project?"        │ │
│ │ ├─ Answer (11:00):                                         │ │
│ │ │  "Yes, we have allocated 3 engineers and 1 designer"    │ │
│ └─────────────────────────────────────────────────────────────┘ │
│                                                                   │
│ ┌─────────────────────────────────────────────────────────────┐ │
│ │ 👤 Emily Davis                          ❌ Unanswered 20:00 │ │
│ │ "What about the security audit findings?"                  │ │
│ └─────────────────────────────────────────────────────────────┘ │
│                                                                   │
│ ✅ Excellent answer rate (80%) - most questions addressed        │
│ 💬 Mike Chen most inquisitive with 2 questions                   │
│                                                                   │
│ ┌─ Questions by Speaker ───────────────────────────────────────┐│
│ │ Emily Davis: 2    Mike Chen: 2    Sarah Johnson: 1         ││
│ └─────────────────────────────────────────────────────────────┘│
└─────────────────────────────────────────────────────────────────┘
```

**Features:**
- Filter by status (all/answered/unanswered)
- Real-time search
- Answer tracking with timestamps
- Click to jump to question in transcript
- Speaker breakdown
- Answer rate calculation

---

### 6. EngagementScore - Overall Rating

```
┌─────────────────────────────────────────────────────────────────┐
│ 🎯 Engagement Score                                             │
│                                                                   │
│                        ╭───────╮                                 │
│                    ╭───┤   85  ├───╮                            │
│                ╭───┤   │[Excellent]│   ├───╮                    │
│            ╭───┤   │   ╰───────╯   │   │   ├───╮               │
│        ╭───┤   │   │       ●        │   │   │   ├───╮          │
│        │   ╰───┴───┴───────────────┴───┴───╯   │               │
│        0                                       100               │
│                                                                   │
│ vs. Previous Meeting:  📈 +12.5%                                │
│                                                                   │
│ ℹ️ Exceptional engagement with balanced participation            │
│                                                                   │
│ ┌─ Engagement Factors ──────────────────────────────────────┐  │
│ │ 👥 Participation Balance    78  ████████░░░  [78%]        │  │
│ │    How evenly participants contributed                     │  │
│ │                                                             │  │
│ │ 💬 Question Rate            88  ████████▓░  [88%]         │  │
│ │    Frequency of questions asked                            │  │
│ │                                                             │  │
│ │ ⚡ Interaction Level        92  █████████░  [92%]         │  │
│ │    Active exchanges and responses                          │  │
│ └────────────────────────────────────────────────────────────┘  │
│                                                                   │
│ ┌─ Recommendations ──────────────────────────────────────────┐  │
│ │ ✅ Great engagement! Continue these meeting practices      │  │
│ └────────────────────────────────────────────────────────────┘  │
│                                                                   │
│ Score Guide: 🟢 85-100 Excellent | 🔵 70-84 Good |              │
│              🟡 50-69 Fair | 🔴 0-49 Poor                        │
└─────────────────────────────────────────────────────────────────┘
```

**Scoring Breakdown:**
- **Overall Score:** Composite metric (0-100)
- **Participation Balance:** Talk time distribution equality
- **Question Rate:** Questions per minute
- **Interaction Level:** Back-and-forth exchanges

**Features:**
- Radial progress chart
- Comparison to previous meeting
- Factor-specific progress bars
- Contextual recommendations
- Score interpretation guide

---

## Color Coding System

### Sentiment Colors
- 🟢 **Green (#22c55e):** Positive (>0.5)
- 🔵 **Blue (#3b82f6):** Neutral (-0.2 to 0.5)
- 🔴 **Red (#ef4444):** Negative (<-0.2)

### Status Colors
- ✅ **Green:** Success, Answered, Good
- ⚠️ **Amber (#f59e0b):** Warning, Attention needed
- ❌ **Red:** Error, Unanswered, Poor
- 💜 **Purple (#7a5af8):** Primary brand color
- 🔷 **Teal (#14b8a6):** Accent, Interactive elements

### Speaker Colors (10 distinct)
1. Purple (#7a5af8)
2. Blue (#3b82f6)
3. Green (#22c55e)
4. Amber (#f59e0b)
5. Red (#ef4444)
6. Violet (#8b5cf6)
7. Cyan (#06b6d4)
8. Pink (#ec4899)
9. Teal (#14b8a6)
10. Orange (#f97316)

---

## Interactive Elements

### Clickable Areas
- ✓ Tab navigation buttons
- ✓ Chart segments (pie, bar)
- ✓ Legend items
- ✓ Topic tags
- ✓ Question cards
- ✓ Notable moments
- ✓ Filter buttons

### Hover Effects
- ✓ Detailed tooltips on all charts
- ✓ Card elevation on hover
- ✓ Button state changes
- ✓ Chart segment highlighting

### Keyboard Navigation
- ✓ Tab through interactive elements
- ✓ Enter to activate buttons
- ✓ Arrow keys for chart navigation

---

## Responsive Breakpoints

### Mobile (< 640px)
- Single column layout
- Stacked metric cards
- Simplified charts
- Collapsed legends

### Tablet (640px - 1024px)
- Two column grid
- Full-featured charts
- Expanded legends

### Desktop (> 1024px)
- Multi-column layouts
- Side-by-side comparisons
- Maximum chart detail

---

## Animation & Transitions

### Chart Animations
- **Duration:** 800ms ease-in-out
- **Type:** Smooth path transitions
- **Delay:** Staggered for visual hierarchy

### Card Transitions
- **Duration:** 300ms
- **Properties:** Background, border, scale
- **Hover scale:** 1.02x

### Tab Switching
- **Duration:** 200ms
- **Type:** Fade in/out
- **Easing:** Cubic bezier

---

## Accessibility Features

### Screen Readers
- Semantic HTML structure
- ARIA labels on interactive elements
- Alt text for visual indicators
- Table markup for data

### Keyboard Navigation
- Focus indicators
- Logical tab order
- Enter/Space activation
- Escape to close modals

### Color Contrast
- WCAG AA compliant
- 4.5:1 text contrast
- 3:1 UI element contrast
- Alternative indicators (not color-only)

---

## Print & Export Ready

### PDF Export Layout
- Page breaks at logical sections
- Chart rasterization at high DPI
- Header with meeting metadata
- Footer with page numbers

### CSV Export Format
- One row per data point
- Headers with units
- Timestamp formatting
- Speaker normalization

---

## Browser Support

### Fully Supported
- Chrome 90+
- Firefox 88+
- Safari 14+
- Edge 90+

### Graceful Degradation
- Older browsers: Static charts
- No JS: Server-rendered tables
- Reduced motion: No animations

---

This visual guide demonstrates the comprehensive design system and user experience
of the Meeting Insights Panel, ensuring consistency, usability, and accessibility
across all analytics components.
