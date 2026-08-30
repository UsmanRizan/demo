import { notFound, redirect } from "next/navigation";
import { eq, and, asc } from "drizzle-orm";

import { getCurrentUser } from "@/lib/auth";
import { db } from "@/lib/prisma";
import {
  facilities,
  locations,
  sports,
  facilityToSport,
} from "@/db/schema";
import { getSportIcon } from "@/lib/sport-icons";
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

  // Find facility with location ownership check
  const [facilityWithLocation] = await db
    .select({
      facility: facilities,
      location: locations,
    })
    .from(facilities)
    .innerJoin(locations, eq(facilities.locationId, locations.id))
    .where(and(eq(facilities.id, id), eq(locations.ownerId, user.id)))
    .limit(1);

  if (!facilityWithLocation) {
    notFound();
  }

  // Get facility sports
  const facilitySportsList = await db
    .select({ id: sports.id, name: sports.name, slug: sports.slug, isActive: sports.isActive })
    .from(facilityToSport)
    .innerJoin(sports, eq(facilityToSport.b, sports.id))
    .where(eq(facilityToSport.a, id));

  // Get all active sports
  const allSportsList = await db
    .select()
    .from(sports)
    .where(eq(sports.isActive, true))
    .orderBy(sports.name);

  const facility = {
    ...facilityWithLocation.facility,
    location: facilityWithLocation.location,
    sports: facilitySportsList,
  };

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
                {facility.sports
                  .map((s) => `${getSportIcon(s.name)} ${s.name}`)
                  .join(", ")}
              </p>

              <h1 className="mt-1 text-2xl font-bold sm:text-3xl">
                {facility.name}
              </h1>

              <p className="mt-2 text-gray-600">{facility.location.name}</p>
            </div>

            <span className="rounded-full bg-gray-100 px-3 py-1 text-xs font-medium">
              {facility.isActive ? "Active" : "Inactive"}
            </span>
          </div>

          {facility.description && (
            <p className="mt-4 text-gray-600 sm:mt-6">
              {facility.description}
            </p>
          )}

          <FacilitySportsEditor
            facilityId={facility.id}
            initialSports={facility.sports}
            allSports={allSportsList}
          />

          <FacilityPriceEditor
            facilityId={facility.id}
            initialPrice={facility.price.toString()}
          />

          <div className="mt-8 rounded-lg border border-dashed border-gray-300 p-6">
            <h2 className="text-lg font-semibold">Availability</h2>

            <p className="mt-2 text-sm text-gray-600">
              We&apos;ll configure the facility&apos;s weekly opening hours and
              bookable time slots in the next step.
            </p>
          </div>
        </div>
      </div>
    </main>
  );
}
