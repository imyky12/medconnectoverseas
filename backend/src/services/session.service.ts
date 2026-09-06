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


/**
 * Ends every live session for one account.
 *
 * Suspension used to flip `isActive` and send an email, leaving existing
 * refresh tokens perfectly usable. The `auth` middleware now rejects a
 * suspended account on every request, which closes the exposure, but the
 * session rows should not survive either — a reactivated account would
 * otherwise resume old sessions the admin believed were ended.
 */
export const invalidateAllSessionsForUser = async (
  userId: mongoose.Types.ObjectId | string,
): Promise<number> => {
  const res = await Session.updateMany(
    { userId, isActive: true },
    { isActive: false },
  );
  return res.modifiedCount;
};
