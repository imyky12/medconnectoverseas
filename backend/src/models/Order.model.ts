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
    // Not required: a free (₹0) booking has no payment and therefore no
    // screenshot. Paid orders are still checked in the controller, where the
    // payable amount is actually known.
    screenshotUrl: { type: String, default: '' },
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

/**
 * One live payment reference, one order — enforced by the database.
 *
 * The controller checks this too, for a readable message, but two submissions
 * landing at the same moment would both pass that check. Only a unique index
 * closes the window. Partial, because a **rejected** order must not lock its
 * reference forever: the student may need to resubmit a genuine one.
 */
orderSchema.index(
  { transactionId: 1 },
  {
    unique: true,
    partialFilterExpression: { status: { $in: ['pending', 'approved'] } },
    name: 'uniq_live_transactionId',
  }
);

export const Order = mongoose.model<IOrder>('Order', orderSchema);
