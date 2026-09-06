import { Request, Response } from 'express';
import { asyncHandler } from '../../utils/asyncHandler';
import { ApiResponse } from '../../utils/ApiResponse';
import { ApiError } from '../../utils/ApiError';
import { Course } from '../../models/Course.model';
import { Order } from '../../models/Order.model';
import { Coupon } from '../../models/Coupon.model';

export const getMarketplaceCourses = asyncHandler(async (_req: Request, res: Response) => {
  const courses = await Course.find({ isPublished: true })
    .select('-prerequisites -learningOutcomes -courseIncludes')
    .sort({ createdAt: -1 });

  res.status(200).json(new ApiResponse(200, courses, 'Marketplace fetched successfully'));
});

export const getCourseByCode = asyncHandler(async (req: Request, res: Response) => {
  const courseCode = req.params.courseCode as string;
  const course = await Course.findOne({ courseCode: courseCode.toUpperCase(), isPublished: true });
  if (!course) throw new ApiError(404, 'Course not found or not published');
  res.status(200).json(new ApiResponse(200, course, 'Course fetched'));
});

export const getMyCourses = asyncHandler(async (req: Request, res: Response) => {
  const userId = req.user?.userId;

  // Only course orders carry a course. Without the orderType filter an approved
  // EVENT order contributes `undefined` here, and the client receives an array
  // of nulls. The Boolean filter additionally drops courses deleted after
  // purchase, which populate resolves to null.
  const orders = await Order.find({ user: userId, status: 'approved', orderType: 'course' })
    .populate({
      path: 'course',
      select: 'title thumbnail category estimatedDurationHours instructorName courseCode difficulty',
    });

  const enrolledCourses = orders.map((o) => o.course).filter(Boolean);
  res.status(200).json(new ApiResponse(200, enrolledCourses, 'Enrolled courses fetched'));
});

export const validateCoupon = asyncHandler(async (req: Request, res: Response) => {
  const userId = req.user?.userId;
  const { couponCode, courseId } = req.body;

  if (!couponCode || !courseId) throw new ApiError(400, 'couponCode and courseId required');

  const coupon = await Coupon.findOne({ code: couponCode.toUpperCase(), isActive: true });
  if (!coupon) throw new ApiError(400, 'Invalid or inactive coupon code');

  if (new Date() > new Date(coupon.validUntil)) throw new ApiError(400, 'Coupon has expired');
  if (coupon.usedCount >= coupon.maxUses) throw new ApiError(400, 'Coupon usage limit reached');

  // Email restriction
  if (coupon.allowedEmails && coupon.allowedEmails.length > 0) {
    const User = (await import('../../models/User.model')).User;
    const user = await User.findById(userId).select('email');
    if (!user || !coupon.allowedEmails.includes(user.email)) {
      throw new ApiError(403, 'This coupon is not available for your account');
    }
  }

  // Course restriction
  if (coupon.applicableCourses && coupon.applicableCourses.length > 0) {
    const isApplicable = coupon.applicableCourses.some((id) => id.toString() === courseId);
    if (!isApplicable) throw new ApiError(400, 'This coupon is not valid for the selected course');
  }

  // First-time buyer check
  if (coupon.firstTimeUsersOnly) {
    const existingOrder = await Order.findOne({ user: userId, status: 'approved' });
    if (existingOrder) throw new ApiError(400, 'This coupon is only for first-time purchasers');
  }

  // Per-user usage check
  const userUsageCount = await Order.countDocuments({ user: userId, coupon: coupon._id, status: 'approved' });
  if (userUsageCount >= coupon.usesPerUser) {
    throw new ApiError(400, `You can only use this coupon ${coupon.usesPerUser} time(s)`);
  }

  const course = await Course.findById(courseId);
  if (!course) throw new ApiError(404, 'Course not found');

  const basePrice = course.discountedPrice ?? course.price;

  // Min purchase check
  if (coupon.minPurchaseAmount && basePrice < coupon.minPurchaseAmount) {
    throw new ApiError(400, `Minimum course price of ₹${coupon.minPurchaseAmount} required for this coupon`);
  }

  let discount = 0;
  if (coupon.type === 'percentage') {
    discount = (basePrice * coupon.value) / 100;
    if (coupon.maxDiscountAmount && discount > coupon.maxDiscountAmount) {
      discount = coupon.maxDiscountAmount;
    }
  } else {
    discount = coupon.value;
  }

  const finalPrice = Math.max(0, basePrice - discount);

  res.status(200).json(new ApiResponse(200, {
    coupon: { code: coupon.code, type: coupon.type, value: coupon.value },
    originalPrice: basePrice,
    discount,
    finalPrice,
  }, 'Coupon applied successfully'));
});
