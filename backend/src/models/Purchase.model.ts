import mongoose, { Document, Schema } from 'mongoose';

export interface IPurchase extends Document {
  userId: mongoose.Types.ObjectId;
  courseId: mongoose.Types.ObjectId;
  amount: number;
  originalAmount: number;
  discountAmount: number;
  couponId?: mongoose.Types.ObjectId;
  currency: string;
  status: 'pending' | 'completed' | 'refunded' | 'failed';
  paymentId?: string;
  createdAt: Date;
  updatedAt: Date;
}

const purchaseSchema = new Schema<IPurchase>(
  {
    userId: { type: Schema.Types.ObjectId, ref: 'User', required: true },
    courseId: { type: Schema.Types.ObjectId, ref: 'Course', required: true },
    amount: { type: Number, required: true },
    originalAmount: { type: Number, required: true },
    discountAmount: { type: Number, default: 0 },
    couponId: { type: Schema.Types.ObjectId, ref: 'Coupon' },
    currency: { type: String, default: 'INR' },
    status: {
      type: String,
      enum: ['pending', 'completed', 'refunded', 'failed'],
      default: 'pending',
    },
    paymentId: { type: String },
  },
  {
    timestamps: true,
  }
);

purchaseSchema.index({ userId: 1 });
purchaseSchema.index({ courseId: 1 });
purchaseSchema.index({ status: 1 });

export const Purchase = mongoose.model<IPurchase>('Purchase', purchaseSchema);
