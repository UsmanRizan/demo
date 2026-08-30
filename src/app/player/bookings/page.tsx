import { redirect } from "next/navigation";
import { eq, desc } from "drizzle-orm";

import { getCurrentUser } from "@/lib/auth";
import Header from "@/components/Header";
import Footer from "@/components/Footer";
import BookingsClient from "./BookingsClient";
import { db } from "@/lib/prisma";
import {
  bookings,
  facilities,
  locations,
  sports,
  facilityToSport,
  wallets,
} from "@/db/schema";

export default async function PlayerBookingsPage() {
  const user = await getCurrentUser();

  if (!user) {
    redirect("/login");
  }

  if (user.role !== "PLAYER") {
    redirect("/");
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
    })
    .from(bookings)
    .where(eq(bookings.playerId, user.id))
    .orderBy(desc(bookings.createdAt));

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
            .select({ name: sports.name })
            .from(facilityToSport)
            .innerJoin(sports, eq(facilityToSport.b, sports.id))
            .where(eq(facilityToSport.a, facility.id))
        : [];

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
        facility: facility
          ? {
              id: facility.id,
              name: facility.name,
              price: facility.price.toString(),
              sports: facilitySports,
              location: location
                ? {
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

  const [wallet] = await db
    .select()
    .from(wallets)
    .where(eq(wallets.userId, user.id))
    .limit(1);
  const walletBalance = wallet ? Number(wallet.balance) : 0;

  return (
    <main className="min-h-screen bg-white">
      <Header user={user} />

      <div className="mx-auto max-w-5xl px-4 py-8 sm:px-6">
        <div className="mb-6">
          <h1 className="text-2xl font-bold uppercase sm:text-3xl">
            My Bookings
          </h1>
          <p className="mt-1 text-gray-500">
            View and manage your sports facility bookings.
          </p>
        </div>

        {/* Wallet Balance */}
        <div className="mb-6 border-[3px] border-black bg-black p-5 text-white">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm font-bold uppercase text-gray-400">
                Wallet Balance
              </p>
              <p className="mt-0.5 text-2xl font-bold">
                Rs.{" "}
                {walletBalance.toLocaleString("en-LK", {
                  minimumFractionDigits: 2,
                })}
              </p>
            </div>
            <div className="text-3xl">💰</div>
          </div>
        </div>

        <BookingsClient initialBookings={enrichedBookings.filter((b) => b.facility !== null) as any} />
      </div>

      <Footer />
    </main>
  );
}
