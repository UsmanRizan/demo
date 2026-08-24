import { NextResponse } from "next/server";

import { getCurrentUser } from "@/lib/auth";
import { prisma } from "@/lib/prisma";

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

    const body = await request.json();
    const bookingId = body.bookingId;

    if (!bookingId || typeof bookingId !== "string") {
      return NextResponse.json(
        { error: "bookingId is required." },
        { status: 400 },
      );
    }

    // Find the booking
    const booking = await prisma.booking.findUnique({
      where: { id: bookingId },
      select: {
        id: true,
        playerId: true,
        status: true,
        paymentStatus: true,
        totalPrice: true,
        expiresAt: true,
      },
    });

    if (!booking || booking.playerId !== currentUser.id) {
      return NextResponse.json(
        { error: "Booking not found." },
        { status: 404 },
      );
    }

    // Only pay for PENDING bookings
    if (booking.status !== "PENDING" || booking.paymentStatus !== "PENDING") {
      return NextResponse.json(
        { error: "This booking cannot be paid for." },
        { status: 400 },
      );
    }

    // Check if booking has expired
    if (booking.expiresAt && booking.expiresAt <= new Date()) {
      return NextResponse.json(
        { error: "This booking has expired." },
        { status: 400 },
      );
    }

    const amount = Number(booking.totalPrice);

    // Get wallet
    const wallet = await prisma.wallet.findUnique({
      where: { userId: currentUser.id },
    });

    if (!wallet) {
      return NextResponse.json(
        { error: "No wallet found. Please add funds first." },
        { status: 400 },
      );
    }

    const walletBalance = Number(wallet.balance);

    // Check if wallet has enough balance
    if (walletBalance < amount) {
      return NextResponse.json(
        {
          error: `Insufficient wallet balance. Required: Rs. ${amount.toFixed(2)}, Available: Rs. ${walletBalance.toFixed(2)}`,
        },
        { status: 400 },
      );
    }

    // Process wallet payment in a transaction
    await prisma.$transaction(async (tx) => {
      // Deduct from wallet
      await tx.wallet.update({
        where: { id: wallet.id },
        data: {
          balance: {
            decrement: amount,
          },
        },
      });

      // Record wallet transaction
      await tx.walletTransaction.create({
        data: {
          walletId: wallet.id,
          amount,
          type: "DEBIT",
          bookingId: booking.id,
          note: "Booking payment",
        },
      });

      // Update booking status
      await tx.booking.update({
        where: { id: booking.id },
        data: {
          status: "CONFIRMED",
          paymentStatus: "PAID",
          paymentMethod: "wallet",
          expiresAt: null,
        },
      });
    });

    return NextResponse.json({
      success: true,
      bookingId: booking.id,
      newBalance: (walletBalance - amount).toFixed(2),
    });
  } catch (error) {
    console.error("Wallet payment error:", error);

    return NextResponse.json(
      { error: "Failed to process wallet payment." },
      { status: 500 },
    );
  }
}
