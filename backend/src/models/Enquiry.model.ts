import mongoose, { Document, Schema } from 'mongoose';

/**
 * A message sent through the public contact form.
 *
 * There was no model, no controller and no route: the form showed
 * "Message Sent! Thank you for reaching out" and made **zero** network
 * requests. Every enquiry a prospective student ever sent was discarded the
 * moment the tab closed, with nothing to recover it from.
 *
 * Stored first, emailed second. Email can fail; the record is the thing that
 * must not be lost, and it is what makes an enquiry recoverable if the mail
 * bounces or an admin deletes it.
 */

export type EnquiryStatus = 'new' | 'in_progress' | 'closed';

export interface IEnquiry extends Document {
  ticketId: string;
  name: string;
  email: string;
  mobile?: string;
  subject: string;
  message: string;
  status: EnquiryStatus;
  /** Kept for abuse investigation, not shown anywhere. */
  ipAddress?: string;
  createdAt: Date;
  updatedAt: Date;
}

const enquirySchema = new Schema<IEnquiry>(
  {
    // Short and human-readable, because it is quoted back in the
    // acknowledgement email and someone may read it out over the phone.
    ticketId: { type: String, required: true, unique: true, uppercase: true, trim: true },
    name: { type: String, required: true, trim: true, maxlength: 120 },
    email: { type: String, required: true, lowercase: true, trim: true },
    mobile: { type: String, trim: true },
    subject: { type: String, required: true, trim: true, maxlength: 200 },
    message: { type: String, required: true, trim: true, maxlength: 5000 },
    status: { type: String, enum: ['new', 'in_progress', 'closed'], default: 'new' },
    ipAddress: { type: String },
  },
  { timestamps: true }
);

enquirySchema.index({ status: 1, createdAt: -1 });
enquirySchema.index({ email: 1 });

export const Enquiry = mongoose.model<IEnquiry>('Enquiry', enquirySchema);
