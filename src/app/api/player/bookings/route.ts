import { NextResponse } from "next/server";

import { getCurrentUser } from "@/lib/auth";
import { prisma } from "@/lib/prisma";

export async function GET(request: Request) {
  const currentUser = await getCurrentUser();

  if (!currentUser) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  if (currentUser.role !== "PLAYER") {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }

  const { searchParams } = new URL(request.url);

  const statusFilter = searchParams.get("status");

  const where: Record<string, unknown> = {
    playerId: currentUser.id,
  };

  if (statusFilter && ["PENDING", "CONFIRMED", "CANCELLED", "COMPLETED"].includes(statusFilter)) {
    where.status = statusFilter;
  }

  const bookings = await prisma.booking.findMany({
    where,
    include: {
      facility: {
        include: {
          sports: {
            select: { id: true, name: true },
          },
          location: {
            select: { id: true, name: true, address: true, city: true },
          },
        },
      },
    },
    orderBy: { createdAt: "desc" },
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
    facility: {
      id: booking.facility.id,
      name: booking.facility.name,
      price: booking.facility.price.toString(),
      sports: booking.facility.sports,
      location: booking.facility.location,
    },
  }));

  return NextResponse.json({ bookings: result });
}
