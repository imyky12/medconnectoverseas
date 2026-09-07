import cron from 'node-cron';
import { EmailLog } from '../models/EmailLog.model';
import { deliver } from '../services/email/mailer';
import { env } from '../config/env';

/**
 * Safety net behind mailer.enqueue().
 *
 * enqueue() attempts delivery inline, so in the happy path this worker finds
 * nothing to do. It exists for the unhappy paths: provider 5xx with a backoff
 * pending, a process that died mid-send, or an enqueue whose inline attempt was
 * lost to a restart.
 */

const BATCH_SIZE = 25;
const CONCURRENCY = 4; // ZeptoMail rate-limits per second — do not raise casually
const STUCK_AFTER_MS = 10 * 60_000;

/** Rows left in 'sending' by a crashed process would otherwise sit there forever. */
async function requeueStuck(): Promise<void> {
  const cutoff = new Date(Date.now() - STUCK_AFTER_MS);
  const result = await EmailLog.updateMany(
    { status: 'sending', updatedAt: { $lt: cutoff } },
    { $set: { status: 'queued', nextAttemptAt: new Date() } }
  );
  if (result.modifiedCount > 0) {
    console.warn(`[emailWorker] re-queued ${result.modifiedCount} stuck email(s)`);
  }
}

export async function processEmailQueue(): Promise<void> {
  await requeueStuck();

  const due = await EmailLog.find({
    status: { $in: ['queued', 'failed'] },
    $expr: { $lt: ['$attempts', '$maxAttempts'] },
    $or: [{ nextAttemptAt: { $lte: new Date() } }, { nextAttemptAt: { $exists: false } }],
  })
    .sort({ queuedAt: 1 })
    .limit(BATCH_SIZE)
    .select('_id')
    .lean();

  if (due.length === 0) return;

  for (let i = 0; i < due.length; i += CONCURRENCY) {
    const slice = due.slice(i, i + CONCURRENCY);
    await Promise.all(
      // deliver() claims each row atomically, so overlapping runs are harmless.
      slice.map((row) =>
        deliver(String(row._id)).catch((err) =>
          console.error(`[emailWorker] deliver failed for ${row._id}:`, err)
        )
      )
    );
  }

  console.log(`[emailWorker] processed ${due.length} queued email(s)`);
}

export function startEmailWorker(): void {
  if (!env.MAIL_ENABLED) {
    console.log('✉️  Email worker not started (MAIL_ENABLED=false)');
    return;
  }

  cron.schedule('* * * * *', async () => {
    try {
      await processEmailQueue();
    } catch (err) {
      console.error('[emailWorker] unhandled error:', err);
    }
  });

  console.log('✉️  Email worker started (schedule: "* * * * *")');
}
