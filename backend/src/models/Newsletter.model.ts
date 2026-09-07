import mongoose, { Document, Schema } from 'mongoose';

/**
 * One published issue of the newsletter.
 *
 * The whole point of this model is the split between what is public and what is
 * not. `title`, `summary`, `coverImageUrl` and the date describe the issue and
 * are meant to be seen — they are what makes someone want to read it. `fileUrl`
 * is the PDF itself and **must never appear in a public response**: it is a
 * plain HTTPS address, so anything that emits it has given the file away, and no
 * amount of gating in the interface would matter after that.
 *
 * Every read path that serves the public therefore selects fields explicitly
 * rather than returning the document — see `PUBLIC_FIELDS`.
 */

export interface INewsletter extends Document {
  title: string;
  /** Human label for the issue, e.g. "April 2026" or "Issue 12". */
  edition: string;
  summary: string;
  coverImageUrl?: string;
  /** The PDF. Server-side only. */
  fileUrl: string;
  /**
   * Cloudinary's id for the PDF, e.g. `medconnect/newsletters/newsletter-…`.
   *
   * Needed because the raw file is **not** publicly deliverable — Cloudinary
   * answers 401 for it. The server mints a signed, time-limited download URL
   * from this id when streaming, so the asset stays unreachable to anyone who
   * merely knows its address.
   */
  filePublicId?: string;
  fileSizeBytes?: number;
  pageCount?: number;
  isPublished: boolean;
  publishedAt?: Date;
  /** How many verified downloads this issue has had. */
  downloadCount: number;
  /** When subscribers were last emailed about this issue, and how many. */
  notifiedAt?: Date;
  notifiedCount?: number;
  createdByName?: string;
  createdByEmail?: string;
  createdAt: Date;
  updatedAt: Date;
}

/**
 * The only fields a public request may ever receive.
 *
 * Written as a constant and used by every public query, so adding a field to the
 * model does not silently start publishing it — the decision to expose something
 * has to be made here, deliberately.
 */
export const PUBLIC_FIELDS =
  'title edition summary coverImageUrl publishedAt downloadCount pageCount fileSizeBytes';

const newsletterSchema = new Schema<INewsletter>(
  {
    title: { type: String, required: true, trim: true, maxlength: 200 },
    edition: { type: String, required: true, trim: true, maxlength: 60 },
    summary: { type: String, required: true, trim: true, maxlength: 600 },
    coverImageUrl: { type: String, trim: true },
    fileUrl: { type: String, required: true, trim: true },
    filePublicId: { type: String, trim: true },
    fileSizeBytes: { type: Number },
    pageCount: { type: Number },
    isPublished: { type: Boolean, default: false },
    publishedAt: { type: Date },
    downloadCount: { type: Number, default: 0 },
    notifiedAt: { type: Date },
    notifiedCount: { type: Number, default: 0 },
    // Snapshotted for the same reason as everywhere else in this codebase: the
    // row should still say who added it after that admin is gone.
    createdByName: { type: String },
    createdByEmail: { type: String },
  },
  { timestamps: true }
);

newsletterSchema.index({ isPublished: 1, publishedAt: -1 });

export const Newsletter = mongoose.model<INewsletter>('Newsletter', newsletterSchema);
