import { NextResponse } from "next/server";

import { getCurrentUser } from "@/lib/auth";
import { prisma } from "@/lib/prisma";

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

    const data: { price?: number; sports?: { set: { id: string }[] } } = {};

    if (body.price !== undefined) {
      const price = Number(body.price);

      if (!Number.isFinite(price) || price <= 0) {
        return NextResponse.json(
          { error: "Price must be greater than zero" },
          { status: 400 },
        );
      }

      data.price = price;
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
      const sports = await prisma.sport.findMany({
        where: { id: { in: sportIds }, isActive: true },
      });

      if (sports.length !== sportIds.length) {
        return NextResponse.json(
          { error: "One or more sports not found or inactive" },
          { status: 404 },
        );
      }

      data.sports = { set: sportIds.map((id) => ({ id })) };
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
        sports: updated.sports,
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
