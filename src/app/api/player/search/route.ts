import { NextResponse } from "next/server";

import { getCurrentUser } from "@/lib/auth";
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

function createLocalDateTime(date: string, time: string) {
  return new Date(`${date}T${time}:00+05:30`);
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

function isValidDate(date: string) {
  if (!/^\d{4}-\d{2}-\d{2}$/.test(date)) {
    return false;
  }

  const [year, month, day] = date.split("-").map(Number);

  const parsed = new Date(year, month - 1, day);

  return (
    parsed.getFullYear() === year &&
    parsed.getMonth() === month - 1 &&
    parsed.getDate() === day
  );
}

export async function GET(request: Request) {
  const user = await getCurrentUser();

  if (!user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  if (user.role !== "PLAYER") {
    return NextResponse.json(
      { error: "Only players can search for bookings" },
      { status: 403 },
    );
  }

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

  const dayStart = createLocalDateTime(date, "00:00");

  const dayEnd = createLocalDateTime(date, "23:59");

  const facilities = await prisma.facility.findMany({
    where: {
      sportId,
      isActive: true,
      location: {
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

      sport: {
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
          status: {
            in: ["PENDING", "CONFIRMED"],
          },
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

      const slots = uniqueSlots.map((slot) => {
        const slotStart = createLocalDateTime(date, slot.startTime);

        const slotEnd = createLocalDateTime(date, slot.endTime);

        const isBooked = facility.bookings.some(
          (booking) => booking.startAt < slotEnd && booking.endAt > slotStart,
        );

        return {
          startTime: slot.startTime,
          endTime: slot.endTime,
          available: !isBooked,
        };
      });

      return {
        id: facility.id,
        name: facility.name,
        price: Number(facility.price),
        sport: facility.sport,
        location: facility.location,
        slots,
      };
    })
    .filter((facility) => facility.slots.some((slot) => slot.available));

  return NextResponse.json({
    date,
    period,
    periodLabel: selectedPeriod.label,
    facilities: results,
  });
}
