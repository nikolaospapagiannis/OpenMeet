/**
 * Storage Service Unit Tests
 */

import { StorageService } from '../../../src/services/storage';
import { S3Client } from '@aws-sdk/client-s3';

jest.mock('@aws-sdk/client-s3');

describe('StorageService', () => {
  let storageService: StorageService;
  let mockS3Client: jest.Mocked<S3Client>;

  beforeEach(() => {
    mockS3Client = new S3Client({}) as jest.Mocked<S3Client>;
    storageService = new StorageService(mockS3Client);
  });

  afterEach(() => {
    jest.clearAllMocks();
  });

  describe('upload', () => {
    it('should upload file successfully', async () => {
      const mockFile = {
        buffer: Buffer.from('test content'),
        originalname: 'test.txt',
        mimetype: 'text/plain',
      };

      mockS3Client.send.mockResolvedValue({
        $metadata: { httpStatusCode: 200 },
      });

      const result = await storageService.upload(
        'test-bucket',
        'test/path/test.txt',
        mockFile.buffer,
        mockFile.mimetype
      );

      expect(mockS3Client.send).toHaveBeenCalled();
      expect(result).toHaveProperty('url');
      expect(result).toHaveProperty('key');
    });

    it('should handle upload errors', async () => {
      const mockFile = {
        buffer: Buffer.from('test content'),
        mimetype: 'text/plain',
      };

      mockS3Client.send.mockRejectedValue(new Error('Upload failed'));

      await expect(
        storageService.upload(
          'test-bucket',
          'test/path/test.txt',
          mockFile.buffer,
          mockFile.mimetype
        )
      ).rejects.toThrow('Upload failed');
    });
  });

  describe('download', () => {
    it('should download file successfully', async () => {
      const mockStream = Buffer.from('test content');
      mockS3Client.send.mockResolvedValue({
        Body: mockStream,
        $metadata: { httpStatusCode: 200 },
      });

      const result = await storageService.download(
        'test-bucket',
        'test/path/test.txt'
      );

      expect(mockS3Client.send).toHaveBeenCalled();
      expect(result).toBeDefined();
    });
  });

  describe('delete', () => {
    it('should delete file successfully', async () => {
      mockS3Client.send.mockResolvedValue({
        $metadata: { httpStatusCode: 204 },
      });

      await storageService.delete('test-bucket', 'test/path/test.txt');

      expect(mockS3Client.send).toHaveBeenCalled();
    });
  });

  describe('getSignedUrl', () => {
    it('should generate signed URL', async () => {
      const url = await storageService.getSignedUrl(
        'test-bucket',
        'test/path/test.txt',
        3600
      );

      expect(url).toContain('test/path/test.txt');
    });
  });
});
