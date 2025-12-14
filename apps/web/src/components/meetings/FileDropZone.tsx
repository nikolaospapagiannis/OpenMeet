'use client';

import { useCallback, useState } from 'react';
import { Upload, FileAudio, FileVideo } from 'lucide-react';
import { cn } from '@/lib/utils';

export interface FileDropZoneProps {
  onFileSelect: (file: File) => void;
  accept?: string;
  maxSize?: number; // in bytes
  disabled?: boolean;
  className?: string;
}

const ACCEPTED_FORMATS = {
  audio: ['MP3', 'WAV', 'M4A', 'OGG'],
  video: ['MP4', 'WebM', 'MOV'],
};

const ACCEPTED_MIME_TYPES = [
  'audio/mpeg',
  'audio/mp3',
  'audio/wav',
  'audio/x-wav',
  'audio/wave',
  'audio/x-m4a',
  'audio/m4a',
  'audio/webm',
  'audio/ogg',
  'video/mp4',
  'video/webm',
  'video/quicktime',
];

/**
 * File drop zone component for drag & drop and click to browse
 * Supports audio and video files up to 2GB
 */
export function FileDropZone({
  onFileSelect,
  accept = 'audio/*,video/*,.mp3,.mp4,.wav,.m4a,.webm,.ogg,.mov',
  maxSize = 2 * 1024 * 1024 * 1024, // 2GB default
  disabled = false,
  className,
}: FileDropZoneProps) {
  const [dragActive, setDragActive] = useState(false);
  const [error, setError] = useState<string | null>(null);

  /**
   * Format file size to human-readable format
   */
  const formatFileSize = (bytes: number): string => {
    if (bytes === 0) return '0 Bytes';
    const k = 1024;
    const sizes = ['Bytes', 'KB', 'MB', 'GB'];
    const i = Math.floor(Math.log(bytes) / Math.log(k));
    return Math.round((bytes / Math.pow(k, i)) * 100) / 100 + ' ' + sizes[i];
  };

  /**
   * Validate file type and size
   */
  const validateFile = (file: File): string | null => {
    // Check file size
    if (file.size > maxSize) {
      return `File size exceeds ${formatFileSize(maxSize)} limit`;
    }

    if (file.size === 0) {
      return 'File is empty';
    }

    // Check file type
    const fileExtension = '.' + file.name.split('.').pop()?.toLowerCase();
    const fileMimeType = file.type.toLowerCase();

    const isAcceptedMimeType = ACCEPTED_MIME_TYPES.includes(fileMimeType);
    const isAcceptedExtension = accept
      .split(',')
      .some((type) => type.trim().toLowerCase() === fileExtension);

    if (!isAcceptedMimeType && !isAcceptedExtension) {
      return `File type not supported. Please upload ${ACCEPTED_FORMATS.audio.join(', ')} or ${ACCEPTED_FORMATS.video.join(', ')} files`;
    }

    return null;
  };

  /**
   * Handle file selection
   */
  const handleFile = useCallback(
    (file: File) => {
      setError(null);

      const validationError = validateFile(file);
      if (validationError) {
        setError(validationError);
        return;
      }

      onFileSelect(file);
    },
    [onFileSelect, maxSize, accept]
  );

  /**
   * Handle drag events
   */
  const handleDrag = useCallback(
    (e: React.DragEvent) => {
      e.preventDefault();
      e.stopPropagation();

      if (disabled) return;

      if (e.type === 'dragenter' || e.type === 'dragover') {
        setDragActive(true);
      } else if (e.type === 'dragleave') {
        setDragActive(false);
      }
    },
    [disabled]
  );

  /**
   * Handle drop event
   */
  const handleDrop = useCallback(
    (e: React.DragEvent) => {
      e.preventDefault();
      e.stopPropagation();
      setDragActive(false);

      if (disabled) return;

      if (e.dataTransfer.files && e.dataTransfer.files[0]) {
        handleFile(e.dataTransfer.files[0]);
      }
    },
    [disabled, handleFile]
  );

  /**
   * Handle file input change
   */
  const handleChange = useCallback(
    (e: React.ChangeEvent<HTMLInputElement>) => {
      e.preventDefault();

      if (disabled) return;

      if (e.target.files && e.target.files[0]) {
        handleFile(e.target.files[0]);
      }
    },
    [disabled, handleFile]
  );

  /**
   * Handle click to browse
   */
  const handleClick = () => {
    if (disabled) return;
    document.getElementById('file-upload-input')?.click();
  };

  return (
    <div className={cn('w-full', className)}>
      {/* Drop Zone */}
      <div
        className={cn(
          'relative border-2 border-dashed rounded-2xl p-12 text-center transition-all duration-300 cursor-pointer',
          'focus-within:outline-none focus-within:ring-2 focus-within:ring-teal-500/50 focus-within:border-teal-500',
          dragActive
            ? 'border-teal-500 bg-teal-500/10 scale-[1.02] shadow-lg shadow-teal-500/20'
            : 'border-white/20 hover:border-white/30 bg-slate-900/20',
          disabled && 'opacity-50 cursor-not-allowed',
          error && 'border-red-500/50 bg-red-500/5'
        )}
        onDragEnter={handleDrag}
        onDragLeave={handleDrag}
        onDragOver={handleDrag}
        onDrop={handleDrop}
        onClick={handleClick}
      >
        <div className="flex flex-col items-center gap-6">
          {/* Icon */}
          <div
            className={cn(
              'w-20 h-20 rounded-2xl flex items-center justify-center transition-all duration-300',
              'bg-gradient-to-br from-teal-500/20 to-cyan-500/20 border border-teal-500/30',
              dragActive && 'scale-110 shadow-xl shadow-teal-500/30'
            )}
          >
            {dragActive ? (
              <Upload
                className={cn(
                  'w-10 h-10 text-teal-400 transition-transform duration-300',
                  dragActive && 'scale-110 animate-pulse'
                )}
              />
            ) : (
              <div className="relative">
                <FileAudio className="w-10 h-10 text-teal-400" />
                <FileVideo className="w-6 h-6 text-cyan-400 absolute -bottom-1 -right-1" />
              </div>
            )}
          </div>

          {/* Text */}
          <div className="space-y-3">
            <h3 className="text-xl font-semibold text-white">
              {dragActive ? 'Drop your file here' : 'Upload Recording'}
            </h3>
            <p className="text-sm text-slate-400">
              Drag and drop your audio or video file, or click to browse
            </p>

            {/* Supported Formats */}
            <div className="flex flex-wrap items-center justify-center gap-2 pt-2">
              <div className="flex items-center gap-2 px-3 py-1.5 rounded-lg bg-slate-800/50 border border-slate-700/50">
                <FileAudio className="w-4 h-4 text-teal-400" />
                <span className="text-xs text-slate-300">
                  {ACCEPTED_FORMATS.audio.join(', ')}
                </span>
              </div>
              <div className="flex items-center gap-2 px-3 py-1.5 rounded-lg bg-slate-800/50 border border-slate-700/50">
                <FileVideo className="w-4 h-4 text-cyan-400" />
                <span className="text-xs text-slate-300">
                  {ACCEPTED_FORMATS.video.join(', ')}
                </span>
              </div>
            </div>

            {/* Size Limit */}
            <p className="text-xs text-slate-500 pt-2">
              Maximum file size: {formatFileSize(maxSize)}
            </p>
          </div>
        </div>

        {/* Hidden File Input */}
        <input
          id="file-upload-input"
          type="file"
          accept={accept}
          onChange={handleChange}
          className="hidden"
          disabled={disabled}
          aria-label="Upload file"
        />
      </div>

      {/* Error Message */}
      {error && (
        <div className="mt-4 p-4 rounded-xl bg-red-500/10 border border-red-500/30 animate-in fade-in slide-in-from-top-2 duration-300">
          <p className="text-sm text-red-400">{error}</p>
        </div>
      )}
    </div>
  );
}
