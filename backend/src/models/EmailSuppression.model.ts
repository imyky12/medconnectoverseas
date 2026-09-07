import mongoose, { Document, Schema } from 'mongoose';

/**
 * Addresses we must stop mailing.
 *
 * Populated manually for now; the ZeptoMail bounce/complaint webhook will feed
 * it automatically once that endpoint exists. Checked before every send —
 * continuing to mail hard bounces is what wrecks a sending domain's reputation.
 */
export interface IEmailSuppression extends Document {
  address: string;
  reason: 'bounced' | 'complained' | 'unsubscribed' | 'manual';
  /** Marketing-only suppression still allows transactional mail through. */
  scope: 'all' | 'marketing';
  note?: string;
  createdAt: Date;
  updatedAt: Date;
}

const emailSuppressionSchema = new Schema<IEmailSuppression>(
  {
    address: { type: String, required: true, unique: true, lowercase: true, trim: true },
    reason: {
      type: String,
      enum: ['bounced', 'complained', 'unsubscribed', 'manual'],
      required: true,
    },
    scope: { type: String, enum: ['all', 'marketing'], default: 'all' },
    note: { type: String, trim: true },
  },
  { timestamps: true }
);

export const EmailSuppression = mongoose.model<IEmailSuppression>(
  'EmailSuppression',
  emailSuppressionSchema
);
