import rateLimit from 'express-rate-limit';

/** General API rate limiter — 100 requests per 15 min window */
export const apiLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  max: 100,
  message: {
    success: false,
    message: 'Too many requests. Please try again after 15 minutes.',
  },
  standardHeaders: true,
  legacyHeaders: false,
});

/** Auth endpoints — stricter: 20 requests per 15 min */
export const authLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  max: 20,
  message: {
    success: false,
    message: 'Too many authentication attempts. Please try again later.',
  },
  standardHeaders: true,
  legacyHeaders: false,
});

/**
 * The public, unauthenticated forms — 5 requests per hour.
 *
 * `apiLimiter` guarded these first, and 100 per 15 minutes turned out to mean
 * nothing: a bot posting one enquiry every five to ten minutes never came near
 * it, and each one emailed both the admins and the (stranger's) address in the
 * form. Nobody filling in a contact form by hand sends five in an hour, so the
 * ceiling can be this low without ever being felt by a real visitor.
 *
 * This is one defence of several and the weakest of them, because the store is
 * per-instance and the key is an IP address the client influences. The checks
 * in utils/spamGuard and the per-address daily cap are what actually hold.
 */
export const publicFormLimiter = rateLimit({
  windowMs: 60 * 60 * 1000,
  max: 5,
  message: {
    success: false,
    message: 'Too many submissions from this connection. Please try again later.',
  },
  standardHeaders: true,
  legacyHeaders: false,
});

/** OTP requests — very strict: 5 requests per 10 min */
export const otpLimiter = rateLimit({
  windowMs: 10 * 60 * 1000,
  max: 5,
  message: {
    success: false,
    message: 'Too many OTP requests. Please try again after 10 minutes.',
  },
  standardHeaders: true,
  legacyHeaders: false,
});
