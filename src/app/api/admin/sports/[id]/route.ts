import { NextResponse } from "next/server";
import { z } from "zod";

import { audit } from "@/lib/audit";
import { getCurrentUser } from "@/lib/auth";
import { logError } from "@/lib/monitoring";
import { prisma } from "@/lib/prisma";
import { parseJson } from "@/lib/validation";

type RouteContext = {
  params: Promise<{
    id: string;
  }>;
};

const sportToggleSchema = z.object({
  isActive: z.boolean({ error: "isActive must be true or false" }),
});

export async function PATCH(request: Request, context: RouteContext) {
  const currentUser = await getCurrentUser();

  if (!currentUser || currentUser.role !== "ADMIN") {
    return NextResponse.json({ error: "Unauthorized" }, { status: 403 });
  }

  try {
    const { id } = await context.params;

    const parsed = await parseJson(request, sportToggleSchema);

    if (parsed.response) {
      return parsed.response;
    }

    const sport = await prisma.sport.update({
      where: {
        id,
      },
      data: {
        isActive: parsed.data.isActive,
      },
    });

    await audit({
      actorId: currentUser.id,
      action: parsed.data.isActive ? "sport.activate" : "sport.deactivate",
      entityType: "Sport",
      entityId: id,
      request,
    });

    return NextResponse.json({
      success: true,
      sport,
    });
  } catch (error) {
    logError("Update sport error:", error);

    return NextResponse.json(
      { error: "Failed to update sport" },
      { status: 500 },
    );
  }
}
