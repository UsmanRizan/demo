import { NextResponse } from "next/server";
import { eq, and, gte, lt, gt, inArray } from "drizzle-orm";

import { getCurrentUser } from "@/lib/auth";
import { db } from "@/lib/prisma";
import { locations, blockedDates, bookings } from "@/db/schema";

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

  const [location] = await db
    .select()
    .from(locations)
    .where(and(eq(locations.id, id), eq(locations.ownerId, user.id)))
    .limit(1);

  if (!location) {
    return NextResponse.json({ error: "Location not found" }, { status: 404 });
  }

  const result = await db
    .select()
    .from(blockedDates)
    .where(
      and(eq(blockedDates.locationId, id), gte(blockedDates.date, new Date())),
    )
    .orderBy(blockedDates.date);

  return NextResponse.json({ blockedDates: result });
}

export async function POST(request: Request, context: RouteContext) {
  const user = await getCurrentUser();

  if (!user || user.role !== "OWNER") {
    return NextResponse.json({ error: "Unauthorized" }, { status: 403 });
  }

  try {
    const { id } = await context.params;

    const [location] = await db
      .select()
      .from(locations)
      .where(and(eq(locations.id, id), eq(locations.ownerId, user.id)))
      .limit(1);

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

    const [existingBooking] = await db
      .select({ id: bookings.id })
      .from(bookings)
      .innerJoin(locations, eq(bookings.facilityId, locations.id))
      .where(
        and(
          eq(locations.id, id),
          inArray(bookings.status, ["PENDING", "CONFIRMED"]),
          lt(bookings.startAt, dayEnd),
          gt(bookings.endAt, dayStart),
        ),
      )
      .limit(1);

    if (existingBooking) {
      return NextResponse.json(
        {
          error:
            "Cannot block this date — there are existing bookings. Please ask the player to cancel first.",
        },
        { status: 400 },
      );
    }

    // Upsert: check existing
    const [existing] = await db
      .select()
      .from(blockedDates)
      .where(
        and(
          eq(blockedDates.locationId, id),
          eq(blockedDates.date, blockedDate),
        ),
      )
      .limit(1);

    let blocked;
    if (existing) {
      [blocked] = await db
        .update(blockedDates)
        .set({ reason: reason || null })
        .where(eq(blockedDates.id, existing.id))
        .returning();
    } else {
      [blocked] = await db
        .insert(blockedDates)
        .values({
          locationId: id,
          date: blockedDate,
          reason: reason || null,
        })
        .returning();
    }

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

    const [location] = await db
      .select()
      .from(locations)
      .where(and(eq(locations.id, id), eq(locations.ownerId, user.id)))
      .limit(1);

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

    await db
      .delete(blockedDates)
      .where(
        and(
          eq(blockedDates.id, blockedDateId),
          eq(blockedDates.locationId, id),
        ),
      );

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error("Unblock date error:", error);
    return NextResponse.json(
      { error: "Failed to unblock date" },
      { status: 500 },
    );
  }
}
