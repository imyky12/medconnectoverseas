import mongoose, { Document, Schema } from 'mongoose';

export interface IEventRegistration extends Document {
  user: mongoose.Types.ObjectId;
  event: mongoose.Types.ObjectId;
  slotId: string;
  order: mongoose.Types.ObjectId;       // always points to the Order that covers payment
  status: 'pending' | 'approved' | 'rejected';
  // Set on approval — UUID string used as QR payload
  qrToken?: string;
  // Base64 PNG of the QR code, stored so the user can render it directly
  qrCodeImage?: string;
  attended: boolean;
  // Set server-side on first download (client-side certificate, event-level notes)
  certificateDownloadedAt?: Date;
  notesAccessedAt?: Date;
  createdAt: Date;
  updatedAt: Date;
}

const eventRegistrationSchema = new Schema<IEventRegistration>(
  {
    user:    { type: Schema.Types.ObjectId, ref: 'User',  required: true },
    event:   { type: Schema.Types.ObjectId, ref: 'Event', required: true },
    slotId:  { type: String, required: true, trim: true },
    order:   { type: Schema.Types.ObjectId, ref: 'Order', required: true },
    status: {
      type: String,
      enum: ['pending', 'approved', 'rejected'],
      default: 'pending',
    },
    qrToken:    { type: String, unique: true, sparse: true },
    qrCodeImage:{ type: String },
    attended:   { type: Boolean, default: false },
    certificateDownloadedAt: { type: Date },
    notesAccessedAt:         { type: Date },
  },
  {
    timestamps: true,
  }
);

eventRegistrationSchema.index({ user: 1, event: 1 });
eventRegistrationSchema.index({ event: 1, slotId: 1 });
eventRegistrationSchema.index({ status: 1 });
eventRegistrationSchema.index({ order: 1 });
// qrToken lookup must be fast — used in every attendance scan
eventRegistrationSchema.index({ qrToken: 1 });

export const EventRegistration = mongoose.model<IEventRegistration>(
  'EventRegistration',
  eventRegistrationSchema
);
