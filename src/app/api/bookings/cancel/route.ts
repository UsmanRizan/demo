import { NextResponse } from "next/server";

import { getCurrentUser } from "@/lib/auth";
import { prisma } from "@/lib/prisma";

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
      },
    });

    if (!booking || booking.playerId !== currentUser.id) {
      return NextResponse.json(
        { error: "Booking not found." },
        { status: 404 },
      );
    }

    await prisma.booking.update({
      where: { id: booking.id },
      data: {
        status: "CANCELLED",
        paymentStatus: "CANCELLED",
        expiresAt: null,
      },
    });

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error("Booking cancellation error:", error);

    return NextResponse.json(
      { error: "Failed to cancel booking." },
      { status: 500 },
    );
  }
}
