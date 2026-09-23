import { NextResponse } from "next/server";

import { audit } from "@/lib/audit";
import { getCurrentUser } from "@/lib/auth";
import { logError } from "@/lib/monitoring";
import { prisma } from "@/lib/prisma";
import { parseJson, roleChangeSchema } from "@/lib/validation";

type RouteContext = {
  params: Promise<{
    id: string;
  }>;
};

export async function PATCH(request: Request, context: RouteContext) {
  const currentUser = await getCurrentUser();

  if (!currentUser || currentUser.role !== "ADMIN") {
    return NextResponse.json({ error: "Unauthorized" }, { status: 403 });
  }

  try {
    const { id } = await context.params;

    const parsed = await parseJson(request, roleChangeSchema);

    if (parsed.response) {
      return parsed.response;
    }

    if (id === currentUser.id) {
      return NextResponse.json(
        { error: "You cannot change your own role" },
        { status: 400 },
      );
    }

    const existing = await prisma.user.findUnique({
      where: { id },
      select: { role: true, deletedAt: true },
    });

    if (!existing || existing.deletedAt) {
      return NextResponse.json({ error: "User not found" }, { status: 404 });
    }

    const user = await prisma.$transaction(async (tx) => {
      const updated = await tx.user.update({
        where: { id },
        data: {
          role: parsed.data.role,
          // Force re-login so no session carries the old role.
          sessionVersion: { increment: 1 },
        },
        select: {
          id: true,
          phone: true,
          firstName: true,
          lastName: true,
          email: true,
          role: true,
        },
      });

      await audit(
        {
          actorId: currentUser.id,
          action: "user.role_change",
          entityType: "User",
          entityId: id,
          metadata: { from: existing.role, to: parsed.data.role },
          request,
        },
        tx,
      );

      return updated;
    });

    return NextResponse.json({ success: true, user });
  } catch (error) {
    logError("Role update error:", error);

    return NextResponse.json(
      { error: "Failed to update user role" },
      { status: 500 },
    );
  }
}
