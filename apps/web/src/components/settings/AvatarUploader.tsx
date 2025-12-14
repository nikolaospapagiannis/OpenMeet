'use client';

import { useState, useRef, ChangeEvent } from 'react';
import { Upload, User, X, Camera, Loader2, Check } from 'lucide-react';
import { Button } from '@/components/ui/button-v2';
import { CardGlass } from '@/components/ui/card-glass';
import { Alert } from '@/components/ui/alert';
import Image from 'next/image';

interface AvatarUploaderProps {
  currentAvatar?: string | null;
  userId: string;
  onUploadComplete?: (url: string) => void;
  maxSizeMB?: number;
}

export function AvatarUploader({
  currentAvatar,
  userId,
  onUploadComplete,
  maxSizeMB = 5
}: AvatarUploaderProps) {
  const [isUploading, setIsUploading] = useState(false);
  const [preview, setPreview] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [uploadSuccess, setUploadSuccess] = useState(false);
  const [dragActive, setDragActive] = useState(false);
  const [cropMode, setCropMode] = useState(false);
  const [avatarUrl, setAvatarUrl] = useState<string | null>(currentAvatar || null);

  const fileInputRef = useRef<HTMLInputElement>(null);

  const validateFile = (file: File): string | null => {
    const maxSize = maxSizeMB * 1024 * 1024; // Convert MB to bytes

    if (!file.type.startsWith('image/')) {
      return 'Please select an image file';
    }

    if (file.size > maxSize) {
      return `File size must be less than ${maxSizeMB}MB`;
    }

    const allowedTypes = ['image/jpeg', 'image/png', 'image/gif', 'image/webp'];
    if (!allowedTypes.includes(file.type)) {
      return 'Please select a JPEG, PNG, GIF, or WebP image';
    }

    return null;
  };

  const handleFileSelect = (e: ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    const validationError = validateFile(file);
    if (validationError) {
      setError(validationError);
      return;
    }

    setError(null);
    const reader = new FileReader();

    reader.onload = (event) => {
      const result = event.target?.result as string;
      setPreview(result);
      setCropMode(true);
    };

    reader.readAsDataURL(file);
  };

  const handleDrag = (e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();

    if (e.type === 'dragenter' || e.type === 'dragover') {
      setDragActive(true);
    } else if (e.type === 'dragleave') {
      setDragActive(false);
    }
  };

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    setDragActive(false);

    const file = e.dataTransfer.files?.[0];
    if (!file) return;

    const validationError = validateFile(file);
    if (validationError) {
      setError(validationError);
      return;
    }

    setError(null);
    const reader = new FileReader();

    reader.onload = (event) => {
      const result = event.target?.result as string;
      setPreview(result);
      setCropMode(true);
    };

    reader.readAsDataURL(file);
  };

  const handleUpload = async () => {
    if (!preview) return;

    setIsUploading(true);
    setError(null);

    try {
      // Simulate upload to S3 or cloud storage
      const formData = new FormData();
      formData.append('avatar', preview);
      formData.append('userId', userId);

      const response = await fetch('/api/users/me/avatar', {
        method: 'POST',
        headers: {
          'x-user-id': userId,
        },
        body: formData,
      });

      if (!response.ok) {
        throw new Error('Failed to upload avatar');
      }

      const data = await response.json();
      const newAvatarUrl = data.avatarUrl || preview;

      setAvatarUrl(newAvatarUrl);
      setUploadSuccess(true);
      setCropMode(false);

      if (onUploadComplete) {
        onUploadComplete(newAvatarUrl);
      }

      setTimeout(() => {
        setUploadSuccess(false);
        setPreview(null);
      }, 3000);

    } catch (err) {
      setError(err instanceof Error ? err.message : 'Upload failed');
    } finally {
      setIsUploading(false);
    }
  };

  const handleRemoveAvatar = async () => {
    setIsUploading(true);

    try {
      await fetch('/api/users/me/avatar', {
        method: 'DELETE',
        headers: {
          'x-user-id': userId,
        },
      });

      setAvatarUrl(null);
      setPreview(null);

      if (onUploadComplete) {
        onUploadComplete('');
      }

    } catch (err) {
      setError('Failed to remove avatar');
    } finally {
      setIsUploading(false);
    }
  };

  const cancelCrop = () => {
    setCropMode(false);
    setPreview(null);
    if (fileInputRef.current) {
      fileInputRef.current.value = '';
    }
  };

  return (
    <CardGlass variant="default" className="p-6">
      <div className="flex items-start gap-2 mb-6">
        <Camera className="w-5 h-5 text-teal-400 mt-0.5" />
        <div>
          <h3 className="text-lg font-semibold text-white">Profile Picture</h3>
          <p className="text-sm text-slate-400 mt-1">
            Upload a profile picture to personalize your account
          </p>
        </div>
      </div>

      <div className="flex items-start gap-6">
        {/* Current Avatar */}
        <div className="flex flex-col items-center gap-3">
          <div className="relative">
            <div className="w-24 h-24 rounded-full bg-slate-800 border-2 border-white/10 overflow-hidden flex items-center justify-center">
              {avatarUrl ? (
                <Image
                  src={avatarUrl}
                  alt="Profile"
                  width={96}
                  height={96}
                  className="w-full h-full object-cover"
                />
              ) : (
                <User className="w-12 h-12 text-slate-500" />
              )}
            </div>

            {uploadSuccess && (
              <div className="absolute -bottom-2 -right-2 w-8 h-8 bg-green-500 rounded-full flex items-center justify-center animate-in zoom-in duration-300">
                <Check className="w-4 h-4 text-white" />
              </div>
            )}
          </div>

          {avatarUrl && (
            <Button
              variant="ghost-glass"
              size="sm"
              onClick={handleRemoveAvatar}
              disabled={isUploading}
            >
              <X className="w-4 h-4 mr-1" />
              Remove
            </Button>
          )}
        </div>

        {/* Upload Area */}
        <div className="flex-1">
          {cropMode && preview ? (
            <div className="space-y-4">
              <div className="relative w-full max-w-sm">
                <div className="aspect-square rounded-xl overflow-hidden bg-slate-900 border border-white/10">
                  <img
                    src={preview}
                    alt="Preview"
                    className="w-full h-full object-cover"
                  />
                </div>

                <div className="absolute inset-0 rounded-xl border-2 border-teal-500 pointer-events-none" />

                <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 text-center">
                  <div className="bg-slate-900/90 backdrop-blur-sm px-3 py-2 rounded-lg">
                    <p className="text-xs text-white font-medium">Crop your image</p>
                    <p className="text-xs text-slate-400 mt-1">Drag to adjust</p>
                  </div>
                </div>
              </div>

              <div className="flex gap-3">
                <Button
                  variant="gradient-primary"
                  size="default"
                  onClick={handleUpload}
                  disabled={isUploading}
                >
                  {isUploading ? (
                    <>
                      <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                      Uploading...
                    </>
                  ) : (
                    <>
                      <Upload className="w-4 h-4 mr-2" />
                      Save Avatar
                    </>
                  )}
                </Button>

                <Button
                  variant="ghost-glass"
                  size="default"
                  onClick={cancelCrop}
                  disabled={isUploading}
                >
                  Cancel
                </Button>
              </div>
            </div>
          ) : (
            <div
              className={`relative border-2 border-dashed rounded-xl p-6 transition-all ${
                dragActive
                  ? 'border-teal-500 bg-teal-500/10'
                  : 'border-white/10 hover:border-white/20'
              }`}
              onDragEnter={handleDrag}
              onDragLeave={handleDrag}
              onDragOver={handleDrag}
              onDrop={handleDrop}
            >
              <input
                ref={fileInputRef}
                type="file"
                accept="image/*"
                onChange={handleFileSelect}
                className="hidden"
              />

              <div className="text-center">
                <Upload className="w-10 h-10 text-slate-500 mx-auto mb-3" />

                <p className="text-sm text-slate-300 mb-1">
                  Drag and drop your image here, or
                </p>

                <Button
                  variant="ghost-glass"
                  size="sm"
                  onClick={() => fileInputRef.current?.click()}
                  disabled={isUploading}
                >
                  Browse Files
                </Button>

                <p className="text-xs text-slate-500 mt-3">
                  Supports: JPEG, PNG, GIF, WebP • Max size: {maxSizeMB}MB
                </p>
              </div>
            </div>
          )}

          {error && (
            <Alert className="mt-4 bg-rose-500/10 border-rose-500/30 text-rose-300">
              {error}
            </Alert>
          )}

          {uploadSuccess && (
            <Alert className="mt-4 bg-green-500/10 border-green-500/30 text-green-300">
              Avatar uploaded successfully!
            </Alert>
          )}
        </div>
      </div>
    </CardGlass>
  );
}