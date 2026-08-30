import { NextResponse } from "next/server";
import { eq, and, inArray } from "drizzle-orm";

import { getCurrentUser } from "@/lib/auth";
import { db } from "@/lib/prisma";
import {
  facilities,
  locations,
  sports,
  facilityToSport,
} from "@/db/schema";

type RouteContext = {
  params: Promise<{
    id: string;
  }>;
};

export async function PATCH(request: Request, context: RouteContext) {
  const currentUser = await getCurrentUser();

  if (!currentUser) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  if (currentUser.role !== "OWNER") {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }

  try {
    const { id } = await context.params;

    const body = await request.json();

    const [facility] = await db
      .select()
      .from(facilities)
      .innerJoin(locations, eq(facilities.locationId, locations.id))
      .where(and(eq(facilities.id, id), eq(locations.ownerId, currentUser.id)))
      .limit(1);

    if (!facility) {
      return NextResponse.json({ error: "Facility not found" }, { status: 404 });
    }

    const updateData: Record<string, unknown> = {};

    if (body.price !== undefined) {
      const price = Number(body.price);

      if (!Number.isFinite(price) || price <= 0) {
        return NextResponse.json(
          { error: "Price must be greater than zero" },
          { status: 400 },
        );
      }

      updateData.price = String(price);
    }

    if (body.sportIds !== undefined) {
      if (!Array.isArray(body.sportIds)) {
        return NextResponse.json(
          { error: "sportIds must be an array" },
          { status: 400 },
        );
      }

      const sportIds: string[] = body.sportIds.filter(
        (id: unknown) => typeof id === "string",
      );

      if (sportIds.length === 0) {
        return NextResponse.json(
          { error: "At least one sport is required" },
          { status: 400 },
        );
      }

      // Verify all sports exist and are active
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

      // Update sport associations in a transaction
      await db.transaction(async (tx) => {
        // Remove old associations
        await tx
          .delete(facilityToSport)
          .where(eq(facilityToSport.a, facility.Facility.id));

        // Add new associations
        if (sportIds.length > 0) {
          await tx
            .insert(facilityToSport)
            .values(sportIds.map((sportId) => ({ a: facility.Facility.id, b: sportId })));
        }
      });
    }

    // Update facility data (price, etc.)
    if (Object.keys(updateData).length > 0) {
      await db
        .update(facilities)
        .set(updateData)
        .where(eq(facilities.id, facility.Facility.id));
    }

    // Fetch updated facility with sports
    const facilitySports = await db
      .select({ id: sports.id, name: sports.name })
      .from(facilityToSport)
      .innerJoin(sports, eq(facilityToSport.b, sports.id))
      .where(eq(facilityToSport.a, facility.Facility.id));

    const [location] = await db
      .select()
      .from(locations)
      .where(eq(locations.id, facility.Facility.locationId))
      .limit(1);

    return NextResponse.json({
      success: true,
      facility: {
        id: facility.Facility.id,
        name: facility.Facility.name,
        price: facility.Facility.price.toString(),
        sports: facilitySports,
      },
    });
  } catch (error) {
    console.error("Update facility error:", error);

    return NextResponse.json(
      { error: "Failed to update facility" },
      { status: 500 },
    );
  }
}
