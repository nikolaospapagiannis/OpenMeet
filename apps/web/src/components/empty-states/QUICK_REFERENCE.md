# Empty States - Quick Reference

## 🚀 Quick Start

```tsx
import { EmptyDashboard, EmptyRecentMeetings, EmptyTopics, SetupChecklist } from '@/components/empty-states';
```

## 📦 Components at a Glance

### EmptyDashboard
**When:** User has no meetings at all (brand new)
**Props:** `userName`, `setupProgress`
**Contains:** Welcome, progress bar, checklist, 4 action cards, help section

```tsx
<EmptyDashboard
  userName="John"
  setupProgress={{ profileComplete: true, calendarConnected: false, firstMeeting: false, teamInvited: false }}
/>
```

### EmptyRecentMeetings
**When:** Meetings section is empty
**Props:** None
**Contains:** Illustration, benefits list, upload + schedule CTAs

```tsx
<EmptyRecentMeetings />
```

### EmptyTopics
**When:** Topics section is empty
**Props:** None
**Contains:** Topic icons, feature highlights, upload CTA

```tsx
<EmptyTopics />
```

### SetupChecklist
**When:** Part of EmptyDashboard or standalone
**Props:** `setupProgress`
**Contains:** 4-step checklist with progress tracking

```tsx
<SetupChecklist
  setupProgress={{ profileComplete: true, calendarConnected: false, firstMeeting: false, teamInvited: false }}
/>
```

## 🎯 Dashboard Integration Pattern

```tsx
// 1. Track setup progress
const [setupProgress, setSetupProgress] = useState({
  profileComplete: !!(user?.firstName && user?.lastName),
  calendarConnected: false,
  firstMeeting: meetings.length > 0,
  teamInvited: false,
});

// 2. Detect new users
const isNewUser = meetings.length === 0 && !setupProgress.firstMeeting;

// 3. Conditional rendering
if (isNewUser) {
  return <EmptyDashboard userName={getUserFirstName()} setupProgress={setupProgress} />;
}

// 4. Section-specific empty states
<EmptyTopics />

{meetings.length === 0 ? <EmptyRecentMeetings /> : <MeetingsList />}
```

## 🎨 Color Codes

| Component | Color | Hex |
|-----------|-------|-----|
| Profile/Upload | Blue | `#3B82F6` |
| Calendar | Purple | `#A855F7` |
| AI/Meeting | Teal | `#14B8A6` |
| Team | Emerald | `#10B981` |
| External | Orange | `#F97316` |

## 🔗 Action Links

| Action | Route |
|--------|-------|
| Complete Profile | `/settings/profile` |
| Connect Calendar | `/settings/integrations` |
| Upload Meeting | `/meetings/upload` |
| Schedule Meeting | `/meetings/new` |
| Invite Team | `/settings/team` |
| View Docs | `/docs` |
| Contact Support | `/support` |
| Get Extension | Chrome Web Store |

## 📱 Responsive Breakpoints

- Mobile: `< 640px` - Single column, stacked buttons
- Tablet: `640px - 1024px` - 2 columns, side-by-side
- Desktop: `> 1024px` - Multi-column, full sidebar

## ✨ Key Features

### EmptyDashboard
- ✅ Personalized welcome
- ✅ Progress bar (animated)
- ✅ Setup checklist
- ✅ 4 action cards
- ✅ Help links

### EmptyRecentMeetings
- ✅ Animated icons
- ✅ 5 benefits listed
- ✅ Dual CTAs
- ✅ Format info

### EmptyTopics
- ✅ Visual examples
- ✅ 3 feature cards
- ✅ Educational text
- ✅ Single CTA

### SetupChecklist
- ✅ 4 steps tracked
- ✅ Progress calculation
- ✅ Interactive states
- ✅ Completion message

## 🎬 States

### SetupChecklist States
- **Completed:** Dimmed, checkmark, hover overlay
- **Next (Active):** Teal border, "Next" badge, highlighted
- **Pending:** Subtle, circle icon, action button

### Dashboard Views
- **New User:** Full EmptyDashboard
- **Some Progress:** Section-specific empty states
- **Has Data:** Normal dashboard with data

## 🛠️ Customization

### Change Progress Logic
```tsx
setSetupProgress({
  profileComplete: !!(user?.firstName && user?.lastName),
  calendarConnected: checkCalendarIntegration(), // Add your logic
  firstMeeting: meetings.length > 0,
  teamInvited: teamMembers.length > 0, // Add your logic
});
```

### Add More Checklist Items
Edit `SetupChecklist.tsx` and add to `checklistItems` array:
```tsx
{
  id: 'newItem',
  title: 'New Step',
  description: 'Description here',
  icon: IconComponent,
  actionLabel: 'Do Action',
  actionLink: '/path',
  color: { ... }
}
```

## 📊 File Sizes

| File | Lines | Size |
|------|-------|------|
| EmptyDashboard.tsx | 208 | 9.2KB |
| EmptyRecentMeetings.tsx | 99 | 3.9KB |
| EmptyTopics.tsx | 112 | 5.1KB |
| SetupChecklist.tsx | 222 | 7.7KB |
| **Total** | **650** | **26.2KB** |

## 🔍 Testing Checklist

- [ ] New user sees EmptyDashboard
- [ ] Progress bar calculates correctly
- [ ] All action buttons link correctly
- [ ] Checklist items show correct state
- [ ] "Next" badge on first incomplete item
- [ ] Completion message shows at 100%
- [ ] Empty meetings shows EmptyRecentMeetings
- [ ] Empty topics shows EmptyTopics
- [ ] Responsive on mobile/tablet/desktop
- [ ] Animations work smoothly
- [ ] All icons render correctly
- [ ] Color themes consistent

## 💡 Tips

1. **Progressive Disclosure:** Don't show everything at once
2. **Clear CTAs:** Every state needs a clear next action
3. **Benefits First:** Focus on what users get, not what's missing
4. **Real Data:** Track actual progress, no mocks
5. **Celebrate:** Acknowledge completion milestones

## 📚 Full Documentation

- **Component Docs:** `README.md` (in this directory)
- **Visual Guide:** `/EMPTY_STATES_VISUAL_GUIDE.md` (root)
- **Implementation Summary:** `/AGENT_8_IMPLEMENTATION_SUMMARY.md` (root)

---

**Last Updated:** 2025-12-09
**Version:** 1.0.0
**Status:** ✅ Production Ready
