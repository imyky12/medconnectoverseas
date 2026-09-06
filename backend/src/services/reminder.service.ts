import { IEvent, IEventSlot } from '../models/Event.model';
import { IUser } from '../models/User.model';
import { notifyEventReminder } from './email/notifications';

// ─── Types ────────────────────────────────────────────────────────────────────

export type ReminderType =
  | '3_days_before'
  | '1_day_before'
  | 'day_of_8am'
  | '10_min_before';

/** Canonical reminder offsets in minutes (negative = before slot start). */
export const REMINDER_OFFSETS: { offsetMinutes: number; offsetLabel: ReminderType }[] = [
  { offsetMinutes: 3 * 24 * 60, offsetLabel: '3_days_before' },
  { offsetMinutes: 1 * 24 * 60, offsetLabel: '1_day_before' },
  { offsetMinutes: 0,           offsetLabel: 'day_of_8am' },   // special — sent at 08:00 on slot day
  { offsetMinutes: 10,          offsetLabel: '10_min_before' },
];

// ─── Senders ──────────────────────────────────────────────────────────────────

/**
 * Event reminder email.
 *
 * Renders the `event-reminder` template and hands it to the outbox. The
 * dedupeKey inside notifyEventReminder is per user, so a failure for one
 * registrant is retried without re-mailing everyone else on the slot.
 */
export const sendEventReminderEmail = async (
  // _id on both is what makes the per-user dedupeKey unique.
  user: Pick<IUser, 'firstName' | 'lastName' | 'email'> & { _id?: unknown },
  event: Pick<IEvent, 'title' | 'eventCode' | 'mode' | 'location'> & { _id?: unknown },
  slot: IEventSlot,
  type: ReminderType,
  // Offset in minutes drives the wording — the label alone is free-form and
  // cannot be relied on (the admin form emits e.g. "2_hours_before").
  offsetMinutes: number
): Promise<void> => {
  await notifyEventReminder(user, event, slot, type, offsetMinutes);
};

/**
 * Stub WhatsApp reminder. Replace with Twilio / Gupshup / Meta Cloud API when ready.
 */
export const sendEventReminderWhatsapp = async (
  user: Pick<IUser, 'firstName' | 'lastName' | 'mobile'>,
  event: Pick<IEvent, 'title' | 'eventCode' | 'mode' | 'location'>,
  slot: IEventSlot,
  type: ReminderType
): Promise<void> => {
  const slotDate = new Date(slot.date).toLocaleDateString('en-IN', {
    weekday: 'long', year: 'numeric', month: 'long', day: 'numeric',
  });

  console.log('─'.repeat(60));
  console.log('💬  [REMINDER WHATSAPP — STUB]');
  console.log(`TO      : ${user.mobile ?? 'N/A'}`);
  console.log(`NAME    : ${user.firstName ?? ''} ${user.lastName ?? ''}`.trim());
  console.log(`MESSAGE :`);
  console.log(`  Hi ${user.firstName ?? 'there'}! Reminder for *${event.title}* (${event.eventCode})`);
  console.log(`  📅 ${slotDate}  🕐 ${slot.startTime}–${slot.endTime}`);
  if (event.mode === 'offline' && event.location) {
    console.log(`  📍 ${event.location}`);
  }
  console.log(`  Reminder type: ${type}`);
  console.log('─'.repeat(60));
};

// ─── scheduleReminders ────────────────────────────────────────────────────────

/**
 * Called by admin event create/update.
 * Merges the canonical reminder configs onto the event's reminderConfigs array,
 * filtered by which offsets the admin has chosen (via event.reminderConfigs).
 * If the event already has reminderConfigs set, they are kept as-is;
 * otherwise the full default set is applied.
 *
 * The cron job reads reminderConfigs at runtime to decide what to send and when.
 * No timers or scheduled tasks are created here — scheduling is purely database-driven.
 */
export const scheduleReminders = (
  existingConfigs: IEvent['reminderConfigs']
): IEvent['reminderConfigs'] => {
  // If admin already supplied a custom set, use it — de-duplicated.
  //
  // Two entries at the same offset are the same reminder written twice: the
  // cron keys `remindersSent` on (slotId, offsetMinutes), so the second copy
  // can never fire and just sits in the list looking like a second reminder the
  // admin will not receive. "2 hours before" typed twice, or once as 120
  // minutes and once as 2 hours, both collapse to one.
  if (existingConfigs && existingConfigs.length > 0) {
    const byOffset = new Map<number, IEvent['reminderConfigs'][number]>();
    for (const config of existingConfigs) {
      if (!byOffset.has(config.offsetMinutes)) byOffset.set(config.offsetMinutes, config);
    }
    return [...byOffset.values()].sort((a, b) => b.offsetMinutes - a.offsetMinutes);
  }
  // Default: enable all four reminder types
  return REMINDER_OFFSETS.map(({ offsetMinutes, offsetLabel }) => ({
    offsetLabel,
    offsetMinutes,
  }));
};
