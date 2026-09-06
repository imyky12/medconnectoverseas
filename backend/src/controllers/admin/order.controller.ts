import { Request, Response } from 'express';
import { v4 as uuidv4 } from 'uuid';
import QRCode from 'qrcode';
import { asyncHandler } from '../../utils/asyncHandler';
import { ApiResponse } from '../../utils/ApiResponse';
import { ApiError } from '../../utils/ApiError';
import { Order } from '../../models/Order.model';
import { Course } from '../../models/Course.model';
import { Event } from '../../models/Event.model';
import { EventRegistration } from '../../models/EventRegistration.model';
import { Coupon } from '../../models/Coupon.model';
import { notifyOrderStatusChange } from '../../services/email/notifications';
import { completeReferralOnFirstPurchase } from '../../services/referral.service';

/** Title of whatever the order was for — used in the referral reward email. */
async function resolveItemTitle(order: { orderType: string; course?: unknown; event?: unknown }): Promise<string> {
  if (order.orderType === 'event') {
    const ev = await Event.findById(order.event).select('title').lean();
    return ev?.title ?? 'an event';
  }
  const course = await Course.findById(order.course).select('title').lean();
  return course?.title ?? 'a course';
}

export const getAllOrders = asyncHandler(async (req: Request, res: Response) => {
  const { status } = req.query;
  const filter = status ? { status } : {};

  const orders = await Order.find(filter)
    .populate('user', 'firstName lastName email mobile')
    .populate('course', 'title price thumbnail')
    .populate('event', 'title eventCode bannerUrl slots')
    .sort({ createdAt: -1 });

  res.status(200).json(
    new ApiResponse(200, orders, 'Orders fetched successfully')
  );
});

export const updateOrderStatus = asyncHandler(async (req: Request, res: Response) => {
  const { id } = req.params;
  const { status, rejectionReason } = req.body;

  if (!['approved', 'rejected'].includes(status)) {
    throw new ApiError(400, "Invalid status. Use 'approved' or 'rejected'.");
  }

  const order = await Order.findById(id);
  if (!order) throw new ApiError(404, 'Order not found');

  if (order.status !== 'pending') {
    throw new ApiError(400, `Order is already ${order.status}`);
  }

  order.status = status;
  if (status === 'rejected') {
    if (!rejectionReason?.trim()) {
      throw new ApiError(400, 'Rejection reason is required');
    }
    order.rejectionReason = rejectionReason.trim();
  }

  // Captured for the confirmation email — the QR is sent as an inline
  // attachment, since Gmail strips data: image sources.
  let qrDataUrl: string | undefined;
  let registrationId: string | undefined;

  if (status === 'approved') {
    if (order.orderType === 'event') {
      // ── Event order approval ──────────────────────────────────────────────
      // Generate QR token + image and store on EventRegistration
      const qrToken = uuidv4();
      const qrCodeImage = await QRCode.toDataURL(qrToken, {
        errorCorrectionLevel: 'H',
        margin: 2,
        width: 300,
      });

      const registration = await EventRegistration.findOneAndUpdate(
        { order: order._id },
        { status: 'approved', qrToken, qrCodeImage },
        { new: true },
      );

      qrDataUrl = qrCodeImage;
      registrationId = registration?._id?.toString();

      // Increment bookedSeats on the relevant slot + event totalRegistrations
      await Event.updateOne(
        { _id: order.event, 'slots.slotId': order.slotId },
        { $inc: { 'slots.$.bookedSeats': 1, totalRegistrations: 1 } }
      );

      // Increment coupon usedCount if one was applied
      if (order.coupon) {
        await Coupon.findByIdAndUpdate(order.coupon, { $inc: { usedCount: 1 } });
      }
    } else {
      // ── Course order approval ─────────────────────────────────────────────
      await Course.findByIdAndUpdate(order.course, { $inc: { totalEnrollments: 1 } });
      if (order.coupon) {
        await Coupon.findByIdAndUpdate(order.coupon, { $inc: { usedCount: 1 } });
      }
    }
  }

  if (status === 'rejected' && order.orderType === 'event') {
    // Sync rejection status to EventRegistration
    await EventRegistration.findOneAndUpdate(
      { order: order._id },
      { status: 'rejected' }
    );
  }

  await order.save();

  // After the save, so the email always reflects committed state. Fire-and-forget
  // and self-catching — a mail failure must not turn an approval into a 500.
  void notifyOrderStatusChange(order.id, qrDataUrl, registrationId);

  // First approved purchase by a referred user unlocks the referrer's reward.
  // No-op for everyone else; self-catching.
  if (status === 'approved') {
    const item = await resolveItemTitle(order);
    void completeReferralOnFirstPurchase(order.user, item);
  }

  res.status(200).json(
    new ApiResponse(200, order, `Order successfully ${status}`)
  );
});
