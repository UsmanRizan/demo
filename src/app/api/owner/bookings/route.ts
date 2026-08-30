import { NextResponse } from "next/server";
import { eq, and, or, desc, inArray, lt, gte } from "drizzle-orm";

import { getCurrentUser } from "@/lib/auth";
import { db } from "@/lib/prisma";
import {
  bookings,
  facilities,
  locations,
  users,
  facilityToSport,
  sports,
} from "@/db/schema";

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

  // Build the query with joins
  const conditions = [
    eq(locations.ownerId, currentUser.id),
  ];

  if (locationId) {
    conditions.push(eq(facilities.locationId, locationId));
  }

  if (
    statusFilter &&
    ["PENDING", "CONFIRMED", "CANCELLED", "COMPLETED"].includes(statusFilter)
  ) {
    conditions.push(
      eq(bookings.status, statusFilter as "PENDING" | "CONFIRMED" | "CANCELLED" | "COMPLETED"),
    );
  }

  if (period === "upcoming") {
    conditions.push(gte(bookings.startAt, now));
    conditions.push(
      inArray(bookings.status, ["PENDING", "CONFIRMED"]),
    );
  } else if (period === "past") {
    // This is complex with OR, let's handle it separately
  }

  // For 'past' period, we need OR logic which is harder to compose
  // Let's handle this by fetching all and filtering, or using or()
  let rawBookings;

  if (period === "past") {
    const pastConditions = [
      eq(locations.ownerId, currentUser.id),
      ...(locationId ? [eq(facilities.locationId, locationId)] : []),
      or(
        lt(bookings.endAt, now),
        inArray(bookings.status, ["CANCELLED", "COMPLETED"]),
      )!,
    ];

    rawBookings = await db
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
      .innerJoin(facilities, eq(bookings.facilityId, facilities.id))
      .innerJoin(locations, eq(facilities.locationId, locations.id))
      .where(and(...pastConditions))
      .orderBy(bookings.startAt);
  } else {
    rawBookings = await db
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
      .innerJoin(facilities, eq(bookings.facilityId, facilities.id))
      .innerJoin(locations, eq(facilities.locationId, locations.id))
      .where(and(...conditions))
      .orderBy(bookings.startAt);
  }

  // Enrich with facility, location, sports, and player data
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

      const [player] = await db
        .select({
          firstName: users.firstName,
          lastName: users.lastName,
          phone: users.phone,
          email: users.email,
        })
        .from(users)
        .where(eq(users.id, booking.playerId))
        .limit(1);

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
        player: player ?? null,
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
