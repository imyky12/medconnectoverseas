import mongoose from 'mongoose';
import { env } from '../config/env';
import { Referral } from '../models/Referral.model';
import { User, IUser } from '../models/User.model';
import { Coupon } from '../models/Coupon.model';
import { notifyReferralConverted } from './email/notifications';

/**
 * Referral reward issuance.
 *
 * The Referral model already carried `status: 'completed'` and `rewardGiven`,
 * but nothing ever set them. This closes that loop: when a referred user's
 * first order is approved, the referrer gets a personal discount coupon and the
 * `referral-converted` email — which names a real, redeemable code rather than
 * promising a reward that does not exist.
 */

/** Personal, single-use, locked to the referrer's email address. */
async function issueRewardCoupon(referrer: IUser): Promise<{ code: string; value: number }> {
  const value = env.REFERRAL_REWARD_AMOUNT;
  const suffix = new mongoose.Types.ObjectId().toString().slice(-5).toUpperCase();
  const code = `REF${referrer.referralCode}${suffix}`;

  const validUntil = new Date();
  validUntil.setDate(validUntil.getDate() + env.REFERRAL_REWARD_VALIDITY_DAYS);

  await Coupon.create({
    code,
    type: 'fixed',
    value,
    maxUses: 1,
    usesPerUser: 1,
    validFrom: new Date(),
    validUntil,
    isActive: true,
    appliesTo: 'both',
    // Locks redemption to the referrer, so the code is worthless if shared.
    allowedEmails: [referrer.email.toLowerCase()],
  });

  return { code, value };
}

/**
 * Called after an order is approved. Does nothing unless the buyer was referred
 * and their referral is still pending, so only the FIRST approved purchase
 * triggers a reward.
 *
 * Never throws — a reward problem must not fail an order approval.
 */
export async function completeReferralOnFirstPurchase(
  buyerId: mongoose.Types.ObjectId | string,
  itemTitle: string
): Promise<void> {
  try {
    // `status: 'pending'` is the guard: once completed, later orders are no-ops.
    const referral = await Referral.findOne({ referredId: buyerId, status: 'pending' });
    if (!referral) return;

    const [referrer, buyer] = await Promise.all([
      User.findById(referral.referrerId).select('firstName lastName email referralCode'),
      User.findById(buyerId).select('firstName lastName'),
    ]);
    if (!referrer?.email) return;

    // Claim the referral before issuing anything, so two orders approved at the
    // same moment cannot both mint a coupon.
    const claimed = await Referral.findOneAndUpdate(
      { _id: referral._id, status: 'pending' },
      { $set: { status: 'completed' } },
      { new: true }
    );
    if (!claimed) return;

    const reward = await issueRewardCoupon(referrer);
    claimed.rewardGiven = true;
    await claimed.save();

    const referredName =
      [buyer?.firstName, buyer?.lastName].filter(Boolean).join(' ').trim() || 'Someone you referred';

    await notifyReferralConverted(
      referrer,
      referredName,
      itemTitle,
      reward.code,
      reward.value,
      claimed._id
    );

    console.log(
      `[referral] ${referrer.email} rewarded ${reward.code} (₹${reward.value}) for referring ${referredName}`
    );
  } catch (err) {
    console.error(`[referral] reward failed for buyer ${buyerId}:`, err);
  }
}
