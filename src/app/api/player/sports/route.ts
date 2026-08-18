import { NextResponse } from "next/server";

import { prisma } from "@/lib/prisma";

export async function GET() {
  const sports = await prisma.sport.findMany({
    where: {
      isActive: true,
    },
    orderBy: {
      name: "asc",
    },
    select: {
      id: true,
      name: true,
      slug: true,
    },
  });

  return NextResponse.json({
    sports,
  });
}
