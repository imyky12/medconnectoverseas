import mongoose, { Document, Schema } from 'mongoose';

export interface IPaymentSettings extends Document {
  upiId?: string;
  upiName?: string;
  qrCodeUrl?: string;
  bankName?: string;
  accountNumber?: string;
  ifscCode?: string;
  accountHolderName?: string;
  additionalInstructions?: string;
  isActive: boolean;
  updatedAt: Date;
}

const paymentSettingsSchema = new Schema<IPaymentSettings>(
  {
    upiId: { type: String, trim: true },
    upiName: { type: String, trim: true },
    qrCodeUrl: { type: String, trim: true },
    bankName: { type: String, trim: true },
    accountNumber: { type: String, trim: true },
    ifscCode: { type: String, trim: true, uppercase: true },
    accountHolderName: { type: String, trim: true },
    additionalInstructions: { type: String, trim: true },
    isActive: { type: Boolean, default: true },
  },
  { timestamps: true }
);

export const PaymentSettings = mongoose.model<IPaymentSettings>('PaymentSettings', paymentSettingsSchema);
