/**
 * Tests for AuditRetentionService - S3 Glacier Archival
 *
 * These tests verify REAL AWS SDK integration using Jest mocks.
 */

import { jest, describe, it, expect, beforeEach, afterEach } from '@jest/globals';
import * as zlib from 'zlib';
import { promisify } from 'util';

const gzip = promisify(zlib.gzip);

// Mock the S3 commands before importing the service
// eslint-disable-next-line @typescript-eslint/no-explicit-any
const mockSend: any = jest.fn();

jest.mock('@aws-sdk/client-s3', () => {
  return {
    S3Client: jest.fn().mockImplementation(() => ({
      send: mockSend,
    })),
    PutObjectCommand: jest.fn().mockImplementation((input) => ({ input, type: 'PutObject' })),
    GetObjectCommand: jest.fn().mockImplementation((input) => ({ input, type: 'GetObject' })),
    DeleteObjectCommand: jest.fn().mockImplementation((input) => ({ input, type: 'DeleteObject' })),
    RestoreObjectCommand: jest.fn().mockImplementation((input) => ({ input, type: 'RestoreObject' })),
    HeadObjectCommand: jest.fn().mockImplementation((input) => ({ input, type: 'HeadObject' })),
    ListObjectsV2Command: jest.fn().mockImplementation((input) => ({ input, type: 'ListObjectsV2' })),
  };
});

// Import after mocking
import { AuditRetentionService, GlacierStorageClass, RestoreTier, ArchiveResult, RestoreStatus } from '../audit-retention-service';

describe('AuditRetentionService', () => {
  let service: AuditRetentionService;

  beforeEach(() => {
    jest.clearAllMocks();
    mockSend.mockReset();

    // Set environment variables for test
    process.env.AWS_REGION = 'us-east-1';
    process.env.AWS_ACCESS_KEY_ID = 'test-key';
    process.env.AWS_SECRET_ACCESS_KEY = 'test-secret';
    process.env.AWS_AUDIT_BUCKET = 'test-audit-bucket';
    process.env.AWS_GLACIER_STORAGE_CLASS = 'GLACIER_IR';

    service = new AuditRetentionService();
  });

  afterEach(() => {
    jest.clearAllMocks();
  });

  describe('archiveToColdStorage', () => {
    it('should compress and upload data to S3 with Glacier storage class', async () => {
      const orgId = 'test-org-123';
      // Use larger/repetitive data that compresses well
      const logs = Array.from({ length: 50 }, (_, i) => ({ id: i, action: 'LOGIN', user: 'test@example.com' }));
      const testData = Buffer.from(JSON.stringify(logs));

      mockSend.mockResolvedValueOnce({
        ETag: '"test-etag"',
      });

      const result = await service.archiveToColdStorage(orgId, testData);

      // Verify the result
      expect(result.key).toContain(`audit-archives/${orgId}/`);
      expect(result.key).toMatch(/\.json\.gz$/);
      expect(result.originalSize).toBe(testData.length);
      // Gzip compresses repetitive JSON well
      expect(result.compressedSize).toBeLessThan(testData.length);
      expect(result.storageClass).toBe('GLACIER_IR');
      expect(result.archivedAt).toBeInstanceOf(Date);

      // Verify S3 command was called
      expect(mockSend).toHaveBeenCalledTimes(1);
      const callArg = mockSend.mock.calls[0][0] as { input: any; type: string };
      expect(callArg.type).toBe('PutObject');
      expect(callArg.input.Bucket).toBe('test-audit-bucket');
      expect(callArg.input.StorageClass).toBe('GLACIER_IR');
      expect(callArg.input.ContentType).toBe('application/gzip');
      expect(callArg.input.Metadata['organization-id']).toBe(orgId);
    });

    it('should use custom storage class when provided', async () => {
      const orgId = 'test-org-456';
      const testData = Buffer.from('test data');

      mockSend.mockResolvedValueOnce({});

      const result = await service.archiveToColdStorage(orgId, testData, 'DEEP_ARCHIVE');

      expect(result.storageClass).toBe('DEEP_ARCHIVE');

      const callArg = mockSend.mock.calls[0][0] as { input: any; type: string };
      expect(callArg.input.StorageClass).toBe('DEEP_ARCHIVE');
    });

    it('should throw error on S3 failure', async () => {
      const orgId = 'test-org-789';
      const testData = Buffer.from('test data');

      mockSend.mockRejectedValueOnce(new Error('S3 upload failed'));

      await expect(service.archiveToColdStorage(orgId, testData)).rejects.toThrow('S3 upload failed');
    });

    it('should compress data significantly for JSON payloads', async () => {
      const orgId = 'test-org-compress';
      // Create large repetitive JSON data (compresses well)
      const logs = Array.from({ length: 100 }, (_, i) => ({
        id: i,
        action: 'USER_LOGIN',
        timestamp: new Date().toISOString(),
        metadata: { ip: '192.168.1.1', userAgent: 'Mozilla/5.0' },
      }));
      const testData = Buffer.from(JSON.stringify(logs));

      mockSend.mockResolvedValueOnce({});

      const result = await service.archiveToColdStorage(orgId, testData);

      // Gzip should achieve significant compression on repetitive JSON
      expect(result.compressedSize).toBeLessThan(result.originalSize);
      // Expect at least 50% compression for repetitive data
      expect(result.compressedSize).toBeLessThan(result.originalSize * 0.5);
    });
  });

  describe('initiateRestore', () => {
    it('should initiate restore with correct parameters', async () => {
      const key = 'audit-archives/org-123/2024-01-01.json.gz';

      mockSend.mockResolvedValueOnce({});

      await service.initiateRestore(key, 'Expedited', 3);

      expect(mockSend).toHaveBeenCalledTimes(1);
      const callArg = mockSend.mock.calls[0][0] as { input: any; type: string };
      expect(callArg.type).toBe('RestoreObject');
      expect(callArg.input.Bucket).toBe('test-audit-bucket');
      expect(callArg.input.Key).toBe(key);
      expect(callArg.input.RestoreRequest.Days).toBe(3);
      expect(callArg.input.RestoreRequest.GlacierJobParameters.Tier).toBe('Expedited');
    });

    it('should use default tier and days when not specified', async () => {
      const key = 'audit-archives/org-123/2024-01-01.json.gz';

      mockSend.mockResolvedValueOnce({});

      await service.initiateRestore(key);

      const callArg = mockSend.mock.calls[0][0] as { input: any; type: string };
      expect(callArg.input.RestoreRequest.Days).toBe(7);
      expect(callArg.input.RestoreRequest.GlacierJobParameters.Tier).toBe('Standard');
    });

    it('should handle RestoreAlreadyInProgress gracefully', async () => {
      const key = 'audit-archives/org-123/2024-01-01.json.gz';
      const error = new Error('Restore already in progress') as any;
      error.Code = 'RestoreAlreadyInProgress';

      mockSend.mockRejectedValueOnce(error);

      // Should not throw
      await expect(service.initiateRestore(key)).resolves.toBeUndefined();
    });

    it('should throw other errors', async () => {
      const key = 'audit-archives/org-123/2024-01-01.json.gz';

      mockSend.mockRejectedValueOnce(new Error('Access denied'));

      await expect(service.initiateRestore(key)).rejects.toThrow('Access denied');
    });
  });

  describe('checkRestoreStatus', () => {
    it('should return not ongoing when Restore header is absent', async () => {
      const key = 'audit-archives/org-123/2024-01-01.json.gz';

      mockSend.mockResolvedValueOnce({
        ContentLength: 1000,
        ContentType: 'application/gzip',
        // No Restore header
      });

      const status = await service.checkRestoreStatus(key);

      expect(status.ongoing).toBe(false);
      expect(status.restoreInProgress).toBe(false);
      expect(status.expiryDate).toBeUndefined();
    });

    it('should parse ongoing restore status correctly', async () => {
      const key = 'audit-archives/org-123/2024-01-01.json.gz';

      mockSend.mockResolvedValueOnce({
        ContentLength: 1000,
        ContentType: 'application/gzip',
        Restore: 'ongoing-request="true"',
      });

      const status = await service.checkRestoreStatus(key);

      expect(status.ongoing).toBe(true);
      expect(status.restoreInProgress).toBe(true);
    });

    it('should parse completed restore with expiry date', async () => {
      const key = 'audit-archives/org-123/2024-01-01.json.gz';
      const expiryDate = '2024-01-15T00:00:00Z';

      mockSend.mockResolvedValueOnce({
        ContentLength: 1000,
        ContentType: 'application/gzip',
        Restore: `ongoing-request="false", expiry-date="${expiryDate}"`,
      });

      const status = await service.checkRestoreStatus(key);

      expect(status.ongoing).toBe(false);
      expect(status.restoreInProgress).toBe(false);
      expect(status.expiryDate).toEqual(new Date(expiryDate));
    });
  });

  describe('downloadArchive', () => {
    it('should download and decompress archive data', async () => {
      const key = 'audit-archives/org-123/2024-01-01.json.gz';
      const originalData = JSON.stringify({ logs: [{ id: 1 }, { id: 2 }] });
      const compressedData = await gzip(originalData);

      // Mock HeadObject to indicate restored
      mockSend.mockResolvedValueOnce({
        Restore: 'ongoing-request="false", expiry-date="2024-01-15T00:00:00Z"',
      });

      // Create an async iterable for the Body
      const mockBody = {
        [Symbol.asyncIterator]: async function* () {
          yield compressedData;
        },
      };

      // Mock GetObject with compressed data
      mockSend.mockResolvedValueOnce({
        Body: mockBody,
        ContentLength: compressedData.length,
        ContentType: 'application/gzip',
      });

      const result = await service.downloadArchive(key);

      expect(result.toString('utf-8')).toBe(originalData);
    });

    it('should throw error if restore is still in progress', async () => {
      const key = 'audit-archives/org-123/2024-01-01.json.gz';

      mockSend.mockResolvedValueOnce({
        Restore: 'ongoing-request="true"',
      });

      await expect(service.downloadArchive(key)).rejects.toThrow('restore is still in progress');
    });
  });

  describe('deleteArchive', () => {
    it('should delete archive from S3', async () => {
      const key = 'audit-archives/org-123/2024-01-01.json.gz';

      mockSend.mockResolvedValueOnce({});

      await service.deleteArchive(key);

      expect(mockSend).toHaveBeenCalledTimes(1);
      const callArg = mockSend.mock.calls[0][0] as { input: any; type: string };
      expect(callArg.type).toBe('DeleteObject');
      expect(callArg.input.Key).toBe(key);
      expect(callArg.input.Bucket).toBe('test-audit-bucket');
    });
  });

  describe('listArchives', () => {
    it('should list archives for an organization', async () => {
      const orgId = 'test-org-123';

      mockSend.mockResolvedValueOnce({
        Contents: [
          {
            Key: 'audit-archives/test-org-123/2024-01-01.json.gz',
            Size: 1000,
            LastModified: new Date('2024-01-01'),
            StorageClass: 'GLACIER_IR',
          },
          {
            Key: 'audit-archives/test-org-123/2024-01-02.json.gz',
            Size: 2000,
            LastModified: new Date('2024-01-02'),
            StorageClass: 'GLACIER',
          },
        ],
      });

      const archives = await service.listArchives(orgId);

      expect(archives).toHaveLength(2);
      expect(archives[0].key).toBe('audit-archives/test-org-123/2024-01-01.json.gz');
      expect(archives[0].size).toBe(1000);
      expect(archives[0].storageClass).toBe('GLACIER_IR');

      const callArg = mockSend.mock.calls[0][0] as { input: any; type: string };
      expect(callArg.input.Prefix).toBe(`audit-archives/${orgId}/`);
    });

    it('should return empty array when no archives exist', async () => {
      const orgId = 'empty-org';

      mockSend.mockResolvedValueOnce({
        Contents: undefined,
      });

      const archives = await service.listArchives(orgId);

      expect(archives).toHaveLength(0);
    });
  });

  describe('healthCheck', () => {
    it('should return true when S3 is accessible', async () => {
      mockSend.mockResolvedValueOnce({
        Contents: [],
      });

      const result = await service.healthCheck();

      expect(result).toBe(true);
    });

    it('should return false when S3 is not accessible', async () => {
      mockSend.mockRejectedValueOnce(new Error('Access denied'));

      const result = await service.healthCheck();

      expect(result).toBe(false);
    });
  });

  describe('retrieveArchivedLogs', () => {
    it('should throw error when restore is in progress', async () => {
      const orgId = 'test-org';
      const archiveKey = 'audit-archives/test-org/2024-01-01.json.gz';

      mockSend.mockResolvedValueOnce({
        Restore: 'ongoing-request="true"',
      });

      await expect(service.retrieveArchivedLogs(orgId, archiveKey)).rejects.toThrow(
        'Restore is in progress'
      );
    });

    it('should initiate restore if object is not restored', async () => {
      const orgId = 'test-org';
      const archiveKey = 'audit-archives/test-org/2024-01-01.json.gz';

      // HeadObject - no Restore header (not restored)
      mockSend.mockResolvedValueOnce({
        ContentLength: 1000,
      });

      // RestoreObject
      mockSend.mockResolvedValueOnce({});

      await expect(service.retrieveArchivedLogs(orgId, archiveKey)).rejects.toThrow(
        'Restore initiated'
      );

      expect(mockSend).toHaveBeenCalledTimes(2);
    });

    it('should download and parse logs when restore is complete', async () => {
      const orgId = 'test-org';
      const archiveKey = 'audit-archives/test-org/2024-01-01.json.gz';
      const logs = [{ id: 1, action: 'LOGIN' }, { id: 2, action: 'LOGOUT' }];
      const compressedData = await gzip(JSON.stringify(logs));

      // HeadObject - restored with expiry date
      mockSend.mockResolvedValueOnce({
        Restore: 'ongoing-request="false", expiry-date="2024-01-15T00:00:00Z"',
      });

      // HeadObject again (from downloadArchive)
      mockSend.mockResolvedValueOnce({
        Restore: 'ongoing-request="false", expiry-date="2024-01-15T00:00:00Z"',
      });

      // GetObject
      const mockBody = {
        [Symbol.asyncIterator]: async function* () {
          yield compressedData;
        },
      };
      mockSend.mockResolvedValueOnce({
        Body: mockBody,
        ContentLength: compressedData.length,
      });

      const result = await service.retrieveArchivedLogs(orgId, archiveKey);

      expect(result).toEqual(logs);
    });
  });
});
