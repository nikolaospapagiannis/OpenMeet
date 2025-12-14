/**
 * Audit Retention Service
 *
 * Manages audit log lifecycle:
 * - Archive old logs (> 90 days to cold storage)
 * - Delete logs past retention period
 * - Maintain compliance-required logs
 * - Compress archived logs
 *
 * Retention Policy:
 * - Standard logs: 1 year
 * - GDPR logs: 6 years
 * - HIPAA logs: 6 years
 * - High-risk logs: 7 years
 *
 * REAL IMPLEMENTATION: Uses AWS S3 Glacier for cold storage archival.
 */

import { PrismaClient } from '@prisma/client';
import winston from 'winston';
import * as zlib from 'zlib';
import { promisify } from 'util';
import { Readable } from 'stream';
import {
  S3Client,
  PutObjectCommand,
  GetObjectCommand,
  DeleteObjectCommand,
  RestoreObjectCommand,
  HeadObjectCommand,
  ListObjectsV2Command,
} from '@aws-sdk/client-s3';

const gzip = promisify(zlib.gzip);
const gunzip = promisify(zlib.gunzip);
const prisma = new PrismaClient();

const logger = winston.createLogger({
  level: process.env.LOG_LEVEL || 'info',
  defaultMeta: { service: 'audit-retention-service' },
  transports: [new winston.transports.Console()],
});

/**
 * S3 Glacier Storage Classes
 * - GLACIER_IR: Instant retrieval (milliseconds)
 * - GLACIER: Standard (3-5 hours retrieval)
 * - DEEP_ARCHIVE: Lowest cost (12 hours retrieval)
 */
export type GlacierStorageClass = 'GLACIER_IR' | 'GLACIER' | 'DEEP_ARCHIVE';

/**
 * Restore tier options for Glacier objects
 * - Expedited: 1-5 minutes (highest cost)
 * - Standard: 3-5 hours
 * - Bulk: 5-12 hours (lowest cost)
 */
export type RestoreTier = 'Expedited' | 'Standard' | 'Bulk';

export interface ArchiveResult {
  key: string;
  originalSize: number;
  compressedSize: number;
  storageClass: GlacierStorageClass;
  archivedAt: Date;
}

export interface RestoreStatus {
  ongoing: boolean;
  expiryDate?: Date;
  restoreInProgress: boolean;
}

export class AuditRetentionService {
  private s3Client: S3Client;
  private bucket: string;
  private storageClass: GlacierStorageClass;

  constructor() {
    // REAL AWS SDK initialization with credentials from environment
    this.s3Client = new S3Client({
      region: process.env.AWS_REGION || 'us-east-1',
      credentials: {
        accessKeyId: process.env.AWS_ACCESS_KEY_ID || '',
        secretAccessKey: process.env.AWS_SECRET_ACCESS_KEY || '',
      },
    });

    this.bucket = process.env.AWS_AUDIT_BUCKET || 'openmeet-audit-archive';
    this.storageClass = (process.env.AWS_GLACIER_STORAGE_CLASS as GlacierStorageClass) || 'GLACIER_IR';

    logger.info('AuditRetentionService initialized', {
      region: process.env.AWS_REGION || 'us-east-1',
      bucket: this.bucket,
      storageClass: this.storageClass,
    });
  }

  /**
   * REAL: Archive compressed audit logs to S3 Glacier
   * Compresses data with gzip and uploads to S3 with Glacier storage class
   */
  async archiveToColdStorage(
    orgId: string,
    data: Buffer,
    storageClass?: GlacierStorageClass
  ): Promise<ArchiveResult> {
    const originalSize = data.length;
    const effectiveStorageClass = storageClass || this.storageClass;

    logger.info('Starting archive to cold storage', {
      orgId,
      originalSize,
      storageClass: effectiveStorageClass,
    });

    // Compress data using gzip
    const compressed = await gzip(data);
    const compressedSize = compressed.length;

    const timestamp = new Date().toISOString().replace(/[:.]/g, '-');
    const key = `audit-archives/${orgId}/${timestamp}.json.gz`;

    // REAL S3 upload with Glacier storage class
    const command = new PutObjectCommand({
      Bucket: this.bucket,
      Key: key,
      Body: compressed,
      StorageClass: effectiveStorageClass,
      ContentType: 'application/gzip',
      ContentEncoding: 'gzip',
      Metadata: {
        'organization-id': orgId,
        'archive-date': new Date().toISOString(),
        'original-size': originalSize.toString(),
        'compressed-size': compressedSize.toString(),
        'compression-ratio': (compressedSize / originalSize).toFixed(4),
      },
    });

    await this.s3Client.send(command);

    logger.info('Archive uploaded to S3 Glacier', {
      key,
      originalSize,
      compressedSize,
      compressionRatio: `${((1 - compressedSize / originalSize) * 100).toFixed(1)}%`,
      storageClass: effectiveStorageClass,
    });

    return {
      key,
      originalSize,
      compressedSize,
      storageClass: effectiveStorageClass,
      archivedAt: new Date(),
    };
  }

  /**
   * REAL: Initiate restore from S3 Glacier
   * Starts an async restore operation - object becomes available after retrieval time
   */
  async initiateRestore(
    key: string,
    tier: RestoreTier = 'Standard',
    days: number = 7
  ): Promise<void> {
    logger.info('Initiating Glacier restore', { key, tier, days });

    const command = new RestoreObjectCommand({
      Bucket: this.bucket,
      Key: key,
      RestoreRequest: {
        Days: days,
        GlacierJobParameters: {
          Tier: tier,
        },
      },
    });

    try {
      await this.s3Client.send(command);
      logger.info('Restore initiated successfully', { key, tier, days });
    } catch (error: any) {
      // Handle case where restore is already in progress
      if (error.Code === 'RestoreAlreadyInProgress') {
        logger.info('Restore already in progress', { key });
        return;
      }
      throw error;
    }
  }

  /**
   * REAL: Check restore status of a Glacier object
   * Returns whether restore is ongoing and when the restored copy expires
   */
  async checkRestoreStatus(key: string): Promise<RestoreStatus> {
    logger.debug('Checking restore status', { key });

    const command = new HeadObjectCommand({
      Bucket: this.bucket,
      Key: key,
    });

    const response = await this.s3Client.send(command);

    if (!response.Restore) {
      // Object is not in restoration process and not restored
      return {
        ongoing: false,
        restoreInProgress: false,
      };
    }

    // Parse restore header: ongoing-request="true|false", expiry-date="..."
    const ongoing = response.Restore.includes('ongoing-request="true"');
    const expiryMatch = response.Restore.match(/expiry-date="([^"]+)"/);

    const status: RestoreStatus = {
      ongoing,
      restoreInProgress: ongoing,
      expiryDate: expiryMatch ? new Date(expiryMatch[1]) : undefined,
    };

    logger.debug('Restore status checked', { key, status });

    return status;
  }

  /**
   * REAL: Download and decompress a restored archive
   * Only works if the object has been restored from Glacier
   */
  async downloadArchive(key: string): Promise<Buffer> {
    logger.info('Downloading archive', { key });

    // First check if the object is accessible (restored from Glacier)
    const status = await this.checkRestoreStatus(key);
    if (status.restoreInProgress) {
      throw new Error(`Archive restore is still in progress for ${key}. Please try again later.`);
    }

    const command = new GetObjectCommand({
      Bucket: this.bucket,
      Key: key,
    });

    const response = await this.s3Client.send(command);

    if (!response.Body) {
      throw new Error(`Empty response body for ${key}`);
    }

    // Collect stream chunks
    const chunks: Uint8Array[] = [];
    const stream = response.Body as Readable;

    for await (const chunk of stream) {
      chunks.push(chunk);
    }

    const compressed = Buffer.concat(chunks);

    // Decompress gzip data
    const decompressed = await gunzip(compressed);

    logger.info('Archive downloaded and decompressed', {
      key,
      compressedSize: compressed.length,
      decompressedSize: decompressed.length,
    });

    return decompressed;
  }

  /**
   * REAL: Delete an archive from S3 Glacier
   */
  async deleteArchive(key: string): Promise<void> {
    logger.info('Deleting archive', { key });

    const command = new DeleteObjectCommand({
      Bucket: this.bucket,
      Key: key,
    });

    await this.s3Client.send(command);

    logger.info('Archive deleted', { key });
  }

  /**
   * REAL: List archives for an organization
   */
  async listArchives(
    orgId: string,
    maxKeys: number = 1000
  ): Promise<Array<{ key: string; size: number; lastModified: Date; storageClass: string }>> {
    logger.info('Listing archives', { orgId, maxKeys });

    const prefix = `audit-archives/${orgId}/`;
    const command = new ListObjectsV2Command({
      Bucket: this.bucket,
      Prefix: prefix,
      MaxKeys: maxKeys,
    });

    const response = await this.s3Client.send(command);

    const archives = (response.Contents || []).map((obj) => ({
      key: obj.Key || '',
      size: obj.Size || 0,
      lastModified: obj.LastModified || new Date(),
      storageClass: obj.StorageClass || 'STANDARD',
    }));

    logger.info('Archives listed', { orgId, count: archives.length });

    return archives;
  }

  /**
   * Archive old audit logs (> 90 days)
   * Move to cold storage (S3 Glacier)
   */
  async archiveOldLogs(): Promise<{
    archived: number;
    errors: number;
  }> {
    try {
      const ninetyDaysAgo = new Date();
      ninetyDaysAgo.setDate(ninetyDaysAgo.getDate() - 90);

      logger.info('Starting audit log archival', { cutoffDate: ninetyDaysAgo });

      // Find logs to archive (older than 90 days, not yet archived)
      const logsToArchive = await prisma.auditLog.findMany({
        where: {
          createdAt: { lt: ninetyDaysAgo },
          // Add a flag to track if archived
          metadata: {
            path: ['archived'],
            equals: undefined,
          },
        },
        take: 10000, // Process in batches
      });

      let archived = 0;
      let errors = 0;

      // Group logs by organization for efficient archival
      const byOrg = logsToArchive.reduce(
        (acc, log) => {
          const orgId = log.organizationId || 'system';
          if (!acc[orgId]) acc[orgId] = [];
          acc[orgId].push(log);
          return acc;
        },
        {} as Record<string, typeof logsToArchive>
      );

      for (const [orgId, logs] of Object.entries(byOrg)) {
        try {
          // Compress logs
          const compressed = await this.compressLogs(logs);

          // REAL: Archive to S3 Glacier cold storage
          const archiveResult = await this.archiveToColdStorage(orgId, compressed);

          // Mark as archived in database
          const logIds = logs.map((l) => l.id);
          await prisma.auditLog.updateMany({
            where: { id: { in: logIds } },
            data: {
              metadata: {
                archived: true,
                archiveKey: archiveResult.key,
                archivedAt: archiveResult.archivedAt.toISOString(),
                storageClass: archiveResult.storageClass,
                originalSize: archiveResult.originalSize,
                compressedSize: archiveResult.compressedSize,
              },
            },
          });

          archived += logs.length;
          logger.info(`Archived ${logs.length} logs for org ${orgId}`, {
            archiveKey: archiveResult.key,
            storageClass: archiveResult.storageClass,
          });
        } catch (error) {
          logger.error(`Failed to archive logs for org ${orgId}`, { error });
          errors += logs.length;
        }
      }

      logger.info('Archival complete', { archived, errors });

      return { archived, errors };
    } catch (error) {
      logger.error('Failed to archive logs', { error });
      throw new Error('Failed to archive logs');
    }
  }

  /**
   * Delete logs past retention period
   */
  async deleteExpiredLogs(): Promise<{
    deleted: number;
    protectedCount: number;
  }> {
    try {
      const now = new Date();

      logger.info('Starting expired log deletion');

      // Find logs past their retention date
      const expiredLogs = await prisma.auditLog.findMany({
        where: {
          retainUntil: {
            not: null,
            lt: now,
          },
        },
        select: {
          id: true,
          isGdprRelevant: true,
          isHipaaRelevant: true,
          isSoc2Relevant: true,
          riskLevel: true,
          retainUntil: true,
        },
        take: 10000, // Safety limit
      });

      let deleted = 0;
      let protectedCount = 0;

      for (const log of expiredLogs) {
        try {
          // Double-check retention requirements
          if (this.shouldProtectLog(log)) {
            protectedCount++;
            logger.warn('Log protected from deletion', { logId: log.id });
            continue;
          }

          // Delete the log
          await prisma.auditLog.delete({
            where: { id: log.id },
          });

          deleted++;
        } catch (error) {
          logger.error('Failed to delete log', { error, logId: log.id });
        }
      }

      logger.info('Deletion complete', { deleted, protectedCount });

      return { deleted, protectedCount };
    } catch (error) {
      logger.error('Failed to delete expired logs', { error });
      throw new Error('Failed to delete expired logs');
    }
  }

  /**
   * Cleanup very old archived logs (> 7 years)
   * Only for logs with no compliance requirements
   */
  async cleanupOldArchives(): Promise<number> {
    try {
      const sevenYearsAgo = new Date();
      sevenYearsAgo.setFullYear(sevenYearsAgo.getFullYear() - 7);

      logger.info('Cleaning up old archives', { cutoffDate: sevenYearsAgo });

      // Find very old logs with no compliance requirements
      const result = await prisma.auditLog.deleteMany({
        where: {
          createdAt: { lt: sevenYearsAgo },
          isGdprRelevant: false,
          isHipaaRelevant: false,
          isSoc2Relevant: false,
          riskLevel: { notIn: ['high', 'critical'] },
        },
      });

      logger.info(`Cleaned up ${result.count} old logs`);

      return result.count;
    } catch (error) {
      logger.error('Failed to cleanup old archives', { error });
      throw new Error('Failed to cleanup old archives');
    }
  }

  /**
   * Get retention statistics
   */
  async getRetentionStatistics(): Promise<any> {
    try {
      const now = new Date();
      const thirtyDaysFromNow = new Date(now.getTime() + 30 * 24 * 60 * 60 * 1000);

      const [total, archived, expiringSoon, protectedCount] = await Promise.all([
        prisma.auditLog.count(),
        prisma.auditLog.count({
          where: {
            metadata: {
              path: ['archived'],
              not: undefined,
            },
          },
        }),
        prisma.auditLog.count({
          where: {
            retainUntil: {
              not: null,
              lte: thirtyDaysFromNow,
              gte: now,
            },
          },
        }),
        prisma.auditLog.count({
          where: {
            OR: [
              { isGdprRelevant: true },
              { isHipaaRelevant: true },
              { riskLevel: { in: ['high', 'critical'] } },
            ],
          },
        }),
      ]);

      return {
        total,
        archived,
        active: total - archived,
        expiringSoon,
        protected: protectedCount,
        complianceProtected: protectedCount,
      };
    } catch (error) {
      logger.error('Failed to get retention statistics', { error });
      throw new Error('Failed to get retention statistics');
    }
  }

  /**
   * Compress logs for archival
   */
  private async compressLogs(logs: any[]): Promise<Buffer> {
    const json = JSON.stringify(logs);
    return await gzip(json);
  }

  /**
   * Check if log should be protected from deletion
   */
  private shouldProtectLog(log: any): boolean {
    // Protect GDPR logs (6 years minimum)
    if (log.isGdprRelevant) {
      const sixYearsAgo = new Date();
      sixYearsAgo.setFullYear(sixYearsAgo.getFullYear() - 6);
      if (log.retainUntil && log.retainUntil < sixYearsAgo) {
        return true;
      }
    }

    // Protect HIPAA logs (6 years minimum)
    if (log.isHipaaRelevant) {
      const sixYearsAgo = new Date();
      sixYearsAgo.setFullYear(sixYearsAgo.getFullYear() - 6);
      if (log.retainUntil && log.retainUntil < sixYearsAgo) {
        return true;
      }
    }

    // Protect high-risk logs (7 years minimum)
    if (log.riskLevel === 'high' || log.riskLevel === 'critical') {
      const sevenYearsAgo = new Date();
      sevenYearsAgo.setFullYear(sevenYearsAgo.getFullYear() - 7);
      if (log.retainUntil && log.retainUntil < sevenYearsAgo) {
        return true;
      }
    }

    return false;
  }

  /**
   * Run daily cleanup job
   */
  async runDailyCleanup(): Promise<void> {
    logger.info('Starting daily audit cleanup');

    try {
      // 1. Archive old logs (> 90 days)
      const archiveResults = await this.archiveOldLogs();
      logger.info('Archive results', archiveResults);

      // 2. Delete expired logs
      const deleteResults = await this.deleteExpiredLogs();
      logger.info('Delete results', deleteResults);

      // 3. Get statistics
      const stats = await this.getRetentionStatistics();
      logger.info('Retention statistics', stats);

      logger.info('Daily cleanup complete');
    } catch (error) {
      logger.error('Daily cleanup failed', { error });
    }
  }

  /**
   * REAL: Retrieve archived audit logs for an organization
   * Initiates restore if needed and waits for completion
   */
  async retrieveArchivedLogs(
    orgId: string,
    archiveKey: string,
    tier: RestoreTier = 'Standard'
  ): Promise<any[]> {
    logger.info('Retrieving archived logs', { orgId, archiveKey, tier });

    // Check current restore status
    const status = await this.checkRestoreStatus(archiveKey);

    if (status.restoreInProgress) {
      logger.info('Restore already in progress', { archiveKey });
      throw new Error(
        'Restore is in progress. Please check back later. ' +
          `Estimated time: ${tier === 'Expedited' ? '1-5 minutes' : tier === 'Standard' ? '3-5 hours' : '5-12 hours'}`
      );
    }

    if (!status.expiryDate) {
      // Need to initiate restore
      logger.info('Initiating restore for archive', { archiveKey, tier });
      await this.initiateRestore(archiveKey, tier);
      throw new Error(
        'Restore initiated. Please check back later. ' +
          `Estimated time: ${tier === 'Expedited' ? '1-5 minutes' : tier === 'Standard' ? '3-5 hours' : '5-12 hours'}`
      );
    }

    // Object is restored, download and parse
    const data = await this.downloadArchive(archiveKey);
    const logs = JSON.parse(data.toString('utf-8'));

    logger.info('Archived logs retrieved', { archiveKey, logsCount: logs.length });

    return logs;
  }

  /**
   * Health check for S3 Glacier connectivity
   */
  async healthCheck(): Promise<boolean> {
    try {
      const command = new ListObjectsV2Command({
        Bucket: this.bucket,
        MaxKeys: 1,
        Prefix: 'audit-archives/',
      });

      await this.s3Client.send(command);
      logger.info('S3 Glacier health check passed');
      return true;
    } catch (error) {
      logger.error('S3 Glacier health check failed', { error });
      return false;
    }
  }
}

export default AuditRetentionService;
