'use client';

import React, { useState, useRef } from 'react';
import { Upload, X, Image as ImageIcon } from 'lucide-react';

interface LogoUploaderProps {
  label: string;
  value?: string;
  onChange: (url: string) => void;
  onRemove?: () => void;
  logoType: 'logo' | 'logoDark' | 'logoSquare' | 'favicon';
  description?: string;
  maxSize?: number; // in MB
  acceptedFormats?: string[];
}

export function LogoUploader({
  label,
  value,
  onChange,
  onRemove,
  logoType,
  description,
  maxSize = 5,
  acceptedFormats = ['image/jpeg', 'image/png', 'image/svg+xml', 'image/webp'],
}: LogoUploaderProps) {
  const [uploading, setUploading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [dragOver, setDragOver] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const handleFileSelect = async (file: File) => {
    setError(null);

    // Validate file type
    if (!acceptedFormats.includes(file.type)) {
      setError('Invalid file format. Please upload JPEG, PNG, SVG, or WebP.');
      return;
    }

    // Validate file size
    const fileSizeMB = file.size / (1024 * 1024);
    if (fileSizeMB > maxSize) {
      setError(`File size must be less than ${maxSize}MB`);
      return;
    }

    try {
      setUploading(true);

      const formData = new FormData();
      formData.append('file', file);
      formData.append('type', logoType);

      const response = await fetch('/api/whitelabel/logo', {
        method: 'POST',
        body: formData,
      });

      if (!response.ok) {
        const data = await response.json();
        throw new Error(data.error || 'Failed to upload logo');
      }

      const data = await response.json();
      onChange(data.fileUrl);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to upload logo');
    } finally {
      setUploading(false);
    }
  };

  const handleDrop = (e: React.DragEvent<HTMLDivElement>) => {
    e.preventDefault();
    setDragOver(false);

    const file = e.dataTransfer.files[0];
    if (file) {
      handleFileSelect(file);
    }
  };

  const handleDragOver = (e: React.DragEvent<HTMLDivElement>) => {
    e.preventDefault();
    setDragOver(true);
  };

  const handleDragLeave = () => {
    setDragOver(false);
  };

  const handleFileInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      handleFileSelect(file);
    }
  };

  const handleRemove = () => {
    if (onRemove) {
      onRemove();
    }
  };

  const getPreviewSize = () => {
    switch (logoType) {
      case 'favicon':
        return 'w-16 h-16';
      case 'logoSquare':
        return 'w-24 h-24';
      default:
        return 'w-full h-32';
    }
  };

  return (
    <div className="space-y-3">
      <div className="flex items-center justify-between">
        <label className="text-sm font-medium text-gray-700">{label}</label>
        {value && onRemove && (
          <button
            onClick={handleRemove}
            className="text-sm text-red-600 hover:text-red-700 flex items-center gap-1"
          >
            <X className="w-4 h-4" />
            Remove
          </button>
        )}
      </div>

      {description && <p className="text-xs text-gray-500">{description}</p>}

      <div
        className={`relative border-2 border-dashed rounded-lg p-6 transition-colors ${
          dragOver
            ? 'border-blue-500 bg-blue-50'
            : 'border-gray-300 hover:border-gray-400'
        }`}
        onDrop={handleDrop}
        onDragOver={handleDragOver}
        onDragLeave={handleDragLeave}
      >
        {value ? (
          <div className="flex flex-col items-center gap-4">
            <div className={`relative ${getPreviewSize()} bg-gray-100 rounded flex items-center justify-center overflow-hidden`}>
              <img
                src={value}
                alt={label}
                className="max-w-full max-h-full object-contain"
              />
            </div>
            <button
              onClick={() => fileInputRef.current?.click()}
              disabled={uploading}
              className="text-sm text-blue-600 hover:text-blue-700 disabled:opacity-50"
            >
              {uploading ? 'Uploading...' : 'Change image'}
            </button>
          </div>
        ) : (
          <div className="flex flex-col items-center gap-3">
            <div className="w-12 h-12 rounded-full bg-gray-100 flex items-center justify-center">
              {uploading ? (
                <div className="animate-spin rounded-full h-6 w-6 border-2 border-gray-300 border-t-blue-600" />
              ) : (
                <Upload className="w-6 h-6 text-gray-400" />
              )}
            </div>

            <div className="text-center">
              <button
                onClick={() => fileInputRef.current?.click()}
                disabled={uploading}
                className="text-sm font-medium text-blue-600 hover:text-blue-700 disabled:opacity-50"
              >
                {uploading ? 'Uploading...' : 'Click to upload'}
              </button>
              <span className="text-sm text-gray-500"> or drag and drop</span>
            </div>

            <p className="text-xs text-gray-500">
              PNG, JPG, SVG or WebP (max {maxSize}MB)
            </p>
          </div>
        )}

        <input
          ref={fileInputRef}
          type="file"
          accept={acceptedFormats.join(',')}
          onChange={handleFileInputChange}
          className="hidden"
        />
      </div>

      {error && (
        <div className="p-3 bg-red-50 border border-red-200 rounded-md">
          <p className="text-sm text-red-600">{error}</p>
        </div>
      )}
    </div>
  );
}
