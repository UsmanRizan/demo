import { NextResponse } from "next/server";
import { eq, and, or } from "drizzle-orm";

import { db } from "@/lib/prisma";
import { sports } from "@/db/schema";
import { getCurrentUser } from "@/lib/auth";

export async function GET() {
  const currentUser = await getCurrentUser();

  if (!currentUser || currentUser.role !== "ADMIN") {
    return NextResponse.json({ error: "Unauthorized" }, { status: 403 });
  }

  const result = await db.select().from(sports).orderBy(sports.name);

  return NextResponse.json({
    sports: result,
  });
}

export async function POST(request: Request) {
  const currentUser = await getCurrentUser();

  if (!currentUser || currentUser.role !== "ADMIN") {
    return NextResponse.json({ error: "Unauthorized" }, { status: 403 });
  }

  try {
    const body = await request.json();

    const { name } = body;

    if (!name || typeof name !== "string" || !name.trim()) {
      return NextResponse.json(
        { error: "Sport name is required" },
        { status: 400 },
      );
    }

    const trimmedName = name.trim();
    const slug = trimmedName
      .toLowerCase()
      .replace(/[^a-z0-9]+/g, "-")
      .replace(/^-|-$/g, "");

    // Check for duplicate name or slug
    const [existing] = await db
      .select()
      .from(sports)
      .where(or(eq(sports.name, trimmedName), eq(sports.slug, slug)))
      .limit(1);

    if (existing) {
      return NextResponse.json(
        { error: "A sport with this name already exists" },
        { status: 409 },
      );
    }

    const [sport] = await db
      .insert(sports)
      .values({
        name: trimmedName,
        slug,
      })
      .returning();

    return NextResponse.json({ sport }, { status: 201 });
  } catch (error) {
    console.error("Create sport error:", error);
    return NextResponse.json(
      { error: "Failed to create sport" },
      { status: 500 },
    );
  }
}
