import { v2 as cloudinary } from 'cloudinary';
import { env } from './env';

/**
 * Cloudinary, used for every image the platform accepts.
 *
 * Uploads go **straight from the browser to Cloudinary**, signed by us. The
 * browser asks this server for a short-lived signature, then posts the file
 * itself. Two reasons that shape was chosen over proxying the bytes through
 * Express:
 *
 *  - the API secret never leaves the server, and no upload preset has to be
 *    left unsigned (an unsigned preset is a public write handle on the account)
 *  - a payment screenshot from a phone camera can be several megabytes, and
 *    none of that traffic touches our request pipeline
 *
 * The signature covers the folder and the allowed formats, so a signature
 * minted for a payment screenshot cannot be replayed to write somewhere else.
 */

cloudinary.config({
  cloud_name: env.CLOUDINARY_CLOUD_NAME,
  api_key: env.CLOUDINARY_API_KEY,
  api_secret: env.CLOUDINARY_API_SECRET,
  secure: true,
});

/**
 * Whether uploads can work at all right now.
 *
 * Checked rather than assumed: with no credentials the app still runs and every
 * upload field falls back to pasting a URL, which is how images already worked.
 * Half-configured counts as not configured — that fails at signing time
 * otherwise, which is a much more confusing place to find out.
 */
export const isCloudinaryConfigured = (): boolean =>
  Boolean(env.CLOUDINARY_CLOUD_NAME && env.CLOUDINARY_API_KEY && env.CLOUDINARY_API_SECRET);

/**
 * What a caller is allowed to upload, and where it lands.
 *
 * An allowlist rather than a caller-supplied folder: the folder is part of the
 * signed payload, so letting the client name it would let a student write into
 * the event-banner folder — or anywhere else in the account.
 *
 * `admin` targets are refused to student tokens; see the two route files.
 */
export interface UploadTarget {
  folder: string;
  audience: 'admin' | 'user';
  /** Bytes. Enforced by Cloudinary, and mirrored in the browser for a fast error. */
  maxBytes: number;
  /**
   * Cloudinary treats a PDF as a `raw` asset, not an image — it goes to a
   * different upload endpoint and takes different formats. Defaults to image,
   * which is what every original target was.
   */
  resourceType?: 'image' | 'raw';
  /** Overrides ALLOWED_FORMATS where a target takes something else. */
  formats?: string[];
  /**
   * `authenticated` means Cloudinary refuses to deliver the asset from its
   * public address at all — every fetch needs a signature this server mints.
   * Used for the newsletter PDF, which must not be reachable by anyone who
   * merely learns the URL.
   */
  deliveryType?: 'upload' | 'authenticated';
}

export const UPLOAD_TARGETS: Record<string, UploadTarget> = {
  'event-banner': { folder: 'medconnect/event-banners', audience: 'admin', maxBytes: 10 * 1024 * 1024 },
  'course-thumbnail': { folder: 'medconnect/course-thumbnails', audience: 'admin', maxBytes: 10 * 1024 * 1024 },
  'payment-qr': { folder: 'medconnect/payment-qr', audience: 'admin', maxBytes: 5 * 1024 * 1024 },
  // Students upload these from a phone, straight out of a banking app, so the
  // ceiling is higher than anything an admin needs.
  'payment-screenshot': { folder: 'medconnect/payment-screenshots', audience: 'user', maxBytes: 15 * 1024 * 1024 },
  'newsletter-cover': { folder: 'medconnect/newsletter-covers', audience: 'admin', maxBytes: 10 * 1024 * 1024 },
  // The issue itself. Note this lands in a folder whose URL is never emitted to
  // the public — see the note on Newsletter.model.
  'newsletter-file': {
    folder: 'medconnect/newsletters',
    audience: 'admin',
    maxBytes: 40 * 1024 * 1024,
    resourceType: 'raw',
    formats: ['pdf'],
    deliveryType: 'authenticated',
  },
};

export const ALLOWED_FORMATS = ['png', 'jpg', 'jpeg', 'webp', 'heic', 'heif'];

export { cloudinary };
