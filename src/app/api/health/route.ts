import { NextResponse } from "next/server";

import { prisma } from "@/lib/prisma";

/** Liveness/readiness probe for uptime monitors and load balancers. */
export async function GET() {
  const startedAt = Date.now();

  try {
    await prisma.$queryRaw`SELECT 1`;

    return NextResponse.json(
      { status: "ok", database: "ok", latencyMs: Date.now() - startedAt },
      { headers: { "Cache-Control": "no-store" } },
    );
  } catch {
    return NextResponse.json(
      { status: "degraded", database: "unreachable" },
      { status: 503, headers: { "Cache-Control": "no-store" } },
    );
  }
}
