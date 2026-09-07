import { api } from './api';

/**
 * Uploading an image, from the browser straight to Cloudinary.
 *
 * Our server only ever mints a signature; the file itself never passes through
 * it. That keeps multi-megabyte phone photos out of the API request pipeline and
 * means the API secret stays server-side — no unsigned upload preset, which
 * would be a public write handle on the Cloudinary account.
 *
 * The signature covers the destination folder and the permitted formats, so a
 * signature issued for a payment screenshot cannot be pointed anywhere else.
 */

export type UploadPurpose =
  | 'event-banner'
  | 'course-thumbnail'
  | 'payment-qr'
  | 'payment-screenshot'
  | 'newsletter-cover'
  | 'newsletter-file';

interface Signature {
  cloudName: string;
  apiKey: string;
  timestamp: number;
  signature: string;
  folder: string;
  publicId: string;
  allowedFormats: string[];
  maxBytes: number;
  /** Cloudinary keeps PDFs under `raw`, which is a different upload endpoint. */
  resourceType: 'image' | 'raw';
  /** `authenticated` assets are never deliverable from their public address. */
  deliveryType?: 'upload' | 'authenticated';
}

/** Thrown with a message already fit to show a student. */
export class UploadError extends Error {}

let configCache: Promise<boolean> | null = null;

/**
 * Are uploads available on this deployment?
 *
 * Cached for the page's lifetime: it cannot change without a server restart,
 * and every image field would otherwise ask on mount.
 */
export function uploadsEnabled(): Promise<boolean> {
  if (!configCache) {
    configCache = api
      .get<any>('/uploads/config')
      .then((res: any) => Boolean(res?.data?.enabled))
      // A server that cannot answer is treated as "no uploads", so the field
      // falls back to a URL box rather than showing a broken control.
      .catch(() => false);
  }
  return configCache;
}

function adminHeaders() {
  const token = localStorage.getItem('adminToken');
  return { headers: { Authorization: `Bearer ${token}` } };
}

/**
 * Uploads one file and resolves to its permanent HTTPS URL.
 *
 * `onProgress` reports 0–100. XMLHttpRequest rather than fetch purely because
 * fetch still cannot report upload progress, and a student on a slow phone
 * connection uploading a payment screenshot is exactly who needs to see it.
 */
export interface UploadResult {
  url: string;
  /** Cloudinary's id. Needed for assets that are not publicly deliverable. */
  publicId: string;
  bytes: number;
}

/** Returns just the URL — what every image field wants. */
export async function uploadImage(
  file: File,
  purpose: UploadPurpose,
  opts: { asAdmin?: boolean; onProgress?: (percent: number) => void } = {}
): Promise<string> {
  return (await uploadAsset(file, purpose, opts)).url;
}

export async function uploadAsset(
  file: File,
  purpose: UploadPurpose,
  opts: { asAdmin?: boolean; onProgress?: (percent: number) => void } = {}
): Promise<UploadResult> {
  const { asAdmin = false, onProgress } = opts;

  const wantsPdf = purpose === 'newsletter-file';
  if (wantsPdf) {
    if (file.type !== 'application/pdf' && !file.name.toLowerCase().endsWith('.pdf')) {
      throw new UploadError('That file is not a PDF. Please choose the newsletter PDF.');
    }
  } else if (!file.type.startsWith('image/')) {
    throw new UploadError('That file is not an image. Please choose a photo or screenshot.');
  }

  const endpoint = asAdmin ? '/admin/uploads/signature' : '/uploads/signature';

  let sig: Signature;
  try {
    const res: any = await api.post<any>(
      `${endpoint}?purpose=${encodeURIComponent(purpose)}`,
      {},
      asAdmin ? adminHeaders() : undefined
    );
    if (!res?.success || !res.data) throw new Error(res?.message);
    sig = res.data as Signature;
  } catch (err: any) {
    throw new UploadError(
      err?.message?.includes('not configured')
        ? 'Image uploads are not set up on this server yet.'
        : err?.message || 'Could not start the upload.'
    );
  }

  // Checked after the signature so the limit comes from the server rather than
  // being duplicated as a magic number here.
  if (file.size > sig.maxBytes) {
    const mb = Math.round(sig.maxBytes / (1024 * 1024));
    throw new UploadError(`That image is larger than ${mb}MB. Please choose a smaller one.`);
  }

  const form = new FormData();
  form.append('file', file);
  form.append('api_key', sig.apiKey);
  form.append('timestamp', String(sig.timestamp));
  form.append('signature', sig.signature);
  form.append('folder', sig.folder);
  form.append('public_id', sig.publicId);
  form.append('allowed_formats', sig.allowedFormats.join(','));
  // Part of the signed payload — Cloudinary rejects the upload if this does not
  // match what the server signed, so it cannot be dropped to make the asset public.
  if (sig.deliveryType && sig.deliveryType !== 'upload') form.append('type', sig.deliveryType);

  return new Promise<UploadResult>((resolve, reject) => {
    const xhr = new XMLHttpRequest();
    // A PDF posted to /image/upload is refused — the resource type decides the
    // endpoint, and the server tells us which one this target uses.
    xhr.open('POST', `https://api.cloudinary.com/v1_1/${sig.cloudName}/${sig.resourceType ?? 'image'}/upload`);

    xhr.upload.onprogress = (e) => {
      if (e.lengthComputable && onProgress) {
        onProgress(Math.round((e.loaded / e.total) * 100));
      }
    };

    xhr.onload = () => {
      let body: any = {};
      try { body = JSON.parse(xhr.responseText); } catch { /* handled below */ }

      if (xhr.status >= 200 && xhr.status < 300 && body.secure_url) {
        resolve({
          url: body.secure_url as string,
          publicId: (body.public_id as string) ?? '',
          bytes: (body.bytes as number) ?? file.size,
        });
      } else {
        // Cloudinary's own message is usually the useful one ("Invalid image
        // file", a format it will not take), so it is preferred when present.
        reject(new UploadError(body?.error?.message || 'The upload was rejected. Please try another image.'));
      }
    };

    xhr.onerror = () => reject(new UploadError('The upload failed. Check your connection and try again.'));
    xhr.onabort = () => reject(new UploadError('Upload cancelled.'));

    xhr.send(form);
  });
}
