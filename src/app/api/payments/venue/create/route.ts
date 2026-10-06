import { after, NextResponse } from "next/server";

import { getCurrentUser } from "@/lib/auth";
import { findPaymentGroup, isVenueOverlapViolation, ownerAmountOf } from "@/lib/bookings";
import { logError } from "@/lib/monitoring";
import { notifyBookingConfirmed } from "@/lib/notifications";
import { prisma } from "@/lib/prisma";
import { bookingIdSchema, parseJson } from "@/lib/validation";

class PaymentError extends Error {
  constructor(message: string, public status = 400, public code?: string) {
    super(message);
  }
}

/**
 * Turn a payment hold into a pay-at-venue booking. The player pays the owner's
 * price in cash at the venue, so nothing goes through the platform wallets.
 * Until the owner marks it paid, an online payment can take the slot over.
 */
export async function POST(request: Request) {
  try {
    const currentUser = await getCurrentUser();

    if (!currentUser) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    if (currentUser.role !== "PLAYER") {
      return NextResponse.json(
        { error: "Only players can make bookings" },
        { status: 403 },
      );
    }

    const parsed = await parseJson(request, bookingIdSchema);

    if (parsed.response) {
      return parsed.response;
    }

    const result = await prisma.$transaction(async (tx) => {
      const group = await findPaymentGroup(tx, parsed.data.bookingId);

      if (group.length === 0 || group.some((b) => b.playerId !== currentUser.id)) {
        throw new PaymentError("Booking not found.", 404);
      }

      // Lock the bookings so a concurrent wallet/PayHere payment can't race this.
      const ids = group.map((b) => b.id);
      await tx.$queryRaw`SELECT id FROM "Booking" WHERE id = ANY(${ids}) FOR UPDATE`;

      const bookings = await tx.booking.findMany({
        where: { id: { in: ids } },
        orderBy: { startAt: "asc" },
      });

      const now = new Date();

      for (const booking of bookings) {
        if (booking.status !== "PENDING" || booking.paymentStatus !== "PENDING") {
          throw new PaymentError("This booking cannot be changed to pay at venue.");
        }

        if (booking.expiresAt && booking.expiresAt <= now) {
          throw new PaymentError("This booking has expired.");
        }
      }

      for (const booking of bookings) {
        await tx.booking.update({
          where: { id: booking.id },
          data: {
            status: "CONFIRMED",
            payAtVenue: true,
            paymentMethod: "venue",
            // Cash at the venue is the owner's price; no platform fee.
            totalPrice: ownerAmountOf(booking),
            expiresAt: null,
          },
        });
      }

      return { bookingIds: ids };
    });

    after(() => notifyBookingConfirmed(result.bookingIds));

    return NextResponse.json({
      success: true,
      bookingId: parsed.data.bookingId,
      bookingIds: result.bookingIds,
    });
  } catch (error) {
    if (isVenueOverlapViolation(error)) {
      return NextResponse.json(
        {
          error:
            "This slot already has a pay-at-venue reservation. Pay by card or wallet to book it.",
          code: "VENUE_SLOT_TAKEN",
        },
        { status: 409 },
      );
    }

    if (error instanceof PaymentError) {
      return NextResponse.json(
        { error: error.message, code: error.code },
        { status: error.status },
      );
    }

    logError("Pay at venue booking error:", error);

    return NextResponse.json(
      { error: "Failed to book with pay at venue." },
      { status: 500 },
    );
  }
}
