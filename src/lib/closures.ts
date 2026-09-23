import { after, NextResponse } from "next/server";

import { BookingError, cancelBooking, findActiveBookings } from "@/lib/bookings";
import { roundMoney } from "@/lib/money";
import { notifyBookingCancelled } from "@/lib/notifications";

/**
 * Shared handling for a venue closing (blocked date, location or facility
 * deactivated) while players hold bookings in the affected period.
 *
 * Without confirmation, returns a 409 describing the affected bookings so the
 * UI can ask the owner. With confirmation, cancels and fully refunds each
 * booking and notifies the players after the response is sent.
 */
export async function handleClosureBookings({
  scope,
  from,
  to,
  ownerId,
  reason,
  confirmed,
}: {
  scope: { locationId: string } | { facilityId: string };
  from: Date;
  to?: Date;
  ownerId: string;
  reason: string;
  confirmed: boolean;
}): Promise<
  | { response: NextResponse; cancelled?: never; refunded?: never }
  | { response?: never; cancelled: number; refunded: number }
> {
  const affected = await findActiveBookings({ ...scope, from, to });

  if (affected.length === 0) {
    return { cancelled: 0, refunded: 0 };
  }

  if (!confirmed) {
    const paid = affected.filter((b) => b.paymentStatus === "PAID").length;

    return {
      response: NextResponse.json(
        {
          error: `There ${affected.length === 1 ? "is 1 booking" : `are ${affected.length} bookings`} in this period${paid ? ` (${paid} paid)` : ""}. Confirm to cancel ${affected.length === 1 ? "it" : "them"}, refund the players to their wallets and notify them.`,
          code: "HAS_BOOKINGS",
          bookingCount: affected.length,
          paidCount: paid,
        },
        { status: 409 },
      ),
    };
  }

  let cancelled = 0;
  let refunded = 0;
  const notices: { id: string; refund: number }[] = [];

  for (const booking of affected) {
    try {
      const result = await cancelBooking({
        bookingId: booking.id,
        actor: { kind: "owner", userId: ownerId },
        reason,
      });

      cancelled += result.cancelledIds.length;
      refunded += result.refundAmount;
      notices.push({ id: booking.id, refund: result.refundAmount });
    } catch (error) {
      // Already cancelled by someone else in the meantime: nothing to do.
      if (!(error instanceof BookingError)) {
        throw error;
      }
    }
  }

  after(async () => {
    for (const notice of notices) {
      await notifyBookingCancelled(notice.id, "owner", notice.refund, reason);
    }
  });

  return { cancelled, refunded: roundMoney(refunded) };
}
