import { NextResponse } from "next/server";
import { eq, and, lt, gt, inArray } from "drizzle-orm";

import { calculatePlayerPrice } from "@/lib/constants";
import { db } from "@/lib/prisma";
import {
  facilities,
  locations,
  availabilities,
  pricingRules,
  bookings,
  blockedDates,
  facilityToSport,
  sports,
} from "@/db/schema";
import { calculateDynamicPrice } from "@/lib/pricing";

const TIME_PERIODS = {
  morning: {
    label: "Morning",
    start: 6 * 60,
    end: 12 * 60,
  },
  evening: {
    label: "Evening",
    start: 12 * 60,
    end: 18 * 60,
  },
  night: {
    label: "Night",
    start: 18 * 60,
    end: 24 * 60,
  },
} as const;

type Period = keyof typeof TIME_PERIODS;

import { createLocalDateTime, isValidDate } from "@/lib/utils";

function timeToMinutes(time: string) {
  const [hours, minutes] = time.split(":").map(Number);

  const total = hours * 60 + minutes;

  // Treat 23:59 as end-of-day (1440) so the last hourly slot (23:00–24:00) is generated
  if (total === 23 * 60 + 59) {
    return 24 * 60;
  }

  return total;
}

function minutesToTime(minutes: number) {
  const hours = Math.floor(minutes / 60);

  const mins = minutes % 60;

  return `${String(hours).padStart(2, "0")}:${String(mins).padStart(2, "0")}`;
}

function getDayOfWeek(dateString: string) {
  const [year, month, day] = dateString.split("-").map(Number);

  return new Date(year, month - 1, day).getDay();
}

function generateHourlySlots(
  openingStart: string,
  openingEnd: string,
  periodStart: number,
  periodEnd: number,
) {
  const start = Math.max(timeToMinutes(openingStart), periodStart);

  const end = Math.min(timeToMinutes(openingEnd), periodEnd);

  const slots: {
    startTime: string;
    endTime: string;
  }[] = [];

  for (let current = start; current + 60 <= end; current += 60) {
    slots.push({
      startTime: minutesToTime(current),
      endTime: minutesToTime(current + 60),
    });
  }

  return slots;
}

export async function GET(request: Request) {
  const { searchParams } = new URL(request.url);

  const sportId = searchParams.get("sportId");
  const date = searchParams.get("date");
  const period = searchParams.get("period") as Period | null;

  if (!sportId || !date || !period) {
    return NextResponse.json(
      {
        error: "sportId, date and period are required",
      },
      { status: 400 },
    );
  }

  if (!isValidDate(date)) {
    return NextResponse.json({ error: "Invalid date" }, { status: 400 });
  }

  if (!(period in TIME_PERIODS)) {
    return NextResponse.json({ error: "Invalid time period" }, { status: 400 });
  }

  const selectedPeriod = TIME_PERIODS[period];

  const dayOfWeek = getDayOfWeek(date);

  // Check if this date is blocked for any location
  const dayDate = createLocalDateTime(date, "00:00");
  const blockedDatesForDay = await db
    .select({
      locationId: blockedDates.locationId,
      reason: blockedDates.reason,
    })
    .from(blockedDates)
    .where(eq(blockedDates.date, dayDate));

  const blockedLocationMap = new Map(
    blockedDatesForDay.map((r) => [r.locationId, r.reason]),
  );

  const dayStart = createLocalDateTime(date, "00:00");
  const dayEnd = createLocalDateTime(date, "23:59");

  // Find facilities with active sports and locations
  const facilitiesWithRelations = await db
    .select({
      facilityId: facilities.id,
      facilityName: facilities.name,
      facilityPrice: facilities.price,
      facilityIsActive: facilities.isActive,
      locationId: locations.id,
      locationName: locations.name,
      locationAddress: locations.address,
      locationCity: locations.city,
      locationLatitude: locations.latitude,
      locationLongitude: locations.longitude,
      locationIsActive: locations.isActive,
    })
    .from(facilities)
    .innerJoin(locations, eq(facilities.locationId, locations.id))
    .innerJoin(facilityToSport, eq(facilities.id, facilityToSport.a))
    .innerJoin(sports, eq(facilityToSport.b, sports.id))
    .where(
      and(
        eq(sports.id, sportId),
        eq(facilities.isActive, true),
        eq(locations.isActive, true),
      ),
    );

  // Deduplicate facilities
  const facilityMap = new Map<
    string,
    (typeof facilitiesWithRelations)[number]
  >();
  for (const f of facilitiesWithRelations) {
    if (!facilityMap.has(f.facilityId)) {
      facilityMap.set(f.facilityId, f);
    }
  }
  const uniqueFacilities = Array.from(facilityMap.values());

  // For each facility, load availabilities, pricing rules, and bookings
  const results = await Promise.all(
    uniqueFacilities.map(async (f) => {
      const locationAvailabilities = await db
        .select()
        .from(availabilities)
        .where(
          and(
            eq(availabilities.locationId, f.locationId),
            eq(availabilities.isActive, true),
          ),
        );

      const locationPricingRules = await db
        .select()
        .from(pricingRules)
        .where(
          and(
            eq(pricingRules.locationId, f.locationId),
            eq(pricingRules.isActive, true),
          ),
        );

      const facilityBookings = await db
        .select({
          startAt: bookings.startAt,
          endAt: bookings.endAt,
        })
        .from(bookings)
        .where(
          and(
            eq(bookings.facilityId, f.facilityId),
            eq(bookings.status, "CONFIRMED"),
            lt(bookings.startAt, dayEnd),
            gt(bookings.endAt, dayStart),
          ),
        );

      const openingHours = locationAvailabilities.filter(
        (a) => a.dayOfWeek === dayOfWeek,
      );

      const allSlots = openingHours.flatMap((opening) =>
        generateHourlySlots(
          opening.startTime,
          opening.endTime,
          selectedPeriod.start,
          selectedPeriod.end,
        ),
      );

      const uniqueSlots = Array.from(
        new Map(
          allSlots.map((slot) => [`${slot.startTime}-${slot.endTime}`, slot]),
        ).values(),
      ).sort((a, b) => a.startTime.localeCompare(b.startTime));

      // Check if this date is today
      const now = new Date();
      const todayStr = `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, "0")}-${String(now.getDate()).padStart(2, "0")}`;
      const isToday = date === todayStr;
      const currentTimeMinutes = now.getHours() * 60 + now.getMinutes();

      const slots = uniqueSlots.map((slot) => {
        const slotStart = createLocalDateTime(date, slot.startTime);
        const slotEnd = createLocalDateTime(date, slot.endTime);

        const isBooked = facilityBookings.some(
          (booking) => booking.startAt < slotEnd && booking.endAt > slotStart,
        );

        // Disable slots that have already passed (for today's date)
        const slotStartMinutes = timeToMinutes(slot.startTime);
        const isPast = isToday && slotStartMinutes <= currentTimeMinutes;

        const isBlocked = blockedLocationMap.has(f.locationId);

        // Apply dynamic pricing for this slot
        const { adjustedPrice, surgePercentage } = calculateDynamicPrice(
          Number(f.facilityPrice),
          slot.startTime,
          dayOfWeek,
          locationPricingRules.map((r) => ({
            startTime: r.startTime,
            endTime: r.endTime,
            percentage: Number(r.percentage),
            dayOfWeek: r.dayOfWeek,
            isActive: r.isActive,
          })),
        );

        return {
          startTime: slot.startTime,
          endTime: slot.endTime,
          available: !isBooked && !isPast && !isBlocked,
          pricePerHour: calculatePlayerPrice(adjustedPrice),
          surgePercentage,
        };
      });

      const blockedReason =
        blockedLocationMap.get(f.locationId) ?? null;

      // Calculate average surge across available slots for display
      const availableSlots = slots.filter((s) => s.available);
      const avgSurge =
        availableSlots.length > 0
          ? availableSlots.reduce((sum, s) => sum + s.surgePercentage, 0) /
            availableSlots.length
          : 0;

      return {
        id: f.facilityId,
        name: f.facilityName,
        price: calculatePlayerPrice(Number(f.facilityPrice)),
        sports: [] as { id: string; name: string }[], // Will be populated below
        location: {
          id: f.locationId,
          name: f.locationName,
          address: f.locationAddress,
          city: f.locationCity,
          latitude: f.locationLatitude,
          longitude: f.locationLongitude,
          availabilities: openingHours.map((a) => ({
            dayOfWeek: a.dayOfWeek,
            startTime: a.startTime,
            endTime: a.endTime,
          })),
          pricingRules: locationPricingRules.map((r) => ({
            startTime: r.startTime,
            endTime: r.endTime,
            percentage: Number(r.percentage),
            dayOfWeek: r.dayOfWeek,
            isActive: r.isActive,
          })),
        },
        blockedReason,
        slots,
        avgSurge: Math.round(avgSurge),
      };
    }),
  );

  // Load sports for each facility
  for (const facility of results) {
    const facilitySportsList = await db
      .select({ id: sports.id, name: sports.name })
      .from(facilityToSport)
      .innerJoin(sports, eq(facilityToSport.b, sports.id))
      .where(eq(facilityToSport.a, facility.id));

    facility.sports = facilitySportsList;
  }

  const filteredResults = results.filter(
    (facility) =>
      facility.slots.some((slot) => slot.available) ||
      facility.blockedReason !== null,
  );

  return NextResponse.json({
    date,
    period,
    periodLabel: selectedPeriod.label,
    facilities: filteredResults,
  });
}
