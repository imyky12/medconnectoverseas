import { Request, Response } from 'express';
import { asyncHandler } from '../../utils/asyncHandler';
import { ApiResponse } from '../../utils/ApiResponse';
import { User } from '../../models/User.model';
import { Course } from '../../models/Course.model';
import { Coupon } from '../../models/Coupon.model';
import { Order } from '../../models/Order.model';

export const getDashboardStats = asyncHandler(async (req: Request, res: Response) => {
  const [totalUsers, activeCourses, activeCoupons, approvedOrders] = await Promise.all([
    User.countDocuments(),
    Course.countDocuments({ isPublished: true }),
    Coupon.countDocuments({ isActive: true, validUntil: { $gte: new Date() } }),
    Order.find({ status: 'approved' })
  ]);

  const totalRevenue = approvedOrders.reduce((sum, order) => sum + order.finalPrice, 0);

  res.status(200).json(
    new ApiResponse(200, {
      totalUsers,
      activeCourses,
      activeCoupons,
      totalRevenue
    }, 'Dashboard stats fetched successfully')
  );
});
