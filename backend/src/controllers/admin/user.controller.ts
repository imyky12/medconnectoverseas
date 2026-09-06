import { Request, Response } from 'express';
import { asyncHandler } from '../../utils/asyncHandler';
import { ApiResponse } from '../../utils/ApiResponse';
import { User } from '../../models/User.model';
import { ApiError } from '../../utils/ApiError';
import mongoose from 'mongoose';
import {
  notifyAccountSuspended,
  notifyAccountReactivated,
} from '../../services/email/notifications';
import { invalidateAllSessionsForUser } from '../../services/session.service';

export const getAllUsers = asyncHandler(async (req: Request, res: Response) => {
  const users = await User.find().select('-password').sort({ createdAt: -1 });
  res.status(200).json(new ApiResponse(200, users, 'Users fetched'));
});

export const toggleUserStatus = asyncHandler(async (req: Request, res: Response) => {
  const { id } = req.params;
  // Optional — shown to the user in the suspension email so they know why.
  const { reason } = req.body ?? {};

  const user = await User.findById(id);
  if (!user) throw new ApiError(404, 'User not found');

  user.isActive = !user.isActive;
  await user.save();

  // Suspension has to actually end the sessions, not just set a flag. The
  // `auth` middleware already turns a suspended account away on every request,
  // so access stops either way — but leaving live session rows behind means a
  // reactivated account silently resumes sessions the admin thought were over.
  let endedSessions = 0;
  if (!user.isActive) {
    endedSessions = await invalidateAllSessionsForUser(user._id as mongoose.Types.ObjectId);
  }

  // Fire-and-forget: the status change is already committed.
  if (user.isActive) {
    void notifyAccountReactivated(user);
  } else {
    void notifyAccountSuspended(user, typeof reason === 'string' ? reason.trim() : undefined);
  }

  res.status(200).json(
    new ApiResponse(
      200,
      { user, endedSessions },
      `User status updated to ${user.isActive ? 'Active' : 'Suspended'}`
    )
  );
});
