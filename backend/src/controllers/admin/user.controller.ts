import { Request, Response } from 'express';
import { asyncHandler } from '../../utils/asyncHandler';
import { ApiResponse } from '../../utils/ApiResponse';
import { User } from '../../models/User.model';
import { ApiError } from '../../utils/ApiError';
import {
  notifyAccountSuspended,
  notifyAccountReactivated,
} from '../../services/email/notifications';

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

  // Fire-and-forget: the status change is already committed.
  if (user.isActive) {
    void notifyAccountReactivated(user);
  } else {
    void notifyAccountSuspended(user, typeof reason === 'string' ? reason.trim() : undefined);
  }

  res.status(200).json(new ApiResponse(200, user, `User status updated to ${user.isActive ? 'Active' : 'Suspended'}`));
});
