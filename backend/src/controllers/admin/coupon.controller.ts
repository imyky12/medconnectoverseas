import { Request, Response } from 'express';
import { asyncHandler } from '../../utils/asyncHandler';
import { ApiResponse } from '../../utils/ApiResponse';
import { Coupon } from '../../models/Coupon.model';
import { Order } from '../../models/Order.model';
import { ApiError } from '../../utils/ApiError';
import { Course } from '../../models/Course.model';
import { Event } from '../../models/Event.model';
import { EventRegistration } from '../../models/EventRegistration.model';

export const getAllCoupons = asyncHandler(async (_req: Request, res: Response) => {
  const coupons = await Coupon.find()
    .populate('applicableCourses', 'title courseCode')
    .populate('applicableEvents', 'title eventCode')
    .sort({ createdAt: -1 })
    .lean();

  // Attach claim histories from both course orders and event registrations
  for (let i = 0; i < coupons.length; i++) {
    const couponId = coupons[i]._id;

    const courseOrders = await Order.find({ coupon: couponId, status: 'approved' })
      .populate('user', 'firstName lastName email')
      .select('user createdAt');

    const eventRegs = await EventRegistration.find({ coupon: couponId, status: 'approved' })
      .populate('user', 'firstName lastName email')
      .select('user createdAt');

    (coupons[i] as any).claimHistories = [
      ...courseOrders.map((o) => ({ user: o.user, claimedAt: o.createdAt, source: 'course' })),
      ...eventRegs.map((r) => ({ user: r.user, claimedAt: r.createdAt, source: 'event' })),
    ];
  }

  res.status(200).json(new ApiResponse(200, coupons, 'Coupons fetched'));
});

export const createCoupon = asyncHandler(async (req: Request, res: Response) => {
  const couponData = { ...req.body };
  const appliesTo: string = couponData.appliesTo ?? 'course';

  // Resolve course codes → ObjectIds
  if (
    (appliesTo === 'course' || appliesTo === 'both') &&
    couponData.applicableCourseCodes?.length > 0
  ) {
    const courses = await Course.find({ courseCode: { $in: couponData.applicableCourseCodes } });
    if (courses.length !== couponData.applicableCourseCodes.length) {
      throw new ApiError(400, 'One or more course codes are invalid');
    }
    couponData.applicableCourses = courses.map((c) => c._id);
  }
  delete couponData.applicableCourseCodes;

  // Resolve event codes → ObjectIds
  if (
    (appliesTo === 'event' || appliesTo === 'both') &&
    couponData.applicableEventCodes?.length > 0
  ) {
    const events = await Event.find({ eventCode: { $in: couponData.applicableEventCodes } });
    if (events.length !== couponData.applicableEventCodes.length) {
      throw new ApiError(400, 'One or more event codes are invalid');
    }
    couponData.applicableEvents = events.map((e) => e._id);
  }
  delete couponData.applicableEventCodes;

  const coupon = await Coupon.create(couponData);
  res.status(201).json(new ApiResponse(201, coupon, 'Coupon created successfully'));
});

export const deleteCoupon = asyncHandler(async (req: Request, res: Response) => {
  const { id } = req.params;
  const coupon = await Coupon.findByIdAndDelete(id);
  if (!coupon) throw new ApiError(404, 'Coupon not found');
  res.status(200).json(new ApiResponse(200, null, 'Coupon deleted successfully'));
});
