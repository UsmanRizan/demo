import type { Prisma } from "@prisma/client";

import { colomboDateTime, dayOfWeekForDate, timeToMinutes } from "@/lib/bookings";
import { calculatePlayerPrice } from "@/lib/constants";
import { calculateDynamicPrice } from "@/lib/pricing";
import { prisma } from "@/lib/prisma";
import { createLocalDateTime } from "@/lib/utils";

/**
 * Bookable hourly slots for facilities on a date. Shared by court search and
 * the public venue page so both apply the same rules as booking creation:
 * Colombo time, opening hours, blocked dates, pricing rules, and both paid
 * bookings and unexpired payment holds count as taken.
 */

export type PublicSlot = {
  startTime: string;
  endTime: string;
  available: boolean;
  pricePerHour: number;
  surgePercentage: number;
};

export type PricingRuleInput = {
  startTime: string;
  endTime: string;
  percentage: number;
  dayOfWeek: number | null;
  isActive: boolean;
};

function minutesToTime(minutes: number): string {
  return `${String(Math.floor(minutes / 60)).padStart(2, "0")}:${String(minutes % 60).padStart(2, "0")}`;
}

/** Opening window in minutes; "23:59"/"24:00" and 24-hour venues close at midnight. */
export function openingWindow(opening: {
  startTime: string;
  endTime: string;
  isTwentyFourHour: boolean;
}): [number, number] {
  if (opening.isTwentyFourHour) {
    return [0, 24 * 60];
  }

  const end = opening.endTime === "23:59" ? 24 * 60 : timeToMinutes(opening.endTime);

  return [timeToMinutes(opening.startTime), end];
}

/** Pure slot builder (unit-tested). */
export function buildSlots({
  date,
  opening,
  basePrice,
  rules,
  taken,
  blocked,
  now = new Date(),
  range = [0, 24 * 60],
}: {
  date: string;
  opening: { startTime: string; endTime: string; isTwentyFourHour: boolean } | null;
  basePrice: number;
  rules: PricingRuleInput[];
  taken: { startAt: Date; endAt: Date }[];
  blocked: boolean;
  now?: Date;
  range?: [number, number];
}): PublicSlot[] {
  if (!opening) {
    return [];
  }

  const [open, close] = openingWindow(opening);
  const start = Math.max(open, range[0]);
  const end = Math.min(close, range[1]);
  const dayOfWeek = dayOfWeekForDate(date);
  const slots: PublicSlot[] = [];

  for (let minute = start; minute + 60 <= end; minute += 60) {
    const startTime = minutesToTime(minute);
    const endTime = minutesToTime(minute + 60);
    const slotStart = colomboDateTime(date, startTime);
    const slotEnd = colomboDateTime(date, endTime);

    const isTaken = taken.some((b) => b.startAt < slotEnd && b.endAt > slotStart);
    const isPast = slotStart.getTime() <= now.getTime();

    const { adjustedPrice, surgePercentage } = calculateDynamicPrice(
      basePrice,
      startTime,
      dayOfWeek,
      rules,
    );

    slots.push({
      startTime,
      endTime,
      available: !isTaken && !isPast && !blocked,
      pricePerHour: calculatePlayerPrice(adjustedPrice),
      surgePercentage,
    });
  }

  return slots;
}

export type FacilityWithSlots = {
  id: string;
  name: string;
  description: string | null;
  price: number;
  imageUrl: string | null;
  sports: { id: string; name: string }[];
  location: {
    id: string;
    name: string;
    address: string;
    city: string;
    latitude: number | null;
    longitude: number | null;
  };
  blockedReason: string | null;
  slots: PublicSlot[];
  avgSurge: number;
};

/** Load facilities matching `where` and compute their slots for `date`. */
export async function getFacilitiesWithSlots({
  where,
  date,
  range,
}: {
  where: Prisma.FacilityWhereInput;
  date: string;
  range?: [number, number];
}): Promise<FacilityWithSlots[]> {
  const dayOfWeek = dayOfWeekForDate(date);
  const dayStart = createLocalDateTime(date, "00:00");
  const dayEnd = new Date(dayStart.getTime() + 24 * 60 * 60 * 1000);
  const now = new Date();

  const facilities = await prisma.facility.findMany({
    where: {
      ...where,
      isActive: true,
      location: {
        ...(where.location as Prisma.LocationWhereInput | undefined),
        isActive: true,
        owner: { deletedAt: null },
      },
    },
    orderBy: { name: "asc" },
    select: {
      id: true,
      name: true,
      description: true,
      price: true,
      imageUrl: true,
      sports: { where: { isActive: true }, select: { id: true, name: true } },
      location: {
        select: {
          id: true,
          name: true,
          address: true,
          city: true,
          latitude: true,
          longitude: true,
          availabilities: {
            where: { dayOfWeek, isActive: true },
            select: { startTime: true, endTime: true, isTwentyFourHour: true },
          },
          pricingRules: {
            where: { isActive: true },
            select: {
              startTime: true,
              endTime: true,
              percentage: true,
              dayOfWeek: true,
              isActive: true,
            },
          },
          blockedDates: {
            where: { date: dayStart },
            select: { reason: true },
          },
        },
      },
      bookings: {
        where: {
          startAt: { lt: dayEnd },
          endAt: { gt: dayStart },
          OR: [
            { status: "CONFIRMED" },
            { status: "PENDING", paymentStatus: "PENDING", expiresAt: { gt: now } },
          ],
        },
        select: { startAt: true, endAt: true },
      },
    },
  });

  return facilities.map((facility) => {
    const { availabilities, pricingRules, blockedDates, ...location } = facility.location;
    const blocked = blockedDates.length > 0;

    const slots = buildSlots({
      date,
      opening: availabilities[0] ?? null,
      basePrice: Number(facility.price),
      rules: pricingRules,
      taken: facility.bookings,
      blocked,
      now,
      range,
    });

    const open = slots.filter((slot) => slot.available);
    const avgSurge = open.length
      ? open.reduce((sum, slot) => sum + slot.surgePercentage, 0) / open.length
      : 0;

    return {
      id: facility.id,
      name: facility.name,
      description: facility.description,
      price: calculatePlayerPrice(Number(facility.price)),
      imageUrl: facility.imageUrl,
      sports: facility.sports,
      location,
      blockedReason: blocked ? blockedDates[0].reason ?? "Closed on this date" : null,
      slots,
      avgSurge: Math.round(avgSurge),
    };
  });
}
