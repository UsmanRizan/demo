import { NextResponse } from "next/server";

import { getCurrentUser } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { audit } from "@/lib/audit";
import { handleClosureBookings } from "@/lib/closures";
import { facilityUpdateSchema, parseJson } from "@/lib/validation";
import { logError } from "@/lib/monitoring";

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

    const parsed = await parseJson(request, facilityUpdateSchema);

    if (parsed.response) {
      return parsed.response;
    }

    const body = parsed.data;

    const facility = await prisma.facility.findFirst({
      where: {
        id,
        location: {
          ownerId: currentUser.id,
        },
      },
      include: { sports: true },
    });

    if (!facility) {
      return NextResponse.json({ error: "Facility not found" }, { status: 404 });
    }

    const data: {
      price?: number;
      isActive?: boolean;
      sports?: { set: { id: string }[] };
    } = {};

    if (body.price !== undefined) {
      data.price = body.price;
    }

    if (body.sportIds !== undefined) {
      const sportIds = [...new Set(body.sportIds)];

      // Verify all sports exist and are active
      const sports = await prisma.sport.findMany({
        where: { id: { in: sportIds }, isActive: true },
      });

      if (sports.length !== sportIds.length) {
        return NextResponse.json(
          { error: "One or more sports not found or inactive" },
          { status: 404 },
        );
      }

      data.sports = { set: sportIds.map((sportId) => ({ id: sportId })) };
    }

    let cancelledBookings = 0;

    if (body.isActive !== undefined) {
      if (body.isActive === false && facility.isActive) {
        const closure = await handleClosureBookings({
          scope: { facilityId: facility.id },
          from: new Date(),
          ownerId: currentUser.id,
          reason: body.reason
            ? `Court closed: ${body.reason}`
            : "Court is no longer available",
          confirmed: body.cancelExistingBookings === true,
        });

        if (closure.response) {
          return closure.response;
        }

        cancelledBookings = closure.cancelled;
      }

      data.isActive = body.isActive;

      await audit({
        actorId: currentUser.id,
        action: body.isActive ? "facility.activate" : "facility.deactivate",
        entityType: "Facility",
        entityId: facility.id,
        metadata: { cancelledBookings },
        request,
      });
    }

    const updated = await prisma.facility.update({
      where: { id: facility.id },
      data,
      include: {
        sports: true,
        location: true,
      },
    });

    return NextResponse.json({
      success: true,
      facility: {
        id: updated.id,
        name: updated.name,
        price: updated.price.toString(),
        isActive: updated.isActive,
        sports: updated.sports,
      },
      cancelledBookings,
    });
  } catch (error) {
    logError("Update facility error:", error);

    return NextResponse.json(
      { error: "Failed to update facility" },
      { status: 500 },
    );
  }
}
