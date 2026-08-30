import { NextResponse } from "next/server";
import { eq } from "drizzle-orm";

import { getCurrentUser } from "@/lib/auth";
import { db } from "@/lib/prisma";
import { sports } from "@/db/schema";

export async function GET() {
  const user = await getCurrentUser();

  if (!user || user.role !== "OWNER") {
    return NextResponse.json({ error: "Unauthorized" }, { status: 403 });
  }

  const result = await db
    .select()
    .from(sports)
    .where(eq(sports.isActive, true))
    .orderBy(sports.name);

  return NextResponse.json({
    sports: result,
  });
}
