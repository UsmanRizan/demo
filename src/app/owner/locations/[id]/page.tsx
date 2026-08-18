import { notFound, redirect } from "next/navigation";

import { getCurrentUser } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import AvailabilityEditor from "@/components/owner/AvailabilityEditor";

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
          sport: true,
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
    <main className="min-h-screen bg-gray-50 px-6 py-10">
      <div className="mx-auto max-w-6xl">
        <a href="/owner" className="text-sm text-gray-600">
          ← Back to Owner Dashboard
        </a>

        <div className="mt-6 rounded-xl bg-white p-8 shadow-sm">
          <div className="flex items-start justify-between gap-6">
            <div>
              <h1 className="text-3xl font-bold">{location.name}</h1>

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
            </div>

            <a
              href={`/owner/locations/${location.id}/facilities/new`}
              className="rounded-lg bg-black px-5 py-3 text-sm font-medium text-white"
            >
              Add Facility
            </a>

            <a
              href={`/owner/bookings?locationId=${location.id}`}
              className="rounded-lg border border-gray-300 px-5 py-3 text-sm font-medium"
            >
              View Bookings
            </a>
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
                      {facility.sport.name}
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
