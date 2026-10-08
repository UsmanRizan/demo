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

const MS_PER_DAY = 24 * 60 * 60 * 1000;
/** Guard against a typo turning into a year-long block. */
const MAX_RANGE_DAYS = 92;

/** Today's date in Colombo as YYYY-MM-DD. */
function colomboToday(): string {
  return new Intl.DateTimeFormat("en-CA", { timeZone: "Asia/Colombo" }).format(new Date());
}

function findOwnedLocation(id: string, ownerId: string) {
  return prisma.location.findFirst({ where: { id, ownerId } });
}

/** Inclusive list of YYYY-MM-DD dates from `from` to `to`. */
function dateRange(from: string, to: string): string[] {
  const start = createLocalDateTime(from, "00:00");
  const end = createLocalDateTime(to, "00:00");

  const dates: string[] = [];

  for (let t = start.getTime(); t <= end.getTime(); t += MS_PER_DAY) {
    dates.push(new Intl.DateTimeFormat("en-CA", { timeZone: "Asia/Colombo" }).format(new Date(t)));
  }

  return dates;
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
    orderBy: [{ date: "asc" }, { facility: { name: "asc" } }],
    select: {
      id: true,
      facilityId: true,
      date: true,
      reason: true,
      facility: { select: { id: true, name: true, imageUrl: true } },
    },
  });

  return NextResponse.json({
    blockedDates: blockedDates.map((row) => ({
      ...row,
      date: new Intl.DateTimeFormat("en-CA", { timeZone: "Asia/Colombo" }).format(row.date),
    })),
  });
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

    const { from, to, facilityIds, reason, cancelExistingBookings } = parsed.data;
    const lastDay = to ?? from;
    const today = colomboToday();

    if (from < today) {
      return NextResponse.json(
        { error: "Cannot block dates in the past" },
        { status: 400 },
      );
    }

    const dates = dateRange(from, lastDay);

    if (dates.length > MAX_RANGE_DAYS) {
      return NextResponse.json(
        { error: `You can block at most ${MAX_RANGE_DAYS} days at a time.` },
        { status: 400 },
      );
    }

    // Only facilities belonging to this venue may be blocked.
    const facilities = await prisma.facility.findMany({
      where: { locationId: id, id: { in: facilityIds } },
      select: { id: true, name: true },
    });

    if (facilities.length !== facilityIds.length) {
      return NextResponse.json(
        { error: "One or more facilities do not belong to this venue." },
        { status: 400 },
      );
    }

    const facilityNameList = facilities.map((f) => f.name).join(", ");
    const scopeReason =
      facilities.length === 1 && dates.length === 1
        ? reason || "Unavailable on this date"
        : `Unavailable on this date (${facilityNameList})`;

    const rangeStart = createLocalDateTime(dates[0], "00:00");
    const rangeEnd = new Date(
      createLocalDateTime(dates[dates.length - 1], "00:00").getTime() + MS_PER_DAY,
    );

    const closure = await handleClosureBookings({
      scope: { facilityIds: facilities.map((f) => f.id) },
      from: rangeStart,
      to: rangeEnd,
      ownerId: user.id,
      reason: scopeReason,
      confirmed: cancelExistingBookings === true,
    });

    if (closure.response) {
      return closure.response;
    }

    const rows = dates.flatMap((date) =>
      facilities.map((facility) => ({
        locationId: id,
        facilityId: facility.id,
        date: createLocalDateTime(date, "00:00"),
        reason: reason || null,
      })),
    );

    await prisma.blockedDate.createMany({ data: rows, skipDuplicates: true });

    await audit({
      actorId: user.id,
      action: "location.block_dates",
      entityType: "Location",
      entityId: id,
      metadata: {
        from,
        to: lastDay,
        dateCount: dates.length,
        facilityIds: facilities.map((f) => f.id),
        reason: reason ?? null,
        cancelledBookings: closure.cancelled,
        refunded: closure.refunded,
      },
      request,
    });

    return NextResponse.json({
      success: true,
      blocked: rows.length,
      dates: dates.length,
      facilities: facilities.map((f) => ({ id: f.id, name: f.name })),
      cancelledBookings: closure.cancelled,
      refunded: closure.refunded.toFixed(2),
    });
  } catch (error) {
    logError("Block dates error:", error);

    return NextResponse.json({ error: "Failed to block dates" }, { status: 500 });
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