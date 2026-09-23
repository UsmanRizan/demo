import { after, NextResponse } from "next/server";

import { audit } from "@/lib/audit";
import { getCurrentUser } from "@/lib/auth";
import { BookingError, cancelBooking } from "@/lib/bookings";
import { logError } from "@/lib/monitoring";
import { notifyBookingCancelled } from "@/lib/notifications";
import { prisma } from "@/lib/prisma";
import { ownerBookingActionSchema, parseJson } from "@/lib/validation";

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

  try {
    const { id } = await params;

    const parsed = await parseJson(request, ownerBookingActionSchema);

    if (parsed.response) {
      return parsed.response;
    }

    const { action, reason } = parsed.data;

    const booking = await prisma.booking.findFirst({
      where: {
        id,
        facility: { location: { ownerId: currentUser.id } },
      },
    });

    if (!booking) {
      return NextResponse.json({ error: "Booking not found" }, { status: 404 });
    }

    let walletCredited = false;
    let refundAmount = 0;

    if (action === "cancel") {
      const result = await cancelBooking({
        bookingId: booking.id,
        actor: { kind: "owner", userId: currentUser.id },
        reason: reason || "Cancelled by venue",
      });

      walletCredited = result.walletCredited;
      refundAmount = result.refundAmount;

      after(() =>
        notifyBookingCancelled(booking.id, "owner", result.refundAmount, reason),
      );
    } else if (action === "confirm") {
      // Only paid bookings can be confirmed; an unpaid hold is not a booking yet.
      if (booking.status !== "PENDING" || booking.paymentStatus !== "PAID") {
        return NextResponse.json(
          { error: "Only paid, pending bookings can be confirmed." },
          { status: 400 },
        );
      }

      await prisma.booking.update({
        where: { id: booking.id },
        data: { status: "CONFIRMED" },
      });
    } else {
      if (booking.status !== "CONFIRMED" || booking.endAt > new Date()) {
        return NextResponse.json(
          { error: "Only confirmed bookings that have ended can be completed." },
          { status: 400 },
        );
      }

      await prisma.booking.update({
        where: { id: booking.id },
        data: { status: "COMPLETED" },
      });
    }

    await audit({
      actorId: currentUser.id,
      action: `booking.${action}`,
      entityType: "Booking",
      entityId: booking.id,
      metadata: { reason: reason ?? null, refundAmount },
      request,
    });

    const updated = await prisma.booking.findUniqueOrThrow({
      where: { id: booking.id },
      include: {
        facility: {
          include: {
            sports: { select: { id: true, name: true } },
            location: { select: { id: true, name: true, address: true, city: true } },
          },
        },
        player: {
          select: { firstName: true, lastName: true, phone: true, email: true, id: true },
        },
      },
    });

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
      player: updated.player,
      facility: {
        id: updated.facility.id,
        name: updated.facility.name,
        price: updated.facility.price.toString(),
        sports: updated.facility.sports,
        location: updated.facility.location,
      },
      ...(action === "cancel" && {
        walletCredited,
        refundAmount: refundAmount.toFixed(2),
      }),
    });
  } catch (error) {
    if (error instanceof BookingError) {
      return NextResponse.json({ error: error.message }, { status: error.status });
    }

    logError("Owner booking action error:", error);

    return NextResponse.json(
      { error: "Failed to update booking" },
      { status: 500 },
    );
  }
}
