import { after, NextResponse } from "next/server";

import { getCurrentUser } from "@/lib/auth";
import {
  BookingError,
  cancelBooking,
  PLAYER_CANCEL_WINDOW_HOURS,
} from "@/lib/bookings";
import { logError } from "@/lib/monitoring";
import { notifyBookingCancelled } from "@/lib/notifications";
import { prisma } from "@/lib/prisma";
import { cancelBookingSchema, parseJson } from "@/lib/validation";

export async function POST(request: Request) {
  try {
    const currentUser = await getCurrentUser();

    if (!currentUser) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const parsed = await parseJson(request, cancelBookingSchema);

    if (parsed.response) {
      return parsed.response;
    }

    const booking = await prisma.booking.findUnique({
      where: { id: parsed.data.bookingId },
      select: {
        id: true,
        playerId: true,
        status: true,
        paymentStatus: true,
        startAt: true,
      },
    });

    if (!booking || booking.playerId !== currentUser.id) {
      return NextResponse.json({ error: "Booking not found." }, { status: 404 });
    }

    if (booking.status !== "PENDING" && booking.status !== "CONFIRMED") {
      return NextResponse.json(
        { error: "This booking cannot be cancelled." },
        { status: 400 },
      );
    }

    // Paid bookings can only be cancelled well before they start. Unpaid holds
    // (abandoned checkouts) can always be released.
    const hoursUntilStart = (booking.startAt.getTime() - Date.now()) / 3_600_000;

    if (booking.paymentStatus === "PAID" && hoursUntilStart < PLAYER_CANCEL_WINDOW_HOURS) {
      return NextResponse.json(
        {
          error: `Bookings can only be cancelled at least ${PLAYER_CANCEL_WINDOW_HOURS} hours before the start time.`,
        },
        { status: 400 },
      );
    }

    const result = await cancelBooking({
      bookingId: booking.id,
      actor: { kind: "player", userId: currentUser.id },
      reason: parsed.data.reason || "Cancelled by player",
    });

    after(() => notifyBookingCancelled(booking.id, "player", result.refundAmount));

    return NextResponse.json({
      success: true,
      walletCredited: result.walletCredited,
      refundAmount: result.refundAmount.toFixed(2),
      cancelledIds: result.cancelledIds,
    });
  } catch (error) {
    if (error instanceof BookingError) {
      return NextResponse.json({ error: error.message }, { status: error.status });
    }

    logError("Booking cancellation error:", error);

    return NextResponse.json(
      { error: "Failed to cancel booking." },
      { status: 500 },
    );
  }
}
