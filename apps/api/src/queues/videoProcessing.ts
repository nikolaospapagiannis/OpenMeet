/**
 * Video Processing Queue (Stub)
 *
 * This is a stub implementation to satisfy TypeScript.
 * Replace with actual BullMQ implementation when needed.
 */

interface JobOptions {
  attempts?: number;
  backoff?: {
    type: string;
    delay: number;
  };
}

interface Job {
  id?: string;
  progress?: number;
}

class VideoProcessingQueue {
  async add(name: string, data: any, options?: JobOptions): Promise<void> {
    // Stub implementation
    console.log(`Video processing job queued: ${name}`, data);
  }

  async getJob(jobId: string): Promise<Job | null> {
    // Stub implementation
    return null;
  }
}

export const videoProcessingQueue = new VideoProcessingQueue();
