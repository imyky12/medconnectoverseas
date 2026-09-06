import mongoose from 'mongoose';
import { env } from '../../config/env';
import { EmailLog, IEmailLog } from '../../models/EmailLog.model';
import { EmailSuppression } from '../../models/EmailSuppression.model';
import { render, getTemplateMeta, MergeData, TemplateError } from './renderer';
import { sendEmail, ZeptoAttachment, ZeptoInlineImage } from './zeptomail.client';

/**
 * Public email API. Controllers only ever call `enqueue`.
 *
 * Outbox pattern: enqueue writes an EmailLog row and returns immediately, then
 * fires a delivery attempt in the background. Anything that fails or is left
 * behind is picked up by jobs/emailWorker.ts. A provider outage therefore never
 * blocks or fails a request — an order approval still succeeds, and the email
 * catches up on its own.
 */

/** Retry backoff per attempt number. Beyond the last entry, give up. */
const BACKOFF_MS = [60_000, 5 * 60_000, 30 * 60_000, 2 * 3600_000, 6 * 3600_000];

export interface EnqueueInput {
  templateKey: string;
  to: { address: string; name?: string };
  merge?: MergeData;
  cc?: { address: string; name?: string }[];
  user?: mongoose.Types.ObjectId | string;
  relatedTo?: { model: string; id: mongoose.Types.ObjectId | string };
  /** Unique per logical send — a duplicate enqueue is silently dropped. */
  dedupeKey?: string;
  attachments?: (ZeptoAttachment & { size?: number })[];
  inlineImages?: ZeptoInlineImage[];
  unsubscribeUrl?: string;
}

const REDACTED = '******';

/**
 * Sensitive templates (auth-login-otp, admin-password-reset) carry live
 * credentials. We keep the audit row — who, when, status — but never the body
 * or the values, so the log cannot be used to log in as somebody.
 */
function redact(merge: MergeData, sensitive: boolean): Record<string, unknown> {
  if (!sensitive) return { ...merge };
  return Object.fromEntries(Object.keys(merge).map((k) => [k, REDACTED]));
}

/**
 * In-memory handoff from enqueue to the immediate delivery attempt — holds
 * attachment bytes and, for sensitive templates, the rendered body that is
 * deliberately never written to EmailLog. Lost on restart, which is the point:
 * an OTP body exists just long enough to be sent once.
 */
const payloadCache = new Map<
  string,
  { html?: string; attachments?: ZeptoAttachment[]; inlineImages?: ZeptoInlineImage[] }
>();

// ─── enqueue ────────────────────────────────────────────────────────────────

/**
 * Renders, logs and schedules one email. Never throws: a failure is recorded on
 * the EmailLog row instead, so a broken template can't take down a controller.
 * Returns the log id, or null if the send was dropped (duplicate/suppressed).
 */
export async function enqueue(input: EnqueueInput): Promise<string | null> {
  const address = input.to.address?.toLowerCase().trim();

  try {
    if (!address) throw new TemplateError('Recipient address is empty');

    const meta = getTemplateMeta(input.templateKey);
    const mergeData: MergeData = { ...input.merge };
    if (meta.category === 'marketing') {
      mergeData.unsubscribe_url = input.unsubscribeUrl ?? `${env.CORS_ORIGIN}/unsubscribe`;
    }

    const base = {
      templateKey: meta.key,
      category: meta.category,
      audience: meta.audience,
      from: { address: env.MAIL_FROM_ADDRESS, name: env.MAIL_FROM_NAME },
      to: { address, name: input.to.name },
      cc: input.cc,
      replyTo: env.MAIL_REPLY_TO,
      user: input.user ? new mongoose.Types.ObjectId(input.user) : undefined,
      relatedTo: input.relatedTo
        ? { model: input.relatedTo.model, id: new mongoose.Types.ObjectId(input.relatedTo.id) }
        : undefined,
      dedupeKey: input.dedupeKey,
      maxAttempts: env.MAIL_MAX_ATTEMPTS,
      mergeData: redact(mergeData, meta.sensitive),
      attachments: input.attachments?.map((a) => ({
        name: a.name,
        mimeType: a.mime_type,
        size: a.size ?? Buffer.byteLength(a.content, 'base64'),
      })),
    };

    // Suppressed addresses are logged, not silently dropped — you can still see
    // that the system wanted to mail them and why it didn't.
    const suppression = await EmailSuppression.findOne({ address });
    if (suppression && (suppression.scope === 'all' || meta.category === 'marketing')) {
      const log = await EmailLog.create({
        ...base,
        templateHash: 'n/a',
        subject: meta.subject,
        status: 'suppressed',
        error: { message: `Address suppressed (${suppression.reason})`, at: new Date() },
      });
      return log.id;
    }

    let rendered;
    try {
      rendered = render(meta.key, mergeData);
    } catch (err) {
      // A missing variable becomes a visible failed row rather than an
      // exception thrown into a fire-and-forget call site.
      const log = await EmailLog.create({
        ...base,
        templateHash: 'render-failed',
        subject: meta.subject,
        status: 'failed',
        attempts: env.MAIL_MAX_ATTEMPTS,
        error: { message: (err as Error).message, code: 'ERENDER', at: new Date() },
      });
      console.error(`[mailer] render failed for "${meta.key}":`, (err as Error).message);
      return log.id;
    }

    const log = await EmailLog.create({
      ...base,
      templateHash: rendered.templateHash,
      subject: rendered.subject,
      // Bodies are kept indefinitely, except for sensitive templates.
      htmlBody: meta.sensitive ? undefined : rendered.html,
      status: env.MAIL_ENABLED ? 'queued' : 'skipped',
      queuedAt: new Date(),
    });

    if (!env.MAIL_ENABLED) {
      console.log(`✉️  [mail skipped — MAIL_ENABLED=false] ${meta.key} → ${address} · "${rendered.subject}"`);
      return log.id;
    }

    if (meta.sensitive || input.attachments?.length || input.inlineImages?.length) {
      payloadCache.set(log.id, {
        html: meta.sensitive ? rendered.html : undefined,
        attachments: input.attachments?.map(({ content, mime_type, name }) => ({ content, mime_type, name })),
        inlineImages: input.inlineImages,
      });
    }

    // Fire and forget — the worker is the safety net if this attempt is lost.
    void deliver(log.id).catch((err) => console.error('[mailer] deliver crashed:', err));

    return log.id;
  } catch (err) {
    // Duplicate dedupeKey — an intentional no-op, not an error.
    if ((err as { code?: number }).code === 11000) return null;
    console.error(`[mailer] enqueue failed for "${input.templateKey}" → ${address}:`, err);
    return null;
  }
}

// ─── deliver ────────────────────────────────────────────────────────────────

/**
 * Attempts delivery of one logged email.
 *
 * The claim is a conditional findOneAndUpdate, so two workers (or a worker and
 * an inline attempt) can never send the same row twice — the loser gets null.
 */
export async function deliver(logId: string): Promise<void> {
  const log = (await EmailLog.findOneAndUpdate(
    { _id: logId, status: { $in: ['queued', 'failed'] } },
    { $set: { status: 'sending' }, $inc: { attempts: 1 } },
    { new: true }
  ).select('+htmlBody')) as IEmailLog | null;

  if (!log) return; // already claimed, already sent, or gone

  const extras = payloadCache.get(logId);
  payloadCache.delete(logId);

  // Sensitive templates store no body; the first attempt reads it from the
  // in-memory cache. Once that is gone (restart, or a worker retry) there is
  // nothing to re-render from — by design, since the merge values were masked.
  // Fail loudly rather than send an empty email.
  const htmlBody = log.htmlBody ?? extras?.html;
  if (!htmlBody) {
    await EmailLog.updateOne(
      { _id: log._id },
      {
        $set: {
          status: 'failed',
          attempts: log.maxAttempts,
          failedAt: new Date(),
          error: {
            message:
              'No stored body — sensitive templates cannot be retried. Trigger the original action again.',
            code: 'ENOBODY',
            at: new Date(),
          },
        },
      }
    );
    return;
  }

  const result = await sendEmail({
    from: log.from,
    to: [log.to],
    cc: log.cc,
    replyTo: log.replyTo ? { address: log.replyTo } : undefined,
    subject: log.subject,
    htmlBody,
    attachments: extras?.attachments,
    inlineImages: extras?.inlineImages,
    clientReference: log.id,
    trackOpens: true,
    trackClicks: log.category === 'marketing',
  });

  if (result.ok) {
    await EmailLog.updateOne(
      { _id: log._id },
      {
        $set: {
          status: 'sent',
          sentAt: new Date(),
          providerMessageId: result.messageId,
          providerRequestId: result.requestId,
          providerResponse: result.raw,
        },
        $unset: { error: '', nextAttemptAt: '' },
      }
    );
    return;
  }

  const exhausted = !result.retryable || log.attempts >= log.maxAttempts;
  const backoff = BACKOFF_MS[Math.min(log.attempts - 1, BACKOFF_MS.length - 1)];

  await EmailLog.updateOne(
    { _id: log._id },
    {
      $set: {
        status: 'failed',
        failedAt: new Date(),
        providerRequestId: result.requestId,
        providerResponse: result.raw,
        nextAttemptAt: exhausted ? undefined : new Date(Date.now() + backoff),
        // A permanent failure is marked exhausted so the worker stops picking it up.
        ...(exhausted ? { attempts: log.maxAttempts } : {}),
        error: {
          message: result.errorMessage ?? 'Unknown send failure',
          code: result.errorCode,
          httpStatus: result.httpStatus,
          at: new Date(),
        },
      },
    }
  );

  console.error(
    `[mailer] ${log.templateKey} → ${log.to.address} failed ` +
      `(attempt ${log.attempts}/${log.maxAttempts}, http ${result.httpStatus}): ${result.errorMessage}` +
      (exhausted ? ' — giving up' : ` — retrying in ${Math.round(backoff / 1000)}s`)
  );
}

/** Re-queues a row from the admin panel. */
export async function retry(logId: string): Promise<void> {
  await EmailLog.updateOne(
    { _id: logId, status: { $in: ['failed', 'skipped'] } },
    { $set: { status: 'queued', attempts: 0, nextAttemptAt: new Date() }, $unset: { error: '' } }
  );
  void deliver(logId).catch((err) => console.error('[mailer] retry crashed:', err));
}

/** Resolves the recipient list for `admin-*` templates. */
export function adminRecipients(): string[] {
  return env.MAIL_ADMIN_RECIPIENTS;
}
