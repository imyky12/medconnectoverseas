import crypto from 'crypto';
import bcrypt from 'bcryptjs';
import { OTP } from '../models/OTP.model';
import { env } from '../config/env';

/**
 * Generates a random 6-digit OTP
 */
export const generateOtpValue = (): string => {
  return crypto.randomInt(100000, 999999).toString();
};

/**
 * Creates, hashes, and stores an OTP for a given identifier
 */
export const createOtp = async (identifier: string, channel: 'email' | 'sms'): Promise<string> => {
  const otpValue = generateOtpValue();
  const hashedOtp = await bcrypt.hash(otpValue, 10);
  const expiresAt = new Date(Date.now() + env.OTP_EXPIRY_MINUTES * 60 * 1000);

  // Invalidate any existing OTPs for this identifier/channel
  await OTP.deleteMany({ identifier, channel });

  await OTP.create({
    identifier,
    channel,
    otp: hashedOtp,
    expiresAt,
  });

  return otpValue;
};

/**
 * Verifies an OTP for the given identifier
 */
export const verifyOtp = async (identifier: string, channel: 'email' | 'sms', otpValue: string): Promise<boolean> => {
  const otpRecord = await OTP.findOne({ identifier, channel, isUsed: false });

  if (!otpRecord) {
    return false;
  }

  if (otpRecord.expiresAt < new Date()) {
    return false;
  }

  // Increment attempts to prevent brute-forcing
  otpRecord.attempts += 1;
  await otpRecord.save();

  if (otpRecord.attempts > 5) {
    await OTP.deleteOne({ _id: otpRecord._id });
    return false;
  }

  const isValid = await bcrypt.compare(otpValue, otpRecord.otp);

  if (isValid) {
    otpRecord.isUsed = true;
    await otpRecord.save();
    return true;
  }

  return false;
};
