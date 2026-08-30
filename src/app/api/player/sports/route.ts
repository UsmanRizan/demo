import { NextResponse } from "next/server";
import { eq } from "drizzle-orm";

import { db } from "@/lib/prisma";
import { sports } from "@/db/schema";

export async function GET() {
  const result = await db
    .select({
      id: sports.id,
      name: sports.name,
      slug: sports.slug,
    })
    .from(sports)
    .where(eq(sports.isActive, true))
    .orderBy(sports.name);

  return NextResponse.json({
    sports: result,
  });
}
