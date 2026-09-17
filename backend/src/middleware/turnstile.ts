import { Request, Response, NextFunction } from 'express';
import { env } from '../config/env';
import { ApiError } from '../utils/ApiError';
import { asyncHandler } from '../utils/asyncHandler';

/**
 * Cloudflare Turnstile verification for the public forms.
 *
 * The honeypot and the string heuristics in utils/spamGuard stopped the bot
 * that was relaying mail through the contact form, but both are guesses about
 * how a bot behaves: a slightly better one fills only the visible fields and
 * sends a plausible name. Turnstile is the check that does not depend on
 * guessing. It is invisible to almost every real visitor — no puzzle, no
 * clicking traffic lights — so it can sit in front of a student's first
 * enquiry without costing them anything.
 *
 * The widget gives the browser a single-use token. Only Cloudflare can tell
 * whether that token is genuine, so the token is worthless until it has been
 * exchanged here, server-side, with the secret key. A client that simply posts
 * `turnstileToken: "anything"` fails at that exchange.
 */

const VERIFY_URL = 'https://challenges.cloudflare.com/turnstile/v0/siteverify';

// asyncHandler is not decoration. On Express 4 a rejected promise in
// middleware never reaches the error handler: the ApiError below would surface
// as an unhandled rejection and the visitor's request would simply hang.
export const verifyTurnstile = asyncHandler(async (
  req: Request,
  _res: Response,
  next: NextFunction
): Promise<void> => {
  // Unconfigured means unenforced, deliberately. Local development has no
  // secret key, and neither does the production instance in the window between
  // this code deploying and the variable being set — in both cases the forms
  // must keep working rather than reject every visitor. spamGuard and the rate
  // limiter still apply.
  if (!env.TURNSTILE_SECRET_KEY) return next();

  const token = typeof req.body?.turnstileToken === 'string' ? req.body.turnstileToken : '';
  if (!token) {
    throw new ApiError(400, 'Please complete the security check and try again.');
  }

  let outcome: { success?: boolean; 'error-codes'?: string[] };
  try {
    const response = await fetch(VERIFY_URL, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        secret: env.TURNSTILE_SECRET_KEY,
        response: token,
        // Not required, and sent because it lets Cloudflare catch a token
        // solved on one machine and replayed from another. Accurate only
        // because app.ts sets `trust proxy`.
        remoteip: req.ip,
      }),
      // Cloudflare answers in tens of milliseconds. If it is unreachable we
      // want to know quickly, not hold someone's enquiry open for a minute.
      signal: AbortSignal.timeout(5000),
    });
    outcome = (await response.json()) as typeof outcome;
  } catch (err) {
    // Fails open on purpose. This is Cloudflare being unreachable or slow, not
    // evidence about the visitor, and refusing every enquiry during someone
    // else's outage costs more than the spam that gets through — the other
    // defences are still in front of the handler.
    console.error('[turnstile] verification unreachable, allowing request:', err);
    return next();
  }

  if (!outcome.success) {
    // Logged because a sudden run of these is worth seeing: it means either an
    // attack or a misconfigured key pair. `timeout-or-duplicate` in normal use
    // usually just means a token was reused after a failed submit.
    console.warn('[turnstile] rejected:', outcome['error-codes']);
    throw new ApiError(400, 'The security check did not pass. Please reload the page and try again.');
  }

  next();
});
