'use client';

import { useState, useRef } from 'react';
import { Upload, FileVideo, FileAudio, X, CheckCircle } from 'lucide-react';
import { CardGlass } from '@/components/ui/card-glass';
import { Button } from '@/components/ui/button';

interface QuickUploadCardProps {
  onUploadComplete?: (file: File) => void;
  onOpenFullModal?: () => void;
}

/**
 * QuickUploadCard Component
 * Compact upload card with drag & drop functionality
 */
export function QuickUploadCard({
  onUploadComplete,
  onOpenFullModal
}: QuickUploadCardProps) {
  const [isDragging, setIsDragging] = useState(false);
  const [selectedFile, setSelectedFile] = useState<File | null>(null);
  const [uploadStatus, setUploadStatus] = useState<'idle' | 'uploading' | 'success' | 'error'>('idle');
  const fileInputRef = useRef<HTMLInputElement>(null);

  const supportedFormats = [
    { type: 'video', extensions: ['MP4', 'MOV', 'AVI', 'WEBM'], icon: FileVideo },
    { type: 'audio', extensions: ['MP3', 'WAV', 'M4A', 'OGG'], icon: FileAudio }
  ];

  const handleDragEnter = (e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    setIsDragging(true);
  };

  const handleDragLeave = (e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    setIsDragging(false);
  };

  const handleDragOver = (e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
  };

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    setIsDragging(false);

    const files = e.dataTransfer.files;
    if (files && files.length > 0) {
      handleFileSelect(files[0]);
    }
  };

  const handleFileSelect = (file: File) => {
    // Validate file type
    const validExtensions = supportedFormats.flatMap(f => f.extensions);
    const fileExtension = file.name.split('.').pop()?.toUpperCase();

    if (!fileExtension || !validExtensions.includes(fileExtension)) {
      setUploadStatus('error');
      return;
    }

    setSelectedFile(file);
    setUploadStatus('idle');
  };

  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = e.target.files;
    if (files && files.length > 0) {
      handleFileSelect(files[0]);
    }
  };

  const handleUpload = () => {
    if (!selectedFile) return;

    setUploadStatus('uploading');

    // Simulate upload (in real implementation, this would call an API)
    setTimeout(() => {
      setUploadStatus('success');
      onUploadComplete?.(selectedFile);

      // Reset after success
      setTimeout(() => {
        setSelectedFile(null);
        setUploadStatus('idle');
      }, 2000);
    }, 1500);
  };

  const handleClear = () => {
    setSelectedFile(null);
    setUploadStatus('idle');
    if (fileInputRef.current) {
      fileInputRef.current.value = '';
    }
  };

  const formatFileSize = (bytes: number) => {
    if (bytes < 1024) return bytes + ' B';
    if (bytes < 1024 * 1024) return (bytes / 1024).toFixed(1) + ' KB';
    return (bytes / (1024 * 1024)).toFixed(1) + ' MB';
  };

  return (
    <CardGlass variant="default" padding="md" className="w-full">
      {/* Header */}
      <div className="flex items-center justify-between mb-4">
        <h3 className="text-lg font-semibold text-white">Quick Upload</h3>
        <button
          onClick={onOpenFullModal}
          className="text-sm text-purple-400 hover:text-purple-300 underline"
        >
          Advanced options
        </button>
      </div>

      {/* Drag & Drop Area */}
      <div
        onDragEnter={handleDragEnter}
        onDragOver={handleDragOver}
        onDragLeave={handleDragLeave}
        onDrop={handleDrop}
        className={`relative border-2 border-dashed rounded-lg transition-all duration-200 ${
          isDragging
            ? 'border-purple-500 bg-purple-500/10'
            : selectedFile
            ? 'border-emerald-500/50 bg-emerald-500/5'
            : 'border-slate-700 bg-slate-800/30 hover:border-slate-600 hover:bg-slate-800/50'
        }`}
      >
        {!selectedFile ? (
          <div className="p-8 text-center">
            <div className="bg-slate-800/50 p-4 rounded-full inline-block mb-4">
              <Upload className="h-8 w-8 text-slate-400" />
            </div>
            <h4 className="text-white font-medium mb-2">
              Drag & drop your meeting file
            </h4>
            <p className="text-sm text-slate-400 mb-4">or</p>
            <Button
              onClick={() => fileInputRef.current?.click()}
              className="bg-gradient-to-r from-purple-600 to-cyan-600 hover:from-purple-500 hover:to-cyan-500 text-white border-0"
            >
              Browse Files
            </Button>
            <input
              ref={fileInputRef}
              type="file"
              accept="video/*,audio/*"
              onChange={handleInputChange}
              className="hidden"
            />
          </div>
        ) : (
          <div className="p-6">
            <div className="flex items-start space-x-4">
              <div className="bg-emerald-500/20 p-3 rounded-lg border border-emerald-500/30">
                {selectedFile.type.startsWith('video/') ? (
                  <FileVideo className="h-6 w-6 text-emerald-400" />
                ) : (
                  <FileAudio className="h-6 w-6 text-emerald-400" />
                )}
              </div>
              <div className="flex-1 min-w-0">
                <h4 className="text-white font-medium truncate">{selectedFile.name}</h4>
                <p className="text-sm text-slate-400">{formatFileSize(selectedFile.size)}</p>
              </div>
              {uploadStatus === 'idle' && (
                <button
                  onClick={handleClear}
                  className="text-slate-400 hover:text-white transition-colors"
                  aria-label="Remove file"
                >
                  <X className="h-5 w-5" />
                </button>
              )}
              {uploadStatus === 'success' && (
                <CheckCircle className="h-6 w-6 text-emerald-400" />
              )}
            </div>

            {uploadStatus === 'idle' && (
              <div className="mt-4">
                <Button
                  onClick={handleUpload}
                  className="w-full bg-gradient-to-r from-purple-600 to-cyan-600 hover:from-purple-500 hover:to-cyan-500 text-white border-0"
                >
                  <Upload className="h-4 w-4 mr-2" />
                  Upload & Process
                </Button>
              </div>
            )}

            {uploadStatus === 'uploading' && (
              <div className="mt-4">
                <div className="bg-slate-800/50 rounded-full h-2 overflow-hidden">
                  <div className="bg-gradient-to-r from-purple-500 to-cyan-500 h-full animate-pulse" style={{ width: '60%' }} />
                </div>
                <p className="text-sm text-slate-400 text-center mt-2">Uploading...</p>
              </div>
            )}

            {uploadStatus === 'success' && (
              <div className="mt-4 text-center">
                <p className="text-sm text-emerald-400">Upload successful!</p>
              </div>
            )}

            {uploadStatus === 'error' && (
              <div className="mt-4 text-center">
                <p className="text-sm text-red-400">Invalid file format. Please try again.</p>
                <Button
                  onClick={handleClear}
                  variant="outline"
                  size="sm"
                  className="mt-2 border-slate-700 text-slate-300"
                >
                  Try Again
                </Button>
              </div>
            )}
          </div>
        )}
      </div>

      {/* Supported Formats */}
      <div className="mt-4">
        <p className="text-xs text-slate-500 mb-2">Supported formats:</p>
        <div className="flex flex-wrap gap-2">
          {supportedFormats.map((format) => (
            <div
              key={format.type}
              className="flex items-center space-x-1 bg-slate-800/50 px-2 py-1 rounded text-xs text-slate-400"
            >
              <format.icon className="h-3 w-3" />
              <span>{format.extensions.join(', ')}</span>
            </div>
          ))}
        </div>
      </div>

      {/* Help Link */}
      <div className="mt-4 pt-4 border-t border-slate-700/50">
        <p className="text-xs text-slate-500 text-center">
          Max file size: 2GB.{' '}
          <a
            href="/docs/upload-guidelines"
            className="text-purple-400 hover:text-purple-300 underline"
          >
            Upload guidelines
          </a>
        </p>
      </div>
    </CardGlass>
  );
}
