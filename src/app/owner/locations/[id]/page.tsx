import { notFound, redirect } from "next/navigation";

import { getCurrentUser } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { getSportIcon } from "@/lib/sport-icons";
import AvailabilityEditor from "@/components/owner/AvailabilityEditor";
import BlockedDatesEditor from "@/components/owner/BlockedDatesEditor";

type PageProps = {
  params: Promise<{
    id: string;
  }>;
};

export default async function LocationPage({ params }: PageProps) {
  const user = await getCurrentUser();

  if (!user) {
    redirect("/login");
  }

  if (user.role !== "OWNER") {
    redirect("/");
  }

  const { id } = await params;

  const location = await prisma.location.findFirst({
    where: {
      id,
      ownerId: user.id,
    },
    include: {
      facilities: {
        include: {
          sports: true,
        },
        orderBy: {
          name: "asc",
        },
      },
    },
  });

  if (!location) {
    notFound();
  }

  return (
    <main className="min-h-screen bg-gray-50 px-4 py-10 sm:px-6">
      <div className="mx-auto max-w-6xl">
        <a href="/owner" className="text-sm text-gray-600">
          ← Back to Owner Dashboard
        </a>

        <div className="mt-6 rounded-xl bg-white p-6 shadow-sm sm:p-8">
          <div className="flex flex-col gap-4 sm:flex-row sm:items-start sm:justify-between">
            <div>
              <h1 className="text-2xl font-bold sm:text-3xl">{location.name}</h1>

              <p className="mt-2 text-gray-600">
                {location.address}, {location.city}
              </p>

              {location.description && (
                <p className="mt-4 max-w-2xl text-gray-600">
                  {location.description}
                </p>
              )}

              <section className="mt-8">
                <AvailabilityEditor locationId={location.id} />
              </section>

              <section className="mt-8">
                <BlockedDatesEditor locationId={location.id} />
              </section>
            </div>

            <div className="flex flex-col gap-3 sm:flex-row">
              <a
                href={`/owner/locations/${location.id}/facilities/new`}
                className="w-full rounded-lg bg-black px-5 py-3 text-center text-sm font-medium text-white sm:w-auto"
              >
                Add Facility
              </a>

              <a
                href={`/owner/bookings?locationId=${location.id}`}
                className="w-full rounded-lg border border-gray-300 px-5 py-3 text-center text-sm font-medium sm:w-auto"
              >
                View Bookings
              </a>
            </div>
          </div>
        </div>

        <section className="mt-8">
          <h2 className="text-2xl font-bold">Facilities</h2>

          <div className="mt-5 grid gap-5 md:grid-cols-2">
            {location.facilities.map((facility) => (
              <div
                key={facility.id}
                className="rounded-xl bg-white p-6 shadow-sm"
              >
                <div className="flex items-start justify-between">
                  <div>
                    <h3 className="text-xl font-semibold">{facility.name}</h3>

                    <p className="mt-1 text-sm text-gray-500">
                      {facility.sports.map((s) => `${getSportIcon(s.name)} ${s.name}`).join(", ")}
                    </p>
                  </div>

                  <span className="rounded-full bg-gray-100 px-3 py-1 text-xs font-medium">
                    {facility.isActive ? "Active" : "Inactive"}
                  </span>
                </div>

                {facility.description && (
                  <p className="mt-4 text-sm text-gray-600">
                    {facility.description}
                  </p>
                )}

                <div className="mt-5 flex items-center justify-between">
                  <p className="text-lg font-semibold">
                    Rs. {facility.price.toString()}
                  </p>

                  <a
                    href={`/owner/facilities/${facility.id}`}
                    className="rounded-lg border border-gray-300 px-4 py-2 text-sm font-medium"
                  >
                    Manage
                  </a>
                </div>
              </div>
            ))}

            {location.facilities.length === 0 && (
              <div className="rounded-xl bg-white p-6 text-gray-600 md:col-span-2">
                No facilities have been added yet.
              </div>
            )}
          </div>
        </section>
      </div>
    </main>
  );
}
