import mongoose, { Document, Schema } from 'mongoose';

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

// Validate: offline events must have a location
eventSchema.pre('save', function (next) {
  if (this.mode === 'offline' && !this.location?.trim()) {
    return next(new Error('Location is required for offline events'));
  }
  next();
});

eventSchema.index({ isPublished: 1 });
eventSchema.index({ 'slots.date': 1 });
eventSchema.index({ category: 1 });

export const Event = mongoose.model<IEvent>('Event', eventSchema);
