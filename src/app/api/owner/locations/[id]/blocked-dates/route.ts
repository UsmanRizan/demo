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

  const blockedDates = await prisma.blockedDate.findMany({
    where: {
      locationId: id,
      date: {
        gte: new Date(),
      },
    },
    orderBy: {
      date: "asc",
    },
  });

  return NextResponse.json({ blockedDates });
}

export async function POST(request: Request, context: RouteContext) {
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
    const { date, reason } = body;

    if (!date || typeof date !== "string") {
      return NextResponse.json(
        { error: "date is required (YYYY-MM-DD)" },
        { status: 400 },
      );
    }

    if (!/^\d{4}-\d{2}-\d{2}$/.test(date)) {
      return NextResponse.json(
        { error: "date must be in YYYY-MM-DD format" },
        { status: 400 },
      );
    }

    const blockedDate = new Date(date + "T00:00:00");

    if (blockedDate < new Date(new Date().toDateString())) {
      return NextResponse.json(
        { error: "Cannot block dates in the past" },
        { status: 400 },
      );
    }

    // Check for existing booking on this date
    const dayStart = new Date(date + "T00:00:00");
    const dayEnd = new Date(date + "T23:59:59");

    const existingBooking = await prisma.booking.findFirst({
      where: {
        facility: {
          locationId: id,
        },
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
    });

    if (existingBooking) {
      return NextResponse.json(
        {
          error:
            "Cannot block this date — there are existing bookings. Please ask the player to cancel first.",
        },
        { status: 400 },
      );
    }

    const blocked = await prisma.blockedDate.upsert({
      where: {
        locationId_date: {
          locationId: id,
          date: blockedDate,
        },
      },
      update: {
        reason: reason || null,
      },
      create: {
        locationId: id,
        date: blockedDate,
        reason: reason || null,
      },
    });

    return NextResponse.json({ blockedDate: blocked });
  } catch (error) {
    console.error("Block date error:", error);
    return NextResponse.json(
      { error: "Failed to block date" },
      { status: 500 },
    );
  }
}

export async function DELETE(request: Request, context: RouteContext) {
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

    const { searchParams } = new URL(request.url);
    const blockedDateId = searchParams.get("id");

    if (!blockedDateId) {
      return NextResponse.json(
        { error: "id query parameter is required" },
        { status: 400 },
      );
    }

    await prisma.blockedDate.deleteMany({
      where: {
        id: blockedDateId,
        locationId: id,
      },
    });

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error("Unblock date error:", error);
    return NextResponse.json(
      { error: "Failed to unblock date" },
      { status: 500 },
    );
  }
}
