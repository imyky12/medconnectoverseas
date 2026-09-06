import mongoose, { Document, Schema } from 'mongoose';

export interface ICoupon extends Document {
  code: string;
  type: 'percentage' | 'fixed';
  value: number;
  maxUses: number;
  usedCount: number;
  minPurchaseAmount?: number;
  maxDiscountAmount?: number;
  validFrom: Date;
  validUntil: Date;
  isActive: boolean;
  // 'course' | 'event' | 'both' — controls where this coupon can be applied
  appliesTo: 'course' | 'event' | 'both';
  applicableCourses?: mongoose.Types.ObjectId[];
  applicableEvents?: mongoose.Types.ObjectId[];
  applicableCategories?: string[];
  allowedEmails?: string[];
  firstTimeUsersOnly: boolean;
  usesPerUser: number;
  createdAt: Date;
  updatedAt: Date;
}

const couponSchema = new Schema<ICoupon>(
  {
    code: { type: String, required: true, unique: true, uppercase: true, trim: true },
    type: { type: String, enum: ['percentage', 'fixed'], required: true },
    value: { type: Number, required: true, min: 0 },
    maxUses: { type: Number, required: true, default: 100 },
    usedCount: { type: Number, default: 0 },
    minPurchaseAmount: { type: Number, min: 0 },
    maxDiscountAmount: { type: Number, min: 0 },
    validFrom: { type: Date, required: true },
    validUntil: { type: Date, required: true },
    isActive: { type: Boolean, default: true },
    appliesTo: {
      type: String,
      enum: ['course', 'event', 'both'],
      default: 'course',
    },
    applicableCourses: [{ type: Schema.Types.ObjectId, ref: 'Course' }],
    applicableEvents: [{ type: Schema.Types.ObjectId, ref: 'Event' }],
    applicableCategories: [{ type: String }],
    allowedEmails: [{ type: String, lowercase: true, trim: true }],
    firstTimeUsersOnly: { type: Boolean, default: false },
    usesPerUser: { type: Number, default: 1 },
  },
  {
    timestamps: true,
  }
);

couponSchema.pre('save', function (next) {
  if (this.type === 'percentage' && this.value > 100) {
    return next(new Error('Percentage discount cannot exceed 100%'));
  }
  next();
});

couponSchema.index({ code: 1 });
couponSchema.index({ isActive: 1, validUntil: 1 });

export const Coupon = mongoose.model<ICoupon>('Coupon', couponSchema);
