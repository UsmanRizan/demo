import type { Prisma } from "@prisma/client";
import { NextResponse } from "next/server";

import { getCurrentUser } from "@/lib/auth";
import { mergeHourlySelection } from "@/lib/opening-hours";
import { prisma } from "@/lib/prisma";
import { availabilitySchema, parseJson } from "@/lib/validation";
import { logError } from "@/lib/monitoring";

type RouteContext = {
  params: Promise<{
    id: string;
  }>;
};

/** Stored hour ranges; older rows fall back to their envelope. */
function normalizeHours(hours: unknown) {
  return Array.isArray(hours) ? hours : [];
}

export async function GET(request: Request, context: RouteContext) {
  const user = await getCurrentUser();

  if (!user || user.role !== "OWNER") {
    return NextResponse.json({ error: "Unauthorized" }, { status: 403 });
  }

  const { id } = await context.params;

  const location = await prisma.location.findFirst({
    where: {
      id,
      ownerId: user.id,
    },
  });

  if (!location) {
    return NextResponse.json({ error: "Location not found" }, { status: 404 });
  }

  const availability = await prisma.availability.findMany({
    where: {
      locationId: id,
    },
    orderBy: {
      dayOfWeek: "asc",
    },
  });

  return NextResponse.json({
    availability: availability.map((row) => ({
      ...row,
      hours: normalizeHours(row.hours),
    })),
  });
}

export async function PUT(request: Request, context: RouteContext) {
  const user = await getCurrentUser();

  if (!user || user.role !== "OWNER") {
    return NextResponse.json({ error: "Unauthorized" }, { status: 403 });
  }

  try {
    const { id } = await context.params;

    const location = await prisma.location.findFirst({
      where: {
        id,
        ownerId: user.id,
      },
    });

    if (!location) {
      return NextResponse.json(
        { error: "Location not found" },
        { status: 404 },
      );
    }

    const parsed = await parseJson(request, availabilitySchema);

    if (parsed.response) {
      return parsed.response;
    }

    const entries = parsed.data.availability;

    const availability = await prisma.$transaction(async (tx) => {
      await tx.availability.deleteMany({
        where: {
          locationId: id,
        },
      });

      if (entries.length > 0) {
        await tx.availability.createMany({
          data: entries.map((entry) => {
            const ranges = mergeHourlySelection(entry.hours);
            const isTwentyFourHour = entry.hours.length === 24;

            // Keep the envelope in sync so the many places that only need
            // "roughly when are you open" (and dynamic pricing rules) keep
            // working without knowing about the hour ranges.
            const startTime = isTwentyFourHour ? "00:00" : ranges[0].start;
            const endTime = isTwentyFourHour
              ? "24:00"
              : ranges[ranges.length - 1].end;

            return {
              locationId: id,
              dayOfWeek: entry.dayOfWeek,
              startTime,
              endTime,
              isActive: entry.isActive ?? true,
              isTwentyFourHour,
              hours: ranges as Prisma.InputJsonValue,
            };
          }),
        });
      }

      return tx.availability.findMany({
        where: {
          locationId: id,
        },
        orderBy: {
          dayOfWeek: "asc",
        },
      });
    });

    return NextResponse.json({
      success: true,
      availability: availability.map((row) => ({
        ...row,
        hours: normalizeHours(row.hours),
      })),
    });
  } catch (error) {
    logError("Location availability error:", error);

    return NextResponse.json(
      {
        error: "Failed to update availability",
      },
      { status: 500 },
    );
  }
}
