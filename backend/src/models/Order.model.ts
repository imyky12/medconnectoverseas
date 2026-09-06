import mongoose, { Document, Schema } from 'mongoose';

export interface IOrder extends Document {
  orderType: 'course' | 'event';
  user: mongoose.Types.ObjectId;
  // course order fields
  course?: mongoose.Types.ObjectId;
  // event order fields
  event?: mongoose.Types.ObjectId;
  slotId?: string;
  // common
  coupon?: mongoose.Types.ObjectId;
  finalPrice: number;
  transactionId: string;
  screenshotUrl: string;
  status: 'pending' | 'approved' | 'rejected';
  rejectionReason?: string;
  createdAt: Date;
  updatedAt: Date;
}

const orderSchema = new Schema<IOrder>(
  {
    orderType: { type: String, enum: ['course', 'event'], default: 'course' },
    user: { type: Schema.Types.ObjectId, ref: 'User', required: true },
    course: { type: Schema.Types.ObjectId, ref: 'Course' },
    event: { type: Schema.Types.ObjectId, ref: 'Event' },
    slotId: { type: String, trim: true },
    coupon: { type: Schema.Types.ObjectId, ref: 'Coupon' },
    finalPrice: { type: Number, required: true, min: 0 },
    transactionId: { type: String, required: true, trim: true },
    screenshotUrl: { type: String, required: true },
    status: { type: String, enum: ['pending', 'approved', 'rejected'], default: 'pending' },
    rejectionReason: { type: String },
  },
  {
    timestamps: true,
  }
);

orderSchema.index({ user: 1, course: 1 });
orderSchema.index({ user: 1, event: 1 });
orderSchema.index({ status: 1 });
orderSchema.index({ orderType: 1 });

export const Order = mongoose.model<IOrder>('Order', orderSchema);
