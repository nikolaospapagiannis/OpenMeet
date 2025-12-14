import { useState, useCallback, useRef } from 'react';

export interface UploadProgress {
  loaded: number;
  total: number;
  percentage: number;
  speed: number; // bytes per second
  estimatedTimeRemaining: number; // seconds
}

export interface UseFileUploadOptions {
  onSuccess?: (response: any) => void;
  onError?: (error: Error) => void;
  onProgress?: (progress: UploadProgress) => void;
  chunkSize?: number; // For chunked uploads (default 5MB)
  maxRetries?: number;
}

export interface UploadResult {
  success: boolean;
  recording?: any;
  meeting?: any;
  error?: string;
}

const CHUNK_SIZE = 5 * 1024 * 1024; // 5MB chunks
const MAX_RETRIES = 3;

/**
 * Custom hook for handling file uploads to S3/MinIO with chunked upload support
 * Handles files up to 2GB with progress tracking and retry logic
 */
export function useFileUpload(options: UseFileUploadOptions = {}) {
  const {
    onSuccess,
    onError,
    onProgress,
    chunkSize = CHUNK_SIZE,
    maxRetries = MAX_RETRIES,
  } = options;

  const [isUploading, setIsUploading] = useState(false);
  const [progress, setProgress] = useState<UploadProgress>({
    loaded: 0,
    total: 0,
    percentage: 0,
    speed: 0,
    estimatedTimeRemaining: 0,
  });
  const [error, setError] = useState<string | null>(null);

  const abortControllerRef = useRef<AbortController | null>(null);
  const startTimeRef = useRef<number>(0);
  const lastLoadedRef = useRef<number>(0);
  const lastTimeRef = useRef<number>(0);

  /**
   * Calculate upload speed and estimated time remaining
   */
  const calculateProgress = useCallback(
    (loaded: number, total: number): UploadProgress => {
      const now = Date.now();
      const timeElapsed = (now - startTimeRef.current) / 1000; // seconds
      const bytesUploaded = loaded - lastLoadedRef.current;
      const timeDiff = (now - lastTimeRef.current) / 1000; // seconds

      // Calculate speed (bytes per second)
      const speed = timeDiff > 0 ? bytesUploaded / timeDiff : 0;

      // Calculate estimated time remaining
      const bytesRemaining = total - loaded;
      const estimatedTimeRemaining = speed > 0 ? bytesRemaining / speed : 0;

      lastLoadedRef.current = loaded;
      lastTimeRef.current = now;

      return {
        loaded,
        total,
        percentage: total > 0 ? Math.round((loaded / total) * 100) : 0,
        speed,
        estimatedTimeRemaining,
      };
    },
    []
  );

  /**
   * Upload small file (< 50MB) using standard multipart/form-data
   */
  const uploadSmallFile = async (
    file: File,
    metadata: Record<string, any> = {}
  ): Promise<UploadResult> => {
    const formData = new FormData();
    formData.append('file', file);

    // Add metadata
    Object.entries(metadata).forEach(([key, value]) => {
      formData.append(key, String(value));
    });

    const response = await fetch(
      `${process.env.NEXT_PUBLIC_API_URL}/api/recordings/upload`,
      {
        method: 'POST',
        body: formData,
        credentials: 'include',
        signal: abortControllerRef.current?.signal,
      }
    );

    if (!response.ok) {
      const errorData = await response.json();
      throw new Error(errorData.error || 'Upload failed');
    }

    const result = await response.json();
    return {
      success: result.success,
      recording: result.recording,
      meeting: result.meeting,
    };
  };

  /**
   * Upload large file (>= 50MB) using multipart upload with S3
   */
  const uploadLargeFile = async (
    file: File,
    metadata: Record<string, any> = {}
  ): Promise<UploadResult> => {
    const totalChunks = Math.ceil(file.size / chunkSize);
    let uploadId: string | null = null;

    try {
      // Step 1: Initialize multipart upload
      const initResponse = await fetch(
        `${process.env.NEXT_PUBLIC_API_URL}/api/recordings/multipart/init`,
        {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          credentials: 'include',
          body: JSON.stringify({
            fileName: file.name,
            fileType: file.type,
            fileSize: file.size,
            ...metadata,
          }),
          signal: abortControllerRef.current?.signal,
        }
      );

      if (!initResponse.ok) {
        throw new Error('Failed to initialize multipart upload');
      }

      const { uploadId: id, key } = await initResponse.json();
      uploadId = id;

      // Step 2: Upload parts
      const uploadedParts: Array<{ partNumber: number; etag: string }> = [];

      for (let partNumber = 1; partNumber <= totalChunks; partNumber++) {
        const start = (partNumber - 1) * chunkSize;
        const end = Math.min(start + chunkSize, file.size);
        const chunk = file.slice(start, end);

        let retries = 0;
        let partUploaded = false;

        while (retries < maxRetries && !partUploaded) {
          try {
            // Get presigned URL for this part
            const urlResponse = await fetch(
              `${process.env.NEXT_PUBLIC_API_URL}/api/recordings/multipart/upload-url`,
              {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                credentials: 'include',
                body: JSON.stringify({
                  uploadId,
                  key,
                  partNumber,
                }),
                signal: abortControllerRef.current?.signal,
              }
            );

            if (!urlResponse.ok) {
              throw new Error('Failed to get upload URL');
            }

            const { uploadUrl } = await urlResponse.json();

            // Upload chunk to S3
            const uploadResponse = await fetch(uploadUrl, {
              method: 'PUT',
              body: chunk,
              headers: {
                'Content-Type': file.type,
              },
              signal: abortControllerRef.current?.signal,
            });

            if (!uploadResponse.ok) {
              throw new Error(`Failed to upload part ${partNumber}`);
            }

            const etag = uploadResponse.headers.get('ETag');
            if (!etag) {
              throw new Error(`No ETag received for part ${partNumber}`);
            }

            uploadedParts.push({ partNumber, etag: etag.replace(/"/g, '') });
            partUploaded = true;

            // Update progress
            const progressData = calculateProgress(end, file.size);
            setProgress(progressData);
            onProgress?.(progressData);
          } catch (err) {
            retries++;
            if (retries >= maxRetries) {
              throw err;
            }
            // Wait before retrying (exponential backoff)
            await new Promise((resolve) =>
              setTimeout(resolve, Math.pow(2, retries) * 1000)
            );
          }
        }
      }

      // Step 3: Complete multipart upload
      const completeResponse = await fetch(
        `${process.env.NEXT_PUBLIC_API_URL}/api/recordings/multipart/complete`,
        {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          credentials: 'include',
          body: JSON.stringify({
            uploadId,
            key,
            parts: uploadedParts,
            metadata,
          }),
          signal: abortControllerRef.current?.signal,
        }
      );

      if (!completeResponse.ok) {
        throw new Error('Failed to complete multipart upload');
      }

      const result = await completeResponse.json();
      return {
        success: result.success,
        recording: result.recording,
        meeting: result.meeting,
      };
    } catch (err) {
      // Abort multipart upload on error
      if (uploadId) {
        try {
          await fetch(
            `${process.env.NEXT_PUBLIC_API_URL}/api/recordings/multipart/abort`,
            {
              method: 'POST',
              headers: { 'Content-Type': 'application/json' },
              credentials: 'include',
              body: JSON.stringify({ uploadId }),
            }
          );
        } catch (abortErr) {
          console.error('Failed to abort multipart upload:', abortErr);
        }
      }
      throw err;
    }
  };

  /**
   * Upload file with automatic chunking for large files
   */
  const uploadFile = useCallback(
    async (
      file: File,
      metadata: {
        title?: string;
        language?: string;
        autoTranscribe?: boolean;
      } = {}
    ): Promise<UploadResult> => {
      setIsUploading(true);
      setError(null);
      setProgress({
        loaded: 0,
        total: file.size,
        percentage: 0,
        speed: 0,
        estimatedTimeRemaining: 0,
      });

      // Initialize timing
      startTimeRef.current = Date.now();
      lastLoadedRef.current = 0;
      lastTimeRef.current = Date.now();

      // Create abort controller
      abortControllerRef.current = new AbortController();

      try {
        let result: UploadResult;

        // Use chunked upload for files >= 50MB
        const LARGE_FILE_THRESHOLD = 50 * 1024 * 1024; // 50MB
        if (file.size >= LARGE_FILE_THRESHOLD) {
          result = await uploadLargeFile(file, metadata);
        } else {
          result = await uploadSmallFile(file, metadata);

          // Set progress to 100% for small files
          const finalProgress = {
            loaded: file.size,
            total: file.size,
            percentage: 100,
            speed: 0,
            estimatedTimeRemaining: 0,
          };
          setProgress(finalProgress);
          onProgress?.(finalProgress);
        }

        onSuccess?.(result);
        return result;
      } catch (err: any) {
        const errorMessage = err.message || 'Upload failed';
        setError(errorMessage);
        onError?.(err);
        return {
          success: false,
          error: errorMessage,
        };
      } finally {
        setIsUploading(false);
        abortControllerRef.current = null;
      }
    },
    [calculateProgress, onSuccess, onError, onProgress, chunkSize, maxRetries]
  );

  /**
   * Cancel ongoing upload
   */
  const cancelUpload = useCallback(() => {
    if (abortControllerRef.current) {
      abortControllerRef.current.abort();
      setIsUploading(false);
      setError('Upload cancelled');
    }
  }, []);

  /**
   * Reset upload state
   */
  const reset = useCallback(() => {
    setIsUploading(false);
    setProgress({
      loaded: 0,
      total: 0,
      percentage: 0,
      speed: 0,
      estimatedTimeRemaining: 0,
    });
    setError(null);
    abortControllerRef.current = null;
  }, []);

  return {
    uploadFile,
    cancelUpload,
    reset,
    isUploading,
    progress,
    error,
  };
}
