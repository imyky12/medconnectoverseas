import { Event } from '../models/Event.model';

/**
 * Takes one seat on a slot, or reports that there was none.
 *
 * The check and the increment are a single `updateOne`, so there is no instant
 * between "is a seat free?" and "take it" in which a second approval could slip
 * through. `modifiedCount === 0` means the slot was already full — nothing was
 * written, and the caller must refuse.
 *
 * **On the query shape.** The obvious spelling is
 * `slots: { $elemMatch: { slotId, $expr: { $lt: [...] } } }`, and it does not
 * work: MongoDB rejects it with *"$expr can only be applied to the top-level
 * document"*. So the comparison is hoisted to a top-level `$expr` that counts
 * the matching-and-not-full slots, while `'slots.slotId'` stays in the filter
 * so the positional `$` operator still resolves to the right element.
 *
 * Duplicate slot ids would break the positional operator; they are rejected by
 * the Event model, which is what makes this safe.
 */
export async function claimSeat(eventId: unknown, slotId: string): Promise<boolean> {
  const res = await Event.updateOne(
    {
      _id: eventId,
      'slots.slotId': slotId,
      $expr: {
        $gt: [
          {
            $size: {
              $filter: {
                input: '$slots',
                as: 's',
                cond: {
                  $and: [
                    { $eq: ['$$s.slotId', slotId] },
                    { $lt: ['$$s.bookedSeats', '$$s.totalSeats'] },
                  ],
                },
              },
            },
          },
          0,
        ],
      },
    },
    { $inc: { 'slots.$.bookedSeats': 1, totalRegistrations: 1 } }
  );

  return res.modifiedCount > 0;
}

/**
 * Hands a seat back after a claim that could not be completed.
 *
 * Unconditional on purpose: it undoes a claim this process definitely made, so
 * there is nothing to re-check. Floored at zero anyway, because a seat count
 * that can go negative is worse than one that is briefly optimistic.
 */
export async function releaseSeat(eventId: unknown, slotId: string): Promise<void> {
  await Event.updateOne(
    {
      _id: eventId,
      'slots.slotId': slotId,
      $expr: {
        $gt: [
          {
            $size: {
              $filter: {
                input: '$slots',
                as: 's',
                cond: {
                  $and: [
                    { $eq: ['$$s.slotId', slotId] },
                    { $gt: ['$$s.bookedSeats', 0] },
                  ],
                },
              },
            },
          },
          0,
        ],
      },
    },
    { $inc: { 'slots.$.bookedSeats': -1, totalRegistrations: -1 } }
  );
}
