import { Request, Response } from 'express';
import jwt from 'jsonwebtoken';
import { Newsletter, PUBLIC_FIELDS } from '../models/Newsletter.model';
import { NewsletterSubscriber } from '../models/NewsletterSubscriber.model';
import { createOtp, verifyOtp } from '../services/otp.service';
import { enqueue } from '../services/email';
import { env } from '../config/env';
import { ApiResponse } from '../utils/ApiResponse';
import { ApiError } from '../utils/ApiError';
import { asyncHandler } from '../utils/asyncHandler';
import { recordActivity } from '../services/activity.service';
import { cloudinary } from '../config/cloudinary';

/**
 * Reading the newsletter.
 *
 * The rule: **the PDF address never leaves this server.** The public list and
 * detail responses carry only what describes an issue — title, edition,
 * summary, cover, date. `fileUrl` is a plain HTTPS address, so any response
 * containing it has handed the file over regardless of what the interface does
 * afterwards.
 *
 * Getting the file takes three steps, and none of them reveals that address:
 *
 *  1. `request-access` — the reader gives an email; a one-time code is sent
 *  2. `verify-access`  — the right code returns a short-lived download ticket
 *  3. `download`       — the ticket is exchanged for the bytes, **streamed
 *     through this server**, so the browser never sees where the file lives
 *
 * There is no account and no password. Someone who wants to read a newsletter
 * should not have to sign up for a platform.
 */

const EMAIL_PATTERN = /^[^\s@]+@[^\s@.]+(\.[^\s@.]+)+$/;

/**
 * OTPs are keyed on a namespaced identifier, not the bare address.
 *
 * `createOtp` clears any existing code for the same identifier and channel. With
 * a bare email, asking for a newsletter code would silently destroy a login code
 * the same person had just requested — and the login would then fail for no
 * visible reason.
 */
const otpKey = (email: string, newsletterId: string) => `newsletter:${newsletterId}:${email}`;

/** Minutes a download ticket stays valid. Long enough to click, short enough to be useless if shared. */
const TICKET_MINUTES = 15;

/**
 * Tickets emailed to subscribers last far longer.
 *
 * An inbox is not a browser session — people come back to a newsletter days
 * later. A 15-minute link would be dead by the time most of them clicked it, and
 * the risk is different too: this link was sent to one verified address rather
 * than handed to whoever is at the keyboard.
 */
const EMAIL_TICKET_DAYS = 30;

interface TicketPayload {
  kind: 'newsletter-download';
  newsletterId: string;
  email: string;
}

/* ── Public ─────────────────────────────────────────────────────────────── */

export const listPublishedNewsletters = asyncHandler(async (_req: Request, res: Response) => {
  const rows = await Newsletter.find({ isPublished: true })
    .select(PUBLIC_FIELDS)
    .sort({ publishedAt: -1 })
    .lean();

  res.status(200).json(new ApiResponse(200, rows, 'Newsletters fetched'));
});

export const getPublishedNewsletter = asyncHandler(async (req: Request, res: Response) => {
  const row = await Newsletter.findOne({ _id: req.params.id, isPublished: true })
    .select(PUBLIC_FIELDS)
    .lean();

  if (!row) throw new ApiError(404, 'That issue is not available.');
  res.status(200).json(new ApiResponse(200, row, 'Newsletter fetched'));
});

/** Step 1 — send a one-time code to the address the reader gave. */
export const requestNewsletterAccess = asyncHandler(async (req: Request, res: Response) => {
  const email = String(req.body?.email ?? '').toLowerCase().trim();

  if (!email) throw new ApiError(400, 'Please enter your email address.');
  if (!EMAIL_PATTERN.test(email)) {
    throw new ApiError(400, 'That does not look like a valid email address.');
  }

  const newsletter = await Newsletter.findOne({ _id: req.params.id, isPublished: true })
    .select('title')
    .lean();
  if (!newsletter) throw new ApiError(404, 'That issue is not available.');

  const code = await createOtp(otpKey(email, String(newsletter._id)), 'email');

  await enqueue({
    templateKey: 'newsletter-access-otp',
    to: { address: email },
    merge: {
      otp: code,
      newsletter_title: newsletter.title,
      expiry_minutes: env.OTP_EXPIRY_MINUTES,
    },
  });

  res.status(200).json(
    new ApiResponse(200, { expiryMinutes: env.OTP_EXPIRY_MINUTES }, `We have sent a code to ${email}.`)
  );
});

/** Step 2 — a correct code buys a short-lived ticket, not the file address. */
export const verifyNewsletterAccess = asyncHandler(async (req: Request, res: Response) => {
  const email = String(req.body?.email ?? '').toLowerCase().trim();
  const otp = String(req.body?.otp ?? '').trim();

  if (!email || !otp) throw new ApiError(400, 'Enter the code we emailed you.');

  const newsletter = await Newsletter.findOne({ _id: req.params.id, isPublished: true })
    .select('title')
    .lean();
  if (!newsletter) throw new ApiError(404, 'That issue is not available.');

  const ok = await verifyOtp(otpKey(email, String(newsletter._id)), 'email', otp);
  if (!ok) throw new ApiError(400, 'That code is wrong or has expired. Ask for a new one.');

  // Someone who verified an address to read the newsletter has, in substance,
  // subscribed to it. Recorded once — an existing subscriber is left alone, and
  // one who had opted out is **not** silently re-subscribed.
  const existing = await NewsletterSubscriber.findOne({ email });
  if (!existing) {
    await NewsletterSubscriber.create({ email, source: 'newsletter-page' });
  }

  const payload: TicketPayload = {
    kind: 'newsletter-download',
    newsletterId: String(newsletter._id),
    email,
  };
  const ticket = jwt.sign(payload, env.JWT_SECRET, { expiresIn: `${TICKET_MINUTES}m` });

  recordActivity({
    actorType: 'system',
    actorName: email,
    actorEmail: email,
    action: 'newsletter.access_verified',
    summary: `Verified their email to read "${newsletter.title}"`,
    targetType: 'Newsletter',
    targetId: String(newsletter._id),
    targetLabel: newsletter.title,
    ipAddress: req.ip,
    success: true,
  });

  res.status(200).json(
    new ApiResponse(200, { ticket, expiresInMinutes: TICKET_MINUTES }, 'Verified — your download is ready.')
  );
});

/**
 * Step 3 — exchange a ticket for the bytes.
 *
 * The file is fetched server-side and streamed back. A redirect would be simpler
 * and would defeat the whole arrangement: the browser would end up holding the
 * permanent Cloudinary address, which could then be shared with anyone.
 */
export const downloadNewsletter = asyncHandler(async (req: Request, res: Response) => {
  const ticket = String(req.query.ticket ?? '');
  if (!ticket) throw new ApiError(401, 'This download link is missing its access code.');

  let payload: TicketPayload;
  try {
    payload = jwt.verify(ticket, env.JWT_SECRET) as TicketPayload;
  } catch {
    throw new ApiError(401, 'This download link has expired. Please verify your email again.');
  }

  if (payload.kind !== 'newsletter-download' || payload.newsletterId !== req.params.id) {
    // A ticket for one issue must not open another, and a login token must not
    // work here at all.
    throw new ApiError(403, 'This download link is not valid for this issue.');
  }

  const newsletter = await Newsletter.findOne({ _id: req.params.id, isPublished: true });
  if (!newsletter) throw new ApiError(404, 'That issue is not available.');

  // The raw asset is not publicly deliverable, so a plain GET of `fileUrl`
  // returns 401. A signed URL, minted here and valid for a couple of minutes, is
  // what actually fetches it — and it never leaves this process.
  const source = newsletter.filePublicId
    ? cloudinary.utils.private_download_url(newsletter.filePublicId, '', {
        resource_type: 'raw',
        type: 'authenticated',
        expires_at: Math.round(Date.now() / 1000) + 120,
      })
    // Only reached by rows saved before authenticated delivery — those would
    // have had to be publicly deliverable to work at all.
    : newsletter.fileUrl;

  const upstream = await fetch(source);
  if (!upstream.ok) {
    console.error('[newsletter] could not fetch the PDF:', upstream.status, newsletter.filePublicId ?? newsletter.fileUrl);
    throw new ApiError(502, 'The file could not be fetched just now. Please try again.');
  }

  await Newsletter.updateOne({ _id: newsletter._id }, { $inc: { downloadCount: 1 } });

  recordActivity({
    actorType: 'system',
    actorName: payload.email,
    actorEmail: payload.email,
    action: 'newsletter.download',
    summary: `Downloaded "${newsletter.title}"`,
    targetType: 'Newsletter',
    targetId: String(newsletter._id),
    targetLabel: newsletter.title,
    ipAddress: req.ip,
    success: true,
  });

  const safeName = `${newsletter.title} — ${newsletter.edition}`.replace(/[^\w\s.-]/g, '').trim();
  res.setHeader('Content-Type', 'application/pdf');
  res.setHeader('Content-Disposition', `attachment; filename="${safeName || 'newsletter'}.pdf"`);
  const length = upstream.headers.get('content-length');
  if (length) res.setHeader('Content-Length', length);
  // Never cached by a proxy: the response is tied to one verified reader.
  res.setHeader('Cache-Control', 'private, no-store');

  const buffer = Buffer.from(await upstream.arrayBuffer());
  res.end(buffer);
});

/* ── Admin ──────────────────────────────────────────────────────────────── */

export const listAllNewsletters = asyncHandler(async (_req: Request, res: Response) => {
  const rows = await Newsletter.find().sort({ createdAt: -1 }).lean();
  res.status(200).json(new ApiResponse(200, rows, 'Newsletters fetched'));
});

export const createNewsletter = asyncHandler(async (req: Request, res: Response) => {
  const { title, edition, summary, coverImageUrl, fileUrl, filePublicId, fileSizeBytes, pageCount, isPublished } = req.body ?? {};

  if (!title?.trim() || !edition?.trim() || !summary?.trim()) {
    throw new ApiError(400, 'A title, an edition label and a short summary are all required.');
  }
  if (!fileUrl?.trim()) {
    throw new ApiError(400, 'Upload the newsletter PDF before saving.');
  }

  const row = await Newsletter.create({
    title: title.trim(),
    edition: edition.trim(),
    summary: summary.trim(),
    coverImageUrl: coverImageUrl?.trim() || undefined,
    fileUrl: fileUrl.trim(),
    filePublicId: filePublicId?.trim() || undefined,
    fileSizeBytes,
    pageCount,
    isPublished: Boolean(isPublished),
    publishedAt: isPublished ? new Date() : undefined,
    createdByName: req.admin?.name,
    createdByEmail: req.admin?.email,
  });

  res.status(201).json(new ApiResponse(201, row, 'Newsletter saved.'));
});

export const updateNewsletter = asyncHandler(async (req: Request, res: Response) => {
  const row = await Newsletter.findById(req.params.id);
  if (!row) throw new ApiError(404, 'Newsletter not found');

  const { title, edition, summary, coverImageUrl, fileUrl, filePublicId, fileSizeBytes, pageCount, isPublished } = req.body ?? {};

  if (title !== undefined) row.title = String(title).trim();
  if (edition !== undefined) row.edition = String(edition).trim();
  if (summary !== undefined) row.summary = String(summary).trim();
  if (coverImageUrl !== undefined) row.coverImageUrl = String(coverImageUrl).trim() || undefined;
  if (fileUrl !== undefined && String(fileUrl).trim()) row.fileUrl = String(fileUrl).trim();
  if (filePublicId !== undefined) row.filePublicId = String(filePublicId).trim() || undefined;
  if (fileSizeBytes !== undefined) row.fileSizeBytes = fileSizeBytes;
  if (pageCount !== undefined) row.pageCount = pageCount;

  if (isPublished !== undefined && Boolean(isPublished) !== row.isPublished) {
    row.isPublished = Boolean(isPublished);
    // Set on first publish and kept afterwards — unpublishing and republishing
    // should not make an old issue look new.
    if (row.isPublished && !row.publishedAt) row.publishedAt = new Date();
  }

  await row.save();
  res.status(200).json(new ApiResponse(200, row, 'Newsletter updated.'));
});

export const deleteNewsletter = asyncHandler(async (req: Request, res: Response) => {
  const row = await Newsletter.findByIdAndDelete(req.params.id);
  if (!row) throw new ApiError(404, 'Newsletter not found');
  res.status(200).json(new ApiResponse(200, null, 'Newsletter deleted.'));
});


/**
 * Emails every active subscriber about a published issue.
 *
 * Each message carries a link with a ticket **minted for that recipient's
 * address**, so a subscriber who already proved their email does not have to
 * prove it again — they click and read. A forwarded link still only opens the
 * one issue it was made for.
 *
 * Sending is queued through the normal outbox, one row per recipient, so a
 * failure to a single address does not stop the rest.
 */
export const notifySubscribers = asyncHandler(async (req: Request, res: Response) => {
  const newsletter = await Newsletter.findById(req.params.id);
  if (!newsletter) throw new ApiError(404, 'Newsletter not found');
  if (!newsletter.isPublished) {
    // Refused rather than silently queued: a link in that email would 404 for
    // everyone who clicked it.
    throw new ApiError(400, 'Publish the issue before emailing it out — the link would not work yet.');
  }

  const subscribers = await NewsletterSubscriber.find({ isActive: true }).select('email').lean();
  if (subscribers.length === 0) {
    throw new ApiError(400, 'There are no active subscribers to send this to.');
  }

  const base = env.APP_BASE_URL.replace(/\/$/, '');

  for (const subscriber of subscribers) {
    const ticket = jwt.sign(
      { kind: 'newsletter-download', newsletterId: String(newsletter._id), email: subscriber.email } as TicketPayload,
      env.JWT_SECRET,
      { expiresIn: `${EMAIL_TICKET_DAYS}d` }
    );

    void enqueue({
      templateKey: 'newsletter-issue',
      to: { address: subscriber.email },
      merge: {
        newsletter_title: newsletter.title,
        newsletter_edition: newsletter.edition,
        newsletter_summary: newsletter.summary,
        download_url: `${base}/newsletter?issue=${newsletter._id}&ticket=${encodeURIComponent(ticket)}`,
      },
      relatedTo: { model: 'Newsletter', id: String(newsletter._id) },
      // Keyed on the issue and the address, so pressing the button twice does
      // not send the same issue to the same person twice.
      dedupeKey: `newsletter-issue:${newsletter._id}:${subscriber.email}`,
    });
  }

  newsletter.notifiedAt = new Date();
  newsletter.notifiedCount = subscribers.length;
  await newsletter.save();

  res.status(200).json(
    new ApiResponse(
      200,
      { sent: subscribers.length, notifiedAt: newsletter.notifiedAt },
      `Queued for ${subscribers.length} subscriber${subscribers.length === 1 ? '' : 's'}.`
    )
  );
});
