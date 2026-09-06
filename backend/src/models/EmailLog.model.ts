import mongoose, { Document, Schema } from 'mongoose';

/**
 * Audit trail for every email the system attempts to send.
 *
 * One document per recipient — an event reminder going to 40 registrants
 * writes 40 rows, so "who received what, when, and did it work" is answerable
 * per person rather than per batch.
 *
 * Bodies are retained indefinitely, EXCEPT for templates flagged `sensitive`
 * in the template manifest (auth-login-otp, admin-password-reset). Those store
 * no body and mask their merge values — otherwise this collection would double
 * as a store of live OTPs and working password-reset links.
 */

export type EmailStatus =
  | 'queued' // written, waiting for a delivery attempt
  | 'sending' // claimed by a worker right now
  | 'sent' // provider accepted it (NOT proof of delivery)
  | 'failed' // attempt failed; retried until maxAttempts
  | 'suppressed' // address is on the suppression list
  | 'skipped' // MAIL_ENABLED=false — rendered and logged, never sent
  | 'delivered' // confirmed by provider webhook
  | 'bounced'; // rejected by the receiving server

export interface IEmailAddress {
  address: string;
  name?: string;
}

export interface IEmailLog extends Document {
  templateKey: string;
  templateHash: string;
  category: 'transactional' | 'marketing';
  audience: 'user' | 'admin';

  from: IEmailAddress;
  to: IEmailAddress;
  cc?: IEmailAddress[];
  replyTo?: string;

  subject: string;
  /** Rendered HTML. `select: false` — never loaded unless explicitly asked for. */
  htmlBody?: string;
  /** Merge variables used, after redaction for sensitive templates. */
  mergeData?: Record<string, unknown>;
  attachments?: { name: string; mimeType: string; size: number; cid?: string }[];

  status: EmailStatus;
  attempts: number;
  maxAttempts: number;
  nextAttemptAt?: Date;

  providerMessageId?: string;
  providerRequestId?: string;
  providerResponse?: unknown;
  error?: { message: string; code?: string; httpStatus?: number; at: Date };

  user?: mongoose.Types.ObjectId;
  relatedTo?: { model: string; id: mongoose.Types.ObjectId };
  /** Unique per logical send — stops duplicate reminders for the same user/slot. */
  dedupeKey?: string;

  queuedAt: Date;
  sentAt?: Date;
  failedAt?: Date;
  createdAt: Date;
  updatedAt: Date;
}

const addressSchema = new Schema<IEmailAddress>(
  {
    address: { type: String, required: true, lowercase: true, trim: true },
    name: { type: String, trim: true },
  },
  { _id: false }
);

const emailLogSchema = new Schema<IEmailLog>(
  {
    templateKey: { type: String, required: true, index: true },
    templateHash: { type: String, required: true },
    category: { type: String, enum: ['transactional', 'marketing'], default: 'transactional' },
    audience: { type: String, enum: ['user', 'admin'], default: 'user' },

    from: { type: addressSchema, required: true },
    to: { type: addressSchema, required: true },
    cc: { type: [addressSchema], default: undefined },
    replyTo: { type: String, trim: true },

    subject: { type: String, required: true },
    htmlBody: { type: String, select: false },
    mergeData: { type: Schema.Types.Mixed },
    attachments: {
      type: [
        {
          _id: false,
          name: String,
          mimeType: String,
          size: Number,
          cid: String,
        },
      ],
      default: undefined,
    },

    status: {
      type: String,
      enum: ['queued', 'sending', 'sent', 'failed', 'suppressed', 'skipped', 'delivered', 'bounced'],
      default: 'queued',
    },
    attempts: { type: Number, default: 0 },
    maxAttempts: { type: Number, default: 5 },
    nextAttemptAt: { type: Date },

    providerMessageId: { type: String },
    providerRequestId: { type: String },
    providerResponse: { type: Schema.Types.Mixed },
    error: {
      type: {
        _id: false,
        message: String,
        code: String,
        httpStatus: Number,
        at: Date,
      },
      default: undefined,
    },

    user: { type: Schema.Types.ObjectId, ref: 'User' },
    relatedTo: {
      type: {
        _id: false,
        model: String,
        id: Schema.Types.ObjectId,
      },
      default: undefined,
    },
    dedupeKey: { type: String },

    queuedAt: { type: Date, default: Date.now },
    sentAt: { type: Date },
    failedAt: { type: Date },
  },
  { timestamps: true }
);

emailLogSchema.index({ 'to.address': 1, createdAt: -1 });
emailLogSchema.index({ templateKey: 1, createdAt: -1 });
emailLogSchema.index({ user: 1, createdAt: -1 });
emailLogSchema.index({ 'relatedTo.id': 1 });
// The worker's hot path — claim query filters on exactly these two fields.
emailLogSchema.index({ status: 1, nextAttemptAt: 1 });
// Duplicate enqueues throw E11000, which the mailer swallows deliberately.
emailLogSchema.index({ dedupeKey: 1 }, { unique: true, sparse: true });

export const EmailLog = mongoose.model<IEmailLog>('EmailLog', emailLogSchema);
