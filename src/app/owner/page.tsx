import { requireOwner } from "@/lib/owner";
import Header from "@/components/Header";
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
    },
    orderBy: {
      createdAt: "desc",
    },
  });

  return (
    <main className="min-h-screen bg-gray-50">
      <Header user={user} />

      <div className="mx-auto max-w-7xl px-4 py-10 sm:px-6">
        <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
          <div>
            <h2 className="text-2xl font-bold sm:text-3xl">Your locations</h2>

            <p className="mt-1 text-gray-600">
              Manage your sports facilities and locations.
            </p>
          </div>

          <div className="flex flex-col gap-3 sm:flex-row">
            <a
              href="/owner/locations/new"
              className="w-full rounded-lg bg-black px-5 py-3 text-center text-sm font-medium text-white sm:w-auto"
            >
              Add Location
            </a>

            <a
              href="/owner/bookings"
              className="w-full rounded-lg border border-gray-300 px-5 py-3 text-center text-sm font-medium sm:w-auto"
            >
              My Bookings
            </a>
          </div>
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

      <SetPasswordPrompt />
    </main>
  );
}
