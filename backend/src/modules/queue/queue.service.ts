import { Injectable, Logger, OnModuleInit } from '@nestjs/common';
import { EventEmitter2, OnEvent } from '@nestjs/event-emitter';

export type QueueName = 'email' | 'sms' | 'fraud-analysis' | 'reconciliation' | 'kyc-processing' | 'analytics';

export interface QueueJob<T = any> {
  id: string;
  queue: QueueName;
  data: T;
  attempts: number;
  maxAttempts: number;
  createdAt: Date;
  nextRetryAt?: Date;
  status: 'pending' | 'processing' | 'completed' | 'failed' | 'dead';
  error?: string;
}

@Injectable()
export class QueueService implements OnModuleInit {
  private readonly logger = new Logger(QueueService.name);
  private readonly queues = new Map<QueueName, QueueJob[]>();
  private readonly handlers = new Map<QueueName, (job: QueueJob) => Promise<void>>();
  private jobCounter = 0;

  constructor(private readonly events: EventEmitter2) {}

  onModuleInit() {
    const names: QueueName[] = ['email', 'sms', 'fraud-analysis', 'reconciliation', 'kyc-processing', 'analytics'];
    names.forEach((n) => this.queues.set(n, []));
    this.logger.log('Queue service initialized with queues: ' + names.join(', '));
  }

  enqueue<T>(queue: QueueName, data: T, maxAttempts = 3): string {
    const id = `job_${++this.jobCounter}_${Date.now()}`;
    const job: QueueJob<T> = { id, queue, data, attempts: 0, maxAttempts, createdAt: new Date(), status: 'pending' };
    this.queues.get(queue)!.push(job);
    this.logger.debug(`Enqueued job ${id} to ${queue}`);
    this.events.emit(`queue.${queue}.enqueued`, { jobId: id, queue });
    // Process asynchronously
    setImmediate(() => this.processNext(queue));
    return id;
  }

  registerHandler(queue: QueueName, handler: (job: QueueJob) => Promise<void>) {
    this.handlers.set(queue, handler);
  }

  private async processNext(queue: QueueName) {
    const jobs = this.queues.get(queue)!;
    const job = jobs.find((j) => j.status === 'pending' && (!j.nextRetryAt || j.nextRetryAt <= new Date()));
    if (!job) return;

    const handler = this.handlers.get(queue);
    if (!handler) return;

    job.status = 'processing';
    job.attempts++;

    try {
      await handler(job);
      job.status = 'completed';
      this.events.emit(`queue.${queue}.completed`, { jobId: job.id });
    } catch (err: any) {
      job.error = err.message;
      if (job.attempts >= job.maxAttempts) {
        job.status = 'dead';
        this.logger.error(`Job ${job.id} moved to dead-letter queue after ${job.attempts} attempts`);
        this.events.emit(`queue.${queue}.dead`, { jobId: job.id, error: err.message });
      } else {
        job.status = 'pending';
        job.nextRetryAt = new Date(Date.now() + Math.pow(2, job.attempts) * 1000); // exponential backoff
        this.logger.warn(`Job ${job.id} failed (attempt ${job.attempts}/${job.maxAttempts}), retrying at ${job.nextRetryAt}`);
      }
    }
  }

  getStats(queue: QueueName) {
    const jobs = this.queues.get(queue) ?? [];
    return {
      queue,
      pending: jobs.filter((j) => j.status === 'pending').length,
      processing: jobs.filter((j) => j.status === 'processing').length,
      completed: jobs.filter((j) => j.status === 'completed').length,
      failed: jobs.filter((j) => j.status === 'failed').length,
      dead: jobs.filter((j) => j.status === 'dead').length,
    };
  }

  getAllStats() {
    return Array.from(this.queues.keys()).map((q) => this.getStats(q));
  }
}
