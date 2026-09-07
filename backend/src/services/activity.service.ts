import { Request } from 'express';
import { ActivityLog, ActorType } from '../models/ActivityLog.model';

/**
 * Writing to the activity log.
 *
 * Every call is **fire-and-forget and self-catching**. An audit row failing to
 * write must never turn a successful approval into a 500 — losing one log line
 * is bad, losing the payment approval it describes is worse. Failures are
 * reported to the server console so they are not invisible.
 */

export interface RecordInput {
  actorType: ActorType;
  actorId?: string;
  actorName?: string;
  actorEmail?: string;
  action: string;
  summary: string;
  targetType?: string;
  targetId?: string;
  targetLabel?: string;
  method?: string;
  path?: string;
  statusCode?: number;
  success?: boolean;
  ipAddress?: string;
  userAgent?: string;
  metadata?: Record<string, unknown>;
}

export function recordActivity(input: RecordInput): void {
  void ActivityLog.create({
    actorType: input.actorType,
    actorId: input.actorId || undefined,
    actorName: input.actorName || 'Unknown',
    actorEmail: input.actorEmail || '',
    action: input.action,
    summary: input.summary,
    targetType: input.targetType,
    targetId: input.targetId,
    targetLabel: input.targetLabel,
    method: input.method,
    path: input.path,
    statusCode: input.statusCode,
    success: input.success ?? true,
    ipAddress: input.ipAddress,
    userAgent: input.userAgent,
    metadata: input.metadata,
  }).catch((err) => {
    console.error('[activity] could not write log row:', (err as Error).message, input.action);
  });
}

/** Pulls whatever identity the request carries. */
export function actorFrom(req: Request): {
  actorType: ActorType;
  actorId?: string;
  actorName: string;
  actorEmail: string;
} {
  if (req.admin) {
    return {
      actorType: 'admin',
      actorId: req.admin.id,
      actorName: req.admin.name,
      actorEmail: req.admin.email,
    };
  }
  if (req.user?.userId) {
    return {
      actorType: 'user',
      actorId: req.user.userId,
      actorName: req.actorName || 'Student',
      actorEmail: req.actorEmail || '',
    };
  }
  return { actorType: 'system', actorName: 'Anonymous', actorEmail: '' };
}
