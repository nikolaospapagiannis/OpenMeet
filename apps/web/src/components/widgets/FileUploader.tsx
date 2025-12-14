'use client';

import { useState, useCallback, useRef, useEffect } from 'react';
import { Upload, File, X, CheckCircle, AlertCircle } from 'lucide-react';
import { CardGlass } from '@/components/ui/card-glass';
import { Button } from '@/components/ui/button-v2';
import { cn } from '@/lib/utils';

interface FileUploaderProps {
  onUpload: (files: File[]) => Promise<void>;
  accept?: string;
  maxSize?: number;
  multiple?: boolean;
  className?: string;
}

interface FileWithStatus extends File {
  status: 'pending' | 'uploading' | 'success' | 'error';
  progress?: number;
  error?: string;
}

export function FileUploader({
  onUpload,
  accept = "audio/*,video/*,.mp3,.mp4,.wav,.m4a",
  maxSize = 100 * 1024 * 1024, // 100MB
  multiple = false,
  className
}: FileUploaderProps) {
  const [dragActive, setDragActive] = useState(false);
  const [files, setFiles] = useState<FileWithStatus[]>([]);
  const [uploading, setUploading] = useState(false);
  const [focusedFileIndex, setFocusedFileIndex] = useState<number | null>(null);
  const inputRef = useRef<HTMLInputElement>(null);
  const dropZoneRef = useRef<HTMLDivElement>(null);

  const formatFileSize = (bytes: number): string => {
    if (bytes === 0) return '0 Bytes';
    const k = 1024;
    const sizes = ['Bytes', 'KB', 'MB', 'GB'];
    const i = Math.floor(Math.log(bytes) / Math.log(k));
    return Math.round((bytes / Math.pow(k, i)) * 100) / 100 + ' ' + sizes[i];
  };

  const validateFile = (file: File): string | null => {
    if (file.size > maxSize) {
      return `File size exceeds ${formatFileSize(maxSize)}`;
    }

    if (accept !== '*') {
      const acceptedTypes = accept.split(',').map(t => t.trim());
      const fileExtension = '.' + file.name.split('.').pop()?.toLowerCase();
      const fileMimeType = file.type.toLowerCase();

      const isAccepted = acceptedTypes.some(type => {
        if (type.startsWith('.')) {
          return fileExtension === type.toLowerCase();
        }
        if (type.endsWith('/*')) {
          return fileMimeType.startsWith(type.replace('/*', ''));
        }
        return fileMimeType === type;
      });

      if (!isAccepted) {
        return 'File type not accepted';
      }
    }

    return null;
  };

  const addFiles = (newFiles: File[]) => {
    const filesToAdd: FileWithStatus[] = newFiles.map(file => {
      const error = validateFile(file);
      return Object.assign(file, {
        status: error ? 'error' as const : 'pending' as const,
        error: error || undefined
      });
    });

    setFiles(multiple ? [...files, ...filesToAdd] : [filesToAdd[0]]);
  };

  const handleDrag = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    if (e.type === "dragenter" || e.type === "dragover") {
      setDragActive(true);
    } else if (e.type === "dragleave") {
      setDragActive(false);
    }
  }, []);

  const handleDrop = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    setDragActive(false);

    if (e.dataTransfer.files && e.dataTransfer.files[0]) {
      const newFiles = Array.from(e.dataTransfer.files);
      addFiles(newFiles);
    }
  }, [files, multiple]);

  const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    e.preventDefault();
    if (e.target.files && e.target.files[0]) {
      const newFiles = Array.from(e.target.files);
      addFiles(newFiles);
    }
  };

  const removeFile = (index: number) => {
    setFiles(files.filter((_, i) => i !== index));
    if (focusedFileIndex === index) {
      setFocusedFileIndex(null);
    }
  };

  const handleUpload = async () => {
    const validFiles = files.filter(f => f.status === 'pending');
    if (validFiles.length === 0) return;

    setUploading(true);

    try {
      await onUpload(validFiles);
      setFiles(files.map(f =>
        f.status === 'pending' ? { ...f, status: 'success' as const } : f
      ));

      // Clear successful uploads after 2 seconds
      setTimeout(() => {
        setFiles(files.filter(f => f.status !== 'success'));
      }, 2000);
    } catch (error) {
      setFiles(files.map(f =>
        f.status === 'pending'
          ? { ...f, status: 'error' as const, error: 'Upload failed' }
          : f
      ));
    } finally {
      setUploading(false);
    }
  };

  const onButtonClick = () => {
    inputRef.current?.click();
  };

  // Keyboard navigation for drop zone
  const handleDropZoneKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter' || e.key === ' ') {
      e.preventDefault();
      onButtonClick();
    }
  };

  // Keyboard navigation for file list
  const handleFileKeyDown = (e: React.KeyboardEvent, index: number) => {
    switch (e.key) {
      case 'Delete':
      case 'Backspace':
        e.preventDefault();
        removeFile(index);
        break;
      case 'ArrowDown':
        e.preventDefault();
        if (index < files.length - 1) {
          setFocusedFileIndex(index + 1);
        }
        break;
      case 'ArrowUp':
        e.preventDefault();
        if (index > 0) {
          setFocusedFileIndex(index - 1);
        }
        break;
    }
  };

  // Focus file when focusedFileIndex changes
  useEffect(() => {
    if (focusedFileIndex !== null) {
      const fileElement = document.getElementById(`file-item-${focusedFileIndex}`);
      fileElement?.focus();
    }
  }, [focusedFileIndex]);

  const pendingCount = files.filter(f => f.status === 'pending').length;

  return (
    <CardGlass variant="elevated" gradient className={className}>
      <div
        ref={dropZoneRef}
        tabIndex={0}
        role="button"
        aria-label="Upload files. Press Enter or Space to browse files, or drag and drop."
        className={cn(
          "relative border-2 border-dashed rounded-xl p-12 text-center transition-all duration-300 cursor-pointer",
          "focus:outline-none focus:ring-2 focus:ring-teal-500/50 focus:border-teal-500",
          dragActive
            ? "border-teal-500 bg-teal-500/10 scale-[1.02]"
            : "border-white/20 hover:border-white/30"
        )}
        onDragEnter={handleDrag}
        onDragLeave={handleDrag}
        onDragOver={handleDrag}
        onDrop={handleDrop}
        onClick={onButtonClick}
        onKeyDown={handleDropZoneKeyDown}
      >
        <div className="flex flex-col items-center gap-4">
          <div className={cn(
            "w-16 h-16 rounded-xl flex items-center justify-center transition-all duration-300",
            "bg-gradient-to-br from-teal-500/20 to-cyan-500/20 border border-teal-500/30",
            dragActive && "scale-110 shadow-lg shadow-teal-500/30"
          )}>
            <Upload className={cn(
              "w-8 h-8 text-teal-400 transition-transform duration-300",
              dragActive && "scale-110"
            )} />
          </div>
          <div>
            <h3 className="text-lg font-semibold text-white mb-2">
              {dragActive ? 'Drop your files here' : 'Upload files'}
            </h3>
            <p className="text-sm text-slate-400 mb-1">
              Click to browse or drag and drop
            </p>
            <p className="text-xs text-slate-500">
              Max {formatFileSize(maxSize)} | Press Enter or Space to browse
            </p>
          </div>
        </div>
        <input
          ref={inputRef}
          type="file"
          accept={accept}
          multiple={multiple}
          onChange={handleChange}
          className="hidden"
          aria-hidden="true"
        />
      </div>

      {/* File List */}
      {files.length > 0 && (
        <div
          className="mt-6 space-y-3 animate-in fade-in slide-in-from-bottom-4 duration-300"
          role="list"
          aria-label="Selected files"
        >
          {files.map((file, idx) => (
            <div
              id={`file-item-${idx}`}
              key={idx}
              role="listitem"
              tabIndex={0}
              aria-label={`${file.name}, ${formatFileSize(file.size)}, ${file.status}${file.error ? `, Error: ${file.error}` : ''}. Press Delete to remove.`}
              onKeyDown={(e) => handleFileKeyDown(e, idx)}
              className={cn(
                "flex items-center justify-between p-4 rounded-xl border transition-all duration-300",
                "focus:outline-none focus:ring-2 focus:ring-teal-500/50",
                file.status === 'error'
                  ? "bg-red-500/10 border-red-500/30"
                  : file.status === 'success'
                  ? "bg-green-500/10 border-green-500/30"
                  : "bg-slate-800/30 border-white/5 hover:border-white/10"
              )}
            >
              <div className="flex items-center gap-3 flex-1 min-w-0">
                <div className={cn(
                  "flex-shrink-0 w-10 h-10 rounded-lg flex items-center justify-center",
                  file.status === 'error'
                    ? "bg-red-500/20"
                    : file.status === 'success'
                    ? "bg-green-500/20"
                    : "bg-teal-500/20"
                )}>
                  {file.status === 'error' ? (
                    <AlertCircle className="w-5 h-5 text-red-400" />
                  ) : file.status === 'success' ? (
                    <CheckCircle className="w-5 h-5 text-green-400" />
                  ) : (
                    <File className="w-5 h-5 text-teal-400" />
                  )}
                </div>
                <div className="flex-1 min-w-0">
                  <div className="font-medium text-white truncate">{file.name}</div>
                  <div className="text-xs text-slate-400 flex items-center gap-2">
                    <span>{formatFileSize(file.size)}</span>
                    {file.error && (
                      <>
                        <span className="text-slate-600">|</span>
                        <span className="text-red-400">{file.error}</span>
                      </>
                    )}
                  </div>
                </div>
              </div>
              <Button
                variant="ghost-glass"
                size="icon"
                className="h-8 w-8 flex-shrink-0 hover:bg-red-500/20 hover:text-red-400"
                onClick={(e) => {
                  e.stopPropagation();
                  removeFile(idx);
                }}
                aria-label={`Remove ${file.name}`}
              >
                <X className="w-4 h-4" />
              </Button>
            </div>
          ))}

          {pendingCount > 0 && (
            <Button
              variant="gradient-primary"
              className="w-full"
              onClick={(e) => {
                e.stopPropagation();
                handleUpload();
              }}
              disabled={uploading}
              isLoading={uploading}
              loadingText={`Uploading ${pendingCount} file${pendingCount > 1 ? 's' : ''}...`}
            >
              Upload {pendingCount} file{pendingCount > 1 ? 's' : ''}
            </Button>
          )}
        </div>
      )}
    </CardGlass>
  );
}
