import bcrypt from 'bcryptjs';
import mongoose from 'mongoose';
import { Session } from '../models/Session.model';

export const createSession = async (
  userId: mongoose.Types.ObjectId,
  refreshToken: string,
  deviceInfo: string,
  ipAddress: string,
  expiresAt: Date
): Promise<mongoose.Types.ObjectId> => {
  // Invalidate any existing active sessions (Single Device Enforcement)
  await Session.updateMany({ userId, isActive: true }, { $set: { isActive: false } });

  const hashedToken = await bcrypt.hash(refreshToken, 10);
  const newSession = await Session.create({
    userId,
    token: hashedToken,
    deviceInfo,
    ipAddress,
    isActive: true,
    expiresAt,
  });

  return newSession._id as mongoose.Types.ObjectId;
};

export const invalidateSession = async (sessionId: string): Promise<void> => {
  await Session.updateOne({ _id: sessionId }, { $set: { isActive: false } });
};

