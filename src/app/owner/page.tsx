import { requireOwner } from "@/lib/owner";
import Header from "@/components/Header";
import Footer from "@/components/Footer";
import SetPasswordPrompt from "@/components/SetPasswordPrompt";
import { prisma } from "@/lib/prisma";

export default async function OwnerDashboard() {
  const user = await requireOwner();

  const locations = await prisma.location.findMany({
    where: {
      ownerId: user.id,
    },
    include: {
      _count: {
        select: {
          facilities: true,
        },
      },
      facilities: {
        select: {
          _count: {
            select: {
              bookings: true,
            },
          },
        },
      },
    },
    orderBy: {
      createdAt: "desc",
    },
  });

  const totalFacilities = locations.reduce((sum, loc) => sum + loc._count.facilities, 0);
  const totalBookings = locations.reduce(
    (sum, loc) => sum + loc.facilities.reduce((fSum, fac) => fSum + fac._count.bookings, 0),
    0,
  );

  const displayName = [user.firstName, user.lastName].filter(Boolean).join(" ") || user.phone;

  return (
    <main className="min-h-screen bg-slate-50">
      <Header user={user} />

      <div className="mx-auto max-w-7xl px-4 py-8 sm:px-6 sm:py-12">
        {/* Welcome */}
        <div className="mb-8">
          <p className="text-sm font-medium text-slate-500">Owner Dashboard</p>
          <h1 className="mt-1 text-2xl font-bold text-slate-900 sm:text-3xl">
            Welcome, {displayName}
          </h1>
        </div>

        {/* Stats */}
        <div className="mb-6 grid gap-4 sm:grid-cols-3">
          <div className="rounded-2xl border border-slate-200 bg-white p-5">
            <p className="text-sm text-slate-500">Locations</p>
            <p className="mt-1 text-2xl font-bold text-slate-900">{locations.length}</p>
          </div>
          <div className="rounded-2xl border border-slate-200 bg-white p-5">
            <p className="text-sm text-slate-500">Facilities</p>
            <p className="mt-1 text-2xl font-bold text-slate-900">{totalFacilities}</p>
          </div>
          <div className="rounded-2xl border border-slate-200 bg-white p-5">
            <p className="text-sm text-slate-500">Total Bookings</p>
            <p className="mt-1 text-2xl font-bold text-slate-900">{totalBookings}</p>
          </div>
        </div>

        {/* Header row */}
        <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
          <h2 className="text-lg font-semibold text-slate-900">Your Locations</h2>

          <div className="flex flex-col gap-3 sm:flex-row">
            <a
              href="/owner/locations/new"
              className="inline-flex items-center justify-center rounded-xl bg-indigo-600 px-5 py-2.5 text-sm font-semibold text-white shadow-lg shadow-indigo-200 transition-all hover:bg-indigo-700"
            >
              <svg className="mr-2 h-4 w-4" fill="none" stroke="currentColor" strokeWidth="2" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" d="M12 4.5v15m7.5-7.5h-15" />
              </svg>
              Add Location
            </a>
            <a
              href="/owner/bookings"
              className="inline-flex items-center justify-center rounded-xl border border-slate-200 bg-white px-5 py-2.5 text-sm font-semibold text-slate-700 transition-all hover:border-slate-300 hover:bg-slate-50"
            >
              My Bookings
            </a>
          </div>
        </div>

        {/* Location cards */}
        <div className="mt-6 grid gap-4 md:grid-cols-2 lg:grid-cols-3">
          {locations.map((location) => (
            <div
              key={location.id}
              className="card-hover rounded-2xl border border-slate-200 bg-white p-6"
            >
              <div className="flex items-start justify-between">
                <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-indigo-50 text-indigo-600">
                  <svg className="h-5 w-5" fill="none" stroke="currentColor" strokeWidth="1.5" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" d="M15 10.5a3 3 0 11-6 0 3 3 0 016 0z" />
                    <path strokeLinecap="round" strokeLinejoin="round" d="M19.5 10.5c0 7.142-7.5 11.25-7.5 11.25S4.5 17.642 4.5 10.5a7.5 7.5 0 1115 0z" />
                  </svg>
                </div>
                <a
                  href={`/owner/locations/${location.id}`}
                  className="text-sm font-medium text-indigo-600 hover:text-indigo-700"
                >
                  Manage →
                </a>
              </div>

              <h3 className="mt-4 text-lg font-semibold text-slate-900">{location.name}</h3>
              <p className="mt-1 text-sm text-slate-500">{location.address}</p>
              <p className="text-sm text-slate-400">{location.city}</p>

              <div className="mt-4 flex items-center gap-2">
                <span className="rounded-full bg-slate-100 px-2.5 py-0.5 text-xs font-medium text-slate-600">
                  {location._count.facilities} {location._count.facilities === 1 ? "facility" : "facilities"}
                </span>
              </div>
            </div>
          ))}

          {locations.length === 0 && (
            <div className="rounded-2xl border-2 border-dashed border-slate-200 bg-white p-8 text-center md:col-span-2 lg:col-span-3">
              <div className="mx-auto flex h-14 w-14 items-center justify-center rounded-2xl bg-slate-50 text-slate-400">
                <svg className="h-7 w-7" fill="none" stroke="currentColor" strokeWidth="1.5" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" d="M12 21a9.004 9.004 0 008.716-6.747M12 21a9.004 9.004 0 01-8.716-6.747M12 21c2.485 0 4.5-4.03 4.5-9S14.485 3 12 3m0 18c-2.485 0-4.5-4.03-4.5-9S9.515 3 12 3m0 0a8.997 8.997 0 017.843 4.582M12 3a8.997 8.997 0 00-7.843 4.582m15.686 0A11.953 11.953 0 0112 10.5c-2.998 0-5.74-1.1-7.843-2.918m15.686 0A8.959 8.959 0 0121 12c0 .778-.099 1.533-.284 2.253m0 0A17.919 17.919 0 0112 16.5c-3.162 0-6.133-.815-8.716-2.247m0 0A9.015 9.015 0 013 12c0-1.605.42-3.113 1.157-4.418" />
                </svg>
              </div>
              <h3 className="mt-4 text-lg font-semibold text-slate-900">No locations yet</h3>
              <p className="mt-2 text-sm text-slate-500">
                Create your first location to start adding sports facilities.
              </p>
              <a
                href="/owner/locations/new"
                className="mt-5 inline-flex items-center rounded-xl bg-indigo-600 px-5 py-2.5 text-sm font-semibold text-white transition-all hover:bg-indigo-700"
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
