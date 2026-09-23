import { NextResponse } from "next/server";
import { z } from "zod";

import { getCurrentUser } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { idSchema, parseJson } from "@/lib/validation";

const favoriteSchema = z.object({ locationId: idSchema });

export async function GET() {
  const currentUser = await getCurrentUser();

  if (!currentUser) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const favorites = await prisma.favorite.findMany({
    where: { userId: currentUser.id, location: { isActive: true } },
    orderBy: { createdAt: "desc" },
    select: {
      createdAt: true,
      location: { select: { id: true, name: true, address: true, city: true } },
    },
  });

  return NextResponse.json({
    favorites: favorites.map((f) => ({
      ...f.location,
      savedAt: f.createdAt.toISOString(),
    })),
  });
}

export async function POST(request: Request) {
  const currentUser = await getCurrentUser();

  if (!currentUser) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const parsed = await parseJson(request, favoriteSchema);

  if (parsed.response) {
    return parsed.response;
  }

  const location = await prisma.location.findFirst({
    where: { id: parsed.data.locationId, isActive: true },
    select: { id: true },
  });

  if (!location) {
    return NextResponse.json({ error: "Location not found." }, { status: 404 });
  }

  await prisma.favorite.upsert({
    where: {
      userId_locationId: { userId: currentUser.id, locationId: location.id },
    },
    create: { userId: currentUser.id, locationId: location.id },
    update: {},
  });

  return NextResponse.json({ success: true, favorited: true });
}

export async function DELETE(request: Request) {
  const currentUser = await getCurrentUser();

  if (!currentUser) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const parsed = await parseJson(request, favoriteSchema);

  if (parsed.response) {
    return parsed.response;
  }

  await prisma.favorite.deleteMany({
    where: { userId: currentUser.id, locationId: parsed.data.locationId },
  });

  return NextResponse.json({ success: true, favorited: false });
}
