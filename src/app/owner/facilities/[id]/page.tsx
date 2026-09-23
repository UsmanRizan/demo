import { notFound, redirect } from "next/navigation";
import Image from "next/image";

import { getCurrentUser } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { getSportIcon } from "@/lib/sport-icons";
import FacilityPriceEditor from "@/components/owner/FacilityPriceEditor";
import FacilitySportsEditor from "@/components/owner/FacilitySportsEditor";
import ActiveToggle from "@/components/owner/ActiveToggle";
import GalleryManager from "@/components/owner/GalleryManager";

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
                {facility.sports.map((s) => `${getSportIcon(s.name)} ${s.name}`).join(", ")}
              </p>

              <h1 className="mt-1 text-2xl font-bold sm:text-3xl">{facility.name}</h1>

              <p className="mt-2 text-gray-600">{facility.location.name}</p>
            </div>

            <div className="flex flex-col items-start gap-3 sm:items-end">
              <span className="rounded-full bg-gray-100 px-3 py-1 text-xs font-medium">
                {facility.isActive ? "Active" : "Inactive"}
              </span>
              <ActiveToggle
                endpoint={`/api/owner/facilities/${facility.id}`}
                isActive={facility.isActive}
                noun="court"
              />
            </div>
          </div>

          {facility.imageUrl && (
            <Image
              src={facility.imageUrl}
              alt={facility.name}
              width={896}
              height={256}
              className="mt-6 h-48 w-full rounded-lg border border-gray-200 object-cover sm:h-64"
            />
          )}

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

          <div className="mt-8">
            <GalleryManager kind="facility" id={facility.id} />
          </div>

          <p className="mt-8 text-sm text-gray-600">
            Opening hours, blocked dates and peak pricing are set per location on the{" "}
            <a href={`/owner/locations/${facility.location.id}`} className="font-medium underline">
              {facility.location.name}
            </a>{" "}
            page.
          </p>
        </div>
      </div>
    </main>
  );
}
