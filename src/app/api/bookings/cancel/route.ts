import { NextResponse } from "next/server";
import { eq } from "drizzle-orm";

import { getCurrentUser } from "@/lib/auth";
import { db } from "@/lib/prisma";
import { bookings, wallets, walletTransactions } from "@/db/schema";

const CANCEL_WINDOW_HOURS = 8;

export async function POST(request: Request) {
  try {
    const currentUser = await getCurrentUser();

    if (!currentUser) {
      return NextResponse.json(
        { error: "Unauthorized" },
        { status: 401 },
      );
    }

    const body = await request.json();

    const bookingId = body.bookingId;

    if (!bookingId || typeof bookingId !== "string") {
      return NextResponse.json(
        { error: "bookingId is required." },
        { status: 400 },
      );
    }

    const [booking] = await db
      .select({
        id: bookings.id,
        playerId: bookings.playerId,
        status: bookings.status,
        paymentStatus: bookings.paymentStatus,
        startAt: bookings.startAt,
        totalPrice: bookings.totalPrice,
      })
      .from(bookings)
      .where(eq(bookings.id, bookingId))
      .limit(1);

    if (!booking || booking.playerId !== currentUser.id) {
      return NextResponse.json(
        { error: "Booking not found." },
        { status: 404 },
      );
    }

    // Only allow cancelling PENDING or CONFIRMED bookings
    if (booking.status !== "PENDING" && booking.status !== "CONFIRMED") {
      return NextResponse.json(
        { error: "This booking cannot be cancelled." },
        { status: 400 },
      );
    }

    // Enforce 8-hour cancellation window
    const now = new Date();
    const hoursUntilStart =
      (booking.startAt.getTime() - now.getTime()) / (1000 * 60 * 60);

    if (hoursUntilStart < CANCEL_WINDOW_HOURS) {
      return NextResponse.json(
        {
          error: `Bookings can only be cancelled at least ${CANCEL_WINDOW_HOURS} hours before the start time.`,
        },
        { status: 400 },
      );
    }

    // Only credit wallet if the booking was actually paid
    const shouldCreditWallet = booking.paymentStatus === "PAID";
    const refundAmount = shouldCreditWallet ? Number(booking.totalPrice) : 0;
    let walletCredited = false;

    // Cancel the booking
    await db
      .update(bookings)
      .set({
        status: "CANCELLED",
        paymentStatus: "CANCELLED",
        expiresAt: null,
      })
      .where(eq(bookings.id, booking.id));

    // Credit wallet if the booking was paid (best-effort — don't fail the cancel if wallet tables are missing)
    if (shouldCreditWallet) {
      try {
        await db.transaction(async (tx) => {
          // Upsert wallet
          const [existingWallet] = await tx
            .select()
            .from(wallets)
            .where(eq(wallets.userId, currentUser.id))
            .limit(1);

          let wallet;
          if (existingWallet) {
            const newBalance = Number(existingWallet.balance) + refundAmount;
            [wallet] = await tx
              .update(wallets)
              .set({ balance: String(newBalance) })
              .where(eq(wallets.id, existingWallet.id))
              .returning();
          } else {
            [wallet] = await tx
              .insert(wallets)
              .values({
                userId: currentUser.id,
                balance: String(refundAmount),
              })
              .returning();
          }

          await tx.insert(walletTransactions).values({
            walletId: wallet.id,
            amount: String(refundAmount),
            type: "CREDIT",
            bookingId: booking.id,
            note: "Booking cancellation refund",
          });
        });

        walletCredited = true;
      } catch (walletError) {
        console.error("Wallet credit failed (booking still cancelled):", walletError);
      }
    }

    return NextResponse.json({
      success: true,
      walletCredited,
      refundAmount: refundAmount.toFixed(2),
    });
  } catch (error) {
    console.error("Booking cancellation error:", error);

    return NextResponse.json(
      { error: "Failed to cancel booking." },
      { status: 500 },
    );
  }
}
