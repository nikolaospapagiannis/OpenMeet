'use client';

import { useState, useCallback, useEffect } from 'react';
import { X, Upload } from 'lucide-react';
import { Button } from '@/components/ui/button-v2';
import { FileDropZone } from './FileDropZone';
import { UploadProgress } from './UploadProgress';
import { useFileUpload } from '@/hooks/useFileUpload';
import { cn } from '@/lib/utils';

export interface MeetingUploadModalProps {
  isOpen: boolean;
  onClose: () => void;
  onUploadComplete?: (result: { meeting: any; recording: any }) => void;
  className?: string;
}

/**
 * Full-screen modal for uploading meeting recordings
 * Supports drag & drop, progress tracking, and error handling
 */
export function MeetingUploadModal({
  isOpen,
  onClose,
  onUploadComplete,
  className,
}: MeetingUploadModalProps) {
  const [selectedFile, setSelectedFile] = useState<File | null>(null);
  const [title, setTitle] = useState('');
  const [autoTranscribe, setAutoTranscribe] = useState(true);
  const [uploadComplete, setUploadComplete] = useState(false);

  const {
    uploadFile,
    cancelUpload,
    reset,
    isUploading,
    progress,
    error,
  } = useFileUpload({
    onSuccess: (result) => {
      setUploadComplete(true);
      onUploadComplete?.(result);

      // Auto-close after 2 seconds on success
      setTimeout(() => {
        handleClose();
      }, 2000);
    },
    onError: (err) => {
      console.error('Upload error:', err);
    },
  });

  /**
   * Handle file selection
   */
  const handleFileSelect = useCallback((file: File) => {
    setSelectedFile(file);
    setUploadComplete(false);

    // Auto-generate title from filename
    const fileName = file.name.replace(/\.[^/.]+$/, ''); // Remove extension
    setTitle(fileName);
  }, []);

  /**
   * Handle upload start
   */
  const handleStartUpload = useCallback(async () => {
    if (!selectedFile) return;

    await uploadFile(selectedFile, {
      title: title || selectedFile.name,
      autoTranscribe,
    });
  }, [selectedFile, title, autoTranscribe, uploadFile]);

  /**
   * Handle retry upload
   */
  const handleRetry = useCallback(() => {
    if (selectedFile) {
      reset();
      handleStartUpload();
    }
  }, [selectedFile, reset, handleStartUpload]);

  /**
   * Handle modal close
   */
  const handleClose = useCallback(() => {
    if (isUploading) {
      if (
        confirm(
          'Upload is in progress. Are you sure you want to cancel and close?'
        )
      ) {
        cancelUpload();
        reset();
        setSelectedFile(null);
        setTitle('');
        setUploadComplete(false);
        onClose();
      }
    } else {
      reset();
      setSelectedFile(null);
      setTitle('');
      setUploadComplete(false);
      onClose();
    }
  }, [isUploading, cancelUpload, reset, onClose]);

  /**
   * Handle escape key press
   */
  useEffect(() => {
    const handleEscape = (e: KeyboardEvent) => {
      if (e.key === 'Escape' && isOpen) {
        handleClose();
      }
    };

    document.addEventListener('keydown', handleEscape);
    return () => document.removeEventListener('keydown', handleEscape);
  }, [isOpen, handleClose]);

  /**
   * Prevent body scroll when modal is open
   */
  useEffect(() => {
    if (isOpen) {
      document.body.style.overflow = 'hidden';
    } else {
      document.body.style.overflow = '';
    }

    return () => {
      document.body.style.overflow = '';
    };
  }, [isOpen]);

  if (!isOpen) return null;

  return (
    <>
      {/* Backdrop */}
      <div
        className="fixed inset-0 bg-black/80 backdrop-blur-sm z-50 animate-in fade-in duration-200"
        onClick={handleClose}
        aria-hidden="true"
      />

      {/* Modal */}
      <div
        className={cn(
          'fixed inset-0 z-50 flex items-center justify-center p-4 pointer-events-none',
          className
        )}
      >
        <div
          className={cn(
            'relative w-full max-w-3xl max-h-[90vh] overflow-y-auto pointer-events-auto',
            'bg-gradient-to-br from-slate-900 via-slate-900 to-slate-800',
            'border border-white/10 rounded-3xl shadow-2xl',
            'animate-in zoom-in-95 slide-in-from-bottom-4 duration-300'
          )}
          onClick={(e) => e.stopPropagation()}
          role="dialog"
          aria-modal="true"
          aria-labelledby="upload-modal-title"
        >
          {/* Header */}
          <div className="sticky top-0 z-10 flex items-center justify-between p-6 border-b border-white/10 bg-slate-900/80 backdrop-blur-lg rounded-t-3xl">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-teal-500/20 to-cyan-500/20 border border-teal-500/30 flex items-center justify-center">
                <Upload className="w-5 h-5 text-teal-400" />
              </div>
              <div>
                <h2
                  id="upload-modal-title"
                  className="text-xl font-semibold text-white"
                >
                  Upload Recording
                </h2>
                <p className="text-sm text-slate-400">
                  Upload audio or video file for transcription
                </p>
              </div>
            </div>

            {/* Close Button */}
            <Button
              variant="ghost-glass"
              size="icon"
              onClick={handleClose}
              className="hover:bg-red-500/20 hover:text-red-400"
              aria-label="Close modal"
            >
              <X className="w-5 h-5" />
            </Button>
          </div>

          {/* Content */}
          <div className="p-6 space-y-6">
            {!selectedFile ? (
              /* File Drop Zone */
              <FileDropZone
                onFileSelect={handleFileSelect}
                disabled={isUploading}
              />
            ) : (
              /* Upload Progress & Settings */
              <div className="space-y-6">
                {/* Meeting Title Input */}
                <div className="space-y-2">
                  <label
                    htmlFor="meeting-title"
                    className="block text-sm font-medium text-slate-300"
                  >
                    Meeting Title
                  </label>
                  <input
                    id="meeting-title"
                    type="text"
                    value={title}
                    onChange={(e) => setTitle(e.target.value)}
                    disabled={isUploading || uploadComplete}
                    placeholder="Enter meeting title..."
                    className={cn(
                      'w-full px-4 py-3 rounded-xl',
                      'bg-slate-800/50 border border-white/10',
                      'text-white placeholder:text-slate-500',
                      'focus:outline-none focus:ring-2 focus:ring-teal-500/50 focus:border-teal-500',
                      'transition-all duration-200',
                      'disabled:opacity-50 disabled:cursor-not-allowed'
                    )}
                  />
                </div>

                {/* Auto Transcribe Toggle */}
                <div className="flex items-center justify-between p-4 rounded-xl bg-slate-800/30 border border-white/5">
                  <div className="space-y-1">
                    <label
                      htmlFor="auto-transcribe"
                      className="text-sm font-medium text-white cursor-pointer"
                    >
                      Auto-transcribe recording
                    </label>
                    <p className="text-xs text-slate-400">
                      Automatically start transcription after upload completes
                    </p>
                  </div>
                  <button
                    id="auto-transcribe"
                    type="button"
                    role="switch"
                    aria-checked={autoTranscribe}
                    onClick={() => setAutoTranscribe(!autoTranscribe)}
                    disabled={isUploading || uploadComplete}
                    className={cn(
                      'relative inline-flex h-6 w-11 items-center rounded-full transition-colors',
                      'focus:outline-none focus:ring-2 focus:ring-teal-500 focus:ring-offset-2 focus:ring-offset-slate-900',
                      'disabled:opacity-50 disabled:cursor-not-allowed',
                      autoTranscribe ? 'bg-teal-500' : 'bg-slate-700'
                    )}
                  >
                    <span
                      className={cn(
                        'inline-block h-4 w-4 transform rounded-full bg-white transition-transform',
                        autoTranscribe ? 'translate-x-6' : 'translate-x-1'
                      )}
                    />
                  </button>
                </div>

                {/* Upload Progress */}
                <UploadProgress
                  file={selectedFile}
                  progress={progress}
                  isUploading={isUploading}
                  error={error}
                  onCancel={cancelUpload}
                  onRetry={handleRetry}
                />

                {/* Action Buttons */}
                {!isUploading && !uploadComplete && !error && (
                  <div className="flex items-center gap-3 pt-2">
                    <Button
                      variant="gradient-primary"
                      size="lg"
                      onClick={handleStartUpload}
                      className="flex-1"
                    >
                      Start Upload
                    </Button>
                    <Button
                      variant="ghost-glass"
                      size="lg"
                      onClick={() => setSelectedFile(null)}
                      className="flex-1"
                    >
                      Choose Different File
                    </Button>
                  </div>
                )}
              </div>
            )}
          </div>

          {/* Footer Info */}
          <div className="p-6 pt-0">
            <div className="p-4 rounded-xl bg-slate-800/20 border border-white/5">
              <p className="text-xs text-slate-400 text-center">
                Supported formats: MP3, MP4, WAV, M4A, WebM, OGG, MOV • Max size: 2GB
              </p>
            </div>
          </div>
        </div>
      </div>
    </>
  );
}
