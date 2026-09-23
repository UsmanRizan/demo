import { NextResponse } from "next/server";
import { z } from "zod";

import { audit } from "@/lib/audit";
import { getCurrentUser } from "@/lib/auth";
import { logError } from "@/lib/monitoring";
import { prisma } from "@/lib/prisma";
import { parseJson } from "@/lib/validation";

type RouteContext = { params: Promise<{ id: string }> };

const moderationSchema = z.object({
  isHidden: z.boolean({ error: "isHidden must be true or false" }),
});

/** Admin moderation: hide or restore a review. */
export async function PATCH(request: Request, { params }: RouteContext) {
  const currentUser = await getCurrentUser();

  if (!currentUser || currentUser.role !== "ADMIN") {
    return NextResponse.json({ error: "Unauthorized" }, { status: 403 });
  }

  try {
    const { id } = await params;

    const parsed = await parseJson(request, moderationSchema);

    if (parsed.response) {
      return parsed.response;
    }

    const review = await prisma.review.update({
      where: { id },
      data: { isHidden: parsed.data.isHidden },
    });

    await audit({
      actorId: currentUser.id,
      action: parsed.data.isHidden ? "review.hide" : "review.unhide",
      entityType: "Review",
      entityId: id,
      request,
    });

    return NextResponse.json({ success: true, review });
  } catch (error) {
    logError("Review moderation error:", error);

    return NextResponse.json({ error: "Failed to update review." }, { status: 500 });
  }
}
