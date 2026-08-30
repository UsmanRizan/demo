import { NextResponse } from "next/server";
import { eq, and, inArray } from "drizzle-orm";

import { db } from "@/lib/prisma";
import {
  facilities,
  locations,
  sports,
  facilityToSport,
} from "@/db/schema";
import { getCurrentUser } from "@/lib/auth";

export async function POST(request: Request) {
  const user = await getCurrentUser();

  if (!user || user.role !== "OWNER") {
    return NextResponse.json({ error: "Unauthorized" }, { status: 403 });
  }

  try {
    const body = await request.json();

    const locationId =
      typeof body.locationId === "string" ? body.locationId : "";

    const sportIds: string[] = Array.isArray(body.sportIds)
      ? body.sportIds.filter((id: unknown) => typeof id === "string")
      : [];

    const name = typeof body.name === "string" ? body.name.trim() : "";

    const description =
      typeof body.description === "string" ? body.description.trim() : null;

    const price = Number(body.price);

    if (!locationId || sportIds.length === 0 || !name) {
      return NextResponse.json(
        {
          error: "Location, at least one sport, and facility name are required",
        },
        { status: 400 },
      );
    }

    if (!Number.isFinite(price) || price <= 0) {
      return NextResponse.json(
        { error: "Price must be greater than zero" },
        { status: 400 },
      );
    }

    // Make sure the location belongs to this owner.
    const [location] = await db
      .select()
      .from(locations)
      .where(and(eq(locations.id, locationId), eq(locations.ownerId, user.id)))
      .limit(1);

    if (!location) {
      return NextResponse.json(
        { error: "Location not found" },
        { status: 404 },
      );
    }

    // Only active sports can be selected.
    const activeSports = await db
      .select()
      .from(sports)
      .where(and(inArray(sports.id, sportIds), eq(sports.isActive, true)));

    if (activeSports.length !== sportIds.length) {
      return NextResponse.json(
        { error: "One or more sports not found or inactive" },
        { status: 404 },
      );
    }

    // Create facility and link sports in a transaction
    const [facility] = await db.transaction(async (tx) => {
      const [newFacility] = await tx
        .insert(facilities)
        .values({
          locationId,
          name,
          description,
          price: String(price),
        })
        .returning();

      // Link sports to facility
      if (sportIds.length > 0) {
        await tx
          .insert(facilityToSport)
          .values(sportIds.map((id) => ({ a: newFacility.id, b: id })));
      }

      return [newFacility];
    });

    // Fetch facility with sports and location for response
    const facilitySports = await db
      .select({ id: sports.id, name: sports.name })
      .from(facilityToSport)
      .innerJoin(sports, eq(facilityToSport.b, sports.id))
      .where(eq(facilityToSport.a, facility.id));

    return NextResponse.json(
      {
        success: true,
        facility: {
          ...facility,
          sports: facilitySports,
          location,
        },
      },
      { status: 201 },
    );
  } catch (error) {
    console.error("Create facility error:", error);

    return NextResponse.json(
      { error: "Failed to create facility" },
      { status: 500 },
    );
  }
}
