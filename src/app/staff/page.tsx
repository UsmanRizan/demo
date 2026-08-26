import { redirect } from "next/navigation";

import { getCurrentUser } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import Header from "@/components/Header";
import StaffBookingsClient from "./StaffBookingsClient";

export default async function StaffDashboardPage() {
  const user = await getCurrentUser();

  if (!user) {
    redirect("/login");
  }

  if (user.role !== "STAFF") {
    redirect("/");
  }

  // Get staff's assigned locations
  const staffAssignments = await prisma.locationStaff.findMany({
    where: { staffId: user.id },
    include: {
      location: {
        include: {
          facilities: {
            include: {
              sports: { select: { id: true, name: true } },
            },
            orderBy: { name: "asc" },
          },
        },
      },
    },
    orderBy: { createdAt: "desc" },
  });

  if (staffAssignments.length === 0) {
    return (
      <main className="min-h-screen bg-slate-50">
        <Header user={user} />

        <div className="mx-auto max-w-5xl px-4 py-8 sm:px-6">
          <div className="mb-6">
            <h1 className="text-2xl font-bold text-slate-900 sm:text-3xl">
              Staff Dashboard
            </h1>
            <p className="mt-1 text-slate-500">
              You are not assigned to any location yet.
            </p>
          </div>

          <div className="rounded-2xl border-2 border-dashed border-slate-200 bg-white p-8 text-center">
            <div className="mx-auto flex h-14 w-14 items-center justify-center rounded-2xl bg-slate-50 text-slate-400">
              <svg
                className="h-7 w-7"
                fill="none"
                stroke="currentColor"
                strokeWidth="1.5"
                viewBox="0 0 24 24"
              >
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  d="M15 10.5a3 3 0 11-6 0 3 3 0 016 0z"
                />
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  d="M19.5 10.5c0 7.142-7.5 11.25-7.5 11.25S4.5 17.642 4.5 10.5a7.5 7.5 0 1115 0z"
                />
              </svg>
            </div>
            <h3 className="mt-4 text-lg font-semibold text-slate-900">
              No locations assigned
            </h3>
            <p className="mt-2 text-sm text-slate-500">
              Please contact your location owner to get assigned.
            </p>
          </div>
        </div>
      </main>
    );
  }

  const location = staffAssignments[0].location;

  // Get bookings for this location's facilities
  const facilityIds = location.facilities.map((f) => f.id);

  const rawBookings =
    facilityIds.length > 0
      ? await prisma.booking.findMany({
          where: {
            facilityId: { in: facilityIds },
          },
          include: {
            facility: {
              include: {
                sports: { select: { id: true, name: true } },
              },
            },
            player: {
              select: {
                firstName: true,
                lastName: true,
                phone: true,
                email: true,
              },
            },
          },
          orderBy: { startAt: "asc" },
        })
      : [];

  const bookings = rawBookings.map((b) => ({
    id: b.id,
    startAt: b.startAt.toISOString(),
    endAt: b.endAt.toISOString(),
    totalPrice: b.totalPrice.toString(),
    status: b.status,
    paymentStatus: b.paymentStatus,
    paymentMethod: b.paymentMethod,
    orderId: b.orderId,
    createdAt: b.createdAt.toISOString(),
    player: b.player,
    facility: {
      id: b.facility.id,
      name: b.facility.name,
      price: b.facility.price.toString(),
      sports: b.facility.sports,
    },
  }));

  return (
    <main className="min-h-screen bg-slate-50">
      <Header user={user} />

      <div className="mx-auto max-w-5xl px-4 py-8 sm:px-6">
        {/* Location Info */}
        <div className="mb-6">
          <p className="text-sm font-medium text-slate-500">Staff Dashboard</p>
          <h1 className="mt-1 text-2xl font-bold text-slate-900 sm:text-3xl">
            {location.name}
          </h1>
          <p className="mt-1 text-slate-500">
            {location.address}, {location.city}
          </p>
        </div>

        {/* Stats */}
        <div className="mb-6 grid gap-4 sm:grid-cols-3">
          <div className="rounded-2xl border border-slate-200 bg-white p-5">
            <p className="text-sm text-slate-500">Facilities</p>
            <p className="mt-1 text-2xl font-bold text-slate-900">
              {location.facilities.length}
            </p>
          </div>
          <div className="rounded-2xl border border-slate-200 bg-white p-5">
            <p className="text-sm text-slate-500">Total Bookings</p>
            <p className="mt-1 text-2xl font-bold text-slate-900">
              {bookings.length}
            </p>
          </div>
          <div className="rounded-2xl border border-slate-200 bg-white p-5">
            <p className="text-sm text-slate-500">Upcoming</p>
            <p className="mt-1 text-2xl font-bold text-slate-900">
              {
                bookings.filter(
                  (b) =>
                    (b.status === "PENDING" || b.status === "CONFIRMED") &&
                    new Date(b.startAt) > new Date(),
                ).length
              }
            </p>
          </div>
        </div>

        {/* Facilities */}
        {location.facilities.length > 0 && (
          <div className="mb-6 rounded-2xl border border-slate-200 bg-white p-6">
            <h2 className="mb-4 text-lg font-semibold text-slate-900">
              Facilities
            </h2>
            <div className="grid gap-3 sm:grid-cols-2">
              {location.facilities.map((facility) => (
                <div
                  key={facility.id}
                  className="flex items-center justify-between rounded-xl bg-slate-50 p-4"
                >
                  <div>
                    <p className="font-medium text-slate-900">
                      {facility.name}
                    </p>
                    <p className="text-xs text-slate-500">
                      {facility.sports.map((s) => s.name).join(", ") ||
                        "No sports"}
                    </p>
                  </div>
                  <span
                    className={`rounded-full px-2.5 py-0.5 text-xs font-medium ${
                      facility.isActive
                        ? "bg-green-50 text-green-700"
                        : "bg-slate-100 text-slate-500"
                    }`}
                  >
                    {facility.isActive ? "Active" : "Inactive"}
                  </span>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* Bookings */}
        <section>
          <h2 className="mb-4 text-lg font-semibold text-slate-900">
            Bookings
          </h2>
          <StaffBookingsClient initialBookings={bookings} />
        </section>
      </div>
    </main>
  );
}
