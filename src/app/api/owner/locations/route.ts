import { NextResponse } from "next/server";

import { prisma } from "@/lib/prisma";
import { getCurrentUser } from "@/lib/auth";

export async function GET() {
  const user = await getCurrentUser();

  if (!user || user.role !== "OWNER") {
    return NextResponse.json({ error: "Unauthorized" }, { status: 403 });
  }

  const locations = await prisma.location.findMany({
    where: {
      ownerId: user.id,
    },
    orderBy: {
      createdAt: "desc",
    },
  });

  return NextResponse.json({
    locations,
  });
}

export async function POST(request: Request) {
  const user = await getCurrentUser();

  if (!user || user.role !== "OWNER") {
    return NextResponse.json({ error: "Unauthorized" }, { status: 403 });
  }

  try {
    const body = await request.json();

    const name = typeof body.name === "string" ? body.name.trim() : "";

    const address = typeof body.address === "string" ? body.address.trim() : "";

    const city = typeof body.city === "string" ? body.city.trim() : "";

    const description =
      typeof body.description === "string" ? body.description.trim() : null;

    const phone = typeof body.phone === "string" ? body.phone.trim() : null;

    const latitude =
      body.latitude !== null && body.latitude !== undefined
        ? Number(body.latitude)
        : null;

    const longitude =
      body.longitude !== null && body.longitude !== undefined
        ? Number(body.longitude)
        : null;

    if (!name || !address || !city) {
      return NextResponse.json(
        {
          error: "Name, address and city are required",
        },
        { status: 400 },
      );
    }

    if (
      latitude === null ||
      longitude === null ||
      !Number.isFinite(latitude) ||
      !Number.isFinite(longitude)
    ) {
      return NextResponse.json(
        {
          error: "Please select the location on the map",
        },
        { status: 400 },
      );
    }

    if (
      latitude < -90 ||
      latitude > 90 ||
      longitude < -180 ||
      longitude > 180
    ) {
      return NextResponse.json(
        {
          error: "Invalid map coordinates",
        },
        { status: 400 },
      );
    }

    const location = await prisma.location.create({
      data: {
        ownerId: user.id,
        name,
        address,
        city,
        description,
        phone,
        latitude,
        longitude,
      },
    });

    return NextResponse.json(
      {
        success: true,
        location,
      },
      { status: 201 },
    );
  } catch (error) {
    console.error("Create location error:", error);

    return NextResponse.json(
      { error: "Failed to create location" },
      { status: 500 },
    );
  }
}
