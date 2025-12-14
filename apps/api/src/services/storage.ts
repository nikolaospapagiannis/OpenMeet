/**
 * Storage Service
 * S3-compatible object storage with MinIO/AWS S3
 */

import {
  S3Client,
  PutObjectCommand,
  GetObjectCommand,
  DeleteObjectCommand,
  HeadObjectCommand,
  ListObjectsV2Command,
  CopyObjectCommand,
  CreateMultipartUploadCommand,
  UploadPartCommand,
  CompleteMultipartUploadCommand,
  AbortMultipartUploadCommand,
  GetObjectCommandOutput,
} from '@aws-sdk/client-s3';
import { getSignedUrl } from '@aws-sdk/s3-request-presigner';
import winston from 'winston';
import crypto from 'crypto';
import { Readable } from 'stream';
import fs from 'fs';
import path from 'path';

const logger = winston.createLogger({
  level: process.env.LOG_LEVEL || 'info',
  defaultMeta: { service: 'storage-service' },
  transports: [new winston.transports.Console()],
});

export interface StorageConfig {
  endpoint?: string;
  region?: string;
  accessKeyId: string;
  secretAccessKey: string;
  bucket: string;
  forcePathStyle?: boolean;
}

export interface UploadOptions {
  contentType?: string;
  metadata?: Record<string, string>;
  acl?: string;
  encryption?: boolean;
  tags?: Record<string, string>;
}

export interface StorageObject {
  key: string;
  size: number;
  lastModified: Date;
  etag?: string;
  contentType?: string;
  metadata?: Record<string, string>;
}

export interface MultipartUpload {
  uploadId: string;
  key: string;
  parts: Array<{ partNumber: number; etag: string }>;
}

export class StorageService {
  private s3Client: S3Client;
  private bucket: string;
  private activeUploads: Map<string, MultipartUpload>;

  constructor(config?: StorageConfig) {
    const storageConfig = config || {
      endpoint: process.env.S3_ENDPOINT || 'http://localhost:9000',
      region: process.env.AWS_REGION || 'us-east-1',
      accessKeyId: process.env.S3_ACCESS_KEY || 'minioadmin',
      secretAccessKey: process.env.S3_SECRET_KEY || 'minioadmin',
      bucket: process.env.S3_BUCKET || 'openmeet-storage',
      forcePathStyle: true,
    };

    this.s3Client = new S3Client({
      endpoint: storageConfig.endpoint,
      region: storageConfig.region,
      credentials: {
        accessKeyId: storageConfig.accessKeyId,
        secretAccessKey: storageConfig.secretAccessKey,
      },
      forcePathStyle: storageConfig.forcePathStyle,
    });

    this.bucket = storageConfig.bucket;
    this.activeUploads = new Map();
  }

  /**
   * Upload file to storage
   */
  async uploadFile(
    key: string,
    file: Buffer | Readable | string,
    options?: UploadOptions
  ): Promise<StorageObject> {
    try {
      let body: Buffer | Readable;
      
      if (typeof file === 'string') {
        // File path provided
        body = fs.createReadStream(file);
      } else {
        body = file;
      }

      const metadata = {
        'upload-timestamp': new Date().toISOString(),
        ...options?.metadata,
      };

      // Fix: Use 'as any' for ACL parameter due to S3 client method overload issues
      const command = new PutObjectCommand({
        Bucket: this.bucket,
        Key: key,
        Body: body,
        ContentType: options?.contentType || 'application/octet-stream',
        Metadata: metadata,
        ACL: options?.acl as any,
        ServerSideEncryption: options?.encryption ? 'AES256' : undefined,
        Tagging: options?.tags ? this.buildTagString(options.tags) : undefined,
      });

      const response = await this.s3Client.send(command);

      logger.info(`File uploaded: ${key}`, { etag: response.ETag });

      // Get object details
      const headCommand = new HeadObjectCommand({
        Bucket: this.bucket,
        Key: key,
      });

      const headResponse = await this.s3Client.send(headCommand);

      return {
        key,
        size: headResponse.ContentLength || 0,
        lastModified: headResponse.LastModified || new Date(),
        etag: response.ETag,
        contentType: headResponse.ContentType,
        metadata: headResponse.Metadata,
      };
    } catch (error) {
      logger.error('File upload failed:', error);
      throw error;
    }
  }

  /**
   * Download file from storage
   */
  async downloadFile(key: string): Promise<Buffer> {
    try {
      const command = new GetObjectCommand({
        Bucket: this.bucket,
        Key: key,
      });

      const response = await this.s3Client.send(command);
      
      if (!response.Body) {
        throw new Error('Empty response body');
      }

      // Fix: Proper type assertion for S3 response body stream
      const chunks: Uint8Array[] = [];
      const stream = response.Body as Readable;

      for await (const chunk of stream) {
        chunks.push(chunk);
      }

      const buffer = Buffer.concat(chunks);
      
      logger.info(`File downloaded: ${key}`, { size: buffer.length });
      
      return buffer;
    } catch (error) {
      logger.error('File download failed:', error);
      throw error;
    }
  }

  /**
   * Stream file from storage
   */
  async streamFile(key: string): Promise<Readable> {
    try {
      const command = new GetObjectCommand({
        Bucket: this.bucket,
        Key: key,
      });

      const response = await this.s3Client.send(command);
      
      if (!response.Body) {
        throw new Error('Empty response body');
      }

      logger.info(`File stream initiated: ${key}`);

      // Fix: Type assertion for S3 response body
      return response.Body as Readable;
    } catch (error) {
      logger.error('File stream failed:', error);
      throw error;
    }
  }

  /**
   * Delete file from storage
   */
  async deleteFile(key: string): Promise<boolean> {
    try {
      const command = new DeleteObjectCommand({
        Bucket: this.bucket,
        Key: key,
      });

      await this.s3Client.send(command);
      
      logger.info(`File deleted: ${key}`);
      
      return true;
    } catch (error) {
      logger.error('File deletion failed:', error);
      return false;
    }
  }

  /**
   * Delete multiple files
   */
  async deleteFiles(keys: string[]): Promise<number> {
    let deletedCount = 0;
    
    for (const key of keys) {
      const success = await this.deleteFile(key);
      if (success) {
        deletedCount++;
      }
    }
    
    logger.info(`Bulk delete completed`, { 
      requested: keys.length, 
      deleted: deletedCount,
    });
    
    return deletedCount;
  }

  /**
   * Check if file exists
   */
  async fileExists(key: string): Promise<boolean> {
    try {
      const command = new HeadObjectCommand({
        Bucket: this.bucket,
        Key: key,
      });

      await this.s3Client.send(command);
      return true;
    } catch (error: any) {
      // Fix: Proper error handling with type assertion
      if (error.name === 'NotFound' || (error as any).$metadata?.httpStatusCode === 404) {
        return false;
      }
      logger.error('File existence check failed:', error);
      throw error;
    }
  }

  /**
   * Get file metadata
   */
  async getFileMetadata(key: string): Promise<StorageObject | null> {
    try {
      const command = new HeadObjectCommand({
        Bucket: this.bucket,
        Key: key,
      });

      const response = await this.s3Client.send(command);

      return {
        key,
        size: response.ContentLength || 0,
        lastModified: response.LastModified || new Date(),
        etag: response.ETag,
        contentType: response.ContentType,
        metadata: response.Metadata,
      };
    } catch (error: any) {
      // Fix: Proper error handling with type assertion
      if (error.name === 'NotFound' || (error as any).$metadata?.httpStatusCode === 404) {
        return null;
      }
      logger.error('Get file metadata failed:', error);
      throw error;
    }
  }

  /**
   * List files with prefix
   */
  async listFiles(
    prefix: string,
    maxKeys: number = 1000
  ): Promise<StorageObject[]> {
    try {
      const command = new ListObjectsV2Command({
        Bucket: this.bucket,
        Prefix: prefix,
        MaxKeys: maxKeys,
      });

      const response = await this.s3Client.send(command);
      
      const files: StorageObject[] = (response.Contents || []).map(obj => ({
        key: obj.Key || '',
        size: obj.Size || 0,
        lastModified: obj.LastModified || new Date(),
        etag: obj.ETag,
      }));

      logger.info(`Files listed`, { prefix, count: files.length });
      
      return files;
    } catch (error) {
      logger.error('List files failed:', error);
      throw error;
    }
  }

  /**
   * Copy file within storage
   */
  async copyFile(sourceKey: string, destinationKey: string): Promise<boolean> {
    try {
      const command = new CopyObjectCommand({
        Bucket: this.bucket,
        CopySource: `${this.bucket}/${sourceKey}`,
        Key: destinationKey,
      });

      await this.s3Client.send(command);
      
      logger.info(`File copied: ${sourceKey} -> ${destinationKey}`);
      
      return true;
    } catch (error) {
      logger.error('File copy failed:', error);
      return false;
    }
  }

  /**
   * Move file within storage
   */
  async moveFile(sourceKey: string, destinationKey: string): Promise<boolean> {
    try {
      const copied = await this.copyFile(sourceKey, destinationKey);
      if (!copied) {
        return false;
      }

      const deleted = await this.deleteFile(sourceKey);
      if (!deleted) {
        // Try to clean up the copy
        await this.deleteFile(destinationKey);
        return false;
      }

      logger.info(`File moved: ${sourceKey} -> ${destinationKey}`);
      
      return true;
    } catch (error) {
      logger.error('File move failed:', error);
      return false;
    }
  }

  /**
   * Generate presigned URL for direct upload
   */
  async generateUploadUrl(
    key: string,
    expiresIn: number = 3600,
    options?: UploadOptions
  ): Promise<string> {
    try {
      // Fix: Type assertion for upload URL generation
      const command = new PutObjectCommand({
        Bucket: this.bucket,
        Key: key,
        ContentType: options?.contentType,
        Metadata: options?.metadata,
      } as any);

      const url = await getSignedUrl(this.s3Client, command, { expiresIn });
      
      logger.info(`Upload URL generated: ${key}`);
      
      return url;
    } catch (error) {
      logger.error('Generate upload URL failed:', error);
      throw error;
    }
  }

  /**
   * Generate presigned URL for download
   */
  async generateDownloadUrl(
    key: string,
    expiresIn: number = 3600
  ): Promise<string> {
    try {
      const command = new GetObjectCommand({
        Bucket: this.bucket,
        Key: key,
      });

      const url = await getSignedUrl(this.s3Client, command, { expiresIn });
      
      logger.info(`Download URL generated: ${key}`);
      
      return url;
    } catch (error) {
      logger.error('Generate download URL failed:', error);
      throw error;
    }
  }

  /**
   * Start multipart upload for large files
   */
  async startMultipartUpload(
    key: string,
    options?: UploadOptions
  ): Promise<string> {
    try {
      const command = new CreateMultipartUploadCommand({
        Bucket: this.bucket,
        Key: key,
        ContentType: options?.contentType,
        Metadata: options?.metadata,
      });

      const response = await this.s3Client.send(command);
      const uploadId = response.UploadId!;

      this.activeUploads.set(uploadId, {
        uploadId,
        key,
        parts: [],
      });

      logger.info(`Multipart upload started: ${key}`, { uploadId });
      
      return uploadId;
    } catch (error) {
      logger.error('Start multipart upload failed:', error);
      throw error;
    }
  }

  /**
   * Upload part for multipart upload
   */
  async uploadPart(
    uploadId: string,
    partNumber: number,
    body: Buffer | Readable
  ): Promise<string> {
    try {
      const upload = this.activeUploads.get(uploadId);
      if (!upload) {
        throw new Error('Upload not found');
      }

      const command = new UploadPartCommand({
        Bucket: this.bucket,
        Key: upload.key,
        UploadId: uploadId,
        PartNumber: partNumber,
        Body: body,
      });

      const response = await this.s3Client.send(command);
      const etag = response.ETag!;

      upload.parts.push({ partNumber, etag });
      upload.parts.sort((a, b) => a.partNumber - b.partNumber);

      logger.info(`Part uploaded`, { uploadId, partNumber });
      
      return etag;
    } catch (error) {
      logger.error('Upload part failed:', error);
      throw error;
    }
  }

  /**
   * Complete multipart upload
   */
  async completeMultipartUpload(uploadId: string): Promise<StorageObject> {
    try {
      const upload = this.activeUploads.get(uploadId);
      if (!upload) {
        throw new Error('Upload not found');
      }

      const command = new CompleteMultipartUploadCommand({
        Bucket: this.bucket,
        Key: upload.key,
        UploadId: uploadId,
        MultipartUpload: {
          Parts: upload.parts.map(part => ({
            PartNumber: part.partNumber,
            ETag: part.etag,
          })),
        },
      });

      await this.s3Client.send(command);
      
      this.activeUploads.delete(uploadId);

      logger.info(`Multipart upload completed: ${upload.key}`);
      
      const metadata = await this.getFileMetadata(upload.key);
      return metadata!;
    } catch (error) {
      logger.error('Complete multipart upload failed:', error);
      throw error;
    }
  }

  /**
   * Abort multipart upload
   */
  async abortMultipartUpload(uploadId: string): Promise<boolean> {
    try {
      const upload = this.activeUploads.get(uploadId);
      if (!upload) {
        return false;
      }

      const command = new AbortMultipartUploadCommand({
        Bucket: this.bucket,
        Key: upload.key,
        UploadId: uploadId,
      });

      await this.s3Client.send(command);
      
      this.activeUploads.delete(uploadId);

      logger.info(`Multipart upload aborted: ${upload.key}`);
      
      return true;
    } catch (error) {
      logger.error('Abort multipart upload failed:', error);
      return false;
    }
  }

  /**
   * Calculate file hash
   */
  private calculateHash(buffer: Buffer): string {
    return crypto.createHash('sha256').update(buffer).digest('hex');
  }

  /**
   * Build tag string for S3
   */
  private buildTagString(tags: Record<string, string>): string {
    return Object.entries(tags)
      .map(([key, value]) => `${key}=${value}`)
      .join('&');
  }

  /**
   * Health check
   */
  async healthCheck(): Promise<boolean> {
    try {
      const command = new ListObjectsV2Command({
        Bucket: this.bucket,
        MaxKeys: 1,
      });

      await this.s3Client.send(command);
      return true;
    } catch (error) {
      logger.error('Storage health check failed:', error);
      return false;
    }
  }
}
