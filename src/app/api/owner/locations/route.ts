import { NextResponse } from "next/server";

import { prisma } from "@/lib/prisma";
import { getCurrentUser } from "@/lib/auth";
import { locationCreateSchema, parseJson } from "@/lib/validation";
import { logError } from "@/lib/monitoring";

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
    const parsed = await parseJson(request, locationCreateSchema);

    if (parsed.response) {
      return parsed.response;
    }

    const { name, address, city, description, phone, latitude, longitude } =
      parsed.data;

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
    logError("Create location error:", error);

    return NextResponse.json(
      { error: "Failed to create location" },
      { status: 500 },
    );
  }
}
