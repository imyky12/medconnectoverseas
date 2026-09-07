import { Request, Response } from 'express';
import bcrypt from 'bcryptjs';
import { Admin } from '../../models/Admin.model';
import { ApiResponse } from '../../utils/ApiResponse';
import { ApiError } from '../../utils/ApiError';
import { asyncHandler } from '../../utils/asyncHandler';
import { assertPasswordIsStrong } from './auth.controller';

/**
 * Managing the people who can administer the site.
 *
 * Every administrator here can add another — there are no tiers. That is a
 * deliberate choice for a team this size: a permission hierarchy nobody
 * maintains ends up with everyone in the top tier anyway, and the activity log
 * already answers "who did this" for every action.
 *
 * Two rules stop the screen from locking everybody out:
 * you cannot deactivate yourself, and the last active account cannot be
 * deactivated.
 */

const PUBLIC_FIELDS = 'email fullName isActive lastLogin mustChangePassword passwordChangedAt createdByName createdAt';

export const listAdmins = asyncHandler(async (_req: Request, res: Response) => {
  const admins = await Admin.find().select(PUBLIC_FIELDS).sort({ createdAt: 1 }).lean();
  res.status(200).json(new ApiResponse(200, admins, 'Administrators fetched'));
});

/**
 * Creates an account with a password the *creating* admin chooses and passes on
 * however they like — in person, over the phone, whatever they trust.
 *
 * The password is deliberately not emailed. An emailed password sits in two
 * mailboxes forever, and the account's own mailbox is the second factor for
 * signing in: putting the first factor in there too collapses the two into one.
 *
 * `mustChangePassword` means the handover password stops working the moment it
 * has been used once.
 */
export const createAdmin = asyncHandler(async (req: Request, res: Response) => {
  const email = String(req.body?.email ?? '').toLowerCase().trim();
  const fullName = String(req.body?.fullName ?? '').trim();
  const password = String(req.body?.password ?? '');

  if (!email || !/^[^@\s]+@[^@\s]+\.[^@\s]+$/.test(email)) {
    throw new ApiError(400, 'Enter a valid email address — the sign-in code is sent there.');
  }
  if (!fullName) {
    throw new ApiError(400, 'Enter their name — it is what the activity log will show.');
  }
  assertPasswordIsStrong(password);

  if (await Admin.exists({ email })) {
    throw new ApiError(409, 'There is already an administrator with that address.');
  }

  const admin = await Admin.create({
    email,
    fullName,
    password: await bcrypt.hash(password, 10),
    isActive: true,
    mustChangePassword: true,
    createdByName: req.admin?.name,
  });

  res.status(201).json(
    new ApiResponse(201, {
      _id: admin._id,
      email: admin.email,
      fullName: admin.fullName,
      isActive: admin.isActive,
      mustChangePassword: admin.mustChangePassword,
      createdByName: admin.createdByName,
      createdAt: admin.createdAt,
    }, `${fullName} can now sign in. Give them the password you just set — they will be asked to replace it.`)
  );
});

/** Turns access on or off. Kept reversible: deleting would orphan the audit trail. */
export const setAdminActive = asyncHandler(async (req: Request, res: Response) => {
  const admin = await Admin.findById(req.params.id);
  if (!admin) throw new ApiError(404, 'That administrator no longer exists.');

  const isActive = Boolean(req.body?.isActive);

  if (!isActive) {
    if (admin._id.toString() === req.admin?.id) {
      throw new ApiError(400, 'You cannot switch off your own access.');
    }
    const activeCount = await Admin.countDocuments({ isActive: true });
    if (activeCount <= 1) {
      throw new ApiError(400, 'This is the only active administrator — there would be no way back in.');
    }
  }

  admin.isActive = isActive;
  await admin.save();

  res.status(200).json(
    new ApiResponse(200, { _id: admin._id, isActive: admin.isActive },
      isActive ? `${admin.fullName} can sign in again.` : `${admin.fullName} can no longer sign in.`)
  );
});

/**
 * Hands an account a new temporary password — for somebody locked out.
 *
 * Same shape as creating one: the new password is chosen here, passed on out of
 * band, and replaced by its owner at the next sign-in.
 */
export const resetAdminPassword = asyncHandler(async (req: Request, res: Response) => {
  const admin = await Admin.findById(req.params.id);
  if (!admin) throw new ApiError(404, 'That administrator no longer exists.');

  if (admin._id.toString() === req.admin?.id) {
    throw new ApiError(400, 'Change your own password from the password box instead.');
  }

  const password = String(req.body?.password ?? '');
  assertPasswordIsStrong(password);

  admin.password = await bcrypt.hash(password, 10);
  admin.mustChangePassword = true;
  await admin.save();

  res.status(200).json(
    new ApiResponse(200, null,
      `Give ${admin.fullName} the password you just set — they will be asked to replace it when they sign in.`)
  );
});
