import { NextResponse } from "next/server";

import { audit } from "@/lib/audit";
import { getCurrentUser } from "@/lib/auth";
import { handleClosureBookings } from "@/lib/closures";
import { logError } from "@/lib/monitoring";
import { prisma } from "@/lib/prisma";
import { locationUpdateSchema, parseJson } from "@/lib/validation";

type RouteContext = {
  params: Promise<{
    id: string;
  }>;
};

/**
 * Update a location's details or open/close it. Deactivating a location with
 * upcoming bookings requires cancelExistingBookings: true (see closures.ts).
 */
export async function PATCH(request: Request, context: RouteContext) {
  const user = await getCurrentUser();

  if (!user || user.role !== "OWNER") {
    return NextResponse.json({ error: "Unauthorized" }, { status: 403 });
  }

  try {
    const { id } = await context.params;

    const location = await prisma.location.findFirst({
      where: { id, ownerId: user.id },
    });

    if (!location) {
      return NextResponse.json({ error: "Location not found" }, { status: 404 });
    }

    const parsed = await parseJson(request, locationUpdateSchema);

    if (parsed.response) {
      return parsed.response;
    }

    const { cancelExistingBookings, reason, ...fields } = parsed.data;
    let cancelled = 0;
    let refunded = 0;

    if (fields.isActive === false && location.isActive) {
      const closure = await handleClosureBookings({
        scope: { locationId: id },
        from: new Date(),
        ownerId: user.id,
        reason: reason ? `Venue closed: ${reason}` : "Venue is no longer taking bookings",
        confirmed: cancelExistingBookings === true,
      });

      if (closure.response) {
        return closure.response;
      }

      cancelled = closure.cancelled;
      refunded = closure.refunded;
    }

    const updated = await prisma.location.update({
      where: { id },
      data: fields,
    });

    if (fields.isActive !== undefined && fields.isActive !== location.isActive) {
      await audit({
        actorId: user.id,
        action: fields.isActive ? "location.activate" : "location.deactivate",
        entityType: "Location",
        entityId: id,
        metadata: { cancelledBookings: cancelled, refunded },
        request,
      });
    }

    return NextResponse.json({
      success: true,
      location: updated,
      cancelledBookings: cancelled,
      refunded: refunded.toFixed(2),
    });
  } catch (error) {
    logError("Update location error:", error);

    return NextResponse.json({ error: "Failed to update location" }, { status: 500 });
  }
}
