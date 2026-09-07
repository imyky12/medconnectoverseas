import { Request, Response, NextFunction } from 'express';
import jwt from 'jsonwebtoken';
import { env } from '../config/env';
import { ApiError } from '../utils/ApiError';
import { User } from '../models/User.model';

export interface AuthPayload {
  userId: string;
  sessionId: string;
}

/**
 * Verify the JWT access token, then confirm the account behind it is still
 * real and still allowed in.
 *
 * A signature check alone is not enough: the token stays cryptographically
 * valid until it expires, so a deleted or suspended user keeps full API access
 * for the rest of that window. One lookup per request closes that, and it is
 * what lets the client find out on boot that its stored session is dead.
 */
export const auth = async (req: Request, _res: Response, next: NextFunction): Promise<void> => {
  try {
    const authHeader = req.headers.authorization;

    if (!authHeader || !authHeader.startsWith('Bearer ')) {
      throw new ApiError(401, 'Access token is required');
    }

    const token = authHeader.split(' ')[1];
    const decoded = jwt.verify(token, env.JWT_SECRET) as AuthPayload;

    const account = await User.findById(decoded.userId).select('isActive firstName lastName email');
    if (!account) throw new ApiError(401, 'This account no longer exists');
    if (!account.isActive) throw new ApiError(403, 'This account has been suspended');

    req.user = decoded;
    // Snapshotted onto the request so the activity log can name the student
    // without a second lookup on every write.
    req.actorName = [account.firstName, account.lastName].filter(Boolean).join(' ').trim() || account.email;
    req.actorEmail = account.email;
    next();
  } catch (error) {
    if (error instanceof jwt.TokenExpiredError) {
      next(new ApiError(401, 'Access token has expired'));
    } else if (error instanceof jwt.JsonWebTokenError) {
      next(new ApiError(401, 'Invalid access token'));
    } else {
      next(error);
    }
  }
};
