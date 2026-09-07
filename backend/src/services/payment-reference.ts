import { Order } from '../models/Order.model';
import { ApiError } from '../utils/ApiError';

/**
 * One payment reference, one order.
 *
 * Payment here is verified by hand: an admin reads a UTR and a screenshot and
 * decides. Nothing checked whether that UTR had been used before, so a single
 * ₹100 payment plus its screenshot could be resubmitted against every event on
 * the platform — and an admin checking "is this UTR in our bank statement?"
 * gets a **yes**, because it is; it was the earlier, legitimate payment. The
 * fraudulent claim is indistinguishable from a genuine one by exactly the check
 * an admin would think to make.
 *
 * Rejected orders deliberately do **not** block reuse. A rejection means the
 * payment was not accepted for some other reason, and the student may need to
 * resubmit the same genuine reference.
 */
const BLOCKING_STATUSES = ['pending', 'approved'];

export async function assertPaymentReferenceUnused(transactionId: string): Promise<void> {
  const reference = transactionId.trim();
  if (!reference) return;

  // Case-insensitive and anchored: UTRs get retyped with different casing, and
  // a substring match would wrongly reject a reference that merely contains
  // another. `^…$` with `i` catches the realistic duplicate without inventing
  // false collisions.
  const existing = await Order.findOne({
    transactionId: { $regex: `^${escapeRegex(reference)}$`, $options: 'i' },
    status: { $in: BLOCKING_STATUSES },
  })
    .select('_id')
    .lean();

  if (existing) {
    throw new ApiError(
      409,
      'That payment reference has already been submitted for another order. Please check the transaction ID from your payment app.'
    );
  }
}

function escapeRegex(value: string): string {
  return value.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
}
