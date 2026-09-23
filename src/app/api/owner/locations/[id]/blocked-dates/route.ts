import { NextResponse } from "next/server";

import { audit } from "@/lib/audit";
import { getCurrentUser } from "@/lib/auth";
import { handleClosureBookings } from "@/lib/closures";
import { logError } from "@/lib/monitoring";
import { prisma } from "@/lib/prisma";
import { createLocalDateTime } from "@/lib/utils";
import { blockDateSchema, parseJson } from "@/lib/validation";

type RouteContext = {
  params: Promise<{
    id: string;
  }>;
};

/** Today's date in Colombo as YYYY-MM-DD. */
function colomboToday(): string {
  return new Intl.DateTimeFormat("en-CA", { timeZone: "Asia/Colombo" }).format(new Date());
}

async function findOwnedLocation(id: string, ownerId: string) {
  return prisma.location.findFirst({ where: { id, ownerId } });
}

export async function GET(request: Request, context: RouteContext) {
  const user = await getCurrentUser();

  if (!user || user.role !== "OWNER") {
    return NextResponse.json({ error: "Unauthorized" }, { status: 403 });
  }

  const { id } = await context.params;

  if (!(await findOwnedLocation(id, user.id))) {
    return NextResponse.json({ error: "Location not found" }, { status: 404 });
  }

  const blockedDates = await prisma.blockedDate.findMany({
    where: {
      locationId: id,
      date: { gte: createLocalDateTime(colomboToday(), "00:00") },
    },
    orderBy: { date: "asc" },
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

    if (!(await findOwnedLocation(id, user.id))) {
      return NextResponse.json({ error: "Location not found" }, { status: 404 });
    }

    const parsed = await parseJson(request, blockDateSchema);

    if (parsed.response) {
      return parsed.response;
    }

    const { date, reason, cancelExistingBookings } = parsed.data;

    if (date < colomboToday()) {
      return NextResponse.json(
        { error: "Cannot block dates in the past" },
        { status: 400 },
      );
    }

    // Stored as Colombo midnight, matching how search and booking look it up.
    const dayStart = createLocalDateTime(date, "00:00");
    const dayEnd = new Date(dayStart.getTime() + 24 * 60 * 60 * 1000);

    const closure = await handleClosureBookings({
      scope: { locationId: id },
      from: dayStart,
      to: dayEnd,
      ownerId: user.id,
      reason: reason ? `Venue closed: ${reason}` : "Venue closed on this date",
      confirmed: cancelExistingBookings === true,
    });

    if (closure.response) {
      return closure.response;
    }

    const blocked = await prisma.blockedDate.upsert({
      where: { locationId_date: { locationId: id, date: dayStart } },
      update: { reason: reason || null },
      create: { locationId: id, date: dayStart, reason: reason || null },
    });

    await audit({
      actorId: user.id,
      action: "location.block_date",
      entityType: "Location",
      entityId: id,
      metadata: {
        date,
        reason: reason ?? null,
        cancelledBookings: closure.cancelled,
        refunded: closure.refunded,
      },
      request,
    });

    return NextResponse.json({
      blockedDate: blocked,
      cancelledBookings: closure.cancelled,
      refunded: closure.refunded.toFixed(2),
    });
  } catch (error) {
    logError("Block date error:", error);

    return NextResponse.json({ error: "Failed to block date" }, { status: 500 });
  }
}

export async function DELETE(request: Request, context: RouteContext) {
  const user = await getCurrentUser();

  if (!user || user.role !== "OWNER") {
    return NextResponse.json({ error: "Unauthorized" }, { status: 403 });
  }

  try {
    const { id } = await context.params;

    if (!(await findOwnedLocation(id, user.id))) {
      return NextResponse.json({ error: "Location not found" }, { status: 404 });
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
      where: { id: blockedDateId, locationId: id },
    });

    return NextResponse.json({ success: true });
  } catch (error) {
    logError("Unblock date error:", error);

    return NextResponse.json({ error: "Failed to unblock date" }, { status: 500 });
  }
}
