import mongoose from 'mongoose';
import { env } from '../../config/env';
import { enqueue, adminRecipients } from './mailer';
import { Order, IOrder } from '../../models/Order.model';
import { IUser } from '../../models/User.model';
import { IEvent, IEventSlot } from '../../models/Event.model';
import { ICourse } from '../../models/Course.model';

/**
 * One function per business event. Controllers call these and ignore the result —
 * every function swallows its own errors, so a mail problem can never fail an
 * order approval or a registration.
 *
 * All date/money formatting happens here: templates do none.
 */

// ─── Formatting ─────────────────────────────────────────────────────────────

const APP = env.APP_BASE_URL;

/** "Monday, 14 September 2026" — matches the tone used across the templates. */
export const formatDate = (date: Date | string): string =>
  new Date(date).toLocaleDateString('en-IN', {
    weekday: 'long',
    year: 'numeric',
    month: 'long',
    day: 'numeric',
  });

const formatDateTime = (date: Date | string): string =>
  new Date(date).toLocaleString('en-IN', {
    day: 'numeric',
    month: 'short',
    year: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
  });

/** Number only — the ₹ symbol is baked into the templates. */
const formatMoney = (amount: number): string => amount.toLocaleString('en-IN');

const slotTime = (slot: IEventSlot): string => `${slot.startTime} – ${slot.endTime}`;

/**
 * The templates have a single "Where" row and ZeptoMail has no conditionals,
 * so the online/offline branch is resolved here.
 */
const eventWhere = (event: Pick<IEvent, 'mode' | 'location'>): string =>
  event.mode === 'offline'
    ? event.location || 'Venue to be announced'
    : 'Online — join link in your dashboard';

const fullName = (user: Pick<IUser, 'firstName' | 'lastName'>): string =>
  [user.firstName, user.lastName].filter(Boolean).join(' ').trim();

/** Templates greet with "Hi {{first_name}}" — an empty value reads as "Hi ,". */
const firstName = (user: Pick<IUser, 'firstName'>): string => user.firstName?.trim() || 'there';

const shortId = (id: unknown): string => String(id).slice(-8).toUpperCase();

// ─── Course orders ──────────────────────────────────────────────────────────

export async function notifyCourseOrderSubmitted(
  order: IOrder,
  user: Pick<IUser, 'firstName' | 'lastName' | 'email' | 'mobile' | 'countryCode'>,
  course: Pick<ICourse, 'title'>
): Promise<void> {
  await enqueue({
    templateKey: 'order-submitted-course',
    to: { address: user.email, name: fullName(user) },
    user: order.user,
    relatedTo: { model: 'Order', id: order._id as mongoose.Types.ObjectId },
    dedupeKey: `order-submitted:${order._id}`,
    merge: {
      first_name: firstName(user),
      course_title: course.title,
      order_id: shortId(order._id),
      final_price: formatMoney(order.finalPrice),
      transaction_id: order.transactionId,
      submitted_on: formatDateTime(order.createdAt),
      verification_window: '24 hours',
    },
  });

  await notifyAdminNewOrder(order, user, course.title);
}

export async function notifyCourseOrderApproved(
  order: IOrder,
  user: Pick<IUser, 'firstName' | 'lastName' | 'email'>,
  course: Pick<ICourse, 'title' | 'courseCode'>
): Promise<void> {
  await enqueue({
    templateKey: 'order-approved-course',
    to: { address: user.email, name: fullName(user) },
    user: order.user,
    relatedTo: { model: 'Order', id: order._id as mongoose.Types.ObjectId },
    dedupeKey: `order-approved:${order._id}`,
    merge: {
      first_name: firstName(user),
      course_title: course.title,
      order_id: shortId(order._id),
      final_price: formatMoney(order.finalPrice),
      approved_on: formatDateTime(new Date()),
      course_url: `${APP}/dashboard/courses/${course.courseCode}`,
    },
  });
}

// ─── Event orders ───────────────────────────────────────────────────────────

export async function notifyEventOrderSubmitted(
  order: IOrder,
  user: Pick<IUser, 'firstName' | 'lastName' | 'email' | 'mobile' | 'countryCode'>,
  event: Pick<IEvent, 'title' | 'eventCode' | 'mode' | 'location'>,
  slot: IEventSlot
): Promise<void> {
  await enqueue({
    templateKey: 'order-submitted-event',
    to: { address: user.email, name: fullName(user) },
    user: order.user,
    relatedTo: { model: 'Order', id: order._id as mongoose.Types.ObjectId },
    dedupeKey: `order-submitted:${order._id}`,
    merge: {
      first_name: firstName(user),
      event_title: event.title,
      event_code: event.eventCode,
      slot_date: formatDate(slot.date),
      slot_time: slotTime(slot),
      event_location: eventWhere(event),
      order_id: shortId(order._id),
      final_price: formatMoney(order.finalPrice),
      transaction_id: order.transactionId,
      submitted_on: formatDateTime(order.createdAt),
    },
  });

  await notifyAdminNewOrder(order, user, event.title);
}

/**
 * Seat confirmation, carrying the entry QR.
 *
 * `qrDataUrl` is the data: URI produced by QRCode.toDataURL(). Gmail strips
 * data: image sources, so the bytes are sent as an inline attachment and the
 * template's src becomes cid:qr.
 */
export async function notifyEventOrderApproved(
  order: IOrder,
  user: Pick<IUser, 'firstName' | 'lastName' | 'email'>,
  event: Pick<IEvent, 'title' | 'eventCode' | 'mode' | 'location'>,
  slot: IEventSlot,
  registrationId: string,
  qrDataUrl: string
): Promise<void> {
  const base64 = qrDataUrl.includes(',') ? qrDataUrl.split(',')[1] : qrDataUrl;

  await enqueue({
    templateKey: 'order-approved-event',
    to: { address: user.email, name: fullName(user) },
    user: order.user,
    relatedTo: { model: 'Order', id: order._id as mongoose.Types.ObjectId },
    dedupeKey: `order-approved:${order._id}`,
    inlineImages: [{ content: base64, mime_type: 'image/png', cid: 'qr' }],
    merge: {
      first_name: firstName(user),
      event_title: event.title,
      event_code: event.eventCode,
      slot_date: formatDate(slot.date),
      slot_time: slotTime(slot),
      event_location: eventWhere(event),
      registration_id: shortId(registrationId),
      qr_code_url: 'cid:qr',
    },
  });
}

// ─── Rejection (both order types) ───────────────────────────────────────────

export async function notifyOrderRejected(
  order: IOrder,
  user: Pick<IUser, 'firstName' | 'lastName' | 'email'>,
  itemTitle: string
): Promise<void> {
  await enqueue({
    templateKey: 'order-rejected',
    to: { address: user.email, name: fullName(user) },
    user: order.user,
    relatedTo: { model: 'Order', id: order._id as mongoose.Types.ObjectId },
    dedupeKey: `order-rejected:${order._id}`,
    merge: {
      first_name: firstName(user),
      item_title: itemTitle,
      order_id: shortId(order._id),
      final_price: formatMoney(order.finalPrice),
      transaction_id: order.transactionId,
      rejection_reason: order.rejectionReason || 'No reason was recorded.',
      reviewed_on: formatDateTime(new Date()),
      retry_url:
        order.orderType === 'event' ? `${APP}/dashboard/events` : `${APP}/dashboard/marketplace`,
    },
  });
}

// ─── Admin alert ────────────────────────────────────────────────────────────

/** One row per admin recipient, so each has its own delivery status. */
export async function notifyAdminNewOrder(
  order: IOrder,
  user: Pick<IUser, 'firstName' | 'lastName' | 'email' | 'mobile' | 'countryCode'>,
  itemTitle: string
): Promise<void> {
  const recipients = adminRecipients();
  if (recipients.length === 0) {
    console.warn('[notifications] MAIL_ADMIN_RECIPIENTS is empty — no admin alert sent');
    return;
  }

  for (const address of recipients) {
    await enqueue({
      templateKey: 'admin-order-new',
      to: { address },
      relatedTo: { model: 'Order', id: order._id as mongoose.Types.ObjectId },
      dedupeKey: `admin-order-new:${order._id}:${address}`,
      merge: {
        order_type: order.orderType,
        item_title: itemTitle,
        user_name: fullName(user) || '(name not set)',
        user_email: user.email,
        // `mobile` is stored E.164 and already carries its dial code; prefixing
        // `countryCode` here produced "+91+919820115577" in the admin's inbox.
        user_mobile: user.mobile || '(not provided)',
        order_id: shortId(order._id),
        final_price: formatMoney(order.finalPrice),
        transaction_id: order.transactionId,
        submitted_on: formatDateTime(order.createdAt),
        admin_order_url: `${APP}/admin/orders`,
        screenshot_url: order.screenshotUrl,
      },
    });
  }
}

// ─── Account lifecycle ──────────────────────────────────────────────────────

export async function notifyWelcome(
  user: Pick<IUser, 'firstName' | 'lastName' | 'email' | 'referralCode'> & { _id?: unknown }
): Promise<void> {
  await enqueue({
    templateKey: 'auth-welcome',
    to: { address: user.email, name: fullName(user) },
    user: user._id as mongoose.Types.ObjectId,
    dedupeKey: `welcome:${user._id}`,
    merge: {
      first_name: firstName(user),
      referral_code: user.referralCode,
    },
  });
}

export async function notifyAccountSuspended(
  user: Pick<IUser, 'firstName' | 'lastName' | 'email'> & { _id?: unknown },
  reason?: string
): Promise<void> {
  await enqueue({
    templateKey: 'account-suspended',
    to: { address: user.email, name: fullName(user) },
    user: user._id as mongoose.Types.ObjectId,
    // No dedupeKey: an account can legitimately be suspended more than once.
    merge: {
      first_name: firstName(user),
      email: user.email,
      suspended_on: formatDateTime(new Date()),
      reason: reason || 'Our team flagged unusual activity on this account.',
    },
  });
}

export async function notifyAccountReactivated(
  user: Pick<IUser, 'firstName' | 'lastName' | 'email'> & { _id?: unknown }
): Promise<void> {
  await enqueue({
    templateKey: 'account-reactivated',
    to: { address: user.email, name: fullName(user) },
    user: user._id as mongoose.Types.ObjectId,
    merge: {
      first_name: firstName(user),
      reactivated_on: formatDateTime(new Date()),
    },
  });
}

// ─── Referrals ──────────────────────────────────────────────────────────────

/** Someone signed up with the referrer's code — reward not unlocked yet. */
export async function notifyReferralSignup(
  referrer: Pick<IUser, 'firstName' | 'lastName' | 'email' | 'referralCode'> & { _id?: unknown },
  referredName: string,
  referredCount: number
): Promise<void> {
  await enqueue({
    templateKey: 'referral-signup',
    to: { address: referrer.email, name: fullName(referrer) },
    user: referrer._id as mongoose.Types.ObjectId,
    dedupeKey: `referral-signup:${referrer._id}:${referredCount}`,
    merge: {
      first_name: firstName(referrer),
      referred_name: referredName,
      joined_on: formatDateTime(new Date()),
      referral_code: referrer.referralCode,
      referred_count: referredCount,
    },
  });
}

/** The referred user bought something — reward coupon issued. */
export async function notifyReferralConverted(
  referrer: Pick<IUser, 'firstName' | 'lastName' | 'email' | 'referralCode'> & { _id?: unknown },
  referredName: string,
  itemTitle: string,
  rewardCode: string,
  rewardValue: number,
  referralId: unknown
): Promise<void> {
  await enqueue({
    templateKey: 'referral-converted',
    to: { address: referrer.email, name: fullName(referrer) },
    user: referrer._id as mongoose.Types.ObjectId,
    dedupeKey: `referral-converted:${referralId}`,
    merge: {
      first_name: firstName(referrer),
      referred_name: referredName,
      item_title: itemTitle,
      reward_code: rewardCode,
      reward_value: formatMoney(rewardValue),
      referral_code: referrer.referralCode,
    },
  });
}

// ─── Event lifecycle ────────────────────────────────────────────────────────

/** Any label the admin form can produce — it is free-form, not a fixed set. */
export type ReminderKind = string;

/**
 * Human wording for a reminder.
 *
 * Derived from the offset in MINUTES, never from the label string. The admin
 * form lets an admin add any offset they like and builds labels such as
 * `1_days_before`, `10_minutes_before` or `2_hours_before`, so a fixed lookup
 * table silently fails for anything it has not seen. Working from the number
 * handles every offset, including ones nobody has thought of yet.
 *
 * `reminder_phrase` completes the subject ("{{event_title}} is {{phrase}}"),
 * `reminder_label` fills the pill in the email body.
 */
export function reminderWording(
  offsetMinutes: number,
  label?: string
): { label: string; phrase: string } {
  if (label === 'day_of_8am') return { label: 'Today', phrase: 'today' };

  const mins = Math.max(0, Math.round(offsetMinutes));
  const plural = (n: number, word: string) => `${n} ${word}${n === 1 ? '' : 's'}`;

  if (mins < 60) {
    return { label: 'Starting now', phrase: `starting in ${plural(mins, 'minute')}` };
  }
  if (mins < 1440) {
    const hours = Math.round(mins / 60);
    return { label: `In ${plural(hours, 'hour')}`, phrase: `in ${plural(hours, 'hour')}` };
  }

  const days = Math.round(mins / 1440);
  if (days === 1) return { label: 'Tomorrow', phrase: 'tomorrow' };
  return { label: `${plural(days, 'day')} to go`, phrase: `in ${plural(days, 'day')}` };
}

/**
 * One reminder to one registrant.
 *
 * The dedupeKey is per user, not per slot. The cron's `remindersSent` array
 * marks a whole slot done, so a single failed send used to be lost forever;
 * with this key a retry re-attempts only the people who did not get it.
 */
export async function notifyEventReminder(
  user: Pick<IUser, 'firstName' | 'lastName' | 'email'> & { _id?: unknown },
  event: Pick<IEvent, 'title' | 'eventCode' | 'mode' | 'location'> & { _id?: unknown },
  slot: IEventSlot,
  kind: ReminderKind,
  offsetMinutes: number
): Promise<void> {
  const wording = reminderWording(offsetMinutes, kind);

  await enqueue({
    templateKey: 'event-reminder',
    to: { address: user.email, name: fullName(user) },
    user: user._id as mongoose.Types.ObjectId,
    relatedTo: { model: 'Event', id: event._id as mongoose.Types.ObjectId },
    dedupeKey: `reminder:${event._id}:${slot.slotId}:${kind}:${user._id}`,
    merge: {
      first_name: firstName(user),
      event_title: event.title,
      event_code: event.eventCode,
      reminder_label: wording.label,
      reminder_phrase: wording.phrase,
      slot_date: formatDate(slot.date),
      slot_time: slotTime(slot),
      event_mode: event.mode === 'offline' ? 'In person' : 'Online',
      event_location: eventWhere(event),
      ticket_url: `${APP}/dashboard/events`,
    },
  });
}

export async function notifyAttendanceMarked(
  user: Pick<IUser, 'firstName' | 'lastName' | 'email'> & { _id?: unknown },
  event: Pick<IEvent, 'title' | 'eventCode'> & { _id?: unknown; notesUrl?: string },
  registrationId: string
): Promise<void> {
  await enqueue({
    templateKey: 'event-attendance-confirmed',
    to: { address: user.email, name: fullName(user) },
    user: user._id as mongoose.Types.ObjectId,
    relatedTo: { model: 'EventRegistration', id: registrationId as unknown as mongoose.Types.ObjectId },
    dedupeKey: `attendance:${registrationId}`,
    merge: {
      first_name: firstName(user),
      event_title: event.title,
      event_code: event.eventCode,
      attended_on: formatDateTime(new Date()),
      certificate_url: `${APP}/dashboard/events`,
      notes_url: event.notesUrl || `${APP}/dashboard/events`,
    },
  });
}

/**
 * Slot rescheduled. Sent to every approved registrant on that slot — their QR
 * stays valid, which the template says explicitly so nobody re-registers.
 */
export async function notifyEventRescheduled(
  user: Pick<IUser, 'firstName' | 'lastName' | 'email'> & { _id?: unknown },
  event: Pick<IEvent, 'title' | 'eventCode' | 'mode' | 'location'> & { _id?: unknown },
  oldSlot: IEventSlot,
  newSlot: IEventSlot,
  changeNote?: string
): Promise<void> {
  await enqueue({
    templateKey: 'event-updated',
    to: { address: user.email, name: fullName(user) },
    user: user._id as mongoose.Types.ObjectId,
    relatedTo: { model: 'Event', id: event._id as mongoose.Types.ObjectId },
    // Keyed on the new timing, so a second reschedule mails again.
    dedupeKey: `event-updated:${event._id}:${newSlot.slotId}:${new Date(newSlot.date).toISOString()}:${newSlot.startTime}:${user._id}`,
    merge: {
      first_name: firstName(user),
      event_title: event.title,
      event_code: event.eventCode,
      old_slot_date: formatDate(oldSlot.date),
      old_slot_time: slotTime(oldSlot),
      new_slot_date: formatDate(newSlot.date),
      new_slot_time: slotTime(newSlot),
      event_location: eventWhere(event),
      change_note: changeNote || 'The organisers have updated the schedule for this session.',
      ticket_url: `${APP}/dashboard/events`,
    },
  });
}

export async function notifyEventCancelled(
  user: Pick<IUser, 'firstName' | 'lastName' | 'email'> & { _id?: unknown },
  event: Pick<IEvent, 'title' | 'eventCode'> & { _id?: unknown },
  slot: IEventSlot | undefined,
  reason?: string
): Promise<void> {
  await enqueue({
    templateKey: 'event-cancelled',
    to: { address: user.email, name: fullName(user) },
    user: user._id as mongoose.Types.ObjectId,
    relatedTo: { model: 'Event', id: event._id as mongoose.Types.ObjectId },
    dedupeKey: `event-cancelled:${event._id}:${user._id}`,
    merge: {
      first_name: firstName(user),
      event_title: event.title,
      event_code: event.eventCode,
      slot_date: slot ? formatDate(slot.date) : 'the scheduled date',
      cancellation_reason: reason || 'The session could not go ahead as planned.',
      refund_note:
        'Your payment will be refunded in full to the original payment method within 5–7 working days. ' +
        'If you do not see it by then, reply to this email and we will chase it for you.',
    },
  });
}

// ─── Dispatcher used by the admin approve/reject endpoint ───────────────────

/**
 * Resolves an order's related documents and sends the right email for its new
 * status. Called after the order has been saved.
 *
 * Never throws — a failure here must not turn a successful approval into a 500.
 */
export async function notifyOrderStatusChange(
  orderId: mongoose.Types.ObjectId | string,
  qrDataUrl?: string,
  registrationId?: string
): Promise<void> {
  try {
    const order = await Order.findById(orderId)
      .populate<{ user: IUser }>('user', 'firstName lastName email mobile countryCode')
      .populate<{ course: ICourse }>('course', 'title courseCode')
      .populate<{ event: IEvent }>('event', 'title eventCode mode location slots');

    if (!order?.user?.email) {
      console.warn(`[notifications] order ${orderId}: no user email, skipping status email`);
      return;
    }

    const itemTitle = order.course?.title ?? order.event?.title ?? 'your purchase';

    if (order.status === 'rejected') {
      await notifyOrderRejected(order as unknown as IOrder, order.user, itemTitle);
      return;
    }

    if (order.status !== 'approved') return;

    if (order.orderType === 'event') {
      const slot = order.event?.slots?.find((s) => s.slotId === order.slotId);
      if (!slot || !qrDataUrl || !registrationId) {
        console.warn(`[notifications] order ${orderId}: missing slot/QR, skipping confirmation`);
        return;
      }
      await notifyEventOrderApproved(
        order as unknown as IOrder,
        order.user,
        order.event,
        slot,
        registrationId,
        qrDataUrl
      );
    } else if (order.course) {
      await notifyCourseOrderApproved(order as unknown as IOrder, order.user, order.course);
    }
  } catch (err) {
    console.error(`[notifications] status email failed for order ${orderId}:`, err);
  }
}


// ─── Contact form and newsletter ─────────────────────────────────────────────

/**
 * Acknowledges an enquiry to the sender, and alerts the team.
 *
 * Both are fire-and-forget and self-catching: the enquiry is already saved by
 * the time these run, and a mail problem must not turn a successful submission
 * into an error for someone who did nothing wrong.
 */
export async function notifyEnquiryReceived(enquiry: {
  ticketId: string;
  name: string;
  email: string;
  mobile?: string;
  subject: string;
  message: string;
  createdAt: Date;
  _id: unknown;
}): Promise<void> {
  const submittedOn = enquiry.createdAt.toLocaleString('en-IN', {
    dateStyle: 'medium',
    timeStyle: 'short',
  });

  // To the person who wrote in.
  void enqueue({
    templateKey: 'contact-ack',
    to: { address: enquiry.email, name: enquiry.name },
    merge: {
      name: enquiry.name,
      ticket_id: enquiry.ticketId,
      enquiry_subject: enquiry.subject,
      message: enquiry.message,
      submitted_on: submittedOn,
      response_window: '2 working days',
    },
    relatedTo: { model: 'Enquiry', id: String(enquiry._id) },
    dedupeKey: `contact-ack:${enquiry.ticketId}`,
  });

  // To the team.
  const recipients = adminRecipients();
  if (recipients.length === 0) {
    console.warn('[notifications] MAIL_ADMIN_RECIPIENTS is empty — enquiry alert not sent');
    return;
  }
  for (const address of recipients) {
    void enqueue({
      templateKey: 'admin-contact-new',
      to: { address },
      merge: {
        name: enquiry.name,
        email: enquiry.email,
        mobile: enquiry.mobile || '(not provided)',
        enquiry_subject: enquiry.subject,
        message: enquiry.message,
        submitted_on: submittedOn,
        ticket_id: enquiry.ticketId,
      },
      relatedTo: { model: 'Enquiry', id: String(enquiry._id) },
      dedupeKey: `admin-contact:${enquiry.ticketId}:${address}`,
    });
  }
}

/** Welcomes a new newsletter subscriber. */
export async function notifyNewsletterwelcome(email: string): Promise<void> {
  void enqueue({
    templateKey: 'newsletter-welcome',
    to: { address: email },
    merge: { email },
    // Keyed on the address so a double submit does not send two welcomes.
    dedupeKey: `newsletter-welcome:${email}`,
  });
}

/**
 * The second factor for an admin sign-in.
 *
 * `admin-login-otp` is flagged sensitive in the manifest, so the audit row
 * records that a code was sent and to whom, but never the code itself.
 *
 * No dedupeKey: every request mints a fresh code, and "resend" would be
 * silently swallowed if two sends looked identical.
 */
export async function notifyAdminLoginOtp(
  email: string,
  adminName: string,
  otp: string,
  ipAddress?: string
): Promise<void> {
  void enqueue({
    templateKey: 'admin-login-otp',
    to: { address: email, name: adminName },
    merge: {
      admin_name: adminName?.trim() || 'there',
      otp,
      expiry_minutes: env.OTP_EXPIRY_MINUTES,
      // Shown so an unexpected code carries enough to act on — an address the
      // recipient does not recognise is the signal that the password is out.
      ip_address: ipAddress || 'unknown',
      requested_at: formatDateTime(new Date()),
    },
  });
}
