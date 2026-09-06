import { Request, Response, NextFunction } from 'express';
import jwt from 'jsonwebtoken';
import { env } from '../config/env';
import { AuthPayload } from './auth';

/**
 * Like `auth` but never rejects — if the token is missing or invalid,
 * req.user stays undefined and the request continues.
 */
export const optionalAuth = (req: Request, _res: Response, next: NextFunction): void => {
  try {
    const authHeader = req.headers.authorization;
    if (authHeader?.startsWith('Bearer ')) {
      const token = authHeader.split(' ')[1];
      req.user = jwt.verify(token, env.JWT_SECRET) as AuthPayload;
    }
  } catch {
    // invalid / expired token — treat as unauthenticated
  }
  next();
};
