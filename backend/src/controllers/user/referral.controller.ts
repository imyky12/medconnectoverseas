import { Request, Response } from 'express';
import { Referral } from '../../models/Referral.model';
import { ApiResponse } from '../../utils/ApiResponse';
import { ApiError } from '../../utils/ApiError';
import { asyncHandler } from '../../utils/asyncHandler';
import { User } from '../../models/User.model';

export const getReferralInfo = asyncHandler(async (req: Request, res: Response) => {
  const userId = req.user?.userId;
  if (!userId) throw new ApiError(401, 'Unauthorized');

  const user = await User.findById(userId).select('referralCode');
  if (!user) throw new ApiError(404, 'User not found');

  const referredCount = await Referral.countDocuments({ referrerId: userId });

  res.status(200).json(
    new ApiResponse(200, { referralCode: user.referralCode, referredCount }, 'Referral info fetched')
  );
});
