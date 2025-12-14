'use client';

import { useState, useEffect } from 'react';
import { Button } from '@/components/ui/button';
import { Card } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import {
  Play,
  Square,
  Pause,
  Mic,
  MicOff,
  Video,
  VideoOff,
  Monitor,
  MonitorOff,
  Clock,
  Users,
  Settings,
  Maximize2,
  Copy,
  CheckCircle,
} from 'lucide-react';
import { toast } from 'sonner';
import { cn } from '@/lib/utils';

interface QuickRecordWidgetProps {
  enabled: boolean;
}

export default function QuickRecordWidget({ enabled }: QuickRecordWidgetProps) {
  const [isRecording, setIsRecording] = useState(false);
  const [isPaused, setIsPaused] = useState(false);
  const [recordingTime, setRecordingTime] = useState(0);
  const [meetingTitle, setMeetingTitle] = useState('');
  const [participants, setParticipants] = useState('');
  const [shareLink, setShareLink] = useState('');
  const [linkCopied, setLinkCopied] = useState(false);

  // Recording settings
  const [settings, setSettings] = useState({
    audio: true,
    video: false,
    screen: true,
  });

  // Active meeting detection
  const [activeMeeting, setActiveMeeting] = useState<{
    platform: string;
    url: string;
    title: string;
  } | null>(null);

  useEffect(() => {
    if (!enabled) return;

    // Check for active meeting
    const checkActiveMeeting = () => {
      // Send message to extension to check for active meeting
      window.postMessage({ type: 'NEBULA_CHECK_ACTIVE_MEETING' }, '*');
    };

    // Listen for response
    const handleMessage = (event: MessageEvent) => {
      if (event.data.type === 'NEBULA_ACTIVE_MEETING_FOUND') {
        setActiveMeeting(event.data.meeting);
        setMeetingTitle(event.data.meeting.title || '');
      }
    };

    window.addEventListener('message', handleMessage);
    checkActiveMeeting();

    return () => {
      window.removeEventListener('message', handleMessage);
    };
  }, [enabled]);

  useEffect(() => {
    if (!isRecording || isPaused) return;

    const interval = setInterval(() => {
      setRecordingTime(prev => prev + 1);
    }, 1000);

    return () => clearInterval(interval);
  }, [isRecording, isPaused]);

  const formatTime = (seconds: number) => {
    const hrs = Math.floor(seconds / 3600);
    const mins = Math.floor((seconds % 3600) / 60);
    const secs = seconds % 60;

    return [hrs, mins, secs]
      .map(val => val.toString().padStart(2, '0'))
      .join(':');
  };

  const startRecording = async () => {
    if (!enabled) {
      toast.error('Extension is not installed');
      return;
    }

    try {
      // Send start recording message to extension
      window.postMessage({
        type: 'NEBULA_START_RECORDING',
        data: {
          title: meetingTitle || 'Quick Recording',
          participants: participants.split(',').map(p => p.trim()).filter(Boolean),
          settings,
          platform: activeMeeting?.platform || 'manual',
          url: activeMeeting?.url || window.location.href,
        }
      }, '*');

      setIsRecording(true);
      setRecordingTime(0);
      toast.success('Recording started');

      // Generate share link
      const sessionId = Date.now().toString();
      setShareLink(`${window.location.origin}/meetings/${sessionId}/live`);
    } catch (error) {
      console.error('Failed to start recording:', error);
      toast.error('Failed to start recording');
    }
  };

  const pauseRecording = () => {
    window.postMessage({ type: 'NEBULA_PAUSE_RECORDING' }, '*');
    setIsPaused(true);
    toast.info('Recording paused');
  };

  const resumeRecording = () => {
    window.postMessage({ type: 'NEBULA_RESUME_RECORDING' }, '*');
    setIsPaused(false);
    toast.info('Recording resumed');
  };

  const stopRecording = () => {
    window.postMessage({ type: 'NEBULA_STOP_RECORDING' }, '*');
    setIsRecording(false);
    setIsPaused(false);
    setRecordingTime(0);
    toast.success('Recording stopped and saved');
  };

  const toggleSetting = (setting: keyof typeof settings) => {
    const newSettings = { ...settings, [setting]: !settings[setting] };
    setSettings(newSettings);

    // Update extension settings in real-time
    window.postMessage({
      type: 'NEBULA_UPDATE_RECORDING_SETTINGS',
      settings: newSettings,
    }, '*');
  };

  const copyShareLink = () => {
    navigator.clipboard.writeText(shareLink);
    setLinkCopied(true);
    toast.success('Share link copied to clipboard');
    setTimeout(() => setLinkCopied(false), 2000);
  };

  if (!enabled) {
    return (
      <Card className="p-6 text-center">
        <div className="space-y-3">
          <div className="text-muted-foreground">
            <Monitor className="h-12 w-12 mx-auto mb-3 opacity-50" />
            <p className="text-sm">Quick recording requires the extension to be installed</p>
          </div>
          <Button size="sm" variant="outline">
            Install Extension
          </Button>
        </div>
      </Card>
    );
  }

  return (
    <div className="space-y-4">
      {/* Active Meeting Alert */}
      {activeMeeting && !isRecording && (
        <div className="p-3 bg-green-50 dark:bg-green-950/30 border border-green-200 dark:border-green-900 rounded-lg">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <div className="h-2 w-2 bg-green-600 rounded-full animate-pulse" />
              <span className="text-sm font-medium text-green-900 dark:text-green-300">
                Active meeting detected on {activeMeeting.platform}
              </span>
            </div>
            <Button size="sm" onClick={startRecording}>
              Start Recording
            </Button>
          </div>
        </div>
      )}

      {/* Recording Status */}
      {isRecording && (
        <Card className={cn(
          "p-4 border-2",
          isPaused ? "border-yellow-500 bg-yellow-50/50 dark:bg-yellow-950/20" : "border-red-500 bg-red-50/50 dark:bg-red-950/20"
        )}>
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              <div className={cn(
                "h-3 w-3 rounded-full",
                isPaused ? "bg-yellow-500" : "bg-red-500 animate-pulse"
              )} />
              <span className="font-semibold">
                {isPaused ? 'Recording Paused' : 'Recording Active'}
              </span>
              <Badge variant="secondary" className="font-mono">
                {formatTime(recordingTime)}
              </Badge>
            </div>
            <div className="flex gap-2">
              {isPaused ? (
                <Button size="sm" variant="outline" onClick={resumeRecording}>
                  <Play className="h-4 w-4" />
                </Button>
              ) : (
                <Button size="sm" variant="outline" onClick={pauseRecording}>
                  <Pause className="h-4 w-4" />
                </Button>
              )}
              <Button size="sm" variant="destructive" onClick={stopRecording}>
                <Square className="h-4 w-4 mr-2" />
                Stop
              </Button>
            </div>
          </div>

          {/* Live Share Link */}
          {shareLink && (
            <div className="mt-4 pt-4 border-t">
              <Label className="text-xs text-muted-foreground">Share Link</Label>
              <div className="flex gap-2 mt-1">
                <Input
                  value={shareLink}
                  readOnly
                  className="text-xs"
                />
                <Button size="sm" variant="outline" onClick={copyShareLink}>
                  {linkCopied ? (
                    <CheckCircle className="h-4 w-4 text-green-600" />
                  ) : (
                    <Copy className="h-4 w-4" />
                  )}
                </Button>
              </div>
            </div>
          )}
        </Card>
      )}

      {/* Recording Controls */}
      {!isRecording && (
        <Card className="p-4">
          <div className="space-y-4">
            {/* Meeting Details */}
            <div className="space-y-3">
              <div>
                <Label htmlFor="title" className="text-xs">Meeting Title</Label>
                <Input
                  id="title"
                  placeholder="Enter meeting title (optional)"
                  value={meetingTitle}
                  onChange={(e) => setMeetingTitle(e.target.value)}
                  className="mt-1"
                />
              </div>
              <div>
                <Label htmlFor="participants" className="text-xs">Participants</Label>
                <Input
                  id="participants"
                  placeholder="John Doe, Jane Smith (comma separated)"
                  value={participants}
                  onChange={(e) => setParticipants(e.target.value)}
                  className="mt-1"
                />
              </div>
            </div>

            {/* Recording Options */}
            <div className="flex flex-wrap gap-2">
              <Button
                variant={settings.audio ? "default" : "outline"}
                size="sm"
                onClick={() => toggleSetting('audio')}
              >
                {settings.audio ? <Mic className="h-4 w-4" /> : <MicOff className="h-4 w-4" />}
              </Button>
              <Button
                variant={settings.video ? "default" : "outline"}
                size="sm"
                onClick={() => toggleSetting('video')}
              >
                {settings.video ? <Video className="h-4 w-4" /> : <VideoOff className="h-4 w-4" />}
              </Button>
              <Button
                variant={settings.screen ? "default" : "outline"}
                size="sm"
                onClick={() => toggleSetting('screen')}
              >
                {settings.screen ? <Monitor className="h-4 w-4" /> : <MonitorOff className="h-4 w-4" />}
              </Button>
            </div>

            {/* Start Button */}
            <Button
              onClick={startRecording}
              className="w-full"
              size="lg"
              disabled={!settings.audio && !settings.video && !settings.screen}
            >
              <Play className="mr-2 h-5 w-5" />
              Start Recording
            </Button>

            {/* Quick Actions */}
            <div className="flex gap-2 text-xs">
              <Button variant="ghost" size="sm">
                <Clock className="mr-1 h-3 w-3" />
                Schedule
              </Button>
              <Button variant="ghost" size="sm">
                <Users className="mr-1 h-3 w-3" />
                Invite
              </Button>
              <Button variant="ghost" size="sm">
                <Settings className="mr-1 h-3 w-3" />
                Settings
              </Button>
              <Button variant="ghost" size="sm">
                <Maximize2 className="mr-1 h-3 w-3" />
                Fullscreen
              </Button>
            </div>
          </div>
        </Card>
      )}

      {/* Recording Tips */}
      <div className="text-xs text-muted-foreground space-y-1">
        <p>• Ensure you have permission to record meetings</p>
        <p>• Audio recording is required for transcription</p>
        <p>• Screen recording captures presentations and shared content</p>
      </div>
    </div>
  );
}