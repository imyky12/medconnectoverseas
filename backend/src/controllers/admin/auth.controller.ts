import { Request, Response } from 'express';
import bcrypt from 'bcryptjs';
import { Admin } from '../../models/Admin.model';
import { generateAuthTokens } from '../../services/token.service';
import { ApiResponse } from '../../utils/ApiResponse';
import { ApiError } from '../../utils/ApiError';
import { asyncHandler } from '../../utils/asyncHandler';

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
