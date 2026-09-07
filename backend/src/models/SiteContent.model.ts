import mongoose, { Document, Schema } from 'mongoose';

/**
 * The editable content of the public site.
 *
 * Testimonials, the impact numbers, the FAQ, the founders, the activities — all
 * of it used to be hardcoded in the React components, which meant every
 * correction was a code change and a deploy, and it meant nobody could tell
 * which figures were real.
 *
 * **One collection with a `section` rather than six models.** They are all the
 * same shape underneath: an ordered list of items, each with a heading, some
 * body text, optionally a picture. Six near-identical models and six near-
 * identical admin screens would be six places to fix the next bug in. The field
 * names are generic on purpose (`heading`, `body`) and the admin form labels
 * them per section, so a testimonial's `heading` is the person's name while an
 * FAQ's is the question.
 */

export const SECTIONS = ['testimonial', 'stat', 'faq', 'founder', 'activity'] as const;
export type SectionKey = (typeof SECTIONS)[number];

export interface ISiteContent extends Document {
  section: SectionKey;
  /** Ascending. Ties fall back to creation order. */
  order: number;
  isPublished: boolean;

  /** Name · label · question · title, depending on the section. */
  heading: string;
  /** Role, for a testimonial or a founder. */
  subheading?: string;
  /** Quote · answer · biography · description. */
  body?: string;
  imageUrl?: string;

  /** Impact numbers only. */
  value?: number;
  /** e.g. "+" — kept separate so the number stays a number. */
  suffix?: string;

  /** Founders only. */
  linkedinUrl?: string;
  twitterUrl?: string;
  email?: string;

  createdByName?: string;
  createdAt: Date;
  updatedAt: Date;
}

const siteContentSchema = new Schema<ISiteContent>(
  {
    section: { type: String, enum: SECTIONS, required: true, index: true },
    order: { type: Number, default: 0 },
    isPublished: { type: Boolean, default: true },

    heading: { type: String, required: true, trim: true, maxlength: 300 },
    subheading: { type: String, trim: true, maxlength: 200 },
    body: { type: String, trim: true, maxlength: 4000 },
    imageUrl: { type: String, trim: true },

    value: { type: Number },
    suffix: { type: String, trim: true, maxlength: 8 },

    linkedinUrl: { type: String, trim: true },
    twitterUrl: { type: String, trim: true },
    email: { type: String, trim: true, lowercase: true },

    createdByName: { type: String },
  },
  { timestamps: true }
);

siteContentSchema.index({ section: 1, isPublished: 1, order: 1 });

export const SiteContent = mongoose.model<ISiteContent>('SiteContent', siteContentSchema);

/**
 * Singletons — the one-off blocks of prose that are not a list.
 *
 * Mission and vision are one paragraph each; wrapping them in the ordered-item
 * model would mean an admin adding a "second mission" by accident.
 */
export interface ISiteSetting extends Document {
  key: string;
  value: string;
  updatedByName?: string;
  updatedAt: Date;
}

const siteSettingSchema = new Schema<ISiteSetting>(
  {
    key: { type: String, required: true, unique: true, trim: true },
    value: { type: String, default: '' },
    updatedByName: { type: String },
  },
  { timestamps: true }
);

export const SiteSetting = mongoose.model<ISiteSetting>('SiteSetting', siteSettingSchema);
