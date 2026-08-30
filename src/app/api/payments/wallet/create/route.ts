import { NextResponse } from "next/server";
import { eq, and } from "drizzle-orm";

import { getCurrentUser } from "@/lib/auth";
import { db } from "@/lib/prisma";
import {
  bookings,
  wallets,
  walletTransactions,
  facilities,
  locations,
  pricingRules,
} from "@/db/schema";
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
    const [booking] = await db
      .select({
        id: bookings.id,
        playerId: bookings.playerId,
        status: bookings.status,
        paymentStatus: bookings.paymentStatus,
        totalPrice: bookings.totalPrice,
        expiresAt: bookings.expiresAt,
        startAt: bookings.startAt,
        endAt: bookings.endAt,
        facilityId: facilities.id,
        facilityPrice: facilities.price,
        ownerId: locations.ownerId,
      })
      .from(bookings)
      .innerJoin(facilities, eq(bookings.facilityId, facilities.id))
      .innerJoin(locations, eq(facilities.locationId, locations.id))
      .where(eq(bookings.id, bookingId))
      .limit(1);

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
    const [wallet] = await db
      .select()
      .from(wallets)
      .where(eq(wallets.userId, currentUser.id))
      .limit(1);

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
    await db.transaction(async (tx) => {
      // Deduct from wallet
      const newBalance = walletBalance - amount;
      await tx
        .update(wallets)
        .set({ balance: String(newBalance) })
        .where(eq(wallets.id, wallet.id));

      // Record wallet transaction
      await tx.insert(walletTransactions).values({
        walletId: wallet.id,
        amount: String(amount),
        type: "DEBIT",
        bookingId: booking.id,
        note: "Booking payment",
      });

      // Update booking status
      await tx
        .update(bookings)
        .set({
          status: "CONFIRMED",
          paymentStatus: "PAID",
          paymentMethod: "wallet",
          expiresAt: null,
        })
        .where(eq(bookings.id, booking.id));
    });

    // Credit owner's wallet with earnings (including dynamic pricing)
    try {
      const start = new Date(booking.startAt);
      const end = new Date(booking.endAt);
      const hours = (end.getTime() - start.getTime()) / (1000 * 60 * 60);
      const ownerId = booking.ownerId;

      // Fetch pricing rules to calculate dynamic owner earnings
      const rules = await db
        .select()
        .from(pricingRules)
        .innerJoin(locations, eq(pricingRules.locationId, locations.id))
        .where(
          and(eq(locations.ownerId, ownerId), eq(pricingRules.isActive, true)),
        );

      const startTimeStr = `${String(start.getHours()).padStart(2, "0")}:${String(start.getMinutes()).padStart(2, "0")}`;
      const dayOfWeek = start.getDay();
      const { adjustedPrice: dynamicOwnerPrice } = calculateDynamicPrice(
        Number(booking.facilityPrice),
        startTimeStr,
        dayOfWeek,
        rules.map((r) => ({
          startTime: r.PricingRule.startTime,
          endTime: r.PricingRule.endTime,
          percentage: Number(r.PricingRule.percentage),
          dayOfWeek: r.PricingRule.dayOfWeek,
          isActive: r.PricingRule.isActive,
        })),
      );

      const ownerEarnings = hours * dynamicOwnerPrice;

      if (ownerEarnings > 0 && ownerId) {
        // Upsert owner wallet
        const [existingOwnerWallet] = await db
          .select()
          .from(wallets)
          .where(eq(wallets.userId, ownerId))
          .limit(1);

        let ownerWallet;
        if (existingOwnerWallet) {
          const newBalance = Number(existingOwnerWallet.balance) + ownerEarnings;
          [ownerWallet] = await db
            .update(wallets)
            .set({ balance: String(newBalance) })
            .where(eq(wallets.id, existingOwnerWallet.id))
            .returning();
        } else {
          [ownerWallet] = await db
            .insert(wallets)
            .values({
              userId: ownerId,
              balance: String(ownerEarnings),
            })
            .returning();
        }

        await db.insert(walletTransactions).values({
          walletId: ownerWallet.id,
          amount: String(ownerEarnings),
          type: "CREDIT",
          bookingId: booking.id,
          note: "Booking earning",
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
