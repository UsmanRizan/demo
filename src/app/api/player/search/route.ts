import { NextResponse } from "next/server";

import { calculatePlayerPrice } from "@/lib/constants";
import { prisma } from "@/lib/prisma";

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

  return hours * 60 + minutes;
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
  const blockedDatesForDay = await prisma.blockedDate.findMany({
    where: {
      date: createLocalDateTime(date, "00:00"),
    },
    select: {
      locationId: true,
      reason: true,
    },
  });

  const blockedLocationMap = new Map(
    blockedDatesForDay.map((r) => [r.locationId, r.reason]),
  );

  const dayStart = createLocalDateTime(date, "00:00");

  const dayEnd = createLocalDateTime(date, "23:59");

  const facilities = await prisma.facility.findMany({
    where: {
      sports: {
        some: {
          id: sportId,
        },
      },
      isActive: true,        location: {
          isActive: true,
          availabilities: {
            some: {
              dayOfWeek,
              isActive: true,
            },
          },
        },
    },

    select: {
      id: true,
      name: true,
      price: true,

      sports: {
        select: {
          id: true,
          name: true,
        },
      },

      location: {
        select: {
          id: true,
          name: true,
          address: true,
          city: true,
          latitude: true,
          longitude: true,

          availabilities: {
            where: {
              dayOfWeek,
              isActive: true,
            },
            select: {
              dayOfWeek: true,
              startTime: true,
              endTime: true,
            },
          },
        },
      },

      bookings: {
        where: {
          status: "CONFIRMED",
          startAt: {
            lt: dayEnd,
          },
          endAt: {
            gt: dayStart,
          },
        },
        select: {
          startAt: true,
          endAt: true,
        },
      },
    },
  });

  const results = facilities
    .map((facility) => {
      const openingHours = facility.location.availabilities;

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

        const isBooked = facility.bookings.some(
          (booking) => booking.startAt < slotEnd && booking.endAt > slotStart,
        );

        // Disable slots that have already passed (for today's date)
        const slotStartMinutes = timeToMinutes(slot.startTime);
        const isPast = isToday && slotStartMinutes <= currentTimeMinutes;

        const isBlocked = blockedLocationMap.has(facility.location.id);

        return {
          startTime: slot.startTime,
          endTime: slot.endTime,
          available: !isBooked && !isPast && !isBlocked,
        };
      });

      const blockedReason =
        blockedLocationMap.get(facility.location.id) ?? null;

      return {
        id: facility.id,
        name: facility.name,
        price: calculatePlayerPrice(Number(facility.price)),
        sports: facility.sports,
        location: facility.location,
        blockedReason,
        slots,
      };
    })
    .filter((facility) => facility.slots.some((slot) => slot.available) || facility.blockedReason !== null);

  return NextResponse.json({
    date,
    period,
    periodLabel: selectedPeriod.label,
    facilities: results,
  });
}
