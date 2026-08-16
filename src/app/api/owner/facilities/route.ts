import { NextResponse } from "next/server";

import { prisma } from "@/lib/prisma";
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

    const sportId = typeof body.sportId === "string" ? body.sportId : "";

    const name = typeof body.name === "string" ? body.name.trim() : "";

    const description =
      typeof body.description === "string" ? body.description.trim() : null;

    const price = Number(body.price);

    if (!locationId || !sportId || !name) {
      return NextResponse.json(
        {
          error: "Location, sport and facility name are required",
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
    const sport = await prisma.sport.findFirst({
      where: {
        id: sportId,
        isActive: true,
      },
    });

    if (!sport) {
      return NextResponse.json(
        { error: "Sport not found or inactive" },
        { status: 404 },
      );
    }

    const facility = await prisma.facility.create({
      data: {
        locationId,
        sportId,
        name,
        description,
        price,
      },
      include: {
        sport: true,
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
    console.error("Create facility error:", error);

    return NextResponse.json(
      { error: "Failed to create facility" },
      { status: 500 },
    );
  }
}
