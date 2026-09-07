import { Request, Response } from 'express';
import { asyncHandler } from '../../utils/asyncHandler';
import { ApiResponse } from '../../utils/ApiResponse';
import { Order } from '../../models/Order.model';
import { Course } from '../../models/Course.model';
import { Coupon } from '../../models/Coupon.model';
import { User } from '../../models/User.model';
import { randomUUID } from 'crypto';
import { ApiError } from '../../utils/ApiError';
import { assertPaymentReferenceUnused } from '../../services/payment-reference';
import { notifyCourseOrderSubmitted } from '../../services/email/notifications';

export const getMyOrders = asyncHandler(async (req: Request, res: Response) => {
  const userId = req.user?.userId;
  const orders = await Order.find({ user: userId })
    .populate('course', 'title thumbnail price discountedPrice courseCode')
    .populate('event', 'title bannerUrl eventCode slots price discountedPrice')
    // The payments page explains *why* an amount is what it is, so it needs the
    // list price to compare against and the coupon code to name.
    .populate('coupon', 'code')
    .sort({ createdAt: -1 });
  res.status(200).json(new ApiResponse(200, orders, 'Orders fetched'));
});

/** Shared coupon validation — also used by createOrder */
async function applyCouponToPrice(
  couponCode: string,
  userId: string,
  courseId: string,
  basePrice: number
): Promise<{ finalPrice: number; couponId: any; savingsAmount: number }> {
  const coupon = await Coupon.findOne({ code: couponCode.toUpperCase(), isActive: true });
  if (!coupon) throw new ApiError(400, 'Invalid or inactive coupon code');
  if (new Date() > new Date(coupon.validUntil)) throw new ApiError(400, 'Coupon has expired');
  if (coupon.usedCount >= coupon.maxUses) throw new ApiError(400, 'Coupon usage limit reached');

  // Email whitelist
  if (coupon.allowedEmails && coupon.allowedEmails.length > 0) {
    const user = await User.findById(userId).select('email');
    if (!user || !coupon.allowedEmails.includes(user.email)) {
      throw new ApiError(403, 'This coupon is not available for your account');
    }
  }

  // Course restriction
  if (coupon.applicableCourses && coupon.applicableCourses.length > 0) {
    const applicable = coupon.applicableCourses.some((id) => id.toString() === courseId.toString());
    if (!applicable) throw new ApiError(400, 'This coupon is not valid for the selected course');
  }

  // Category restriction
  if (coupon.applicableCategories && coupon.applicableCategories.length > 0) {
    const course = await Course.findById(courseId).select('category');
    if (!course || !coupon.applicableCategories.includes(course.category)) {
      throw new ApiError(400, 'This coupon does not apply to this course category');
    }
  }

  // First-time buyer
  if (coupon.firstTimeUsersOnly) {
    const existingApproved = await Order.findOne({ user: userId, status: 'approved' });
    if (existingApproved) throw new ApiError(400, 'This coupon is only for first-time purchasers');
  }

  // Per-user usage
  if (coupon.usesPerUser) {
    const userUsageCount = await Order.countDocuments({ user: userId, coupon: coupon._id, status: 'approved' });
    if (userUsageCount >= coupon.usesPerUser) {
      throw new ApiError(400, `You can only use this coupon ${coupon.usesPerUser} time(s)`);
    }
  }

  // Min purchase
  if (coupon.minPurchaseAmount && basePrice < coupon.minPurchaseAmount) {
    throw new ApiError(400, `Minimum course price of ₹${coupon.minPurchaseAmount} required for this coupon`);
  }

  // Calculate discount
  let discount = 0;
  if (coupon.type === 'percentage') {
    discount = (basePrice * coupon.value) / 100;
    if (coupon.maxDiscountAmount && discount > coupon.maxDiscountAmount) {
      discount = coupon.maxDiscountAmount;
    }
  } else {
    discount = Math.min(coupon.value, basePrice); // can't discount more than price
  }

  const finalPrice = Math.max(0, basePrice - discount);
  return { finalPrice, couponId: coupon._id, savingsAmount: discount };
}

export const createOrder = asyncHandler(async (req: Request, res: Response) => {
  const userId = req.user?.userId;
  const { courseId, transactionId, screenshotUrl, couponCode } = req.body;

  if (!courseId) {
    throw new ApiError(400, 'Missing required field: courseId');
  }

  // 1. Validate course exists & is published
  const course = await Course.findById(courseId);
  if (!course || !course.isPublished) throw new ApiError(404, 'Course not available');

  // 2. Prevent duplicate orders
  const existingOrder = await Order.findOne({
    user: userId,
    course: courseId,
    status: { $in: ['pending', 'approved'] },
  });
  if (existingOrder) {
    // Worded around the article: "a approved order" was the previous output.
    throw new ApiError(400, `Your order for this course is already ${existingOrder.status}.`);
  }

  let finalPrice = course.discountedPrice ?? course.price;
  let appliedCouponId = null;

  // 3. Apply coupon if provided (with full validation)
  if (couponCode?.trim()) {
    const result = await applyCouponToPrice(couponCode, userId!, courseId, finalPrice);
    finalPrice = result.finalPrice;
    appliedCouponId = result.couponId;

    // `usedCount` is deliberately NOT incremented here. It is claimed
    // atomically at approval instead, together with the limit re-check — see
    // `claimCouponUse` in admin/order.controller. Incrementing at order time as
    // well would double-count every course coupon, and it also charged a use to
    // orders that were later rejected.
  }

  // 4. Payment proof, but only when there is something to pay.
  const isFree = finalPrice <= 0;

  if (!isFree && (!transactionId?.trim() || !screenshotUrl?.trim())) {
    throw new ApiError(400, 'Missing required fields: transactionId, screenshotUrl');
  }
  if (!isFree) {
    await assertPaymentReferenceUnused(transactionId);
  }

  const order = await Order.create({
    user: userId,
    course: courseId,
    coupon: appliedCouponId,
    finalPrice,
    transactionId: isFree ? `FREE-${randomUUID().slice(0, 8).toUpperCase()}` : transactionId.trim(),
    screenshotUrl: isFree ? '' : screenshotUrl.trim(),
    // Nothing to verify on a free enrolment, so access is granted immediately.
    status: isFree ? 'approved' : 'pending',
  });

  if (isFree) {
    await Course.findByIdAndUpdate(courseId, { $inc: { totalEnrollments: 1 } });
  }

  // Receipt to the buyer + alert to admins. Fire-and-forget: enqueue writes an
  // EmailLog row and returns, so a mail problem never fails the order.
  const buyer = await User.findById(userId).select('firstName lastName email mobile countryCode').lean();
  if (buyer) void notifyCourseOrderSubmitted(order, buyer, course);

  res.status(201).json(new ApiResponse(201, order, 'Payment submitted! Awaiting admin verification.'));
});
