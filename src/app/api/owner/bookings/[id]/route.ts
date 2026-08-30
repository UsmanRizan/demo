import { NextResponse } from "next/server";
import { eq, and } from "drizzle-orm";

import { getCurrentUser } from "@/lib/auth";
import { db } from "@/lib/prisma";
import {
  bookings,
  facilities,
  locations,
  users,
  wallets,
  walletTransactions,
  facilityToSport,
  sports,
} from "@/db/schema";

export async function PATCH(
  request: Request,
  { params }: { params: Promise<{ id: string }> },
) {
  const currentUser = await getCurrentUser();

  if (!currentUser) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  if (currentUser.role !== "OWNER") {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }

  const { id } = await params;

  const body = await request.json();

  const action = body.action;

  if (!["confirm", "complete", "cancel"].includes(action)) {
    return NextResponse.json(
      { error: "Invalid action. Use confirm, complete, or cancel." },
      { status: 400 },
    );
  }

  // Find the booking with facility and location ownership check
  const [bookingWithRelations] = await db
    .select({
      booking: bookings,
      facilityId: facilities.id,
      facilityName: facilities.name,
      facilityPrice: facilities.price,
      locationId: locations.id,
      locationName: locations.name,
      locationAddress: locations.address,
      locationCity: locations.city,
    })
    .from(bookings)
    .innerJoin(facilities, eq(bookings.facilityId, facilities.id))
    .innerJoin(locations, eq(facilities.locationId, locations.id))
    .where(and(eq(bookings.id, id), eq(locations.ownerId, currentUser.id)))
    .limit(1);

  if (!bookingWithRelations) {
    return NextResponse.json({ error: "Booking not found" }, { status: 404 });
  }

  const { booking } = bookingWithRelations;

  let updateData: Record<string, unknown> = {};

  if (action === "confirm") {
    updateData = { status: "CONFIRMED" };
  } else if (action === "complete") {
    updateData = { status: "COMPLETED" };
  } else if (action === "cancel") {
    updateData = { status: "CANCELLED", paymentStatus: "CANCELLED", expiresAt: null };
  }

  const [updated] = await db
    .update(bookings)
    .set(updateData)
    .where(eq(bookings.id, booking.id))
    .returning();

  // Get facility sports for response
  const facilitySports = await db
    .select({ id: sports.id, name: sports.name })
    .from(facilityToSport)
    .innerJoin(sports, eq(facilityToSport.b, sports.id))
    .where(eq(facilityToSport.a, booking.facilityId));

  // Get player info for response
  const [player] = await db
    .select({
      firstName: users.firstName,
      lastName: users.lastName,
      phone: users.phone,
      email: users.email,
      id: users.id,
    })
    .from(users)
    .where(eq(users.id, booking.playerId))
    .limit(1);

  // Credit player's wallet if a paid booking was cancelled
  let walletCredited = false;
  if (action === "cancel" && booking.paymentStatus === "PAID") {
    const refundAmount = Number(booking.totalPrice);
    try {
      await db.transaction(async (tx) => {
        // Upsert wallet
        const [existingWallet] = await tx
          .select()
          .from(wallets)
          .where(eq(wallets.userId, booking.playerId))
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
              userId: booking.playerId,
              balance: String(refundAmount),
            })
            .returning();
        }

        await tx.insert(walletTransactions).values({
          walletId: wallet.id,
          amount: String(refundAmount),
          type: "CREDIT",
          bookingId: booking.id,
          note: "Booking cancellation refund by owner",
        });
      });

      walletCredited = true;
    } catch (walletError) {
      console.error("Wallet credit failed (booking still cancelled):", walletError);
    }
  }

  return NextResponse.json({
    id: updated.id,
    startAt: updated.startAt.toISOString(),
    endAt: updated.endAt.toISOString(),
    totalPrice: updated.totalPrice.toString(),
    status: updated.status,
    paymentStatus: updated.paymentStatus,
    paymentMethod: updated.paymentMethod,
    orderId: updated.orderId,
    createdAt: updated.createdAt.toISOString(),
    player,
    facility: {
      id: bookingWithRelations.facilityId,
      name: bookingWithRelations.facilityName,
      price: bookingWithRelations.facilityPrice.toString(),
      sports: facilitySports,
      location: {
        id: bookingWithRelations.locationId,
        name: bookingWithRelations.locationName,
        address: bookingWithRelations.locationAddress,
        city: bookingWithRelations.locationCity,
      },
    },
    ...(action === "cancel" && { walletCredited }),
  });
}
