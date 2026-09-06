import mongoose, { Document, Schema } from 'mongoose';

/**
 * A legal document — Terms & Conditions, Privacy Policy — held as Markdown.
 *
 * These change, and the change matters legally: someone who agreed in March
 * agreed to the March wording, not today's. So every publish is kept as an
 * immutable version, and the live copy is only ever replaced by publishing.
 *
 * Draft and published are separate fields on purpose. Editing must never alter
 * what the public is reading, which rules out "edit in place and flip a flag" —
 * a half-finished sentence would be live the moment it was typed.
 */

export interface IPolicyVersion {
  version: number;
  content: string;
  title: string;
  publishedAt: Date;
  /** The date the wording actually took effect — see `effectiveDate` below. */
  effectiveDate?: Date;
  publishedByName: string;
  publishedByEmail: string;
  publishedById?: mongoose.Types.ObjectId;
  /** Optional note from the admin: what changed and why. */
  changeNote?: string;
}

export interface IPolicyDocument extends Document {
  slug: string;
  title: string;
  /** What the public sees. Empty until the first publish. */
  publishedContent: string;
  publishedVersion: number;
  publishedAt?: Date;
  publishedByName?: string;
  publishedByEmail?: string;
  /**
   * The date shown to visitors as "Last updated".
   *
   * Separate from `publishedAt` on purpose. Publishing is an *action* — it also
   * happens when correcting a typo, restoring an older wording, or fixing a
   * broken link, none of which change what the reader agreed to. Tying the
   * public date to the click would announce that the terms changed today when
   * they did not, which is worse than saying nothing.
   *
   * Defaults to the publish time when the admin does not set one.
   */
  effectiveDate?: Date;
  /** Work in progress. Seeded from the published copy when editing starts. */
  draftContent: string;
  draftUpdatedAt?: Date;
  draftUpdatedByName?: string;
  draftUpdatedByEmail?: string;
  /** Every publish, oldest first. Never edited, never removed. */
  versions: IPolicyVersion[];
  createdAt: Date;
  updatedAt: Date;
}

const policyVersionSchema = new Schema<IPolicyVersion>(
  {
    version: { type: Number, required: true },
    content: { type: String, required: true },
    title: { type: String, required: true },
    publishedAt: { type: Date, required: true },
    effectiveDate: { type: Date },
    // Snapshotted, like the activity log: "published by <deleted admin>" is not
    // an answer anybody can act on.
    publishedByName: { type: String, required: true },
    publishedByEmail: { type: String, default: '' },
    publishedById: { type: Schema.Types.ObjectId },
    changeNote: { type: String, trim: true, maxlength: 500 },
  },
  { _id: false }
);

const policyDocumentSchema = new Schema<IPolicyDocument>(
  {
    slug: { type: String, required: true, unique: true, lowercase: true, trim: true },
    title: { type: String, required: true, trim: true },
    publishedContent: { type: String, default: '' },
    publishedVersion: { type: Number, default: 0 },
    publishedAt: { type: Date },
    publishedByName: { type: String },
    publishedByEmail: { type: String },
    effectiveDate: { type: Date },
    draftContent: { type: String, default: '' },
    draftUpdatedAt: { type: Date },
    draftUpdatedByName: { type: String },
    draftUpdatedByEmail: { type: String },
    versions: { type: [policyVersionSchema], default: [] },
  },
  { timestamps: true }
);

export const PolicyDocument = mongoose.model<IPolicyDocument>(
  'PolicyDocument',
  policyDocumentSchema
);
