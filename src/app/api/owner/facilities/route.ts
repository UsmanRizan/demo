import { NextResponse } from "next/server";

import { prisma } from "@/lib/prisma";
import { getCurrentUser } from "@/lib/auth";
import { facilityCreateSchema, parseJson } from "@/lib/validation";
import { logError } from "@/lib/monitoring";

export async function POST(request: Request) {
  const user = await getCurrentUser();

  if (!user || user.role !== "OWNER") {
    return NextResponse.json({ error: "Unauthorized" }, { status: 403 });
  }

  try {
    const parsed = await parseJson(request, facilityCreateSchema);

    if (parsed.response) {
      return parsed.response;
    }

    const { locationId, sportIds, name, description, imageUrl, price } =
      parsed.data;

    // Make sure the location belongs to this owner.
    const location = await prisma.location.findFirst({
      where: {
        id: locationId,
        ownerId: user.id,
      },
    });

    if (!location) {
      return NextResponse.json(
        { error: "Location not found" },
        { status: 404 },
      );
    }

    // Only active sports can be selected.
    const sports = await prisma.sport.findMany({
      where: {
        id: { in: sportIds },
        isActive: true,
      },
    });

    if (sports.length !== sportIds.length) {
      return NextResponse.json(
        { error: "One or more sports not found or inactive" },
        { status: 404 },
      );
    }

    const facility = await prisma.facility.create({
      data: {
        locationId,
        name,
        description,
        imageUrl,
        price,
        sports: {
          connect: sportIds.map((id) => ({ id })),
        },
      },
      include: {
        sports: true,
        location: true,
      },
    });

    return NextResponse.json(
      {
        success: true,
        facility,
      },
      { status: 201 },
    );
  } catch (error) {
    logError("Create facility error:", error);

    return NextResponse.json(
      { error: "Failed to create facility" },
      { status: 500 },
    );
  }
}
