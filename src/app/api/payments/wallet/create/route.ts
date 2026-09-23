import { after, NextResponse } from "next/server";

import { getCurrentUser } from "@/lib/auth";
import { creditOwnerEarning, findPaymentGroup } from "@/lib/bookings";
import { debitWallet, InsufficientFundsError } from "@/lib/ledger";
import { roundMoney } from "@/lib/money";
import { logError } from "@/lib/monitoring";
import { notifyBookingConfirmed } from "@/lib/notifications";
import { prisma } from "@/lib/prisma";
import { bookingIdSchema, parseJson } from "@/lib/validation";

class PaymentError extends Error {
  constructor(message: string, public status = 400) {
    super(message);
  }
}

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

      // Lock the bookings so a concurrent wallet/PayHere payment can't double-charge.
      const ids = group.map((b) => b.id);
      await tx.$queryRaw`SELECT id FROM "Booking" WHERE id = ANY(${ids}) FOR UPDATE`;

      const bookings = await tx.booking.findMany({
        where: { id: { in: ids } },
        orderBy: { startAt: "asc" },
      });

      const now = new Date();

      for (const booking of bookings) {
        if (booking.status !== "PENDING" || booking.paymentStatus !== "PENDING") {
          throw new PaymentError("This booking cannot be paid for.");
        }

        if (booking.expiresAt && booking.expiresAt <= now) {
          throw new PaymentError("This booking has expired.");
        }
      }

      const amount = roundMoney(
        bookings.reduce((sum, b) => sum + Number(b.totalPrice), 0),
      );

      const debit = await debitWallet(tx, {
        userId: currentUser.id,
        amount,
        category: "BOOKING_PAYMENT",
        bookingId: bookings[0].id,
        note:
          bookings.length > 1
            ? `Booking payment (${bookings.length} weekly sessions)`
            : "Booking payment",
      });

      for (const booking of bookings) {
        await tx.booking.update({
          where: { id: booking.id },
          data: {
            status: "CONFIRMED",
            paymentStatus: "PAID",
            paymentMethod: "wallet",
            expiresAt: null,
          },
        });

        await creditOwnerEarning(tx, booking);
      }

      return {
        bookingIds: ids,
        newBalance: Number(debit.balanceAfter ?? 0),
      };
    });

    after(() => notifyBookingConfirmed(result.bookingIds));

    return NextResponse.json({
      success: true,
      bookingId: parsed.data.bookingId,
      bookingIds: result.bookingIds,
      newBalance: result.newBalance.toFixed(2),
    });
  } catch (error) {
    if (error instanceof PaymentError) {
      return NextResponse.json({ error: error.message }, { status: error.status });
    }

    if (error instanceof InsufficientFundsError) {
      return NextResponse.json(
        {
          error: `Insufficient wallet balance. Available: Rs. ${error.available.toFixed(2)}`,
        },
        { status: 400 },
      );
    }

    logError("Wallet payment error:", error);

    return NextResponse.json(
      { error: "Failed to process wallet payment." },
      { status: 500 },
    );
  }
}
