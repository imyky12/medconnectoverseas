import mongoose, { Document, Schema } from 'mongoose';

export interface IUser extends Document {
  email: string;
  mobile?: string;
  countryCode?: string;
  firstName?: string;
  lastName?: string;
  country?: string;
  howDidYouHearAboutUs?: string;
  isEmailVerified: boolean;
  isMobileVerified: boolean;
  isOnboardingComplete: boolean;
  role: 'user' | 'admin';
  referralCode: string;
  referredBy?: mongoose.Types.ObjectId;
  isActive: boolean;
  createdAt: Date;
  updatedAt: Date;
}

const userSchema = new Schema<IUser>(
  {
    email: {
      type: String,
      required: true,
      unique: true,
      lowercase: true,
      trim: true,
    },
    mobile: {
      type: String,
      unique: true,
      sparse: true,
      trim: true,
    },
    countryCode: {
      type: String,
      default: '+91',
    },
    firstName: {
      type: String,
      trim: true,
    },
    lastName: {
      type: String,
      trim: true,
    },
    country: {
      type: String,
      trim: true,
    },
    howDidYouHearAboutUs: {
      type: String,
    },
    isEmailVerified: {
      type: Boolean,
      default: false,
    },
    isMobileVerified: {
      type: Boolean,
      default: false,
    },
    isOnboardingComplete: {
      type: Boolean,
      default: false,
    },
    role: {
      type: String,
      enum: ['user', 'admin'],
      default: 'user',
    },
    referralCode: {
      type: String,
      unique: true,
      // Sparse, because a referral code is only minted when onboarding
      // finishes. Without this, every user still mid-signup carries
      // `referralCode: null`, and a unique index treats a second null as a
      // duplicate — so only one person could be part-way through signing up at
      // any moment. The second person to verify their email was refused
      // outright. `mobile` directly above already had this for the same reason.
      sparse: true,
    },
    referredBy: {
      type: Schema.Types.ObjectId,
      ref: 'User',
    },
    isActive: {
      type: Boolean,
      default: true,
    },
  },
  {
    timestamps: true,
  }
);

export const User = mongoose.model<IUser>('User', userSchema);
