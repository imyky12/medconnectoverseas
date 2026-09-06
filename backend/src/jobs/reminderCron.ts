import cron from 'node-cron';
import { Event } from '../models/Event.model';
import { EventRegistration } from '../models/EventRegistration.model';
import {
  sendEventReminderEmail,
  sendEventReminderWhatsapp,
  ReminderType,
} from '../services/reminder.service';

/**
 * For a given slot date + reminderConfig offsetMinutes, calculate the exact
 * UTC timestamp at which the reminder should fire.
 *
 * Special case — "day_of_8am": instead of offsetMinutes before slot start,
 * this fires at 08:00 on the day of the slot (local date, UTC stored).
 */
function getReminderFireTime(slotDate: Date, startTime: string, offsetLabel: string, offsetMinutes: number): Date {
  if (offsetLabel === 'day_of_8am') {
    // Fire at 08:00 on the calendar date of the slot
    const fireTime = new Date(slotDate);
    fireTime.setHours(8, 0, 0, 0);
    return fireTime;
  }

  // Parse slot start into a full Date
  const [startH, startM] = startTime.split(':').map(Number);
  const slotStart = new Date(slotDate);
  slotStart.setHours(startH, startM, 0, 0);

  // Fire offsetMinutes before slot start
  return new Date(slotStart.getTime() - offsetMinutes * 60 * 1000);
}

/** Absolute start time of a slot, from its date plus "HH:MM" start. */
function getSlotStart(slotDate: Date, startTime: string): Date {
  const [h, m] = startTime.split(':').map(Number);
  const start = new Date(slotDate);
  start.setHours(h, m, 0, 0);
  return start;
}

/**
 * Whether a reminder's window is currently open.
 *
 * This replaces the old ±1-minute "is it due right now" check, which was a
 * knife edge: if the cron was down, slow, or rescheduled across that minute,
 * the reminder was lost forever. A window instead stays open from its fire
 * time until the slot begins, and duplicate sends are prevented downstream by
 * the per-user dedupeKey on EmailLog rather than by timing precision.
 */
function isWindowOpen(fireTime: Date, slotStart: Date, now: Date): boolean {
  return now >= fireTime && now < slotStart;
}

/**
 * Build a compound key used to deduplicate remindersSent entries.
 */
function sentKey(slotId: string, offsetLabel: string): string {
  return `${slotId}::${offsetLabel}`;
}

/**
 * Core reminder processing function.
 * Exported so it can be called manually (e.g. in tests or a one-off script).
 */
export async function processReminders(): Promise<void> {
  const now = new Date();

  // Only consider published events whose slots haven't all passed yet
  const events = await Event.find({
    isPublished: true,
    'slots.date': { $gte: new Date(now.getTime() - 24 * 60 * 60 * 1000) }, // include slots from up to 1 day ago to catch stragglers
  }).lean();

  for (const event of events) {
    if (!event.reminderConfigs || event.reminderConfigs.length === 0) continue;

    // Map of key -> when that reminder first fired. Unlike before, this is NOT
    // used to skip the reminder entirely; it tells us how far back to look for
    // registrants who were approved after the first pass.
    const firstFiredAt = new Map(
      (event.remindersSent ?? []).map((r) => [sentKey(r.slotId, r.offsetLabel), new Date(r.sentAt)])
    );

    const newlySent: { slotId: string; offsetMinutes: number; sentAt: Date; offsetLabel: string }[] = [];
    // Watermark advances for reminders that already have a marker — without
    // this, a late registrant stays inside the incremental window forever and
    // is re-selected on every tick (harmless for email thanks to the dedupeKey,
    // but the WhatsApp sender has no such guard).
    const watermarkUpdates: { slotId: string; offsetLabel: string; sentAt: Date }[] = [];

    for (const slot of event.slots) {
      for (const config of event.reminderConfigs) {
        const key = sentKey(slot.slotId, config.offsetLabel);
        const alreadyFiredAt = firstFiredAt.get(key);

        const fireTime = getReminderFireTime(
          new Date(slot.date),
          slot.startTime,
          config.offsetLabel,
          config.offsetMinutes
        );
        const slotStart = getSlotStart(new Date(slot.date), slot.startTime);

        if (!isWindowOpen(fireTime, slotStart, now)) continue;

        // First pass: everyone approved for this slot.
        // Later passes: only people approved SINCE the first pass — normally
        // an empty, indexed query. This is what lets a registrant whose payment
        // is approved after the reminder already fired still receive it.
        const filter: Record<string, unknown> = {
          event: event._id,
          slotId: slot.slotId,
          status: 'approved',
        };
        if (alreadyFiredAt) filter.updatedAt = { $gt: alreadyFiredAt };

        // Taken BEFORE the query so anything approved while it runs falls after
        // the new watermark and is picked up on the next tick rather than lost.
        const passStartedAt = new Date();

        const registrations = await EventRegistration.find(filter).populate<{ user: any }>(
          'user',
          'firstName lastName email mobile'
        );

        if (registrations.length === 0) {
          // Record the first pass even with nobody registered, so subsequent
          // ticks switch to the cheap incremental query above.
          if (!alreadyFiredAt) {
            newlySent.push({
              slotId: slot.slotId,
              offsetMinutes: config.offsetMinutes,
              offsetLabel: config.offsetLabel,
              sentAt: passStartedAt,
            });
          }
          continue;
        }

        const reminderType = config.offsetLabel as ReminderType;

        // Send to each registered user
        for (const reg of registrations) {
          const user = reg.user;
          if (!user) continue;

          try {
            await sendEventReminderEmail(user, event, slot, reminderType, config.offsetMinutes);
          } catch (err) {
            console.error(`[ReminderCron] Email failed for user ${user._id} event ${event.eventCode}:`, err);
          }

          try {
            await sendEventReminderWhatsapp(user, event, slot, reminderType);
          } catch (err) {
            console.error(`[ReminderCron] WhatsApp failed for user ${user._id} event ${event.eventCode}:`, err);
          }
        }

        console.log(
          `[ReminderCron] Queued "${config.offsetLabel}" reminder for ${event.eventCode} slot ${slot.slotId} ` +
            `to ${registrations.length} user(s)${alreadyFiredAt ? ' (late registrants catch-up)' : ''}`
        );

        if (alreadyFiredAt) {
          // Catch-up pass — move the watermark past the people just handled.
          watermarkUpdates.push({
            slotId: slot.slotId,
            offsetLabel: config.offsetLabel,
            sentAt: passStartedAt,
          });
        } else {
          newlySent.push({
            slotId: slot.slotId,
            offsetMinutes: config.offsetMinutes,
            offsetLabel: config.offsetLabel,
            sentAt: passStartedAt,
          });
        }
      }
    }

    // Persist sent records in a single atomic update per event
    if (newlySent.length > 0) {
      await Event.updateOne(
        { _id: event._id },
        { $push: { remindersSent: { $each: newlySent } } }
      );
    }

    // Advance watermarks for reminders that had already fired.
    for (const w of watermarkUpdates) {
      await Event.updateOne(
        { _id: event._id },
        { $set: { 'remindersSent.$[el].sentAt': w.sentAt } },
        { arrayFilters: [{ 'el.slotId': w.slotId, 'el.offsetLabel': w.offsetLabel }] }
      );
    }
  }
}

/**
 * Registers the cron schedule and starts it.
 *
 * Schedule:
 *   - Development : every 1 minute  ("* * * * *")
 *   - Production  : every 5 minutes ("* /5 * * * *") — reduces DB load
 *
 * Called once at server startup. Safe to call multiple times (node-cron
 * schedules are independent instances).
 */
export function startReminderCron(): void {
  const schedule = process.env.NODE_ENV === 'production' ? '*/5 * * * *' : '* * * * *';

  cron.schedule(schedule, async () => {
    try {
      await processReminders();
    } catch (err) {
      console.error('[ReminderCron] Unhandled error during reminder processing:', err);
    }
  });

  console.log(`⏰  Reminder cron started (schedule: "${schedule}")`);
}
