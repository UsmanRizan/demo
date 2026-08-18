import { NextResponse } from "next/server";

import { getCurrentUser } from "@/lib/auth";
import { prisma } from "@/lib/prisma";

export async function GET(request: Request) {
  const currentUser = await getCurrentUser();

  if (!currentUser) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  if (currentUser.role !== "OWNER") {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }

  const { searchParams } = new URL(request.url);

  const locationId = searchParams.get("locationId");
  const statusFilter = searchParams.get("status");
  const period = searchParams.get("period");

  const now = new Date();

  const where: Record<string, unknown> = {
    facility: {
      location: {
        ownerId: currentUser.id,
      },
    },
  };

  if (locationId) {
    where.facility = {
      ...(where.facility as Record<string, unknown>),
      locationId,
    };
  }

  if (statusFilter && ["PENDING", "CONFIRMED", "CANCELLED", "COMPLETED"].includes(statusFilter)) {
    where.status = statusFilter;
  }

  if (period === "upcoming") {
    where.startAt = { gte: now };
    where.status = { in: ["PENDING", "CONFIRMED"] };
  } else if (period === "past") {
    where.OR = [
      { endAt: { lt: now } },
      { status: { in: ["CANCELLED", "COMPLETED"] } },
    ];
  }

  const bookings = await prisma.booking.findMany({
    where,
    include: {
      facility: {
        include: {
          sport: { select: { id: true, name: true } },
          location: { select: { id: true, name: true, address: true, city: true } },
        },
      },
      player: {
        select: { firstName: true, lastName: true, phone: true, email: true },
      },
    },
    orderBy: { startAt: "asc" },
  });

  const result = bookings.map((booking) => ({
    id: booking.id,
    startAt: booking.startAt.toISOString(),
    endAt: booking.endAt.toISOString(),
    totalPrice: booking.totalPrice.toString(),
    status: booking.status,
    paymentStatus: booking.paymentStatus,
    paymentMethod: booking.paymentMethod,
    orderId: booking.orderId,
    createdAt: booking.createdAt.toISOString(),
    player: booking.player,
    facility: {
      id: booking.facility.id,
      name: booking.facility.name,
      price: booking.facility.price.toString(),
      sport: booking.facility.sport,
      location: booking.facility.location,
    },
  }));

  return NextResponse.json({ bookings: result });
}
