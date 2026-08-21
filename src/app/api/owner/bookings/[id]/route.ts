import { NextResponse } from "next/server";

import { getCurrentUser } from "@/lib/auth";
import { prisma } from "@/lib/prisma";

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

  const booking = await prisma.booking.findFirst({
    where: {
      id,
      facility: {
        location: {
          ownerId: currentUser.id,
        },
      },
    },
    include: {
      facility: {
        include: {
          sports: true,
          location: true,
        },
      },
      player: {
        select: { firstName: true, lastName: true, phone: true, email: true },
      },
    },
  });

  if (!booking) {
    return NextResponse.json({ error: "Booking not found" }, { status: 404 });
  }

  let updateData: Record<string, unknown> = {};

  if (action === "confirm") {
    updateData = { status: "CONFIRMED" };
  } else if (action === "complete") {
    updateData = { status: "COMPLETED" };
  } else if (action === "cancel") {
    updateData = { status: "CANCELLED", paymentStatus: "CANCELLED", expiresAt: null };
  }

  const updated = await prisma.booking.update({
    where: { id: booking.id },
    data: updateData,
    include: {
      facility: {
        include: {
          sports: { select: { id: true, name: true } },
          location: { select: { id: true, name: true, address: true, city: true } },
        },
      },
      player: {
        select: { firstName: true, lastName: true, phone: true, email: true },
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
  });
}
