import { eq, asc } from "drizzle-orm";

import { requireOwner } from "@/lib/owner";
import Header from "@/components/Header";
import BookingsClient from "./BookingsClient";
import { db } from "@/lib/prisma";
import {
  bookings,
  facilities,
  locations,
  users,
  facilityToSport,
  sports,
} from "@/db/schema";

export default async function OwnerBookingsPage() {
  const user = await requireOwner();

  // Get all bookings for this owner's facilities
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
      playerId: bookings.playerId,
      facilityId: bookings.facilityId,
    })
    .from(bookings)
    .innerJoin(facilities, eq(bookings.facilityId, facilities.id))
    .innerJoin(locations, eq(facilities.locationId, locations.id))
    .where(eq(locations.ownerId, user.id))
    .orderBy(bookings.startAt);

  // Get locations for filter dropdown
  const ownerLocations = await db
    .select({ id: locations.id, name: locations.name })
    .from(locations)
    .where(eq(locations.ownerId, user.id))
    .orderBy(locations.name);

  // Enrich bookings with facility, location, sports, and player data
  const enrichedBookings = await Promise.all(
    rawBookings.map(async (b) => {
      const [facility] = await db
        .select()
        .from(facilities)
        .where(eq(facilities.id, b.facilityId))
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
        .where(eq(users.id, b.playerId))
        .limit(1);

      return {
        id: b.id,
        startAt: b.startAt.toISOString(),
        endAt: b.endAt.toISOString(),
        totalPrice: b.totalPrice.toString(),
        status: b.status,
        paymentStatus: b.paymentStatus,
        paymentMethod: b.paymentMethod,
        orderId: b.orderId,
        createdAt: b.createdAt.toISOString(),
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
                    latitude: location.latitude,
                    longitude: location.longitude,
                  }
                : null,
            }
          : null,
      };
    }),
  );

  return (
    <main className="min-h-screen bg-slate-50">
      <Header user={user} />

      <div className="mx-auto max-w-5xl px-4 py-8 sm:px-6">
        <div className="mb-6">
          <h1 className="text-2xl font-bold text-slate-900 sm:text-3xl">
            My Bookings
          </h1>
          <p className="mt-1 text-slate-500">
            View and manage bookings for all your facilities.
          </p>
        </div>

        <BookingsClient
          initialBookings={enrichedBookings.filter((b) => b.facility !== null) as any}
          locations={ownerLocations}
        />
      </div>
    </main>
  );
}
