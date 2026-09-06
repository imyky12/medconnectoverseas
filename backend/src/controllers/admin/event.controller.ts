import { Request, Response } from 'express';
import { asyncHandler } from '../../utils/asyncHandler';
import { ApiResponse } from '../../utils/ApiResponse';
import { ApiError } from '../../utils/ApiError';
import { Event, IEvent, IEventSlot } from '../../models/Event.model';
import { EventRegistration } from '../../models/EventRegistration.model';
import { IUser } from '../../models/User.model';
import { scheduleReminders } from '../../services/reminder.service';
import {
  notifyEventRescheduled,
  notifyEventCancelled,
} from '../../services/email/notifications';

// ─── Helpers ──────────────────────────────────────────────────────────────────

const generateEventCode = () =>
  'EV' + Math.random().toString(36).substring(2, 7).toUpperCase();

// ─── CRUD ─────────────────────────────────────────────────────────────────────

export const getAllEvents = asyncHandler(async (_req: Request, res: Response) => {
  const events = await Event.find().lean();

  const withCounts = await Promise.all(
    events.map(async (event) => {
      const registrationCount = await EventRegistration.countDocuments({ event: event._id });
      return { ...event, registrationCount };
    })
  );

  // Sort by the nearest upcoming slot date ascending; events with no slots go last
  withCounts.sort((a, b) => {
    const nearestSlot = (e: typeof a) => {
      const futureDates = e.slots
        .map((s) => new Date(s.date).getTime())
        .filter((t) => t >= Date.now());
      return futureDates.length ? Math.min(...futureDates) : Infinity;
    };
    return nearestSlot(a) - nearestSlot(b);
  });

  res.status(200).json(new ApiResponse(200, withCounts, 'Events fetched'));
});

export const getEventById = asyncHandler(async (req: Request, res: Response) => {
  const { id } = req.params;
  const event = await Event.findById(id).lean();
  if (!event) throw new ApiError(404, 'Event not found');

  // Count registrations per slot (approved + pending + rejected breakdown)
  const slotCounts = await EventRegistration.aggregate([
    { $match: { event: event._id } },
    { $group: { _id: '$slotId', total: { $sum: 1 }, approved: { $sum: { $cond: [{ $eq: ['$status', 'approved'] }, 1, 0] } }, pending: { $sum: { $cond: [{ $eq: ['$status', 'pending'] }, 1, 0] } }, rejected: { $sum: { $cond: [{ $eq: ['$status', 'rejected'] }, 1, 0] } } } },
  ]);

  const slotCountMap = Object.fromEntries(
    slotCounts.map((s) => [s._id, { total: s.total, approved: s.approved, pending: s.pending, rejected: s.rejected }])
  );

  const slotsWithCounts = event.slots.map((slot) => ({
    ...slot,
    registrations: slotCountMap[slot.slotId] ?? { total: 0, approved: 0, pending: 0, rejected: 0 },
  }));

  const totalRegistrations = slotCounts.reduce((sum, s) => sum + s.total, 0);

  res.status(200).json(
    new ApiResponse(200, { ...event, slots: slotsWithCounts, totalRegistrations }, 'Event fetched')
  );
});

export const createEvent = asyncHandler(async (req: Request, res: Response) => {
  const eventData = { ...req.body };

  // Auto-generate unique eventCode
  let eventCode = generateEventCode();
  while (await Event.exists({ eventCode })) {
    eventCode = generateEventCode();
  }
  eventData.eventCode = eventCode;

  // Ensure every slot has a unique slotId if not provided
  if (Array.isArray(eventData.slots)) {
    eventData.slots = eventData.slots.map((slot: any, idx: number) => ({
      ...slot,
      slotId: slot.slotId || `${eventCode}-S${idx + 1}`,
      bookedSeats: 0,
    }));
  }

  // Apply reminder configs (default all four types if none supplied)
  eventData.reminderConfigs = scheduleReminders(eventData.reminderConfigs ?? []);

  const event = await Event.create(eventData);
  res.status(201).json(new ApiResponse(201, event, 'Event created successfully'));
});

export const updateEvent = asyncHandler(async (req: Request, res: Response) => {
  const { id } = req.params;
  const updateData = { ...req.body };

  // Snapshot the slots before the write so we can diff timings afterwards.
  const before = await Event.findById(id).select('slots').lean();

  // Re-apply reminder configs if admin is sending an updated set
  if (updateData.reminderConfigs !== undefined) {
    updateData.reminderConfigs = scheduleReminders(updateData.reminderConfigs);
  }

  // Protect bookedSeats from being overwritten via update
  if (Array.isArray(updateData.slots)) {
    const existing = await Event.findById(id).select('slots');
    if (existing) {
      const bookedMap = new Map(
        existing.slots.map((s) => [s.slotId, s.bookedSeats])
      );
      updateData.slots = updateData.slots.map((slot: any) => ({
        ...slot,
        bookedSeats: bookedMap.get(slot.slotId) ?? slot.bookedSeats ?? 0,
      }));
    }
  }

  const event = await Event.findByIdAndUpdate(id, updateData, {
    new: true,
    runValidators: true,
  });
  if (!event) throw new ApiError(404, 'Event not found');

  // Notify registrants only when a slot's date or time actually moved —
  // editing a description must not mail everybody.
  if (before) {
    void broadcastSlotReschedules(event, before.slots, req.body.changeNote);
  }

  res.status(200).json(new ApiResponse(200, event, 'Event updated successfully'));
});

export const deleteEvent = asyncHandler(async (req: Request, res: Response) => {
  const { id } = req.params;

  // Collect registrants BEFORE deleting — afterwards the event is gone and
  // there is no way to tell anyone it was cancelled.
  const event = await Event.findById(id);
  if (!event) throw new ApiError(404, 'Event not found');

  const registrations = await EventRegistration.find({
    event: event._id,
    status: 'approved',
  }).populate<{ user: IUser }>('user', 'firstName lastName email');

  const reason = typeof req.body?.cancellationReason === 'string' ? req.body.cancellationReason : undefined;

  for (const reg of registrations) {
    if (!reg.user?.email) continue;
    const slot = event.slots.find((s) => s.slotId === reg.slotId);
    void notifyEventCancelled(reg.user, event, slot, reason);
  }

  await Event.findByIdAndDelete(id);

  res.status(200).json(
    new ApiResponse(
      200,
      { cancellationEmailsQueued: registrations.length },
      'Event deleted successfully'
    )
  );
});

/**
 * Diffs old vs new slots and mails the approved registrants of any slot whose
 * date or start/end time changed. Fire-and-forget; failures are logged, never
 * surfaced to the admin who saved the edit.
 */
async function broadcastSlotReschedules(
  event: IEvent,
  oldSlots: IEventSlot[],
  changeNote?: string
): Promise<void> {
  try {
    const oldById = new Map(oldSlots.map((s) => [s.slotId, s]));

    for (const slot of event.slots) {
      const old = oldById.get(slot.slotId);
      if (!old) continue;

      const moved =
        new Date(old.date).getTime() !== new Date(slot.date).getTime() ||
        old.startTime !== slot.startTime ||
        old.endTime !== slot.endTime;
      if (!moved) continue;

      const registrations = await EventRegistration.find({
        event: event._id,
        slotId: slot.slotId,
        status: 'approved',
      }).populate<{ user: IUser }>('user', 'firstName lastName email');

      for (const reg of registrations) {
        if (!reg.user?.email) continue;
        await notifyEventRescheduled(reg.user, event, old, slot, changeNote);
      }

      console.log(
        `[event] slot ${slot.slotId} of ${event.eventCode} rescheduled — ${registrations.length} registrant(s) notified`
      );
    }
  } catch (err) {
    console.error('[event] reschedule notification failed:', err);
  }
}
