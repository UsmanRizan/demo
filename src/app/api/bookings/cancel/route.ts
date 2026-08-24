import { NextResponse } from "next/server";

import { getCurrentUser } from "@/lib/auth";
import { prisma } from "@/lib/prisma";

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

    const booking = await prisma.booking.findUnique({
      where: { id: bookingId },
      select: {
        id: true,
        playerId: true,
        status: true,
        paymentStatus: true,
        startAt: true,
        totalPrice: true,
      },
    });

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
    await prisma.booking.update({
      where: { id: booking.id },
      data: {
        status: "CANCELLED",
        paymentStatus: "CANCELLED",
        expiresAt: null,
      },
    });

    // Credit wallet if the booking was paid (best-effort — don't fail the cancel if wallet tables are missing)
    if (shouldCreditWallet) {
      try {
        await prisma.$transaction(async (tx) => {
          const wallet = await tx.wallet.upsert({
            where: { userId: currentUser.id },
            create: {
              userId: currentUser.id,
              balance: refundAmount,
            },
            update: {
              balance: {
                increment: refundAmount,
              },
            },
          });

          await tx.walletTransaction.create({
            data: {
              walletId: wallet.id,
              amount: refundAmount,
              type: "CREDIT",
              bookingId: booking.id,
              note: "Booking cancellation refund",
            },
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
