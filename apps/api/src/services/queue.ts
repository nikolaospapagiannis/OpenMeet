/**
 * Queue Service
 * Redis-based job queue with Bull for async processing
 */

import Bull, { Job, Queue, JobOptions } from 'bull';
import Redis from 'ioredis';
import winston from 'winston';
import { EventEmitter } from 'events';

const logger = winston.createLogger({
  level: process.env.LOG_LEVEL || 'info',
  defaultMeta: { service: 'queue-service' },
  transports: [new winston.transports.Console()],
});

// Queue job types
export enum JobType {
  TRANSCRIPTION = 'transcription',
  SUMMARY_GENERATION = 'summary_generation',
  ANALYTICS_PROCESSING = 'analytics_processing',
  EMAIL_NOTIFICATION = 'email_notification',
  SMS_NOTIFICATION = 'sms_notification',
  WEBHOOK_DELIVERY = 'webhook_delivery',
  FILE_PROCESSING = 'file_processing',
  MEETING_BOT_JOIN = 'meeting_bot_join',
  MEETING_RECORDING = 'meeting_recording',
  DATA_EXPORT = 'data_export',
  BACKUP = 'backup',
  CLEANUP = 'cleanup',
}

// Job priority levels
export enum JobPriority {
  CRITICAL = 1,
  HIGH = 10,
  NORMAL = 50,
  LOW = 100,
}

export interface QueueJobData {
  type: JobType;
  payload: any;
  userId?: string;
  organizationId?: string;
  meetingId?: string;
  correlationId?: string;
  metadata?: Record<string, any>;
}

export interface QueueJobResult {
  success: boolean;
  data?: any;
  error?: string;
  processingTime?: number;
  retryCount?: number;
}

export class QueueService extends EventEmitter {
  private queues: Map<JobType, Queue>;
  private redis: Redis;
  private isProcessing: boolean = false;

  constructor(redis: Redis) {
    super();
    this.redis = redis;
    this.queues = new Map();
    this.initializeQueues();
  }

  /**
   * Initialize all queues
   */
  private initializeQueues(): void {
    Object.values(JobType).forEach(jobType => {
      const queue = new Bull(jobType, {
        redis: {
          host: process.env.REDIS_HOST || 'localhost',
          port: parseInt(process.env.REDIS_PORT || '6379'),
          password: process.env.REDIS_PASSWORD,
        },
        defaultJobOptions: {
          removeOnComplete: 100,
          removeOnFail: 500,
          attempts: 3,
          backoff: {
            type: 'exponential',
            delay: 2000,
          },
        },
      });

      // Set up event listeners
      this.setupQueueEventListeners(queue, jobType);
      
      this.queues.set(jobType, queue);
    });
  }

  /**
   * Setup event listeners for queue
   */
  private setupQueueEventListeners(queue: Queue, jobType: JobType): void {
    queue.on('completed', (job: Job, result: any) => {
      logger.info(`Job completed: ${jobType}:${job.id}`, { result });
      this.emit('job:completed', { jobType, jobId: job.id, result });
    });

    queue.on('failed', (job: Job, error: Error) => {
      logger.error(`Job failed: ${jobType}:${job.id}`, { error: error.message });
      this.emit('job:failed', { jobType, jobId: job.id, error });
    });

    queue.on('stalled', (job: Job) => {
      logger.warn(`Job stalled: ${jobType}:${job.id}`);
      this.emit('job:stalled', { jobType, jobId: job.id });
    });

    queue.on('progress', (job: Job, progress: number) => {
      logger.debug(`Job progress: ${jobType}:${job.id} - ${progress}%`);
      this.emit('job:progress', { jobType, jobId: job.id, progress });
    });

    queue.on('active', (job: Job) => {
      logger.debug(`Job active: ${jobType}:${job.id}`);
      this.emit('job:active', { jobType, jobId: job.id });
    });

    queue.on('waiting', (jobId: string) => {
      logger.debug(`Job waiting: ${jobType}:${jobId}`);
      this.emit('job:waiting', { jobType, jobId });
    });
  }

  /**
   * Add job to queue
   */
  async addJob(
    jobType: JobType,
    data: QueueJobData,
    options?: JobOptions
  ): Promise<string> {
    try {
      const queue = this.queues.get(jobType);
      if (!queue) {
        throw new Error(`Queue not found for job type: ${jobType}`);
      }

      const jobOptions: JobOptions = {
        priority: JobPriority.NORMAL,
        delay: 0,
        ...options,
      };

      // Add correlation ID if not provided
      if (!data.correlationId) {
        data.correlationId = this.generateCorrelationId();
      }

      const job = await queue.add(data, jobOptions);
      
      logger.info(`Job added to queue: ${jobType}:${job.id}`, {
        correlationId: data.correlationId,
      });

      return job.id.toString();
    } catch (error) {
      logger.error('Failed to add job to queue:', error);
      throw error;
    }
  }

  /**
   * Add bulk jobs to queue
   */
  async addBulkJobs(
    jobType: JobType,
    jobs: Array<{ data: QueueJobData; options?: JobOptions }>
  ): Promise<string[]> {
    try {
      const queue = this.queues.get(jobType);
      if (!queue) {
        throw new Error(`Queue not found for job type: ${jobType}`);
      }

      const bulkJobs = jobs.map(job => ({
        data: {
          ...job.data,
          correlationId: job.data.correlationId || this.generateCorrelationId(),
        },
        opts: {
          priority: JobPriority.NORMAL,
          delay: 0,
          ...job.options,
        },
      }));

      const addedJobs = await queue.addBulk(bulkJobs);
      const jobIds = addedJobs.map(job => job.id.toString());

      logger.info(`Bulk jobs added to queue: ${jobType}`, {
        count: jobIds.length,
      });

      return jobIds;
    } catch (error) {
      logger.error('Failed to add bulk jobs to queue:', error);
      throw error;
    }
  }

  /**
   * Get job by ID
   */
  async getJob(jobType: JobType, jobId: string): Promise<Job | null> {
    try {
      const queue = this.queues.get(jobType);
      if (!queue) {
        throw new Error(`Queue not found for job type: ${jobType}`);
      }

      const job = await queue.getJob(jobId);
      return job;
    } catch (error) {
      logger.error('Failed to get job:', error);
      return null;
    }
  }

  /**
   * Get job status
   */
  async getJobStatus(
    jobType: JobType,
    jobId: string
  ): Promise<{
    status: string;
    progress?: number;
    result?: any;
    error?: string;
  } | null> {
    try {
      const job = await this.getJob(jobType, jobId);
      if (!job) {
        return null;
      }

      const state = await job.getState();
      const progress = job.progress();
      
      return {
        status: state,
        progress: typeof progress === 'number' ? progress : undefined,
        result: job.returnvalue,
        error: job.failedReason,
      };
    } catch (error) {
      logger.error('Failed to get job status:', error);
      return null;
    }
  }

  /**
   * Cancel job
   */
  async cancelJob(jobType: JobType, jobId: string): Promise<boolean> {
    try {
      const job = await this.getJob(jobType, jobId);
      if (!job) {
        return false;
      }

      await job.remove();
      logger.info(`Job cancelled: ${jobType}:${jobId}`);
      return true;
    } catch (error) {
      logger.error('Failed to cancel job:', error);
      return false;
    }
  }

  /**
   * Retry failed job
   */
  async retryJob(jobType: JobType, jobId: string): Promise<boolean> {
    try {
      const job = await this.getJob(jobType, jobId);
      if (!job) {
        return false;
      }

      await job.retry();
      logger.info(`Job retried: ${jobType}:${jobId}`);
      return true;
    } catch (error) {
      logger.error('Failed to retry job:', error);
      return false;
    }
  }

  /**
   * Get queue statistics
   */
  async getQueueStats(jobType: JobType): Promise<{
    waiting: number;
    active: number;
    completed: number;
    failed: number;
    delayed: number;
    paused: boolean;
  } | null> {
    try {
      const queue = this.queues.get(jobType);
      if (!queue) {
        return null;
      }

      const [
        waiting,
        active,
        completed,
        failed,
        delayed,
        paused,
      ] = await Promise.all([
        queue.getWaitingCount(),
        queue.getActiveCount(),
        queue.getCompletedCount(),
        queue.getFailedCount(),
        queue.getDelayedCount(),
        queue.isPaused(),
      ]);

      return {
        waiting,
        active,
        completed,
        failed,
        delayed,
        paused,
      };
    } catch (error) {
      logger.error('Failed to get queue stats:', error);
      return null;
    }
  }

  /**
   * Pause queue
   */
  async pauseQueue(jobType: JobType): Promise<boolean> {
    try {
      const queue = this.queues.get(jobType);
      if (!queue) {
        return false;
      }

      await queue.pause();
      logger.info(`Queue paused: ${jobType}`);
      return true;
    } catch (error) {
      logger.error('Failed to pause queue:', error);
      return false;
    }
  }

  /**
   * Resume queue
   */
  async resumeQueue(jobType: JobType): Promise<boolean> {
    try {
      const queue = this.queues.get(jobType);
      if (!queue) {
        return false;
      }

      await queue.resume();
      logger.info(`Queue resumed: ${jobType}`);
      return true;
    } catch (error) {
      logger.error('Failed to resume queue:', error);
      return false;
    }
  }

  /**
   * Clean completed jobs
   */
  async cleanQueue(
    jobType: JobType,
    grace: number = 3600000 // 1 hour
  ): Promise<number> {
    try {
      const queue = this.queues.get(jobType);
      if (!queue) {
        return 0;
      }

      const jobs = await queue.clean(grace, 'completed');
      logger.info(`Queue cleaned: ${jobType}`, { removed: jobs.length });
      return jobs.length;
    } catch (error) {
      logger.error('Failed to clean queue:', error);
      return 0;
    }
  }

  /**
   * Empty queue
   */
  async emptyQueue(jobType: JobType): Promise<boolean> {
    try {
      const queue = this.queues.get(jobType);
      if (!queue) {
        return false;
      }

      await queue.empty();
      logger.info(`Queue emptied: ${jobType}`);
      return true;
    } catch (error) {
      logger.error('Failed to empty queue:', error);
      return false;
    }
  }

  /**
   * Get all queue statistics
   */
  async getAllQueueStats(): Promise<
    Map<JobType, Awaited<ReturnType<typeof this.getQueueStats>>>
  > {
    const stats = new Map();
    
    for (const jobType of Object.values(JobType)) {
      const queueStats = await this.getQueueStats(jobType);
      stats.set(jobType, queueStats);
    }
    
    return stats;
  }

  /**
   * Process dead letter queue
   */
  async processDeadLetterQueue(jobType: JobType): Promise<number> {
    try {
      const queue = this.queues.get(jobType);
      if (!queue) {
        return 0;
      }

      const failedJobs = await queue.getFailed();
      let processedCount = 0;

      for (const job of failedJobs) {
        if (job.attemptsMade >= (job.opts.attempts || 3)) {
          // Move to dead letter queue
          await this.addJob(JobType.CLEANUP, {
            type: JobType.CLEANUP,
            payload: {
              originalJobType: jobType,
              originalJobId: job.id,
              failedData: job.data,
              failedReason: job.failedReason,
            },
            metadata: {
              deadLetter: true,
              originalTimestamp: job.timestamp,
            },
          });
          
          await job.remove();
          processedCount++;
        }
      }

      logger.info(`Dead letter queue processed: ${jobType}`, {
        processed: processedCount,
      });

      return processedCount;
    } catch (error) {
      logger.error('Failed to process dead letter queue:', error);
      return 0;
    }
  }

  /**
   * Generate correlation ID
   */
  private generateCorrelationId(): string {
    return `${Date.now()}-${Math.random().toString(36).substring(2, 15)}`;
  }

  /**
   * Shutdown all queues
   */
  async shutdown(): Promise<void> {
    try {
      const closePromises: Promise<void>[] = [];
      
      for (const queue of this.queues.values()) {
        closePromises.push(queue.close());
      }
      
      await Promise.all(closePromises);
      logger.info('All queues shut down successfully');
    } catch (error) {
      logger.error('Failed to shutdown queues:', error);
      throw error;
    }
  }

  /**
   * Health check for all queues
   */
  async healthCheck(): Promise<{
    healthy: boolean;
    queues: Map<JobType, boolean>;
  }> {
    const queueHealth = new Map<JobType, boolean>();
    let allHealthy = true;

    for (const [jobType, queue] of this.queues.entries()) {
      try {
        await queue.isReady();
        queueHealth.set(jobType, true);
      } catch (error) {
        queueHealth.set(jobType, false);
        allHealthy = false;
        logger.error(`Queue health check failed: ${jobType}`, error);
      }
    }

    return {
      healthy: allHealthy,
      queues: queueHealth,
    };
  }
}
