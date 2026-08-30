import { eq, and, count, count as drizzleCount } from "drizzle-orm";

import { requireOwner } from "@/lib/owner";
import Header from "@/components/Header";
import Footer from "@/components/Footer";
import SetPasswordPrompt from "@/components/SetPasswordPrompt";
import { db } from "@/lib/prisma";
import { locations, facilities, bookings } from "@/db/schema";

export default async function OwnerDashboard() {
  const user = await requireOwner();

  // Get locations with facility and booking counts
  const ownerLocations = await db
    .select()
    .from(locations)
    .where(eq(locations.ownerId, user.id))
    .orderBy(locations.createdAt);

  // Get facility and booking counts for each location
  const locationsWithCounts = await Promise.all(
    ownerLocations.map(async (location) => {
      const [{ facilityCount }] = await db
        .select({ facilityCount: count() })
        .from(facilities)
        .where(eq(facilities.locationId, location.id));

      const [{ bookingCount }] = await db
        .select({ bookingCount: count() })
        .from(bookings)
        .innerJoin(facilities, eq(bookings.facilityId, facilities.id))
        .where(eq(facilities.locationId, location.id));

      return {
        ...location,
        _count: {
          facilities: facilityCount,
        },
        bookingCount,
      };
    }),
  );

  const totalFacilities = locationsWithCounts.reduce(
    (sum, loc) => sum + loc._count.facilities,
    0,
  );
  const totalBookings = locationsWithCounts.reduce(
    (sum, loc) => sum + loc.bookingCount,
    0,
  );

  const displayName =
    [user.firstName, user.lastName].filter(Boolean).join(" ") || user.phone;

  return (
    <main className="min-h-screen bg-white">
      <Header user={user} />

      <div className="mx-auto max-w-7xl px-4 py-8 sm:px-6 sm:py-12">
        {/* Welcome */}
        <div className="mb-8">
          <p className="text-sm font-bold uppercase text-gray-500">
            Owner Dashboard
          </p>
          <h1 className="mt-1 text-2xl font-bold uppercase sm:text-3xl">
            Welcome, {displayName}
          </h1>
        </div>

        {/* Stats */}
        <div className="mb-6 grid gap-4 sm:grid-cols-3">
          <div className="border-[2px] border-black bg-white p-5">
            <p className="text-sm text-gray-500 uppercase font-bold">
              Locations
            </p>
            <p className="mt-1 text-2xl font-bold">
              {locationsWithCounts.length}
            </p>
          </div>
          <div className="border-[2px] border-black bg-white p-5">
            <p className="text-sm text-gray-500 uppercase font-bold">
              Facilities
            </p>
            <p className="mt-1 text-2xl font-bold">{totalFacilities}</p>
          </div>
          <div className="border-[2px] border-black bg-white p-5">
            <p className="text-sm text-gray-500 uppercase font-bold">
              Total Bookings
            </p>
            <p className="mt-1 text-2xl font-bold">{totalBookings}</p>
          </div>
        </div>

        {/* Header row */}
        <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
          <h2 className="text-lg font-bold uppercase">Your Locations</h2>

          <div className="flex flex-col gap-3 sm:flex-row">
            <a
              href="/owner/locations/new"
              className="inline-flex items-center justify-center border-[3px] border-black bg-black px-5 py-2.5 text-sm font-bold uppercase text-white transition-colors hover:bg-white hover:text-black"
            >
              <svg
                className="mr-2 h-4 w-4"
                fill="none"
                stroke="currentColor"
                strokeWidth="2.5"
                viewBox="0 0 24 24"
              >
                <path
                  strokeLinecap="square"
                  strokeLinejoin="miter"
                  d="M12 4.5v15m7.5-7.5h-15"
                />
              </svg>
              Add Location
            </a>
            <a
              href="/owner/bookings"
              className="inline-flex items-center justify-center border-[2px] border-black bg-white px-5 py-2.5 text-sm font-bold uppercase text-black transition-all hover:bg-black hover:text-white"
            >
              My Bookings
            </a>
            <a
              href="/owner/earnings"
              className="inline-flex items-center justify-center border-[2px] border-black bg-white px-5 py-2.5 text-sm font-bold uppercase text-black transition-all hover:bg-black hover:text-white"
            >
              Earnings
            </a>
          </div>
        </div>

        {/* Location cards */}
        <div className="mt-6 grid gap-4 md:grid-cols-2 lg:grid-cols-3">
          {locationsWithCounts.map((location) => (
            <div
              key={location.id}
              className="border-[2px] border-black bg-white p-6 transition-colors hover:bg-gray-100"
            >
              <div className="flex items-start justify-between">
                <div className="flex h-10 w-10 items-center justify-center border-[2px] border-black bg-black text-white">
                  <svg
                    className="h-5 w-5"
                    fill="none"
                    stroke="currentColor"
                    strokeWidth="2"
                    viewBox="0 0 24 24"
                  >
                    <path
                      strokeLinecap="square"
                      strokeLinejoin="miter"
                      d="M15 10.5a3 3 0 11-6 0 3 3 0 016 0z"
                    />
                    <path
                      strokeLinecap="square"
                      strokeLinejoin="miter"
                      d="M19.5 10.5c0 7.142-7.5 11.25-7.5 11.25S4.5 17.642 4.5 10.5a7.5 7.5 0 1115 0z"
                    />
                  </svg>
                </div>
                <a
                  href={`/owner/locations/${location.id}`}
                  className="text-sm font-bold uppercase text-black hover:text-gray-600"
                >
                  Manage →
                </a>
              </div>

              <h3 className="mt-4 text-lg font-bold uppercase">
                {location.name}
              </h3>
              <p className="mt-1 text-sm text-gray-500">
                {location.address}
              </p>
              <p className="text-sm text-gray-400 uppercase">
                {location.city}
              </p>

              {location.latitude !== null && location.longitude !== null && (
                <a
                  href={`https://www.google.com/maps/search/?api=1&query=${location.latitude},${location.longitude}`}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="mt-2 inline-flex items-center gap-1.5 border-[2px] border-black px-3 py-1 text-xs font-bold uppercase text-black transition hover:bg-black hover:text-white"
                >
                  <svg
                    className="h-3.5 w-3.5"
                    viewBox="0 0 24 24"
                    fill="none"
                    stroke="currentColor"
                    strokeWidth="2"
                    strokeLinecap="square"
                    strokeLinejoin="miter"
                  >
                    <path d="M21 10c0 7-9 13-9 13s-9-6-9-13a9 9 0 0118 0z" />
                    <circle cx="12" cy="10" r="3" />
                  </svg>
                  Open in Maps
                </a>
              )}

              <div className="mt-4 flex items-center gap-2">
                <span className="border-[2px] border-black bg-white px-2.5 py-0.5 text-xs font-bold uppercase text-black">
                  {location._count.facilities}{" "}
                  {location._count.facilities === 1 ? "facility" : "facilities"}
                </span>
              </div>
            </div>
          ))}

          {locationsWithCounts.length === 0 && (
            <div className="border-[3px] border-dashed border-black bg-white p-8 text-center md:col-span-2 lg:col-span-3">
              <div className="mx-auto flex h-14 w-14 items-center justify-center border-[2px] border-black bg-gray-100 text-gray-400">
                <svg
                  className="h-7 w-7"
                  fill="none"
                  stroke="currentColor"
                  strokeWidth="2"
                  viewBox="0 0 24 24"
                >
                  <path
                    strokeLinecap="square"
                    strokeLinejoin="miter"
                    d="M12 21a9.004 9.004 0 008.716-6.747M12 21a9.004 9.004 0 01-8.716-6.747M12 21c2.485 0 4.5-4.03 4.5-9S14.485 3 12 3m0 18c-2.485 0-4.5-4.03-4.5-9S9.515 3 12 3m0 0a8.997 8.997 0 017.843 4.582M12 3a8.997 8.997 0 00-7.843 4.582m15.686 0A11.953 11.953 0 0112 10.5c-2.998 0-5.74-1.1-7.843-2.918m15.686 0A8.959 8.959 0 0121 12c0 .778-.099 1.533-.284 2.253m0 0A17.919 17.919 0 0112 16.5c-3.162 0-6.133-.815-8.716-2.247m0 0A9.015 9.015 0 013 12c0-1.605.42-3.113 1.157-4.418"
                  />
                </svg>
              </div>
              <h3 className="mt-4 text-lg font-bold uppercase">
                No locations yet
              </h3>
              <p className="mt-2 text-sm text-gray-500">
                Create your first location to start adding sports facilities.
              </p>
              <a
                href="/owner/locations/new"
                className="mt-5 inline-flex items-center border-[3px] border-black bg-black px-5 py-2.5 text-sm font-bold uppercase text-white transition-colors hover:bg-white hover:text-black"
              >
                Create Location
              </a>
            </div>
          )}
        </div>
      </div>

      <Footer />
      <SetPasswordPrompt />
    </main>
  );
}
