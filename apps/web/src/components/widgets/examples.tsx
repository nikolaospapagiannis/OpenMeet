/**
 * Widget Component Examples
 *
 * This file demonstrates usage of all widget components.
 * Copy these examples into your pages/components as needed.
 */

import { useState } from 'react';
import {
  SearchBar,
  FileUploader,
  ProgressTracker,
  QuickActionsMenu,
  NotificationCenter,
  UserProfileMenu,
  LoadingOverlay,
  DateRangePicker,
  type Notification
} from '@/components/widgets';
import { Upload, FileText, Calendar, Settings } from 'lucide-react';

// Example 1: Search Bar
export function SearchBarExample() {
  const handleSearch = (query: string, filters: string[]) => {
    console.log('Search:', { query, filters });
    // Implement your search logic
  };

  return (
    <SearchBar
      onSearch={handleSearch}
      placeholder="Search meetings, transcripts, or topics..."
      autoFocus
    />
  );
}

// Example 2: File Uploader
export function FileUploaderExample() {
  const handleUpload = async (files: File[]) => {
    console.log('Uploading files:', files);
    // Simulate upload
    await new Promise(resolve => setTimeout(resolve, 2000));
    console.log('Upload complete');
  };

  return (
    <FileUploader
      onUpload={handleUpload}
      accept="audio/*,video/*,.mp3,.mp4,.wav,.m4a"
      maxSize={100 * 1024 * 1024} // 100MB
      multiple
    />
  );
}

// Example 3: Progress Tracker
export function ProgressTrackerExample() {
  const [currentStep, setCurrentStep] = useState(1);

  const steps = [
    { label: 'Upload', description: 'Upload your audio file' },
    { label: 'Process', description: 'Processing audio data' },
    { label: 'Transcribe', description: 'Converting to text' },
    { label: 'Analyze', description: 'AI analysis in progress' },
    { label: 'Complete', description: 'Results ready' }
  ];

  return (
    <div className="space-y-6">
      <ProgressTracker
        steps={steps}
        currentStep={currentStep}
        variant="default"
      />
      <div className="flex gap-2">
        <button
          onClick={() => setCurrentStep(Math.max(0, currentStep - 1))}
          disabled={currentStep === 0}
          className="px-4 py-2 bg-slate-800 rounded-lg"
        >
          Previous
        </button>
        <button
          onClick={() => setCurrentStep(Math.min(steps.length - 1, currentStep + 1))}
          disabled={currentStep === steps.length - 1}
          className="px-4 py-2 bg-teal-500 rounded-lg"
        >
          Next
        </button>
      </div>
    </div>
  );
}

// Example 4: Quick Actions Menu
export function QuickActionsMenuExample() {
  const actions = [
    {
      icon: <Upload className="w-5 h-5" />,
      label: 'Upload Audio',
      onClick: () => alert('Upload clicked'),
      color: 'from-teal-500 to-cyan-500'
    },
    {
      icon: <FileText className="w-5 h-5" />,
      label: 'New Transcript',
      onClick: () => alert('Transcript clicked'),
      color: 'from-purple-500 to-indigo-500'
    },
    {
      icon: <Calendar className="w-5 h-5" />,
      label: 'Schedule Meeting',
      onClick: () => alert('Schedule clicked'),
      color: 'from-blue-500 to-cyan-500'
    },
    {
      icon: <Settings className="w-5 h-5" />,
      label: 'Settings',
      onClick: () => alert('Settings clicked'),
      color: 'from-slate-500 to-slate-600'
    }
  ];

  return (
    <QuickActionsMenu
      actions={actions}
      position="bottom-right"
    />
  );
}

// Example 5: Notification Center
export function NotificationCenterExample() {
  const [notifications, setNotifications] = useState<Notification[]>([
    {
      id: '1',
      type: 'success',
      title: 'Upload Complete',
      message: 'Your audio file "meeting-2024.mp3" has been processed successfully.',
      timestamp: new Date(Date.now() - 5 * 60000), // 5 minutes ago
      read: false,
      actionLabel: 'View Results',
      onAction: () => console.log('View results')
    },
    {
      id: '2',
      type: 'info',
      title: 'New Feature Available',
      message: 'Try our new AI-powered summary feature for better insights.',
      timestamp: new Date(Date.now() - 2 * 60 * 60000), // 2 hours ago
      read: false
    },
    {
      id: '3',
      type: 'warning',
      title: 'Storage Warning',
      message: 'You have used 80% of your storage quota. Consider upgrading.',
      timestamp: new Date(Date.now() - 24 * 60 * 60000), // 1 day ago
      read: true,
      actionLabel: 'Upgrade',
      onAction: () => console.log('Upgrade')
    },
    {
      id: '4',
      type: 'error',
      title: 'Processing Failed',
      message: 'Failed to process "audio.wav". Please check the file format.',
      timestamp: new Date(Date.now() - 3 * 24 * 60 * 60000), // 3 days ago
      read: true,
      actionLabel: 'Retry',
      onAction: () => console.log('Retry')
    }
  ]);

  const handleMarkAsRead = (id: string) => {
    setNotifications(notifications.map(n =>
      n.id === id ? { ...n, read: true } : n
    ));
  };

  const handleMarkAllAsRead = () => {
    setNotifications(notifications.map(n => ({ ...n, read: true })));
  };

  const handleDismiss = (id: string) => {
    setNotifications(notifications.filter(n => n.id !== id));
  };

  return (
    <NotificationCenter
      notifications={notifications}
      onMarkAsRead={handleMarkAsRead}
      onMarkAllAsRead={handleMarkAllAsRead}
      onDismiss={handleDismiss}
    />
  );
}

// Example 6: User Profile Menu
export function UserProfileMenuExample() {
  const user = {
    name: 'John Doe',
    email: 'john.doe@example.com',
    avatar: undefined, // Set to image URL if available
    role: 'Admin'
  };

  const handleLogout = () => {
    console.log('Logging out...');
    // Implement logout logic
  };

  return (
    <UserProfileMenu
      user={user}
      onLogout={handleLogout}
    />
  );
}

// Example 7: Loading Overlay
export function LoadingOverlayExample() {
  const [loading, setLoading] = useState(false);
  const [progress, setProgress] = useState(0);

  const simulateLoading = () => {
    setLoading(true);
    setProgress(0);

    const interval = setInterval(() => {
      setProgress(prev => {
        if (prev >= 100) {
          clearInterval(interval);
          setLoading(false);
          return 0;
        }
        return prev + 10;
      });
    }, 500);
  };

  return (
    <div>
      <button
        onClick={simulateLoading}
        className="px-6 py-3 bg-gradient-to-r from-teal-500 to-cyan-500 rounded-xl"
      >
        Start Loading
      </button>

      {loading && (
        <LoadingOverlay
          message="Processing your request..."
          progress={progress}
          variant="detailed"
        />
      )}
    </div>
  );
}

// Example 8: Date Range Picker
export function DateRangePickerExample() {
  const [dateRange, setDateRange] = useState<{
    start: Date | null;
    end: Date | null;
  }>({
    start: new Date(Date.now() - 7 * 24 * 60 * 60 * 1000), // 7 days ago
    end: new Date()
  });

  const handleDateChange = (range: { start: Date | null; end: Date | null }) => {
    console.log('Date range changed:', range);
    setDateRange(range);
  };

  return (
    <div className="space-y-4">
      <DateRangePicker
        value={dateRange}
        onChange={handleDateChange}
        placeholder="Select date range for analytics"
      />
      <div className="text-sm text-slate-400">
        Selected: {dateRange.start?.toLocaleDateString()} to {dateRange.end?.toLocaleDateString()}
      </div>
    </div>
  );
}

// Complete Dashboard Header Example
export function DashboardHeaderExample() {
  return (
    <header className="flex items-center gap-4 p-6 bg-slate-900/30 backdrop-blur-xl border-b border-white/10">
      {/* Logo */}
      <div className="text-xl font-bold text-white">
        OpenMeet
      </div>

      {/* Search */}
      <div className="flex-1 max-w-2xl">
        <SearchBarExample />
      </div>

      {/* Actions */}
      <div className="flex items-center gap-3">
        <NotificationCenterExample />
        <UserProfileMenuExample />
      </div>
    </header>
  );
}

// Upload Flow Example
export function UploadFlowExample() {
  const [step, setStep] = useState(0);
  const [loading, setLoading] = useState(false);
  const [progress, setProgress] = useState(0);

  const steps = [
    { label: 'Upload', description: 'Select and upload files' },
    { label: 'Process', description: 'Processing audio' },
    { label: 'Transcribe', description: 'Generating transcript' },
    { label: 'Complete', description: 'Ready to view' }
  ];

  const handleUpload = async (files: File[]) => {
    setLoading(true);
    setProgress(0);

    // Simulate upload with progress
    for (let i = 0; i <= 100; i += 20) {
      setProgress(i);
      await new Promise(resolve => setTimeout(resolve, 500));
    }

    setLoading(false);
    setStep(step + 1);
  };

  return (
    <div className="max-w-3xl mx-auto space-y-8 p-6">
      <ProgressTracker
        steps={steps}
        currentStep={step}
      />

      {step === 0 && (
        <FileUploader
          onUpload={handleUpload}
          accept="audio/*,video/*"
          multiple
        />
      )}

      {loading && (
        <LoadingOverlay
          message={`Processing step ${step + 1} of ${steps.length}...`}
          progress={progress}
          variant="detailed"
        />
      )}

      {step > 0 && step < steps.length && (
        <div className="text-center space-y-4">
          <p className="text-slate-300">
            {steps[step].description}
          </p>
          <button
            onClick={() => setStep(step + 1)}
            className="px-6 py-3 bg-gradient-to-r from-teal-500 to-cyan-500 rounded-xl"
          >
            Continue to Next Step
          </button>
        </div>
      )}

      {step === steps.length && (
        <div className="text-center space-y-4">
          <h2 className="text-2xl font-bold text-white">
            Upload Complete!
          </h2>
          <button
            onClick={() => setStep(0)}
            className="px-6 py-3 bg-gradient-to-r from-teal-500 to-cyan-500 rounded-xl"
          >
            Upload Another File
          </button>
        </div>
      )}
    </div>
  );
}

// Analytics Dashboard Example
export function AnalyticsDashboardExample() {
  const [dateRange, setDateRange] = useState<{
    start: Date | null;
    end: Date | null;
  }>({
    start: new Date(Date.now() - 30 * 24 * 60 * 60 * 1000),
    end: new Date()
  });

  return (
    <div className="space-y-6">
      {/* Header with filters */}
      <div className="flex flex-col sm:flex-row gap-4 items-start sm:items-center justify-between">
        <h1 className="text-2xl font-bold text-white">
          Analytics Dashboard
        </h1>
        <div className="flex gap-3">
          <DateRangePicker
            value={dateRange}
            onChange={setDateRange}
          />
          <SearchBar
            onSearch={(q, f) => console.log('Filter analytics', q, f)}
            placeholder="Filter data..."
          />
        </div>
      </div>

      {/* Analytics content would go here */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        {/* Your analytics cards/charts */}
      </div>
    </div>
  );
}
