import { Request, Response } from "express";
import { asyncHandler } from "../../utils/asyncHandler";
import { ApiResponse } from "../../utils/ApiResponse";
import { ApiError } from "../../utils/ApiError";
import { Event, IEventSlot } from "../../models/Event.model";
import { EventRegistration } from "../../models/EventRegistration.model";
import { Order } from "../../models/Order.model";
import { Coupon } from "../../models/Coupon.model";
import { User } from "../../models/User.model";
import { notifyEventOrderSubmitted } from "../../services/email/notifications";

// ─── Helpers ──────────────────────────────────────────────────────────────────

/**
 * Returns true if a slot is currently ongoing (startTime ≤ now ≤ endTime on slot date).
 */
function isSlotOngoing(slot: IEventSlot): boolean {
  const slotDate = new Date(slot.date);
  const now = new Date();

  // Check same calendar date
  const sameDay =
    slotDate.getFullYear() === now.getFullYear() &&
    slotDate.getMonth() === now.getMonth() &&
    slotDate.getDate() === now.getDate();

  if (!sameDay) return false;

  const [startH, startM] = slot.startTime.split(":").map(Number);
  const [endH, endM] = slot.endTime.split(":").map(Number);
  const nowMinutes = now.getHours() * 60 + now.getMinutes();

  return nowMinutes >= startH * 60 + startM && nowMinutes <= endH * 60 + endM;
}

/**
 * Shared coupon validation for events — mirrors applyCouponToPrice in order.controller.ts.
 * Validates every constraint then calculates finalPrice.
 */
async function applyCouponToEventPrice(
  couponCode: string,
  userId: string,
  eventId: string,
  basePrice: number,
): Promise<{ finalPrice: number; couponId: any; savingsAmount: number }> {
  const coupon = await Coupon.findOne({
    code: couponCode.toUpperCase(),
    isActive: true,
  });
  if (!coupon) throw new ApiError(400, "Invalid or inactive coupon code");

  // appliesTo guard — must allow events
  if (coupon.appliesTo === "course") {
    throw new ApiError(
      400,
      "This coupon is only valid for courses, not events",
    );
  }

  if (new Date() > new Date(coupon.validUntil))
    throw new ApiError(400, "Coupon has expired");
  if (coupon.usedCount >= coupon.maxUses)
    throw new ApiError(400, "Coupon usage limit reached");

  // Email whitelist
  if (coupon.allowedEmails && coupon.allowedEmails.length > 0) {
    const user = await User.findById(userId).select("email");
    if (!user || !coupon.allowedEmails.includes(user.email)) {
      throw new ApiError(403, "This coupon is not available for your account");
    }
  }

  // Event restriction
  if (coupon.applicableEvents && coupon.applicableEvents.length > 0) {
    const applicable = coupon.applicableEvents.some(
      (id) => id.toString() === eventId.toString(),
    );
    if (!applicable)
      throw new ApiError(
        400,
        "This coupon is not valid for the selected event",
      );
  }

  // First-time buyer (checks both orders and event registrations)
  if (coupon.firstTimeUsersOnly) {
    const hasOrder = await Order.findOne({ user: userId, status: "approved" });
    const hasEventReg = await EventRegistration.findOne({
      user: userId,
      status: "approved",
    });
    if (hasOrder || hasEventReg) {
      throw new ApiError(400, "This coupon is only for first-time purchasers");
    }
  }

  // Per-user usage (across event registrations)
  if (coupon.usesPerUser) {
    const userUsageCount = await EventRegistration.countDocuments({
      user: userId,
      coupon: coupon._id,
      status: "approved",
    });
    if (userUsageCount >= coupon.usesPerUser) {
      throw new ApiError(
        400,
        `You can only use this coupon ${coupon.usesPerUser} time(s)`,
      );
    }
  }

  // Min purchase
  if (coupon.minPurchaseAmount && basePrice < coupon.minPurchaseAmount) {
    throw new ApiError(
      400,
      `Minimum event price of ₹${coupon.minPurchaseAmount} required for this coupon`,
    );
  }

  // Calculate discount
  let discount = 0;
  if (coupon.type === "percentage") {
    discount = (basePrice * coupon.value) / 100;
    if (coupon.maxDiscountAmount && discount > coupon.maxDiscountAmount) {
      discount = coupon.maxDiscountAmount;
    }
  } else {
    discount = Math.min(coupon.value, basePrice);
  }

  const finalPrice = Math.max(0, basePrice - discount);
  return { finalPrice, couponId: coupon._id, savingsAmount: discount };
}

// ─── Controllers ──────────────────────────────────────────────────────────────

/**
 * GET /events
 * Returns all published events with a derived status field relative to the requesting user.
 *
 * Status derivation:
 *   - "upcoming"  → user is registered (approved) AND at least one slot is in the future
 *   - "previous"  → user was registered (approved) AND ALL slots are in the past
 *   - "open"      → published event with at least one future slot, user not registered
 *
 * The ?tab query param filters by tab: "all" | "upcoming" | "previous"
 * "all" returns open + upcoming (i.e. any published event with a future slot).
 */
export const getPublishedEvents = asyncHandler(
  async (req: Request, res: Response) => {
    const userId = req.user?.userId;
    const tab = (req.query.tab as string) ?? "all";

    const now = new Date();

    // Fetch all published events sorted by nearest slot ascending
    const events = await Event.find({ isPublished: true }).lean();

    // Fetch user's registrations (joined with their orders for status)
    const myRegistrations = userId
      ? await EventRegistration.find({ user: userId })
          .select("event slotId status order qrCodeImage attended certificateDownloadedAt notesAccessedAt")
          .populate("order", "status")
          .lean()
      : [];

    // Sync EventRegistration.status from Order.status so it is always authoritative
    // (The order is the payment record; its status drives the registration state)
    const myActiveRegistrations = (myRegistrations as any[]).filter((r) => {
      const orderStatus = (r.order as any)?.status ?? r.status;
      return orderStatus === "pending" || orderStatus === "approved";
    });

    // Pending registration counts per slot (all users) to compute real available seats
    const pendingCounts = await EventRegistration.aggregate([
      {
        $match: { status: "pending", event: { $in: events.map((e) => e._id) } },
      },
      {
        $group: {
          _id: { event: "$event", slotId: "$slotId" },
          count: { $sum: 1 },
        },
      },
    ]);
    // Map: "eventId::slotId" → pendingCount
    const pendingMap = new Map<string, number>(
      pendingCounts.map((p) => [
        `${p._id.event.toString()}::${p._id.slotId}`,
        p.count,
      ]),
    );

    // Map: eventId → my registration (prefer approved over pending)
    const myRegMap = new Map<string, (typeof myActiveRegistrations)[0]>();
    for (const r of myActiveRegistrations) {
      const key = r.event.toString();
      const existing = myRegMap.get(key);
      const rStatus = (r.order as any)?.status ?? r.status;
      const existingStatus = existing ? ((existing.order as any)?.status ?? existing.status) : null;
      if (!existing || rStatus === "approved") myRegMap.set(key, r);
      else if (existingStatus !== "approved") myRegMap.set(key, r);
    }

    const annotated = events.map((event) => {
      const allSlotsInPast = event.slots.every((s) => new Date(s.date) < now);
      const hasFutureSlot = event.slots.some((s) => new Date(s.date) >= now);
      const myReg = myRegMap.get(event._id.toString());
      const isRegistered = !!myReg;
      // Read status from the linked Order, fall back to EventRegistration.status
      const registrationStatus: "pending" | "approved" | null = myReg
        ? ((myReg.order as any)?.status ?? myReg.status) ?? null
        : null;

      let status: "open" | "upcoming" | "previous";
      if (isRegistered && hasFutureSlot) {
        status = "upcoming";
      } else if (isRegistered && allSlotsInPast) {
        status = "previous";
      } else {
        status = "open";
      }

      // Annotate each slot with availableSeats = totalSeats - bookedSeats - pendingCount
      const slots = event.slots.map((s) => {
        const pendingForSlot =
          pendingMap.get(`${event._id.toString()}::${s.slotId}`) ?? 0;
        const availableSeats = Math.max(
          0,
          s.totalSeats - s.bookedSeats - pendingForSlot,
        );
        return { ...s, availableSeats };
      });

      return {
        ...event,
        slots,
        status,
        isRegistered,
        registrationStatus,
        myRegistration: myReg ?? null,
      };
    });

    // Filter by tab
    let result = annotated;
    if (tab === "all") {
      // Show all events that have at least one future slot (registered or not)
      result = annotated.filter((e) =>
        e.slots.some((s) => new Date(s.date) >= now),
      );
    } else if (tab === "upcoming") {
      result = annotated.filter((e) => e.status === "upcoming");
    } else if (tab === "previous") {
      result = annotated.filter((e) => e.status === "previous");
    }

    // Sort by nearest upcoming slot date ascending
    result.sort((a, b) => {
      const nearest = (slots: IEventSlot[]) => {
        const futureDates = slots
          .map((s) => new Date(s.date).getTime())
          .filter((t) => t >= now.getTime());
        return futureDates.length ? Math.min(...futureDates) : Infinity;
      };
      return nearest(a.slots) - nearest(b.slots);
    });

    res.status(200).json(new ApiResponse(200, result, "Events fetched"));
  },
);

/**
 * GET /events/:eventCode
 * Full event detail page. Strips meetLink unless user is registered + slot is ongoing.
 */
export const getEventDetail = asyncHandler(
  async (req: Request, res: Response) => {
    const userId = req.user?.userId;
    const eventCode = req.params.eventCode as string;

    const event = await Event.findOne({
      eventCode: eventCode.toUpperCase(),
      isPublished: true,
    }).lean();

    if (!event) throw new ApiError(404, "Event not found or not published");

    // Find user's registration — prefer approved over pending, join Order for status
    const myRegistrations = userId
      ? await EventRegistration.find({ user: userId, event: event._id })
          .select("slotId status order qrToken qrCodeImage attended certificateDownloadedAt notesAccessedAt")
          .populate("order", "status finalPrice transactionId coupon")
          .lean()
      : [];

    // Filter to only active (pending or approved via Order)
    const activeRegs = (myRegistrations as any[]).filter((r) => {
      const s = (r.order as any)?.status ?? r.status;
      return s === "pending" || s === "approved";
    });

    const myRegistration =
      activeRegs.find((r) => ((r.order as any)?.status ?? r.status) === "approved") ??
      activeRegs.find((r) => ((r.order as any)?.status ?? r.status) === "pending") ??
      null;

    const isRegistered = !!myRegistration;
    const registrationStatus: "pending" | "approved" | null = myRegistration
      ? ((myRegistration.order as any)?.status ?? myRegistration.status) ?? null
      : null;

    // Pending counts per slot to compute real available seats
    const pendingCounts = await EventRegistration.aggregate([
      { $match: { status: "pending", event: event._id } },
      { $group: { _id: "$slotId", count: { $sum: 1 } } },
    ]);
    const pendingSlotMap = new Map<string, number>(
      pendingCounts.map((p) => [p._id, p.count]),
    );

    const slots = event.slots.map((s) => {
      const pendingForSlot = pendingSlotMap.get(s.slotId) ?? 0;
      const availableSeats = Math.max(
        0,
        s.totalSeats - s.bookedSeats - pendingForSlot,
      );
      return { ...s, availableSeats };
    });

    // Determine if the user's registered slot is currently ongoing
    let meetLinkVisible = false;
    if (isRegistered && myRegistration?.status === "approved") {
      const registeredSlot = event.slots.find(
        (s) => s.slotId === myRegistration.slotId,
      );
      if (registeredSlot && isSlotOngoing(registeredSlot)) {
        meetLinkVisible = true;
      }
    }

    const eventData = {
      ...event,
      slots,
      meetLink: meetLinkVisible ? event.meetLink : undefined,
      isRegistered,
      registrationStatus,
      myRegistration: myRegistration ?? null,
    };

    res.status(200).json(new ApiResponse(200, eventData, "Event fetched"));
  },
);

/**
 * POST /events/validate-coupon
 * Validates a coupon for an event and returns the discounted price.
 */
export const validateEventCoupon = asyncHandler(
  async (req: Request, res: Response) => {
    const userId = req.user?.userId;
    const { couponCode, eventId } = req.body;

    if (!couponCode || !eventId)
      throw new ApiError(400, "couponCode and eventId are required");

    const event = await Event.findById(eventId).select(
      "price discountedPrice isPublished",
    );
    if (!event || !event.isPublished)
      throw new ApiError(404, "Event not found");

    const basePrice = event.discountedPrice ?? event.price;

    const { finalPrice, savingsAmount } = await applyCouponToEventPrice(
      couponCode,
      userId!,
      eventId,
      basePrice,
    );

    const coupon = await Coupon.findOne({
      code: couponCode.toUpperCase(),
    }).select("code type value");

    res.status(200).json(
      new ApiResponse(
        200,
        {
          coupon: {
            code: coupon!.code,
            type: coupon!.type,
            value: coupon!.value,
          },
          originalPrice: basePrice,
          discount: savingsAmount,
          finalPrice,
        },
        "Coupon applied successfully",
      ),
    );
  },
);

/**
 * POST /events/register
 * Submits a payment and creates a pending EventRegistration.
 * Checks seat availability and prevents duplicate registration for the same slot.
 */
export const registerForEvent = asyncHandler(
  async (req: Request, res: Response) => {
    const userId = req.user?.userId;
    const { eventId, slotId, transactionId, screenshotUrl, couponCode } =
      req.body;

    if (!eventId || !slotId || !transactionId || !screenshotUrl) {
      throw new ApiError(
        400,
        "Missing required fields: eventId, slotId, transactionId, screenshotUrl",
      );
    }

    // 1. Validate event exists and is published
    const event = await Event.findById(eventId);
    if (!event || !event.isPublished)
      throw new ApiError(404, "Event not found or not available");

    // 2. Validate slot exists
    const slot = event.slots.find((s) => s.slotId === slotId);
    if (!slot) throw new ApiError(400, "Invalid slot selected");

    // 3. Check slot is still in the future
    if (new Date(slot.date) < new Date()) {
      throw new ApiError(400, "This slot has already passed");
    }

    // 4. Check seat availability
    if (slot.bookedSeats >= slot.totalSeats) {
      throw new ApiError(400, "No seats available for this slot");
    }

    // 5. Prevent duplicate registration for the same event (any slot, pending or approved)
    const existing = await EventRegistration.findOne({
      user: userId,
      event: eventId,
      status: { $in: ["pending", "approved"] },
    });
    if (existing) {
      throw new ApiError(
        400,
        `You already have a ${existing.status} registration for this event`,
      );
    }

    // 6. Calculate price and apply coupon if provided
    let finalPrice = event.discountedPrice ?? event.price;
    let appliedCouponId = null;

    if (couponCode?.trim()) {
      const result = await applyCouponToEventPrice(
        couponCode,
        userId!,
        eventId,
        finalPrice,
      );
      finalPrice = result.finalPrice;
      appliedCouponId = result.couponId;
    }

    // 7. Create Order (payment record — consistent with course order flow)
    const order = await Order.create({
      orderType: "event",
      user: userId,
      event: eventId,
      slotId,
      coupon: appliedCouponId,
      finalPrice,
      transactionId: transactionId.trim(),
      screenshotUrl: screenshotUrl.trim(),
      status: "pending",
    });

    // 8. Create EventRegistration linked to the Order (no payment fields)
    const registration = await EventRegistration.create({
      user: userId,
      event: eventId,
      slotId,
      order: order._id,
      status: "pending",
    });

    // Receipt to the registrant + alert to admins. The email states plainly
    // that the seat is NOT held until an admin approves the payment.
    const registrant = await User.findById(userId)
      .select("firstName lastName email mobile countryCode")
      .lean();
    if (registrant) void notifyEventOrderSubmitted(order, registrant, event, slot);

    res
      .status(201)
      .json(
        new ApiResponse(
          201,
          { order, registration },
          "Registration submitted! Awaiting admin verification.",
        ),
      );
  },
);

/**
 * POST /events/:eventCode/record-download
 * Records that the user downloaded their certificate or accessed notes.
 * Only sets the timestamp on first call; subsequent calls are no-ops.
 */
export const recordDownload = asyncHandler(
  async (req: Request, res: Response): Promise<void> => {
    const userId = req.user?.userId;
    const eventCode = req.params.eventCode as string;
    const { type } = req.body as { type: 'certificate' | 'notes' };

    if (type !== 'certificate' && type !== 'notes') {
      throw new ApiError(400, 'type must be "certificate" or "notes"');
    }

    const event = await Event.findOne({ eventCode: eventCode.toUpperCase(), isPublished: true }).select('_id notesUrl');
    if (!event) throw new ApiError(404, 'Event not found');

    const registration = await EventRegistration.findOne({
      user: userId,
      event: event._id,
      status: 'approved',
      attended: true,
    });
    if (!registration) {
      throw new ApiError(403, 'Certificate and notes are only available after you have attended the event');
    }

    if (type === 'notes' && !event.notesUrl) {
      throw new ApiError(404, 'No notes have been published for this event yet');
    }

    const field = type === 'certificate' ? 'certificateDownloadedAt' : 'notesAccessedAt';
    if (!registration.get(field)) {
      registration.set(field, new Date());
      await registration.save();
    }

    const payload = type === 'notes' ? { notesUrl: event.notesUrl } : {};
    res.status(200).json(new ApiResponse(200, { ...payload, registration }, 'Recorded'));
  },
);

/**
 * GET /events/my-registrations
 * Returns the authenticated user's event registrations with full event and slot info.
 */
export const getMyEventRegistrations = asyncHandler(
  async (req: Request, res: Response) => {
    const userId = req.user?.userId;

    const registrations = await EventRegistration.find({ user: userId })
      .populate("event", "title bannerUrl eventCode mode location slots category")
      .populate("order", "finalPrice transactionId screenshotUrl coupon status createdAt")
      .sort({ createdAt: -1 })
      .lean();

    // Attach the specific slot object from the populated event for convenience
    const enriched = registrations.map((reg) => {
      const event = reg.event as any;
      const slot =
        event?.slots?.find((s: IEventSlot) => s.slotId === reg.slotId) ?? null;
      return { ...reg, slotDetail: slot };
    });

    res
      .status(200)
      .json(new ApiResponse(200, enriched, "My event registrations fetched"));
  },
);
