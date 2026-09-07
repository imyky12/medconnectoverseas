import { Request, Response } from 'express';
import { ActivityLog } from '../../models/ActivityLog.model';
import { ApiResponse } from '../../utils/ApiResponse';
import { asyncHandler } from '../../utils/asyncHandler';

/** Treats user input as literal text, not as a pattern. */
function escapeRegex(value: string): string {
  return value.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
}

/**
 * Reading the activity log.
 *
 * Paged and filtered rather than dumped: this collection grows with every
 * action on the platform, and an unbounded query would eventually take the
 * admin area down with it.
 */
export const listActivity = asyncHandler(async (req: Request, res: Response) => {
  const page = Math.max(1, Number(req.query.page) || 1);
  const limit = Math.min(100, Math.max(1, Number(req.query.limit) || 50));

  const filter: Record<string, unknown> = {};
  if (req.query.actorType) filter.actorType = req.query.actorType;
  if (req.query.action) filter.action = req.query.action;
  if (req.query.actorId) filter.actorId = req.query.actorId;
  if (req.query.success === 'false') filter.success = false;

  // Free-text across the fields someone would actually search by name or thing.
  if (req.query.q) {
    const q = String(req.query.q).trim();
    if (q) {
      const rx = new RegExp(escapeRegex(q), 'i');
      filter.$or = [{ actorName: rx }, { actorEmail: rx }, { summary: rx }, { action: rx }];
    }
  }

  const [rows, total] = await Promise.all([
    ActivityLog.find(filter).sort({ createdAt: -1 }).skip((page - 1) * limit).limit(limit).lean(),
    ActivityLog.countDocuments(filter),
  ]);

  res.status(200).json(
    new ApiResponse(200, { rows, total, page, limit, pages: Math.ceil(total / limit) }, 'Activity fetched')
  );
});

/** The distinct action names present, so the filter can offer real options. */
export const listActivityActions = asyncHandler(async (_req: Request, res: Response) => {
  const actions = await ActivityLog.distinct('action');
  res.status(200).json(new ApiResponse(200, actions.sort(), 'Actions fetched'));
});
