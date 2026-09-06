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

/**
 * Is this referral code real, and whose is it?
 *
 * Onboarding used to accept any string and show "Code applied" for all of them,
 * resolving the code only at final submit and dropping it in silence when it did
 * not match. A real code and a nonsense one looked identical on screen, so a user
 * had no way to tell whether their friend had actually been credited.
 *
 * The response names the referrer — by first name and a last initial, never the
 * full name or email — because seeing "Referred by Yash K." is what turns
 * "something was accepted" into "the right code was accepted".
 */
export const validateReferralCode = asyncHandler(async (req: Request, res: Response) => {
  const code = String(req.params.code ?? '').trim().toUpperCase();

  if (!code) {
    throw new ApiError(400, 'A referral code is required');
  }

  const referrer = await User.findOne({ referralCode: code }).select('firstName lastName');

  if (!referrer) {
    res.status(200).json(
      new ApiResponse(200, { valid: false, code, reason: 'We could not find that code.' }, 'Referral code checked')
    );
    return;
  }

  // Your own code is a real code, so it must not report as invalid — but it
  // cannot be applied either, and saying so plainly is clearer than silence.
  if (referrer._id.toString() === req.user?.userId) {
    res.status(200).json(
      new ApiResponse(200, { valid: false, code, reason: 'That is your own code — you cannot refer yourself.' }, 'Referral code checked')
    );
    return;
  }

  const initial = referrer.lastName ? `${referrer.lastName.trim().charAt(0).toUpperCase()}.` : '';
  const referrerName = [referrer.firstName, initial].filter(Boolean).join(' ').trim() || 'a MedConnects member';

  res.status(200).json(
    new ApiResponse(200, { valid: true, code, referrerName }, 'Referral code checked')
  );
});
