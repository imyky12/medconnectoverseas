import { Request, Response } from 'express';
import { asyncHandler } from '../../utils/asyncHandler';
import { ApiResponse } from '../../utils/ApiResponse';
import { User } from '../../models/User.model';
import { Course } from '../../models/Course.model';
import { Coupon } from '../../models/Coupon.model';
import { Order } from '../../models/Order.model';

/**
 * The four figures on the admin overview.
 *
 * Each one has to mean exactly what its label on the dashboard claims, because
 * nobody cross-checks a number that looks plausible. Two of them did not:
 *
 *  - "Students · completed sign-up" counted every `User` row, and a row is
 *    created the moment someone asks for a login code. Everyone who typed an
 *    email and never finished onboarding was being counted as a student, and
 *    the gap only ever grows.
 *  - "Coupons live · currently redeemable" ignored `maxUses`, so a coupon that
 *    had already been claimed to its limit still counted as redeemable.
 */
export const getDashboardStats = asyncHandler(async (_req: Request, res: Response) => {
  const now = new Date();

  const [totalUsers, activeCourses, activeCoupons, revenue] = await Promise.all([
    // A student is someone who finished onboarding. Suspended accounts stay in
    // the count — they are still students, just blocked — so the number does
    // not silently drop when an admin suspends someone.
    User.countDocuments({ isOnboardingComplete: true }),

    Course.countDocuments({ isPublished: true }),

    // Redeemable means all three: switched on, inside its window, and with uses
    // left. `$expr` is what lets one field be compared against another.
    Coupon.countDocuments({
      isActive: true,
      validUntil: { $gte: now },
      $expr: { $lt: ['$usedCount', '$maxUses'] },
    }),

    // Summed in the database rather than by loading every approved order into
    // memory and reducing over it — that grew with revenue, which is the one
    // number guaranteed to grow.
    Order.aggregate<{ _id: null; total: number }>([
      { $match: { status: 'approved' } },
      { $group: { _id: null, total: { $sum: '$finalPrice' } } },
    ]),
  ]);

  res.status(200).json(
    new ApiResponse(200, {
      totalUsers,
      activeCourses,
      activeCoupons,
      totalRevenue: revenue[0]?.total ?? 0,
    }, 'Dashboard stats fetched successfully')
  );
});
