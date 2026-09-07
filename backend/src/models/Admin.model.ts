import mongoose, { Document, Schema } from 'mongoose';

/**
 * An administrator account.
 *
 * There is no single shared admin login: every administrator has their own
 * address and their own password, because every action in the activity log is
 * attributed to a person and a shared account makes that attribution a lie.
 *
 * Signing in takes two steps — the password, then a one-time code emailed to
 * this address. The email account is therefore the second factor, which is why
 * `email` is the identity here rather than a username.
 */
export interface IAdmin extends Document {
  email: string;
  password: string;
  fullName: string;
  twoFactorSecret?: string;
  isTwoFactorEnabled: boolean;
  lastLogin?: Date;
  isActive: boolean;

  /**
   * Set when an admin is created (or reset) by somebody else.
   *
   * The person who creates the account picks the first password and passes it
   * on, so for a short while two people know it. This flag makes that window
   * end at the first sign-in: the account cannot reach the dashboard until a
   * new password is chosen, so from then on only its owner knows it.
   */
  mustChangePassword: boolean;
  passwordChangedAt?: Date;

  /** Who created this account — kept as a name so it survives their deletion. */
  createdByName?: string;

  createdAt: Date;
  updatedAt: Date;
}

const adminSchema = new Schema<IAdmin>(
  {
    email: { type: String, required: true, unique: true, lowercase: true, trim: true },
    password: { type: String, required: true, minlength: 12 },
    fullName: { type: String, required: true, trim: true },
    twoFactorSecret: { type: String },
    isTwoFactorEnabled: { type: Boolean, default: false },
    lastLogin: { type: Date },
    isActive: { type: Boolean, default: true },

    mustChangePassword: { type: Boolean, default: false },
    passwordChangedAt: { type: Date },
    createdByName: { type: String },
  },
  {
    timestamps: true,
  }
);

export const Admin = mongoose.model<IAdmin>('Admin', adminSchema);
