import { Request, Response, NextFunction } from 'express';
import jwt from 'jsonwebtoken';
import { env } from '../config/env';
import { ApiError } from '../utils/ApiError';
import { Admin } from '../models/Admin.model';
import { AuthPayload } from './auth';

export const adminAuth = async (req: Request, _res: Response, next: NextFunction): Promise<void> => {
  try {
    const authHeader = req.headers.authorization;

    if (!authHeader || !authHeader.startsWith('Bearer ')) {
      throw new ApiError(401, 'Admin access token is required');
    }

    const token = authHeader.split(' ')[1];
    const decoded = jwt.verify(token, env.JWT_SECRET) as AuthPayload;

    const adminUser = await Admin.findById(decoded.userId);
    if (!adminUser || !adminUser.isActive) {
       throw new ApiError(403, 'Forbidden: Admin access only');
    }

    req.user = decoded; // Sets user context
    // Carried through so every logged action names a person, not an id.
    req.admin = {
      id: adminUser._id.toString(),
      name: adminUser.fullName?.trim() || adminUser.email,
      email: adminUser.email,
    };
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
