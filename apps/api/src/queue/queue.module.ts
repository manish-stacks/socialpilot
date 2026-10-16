import { Global, Injectable, Logger, Module, OnModuleDestroy, ServiceUnavailableException } from '@nestjs/common';
import { Queue } from 'bullmq';
import IORedis from 'ioredis';

export const QUEUE_NAME = 'publishing';
export interface TargetRef { id: string; generation?: number; attempts: number; polls: number; post: { scheduledAt: Date | null }; nextAttemptAt?: Date | null }
/** Deterministic: the same target state always maps to the same job id, so enqueueing is idempotent. */
export const jobKey = (t: TargetRef) => `publish_${t.id}_g${t.generation ?? 0}_${t.attempts}_${t.polls}_${t.post.scheduledAt?.getTime() ?? 0}`;
export const dueAt = (t: TargetRef) => (t.nextAttemptAt ?? t.post.scheduledAt ?? new Date()).getTime();
/** Only jobs due within this window live in Redis; the reconciler enqueues farther-out ones as they approach. */
export const ENQUEUE_WINDOW_MS = 24 * 3_600_000;

@Injectable()
export class QueueService implements OnModuleDestroy {
  private log = new Logger('Queue');
  private conn?: IORedis; private q?: Queue;
  connection() {
    const url = process.env.REDIS_URL;
    if (!url) throw new ServiceUnavailableException('REDIS_URL is not configured');
    return (this.conn ??= new IORedis(url, { maxRetriesPerRequest: null }));
  }
  get queue() { return (this.q ??= new Queue(QUEUE_NAME, { connection: this.connection() })); }

  /** Returns false (never throws) if Redis is unavailable: the database stays authoritative and the reconciler retries. */
  async enqueueTarget(t: TargetRef, force = false): Promise<boolean> {
    try {
      const delay = Math.max(0, dueAt(t) - Date.now());
      if (!force && delay > ENQUEUE_WINDOW_MS) return false;
      await this.queue.add('publish', { targetId: t.id }, { jobId: jobKey(t), delay, removeOnComplete: { age: 3600 }, removeOnFail: { age: 86_400 } });
      return true;
    } catch (e: any) { this.log.warn(`enqueue failed for ${t.id}: ${e?.message}`); return false; }
  }
  async hasJob(t: TargetRef) { try { return !!(await this.queue.getJob(jobKey(t))); } catch { return false; } }
  /** Best-effort; correctness never depends on removal because the worker re-validates against the database. */
  async removeTarget(t: TargetRef) { try { await (await this.queue.getJob(jobKey(t)))?.remove(); } catch { /* ignore */ } }
  async stats() { return this.queue.getJobCounts('waiting', 'delayed', 'active', 'failed', 'completed'); }
  async onModuleDestroy() { await this.q?.close(); this.conn?.disconnect(); }
}
@Global() @Module({ providers: [QueueService], exports: [QueueService] })
export class QueueModule {}
