import { requireOwner } from "@/lib/owner";
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
    },
    orderBy: {
      createdAt: "desc",
    },
  });

  return (
    <main className="min-h-screen bg-gray-50">
      <header className="border-b bg-white">
        <div className="mx-auto flex max-w-7xl items-center justify-between px-6 py-4">
          <div>
            <h1 className="text-2xl font-bold">BookMyPlay Owner</h1>

            <p className="text-sm text-gray-500">{user.phone}</p>
          </div>

          <span className="rounded-full bg-black px-3 py-1 text-xs font-medium text-white">
            OWNER
          </span>
        </div>
      </header>

      <div className="mx-auto max-w-7xl px-6 py-10">
        <div className="flex items-center justify-between">
          <div>
            <h2 className="text-3xl font-bold">Your locations</h2>

            <p className="mt-1 text-gray-600">
              Manage your sports facilities and locations.
            </p>
          </div>

          <a
            href="/owner/locations/new"
            className="rounded-lg bg-black px-5 py-3 text-sm font-medium text-white"
          >
            Add Location
          </a>

          <a
            href="/owner/bookings"
            className="rounded-lg border border-gray-300 px-5 py-3 text-sm font-medium"
          >
            My Bookings
          </a>
        </div>

        <div className="mt-8 grid gap-6 md:grid-cols-2 lg:grid-cols-3">
          {locations.map((location) => (
            <div
              key={location.id}
              className="rounded-xl bg-white p-6 shadow-sm"
            >
              <h3 className="text-xl font-semibold">{location.name}</h3>

              <p className="mt-2 text-sm text-gray-500">{location.address}</p>

              <p className="mt-1 text-sm text-gray-500">{location.city}</p>

              <div className="mt-5 flex items-center justify-between">
                <span className="text-sm text-gray-600">
                  {location._count.facilities}{" "}
                  {location._count.facilities === 1 ? "facility" : "facilities"}
                </span>

                <a
                  href={`/owner/locations/${location.id}`}
                  className="rounded-lg border border-gray-300 px-4 py-2 text-sm font-medium"
                >
                  Manage
                </a>
              </div>
            </div>
          ))}

          {locations.length === 0 && (
            <div className="rounded-xl bg-white p-8 shadow-sm md:col-span-2 lg:col-span-3">
              <h3 className="text-xl font-semibold">No locations yet</h3>

              <p className="mt-2 text-gray-600">
                Create your first location to start adding sports facilities.
              </p>

              <a
                href="/owner/locations/new"
                className="mt-5 inline-block rounded-lg bg-black px-5 py-3 text-sm font-medium text-white"
              >
                Create Location
              </a>
            </div>
          )}
        </div>
      </div>
    </main>
  );
}
