import { Request, Response, NextFunction } from 'express';
import jwt from 'jsonwebtoken';
import { env } from '../config/env';
import { AuthPayload } from './auth';
import { User } from '../models/User.model';

/**
 * Like `auth` but never rejects — if the token is missing, invalid, or belongs
 * to an account that no longer exists or has been suspended, `req.user` stays
 * undefined and the request continues as an anonymous one.
 *
 * The account lookup matters: a signature stays valid long after an account is
 * deleted or suspended, and these routes personalise their responses (whether
 * you are registered, which slot you hold). Without it a suspended user would
 * keep seeing their own registration state on public pages, which reads as
 * "still active" — the very impression suspension is meant to remove.
 */
export const optionalAuth = async (
  req: Request,
  _res: Response,
  next: NextFunction
): Promise<void> => {
  try {
    const authHeader = req.headers.authorization;
    if (authHeader?.startsWith('Bearer ')) {
      const token = authHeader.split(' ')[1];
      const decoded = jwt.verify(token, env.JWT_SECRET) as AuthPayload;

      const account = await User.findById(decoded.userId).select('isActive');
      if (account?.isActive) {
        req.user = decoded;
      }
    }
  } catch {
    // invalid / expired token — treat as unauthenticated
  }
  next();
};
