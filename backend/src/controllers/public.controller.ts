import { Request, Response } from 'express';
import { randomBytes } from 'crypto';
import { Enquiry } from '../models/Enquiry.model';
import { NewsletterSubscriber } from '../models/NewsletterSubscriber.model';
import { PolicyDocument } from '../models/PolicyDocument.model';
import { ApiResponse } from '../utils/ApiResponse';
import { ApiError } from '../utils/ApiError';
import { asyncHandler } from '../utils/asyncHandler';
import { notifyEnquiryReceived, notifyNewsletterwelcome } from '../services/email/notifications';

/**
 * The two public forms.
 *
 * Neither had a backend at all. Both showed a success message and made zero
 * network requests, so every enquiry and every newsletter signup was lost the
 * moment the tab closed — silently, with the sender told the opposite.
 *
 * Both handlers **store first and email second**. The record is the thing that
 * must survive; email is best-effort on top of it. A mail outage should not
 * turn a message that was successfully received into an error for someone who
 * did nothing wrong.
 */

const EMAIL_PATTERN = /^[^\s@]+@[^\s@.]+(\.[^\s@.]+)+$/;

const clean = (value: unknown, max: number): string =>
  typeof value === 'string' ? value.trim().slice(0, max) : '';

/** Short, unambiguous, and readable down a phone line. No I/O/0/1. */
function makeTicketId(): string {
  const alphabet = 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789';
  const bytes = randomBytes(6);
  let id = '';
  for (const byte of bytes) id += alphabet[byte % alphabet.length];
  return `MCO-${id}`;
}

export const submitEnquiry = asyncHandler(async (req: Request, res: Response) => {
  const name = clean(req.body?.name, 120);
  const email = clean(req.body?.email, 200).toLowerCase();
  const mobile = clean(req.body?.mobile, 40);
  const subject = clean(req.body?.subject, 200);
  const message = clean(req.body?.message, 5000);

  if (!name || !email || !message) {
    throw new ApiError(400, 'Please give your name, your email address and a message.');
  }
  if (!EMAIL_PATTERN.test(email)) {
    throw new ApiError(400, 'That does not look like a valid email address.');
  }

  // A ticket id is generated rather than derived, so collisions are possible in
  // principle. Retried a few times rather than trusted, since the field is
  // unique and a collision would otherwise surface as a duplicate-key error to
  // someone simply sending a message.
  let enquiry = null;
  for (let attempt = 0; attempt < 5 && !enquiry; attempt += 1) {
    try {
      enquiry = await Enquiry.create({
        ticketId: makeTicketId(),
        name,
        email,
        mobile: mobile || undefined,
        subject: subject || 'General enquiry',
        message,
        ipAddress: req.ip,
      });
    } catch (err: any) {
      if (err?.code !== 11000) throw err;
    }
  }
  if (!enquiry) throw new ApiError(500, 'Could not record your message. Please try again.');

  void notifyEnquiryReceived({
    ticketId: enquiry.ticketId,
    name: enquiry.name,
    email: enquiry.email,
    mobile: enquiry.mobile,
    subject: enquiry.subject,
    message: enquiry.message,
    createdAt: enquiry.createdAt,
    _id: enquiry._id,
  });

  res.status(201).json(
    new ApiResponse(
      201,
      { ticketId: enquiry.ticketId },
      'Thanks — your message is with our team. We usually reply within 2 working days.'
    )
  );
});

export const subscribeToNewsletter = asyncHandler(async (req: Request, res: Response) => {
  const email = clean(req.body?.email, 200).toLowerCase();
  const source = ['footer', 'newsletter-page'].includes(req.body?.source)
    ? req.body.source
    : 'other';

  if (!email) throw new ApiError(400, 'Please enter your email address.');
  if (!EMAIL_PATTERN.test(email)) {
    throw new ApiError(400, 'That does not look like a valid email address.');
  }

  const existing = await NewsletterSubscriber.findOne({ email });

  if (existing?.isActive) {
    // Not an error. Someone who signs up twice has done nothing wrong, and
    // telling them "already subscribed" is more useful than a failure.
    res.status(200).json(
      new ApiResponse(200, { alreadySubscribed: true }, 'You are already on the list.')
    );
    return;
  }

  if (existing) {
    // Previously unsubscribed, now back.
    existing.isActive = true;
    existing.unsubscribedAt = undefined;
    existing.source = source;
    await existing.save();
  } else {
    await NewsletterSubscriber.create({ email, source });
  }

  void notifyNewsletterwelcome(email);

  res.status(201).json(
    new ApiResponse(201, { alreadySubscribed: false }, 'You are on the list — look out for the next issue.')
  );
});

/**
 * The live text of a legal document, for the public pages.
 *
 * Serves `publishedContent` only — a draft must never be reachable from
 * outside, or "save without publishing" would mean nothing.
 */
export const getPublishedPolicy = asyncHandler(async (req: Request, res: Response) => {
  const slug = String(req.params.slug || '').toLowerCase();
  const doc = await PolicyDocument.findOne({ slug }).select(
    'slug title publishedContent publishedVersion publishedAt effectiveDate'
  ).lean();

  if (!doc || !doc.publishedContent?.trim()) {
    throw new ApiError(404, 'That document has not been published yet.');
  }

  res.status(200).json(
    new ApiResponse(200, {
      slug: doc.slug,
      title: doc.title,
      content: doc.publishedContent,
      // Shown as "Last updated". Prefers the effective date the admin set over
      // the moment publish was clicked — republishing to fix a typo should not
      // tell every visitor the terms changed. Falls back for older records.
      lastUpdated: doc.effectiveDate ?? doc.publishedAt,
      // Deliberately **not** the version number: that is an internal editing
      // detail, and showing "Version 5" to a student invites the question "what
      // was in versions 1 to 4?" that the page cannot answer.
    }, 'Policy fetched')
  );
});
