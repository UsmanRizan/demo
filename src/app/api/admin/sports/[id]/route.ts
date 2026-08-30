import { NextResponse } from "next/server";
import { eq } from "drizzle-orm";

import { db } from "@/lib/prisma";
import { sports } from "@/db/schema";
import { getCurrentUser } from "@/lib/auth";

export async function PATCH(
  request: Request,
  { params }: { params: Promise<{ id: string }> },
) {
  const currentUser = await getCurrentUser();

  if (!currentUser || currentUser.role !== "ADMIN") {
    return NextResponse.json({ error: "Unauthorized" }, { status: 403 });
  }

  try {
    const { id } = await params;
    const body = await request.json();

    const updateData: Record<string, unknown> = {};

    if (body.isActive !== undefined) {
      updateData.isActive = body.isActive;
    }

    if (body.name !== undefined) {
      updateData.name = body.name;
    }

    const [sport] = await db
      .update(sports)
      .set(updateData)
      .where(eq(sports.id, id))
      .returning();

    if (!sport) {
      return NextResponse.json({ error: "Sport not found" }, { status: 404 });
    }

    return NextResponse.json({ sport });
  } catch (error) {
    console.error("Update sport error:", error);
    return NextResponse.json(
      { error: "Failed to update sport" },
      { status: 500 },
    );
  }
}
