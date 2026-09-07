import mongoose, { Document, Schema } from 'mongoose';

/**
 * One address on the newsletter list.
 *
 * As with the contact form, the signup was entirely cosmetic: it thanked the
 * person and recorded nothing, so every subscriber gathered so far is gone.
 *
 * `unsubscribedAt` rather than deleting the row: re-subscribing should not
 * silently resurrect someone who opted out, and a bare delete leaves no way to
 * tell "never subscribed" from "asked to be removed" — which matters if anyone
 * ever asks why they stopped receiving it.
 */

export interface INewsletterSubscriber extends Document {
  email: string;
  source: 'footer' | 'newsletter-page' | 'other';
  isActive: boolean;
  unsubscribedAt?: Date;
  createdAt: Date;
  updatedAt: Date;
}

const newsletterSubscriberSchema = new Schema<INewsletterSubscriber>(
  {
    email: { type: String, required: true, unique: true, lowercase: true, trim: true },
    source: {
      type: String,
      enum: ['footer', 'newsletter-page', 'other'],
      default: 'other',
    },
    isActive: { type: Boolean, default: true },
    unsubscribedAt: { type: Date },
  },
  { timestamps: true }
);

export const NewsletterSubscriber = mongoose.model<INewsletterSubscriber>(
  'NewsletterSubscriber',
  newsletterSubscriberSchema
);
