import { notFound, redirect } from "next/navigation";

import { getCurrentUser } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import FacilityPriceEditor from "@/components/owner/FacilityPriceEditor";
import FacilitySportsEditor from "@/components/owner/FacilitySportsEditor";

type PageProps = {
  params: Promise<{
    id: string;
  }>;
};

export default async function FacilityPage({ params }: PageProps) {
  const user = await getCurrentUser();

  if (!user) {
    redirect("/login");
  }

  if (user.role !== "OWNER") {
    redirect("/");
  }

  const { id } = await params;

  const [facility, allSports] = await Promise.all([
    prisma.facility.findFirst({
      where: {
        id,
        location: {
          ownerId: user.id,
        },
      },
      include: {
        sports: true,
        location: true,
      },
    }),
    prisma.sport.findMany({
      where: { isActive: true },
      orderBy: { name: "asc" },
    }),
  ]);

  if (!facility) {
    notFound();
  }

  return (
    <main className="min-h-screen bg-gray-50 px-4 py-10 sm:px-6">
      <div className="mx-auto max-w-4xl">
        <a
          href={`/owner/locations/${facility.location.id}`}
          className="text-sm text-gray-600"
        >
          ← Back to {facility.location.name}
        </a>

        <div className="mt-6 rounded-xl bg-white p-6 shadow-sm sm:p-8">
          <div className="flex flex-col gap-4 sm:flex-row sm:items-start sm:justify-between">
            <div>
              <p className="text-sm font-medium text-gray-500">
                {facility.sports.map((s) => s.name).join(", ")}
              </p>

              <h1 className="mt-1 text-2xl font-bold sm:text-3xl">{facility.name}</h1>

              <p className="mt-2 text-gray-600">{facility.location.name}</p>
            </div>

            <span className="rounded-full bg-gray-100 px-3 py-1 text-xs font-medium">
              {facility.isActive ? "Active" : "Inactive"}
            </span>
          </div>

          {facility.description && (
            <p className="mt-4 text-gray-600 sm:mt-6">{facility.description}</p>
          )}

          <FacilitySportsEditor
            facilityId={facility.id}
            initialSports={facility.sports}
            allSports={allSports}
          />

          <FacilityPriceEditor
            facilityId={facility.id}
            initialPrice={facility.price.toString()}
          />

          <div className="mt-8 rounded-lg border border-dashed border-gray-300 p-6">
            <h2 className="text-lg font-semibold">Availability</h2>

            <p className="mt-2 text-sm text-gray-600">
              We'll configure the facility's weekly opening hours and bookable
              time slots in the next step.
            </p>
          </div>
        </div>
      </div>
    </main>
  );
}
