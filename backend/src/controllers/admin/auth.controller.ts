import { Request, Response } from 'express';
import bcrypt from 'bcryptjs';
import { Admin } from '../../models/Admin.model';
import { generateAuthTokens } from '../../services/token.service';
import { ApiResponse } from '../../utils/ApiResponse';
import { ApiError } from '../../utils/ApiError';
import { asyncHandler } from '../../utils/asyncHandler';
import { recordActivity } from '../../services/activity.service';

/**
 * Handles Admin Login using robust password validation and JWT distribution.
 */
export const adminLogin = asyncHandler(async (req: Request, res: Response) => {
  const { email, password } = req.body;

  if (!email || !password) {
    throw new ApiError(400, 'Email and password are required');
  }

  const lowercaseEmail = email.toLowerCase().trim();
  const admin = await Admin.findOne({ email: lowercaseEmail });

  if (!admin || !admin.isActive) {
    throw new ApiError(401, 'Invalid credentials');
  }

  const isPasswordMatch = await bcrypt.compare(password, admin.password);
  if (!isPasswordMatch) {
    throw new ApiError(401, 'Invalid credentials');
  }

  admin.lastLogin = new Date();
  await admin.save();

  // Re-use token service. In production, we'd want admin-specific tracking tables,
  // but for now, we'll map a dummy session id.
  const tokens = generateAuthTokens(admin._id.toString(), "admin_session");

  // Recorded here rather than by the activity middleware: `adminAuth` cannot run
  // on the login route itself, so the middleware only ever sees an anonymous
  // request — and "which admin signed in, and from where" is precisely the row
  // an audit wants. Failed attempts are still captured generically upstream.
  recordActivity({
    actorType: 'admin',
    actorId: admin._id.toString(),
    actorName: admin.fullName?.trim() || admin.email,
    actorEmail: admin.email,
    action: 'admin.login',
    summary: 'Signed in to the admin area',
    method: req.method,
    path: '/admin/auth/login',
    statusCode: 200,
    success: true,
    ipAddress: req.ip,
    userAgent: req.headers['user-agent'],
  });

  res.status(200).json(
    new ApiResponse(200, {
      admin: {
        id: admin._id,
        email: admin.email,
        fullName: admin.fullName,
        role: 'admin',
      },
      tokens,
    }, 'Admin login successful')
  );
});
