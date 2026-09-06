import { Request, Response } from 'express';
import { FilterQuery } from 'mongoose';
import { asyncHandler } from '../../utils/asyncHandler';
import { ApiResponse } from '../../utils/ApiResponse';
import { ApiError } from '../../utils/ApiError';
import { EmailLog, IEmailLog } from '../../models/EmailLog.model';
import { retry } from '../../services/email';

/**
 * Read access to the email audit trail: who was mailed, when, with what, and
 * whether it worked.
 */

/**
 * GET /api/admin/emails
 * ?status&templateKey&email&userId&dateFrom&dateTo&page&limit
 *
 * htmlBody is `select: false`, so list responses stay small automatically.
 */
export const getEmailLogs = asyncHandler(async (req: Request, res: Response) => {
  const { status, templateKey, email, userId, dateFrom, dateTo } = req.query;
  const page = Math.max(1, parseInt(String(req.query.page ?? '1'), 10));
  const limit = Math.min(100, Math.max(1, parseInt(String(req.query.limit ?? '25'), 10)));

  const filter: FilterQuery<IEmailLog> = {};
  if (status) filter.status = status;
  if (templateKey) filter.templateKey = templateKey;
  if (userId) filter.user = userId;
  if (email) filter['to.address'] = String(email).toLowerCase().trim();
  if (dateFrom || dateTo) {
    filter.createdAt = {};
    if (dateFrom) filter.createdAt.$gte = new Date(String(dateFrom));
    if (dateTo) filter.createdAt.$lte = new Date(String(dateTo));
  }

  const [logs, total] = await Promise.all([
    EmailLog.find(filter)
      .populate('user', 'firstName lastName email')
      .sort({ createdAt: -1 })
      .skip((page - 1) * limit)
      .limit(limit)
      .lean(),
    EmailLog.countDocuments(filter),
  ]);

  res.status(200).json(
    new ApiResponse(
      200,
      { logs, page, limit, total, totalPages: Math.ceil(total / limit) },
      'Email logs fetched'
    )
  );
});

/**
 * GET /api/admin/emails/:id
 * Includes the stored body — absent for sensitive templates by design.
 */
export const getEmailLogById = asyncHandler(async (req: Request, res: Response) => {
  const log = await EmailLog.findById(req.params.id)
    .select('+htmlBody')
    .populate('user', 'firstName lastName email')
    .lean();

  if (!log) throw new ApiError(404, 'Email log not found');

  res.status(200).json(new ApiResponse(200, log, 'Email log fetched'));
});

/**
 * GET /api/admin/emails/:id/preview
 * Renders the exact HTML that was sent, for viewing in a browser tab.
 */
export const previewEmailLog = asyncHandler(async (req: Request, res: Response) => {
  const log = await EmailLog.findById(req.params.id).select('+htmlBody').lean();
  if (!log) throw new ApiError(404, 'Email log not found');

  if (!log.htmlBody) {
    throw new ApiError(
      404,
      `No stored body for template "${log.templateKey}" — sensitive templates are logged without their content.`
    );
  }

  res.status(200).type('html').send(log.htmlBody);
});

/**
 * POST /api/admin/emails/:id/resend
 * Resets attempts and re-queues. Sensitive templates cannot be resent, since
 * their body was never stored — re-trigger the original action instead.
 */
export const resendEmail = asyncHandler(async (req: Request, res: Response) => {
  const log = await EmailLog.findById(req.params.id).select('+htmlBody');
  if (!log) throw new ApiError(404, 'Email log not found');

  if (!log.htmlBody) {
    throw new ApiError(400, 'This email has no stored body and cannot be resent.');
  }
  if (log.status === 'sent' || log.status === 'delivered') {
    throw new ApiError(400, `Email is already ${log.status}.`);
  }

  await retry(log.id);
  res.status(200).json(new ApiResponse(200, { id: log.id }, 'Email re-queued for delivery'));
});

/**
 * GET /api/admin/emails/stats?days=30
 * Totals by status plus a per-template breakdown.
 */
export const getEmailStats = asyncHandler(async (req: Request, res: Response) => {
  const days = Math.min(365, Math.max(1, parseInt(String(req.query.days ?? '30'), 10)));
  const since = new Date(Date.now() - days * 24 * 60 * 60 * 1000);
  const match = { createdAt: { $gte: since } };

  const [byStatus, byTemplate, failures] = await Promise.all([
    EmailLog.aggregate([{ $match: match }, { $group: { _id: '$status', count: { $sum: 1 } } }]),
    EmailLog.aggregate([
      { $match: match },
      {
        $group: {
          _id: '$templateKey',
          total: { $sum: 1 },
          sent: { $sum: { $cond: [{ $in: ['$status', ['sent', 'delivered']] }, 1, 0] } },
          failed: { $sum: { $cond: [{ $eq: ['$status', 'failed'] }, 1, 0] } },
        },
      },
      { $sort: { total: -1 } },
    ]),
    // Most common error messages — the fastest way to spot a config problem.
    EmailLog.aggregate([
      { $match: { ...match, status: 'failed' } },
      { $group: { _id: '$error.message', count: { $sum: 1 } } },
      { $sort: { count: -1 } },
      { $limit: 10 },
    ]),
  ]);

  res.status(200).json(
    new ApiResponse(
      200,
      {
        days,
        byStatus: Object.fromEntries(byStatus.map((r) => [r._id, r.count])),
        byTemplate,
        topFailures: failures,
      },
      'Email stats fetched'
    )
  );
});
