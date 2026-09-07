import { Request, Response } from 'express';
import { SiteContent, SiteSetting, SECTIONS, SectionKey } from '../models/SiteContent.model';
import { ApiResponse } from '../utils/ApiResponse';
import { ApiError } from '../utils/ApiError';
import { asyncHandler } from '../utils/asyncHandler';

/**
 * Reading and editing the site's own content.
 *
 * The public read returns everything the landing pages need in **one** request,
 * grouped by section. Five separate calls on a page load would mean five
 * chances for one to be slow and the page to assemble itself in pieces.
 */

function requireSection(value: unknown): SectionKey {
  const key = String(value ?? '');
  if (!SECTIONS.includes(key as SectionKey)) {
    throw new ApiError(400, `"${key}" is not a section of the site.`);
  }
  return key as SectionKey;
}

/* ── Public ─────────────────────────────────────────────────────────────── */

export const getSiteContent = asyncHandler(async (_req: Request, res: Response) => {
  const [items, settings] = await Promise.all([
    SiteContent.find({ isPublished: true })
      .select('-createdByName -__v')
      .sort({ order: 1, createdAt: 1 })
      .lean(),
    SiteSetting.find().select('key value').lean(),
  ]);

  const grouped: Record<string, unknown[]> = {};
  for (const key of SECTIONS) grouped[key] = [];
  for (const item of items) grouped[item.section].push(item);

  const values: Record<string, string> = {};
  for (const s of settings) values[s.key] = s.value;

  res.status(200).json(new ApiResponse(200, { ...grouped, settings: values }, 'Site content fetched'));
});

/* ── Admin ──────────────────────────────────────────────────────────────── */

export const listSiteContent = asyncHandler(async (req: Request, res: Response) => {
  const filter = req.query.section ? { section: requireSection(req.query.section) } : {};
  const items = await SiteContent.find(filter).sort({ section: 1, order: 1, createdAt: 1 }).lean();
  res.status(200).json(new ApiResponse(200, items, 'Content fetched'));
});

export const createSiteContent = asyncHandler(async (req: Request, res: Response) => {
  const section = requireSection(req.body?.section);
  const heading = String(req.body?.heading ?? '').trim();
  if (!heading) throw new ApiError(400, 'This item needs a heading.');

  // Appended to the end of its own section, so adding something never silently
  // reshuffles what is already there.
  const last = await SiteContent.findOne({ section }).sort({ order: -1 }).select('order').lean();

  const item = await SiteContent.create({
    ...pickFields(req.body),
    section,
    heading,
    order: typeof req.body?.order === 'number' ? req.body.order : (last?.order ?? 0) + 1,
    createdByName: req.admin?.name,
  });

  res.status(201).json(new ApiResponse(201, item, 'Added.'));
});

export const updateSiteContent = asyncHandler(async (req: Request, res: Response) => {
  const item = await SiteContent.findById(req.params.id);
  if (!item) throw new ApiError(404, 'That item no longer exists.');

  Object.assign(item, pickFields(req.body));
  if (req.body?.heading !== undefined) {
    const heading = String(req.body.heading).trim();
    if (!heading) throw new ApiError(400, 'This item needs a heading.');
    item.heading = heading;
  }
  if (req.body?.order !== undefined) item.order = Number(req.body.order);
  if (req.body?.isPublished !== undefined) item.isPublished = Boolean(req.body.isPublished);

  await item.save();
  res.status(200).json(new ApiResponse(200, item, 'Saved.'));
});

export const deleteSiteContent = asyncHandler(async (req: Request, res: Response) => {
  const item = await SiteContent.findByIdAndDelete(req.params.id);
  if (!item) throw new ApiError(404, 'That item no longer exists.');
  res.status(200).json(new ApiResponse(200, null, 'Deleted.'));
});

/** Mission, vision and anything else that is one block of prose. */
export const upsertSiteSetting = asyncHandler(async (req: Request, res: Response) => {
  const key = String(req.params.key ?? '').trim();
  if (!key) throw new ApiError(400, 'Which setting?');

  const setting = await SiteSetting.findOneAndUpdate(
    { key },
    { value: String(req.body?.value ?? ''), updatedByName: req.admin?.name },
    { new: true, upsert: true }
  );

  res.status(200).json(new ApiResponse(200, setting, 'Saved.'));
});

/**
 * Copies only the fields this model knows about.
 *
 * A blanket `Object.assign(item, req.body)` would let a request set `section`,
 * `createdByName` or `_id` — an admin form has no business rewriting any of
 * those, and one stray key would be enough.
 */
function pickFields(body: Record<string, unknown> = {}) {
  const out: Record<string, unknown> = {};
  const text = ['subheading', 'body', 'imageUrl', 'suffix', 'linkedinUrl', 'twitterUrl', 'email'];
  for (const key of text) {
    if (body[key] !== undefined) out[key] = String(body[key] ?? '').trim() || undefined;
  }
  if (body.value !== undefined) {
    out.value = body.value === null || body.value === '' ? undefined : Number(body.value);
  }
  return out;
}
