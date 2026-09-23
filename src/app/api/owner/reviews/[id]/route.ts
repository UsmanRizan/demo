import { NextResponse } from "next/server";

import { getCurrentUser } from "@/lib/auth";
import { logError } from "@/lib/monitoring";
import { prisma } from "@/lib/prisma";
import { parseJson, reviewReplySchema } from "@/lib/validation";

type RouteContext = { params: Promise<{ id: string }> };

/** Owner replies publicly to a review of one of their locations. */
export async function PATCH(request: Request, { params }: RouteContext) {
  const currentUser = await getCurrentUser();

  if (!currentUser || currentUser.role !== "OWNER") {
    return NextResponse.json({ error: "Unauthorized" }, { status: 403 });
  }

  try {
    const { id } = await params;

    const parsed = await parseJson(request, reviewReplySchema);

    if (parsed.response) {
      return parsed.response;
    }

    const review = await prisma.review.findFirst({
      where: { id, location: { ownerId: currentUser.id } },
      select: { id: true },
    });

    if (!review) {
      return NextResponse.json({ error: "Review not found." }, { status: 404 });
    }

    const updated = await prisma.review.update({
      where: { id },
      data: { ownerReply: parsed.data.reply || null },
    });

    return NextResponse.json({ success: true, review: updated });
  } catch (error) {
    logError("Review reply error:", error);

    return NextResponse.json({ error: "Failed to save reply." }, { status: 500 });
  }
}
