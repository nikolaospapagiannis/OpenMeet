'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import {
  ArrowLeft,
  Save,
  Camera,
  User,
  Mail,
  Phone,
  Briefcase,
  Building2,
  MapPin,
  Globe,
  Linkedin,
  Twitter,
  AlertTriangle,
  Trash2,
} from 'lucide-react';

import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { CardGlass, CardGlassContent, CardGlassHeader, CardGlassTitle, CardGlassDescription } from '@/components/ui/card-glass';
import { useAuth } from '@/contexts/AuthContext';
import apiClient from '@/lib/api';

export default function ProfileSettingsPage() {
  const router = useRouter();
  const { user, updateUser } = useAuth();
  const [isLoading, setIsLoading] = useState(false);
  const [isSaving, setIsSaving] = useState(false);
  const [successMessage, setSuccessMessage] = useState('');
  const [profileData, setProfileData] = useState({
    firstName: '',
    lastName: '',
    email: '',
    phone: '',
    avatar: '',
    jobTitle: '',
    company: '',
    location: '',
    bio: '',
    linkedIn: '',
    twitter: '',
    website: '',
    language: 'en',
    timezone: 'America/Los_Angeles',
    dateFormat: 'MM/DD/YYYY',
  });

  useEffect(() => {
    if (user) {
      setProfileData({
        firstName: user.firstName || '',
        lastName: user.lastName || '',
        email: user.email || '',
        phone: '',
        avatar: user.avatar || '',
        jobTitle: '',
        company: '',
        location: '',
        bio: '',
        linkedIn: '',
        twitter: '',
        website: '',
        language: 'en',
        timezone: 'America/Los_Angeles',
        dateFormat: 'MM/DD/YYYY',
      });
    }
  }, [user]);

  const handleInputChange = (field: string, value: string) => {
    setProfileData(prev => ({
      ...prev,
      [field]: value,
    }));
  };

  const handleSaveProfile = async () => {
    setIsSaving(true);
    setSuccessMessage('');
    try {
      const updatedUser = await apiClient.updateProfile({
        firstName: profileData.firstName,
        lastName: profileData.lastName,
        phone: profileData.phone,
      });
      updateUser(updatedUser);
      setSuccessMessage('Profile updated successfully');
      setTimeout(() => setSuccessMessage(''), 3000);
    } catch (error) {
      console.error('Failed to update profile:', error);
    } finally {
      setIsSaving(false);
    }
  };

  const handleAvatarUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    setIsLoading(true);
    try {
      const { url } = await apiClient.uploadFile(file, 'avatar');
      setProfileData(prev => ({ ...prev, avatar: url }));
      const updatedUser = await apiClient.updateProfile({ avatar: url });
      updateUser(updatedUser);
    } catch (error) {
      console.error('Failed to upload avatar:', error);
    } finally {
      setIsLoading(false);
    }
  };

  const getInitials = (firstName: string, lastName: string) => {
    return `${firstName?.[0] || ''}${lastName?.[0] || ''}`.toUpperCase();
  };

  return (
    <div className="min-h-screen bg-[var(--ff-bg-dark)] p-8">
      <div className="max-w-4xl mx-auto">
        {/* Header */}
        <div className="flex items-center justify-between mb-8">
          <div className="flex items-center gap-4">
            <Button
              variant="ghost"
              onClick={() => router.push('/settings')}
              className="text-[var(--ff-text-secondary)] hover:text-[var(--ff-text-primary)] hover:bg-[var(--ff-bg-layer)]"
            >
              <ArrowLeft className="h-4 w-4 mr-2" />
              Back to Settings
            </Button>
          </div>
          <Button
            onClick={handleSaveProfile}
            disabled={isSaving}
            className="bg-gradient-to-r from-purple-600 to-purple-700 hover:from-purple-500 hover:to-purple-600 text-white border-0"
          >
            <Save className="h-4 w-4 mr-2" />
            {isSaving ? 'Saving...' : 'Save Changes'}
          </Button>
        </div>

        {/* Success Message */}
        {successMessage && (
          <div className="bg-emerald-500/20 border border-emerald-500/30 text-emerald-400 px-4 py-3 rounded-xl mb-6 flex items-center gap-2">
            <div className="w-2 h-2 bg-emerald-400 rounded-full" />
            {successMessage}
          </div>
        )}

        {/* Profile Picture Section */}
        <CardGlass className="mb-6">
          <CardGlassHeader>
            <CardGlassTitle className="flex items-center gap-2">
              <User className="h-5 w-5 text-purple-400" />
              Profile Picture
            </CardGlassTitle>
            <CardGlassDescription>
              Upload a profile picture to personalize your account
            </CardGlassDescription>
          </CardGlassHeader>
          <CardGlassContent>
            <div className="flex items-center gap-6">
              <div className="relative">
                <div className="w-24 h-24 rounded-full bg-gradient-to-br from-purple-500 to-purple-700 flex items-center justify-center text-2xl font-bold text-white overflow-hidden border-4 border-purple-500/30">
                  {profileData.avatar ? (
                    <img
                      src={profileData.avatar}
                      alt="Profile"
                      className="w-full h-full object-cover"
                    />
                  ) : (
                    getInitials(profileData.firstName, profileData.lastName)
                  )}
                </div>
                <label className="absolute bottom-0 right-0 bg-purple-600 hover:bg-purple-500 rounded-full p-2.5 cursor-pointer transition-colors border-2 border-[var(--ff-bg-dark)]">
                  <Camera className="h-4 w-4 text-white" />
                  <input
                    type="file"
                    accept="image/*"
                    onChange={handleAvatarUpload}
                    className="hidden"
                  />
                </label>
              </div>
              <div>
                <p className="text-sm text-[var(--ff-text-secondary)]">
                  Recommended: Square image, at least 400x400px
                </p>
                <p className="text-xs text-[var(--ff-text-muted)] mt-1">
                  JPG, PNG or GIF. Max file size: 5MB
                </p>
              </div>
            </div>
          </CardGlassContent>
        </CardGlass>

        {/* Personal Information */}
        <CardGlass className="mb-6">
          <CardGlassHeader>
            <CardGlassTitle className="flex items-center gap-2">
              <User className="h-5 w-5 text-blue-400" />
              Personal Information
            </CardGlassTitle>
            <CardGlassDescription>
              Update your personal details
            </CardGlassDescription>
          </CardGlassHeader>
          <CardGlassContent className="space-y-4">
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <label className="text-sm font-medium text-[var(--ff-text-primary)]">
                  First Name
                </label>
                <Input
                  type="text"
                  value={profileData.firstName}
                  onChange={(e) => handleInputChange('firstName', e.target.value)}
                  placeholder="John"
                  className="bg-[var(--ff-bg-layer)] border-[var(--ff-border)] text-[var(--ff-text-primary)] placeholder:text-[var(--ff-text-muted)] focus:border-purple-500"
                />
              </div>
              <div className="space-y-2">
                <label className="text-sm font-medium text-[var(--ff-text-primary)]">
                  Last Name
                </label>
                <Input
                  type="text"
                  value={profileData.lastName}
                  onChange={(e) => handleInputChange('lastName', e.target.value)}
                  placeholder="Doe"
                  className="bg-[var(--ff-bg-layer)] border-[var(--ff-border)] text-[var(--ff-text-primary)] placeholder:text-[var(--ff-text-muted)] focus:border-purple-500"
                />
              </div>
            </div>

            <div className="space-y-2">
              <label className="text-sm font-medium text-[var(--ff-text-primary)] flex items-center gap-2">
                <Mail className="h-4 w-4 text-[var(--ff-text-muted)]" />
                Email Address
              </label>
              <Input
                type="email"
                value={profileData.email}
                disabled
                className="bg-[var(--ff-bg-layer)]/50 border-[var(--ff-border)] text-[var(--ff-text-muted)] cursor-not-allowed"
              />
              <p className="text-xs text-[var(--ff-text-muted)]">
                Contact support to change your email address
              </p>
            </div>

            <div className="space-y-2">
              <label className="text-sm font-medium text-[var(--ff-text-primary)] flex items-center gap-2">
                <Phone className="h-4 w-4 text-[var(--ff-text-muted)]" />
                Phone Number
              </label>
              <Input
                type="tel"
                value={profileData.phone}
                onChange={(e) => handleInputChange('phone', e.target.value)}
                placeholder="+1 (555) 123-4567"
                className="bg-[var(--ff-bg-layer)] border-[var(--ff-border)] text-[var(--ff-text-primary)] placeholder:text-[var(--ff-text-muted)] focus:border-purple-500"
              />
            </div>
          </CardGlassContent>
        </CardGlass>

        {/* Professional Information */}
        <CardGlass className="mb-6">
          <CardGlassHeader>
            <CardGlassTitle className="flex items-center gap-2">
              <Briefcase className="h-5 w-5 text-emerald-400" />
              Professional Information
            </CardGlassTitle>
            <CardGlassDescription>
              Add your professional details
            </CardGlassDescription>
          </CardGlassHeader>
          <CardGlassContent className="space-y-4">
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <label className="text-sm font-medium text-[var(--ff-text-primary)]">
                  Job Title
                </label>
                <Input
                  type="text"
                  value={profileData.jobTitle}
                  onChange={(e) => handleInputChange('jobTitle', e.target.value)}
                  placeholder="Product Manager"
                  className="bg-[var(--ff-bg-layer)] border-[var(--ff-border)] text-[var(--ff-text-primary)] placeholder:text-[var(--ff-text-muted)] focus:border-purple-500"
                />
              </div>
              <div className="space-y-2">
                <label className="text-sm font-medium text-[var(--ff-text-primary)] flex items-center gap-2">
                  <Building2 className="h-4 w-4 text-[var(--ff-text-muted)]" />
                  Company
                </label>
                <Input
                  type="text"
                  value={profileData.company}
                  onChange={(e) => handleInputChange('company', e.target.value)}
                  placeholder="Acme Inc."
                  className="bg-[var(--ff-bg-layer)] border-[var(--ff-border)] text-[var(--ff-text-primary)] placeholder:text-[var(--ff-text-muted)] focus:border-purple-500"
                />
              </div>
            </div>

            <div className="space-y-2">
              <label className="text-sm font-medium text-[var(--ff-text-primary)] flex items-center gap-2">
                <MapPin className="h-4 w-4 text-[var(--ff-text-muted)]" />
                Location
              </label>
              <Input
                type="text"
                value={profileData.location}
                onChange={(e) => handleInputChange('location', e.target.value)}
                placeholder="San Francisco, CA"
                className="bg-[var(--ff-bg-layer)] border-[var(--ff-border)] text-[var(--ff-text-primary)] placeholder:text-[var(--ff-text-muted)] focus:border-purple-500"
              />
            </div>

            <div className="space-y-2">
              <label className="text-sm font-medium text-[var(--ff-text-primary)]">
                Bio
              </label>
              <Textarea
                value={profileData.bio}
                onChange={(e) => handleInputChange('bio', e.target.value)}
                placeholder="Tell us a bit about yourself..."
                rows={4}
                className="bg-[var(--ff-bg-layer)] border-[var(--ff-border)] text-[var(--ff-text-primary)] placeholder:text-[var(--ff-text-muted)] focus:border-purple-500"
              />
              <p className="text-xs text-[var(--ff-text-muted)]">
                {profileData.bio.length}/500
              </p>
            </div>
          </CardGlassContent>
        </CardGlass>

        {/* Social Links */}
        <CardGlass className="mb-6">
          <CardGlassHeader>
            <CardGlassTitle className="flex items-center gap-2">
              <Globe className="h-5 w-5 text-cyan-400" />
              Social Links
            </CardGlassTitle>
            <CardGlassDescription>
              Connect your social profiles
            </CardGlassDescription>
          </CardGlassHeader>
          <CardGlassContent className="space-y-4">
            <div className="space-y-2">
              <label className="text-sm font-medium text-[var(--ff-text-primary)] flex items-center gap-2">
                <Linkedin className="h-4 w-4 text-blue-500" />
                LinkedIn
              </label>
              <Input
                type="url"
                value={profileData.linkedIn}
                onChange={(e) => handleInputChange('linkedIn', e.target.value)}
                placeholder="https://linkedin.com/in/johndoe"
                className="bg-[var(--ff-bg-layer)] border-[var(--ff-border)] text-[var(--ff-text-primary)] placeholder:text-[var(--ff-text-muted)] focus:border-purple-500"
              />
            </div>

            <div className="space-y-2">
              <label className="text-sm font-medium text-[var(--ff-text-primary)] flex items-center gap-2">
                <Twitter className="h-4 w-4 text-sky-500" />
                Twitter
              </label>
              <Input
                type="url"
                value={profileData.twitter}
                onChange={(e) => handleInputChange('twitter', e.target.value)}
                placeholder="https://twitter.com/johndoe"
                className="bg-[var(--ff-bg-layer)] border-[var(--ff-border)] text-[var(--ff-text-primary)] placeholder:text-[var(--ff-text-muted)] focus:border-purple-500"
              />
            </div>

            <div className="space-y-2">
              <label className="text-sm font-medium text-[var(--ff-text-primary)] flex items-center gap-2">
                <Globe className="h-4 w-4 text-[var(--ff-text-muted)]" />
                Website
              </label>
              <Input
                type="url"
                value={profileData.website}
                onChange={(e) => handleInputChange('website', e.target.value)}
                placeholder="https://example.com"
                className="bg-[var(--ff-bg-layer)] border-[var(--ff-border)] text-[var(--ff-text-primary)] placeholder:text-[var(--ff-text-muted)] focus:border-purple-500"
              />
            </div>
          </CardGlassContent>
        </CardGlass>

        {/* Preferences */}
        <CardGlass className="mb-6">
          <CardGlassHeader>
            <CardGlassTitle>Preferences</CardGlassTitle>
            <CardGlassDescription>
              Customize your experience
            </CardGlassDescription>
          </CardGlassHeader>
          <CardGlassContent className="space-y-4">
            <div className="space-y-2">
              <label className="text-sm font-medium text-[var(--ff-text-primary)]">
                Language
              </label>
              <select
                value={profileData.language}
                onChange={(e) => handleInputChange('language', e.target.value)}
                className="w-full px-3 py-2 rounded-lg bg-[var(--ff-bg-layer)] border border-[var(--ff-border)] text-[var(--ff-text-primary)] focus:border-purple-500 focus:ring-2 focus:ring-purple-500/20 outline-none"
              >
                <option value="en">English (US)</option>
                <option value="es">Spanish</option>
                <option value="fr">French</option>
                <option value="de">German</option>
                <option value="ja">Japanese</option>
              </select>
            </div>

            <div className="space-y-2">
              <label className="text-sm font-medium text-[var(--ff-text-primary)]">
                Timezone
              </label>
              <select
                value={profileData.timezone}
                onChange={(e) => handleInputChange('timezone', e.target.value)}
                className="w-full px-3 py-2 rounded-lg bg-[var(--ff-bg-layer)] border border-[var(--ff-border)] text-[var(--ff-text-primary)] focus:border-purple-500 focus:ring-2 focus:ring-purple-500/20 outline-none"
              >
                <option value="America/Los_Angeles">Pacific Time (PT)</option>
                <option value="America/New_York">Eastern Time (ET)</option>
                <option value="America/Chicago">Central Time (CT)</option>
                <option value="America/Denver">Mountain Time (MT)</option>
                <option value="UTC">UTC</option>
              </select>
            </div>

            <div className="space-y-2">
              <label className="text-sm font-medium text-[var(--ff-text-primary)]">
                Date Format
              </label>
              <select
                value={profileData.dateFormat}
                onChange={(e) => handleInputChange('dateFormat', e.target.value)}
                className="w-full px-3 py-2 rounded-lg bg-[var(--ff-bg-layer)] border border-[var(--ff-border)] text-[var(--ff-text-primary)] focus:border-purple-500 focus:ring-2 focus:ring-purple-500/20 outline-none"
              >
                <option value="MM/DD/YYYY">MM/DD/YYYY</option>
                <option value="DD/MM/YYYY">DD/MM/YYYY</option>
                <option value="YYYY-MM-DD">YYYY-MM-DD</option>
              </select>
            </div>
          </CardGlassContent>
        </CardGlass>

        {/* Danger Zone */}
        <CardGlass className="border-red-500/30">
          <CardGlassHeader>
            <CardGlassTitle className="flex items-center gap-2 text-red-400">
              <AlertTriangle className="h-5 w-5" />
              Danger Zone
            </CardGlassTitle>
            <CardGlassDescription>
              Irreversible actions for your account
            </CardGlassDescription>
          </CardGlassHeader>
          <CardGlassContent>
            <div className="flex items-center justify-between p-4 bg-red-500/10 border border-red-500/20 rounded-xl">
              <div>
                <h4 className="font-medium text-[var(--ff-text-primary)]">Delete Account</h4>
                <p className="text-sm text-[var(--ff-text-secondary)] mt-1">
                  Permanently delete your account and all associated data
                </p>
              </div>
              <Button
                variant="destructive"
                className="bg-red-600 hover:bg-red-500 text-white border-0"
              >
                <Trash2 className="h-4 w-4 mr-2" />
                Delete Account
              </Button>
            </div>
          </CardGlassContent>
        </CardGlass>
      </div>
    </div>
  );
}
