import { Request, Response, NextFunction } from 'express';
import { recordActivity, actorFrom } from '../services/activity.service';

/**
 * Records every state-changing request, automatically.
 *
 * Deliberately a middleware rather than a call in each controller. Attribution
 * that depends on someone remembering to add a line is attribution that is
 * missing from whichever endpoint was written last — and the gap is invisible
 * until an audit needs it. Sitting in the request pipeline, this covers
 * endpoints that do not exist yet.
 *
 * Reads are not logged. A `GET` changes nothing, and logging every list view
 * would bury the rows that matter under noise while growing the collection
 * without limit. Controllers can still record a specific read (a certificate
 * download, say) by calling `recordActivity` directly.
 */

/**
 * Turns a method and path into a sentence.
 *
 * Ordered most specific first — the first match wins. Anything unmatched still
 * gets logged, just with a plainer description; an unrecognised route is never
 * a reason to drop the row.
 */
const DESCRIPTIONS: { test: RegExp; method?: string; action: string; describe: (m: RegExpMatchArray, req: Request) => string }[] = [
  { test: /^\/admin\/orders\/([^/]+)\/status$/, action: 'order.review',
    describe: (_m, req) => req.body?.status === 'approved'
      ? 'Approved a payment'
      : `Rejected a payment — "${String(req.body?.rejectionReason ?? '').slice(0, 80)}"` },
  { test: /^\/admin\/users\/([^/]+)\/toggle-status$/, action: 'user.toggle_status',
    describe: () => 'Changed a student’s account status' },
  { test: /^\/admin\/events\/attendance\/scan$/, action: 'attendance.mark',
    describe: () => 'Checked an attendee in' },
  { test: /^\/admin\/events\/([^/]+)$/, method: 'DELETE', action: 'event.delete',
    describe: () => 'Cancelled and deleted an event' },
  { test: /^\/admin\/events\/([^/]+)$/, method: 'PUT', action: 'event.update',
    describe: (_m, req) => `Edited an event${req.body?.title ? ` — ${req.body.title}` : ''}` },
  { test: /^\/admin\/events$/, method: 'POST', action: 'event.create',
    describe: (_m, req) => `Created an event — ${req.body?.title ?? 'untitled'}` },
  { test: /^\/admin\/coupons\/([^/]+)$/, method: 'DELETE', action: 'coupon.delete',
    describe: () => 'Deleted a coupon' },
  { test: /^\/admin\/coupons$/, method: 'POST', action: 'coupon.create',
    describe: (_m, req) => `Created coupon ${String(req.body?.code ?? '').toUpperCase()}` },
  { test: /^\/admin\/courses\/([^/]+)$/, method: 'DELETE', action: 'course.delete',
    describe: () => 'Deleted a course' },
  { test: /^\/admin\/courses\/([^/]+)$/, method: 'PUT', action: 'course.update',
    describe: () => 'Edited a course' },
  { test: /^\/admin\/courses$/, method: 'POST', action: 'course.create',
    describe: (_m, req) => `Created a course — ${req.body?.title ?? 'untitled'}` },
  { test: /^\/admin\/payment-settings/, action: 'payment_settings.update',
    describe: () => 'Updated the payment details students pay into' },
  { test: /^\/admin\/policies\/([^/]+)\/publish$/, action: 'policy.publish',
    describe: (m) => `Published a new version of the ${m[1]} document` },
  { test: /^\/admin\/policies\/([^/]+)\/draft$/, action: 'policy.draft',
    describe: (m) => `Saved a draft of the ${m[1]} document` },
  { test: /^\/admin\/policies\/([^/]+)\/versions\/([^/]+)\/restore$/, action: 'policy.restore',
    describe: (m) => `Loaded version ${m[2]} of the ${m[1]} document back into the draft` },
  { test: /^\/admin\/auth\/login$/, action: 'admin.login_failed',
    describe: (_m, req) => `Failed admin sign-in attempt for ${String(req.body?.email ?? 'an unknown address')}` },
  { test: /^\/admin\/newsletters\/([^/]+)\/notify$/, action: 'newsletter.notify',
    describe: () => 'Emailed subscribers about a newsletter issue' },
  { test: /^\/admin\/newsletters\/([^/]+)$/, method: 'DELETE', action: 'newsletter.delete',
    describe: () => 'Deleted a newsletter issue' },
  { test: /^\/admin\/newsletters\/([^/]+)$/, method: 'PUT', action: 'newsletter.update',
    describe: (_m, req) => `Edited a newsletter issue${req.body?.title ? ` — ${req.body.title}` : ''}` },
  { test: /^\/admin\/newsletters$/, method: 'POST', action: 'newsletter.create',
    describe: (_m, req) => `Added a newsletter issue — ${req.body?.title ?? 'untitled'}` },
  { test: /^\/newsletters\/([^/]+)\/request-access$/, action: 'newsletter.access_requested',
    describe: (_m, req) => `Asked for a code to read an issue (${req.body?.email ?? 'unknown address'})` },
  { test: /^\/newsletters\/([^/]+)\/verify-access$/, action: 'newsletter.access_attempt',
    describe: (_m, req) => `Entered a code to read an issue (${req.body?.email ?? 'unknown address'})` },
  { test: /^\/admin\/uploads\/signature$/, action: 'upload.sign',
    describe: (_m, req) => `Uploaded an image (${req.query?.purpose ?? 'unknown'})` },

  // ── Student side ──
  { test: /^\/events\/register$/, action: 'event.register',
    describe: () => 'Booked a place on an event' },
  { test: /^\/orders$/, method: 'POST', action: 'course.purchase',
    describe: () => 'Bought a course' },
  { test: /^\/profile\/onboarding$/, action: 'user.onboard',
    describe: () => 'Completed their profile setup' },
  { test: /^\/profile\/request-mobile-otp$/, action: 'user.request_mobile_otp',
    describe: () => 'Requested a mobile verification code' },
  { test: /^\/auth\/verify-otp$/, action: 'user.login_failed',
    describe: (_m, req) => `Failed sign-in attempt for ${String(req.body?.email ?? 'an unknown address')}` },
  { test: /^\/auth\/request-otp$/, action: 'user.request_otp',
    describe: (_m, req) => `Requested a login code for ${String(req.body?.email ?? 'an unknown address')}` },
  { test: /^\/events\/([^/]+)\/record-download$/, action: 'user.download',
    describe: (_m, req) => `Downloaded their ${req.body?.type ?? 'file'}` },
  { test: /^\/contact$/, action: 'contact.submit', describe: () => 'Sent a message through the contact form' },
  { test: /^\/newsletter\/subscribe$/, action: 'newsletter.subscribe', describe: () => 'Subscribed to the newsletter' },
];

export const recordRequestActivity = (req: Request, res: Response, next: NextFunction): void => {
  if (req.method === 'GET' || req.method === 'OPTIONS' || req.method === 'HEAD') {
    return next();
  }

  // Captured before the handler runs: controllers mutate `req.body`, and by the
  // time the response finishes the original values may be gone.
  const body = req.body ?? {};
  const snapshot = { ...body };
  const path = req.originalUrl.split('?')[0].replace(/^\/api\/v1/, '');

  // Recorded on 'finish' so the real status code is known — an attempt that was
  // refused is at least as interesting as one that succeeded.
  res.on('finish', () => {
    // A *successful* admin login is recorded by the controller instead, where
    // the account is actually known — logging it here as well would put two
    // rows against one sign-in, one of them anonymous. Failed attempts still
    // come through here, and those are the ones worth watching.
    if (path === '/admin/auth/login' && res.statusCode < 400) return;
    // Same for a student sign-in: the controller records it with a name.
    if (path === '/auth/verify-otp' && res.statusCode < 400) return;
    // And for newsletter access — the controller records the successful case
    // with the issue it unlocked. A *failed* attempt still lands here, which is
    // the half worth watching.
    if (/^\/newsletters\/[^/]+\/verify-access$/.test(path) && res.statusCode < 400) return;

    const matched = DESCRIPTIONS.find(
      (d) => d.test.test(path) && (!d.method || d.method === req.method)
    );
    const m = matched ? path.match(matched.test) : null;

    const actor = actorFrom(req);
    const success = res.statusCode < 400;

    let summary: string;
    try {
      summary = matched && m ? matched.describe(m, { ...req, body: snapshot } as Request) : `${req.method} ${path}`;
    } catch {
      summary = `${req.method} ${path}`;
    }
    if (!success) summary = `${summary} — refused (${res.statusCode})`;

    recordActivity({
      ...actor,
      action: matched?.action ?? `request.${req.method.toLowerCase()}`,
      summary,
      method: req.method,
      path,
      statusCode: res.statusCode,
      success,
      ipAddress: req.ip,
      userAgent: req.headers['user-agent'],
      // Credentials and payloads that would duplicate a whole document are
      // stripped — an audit log is not a place to accumulate secrets.
      metadata: redactBody(snapshot),
    });
  });

  next();
};

const SENSITIVE = /otp|password|token|secret|signature|screenshot|content/i;

function redactBody(body: Record<string, unknown>): Record<string, unknown> {
  const out: Record<string, unknown> = {};
  for (const [k, v] of Object.entries(body)) {
    if (SENSITIVE.test(k)) { out[k] = '******'; continue; }
    if (typeof v === 'string') { out[k] = v.slice(0, 200); continue; }
    if (typeof v === 'number' || typeof v === 'boolean') { out[k] = v; continue; }
    if (Array.isArray(v)) { out[k] = `[${v.length} items]`; continue; }
    if (v && typeof v === 'object') { out[k] = '{…}'; continue; }
  }
  return out;
}
