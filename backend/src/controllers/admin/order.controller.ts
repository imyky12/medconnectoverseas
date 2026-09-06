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
import { claimSeat, releaseSeat } from '../../services/seat.service';
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

/**
 * Claims one use of a coupon, or refuses.
 *
 * The `$expr` compares two fields of the same document inside the filter, so
 * the check and the increment are a single atomic operation — there is no
 * moment between "is there a use left?" and "take one" for a second approval to
 * slip through. `modifiedCount === 0` means the limit was already reached.
 *
 * `usesPerUser` is counted separately, from orders that actually completed:
 * approved orders are the only ones that consumed anything, so a rejected
 * attempt does not burn somebody's allowance.
 */
async function claimCouponUse(couponId: string, userId: string): Promise<boolean> {
  const coupon = await Coupon.findById(couponId).select('usesPerUser').lean();
  if (!coupon) return true; // deleted since the order was placed — do not block the approval

  if (typeof coupon.usesPerUser === 'number' && coupon.usesPerUser > 0) {
    const alreadyUsed = await Order.countDocuments({
      coupon: couponId,
      user: userId,
      status: 'approved',
    });
    if (alreadyUsed >= coupon.usesPerUser) return false;
  }

  const res = await Coupon.updateOne(
    { _id: couponId, $expr: { $lt: ['$usedCount', '$maxUses'] } },
    { $inc: { usedCount: 1 } }
  );
  return res.modifiedCount > 0;
}

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
      //
      // The seat is claimed **first**, and only if one is actually free.
      // Previously the increment was unconditional, so two orders against a
      // one-seat slot could both be approved: `totalSeats 1, bookedSeats 2`,
      // both holders issued a valid QR, and somebody turned away at the door
      // having paid. Pending registrations reserve nothing, so any number of
      // people can queue for the last seat — the check has to be here, at
      // approval, and it has to be the database that refuses.
      const claimed = await claimSeat(order.event, order.slotId as string);

      if (!claimed) {
        throw new ApiError(
          409,
          'That slot is now full, so this payment cannot be approved. Reject it with a reason and arrange a refund.'
        );
      }

      // Same shape for the coupon: re-checked and incremented in one operation.
      // `usedCount` was only ever *checked* at registration and *incremented*
      // here, with nothing re-checking in between — and manual approval makes
      // that window hours wide, so a "first 50 only" code could be claimed by
      // everyone who registered before the queue was worked through.
      if (order.coupon) {
        const couponOk = await claimCouponUse(order.coupon.toString(), order.user.toString());
        if (!couponOk) {
          // Give the seat back — this approval is not going ahead, and holding
          // a seat for it would recreate the very problem above.
          await releaseSeat(order.event, order.slotId as string);
          throw new ApiError(
            409,
            'That coupon has reached its usage limit. Approve without the discount, or reject this payment.'
          );
        }
      }

      // Only now is the QR minted — issuing one before the seat was secured
      // would hand out a pass for a place the holder does not have.
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
    } else {
      // ── Course order approval ─────────────────────────────────────────────
      if (order.coupon) {
        const couponOk = await claimCouponUse(order.coupon.toString(), order.user.toString());
        if (!couponOk) {
          throw new ApiError(
            409,
            'That coupon has reached its usage limit. Approve without the discount, or reject this payment.'
          );
        }
      }
      await Course.findByIdAndUpdate(order.course, { $inc: { totalEnrollments: 1 } });
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
