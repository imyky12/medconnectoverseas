import mongoose, { Document, Schema } from 'mongoose';

export interface IOTP extends Document {
  identifier: string; // email or mobile number
  channel: 'email' | 'sms';
  otp: string; // hashed OTP
  expiresAt: Date;
  attempts: number;
  isUsed: boolean;
  createdAt: Date;
}

const otpSchema = new Schema<IOTP>(
  {
    identifier: { type: String, required: true },
    channel: { type: String, enum: ['email', 'sms'], required: true },
    otp: { type: String, required: true },
    expiresAt: { type: Date, required: true },
    attempts: { type: Number, default: 0 },
    isUsed: { type: Boolean, default: false },
  },
  {
    timestamps: true,
  }
);

// Auto-delete expired OTPs
otpSchema.index({ expiresAt: 1 }, { expireAfterSeconds: 0 });
otpSchema.index({ identifier: 1, channel: 1 });

export const OTP = mongoose.model<IOTP>('OTP', otpSchema);
