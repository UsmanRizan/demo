import { prisma } from "@/lib/prisma";

export type RatingSummary = { average: number; count: number };

/** Average rating and review count per location (hidden reviews excluded). */
export async function getRatingSummaries(
  locationIds: string[],
): Promise<Map<string, RatingSummary>> {
  if (locationIds.length === 0) {
    return new Map();
  }

  const rows = await prisma.review.groupBy({
    by: ["locationId"],
    where: { locationId: { in: locationIds }, isHidden: false },
    _avg: { rating: true },
    _count: { _all: true },
  });

  return new Map(
    rows.map((row) => [
      row.locationId,
      {
        average: Math.round((row._avg.rating ?? 0) * 10) / 10,
        count: row._count._all,
      },
    ]),
  );
}

export async function getLocationReviews(locationId: string, take = 20) {
  return prisma.review.findMany({
    where: { locationId, isHidden: false },
    orderBy: { createdAt: "desc" },
    take,
    select: {
      id: true,
      rating: true,
      comment: true,
      ownerReply: true,
      createdAt: true,
      facility: { select: { name: true } },
      player: { select: { firstName: true, lastName: true } },
    },
  });
}

/** "Kamal P." style display name that doesn't expose full surnames. */
export function reviewerName(player: {
  firstName: string | null;
  lastName: string | null;
}): string {
  if (!player.firstName) {
    return "Player";
  }

  return player.lastName
    ? `${player.firstName} ${player.lastName[0]}.`
    : player.firstName;
}
