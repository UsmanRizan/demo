import { NextResponse } from "next/server";

import { getCurrentUser } from "@/lib/auth";
import { prisma } from "@/lib/prisma";

const PAGE_SIZE = 50;

export async function GET(request: Request) {
  const currentUser = await getCurrentUser();

  if (!currentUser || currentUser.role !== "ADMIN") {
    return NextResponse.json({ error: "Unauthorized" }, { status: 403 });
  }

  const { searchParams } = new URL(request.url);
  const action = searchParams.get("action");
  const entityType = searchParams.get("entityType");
  const cursor = searchParams.get("cursor");

  const logs = await prisma.auditLog.findMany({
    where: {
      ...(action ? { action: { startsWith: action } } : {}),
      ...(entityType ? { entityType } : {}),
    },
    orderBy: [{ createdAt: "desc" }, { id: "desc" }],
    take: PAGE_SIZE + 1,
    ...(cursor ? { cursor: { id: cursor }, skip: 1 } : {}),
    include: {
      actor: { select: { id: true, phone: true, firstName: true, lastName: true, role: true } },
    },
  });

  const hasMore = logs.length > PAGE_SIZE;
  const page = hasMore ? logs.slice(0, PAGE_SIZE) : logs;

  return NextResponse.json({
    logs: page.map((log) => ({
      ...log,
      createdAt: log.createdAt.toISOString(),
    })),
    nextCursor: hasMore ? page[page.length - 1].id : null,
  });
}
