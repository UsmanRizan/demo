import { NextResponse } from "next/server";

import { getFacilitiesWithSlots } from "@/lib/availability";
import { isValidDate } from "@/lib/utils";

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

export async function GET(request: Request) {
  const { searchParams } = new URL(request.url);

  const sportId = searchParams.get("sportId");
  const date = searchParams.get("date");
  const period = searchParams.get("period") as Period | null;
  const city = searchParams.get("city")?.trim();

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

  const facilities = await getFacilitiesWithSlots({
    where: {
      sports: { some: { id: sportId } },
      ...(city ? { location: { city: { equals: city, mode: "insensitive" } } } : {}),
    },
    date,
    range: [selectedPeriod.start, selectedPeriod.end],
  });

  const results = facilities.filter(
    (facility) =>
      facility.slots.some((slot) => slot.available) || facility.blockedReason !== null,
  );

  return NextResponse.json({
    date,
    period,
    periodLabel: selectedPeriod.label,
    facilities: results,
  });
}
