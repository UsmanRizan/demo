import { NextResponse } from "next/server";

import { getCurrentUser } from "@/lib/auth";
import { prisma } from "@/lib/prisma";

type RouteContext = {
  params: Promise<{
    id: string;
  }>;
};

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
    availability,
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

    const body = await request.json();

    if (!Array.isArray(body.availability)) {
      return NextResponse.json(
        {
          error: "availability must be an array",
        },
        { status: 400 },
      );
    }

    const entries = body.availability;

    // Validate each day
    for (const entry of entries) {
      if (
        !Number.isInteger(entry.dayOfWeek) ||
        entry.dayOfWeek < 0 ||
        entry.dayOfWeek > 6
      ) {
        return NextResponse.json(
          {
            error: "dayOfWeek must be between 0 and 6",
          },
          { status: 400 },
        );
      }

      const is24h = entry.isTwentyFourHour === true;

      if (!is24h) {
        if (
          typeof entry.startTime !== "string" ||
          typeof entry.endTime !== "string"
        ) {
          return NextResponse.json(
            {
              error: "startTime and endTime are required",
            },
            { status: 400 },
          );
        }

        if (
          !/^\d{2}:\d{2}$/.test(entry.startTime) ||
          !/^\d{2}:\d{2}$/.test(entry.endTime)
        ) {
          return NextResponse.json(
            {
              error: "Times must use HH:MM format",
            },
            { status: 400 },
          );
        }

        if (entry.startTime >= entry.endTime) {
          return NextResponse.json(
            {
              error: "Start time must be before end time",
            },
            { status: 400 },
          );
        }
      }
    }

    const uniqueDays = new Set(
      entries.map((entry: { dayOfWeek: number }) => entry.dayOfWeek),
    );

    if (uniqueDays.size !== entries.length) {
      return NextResponse.json(
        {
          error: "A day cannot be added more than once",
        },
        { status: 400 },
      );
    }

    const availability = await prisma.$transaction(async (tx) => {
      await tx.availability.deleteMany({
        where: {
          locationId: id,
        },
      });

      if (entries.length > 0) {
        await tx.availability.createMany({
          data: entries.map(
            (entry: {
              dayOfWeek: number;
              startTime: string;
              endTime: string;
              isActive?: boolean;
              isTwentyFourHour?: boolean;
            }) => ({
              locationId: id,
              dayOfWeek: entry.dayOfWeek,
              startTime: entry.isTwentyFourHour ? "00:00" : entry.startTime,
              endTime: entry.isTwentyFourHour ? "24:00" : entry.endTime,
              isActive: entry.isActive ?? true,
              isTwentyFourHour: entry.isTwentyFourHour ?? false,
            }),
          ),
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
      availability,
    });
  } catch (error) {
    console.error("Location availability error:", error);

    return NextResponse.json(
      {
        error: "Failed to update availability",
      },
      { status: 500 },
    );
  }
}
