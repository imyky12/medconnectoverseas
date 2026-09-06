import mongoose, { Document, Schema } from 'mongoose';
import { ApiError } from '../utils/ApiError';

export interface IEventSlot {
  slotId: string;
  date: Date;
  startTime: string; // "HH:MM" 24-hr
  endTime: string;   // "HH:MM" 24-hr
  totalSeats: number;
  bookedSeats: number;
}

export interface IReminderConfig {
  offsetLabel: string;   // e.g. "3 days before", "10 minutes before"
  offsetMinutes: number; // negative offset from slot start, in minutes
}

export interface IReminderSent {
  slotId: string;
  offsetMinutes: number;
  offsetLabel: string;
  sentAt: Date;
}

export interface IEvent extends Document {
  eventCode: string;
  title: string;
  shortDescription: string;
  description: string;
  bannerUrl: string;
  category: string;
  tags: string[];
  price: number;
  discountedPrice?: number;
  currency: string;
  mode: 'online' | 'offline';
  location?: string;
  meetLink?: string;
  slots: IEventSlot[];
  reminderConfigs: IReminderConfig[];
  remindersSent: IReminderSent[];
  isPublished: boolean;
  totalRegistrations: number;
  notesUrl?: string;
  notesTitle?: string;
  createdAt: Date;
  updatedAt: Date;
}

const eventSlotSchema = new Schema<IEventSlot>(
  {
    slotId: { type: String, required: true },
    date: { type: Date, required: true },
    startTime: { type: String, required: true },
    endTime: { type: String, required: true },
    totalSeats: { type: Number, required: true, min: 1 },
    bookedSeats: { type: Number, default: 0, min: 0 },
  },
  { _id: false }
);

const reminderConfigSchema = new Schema<IReminderConfig>(
  {
    offsetLabel: { type: String, required: true },
    offsetMinutes: { type: Number, required: true },
  },
  { _id: false }
);

const reminderSentSchema = new Schema<IReminderSent>(
  {
    slotId: { type: String, required: true },
    offsetMinutes: { type: Number, required: true },
    offsetLabel: { type: String, required: true },
    sentAt: { type: Date, required: true },
  },
  { _id: false }
);

const eventSchema = new Schema<IEvent>(
  {
    eventCode: {
      type: String,
      required: true,
      unique: true,
      uppercase: true,
      trim: true,
    },
    title: { type: String, required: true, trim: true },
    shortDescription: { type: String, required: true, maxlength: 250 },
    description: { type: String, required: true },
    bannerUrl: { type: String, required: true },
    category: { type: String, required: true, trim: true },
    tags: [{ type: String }],
    price: { type: Number, required: true, min: 0 },
    discountedPrice: { type: Number, min: 0 },
    currency: { type: String, default: 'INR' },
    mode: { type: String, enum: ['online', 'offline'], required: true },
    location: { type: String, trim: true },
    meetLink: { type: String, trim: true },
    slots: { type: [eventSlotSchema], default: [] },
    reminderConfigs: { type: [reminderConfigSchema], default: [] },
    remindersSent: { type: [reminderSentSchema], default: [] },
    isPublished: { type: Boolean, default: false },
    totalRegistrations: { type: Number, default: 0 },
    notesUrl:   { type: String, trim: true },
    notesTitle: { type: String, trim: true },
  },
  {
    timestamps: true,
  }
);

/**
 * Everything an event has to be true about itself, in one place.
 *
 * These were previously enforced nowhere, so the API accepted events that could
 * not work: a slot ending before it started, two slots sharing a slotId, a
 * "discount" above the list price, an event with no slots at all. The admin
 * form guards some of them, but the form is not the only way in.
 *
 * `previousSlots` is passed on an edit. Slots that already exist and have not
 * moved are exempt from the "not in the past" rule — otherwise every old event
 * would become uneditable, and fixing a typo in a description would be blocked
 * by a date nobody was touching.
 */
const HHMM = /^([01]\d|2[0-3]):([0-5]\d)$/;

interface EventShape {
  mode?: string;
  location?: string;
  price?: number;
  discountedPrice?: number;
  slots?: IEventSlot[];
}

export function validateEventShape(
  doc: EventShape,
  previousSlots?: IEventSlot[]
): string | null {
  if (doc.mode === 'offline' && !doc.location?.trim()) {
    return 'Location is required for offline events';
  }

  // A "discount" at or above the list price is not a discount. Equal is also
  // wrong: it renders as a strike-through against an identical number.
  if (
    typeof doc.discountedPrice === 'number' &&
    typeof doc.price === 'number' &&
    doc.discountedPrice >= doc.price
  ) {
    return `Discounted price (${doc.discountedPrice}) must be below the full price (${doc.price})`;
  }

  const slots = doc.slots ?? [];
  if (slots.length === 0) {
    return 'An event needs at least one slot — there is nothing to register for otherwise';
  }

  // slotId is the key used everywhere: registrations store it, seat counts
  // increment through `slots.$.bookedSeats` by matching it, and the reminder
  // cron keys `remindersSent` on it. A duplicate makes the positional operator
  // hit whichever comes first, silently crediting the wrong slot.
  const seen = new Set<string>();
  for (const slot of slots) {
    if (seen.has(slot.slotId)) {
      return `Two slots share the id "${slot.slotId}" — slot ids must be unique within an event`;
    }
    seen.add(slot.slotId);
  }

  const previous = new Map(
    (previousSlots ?? []).map((s) => [s.slotId, s])
  );
  const now = Date.now();

  for (const slot of slots) {
    if (!HHMM.test(slot.startTime) || !HHMM.test(slot.endTime)) {
      return `Slot "${slot.slotId}" needs times as HH:MM (24-hour)`;
    }
    if (slot.endTime <= slot.startTime) {
      return `Slot "${slot.slotId}" ends at ${slot.endTime}, which is not after it starts at ${slot.startTime}`;
    }

    const before = previous.get(slot.slotId);
    const unchanged =
      before &&
      new Date(before.date).getTime() === new Date(slot.date).getTime() &&
      before.startTime === slot.startTime;
    if (unchanged) continue; // grandfathered: it was already like this

    const [h, m] = slot.startTime.split(':').map(Number);
    const startsAt = new Date(slot.date);
    startsAt.setHours(h, m, 0, 0);
    if (startsAt.getTime() < now) {
      return `Slot "${slot.slotId}" starts in the past — nobody would be able to register for it`;
    }
  }

  return null;
}

// Runs for create() and save().
//
// An `ApiError` rather than a plain `Error`: a hook that calls `next(new Error())`
// produces something Mongoose passes through untouched, which the error handler
// cannot tell apart from a genuine crash — so a perfectly good rejection came
// back as "Internal server error". `ApiError` carries the status with it.
eventSchema.pre('validate', function (next) {
  const problem = validateEventShape(this as unknown as EventShape);
  return problem ? next(new ApiError(400, problem)) : next();
});

/**
 * Runs for findByIdAndUpdate / findOneAndUpdate.
 *
 * `runValidators: true` applies field-level rules but never fires `pre('save')`,
 * so before this hook existed an edit could write states that a create would
 * have refused — including the offline-without-a-location case that was
 * supposedly already guarded. The current document is loaded and merged with
 * the update so partial edits are judged on the result, not on the fragment.
 */
eventSchema.pre('findOneAndUpdate', async function (next) {
  const update = (this.getUpdate() ?? {}) as Record<string, unknown> & { $set?: Record<string, unknown> };
  const patch = { ...update, ...(update.$set ?? {}) };

  const current = await this.model.findOne(this.getQuery()).lean<IEvent>();
  if (!current) return next();

  const merged: EventShape = {
    mode: (patch.mode as string) ?? current.mode,
    location: (patch.location as string) ?? current.location,
    price: (patch.price as number) ?? current.price,
    discountedPrice:
      patch.discountedPrice !== undefined
        ? (patch.discountedPrice as number)
        : current.discountedPrice,
    slots: (patch.slots as IEventSlot[]) ?? current.slots,
  };

  const problem = validateEventShape(merged, current.slots);
  return problem ? next(new ApiError(400, problem)) : next();
});

eventSchema.index({ isPublished: 1 });
eventSchema.index({ 'slots.date': 1 });
eventSchema.index({ category: 1 });

export const Event = mongoose.model<IEvent>('Event', eventSchema);
