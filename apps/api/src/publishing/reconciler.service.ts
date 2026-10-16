import { Injectable, Logger, OnApplicationBootstrap, OnModuleDestroy } from '@nestjs/common';
import { Worker } from 'bullmq';
import { PrismaService } from '../prisma/prisma.service';
import { ENQUEUE_WINDOW_MS, QUEUE_NAME, QueueService } from '../queue/queue.module';
import { PublishingService } from './publishing.service';
import { STALE_CLAIM_MS } from './policy';

/** Runs only inside the worker process. Redis is a cache of intent; MySQL is the source of truth. */
@Injectable()
export class WorkerRunner implements OnApplicationBootstrap, OnModuleDestroy {
  private log = new Logger('Worker');
  private worker?: Worker; private timer?: NodeJS.Timeout;
  constructor(private prisma: PrismaService, private queue: QueueService, private svc: PublishingService) {}

  async onApplicationBootstrap() {
    this.worker = new Worker(QUEUE_NAME, async (job) => { const r = await this.svc.process(job.data.targetId); this.log.log(`target ${job.data.targetId}: ${r}`); },
      { connection: this.queue.connection(), concurrency: Number(process.env.PUBLISH_CONCURRENCY ?? 5) });
    this.worker.on('failed', (j, e) => this.log.error(`job ${j?.id} crashed: ${e.message}`));
    await this.reconcile();
    this.timer = setInterval(() => this.reconcile().catch((e) => this.log.error(e)), 60_000);
  }

  /** Re-creates lost jobs (Redis flush/restart) and releases claims left by crashed workers. */
  async reconcile() {
    const db = this.prisma;
    const released = await db.postTarget.updateMany({ where: { status: 'PUBLISHING', claimedAt: { lt: new Date(Date.now() - STALE_CLAIM_MS) } }, data: { status: 'QUEUED', claimedAt: null, claimedBy: null } });
    if (released.count) this.log.warn(`released ${released.count} stale claim(s); stage markers decide whether they are re-sent or marked uncertain`);
    const rows = await db.postTarget.findMany({
      where: { status: { in: ['PENDING', 'QUEUED', 'PROCESSING'] }, claimedAt: null, post: { workspace: { suspendedAt: null }, status: { in: ['SCHEDULED', 'PUBLISHING'] }, scheduledAt: { lte: new Date(Date.now() + ENQUEUE_WINDOW_MS) } } },
      include: { post: { select: { scheduledAt: true } } }, take: 500,
    });
    let added = 0;
    for (const t of rows) {
      if (await this.queue.hasJob(t)) continue;
      if (await this.queue.enqueueTarget(t)) { added++; if (t.status === 'PENDING') await db.postTarget.updateMany({ where: { id: t.id, status: 'PENDING' }, data: { status: 'QUEUED' } }); }
    }
    if (added) this.log.log(`reconciler enqueued ${added} job(s)`);
  }
  async onModuleDestroy() { clearInterval(this.timer); await this.worker?.close(); }
}
