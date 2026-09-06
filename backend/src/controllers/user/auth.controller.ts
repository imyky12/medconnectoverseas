import { Request, Response } from 'express';
import mongoose from 'mongoose';
import { User } from '../../models/User.model';
import { createOtp, verifyOtp } from '../../services/otp.service';
import { sendOtpEmail } from '../../services/email.service';
import { generateAuthTokens } from '../../services/token.service';
import { createSession } from '../../services/session.service';
import { ApiResponse } from '../../utils/ApiResponse';
import { ApiError } from '../../utils/ApiError';
import { asyncHandler } from '../../utils/asyncHandler';
import { recordActivity } from '../../services/activity.service';

/**
 * Deliberately permissive: one @, no spaces, a dot in the domain. Anything
 * stricter starts rejecting addresses that are perfectly deliverable.
 */
const EMAIL_PATTERN = /^[^\s@]+@[^\s@.]+(\.[^\s@.]+)+$/;

/**
 * Handles requesting an OTP for login/signup via email.
 */
export const requestOtp = asyncHandler(async (req: Request, res: Response) => {
  const { email } = req.body;

  if (!email || typeof email !== 'string') {
    throw new ApiError(400, 'Email is required');
  }

  const lowercaseEmail = email.toLowerCase().trim();

  // Only the shape is checked here, never whether the address exists. Nothing
  // checked it before: a malformed address was queued like any other and the
  // caller was told "OTP sent successfully", so someone who mistyped their
  // address sat waiting for a mail that could never arrive, and the outbox
  // carried the failure instead. Rejecting it here says what is actually wrong.
  if (!EMAIL_PATTERN.test(lowercaseEmail)) {
    throw new ApiError(400, 'That does not look like a valid email address.');
  }

  const otpValue = await createOtp(lowercaseEmail, 'email');

  await sendOtpEmail(lowercaseEmail, otpValue);

  res.status(200).json(new ApiResponse(200, null, 'OTP sent successfully to your email.'));
});

/**
 * Verifies email OTP. Creates user if new. Generates tokens and creates a session.
 */
export const verifyEmailOtp = asyncHandler(async (req: Request, res: Response) => {
  const { email, otp } = req.body;

  if (!email || !otp) {
    throw new ApiError(400, 'Email and OTP are required');
  }

  const lowercaseEmail = email.toLowerCase().trim();
  const isOtpValid = await verifyOtp(lowercaseEmail, 'email', otp);

  if (!isOtpValid) {
    throw new ApiError(400, 'Invalid or expired OTP');
  }

  // Find or Create User
  let user = await User.findOne({ email: lowercaseEmail });

  if (!user) {
    user = await User.create({
      email: lowercaseEmail,
      isEmailVerified: true,
      isOnboardingComplete: false,
    });
  } else if (!user.isEmailVerified) {
    user.isEmailVerified = true;
    await user.save();
  }

  // A correct OTP proves who someone is, not that they are still allowed in.
  // The `auth` middleware already turns suspended accounts away on every
  // request, but without this a suspended user could simply log in again and
  // collect a brand-new token — so the check has to live at the door too.
  if (!user.isActive) {
    throw new ApiError(403, 'This account has been suspended. Please contact support.');
  }

  // Recorded here rather than by the activity middleware, for the same reason as
  // the admin login: `auth` cannot run on the login route, so the middleware
  // only ever sees an anonymous request. "Who signed in, and from where" is one
  // of the more useful rows in the log, so it needs a name on it.
  recordActivity({
    actorType: 'user',
    actorId: user._id.toString(),
    actorName: [user.firstName, user.lastName].filter(Boolean).join(' ').trim() || user.email,
    actorEmail: user.email,
    action: 'user.login',
    summary: 'Signed in',
    method: req.method,
    path: '/auth/verify-otp',
    statusCode: 200,
    success: true,
    ipAddress: req.ip,
    userAgent: req.headers['user-agent'],
  });

  // Device Info & IP Logic (Minimal fallback if undefined)
  const deviceInfo = req.headers['user-agent'] || 'unknown device';
  const ipAddress = req.ip || req.connection.remoteAddress || 'unknown ip';

  // Issue tokens
  // Create a placeholder session ID to satisfy token payload structure
  const dummySessionId = new mongoose.Types.ObjectId().toString();
  const tokens = generateAuthTokens(user._id.toString(), dummySessionId);

  // Commit session to database using the refresh token metadata
  const sessionId = await createSession(
    user._id as mongoose.Types.ObjectId,
    tokens.refresh.token,
    deviceInfo,
    ipAddress,
    tokens.refresh.expires
  );

  // We could regenerate tokens with REAL sessionId, but the token validator will simply match the DB Token for refresh.
  // We'll just generate fresh tokens passing the actual stored session ID for access token exactness.
  const finalTokens = generateAuthTokens(user._id.toString(), sessionId.toString());

  // Invalidate old session in memory, update the one in DB
  // Alternatively, just re-issue tokens:
  await createSession(
    user._id as mongoose.Types.ObjectId,
    finalTokens.refresh.token,
    deviceInfo,
    ipAddress,
    finalTokens.refresh.expires
  );

  res.status(200).json(
    new ApiResponse(200, {
      user: {
        id: user._id,
        email: user.email,
        isOnboardingComplete: user.isOnboardingComplete,
        role: user.role,
        firstName: user.firstName,
        lastName: user.lastName,
        referralCode: user.referralCode,
      },
      tokens: finalTokens,
    }, 'Authentication successful')
  );
});

/**
 * Who is this token for?
 *
 * The client stores its user in localStorage, which survives anything that
 * happens server-side — a deleted account, a suspension, a wiped database. It
 * calls this on boot to find out whether that stored session still means
 * anything, and signs the person out when it does not. The `auth` middleware
 * has already rejected tokens whose account is gone or suspended, so reaching
 * the handler at all means the session is good.
 */
export const getMe = asyncHandler(async (req: Request, res: Response) => {
  const user = await User.findById(req.user?.userId).select(
    'email isOnboardingComplete role firstName lastName referralCode'
  );

  if (!user) throw new ApiError(401, 'This account no longer exists');

  res.status(200).json(
    new ApiResponse(200, {
      id: user._id,
      email: user.email,
      isOnboardingComplete: user.isOnboardingComplete,
      role: user.role,
      firstName: user.firstName,
      lastName: user.lastName,
      referralCode: user.referralCode,
    }, 'Session is valid')
  );
});
