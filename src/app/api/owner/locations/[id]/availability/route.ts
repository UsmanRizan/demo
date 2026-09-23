import { NextResponse } from "next/server";

import { getCurrentUser } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { availabilitySchema, parseJson } from "@/lib/validation";
import { logError } from "@/lib/monitoring";

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
          data: entries.map(
            (entry) => ({
              locationId: id,
              dayOfWeek: entry.dayOfWeek,
              startTime: entry.isTwentyFourHour ? "00:00" : (entry.startTime ?? "00:00"),
              endTime: entry.isTwentyFourHour ? "24:00" : (entry.endTime ?? "24:00"),
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
    logError("Location availability error:", error);

    return NextResponse.json(
      {
        error: "Failed to update availability",
      },
      { status: 500 },
    );
  }
}
