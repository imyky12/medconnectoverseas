import mongoose, { Document, Schema } from 'mongoose';

export interface IReferral extends Document {
  referrerId: mongoose.Types.ObjectId;
  referredId: mongoose.Types.ObjectId;
  referralCode: string;
  status: 'pending' | 'completed';
  rewardGiven: boolean;
  createdAt: Date;
  updatedAt: Date;
}

const referralSchema = new Schema<IReferral>(
  {
    referrerId: { type: Schema.Types.ObjectId, ref: 'User', required: true },
    referredId: { type: Schema.Types.ObjectId, ref: 'User', required: true },
    referralCode: { type: String, required: true },
    status: { type: String, enum: ['pending', 'completed'], default: 'pending' },
    rewardGiven: { type: Boolean, default: false },
  },
  {
    timestamps: true,
  }
);

referralSchema.index({ referrerId: 1 });
referralSchema.index({ referredId: 1 });

export const Referral = mongoose.model<IReferral>('Referral', referralSchema);
