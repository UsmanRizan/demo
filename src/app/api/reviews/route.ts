import { NextResponse } from "next/server";

import { getCurrentUser } from "@/lib/auth";
import { logError } from "@/lib/monitoring";
import { prisma } from "@/lib/prisma";
import { enforceRateLimits } from "@/lib/rate-limit";
import { parseJson, reviewSchema } from "@/lib/validation";

/**
 * Create or update the review for one of the player's own bookings. Only
 * paid bookings that have already taken place can be reviewed.
 */
export async function POST(request: Request) {
  try {
    const currentUser = await getCurrentUser();

    if (!currentUser) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const limited = await enforceRateLimits([
      { key: `review:user:${currentUser.id}`, limit: 20, windowSeconds: 3600 },
    ]);

    if (limited) {
      return limited;
    }

    const parsed = await parseJson(request, reviewSchema);

    if (parsed.response) {
      return parsed.response;
    }

    const { bookingId, rating, comment } = parsed.data;

    const booking = await prisma.booking.findUnique({
      where: { id: bookingId },
      select: {
        id: true,
        playerId: true,
        status: true,
        paymentStatus: true,
        endAt: true,
        facilityId: true,
        facility: { select: { locationId: true } },
      },
    });

    if (!booking || booking.playerId !== currentUser.id) {
      return NextResponse.json({ error: "Booking not found." }, { status: 404 });
    }

    const played =
      booking.paymentStatus === "PAID" &&
      (booking.status === "COMPLETED" ||
        (booking.status === "CONFIRMED" && booking.endAt <= new Date()));

    if (!played) {
      return NextResponse.json(
        { error: "You can review a booking after you have played." },
        { status: 400 },
      );
    }

    const review = await prisma.review.upsert({
      where: { bookingId },
      create: {
        bookingId,
        playerId: currentUser.id,
        locationId: booking.facility.locationId,
        facilityId: booking.facilityId,
        rating,
        comment: comment || null,
      },
      update: { rating, comment: comment || null },
    });

    return NextResponse.json({ success: true, review }, { status: 201 });
  } catch (error) {
    logError("Create review error:", error);

    return NextResponse.json({ error: "Failed to save review." }, { status: 500 });
  }
}
