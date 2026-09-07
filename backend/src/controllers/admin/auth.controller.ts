import { Request, Response } from 'express';
import bcrypt from 'bcryptjs';
import jwt from 'jsonwebtoken';
import { Admin, IAdmin } from '../../models/Admin.model';
import { generateAuthTokens } from '../../services/token.service';
import { createOtp, verifyOtp } from '../../services/otp.service';
import { notifyAdminLoginOtp } from '../../services/email/notifications';
import { env } from '../../config/env';
import { ApiResponse } from '../../utils/ApiResponse';
import { ApiError } from '../../utils/ApiError';
import { asyncHandler } from '../../utils/asyncHandler';
import { recordActivity } from '../../services/activity.service';

/**
 * Admin sign-in, in two factors.
 *
 * 1. `POST /login` — the password. On success **no access token is issued**;
 *    a one-time code goes to the account's own address and the caller gets a
 *    short-lived *challenge* token that proves only "this password was right".
 * 2. `POST /verify-otp` — the code, presented with that challenge token.
 *
 * The second step is the one that mints real credentials. Splitting it this way
 * means a stolen password alone opens nothing, and it means step two cannot be
 * attacked on its own: without a challenge token there is no account to verify
 * a code against.
 *
 * If the account still carries `mustChangePassword`, step two returns a
 * *reset* ticket instead of tokens and the dashboard stays shut until
 * `POST /set-password` succeeds.
 */

/** Codes are namespaced so an admin code cannot destroy a student's login code
 *  for the same address — `createOtp` clears prior codes per identifier. */
const otpKey = (email: string) => `admin:${email}`;

const CHALLENGE_MINUTES = 10;
const RESET_MINUTES = 10;

type ChallengePurpose = 'admin-2fa' | 'admin-set-password';

interface ChallengeClaims {
  adminId: string;
  purpose: ChallengePurpose;
}

/**
 * Signed with the refresh secret rather than the access secret, so a challenge
 * token can never be mistaken for an access token by `adminAuth` — the two
 * verify against different keys.
 */
function mintChallenge(adminId: string, purpose: ChallengePurpose, minutes: number): string {
  return jwt.sign({ adminId, purpose } as ChallengeClaims, env.JWT_REFRESH_SECRET, {
    expiresIn: `${minutes}m`,
  });
}

async function readChallenge(token: unknown, purpose: ChallengePurpose): Promise<IAdmin> {
  if (!token || typeof token !== 'string') {
    throw new ApiError(400, 'Start again from the sign-in screen.');
  }

  let claims: ChallengeClaims;
  try {
    claims = jwt.verify(token, env.JWT_REFRESH_SECRET) as ChallengeClaims;
  } catch {
    throw new ApiError(401, 'That took too long. Please enter your password again.');
  }

  if (claims.purpose !== purpose) {
    throw new ApiError(401, 'Start again from the sign-in screen.');
  }

  const admin = await Admin.findById(claims.adminId);
  if (!admin || !admin.isActive) {
    throw new ApiError(401, 'This account can no longer sign in.');
  }
  return admin;
}

/** Issues the real credentials and records the completed sign-in. */
function completeSignIn(req: Request, res: Response, admin: IAdmin, note: string) {
  const tokens = generateAuthTokens(admin._id.toString(), 'admin_session');

  // Recorded here rather than by the activity middleware: `adminAuth` cannot run
  // on the login routes themselves, so the middleware only ever sees an
  // anonymous request — and "which admin signed in, and from where" is precisely
  // the row an audit wants. Failed attempts are still captured generically
  // upstream.
  recordActivity({
    actorType: 'admin',
    actorId: admin._id.toString(),
    actorName: admin.fullName?.trim() || admin.email,
    actorEmail: admin.email,
    action: 'admin.login',
    summary: note,
    method: req.method,
    path: req.originalUrl.split('?')[0].replace(/^\/api\/v1/, ''),
    statusCode: 200,
    success: true,
    ipAddress: req.ip,
    userAgent: req.headers['user-agent'],
  });

  res.status(200).json(
    new ApiResponse(200, {
      stage: 'done',
      admin: {
        id: admin._id,
        email: admin.email,
        fullName: admin.fullName,
        role: 'admin',
      },
      tokens,
    }, 'Admin login successful')
  );
}

/** Mints a code, mails it, and hands back the challenge token. */
async function startChallenge(req: Request, res: Response, admin: IAdmin, message: string) {
  const code = await createOtp(otpKey(admin.email), 'email');
  await notifyAdminLoginOtp(admin.email, admin.fullName, code, req.ip);

  recordActivity({
    actorType: 'admin',
    actorId: admin._id.toString(),
    actorName: admin.fullName?.trim() || admin.email,
    actorEmail: admin.email,
    action: 'admin.login_challenge',
    summary: 'Password accepted — a sign-in code was emailed',
    method: req.method,
    path: req.originalUrl.split('?')[0].replace(/^\/api\/v1/, ''),
    statusCode: 200,
    success: true,
    ipAddress: req.ip,
    userAgent: req.headers['user-agent'],
  });

  res.status(200).json(
    new ApiResponse(200, {
      stage: 'otp',
      challengeToken: mintChallenge(admin._id.toString(), 'admin-2fa', CHALLENGE_MINUTES),
      // Shown back so the person knows which inbox to open, without printing an
      // address they have not already proved they control.
      sentTo: maskEmail(admin.email),
      expiryMinutes: env.OTP_EXPIRY_MINUTES,
    }, message)
  );
}

/** `astha@medconnectsoverseas.com` → `as•••@medconnectsoverseas.com` */
function maskEmail(email: string): string {
  const [local, domain] = email.split('@');
  if (!domain) return email;
  const head = local.slice(0, 2);
  return `${head}${'•'.repeat(Math.max(3, local.length - 2))}@${domain}`;
}

/* ── Step 1 — the password ───────────────────────────────────────────────── */

export const adminLogin = asyncHandler(async (req: Request, res: Response) => {
  const { email, password } = req.body;

  if (!email || !password) {
    throw new ApiError(400, 'Email and password are required');
  }

  const lowercaseEmail = String(email).toLowerCase().trim();
  const admin = await Admin.findOne({ email: lowercaseEmail });

  // One message for "no such account", "deactivated" and "wrong password", so
  // the response cannot be used to find out which addresses are admins.
  if (!admin || !admin.isActive) {
    throw new ApiError(401, 'Invalid credentials');
  }

  const isPasswordMatch = await bcrypt.compare(password, admin.password);
  if (!isPasswordMatch) {
    throw new ApiError(401, 'Invalid credentials');
  }

  await startChallenge(req, res, admin, 'Password accepted — check your email for the code.');
});

/* ── Step 2 — the emailed code ───────────────────────────────────────────── */

export const adminVerifyOtp = asyncHandler(async (req: Request, res: Response) => {
  const { challengeToken, otp } = req.body;
  const admin = await readChallenge(challengeToken, 'admin-2fa');

  const code = String(otp ?? '').trim();
  if (!code) throw new ApiError(400, 'Enter the code from your email.');

  const ok = await verifyOtp(otpKey(admin.email), 'email', code);
  if (!ok) {
    throw new ApiError(401, 'That code is wrong or has expired.');
  }

  admin.lastLogin = new Date();
  await admin.save();

  // A first sign-in on a password somebody else chose gets no further than
  // here: it is handed a reset ticket instead of credentials.
  if (admin.mustChangePassword) {
    res.status(200).json(
      new ApiResponse(200, {
        stage: 'set-password',
        resetToken: mintChallenge(admin._id.toString(), 'admin-set-password', RESET_MINUTES),
        fullName: admin.fullName,
      }, 'Choose a password of your own to finish setting up this account.')
    );
    return;
  }

  completeSignIn(req, res, admin, 'Signed in to the admin area');
});

/** Sends a fresh code for a challenge already in progress. */
export const adminResendOtp = asyncHandler(async (req: Request, res: Response) => {
  const admin = await readChallenge(req.body?.challengeToken, 'admin-2fa');
  await startChallenge(req, res, admin, 'A new code is on its way.');
});

/* ── First sign-in — the account's own password ──────────────────────────── */

export const adminSetPassword = asyncHandler(async (req: Request, res: Response) => {
  const admin = await readChallenge(req.body?.resetToken, 'admin-set-password');
  const newPassword = String(req.body?.newPassword ?? '');

  assertPasswordIsStrong(newPassword);

  // Refusing the handover password outright: the whole point of this step is
  // that the person who created the account stops knowing the password.
  if (await bcrypt.compare(newPassword, admin.password)) {
    throw new ApiError(400, 'Choose a password different from the one you were given.');
  }

  admin.password = await bcrypt.hash(newPassword, 10);
  admin.mustChangePassword = false;
  admin.passwordChangedAt = new Date();
  await admin.save();

  completeSignIn(req, res, admin, 'Set their own password and signed in for the first time');
});

/** Changing your own password while signed in. */
export const adminChangePassword = asyncHandler(async (req: Request, res: Response) => {
  const admin = await Admin.findById(req.admin?.id);
  if (!admin) throw new ApiError(401, 'Sign in again.');

  const current = String(req.body?.currentPassword ?? '');
  const newPassword = String(req.body?.newPassword ?? '');

  if (!(await bcrypt.compare(current, admin.password))) {
    throw new ApiError(401, 'That is not your current password.');
  }

  assertPasswordIsStrong(newPassword);
  if (await bcrypt.compare(newPassword, admin.password)) {
    throw new ApiError(400, 'That is the password you already have.');
  }

  admin.password = await bcrypt.hash(newPassword, 10);
  admin.mustChangePassword = false;
  admin.passwordChangedAt = new Date();
  await admin.save();

  res.status(200).json(new ApiResponse(200, null, 'Password changed.'));
});

/**
 * The schema requires 12 characters; this says so *before* the write, so the
 * person gets a sentence rather than a Mongoose validation error.
 */
export function assertPasswordIsStrong(password: string): void {
  if (password.length < 12) {
    throw new ApiError(400, 'Use at least 12 characters — this account can change the whole site.');
  }
  if (!/[a-zA-Z]/.test(password) || !/[0-9]/.test(password)) {
    throw new ApiError(400, 'Include at least one letter and one number.');
  }
}
