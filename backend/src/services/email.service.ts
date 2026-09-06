import { env } from '../config/env';
import { enqueue } from './email';

/**
 * Backwards-compatible entry points for email.
 *
 * The console.log stubs are gone — these now render the real templates and go
 * through the ZeptoMail outbox in services/email/. New code should call
 * `enqueue()` from services/email directly; this file exists so existing call
 * sites keep working.
 */

/**
 * Login OTP.
 *
 * `auth-login-otp` is flagged sensitive in the template manifest: the audit row
 * records that it was sent, to whom and whether it worked, but never stores the
 * body or the code itself.
 */
export const sendOtpEmail = async (email: string, otp: string): Promise<void> => {
  await enqueue({
    templateKey: 'auth-login-otp',
    to: { address: email },
    merge: {
      first_name: 'there',
      otp,
      expiry_minutes: env.OTP_EXPIRY_MINUTES,
    },
  });
};
