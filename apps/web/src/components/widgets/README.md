# Widget Components

Production-ready, reusable widget components with glassmorphism styling and full functionality.

## Overview

This directory contains 8 essential widgets built with:
- Glassmorphism design system
- TypeScript for type safety
- Lucide React icons
- Full accessibility support
- Responsive behavior
- Smooth animations and transitions

## Components

### 1. SearchBar (189 lines)

Global search component with advanced filtering capabilities.

**Features:**
- Real-time search input
- Dropdown filter system (10 preset filters)
- Active filter badges with removal
- Keyboard shortcuts (Enter to search, Escape to clear)
- Auto-search on filter toggle
- Clear all functionality

**Usage:**
```tsx
import { SearchBar } from '@/components/widgets';

<SearchBar
  onSearch={(query, filters) => handleSearch(query, filters)}
  placeholder="Search meetings, transcripts..."
  autoFocus
/>
```

**Props:**
- `onSearch: (query: string, filters: string[]) => void` - Search callback
- `placeholder?: string` - Input placeholder text
- `className?: string` - Additional CSS classes
- `autoFocus?: boolean` - Auto-focus input on mount

---

### 2. FileUploader (275 lines)

Drag-and-drop file uploader with validation and preview.

**Features:**
- Drag and drop interface
- File validation (type and size)
- Multiple file support
- Upload progress tracking
- File status indicators (pending/success/error)
- Preview with file details
- Auto-clear after successful upload

**Usage:**
```tsx
import { FileUploader } from '@/components/widgets';

<FileUploader
  onUpload={async (files) => await uploadFiles(files)}
  accept="audio/*,video/*"
  maxSize={100 * 1024 * 1024} // 100MB
  multiple
/>
```

**Props:**
- `onUpload: (files: File[]) => Promise<void>` - Upload handler
- `accept?: string` - Accepted file types (default: audio/video)
- `maxSize?: number` - Max file size in bytes (default: 100MB)
- `multiple?: boolean` - Allow multiple files (default: false)
- `className?: string` - Additional CSS classes

---

### 3. ProgressTracker (155 lines)

Multi-step progress indicator with animations.

**Features:**
- Visual step progression
- Animated progress line
- Step status indicators (completed/current/upcoming)
- Optional step descriptions
- Compact variant for mobile
- Pulse animation on current step
- Percentage completion display

**Usage:**
```tsx
import { ProgressTracker } from '@/components/widgets';

<ProgressTracker
  steps={[
    { label: 'Upload', description: 'Upload your file' },
    { label: 'Process', description: 'Processing audio' },
    { label: 'Analyze', description: 'AI analysis' },
    { label: 'Complete', description: 'Results ready' }
  ]}
  currentStep={1}
  variant="default"
/>
```

**Props:**
- `steps: Step[]` - Array of steps with label and optional description
- `currentStep: number` - Current step index (0-based)
- `className?: string` - Additional CSS classes
- `variant?: 'default' | 'compact'` - Display variant

---

### 4. QuickActionsMenu (159 lines)

Floating Action Button (FAB) with action menu.

**Features:**
- Animated FAB with ripple effects
- Expandable action menu
- Customizable actions with icons
- Color-coded action buttons
- Backdrop overlay when open
- Smooth open/close animations
- Position customization

**Usage:**
```tsx
import { QuickActionsMenu } from '@/components/widgets';

<QuickActionsMenu
  actions={[
    {
      icon: <Upload className="w-5 h-5" />,
      label: 'Upload Audio',
      onClick: () => handleUpload(),
      color: 'from-teal-500 to-cyan-500'
    }
  ]}
  position="bottom-right"
/>
```

**Props:**
- `actions?: Action[]` - Array of actions (uses defaults if not provided)
- `className?: string` - Additional CSS classes
- `position?: 'bottom-right' | 'bottom-left' | 'top-right' | 'top-left'` - FAB position

---

### 5. NotificationCenter (266 lines)

Notification dropdown with badge and filtering.

**Features:**
- Unread count badge with animation
- Notification types (info/success/warning/error)
- Mark as read functionality
- Mark all as read option
- Individual dismissal
- Timestamp formatting (relative time)
- Action buttons on notifications
- Custom scrollbar styling

**Usage:**
```tsx
import { NotificationCenter, type Notification } from '@/components/widgets';

const notifications: Notification[] = [
  {
    id: '1',
    type: 'success',
    title: 'Upload Complete',
    message: 'Your file has been processed successfully.',
    timestamp: new Date(),
    read: false,
    actionLabel: 'View',
    onAction: () => navigate('/results')
  }
];

<NotificationCenter
  notifications={notifications}
  onMarkAsRead={(id) => markRead(id)}
  onMarkAllAsRead={() => markAllRead()}
  onDismiss={(id) => dismiss(id)}
/>
```

**Props:**
- `notifications: Notification[]` - Array of notifications
- `onMarkAsRead: (id: string) => void` - Mark single as read
- `onMarkAllAsRead: () => void` - Mark all as read
- `onDismiss: (id: string) => void` - Dismiss notification
- `className?: string` - Additional CSS classes

**Types:**
```typescript
type NotificationType = 'info' | 'success' | 'warning' | 'error';

interface Notification {
  id: string;
  type: NotificationType;
  title: string;
  message: string;
  timestamp: Date;
  read: boolean;
  actionLabel?: string;
  onAction?: () => void;
}
```

---

### 6. UserProfileMenu (224 lines)

User profile dropdown with account actions.

**Features:**
- Avatar with initials or image
- User info display (name, email, role)
- Online status indicator
- Customizable menu items
- Dividers between sections
- Danger actions (logout) with red styling
- Responsive (hides name on mobile)

**Usage:**
```tsx
import { UserProfileMenu } from '@/components/widgets';

<UserProfileMenu
  user={{
    name: 'John Doe',
    email: 'john@example.com',
    avatar: '/avatar.jpg',
    role: 'Admin'
  }}
  onLogout={() => handleLogout()}
/>
```

**Props:**
- `user: UserProfile` - User information
- `menuItems?: MenuItem[]` - Custom menu items (uses defaults if not provided)
- `onLogout?: () => void` - Logout handler
- `className?: string` - Additional CSS classes

**Types:**
```typescript
interface UserProfile {
  name: string;
  email: string;
  avatar?: string;
  role?: string;
}

interface MenuItem {
  icon: React.ReactNode;
  label: string;
  onClick: () => void;
  divider?: boolean;
  danger?: boolean;
}
```

---

### 7. LoadingOverlay (115 lines)

Full-screen loading overlay with progress tracking.

**Features:**
- Full-screen backdrop with blur
- Animated spinner with gradient rings
- Pulsing glow effects
- Optional progress bar
- Loading message display
- Three variants (default/minimal/detailed)
- Shimmer animation on progress bar

**Usage:**
```tsx
import { LoadingOverlay } from '@/components/widgets';

<LoadingOverlay
  message="Processing your audio..."
  progress={45}
  variant="detailed"
/>
```

**Props:**
- `message?: string` - Loading message (default: "Loading...")
- `progress?: number` - Progress percentage (0-100)
- `className?: string` - Additional CSS classes
- `variant?: 'default' | 'minimal' | 'detailed'` - Display variant

---

### 8. DateRangePicker (331 lines)

Date range selector with calendar and presets.

**Features:**
- Interactive calendar grid
- Month navigation
- Quick preset options (Today, Last 7 days, etc.)
- Visual range selection
- Today indicator
- Two-step selection (start then end)
- Clear functionality
- Apply/Cancel actions

**Usage:**
```tsx
import { DateRangePicker } from '@/components/widgets';

<DateRangePicker
  value={{ start: new Date(), end: new Date() }}
  onChange={(range) => handleDateChange(range)}
  placeholder="Select date range"
/>
```

**Props:**
- `value?: DateRange` - Current date range
- `onChange: (range: DateRange) => void` - Change handler
- `placeholder?: string` - Placeholder text
- `className?: string` - Additional CSS classes
- `presets?: { label: string; value: DateRange }[]` - Custom presets

**Types:**
```typescript
interface DateRange {
  start: Date | null;
  end: Date | null;
}
```

---

## Design System Integration

All widgets use the unified design system:

### Colors
- **Primary:** Teal-500 to Cyan-500 gradient
- **Success:** Green-500 to Emerald-500 gradient
- **Warning:** Yellow-500 to Orange-500 gradient
- **Error:** Red-500 to Rose-500 gradient
- **Background:** Slate-900 with transparency

### Components Used
- `CardGlass` - Glassmorphism containers
- `Button` (button-v2) - All button variants
- `Badge` - Status and filter badges
- Lucide React - Icon library

### Animations
- Fade in/out transitions
- Slide animations
- Scale transforms on hover
- Pulse effects for active states
- Shimmer animations
- Ripple effects

### Accessibility
- Keyboard navigation support
- ARIA labels where needed
- Focus states with ring indicators
- Proper semantic HTML
- Screen reader friendly

---

## Styling Guidelines

All widgets follow these conventions:

1. **Glassmorphism:** `bg-slate-900/50 backdrop-blur-xl border border-white/10`
2. **Hover States:** Increase opacity/brightness on hover
3. **Active States:** Scale down slightly (`scale-95`)
4. **Focus States:** Teal ring (`ring-2 ring-teal-500/50`)
5. **Transitions:** `transition-all duration-300`
6. **Shadows:** Teal/cyan glow effects on primary actions

---

## File Structure

```
widgets/
├── SearchBar.tsx           (189 lines)
├── FileUploader.tsx        (275 lines)
├── ProgressTracker.tsx     (155 lines)
├── QuickActionsMenu.tsx    (159 lines)
├── NotificationCenter.tsx  (266 lines)
├── UserProfileMenu.tsx     (224 lines)
├── LoadingOverlay.tsx      (115 lines)
├── DateRangePicker.tsx     (331 lines)
├── index.ts                (exports)
└── README.md               (documentation)
```

**Total:** 1,714 lines of production code

---

## Zero Tolerance Compliance

All components are:
- ✅ Production-ready (no TODOs)
- ✅ Fully typed with TypeScript
- ✅ Using real design system components
- ✅ Responsive and accessible
- ✅ With complete error handling
- ✅ Properly documented

---

## Usage Examples

### Complete Dashboard Header

```tsx
import {
  SearchBar,
  NotificationCenter,
  UserProfileMenu
} from '@/components/widgets';

function DashboardHeader() {
  return (
    <header className="flex items-center gap-4 p-4">
      <SearchBar
        onSearch={handleSearch}
        className="flex-1"
      />
      <NotificationCenter
        notifications={notifications}
        onMarkAsRead={markRead}
        onMarkAllAsRead={markAllRead}
        onDismiss={dismiss}
      />
      <UserProfileMenu
        user={currentUser}
        onLogout={handleLogout}
      />
    </header>
  );
}
```

### Upload Flow with Progress

```tsx
import {
  FileUploader,
  ProgressTracker,
  LoadingOverlay
} from '@/components/widgets';

function UploadPage() {
  const [step, setStep] = useState(0);
  const [loading, setLoading] = useState(false);

  return (
    <>
      <ProgressTracker
        steps={uploadSteps}
        currentStep={step}
      />
      <FileUploader
        onUpload={handleUpload}
        accept="audio/*"
        multiple
      />
      {loading && (
        <LoadingOverlay
          message="Uploading files..."
          progress={uploadProgress}
        />
      )}
    </>
  );
}
```

---

## Browser Support

- Chrome/Edge 90+
- Firefox 88+
- Safari 14+
- Mobile browsers (iOS Safari, Chrome Mobile)

---

## Performance

All widgets are optimized for performance:
- Lazy state updates
- Memoized callbacks where appropriate
- CSS transforms for animations (GPU-accelerated)
- Minimal re-renders
- Efficient event handlers

---

## Future Enhancements

Potential additions (not implemented):
- Toast notifications component
- Context menu widget
- Command palette
- Data table with sorting/filtering
- Chart widgets
- Timeline component
