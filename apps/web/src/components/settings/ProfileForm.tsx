'use client';

import { useState, useEffect } from 'react';
import { User, Mail, Briefcase, Building2, Phone, MapPin, Link2, Check, Loader2 } from 'lucide-react';
import { CardGlass } from '@/components/ui/card-glass';
import { Button } from '@/components/ui/button-v2';
import { Alert } from '@/components/ui/alert';

interface ProfileData {
  firstName: string;
  lastName: string;
  email: string;
  phone: string;
  jobTitle: string;
  company: string;
  location: string;
  bio: string;
  linkedIn: string;
  twitter: string;
  website: string;
}

interface ProfileFormProps {
  userId: string;
  initialData?: Partial<ProfileData>;
  onSave?: (data: ProfileData) => void;
}

export function ProfileForm({
  userId,
  initialData = {},
  onSave
}: ProfileFormProps) {
  const [formData, setFormData] = useState<ProfileData>({
    firstName: initialData.firstName || '',
    lastName: initialData.lastName || '',
    email: initialData.email || '',
    phone: initialData.phone || '',
    jobTitle: initialData.jobTitle || '',
    company: initialData.company || '',
    location: initialData.location || '',
    bio: initialData.bio || '',
    linkedIn: initialData.linkedIn || '',
    twitter: initialData.twitter || '',
    website: initialData.website || '',
  });

  const [errors, setErrors] = useState<Partial<ProfileData>>({});
  const [isSaving, setIsSaving] = useState(false);
  const [saveSuccess, setSaveSuccess] = useState(false);
  const [hasChanges, setHasChanges] = useState(false);

  useEffect(() => {
    // Check if form has changes
    const changed = Object.keys(formData).some(
      key => formData[key as keyof ProfileData] !== (initialData[key as keyof ProfileData] || '')
    );
    setHasChanges(changed);
  }, [formData, initialData]);

  const validateForm = (): boolean => {
    const newErrors: Partial<ProfileData> = {};

    // Required fields
    if (!formData.firstName.trim()) {
      newErrors.firstName = 'First name is required';
    }
    if (!formData.lastName.trim()) {
      newErrors.lastName = 'Last name is required';
    }
    if (!formData.email.trim()) {
      newErrors.email = 'Email is required';
    } else if (!/\S+@\S+\.\S+/.test(formData.email)) {
      newErrors.email = 'Invalid email format';
    }

    // Optional field validation
    if (formData.phone && !/^\+?[\d\s-()]+$/.test(formData.phone)) {
      newErrors.phone = 'Invalid phone format';
    }
    if (formData.website && !/^https?:\/\/.+/.test(formData.website)) {
      newErrors.website = 'Website must start with http:// or https://';
    }
    if (formData.linkedIn && !/^https?:\/\/(www\.)?linkedin\.com\//.test(formData.linkedIn)) {
      newErrors.linkedIn = 'Invalid LinkedIn URL';
    }
    if (formData.twitter && !/^https?:\/\/(www\.)?twitter\.com\//.test(formData.twitter)) {
      newErrors.twitter = 'Invalid Twitter URL';
    }
    if (formData.bio && formData.bio.length > 500) {
      newErrors.bio = 'Bio must be less than 500 characters';
    }

    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  const handleInputChange = (field: keyof ProfileData, value: string) => {
    setFormData(prev => ({ ...prev, [field]: value }));
    // Clear error for this field
    if (errors[field]) {
      setErrors(prev => ({ ...prev, [field]: undefined }));
    }
  };

  const handleSave = async () => {
    if (!validateForm()) {
      return;
    }

    setIsSaving(true);
    setErrors({});

    try {
      const response = await fetch('/api/users/me', {
        method: 'PATCH',
        headers: {
          'Content-Type': 'application/json',
          'x-user-id': userId,
        },
        body: JSON.stringify({
          firstName: formData.firstName,
          lastName: formData.lastName,
          preferences: {
            phone: formData.phone,
            jobTitle: formData.jobTitle,
            company: formData.company,
            location: formData.location,
            bio: formData.bio,
            social: {
              linkedIn: formData.linkedIn,
              twitter: formData.twitter,
              website: formData.website,
            },
          },
        }),
      });

      if (!response.ok) {
        throw new Error('Failed to save profile');
      }

      setSaveSuccess(true);
      setHasChanges(false);

      if (onSave) {
        onSave(formData);
      }

      setTimeout(() => setSaveSuccess(false), 3000);
    } catch (error) {
      console.error('Error saving profile:', error);
      setErrors({ email: 'Failed to save profile. Please try again.' });
    } finally {
      setIsSaving(false);
    }
  };

  const handleReset = () => {
    setFormData({
      firstName: initialData.firstName || '',
      lastName: initialData.lastName || '',
      email: initialData.email || '',
      phone: initialData.phone || '',
      jobTitle: initialData.jobTitle || '',
      company: initialData.company || '',
      location: initialData.location || '',
      bio: initialData.bio || '',
      linkedIn: initialData.linkedIn || '',
      twitter: initialData.twitter || '',
      website: initialData.website || '',
    });
    setErrors({});
    setHasChanges(false);
  };

  return (
    <CardGlass variant="default" className="p-6">
      <div className="flex items-center gap-2 mb-6">
        <User className="w-5 h-5 text-teal-400" />
        <h3 className="text-lg font-semibold text-white">Profile Information</h3>
      </div>

      <div className="space-y-6">
        {/* Basic Information */}
        <div>
          <h4 className="text-sm font-semibold text-slate-300 mb-4">Basic Information</h4>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium text-slate-400 mb-2">
                First Name *
              </label>
              <input
                type="text"
                value={formData.firstName}
                onChange={(e) => handleInputChange('firstName', e.target.value)}
                className={`w-full px-4 py-3 rounded-xl bg-slate-800/50 border ${
                  errors.firstName ? 'border-rose-500/50' : 'border-white/10'
                } text-white placeholder:text-slate-500 focus:ring-2 focus:ring-teal-500/50 focus:border-teal-500/50 outline-none transition-all`}
                placeholder="John"
              />
              {errors.firstName && (
                <p className="text-xs text-rose-400 mt-1">{errors.firstName}</p>
              )}
            </div>

            <div>
              <label className="block text-sm font-medium text-slate-400 mb-2">
                Last Name *
              </label>
              <input
                type="text"
                value={formData.lastName}
                onChange={(e) => handleInputChange('lastName', e.target.value)}
                className={`w-full px-4 py-3 rounded-xl bg-slate-800/50 border ${
                  errors.lastName ? 'border-rose-500/50' : 'border-white/10'
                } text-white placeholder:text-slate-500 focus:ring-2 focus:ring-teal-500/50 focus:border-teal-500/50 outline-none transition-all`}
                placeholder="Doe"
              />
              {errors.lastName && (
                <p className="text-xs text-rose-400 mt-1">{errors.lastName}</p>
              )}
            </div>

            <div>
              <label className="block text-sm font-medium text-slate-400 mb-2">
                <Mail className="w-3 h-3 inline mr-1" />
                Email Address *
              </label>
              <input
                type="email"
                value={formData.email}
                onChange={(e) => handleInputChange('email', e.target.value)}
                className={`w-full px-4 py-3 rounded-xl bg-slate-800/50 border ${
                  errors.email ? 'border-rose-500/50' : 'border-white/10'
                } text-white placeholder:text-slate-500 focus:ring-2 focus:ring-teal-500/50 focus:border-teal-500/50 outline-none transition-all`}
                placeholder="john@example.com"
              />
              {errors.email && (
                <p className="text-xs text-rose-400 mt-1">{errors.email}</p>
              )}
            </div>

            <div>
              <label className="block text-sm font-medium text-slate-400 mb-2">
                <Phone className="w-3 h-3 inline mr-1" />
                Phone Number
              </label>
              <input
                type="tel"
                value={formData.phone}
                onChange={(e) => handleInputChange('phone', e.target.value)}
                className={`w-full px-4 py-3 rounded-xl bg-slate-800/50 border ${
                  errors.phone ? 'border-rose-500/50' : 'border-white/10'
                } text-white placeholder:text-slate-500 focus:ring-2 focus:ring-teal-500/50 focus:border-teal-500/50 outline-none transition-all`}
                placeholder="+1 (555) 123-4567"
              />
              {errors.phone && (
                <p className="text-xs text-rose-400 mt-1">{errors.phone}</p>
              )}
            </div>
          </div>
        </div>

        {/* Professional Information */}
        <div>
          <h4 className="text-sm font-semibold text-slate-300 mb-4">Professional Information</h4>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium text-slate-400 mb-2">
                <Briefcase className="w-3 h-3 inline mr-1" />
                Job Title
              </label>
              <input
                type="text"
                value={formData.jobTitle}
                onChange={(e) => handleInputChange('jobTitle', e.target.value)}
                className="w-full px-4 py-3 rounded-xl bg-slate-800/50 border border-white/10 text-white placeholder:text-slate-500 focus:ring-2 focus:ring-teal-500/50 focus:border-teal-500/50 outline-none transition-all"
                placeholder="Product Manager"
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-slate-400 mb-2">
                <Building2 className="w-3 h-3 inline mr-1" />
                Company
              </label>
              <input
                type="text"
                value={formData.company}
                onChange={(e) => handleInputChange('company', e.target.value)}
                className="w-full px-4 py-3 rounded-xl bg-slate-800/50 border border-white/10 text-white placeholder:text-slate-500 focus:ring-2 focus:ring-teal-500/50 focus:border-teal-500/50 outline-none transition-all"
                placeholder="Acme Inc."
              />
            </div>

            <div className="md:col-span-2">
              <label className="block text-sm font-medium text-slate-400 mb-2">
                <MapPin className="w-3 h-3 inline mr-1" />
                Location
              </label>
              <input
                type="text"
                value={formData.location}
                onChange={(e) => handleInputChange('location', e.target.value)}
                className="w-full px-4 py-3 rounded-xl bg-slate-800/50 border border-white/10 text-white placeholder:text-slate-500 focus:ring-2 focus:ring-teal-500/50 focus:border-teal-500/50 outline-none transition-all"
                placeholder="San Francisco, CA"
              />
            </div>
          </div>
        </div>

        {/* Bio */}
        <div>
          <label className="block text-sm font-medium text-slate-400 mb-2">
            Bio
            <span className="text-xs text-slate-500 ml-2">
              ({formData.bio.length}/500)
            </span>
          </label>
          <textarea
            value={formData.bio}
            onChange={(e) => handleInputChange('bio', e.target.value)}
            rows={4}
            maxLength={500}
            className={`w-full px-4 py-3 rounded-xl bg-slate-800/50 border ${
              errors.bio ? 'border-rose-500/50' : 'border-white/10'
            } text-white placeholder:text-slate-500 focus:ring-2 focus:ring-teal-500/50 focus:border-teal-500/50 outline-none transition-all resize-none`}
            placeholder="Tell us a bit about yourself..."
          />
          {errors.bio && (
            <p className="text-xs text-rose-400 mt-1">{errors.bio}</p>
          )}
        </div>

        {/* Social Links */}
        <div>
          <h4 className="text-sm font-semibold text-slate-300 mb-4">Social Links</h4>
          <div className="space-y-4">
            <div>
              <label className="block text-sm font-medium text-slate-400 mb-2">
                <Link2 className="w-3 h-3 inline mr-1" />
                LinkedIn
              </label>
              <input
                type="url"
                value={formData.linkedIn}
                onChange={(e) => handleInputChange('linkedIn', e.target.value)}
                className={`w-full px-4 py-3 rounded-xl bg-slate-800/50 border ${
                  errors.linkedIn ? 'border-rose-500/50' : 'border-white/10'
                } text-white placeholder:text-slate-500 focus:ring-2 focus:ring-teal-500/50 focus:border-teal-500/50 outline-none transition-all`}
                placeholder="https://linkedin.com/in/johndoe"
              />
              {errors.linkedIn && (
                <p className="text-xs text-rose-400 mt-1">{errors.linkedIn}</p>
              )}
            </div>

            <div>
              <label className="block text-sm font-medium text-slate-400 mb-2">
                <Link2 className="w-3 h-3 inline mr-1" />
                Twitter
              </label>
              <input
                type="url"
                value={formData.twitter}
                onChange={(e) => handleInputChange('twitter', e.target.value)}
                className={`w-full px-4 py-3 rounded-xl bg-slate-800/50 border ${
                  errors.twitter ? 'border-rose-500/50' : 'border-white/10'
                } text-white placeholder:text-slate-500 focus:ring-2 focus:ring-teal-500/50 focus:border-teal-500/50 outline-none transition-all`}
                placeholder="https://twitter.com/johndoe"
              />
              {errors.twitter && (
                <p className="text-xs text-rose-400 mt-1">{errors.twitter}</p>
              )}
            </div>

            <div>
              <label className="block text-sm font-medium text-slate-400 mb-2">
                <Link2 className="w-3 h-3 inline mr-1" />
                Website
              </label>
              <input
                type="url"
                value={formData.website}
                onChange={(e) => handleInputChange('website', e.target.value)}
                className={`w-full px-4 py-3 rounded-xl bg-slate-800/50 border ${
                  errors.website ? 'border-rose-500/50' : 'border-white/10'
                } text-white placeholder:text-slate-500 focus:ring-2 focus:ring-teal-500/50 focus:border-teal-500/50 outline-none transition-all`}
                placeholder="https://example.com"
              />
              {errors.website && (
                <p className="text-xs text-rose-400 mt-1">{errors.website}</p>
              )}
            </div>
          </div>
        </div>

        {/* Save Actions */}
        <div className="flex items-center justify-between pt-4 border-t border-white/5">
          {hasChanges && (
            <p className="text-xs text-amber-400">You have unsaved changes</p>
          )}
          <div className="flex gap-3 ml-auto">
            <Button
              variant="ghost-glass"
              size="default"
              onClick={handleReset}
              disabled={!hasChanges || isSaving}
            >
              Reset
            </Button>
            <Button
              variant="gradient-primary"
              size="default"
              onClick={handleSave}
              disabled={!hasChanges || isSaving}
            >
              {isSaving ? (
                <>
                  <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                  Saving...
                </>
              ) : saveSuccess ? (
                <>
                  <Check className="w-4 h-4 mr-2" />
                  Saved
                </>
              ) : (
                'Save Changes'
              )}
            </Button>
          </div>
        </div>
      </div>
    </CardGlass>
  );
}