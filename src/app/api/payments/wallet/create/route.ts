import { NextResponse } from "next/server";

import { getCurrentUser } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { calculateDynamicPrice } from "@/lib/pricing";

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
        startAt: true,
        endAt: true,
        facility: {
          select: {
            price: true,
            location: {
              select: { ownerId: true },
            },
          },
        },
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
    });      // Credit owner's wallet with earnings (including dynamic pricing)
      try {
        const start = new Date(booking.startAt);
        const end = new Date(booking.endAt);
        const hours = (end.getTime() - start.getTime()) / (1000 * 60 * 60);
        const ownerId = booking.facility.location.ownerId;

        // Fetch pricing rules to calculate dynamic owner earnings
        const pricingRules = await prisma.pricingRule.findMany({
          where: {
            location: { ownerId },
            isActive: true,
          },
        });

        const startTimeStr = `${String(start.getHours()).padStart(2, "0")}:${String(start.getMinutes()).padStart(2, "0")}`;
        const dayOfWeek = start.getDay();
        const { adjustedPrice: dynamicOwnerPrice } = calculateDynamicPrice(
          Number(booking.facility.price),
          startTimeStr,
          dayOfWeek,
          pricingRules,
        );

        const ownerEarnings = hours * dynamicOwnerPrice;

      if (ownerEarnings > 0 && ownerId) {
        const ownerWallet = await prisma.wallet.upsert({
          where: { userId: ownerId },
          create: { userId: ownerId, balance: ownerEarnings },
          update: { balance: { increment: ownerEarnings } },
        });

        await prisma.walletTransaction.create({
          data: {
            walletId: ownerWallet.id,
            amount: ownerEarnings,
            type: "CREDIT",
            bookingId: booking.id,
            note: "Booking earning",
          },
        });
      }
    } catch (walletError) {
      console.error("Owner wallet credit failed (payment still recorded):", walletError);
    }

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
