import { NextResponse } from "next/server";

import { audit } from "@/lib/audit";
import { getCurrentUser } from "@/lib/auth";
import { logError } from "@/lib/monitoring";
import { prisma } from "@/lib/prisma";
import { parseJson, sportSchema } from "@/lib/validation";

export async function GET() {
  const currentUser = await getCurrentUser();

  if (!currentUser || currentUser.role !== "ADMIN") {
    return NextResponse.json({ error: "Unauthorized" }, { status: 403 });
  }

  const sports = await prisma.sport.findMany({
    orderBy: {
      name: "asc",
    },
  });

  return NextResponse.json({
    sports,
  });
}

export async function POST(request: Request) {
  const currentUser = await getCurrentUser();

  if (!currentUser || currentUser.role !== "ADMIN") {
    return NextResponse.json({ error: "Unauthorized" }, { status: 403 });
  }

  try {
    const parsed = await parseJson(request, sportSchema);

    if (parsed.response) {
      return parsed.response;
    }

    const { name } = parsed.data;

    const slug = name
      .toLowerCase()
      .replace(/[^a-z0-9]+/g, "-")
      .replace(/^-+|-+$/g, "");

    if (!slug) {
      return NextResponse.json({ error: "Invalid sport name" }, { status: 400 });
    }

    const existingSport = await prisma.sport.findFirst({
      where: {
        OR: [{ name: { equals: name, mode: "insensitive" } }, { slug }],
      },
    });

    if (existingSport) {
      return NextResponse.json({ error: "Sport already exists" }, { status: 409 });
    }

    const sport = await prisma.sport.create({
      data: {
        name,
        slug,
      },
    });

    await audit({
      actorId: currentUser.id,
      action: "sport.create",
      entityType: "Sport",
      entityId: sport.id,
      metadata: { name },
      request,
    });

    return NextResponse.json({
      success: true,
      sport,
    });
  } catch (error) {
    logError("Create sport error:", error);

    return NextResponse.json(
      { error: "Failed to create sport" },
      { status: 500 },
    );
  }
}
