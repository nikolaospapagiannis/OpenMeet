'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { Calendar, Clock, Users, Link as LinkIcon, Video, ArrowLeft, Sparkles } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { CardGlass, CardGlassContent, CardGlassHeader, CardGlassTitle, CardGlassDescription } from '@/components/ui/card-glass';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Textarea } from '@/components/ui/textarea';
import { useAuth } from '@/contexts/AuthContext';
import apiClient from '@/lib/api';
import Link from 'next/link';

export default function NewMeetingPage() {
  const router = useRouter();
  const { user } = useAuth();
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState('');

  const [formData, setFormData] = useState({
    title: '',
    platform: 'zoom',
    scheduledStartAt: '',
    scheduledEndAt: '',
    externalMeetingUrl: '',
    description: '',
    attendees: '',
  });

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    setIsLoading(true);

    try {
      const attendeeEmails = formData.attendees
        .split(',')
        .map((email) => email.trim())
        .filter((email) => email.length > 0);

      const meetingData = {
        title: formData.title,
        platform: formData.platform,
        scheduledStartAt: new Date(formData.scheduledStartAt).toISOString(),
        scheduledEndAt: new Date(formData.scheduledEndAt).toISOString(),
        externalMeetingUrl: formData.externalMeetingUrl || undefined,
        description: formData.description || undefined,
        attendees: attendeeEmails,
      };

      const meeting = await apiClient.createMeeting(meetingData);
      router.push(`/meetings/${meeting.id}`);
    } catch (err: any) {
      console.error('Failed to create meeting:', err);
      setError(err.response?.data?.message || 'Failed to create meeting. Please try again.');
    } finally {
      setIsLoading(false);
    }
  };

  const handleChange = (field: string, value: string) => {
    setFormData((prev) => ({ ...prev, [field]: value }));
  };

  // Calculate end time when start time changes (default 1 hour)
  const handleStartTimeChange = (value: string) => {
    handleChange('scheduledStartAt', value);
    if (!formData.scheduledEndAt && value) {
      const start = new Date(value);
      const end = new Date(start.getTime() + 60 * 60 * 1000); // +1 hour
      const endString = end.toISOString().slice(0, 16);
      handleChange('scheduledEndAt', endString);
    }
  };

  return (
    <div className="min-h-screen bg-[var(--ff-bg-dark)] p-8">
      <div className="max-w-4xl mx-auto">
        {/* Header */}
        <div className="mb-8">
          <Link href="/meetings">
            <Button
              variant="ghost"
              className="mb-4 text-[var(--ff-text-secondary)] hover:text-[var(--ff-text-primary)] hover:bg-[var(--ff-bg-layer)]"
            >
              <ArrowLeft className="h-4 w-4 mr-2" />
              Back to Meetings
            </Button>
          </Link>
          <h1 className="heading-l text-[var(--ff-text-primary)] mb-2">Schedule New Meeting</h1>
          <p className="paragraph-l text-[var(--ff-text-secondary)]">
            Create a new meeting and OpenMeet will automatically join to transcribe
          </p>
        </div>

        {/* Error Message */}
        {error && (
          <div className="bg-red-500/20 border border-red-500/30 text-red-400 px-4 py-3 rounded-xl mb-6">
            {error}
          </div>
        )}

        {/* Meeting Form */}
        <form onSubmit={handleSubmit}>
          <CardGlass>
            <CardGlassHeader>
              <CardGlassTitle>Meeting Details</CardGlassTitle>
              <CardGlassDescription>
                Fill in the meeting information. All fields marked with * are required.
              </CardGlassDescription>
            </CardGlassHeader>
            <CardGlassContent className="space-y-6">
              {/* Meeting Title */}
              <div className="space-y-2">
                <Label htmlFor="title" className="text-[var(--ff-text-primary)]">
                  Meeting Title *
                </Label>
                <Input
                  id="title"
                  value={formData.title}
                  onChange={(e) => handleChange('title', e.target.value)}
                  placeholder="e.g., Weekly Team Standup"
                  required
                  className="bg-[var(--ff-bg-layer)] border-[var(--ff-border)] text-[var(--ff-text-primary)] placeholder:text-[var(--ff-text-muted)] focus:border-purple-500 focus:ring-purple-500/20"
                />
              </div>

              {/* Platform Selection */}
              <div className="space-y-2">
                <Label htmlFor="platform" className="text-[var(--ff-text-primary)]">
                  <Video className="h-4 w-4 inline mr-2 text-purple-400" />
                  Platform *
                </Label>
                <Select
                  value={formData.platform}
                  onValueChange={(value) => handleChange('platform', value)}
                >
                  <SelectTrigger
                    id="platform"
                    className="bg-[var(--ff-bg-layer)] border-[var(--ff-border)] text-[var(--ff-text-primary)]"
                  >
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent className="bg-[var(--ff-bg-layer)] border-[var(--ff-border)]">
                    <SelectItem value="zoom">Zoom</SelectItem>
                    <SelectItem value="google_meet">Google Meet</SelectItem>
                    <SelectItem value="microsoft_teams">Microsoft Teams</SelectItem>
                    <SelectItem value="webex">Cisco Webex</SelectItem>
                    <SelectItem value="other">Other</SelectItem>
                  </SelectContent>
                </Select>
              </div>

              {/* Date and Time */}
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label htmlFor="startTime" className="text-[var(--ff-text-primary)]">
                    <Calendar className="h-4 w-4 inline mr-2 text-blue-400" />
                    Start Time *
                  </Label>
                  <Input
                    id="startTime"
                    type="datetime-local"
                    value={formData.scheduledStartAt}
                    onChange={(e) => handleStartTimeChange(e.target.value)}
                    required
                    className="bg-[var(--ff-bg-layer)] border-[var(--ff-border)] text-[var(--ff-text-primary)] focus:border-purple-500 focus:ring-purple-500/20"
                  />
                </div>

                <div className="space-y-2">
                  <Label htmlFor="endTime" className="text-[var(--ff-text-primary)]">
                    <Clock className="h-4 w-4 inline mr-2 text-orange-400" />
                    End Time *
                  </Label>
                  <Input
                    id="endTime"
                    type="datetime-local"
                    value={formData.scheduledEndAt}
                    onChange={(e) => handleChange('scheduledEndAt', e.target.value)}
                    required
                    className="bg-[var(--ff-bg-layer)] border-[var(--ff-border)] text-[var(--ff-text-primary)] focus:border-purple-500 focus:ring-purple-500/20"
                  />
                </div>
              </div>

              {/* Meeting URL */}
              <div className="space-y-2">
                <Label htmlFor="meetingUrl" className="text-[var(--ff-text-primary)]">
                  <LinkIcon className="h-4 w-4 inline mr-2 text-emerald-400" />
                  Meeting URL (Optional)
                </Label>
                <Input
                  id="meetingUrl"
                  type="url"
                  value={formData.externalMeetingUrl}
                  onChange={(e) => handleChange('externalMeetingUrl', e.target.value)}
                  placeholder="https://zoom.us/j/123456789"
                  className="bg-[var(--ff-bg-layer)] border-[var(--ff-border)] text-[var(--ff-text-primary)] placeholder:text-[var(--ff-text-muted)] focus:border-purple-500 focus:ring-purple-500/20"
                />
                <p className="text-sm text-[var(--ff-text-muted)]">
                  Enter the meeting link if you've already created one
                </p>
              </div>

              {/* Description */}
              <div className="space-y-2">
                <Label htmlFor="description" className="text-[var(--ff-text-primary)]">
                  Description (Optional)
                </Label>
                <Textarea
                  id="description"
                  value={formData.description}
                  onChange={(e) => handleChange('description', e.target.value)}
                  placeholder="Add meeting agenda, topics to discuss, or any other details..."
                  rows={4}
                  className="bg-[var(--ff-bg-layer)] border-[var(--ff-border)] text-[var(--ff-text-primary)] placeholder:text-[var(--ff-text-muted)] focus:border-purple-500 focus:ring-purple-500/20"
                />
              </div>

              {/* Attendees */}
              <div className="space-y-2">
                <Label htmlFor="attendees" className="text-[var(--ff-text-primary)]">
                  <Users className="h-4 w-4 inline mr-2 text-cyan-400" />
                  Attendees (Optional)
                </Label>
                <Input
                  id="attendees"
                  value={formData.attendees}
                  onChange={(e) => handleChange('attendees', e.target.value)}
                  placeholder="email1@example.com, email2@example.com"
                  className="bg-[var(--ff-bg-layer)] border-[var(--ff-border)] text-[var(--ff-text-primary)] placeholder:text-[var(--ff-text-muted)] focus:border-purple-500 focus:ring-purple-500/20"
                />
                <p className="text-sm text-[var(--ff-text-muted)]">
                  Separate multiple email addresses with commas
                </p>
              </div>

              {/* Bot Configuration */}
              <div className="bg-purple-500/10 border border-purple-500/30 rounded-xl p-5">
                <div className="flex items-center gap-2 mb-3">
                  <div className="w-8 h-8 bg-purple-500/20 rounded-lg flex items-center justify-center">
                    <Sparkles className="h-4 w-4 text-purple-400" />
                  </div>
                  <h4 className="font-semibold text-[var(--ff-text-primary)]">OpenMeet Bot Settings</h4>
                </div>
                <p className="text-sm text-[var(--ff-text-secondary)] mb-3">
                  The OpenMeet bot will automatically join this meeting and:
                </p>
                <ul className="space-y-2">
                  {[
                    'Record and transcribe the conversation',
                    'Generate meeting notes and action items',
                    'Create searchable transcripts with timestamps',
                    'Extract key topics and insights',
                  ].map((item, index) => (
                    <li key={index} className="flex items-center gap-2 text-sm text-[var(--ff-text-secondary)]">
                      <div className="w-1.5 h-1.5 bg-purple-400 rounded-full" />
                      {item}
                    </li>
                  ))}
                </ul>
              </div>

              {/* Submit Buttons */}
              <div className="flex gap-4 pt-4">
                <Button
                  type="submit"
                  disabled={isLoading}
                  className="flex-1 bg-gradient-to-r from-purple-600 to-purple-700 hover:from-purple-500 hover:to-purple-600 text-white border-0"
                >
                  {isLoading ? 'Creating...' : 'Schedule Meeting'}
                </Button>
                <Button
                  type="button"
                  variant="outline"
                  onClick={() => router.back()}
                  disabled={isLoading}
                  className="border-[var(--ff-border)] text-[var(--ff-text-primary)] hover:bg-[var(--ff-bg-layer)]"
                >
                  Cancel
                </Button>
              </div>
            </CardGlassContent>
          </CardGlass>
        </form>

        {/* Help Text */}
        <div className="mt-6 text-center text-sm text-[var(--ff-text-muted)]">
          Need help? Check out our{' '}
          <a href="/docs/scheduling" className="text-purple-400 hover:text-purple-300 transition-colors">
            meeting scheduling guide
          </a>
        </div>
      </div>
    </div>
  );
}
