import { NextResponse } from "next/server";

import { prisma } from "@/lib/prisma";
import { getCurrentUser } from "@/lib/auth";

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
    const body = await request.json();

    const name = typeof body.name === "string" ? body.name.trim() : "";

    if (!name) {
      return NextResponse.json(
        { error: "Sport name is required" },
        { status: 400 },
      );
    }

    const slug = name
      .toLowerCase()
      .trim()
      .replace(/[^a-z0-9]+/g, "-")
      .replace(/^-+|-+$/g, "");

    if (!slug) {
      return NextResponse.json(
        { error: "Invalid sport name" },
        { status: 400 },
      );
    }

    const existingSport = await prisma.sport.findFirst({
      where: {
        OR: [
          {
            name: {
              equals: name,
              mode: "insensitive",
            },
          },
          {
            slug,
          },
        ],
      },
    });

    if (existingSport) {
      return NextResponse.json(
        { error: "Sport already exists" },
        { status: 409 },
      );
    }

    const sport = await prisma.sport.create({
      data: {
        name,
        slug,
      },
    });

    return NextResponse.json({
      success: true,
      sport,
    });
  } catch (error) {
    console.error("Create sport error:", error);

    return NextResponse.json(
      { error: "Failed to create sport" },
      { status: 500 },
    );
  }
}
