import { Request, Response } from 'express';
import { asyncHandler } from '../../utils/asyncHandler';
import { ApiResponse } from '../../utils/ApiResponse';
import { ApiError } from '../../utils/ApiError';
import { PaymentSettings } from '../../models/PaymentSettings.model';

// GET — returns the single settings doc (publicly accessible for checkout page)
export const getPaymentSettings = asyncHandler(async (_req: Request, res: Response) => {
  let settings = await PaymentSettings.findOne({ isActive: true });
  res.status(200).json(new ApiResponse(200, settings || {}, 'Payment settings fetched'));
});

// PUT — admin upserts the single settings document
export const upsertPaymentSettings = asyncHandler(async (req: Request, res: Response) => {
  const {
    upiId, upiName, qrCodeUrl,
    bankName, accountNumber, ifscCode, accountHolderName,
    additionalInstructions,
  } = req.body;

  // We always keep ONE settings document. Use findOneAndUpdate with upsert.
  const settings = await PaymentSettings.findOneAndUpdate(
    {},
    {
      $set: {
        upiId, upiName, qrCodeUrl,
        bankName, accountNumber, ifscCode, accountHolderName,
        additionalInstructions,
        isActive: true,
      },
    },
    { upsert: true, new: true, runValidators: true }
  );

  res.status(200).json(new ApiResponse(200, settings, 'Payment settings updated successfully'));
});
