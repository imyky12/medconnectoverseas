import { Request, Response } from 'express';
import { randomUUID } from 'crypto';
import {
  cloudinary,
  isCloudinaryConfigured,
  UPLOAD_TARGETS,
  ALLOWED_FORMATS,
} from '../config/cloudinary';
import { ApiResponse } from '../utils/ApiResponse';
import { ApiError } from '../utils/ApiError';
import { asyncHandler } from '../utils/asyncHandler';

/**
 * Mints a one-shot signature the browser uses to upload a single image.
 *
 * `audience` is supplied by the route, never by the caller — the student route
 * passes 'user' and the admin route passes 'admin'. That is what stops a
 * student token minting a signature for the event-banner folder.
 */
export const createUploadSignature = (audience: 'admin' | 'user') =>
  asyncHandler(async (req: Request, res: Response) => {
    if (!isCloudinaryConfigured()) {
      // 503 rather than 500: nothing is broken, the server just has no
      // credentials yet. The client reads this and offers a URL field instead.
      throw new ApiError(503, 'Image uploads are not configured on this server.');
    }

    const purpose = String(req.query.purpose ?? req.body?.purpose ?? '');
    const target = UPLOAD_TARGETS[purpose];

    if (!target) {
      throw new ApiError(400, `Unknown upload purpose "${purpose}".`);
    }
    if (target.audience !== audience) {
      throw new ApiError(403, 'You are not allowed to upload that kind of image.');
    }

    // Every parameter signed here is one the browser cannot then change:
    // Cloudinary recomputes the signature over what it receives and rejects a
    // mismatch. So folder and format restrictions are enforced, not suggested.
    const timestamp = Math.round(Date.now() / 1000);
    const publicId = `${purpose}-${randomUUID()}`;

    const formats = target.formats ?? ALLOWED_FORMATS;
    const deliveryType = target.deliveryType ?? 'upload';
    const paramsToSign: Record<string, string | number> = {
      timestamp,
      folder: target.folder,
      public_id: publicId,
      allowed_formats: formats.join(','),
    };
    // Signed, so the browser cannot downgrade an authenticated asset to a
    // publicly deliverable one by editing the form.
    if (deliveryType !== 'upload') paramsToSign.type = deliveryType;

    const signature = cloudinary.utils.api_sign_request(
      paramsToSign,
      process.env.CLOUDINARY_API_SECRET as string
    );

    res.status(200).json(
      new ApiResponse(200, {
        cloudName: process.env.CLOUDINARY_CLOUD_NAME,
        apiKey: process.env.CLOUDINARY_API_KEY,
        timestamp,
        signature,
        folder: target.folder,
        publicId,
        allowedFormats: formats,
        maxBytes: target.maxBytes,
        // The browser needs this to pick the right Cloudinary endpoint: a PDF
        // posted to /image/upload is rejected.
        resourceType: target.resourceType ?? 'image',
        deliveryType,
      }, 'Upload signature issued')
    );
  });

/**
 * Whether the client should show an upload control or a plain URL field.
 *
 * Deliberately unauthenticated in what it reveals — a boolean, no credentials —
 * so a form can decide how to render before anyone has picked a file.
 */
export const getUploadConfig = asyncHandler(async (_req: Request, res: Response) => {
  res.status(200).json(
    new ApiResponse(200, { enabled: isCloudinaryConfigured() }, 'Upload config')
  );
});
