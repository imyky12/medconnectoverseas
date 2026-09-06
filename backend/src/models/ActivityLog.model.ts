import mongoose, { Document, Schema } from 'mongoose';

/**
 * Who did what, and when — for admins and students alike.
 *
 * One collection rather than two, because the questions asked of it cross the
 * boundary constantly: "who approved this payment", "what did this student do
 * before they complained", "everything that touched this event". Splitting
 * admin and user activity would mean joining them back together for most of
 * those. `actorType` separates them where it matters.
 *
 * **Actor details are snapshotted, not referenced.** An audit row that says
 * "deleted by <ref to a record that no longer exists>" is useless precisely
 * when it is needed most. The id is kept for filtering; the name and email are
 * copied so the row still reads correctly after the account is gone.
 */

export type ActorType = 'admin' | 'user' | 'system';

export interface IActivityLog extends Document {
  actorType: ActorType;
  actorId?: mongoose.Types.ObjectId;
  actorName: string;
  actorEmail: string;
  /** Dotted and stable, e.g. `event.create`, `order.approve`, `policy.publish`. */
  action: string;
  /** One sentence, already readable — the log is browsed, not just queried. */
  summary: string;
  targetType?: string;
  targetId?: string;
  /** Human label for the target, snapshotted for the same reason as the actor. */
  targetLabel?: string;
  method?: string;
  path?: string;
  statusCode?: number;
  /** Whether the underlying request actually succeeded. */
  success: boolean;
  ipAddress?: string;
  userAgent?: string;
  /** Anything worth keeping: changed fields, a rejection reason, an amount. */
  metadata?: Record<string, unknown>;
  createdAt: Date;
}

const activityLogSchema = new Schema<IActivityLog>(
  {
    actorType: { type: String, enum: ['admin', 'user', 'system'], required: true, index: true },
    actorId: { type: Schema.Types.ObjectId },
    actorName: { type: String, default: 'Unknown' },
    actorEmail: { type: String, default: '' },
    action: { type: String, required: true, index: true },
    summary: { type: String, required: true },
    targetType: { type: String },
    targetId: { type: String },
    targetLabel: { type: String },
    method: { type: String },
    path: { type: String },
    statusCode: { type: Number },
    success: { type: Boolean, default: true },
    ipAddress: { type: String },
    userAgent: { type: String },
    metadata: { type: Schema.Types.Mixed },
  },
  // `updatedAt` would be meaningless: an audit row is written once and never
  // edited. Being able to edit one would defeat the point of having it.
  { timestamps: { createdAt: true, updatedAt: false } }
);

// The three ways this actually gets read: newest first, one actor's history,
// and everything that touched one record.
activityLogSchema.index({ createdAt: -1 });
activityLogSchema.index({ actorType: 1, createdAt: -1 });
activityLogSchema.index({ actorId: 1, createdAt: -1 });
activityLogSchema.index({ targetType: 1, targetId: 1, createdAt: -1 });

export const ActivityLog = mongoose.model<IActivityLog>('ActivityLog', activityLogSchema);
