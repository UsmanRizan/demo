import { NextResponse } from "next/server";
import { eq, and, desc } from "drizzle-orm";

import { getCurrentUser } from "@/lib/auth";
import { db } from "@/lib/prisma";
import {
  bookings,
  facilities,
  locations,
  facilityToSport,
  sports,
} from "@/db/schema";

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

  const conditions = [eq(bookings.playerId, currentUser.id)];

  if (
    statusFilter &&
    ["PENDING", "CONFIRMED", "CANCELLED", "COMPLETED"].includes(statusFilter)
  ) {
    conditions.push(
      eq(bookings.status, statusFilter as "PENDING" | "CONFIRMED" | "CANCELLED" | "COMPLETED"),
    );
  }

  const rawBookings = await db
    .select({
      id: bookings.id,
      startAt: bookings.startAt,
      endAt: bookings.endAt,
      totalPrice: bookings.totalPrice,
      status: bookings.status,
      paymentStatus: bookings.paymentStatus,
      paymentMethod: bookings.paymentMethod,
      orderId: bookings.orderId,
      createdAt: bookings.createdAt,
      facilityId: bookings.facilityId,
      playerId: bookings.playerId,
    })
    .from(bookings)
    .where(and(...conditions))
    .orderBy(desc(bookings.createdAt));

  // Enrich with facility, location, and sports data
  const result = await Promise.all(
    rawBookings.map(async (booking) => {
      const [facility] = await db
        .select()
        .from(facilities)
        .where(eq(facilities.id, booking.facilityId))
        .limit(1);

      const [location] = facility
        ? await db
            .select()
            .from(locations)
            .where(eq(locations.id, facility.locationId))
            .limit(1)
        : [null];

      const facilitySports = facility
        ? await db
            .select({ id: sports.id, name: sports.name })
            .from(facilityToSport)
            .innerJoin(sports, eq(facilityToSport.b, sports.id))
            .where(eq(facilityToSport.a, facility.id))
        : [];

      return {
        id: booking.id,
        startAt: booking.startAt.toISOString(),
        endAt: booking.endAt.toISOString(),
        totalPrice: booking.totalPrice.toString(),
        status: booking.status,
        paymentStatus: booking.paymentStatus,
        paymentMethod: booking.paymentMethod,
        orderId: booking.orderId,
        createdAt: booking.createdAt.toISOString(),
        facility: facility
          ? {
              id: facility.id,
              name: facility.name,
              price: facility.price.toString(),
              sports: facilitySports,
              location: location
                ? {
                    id: location.id,
                    name: location.name,
                    address: location.address,
                    city: location.city,
                  }
                : null,
            }
          : null,
      };
    }),
  );

  return NextResponse.json({ bookings: result });
}
