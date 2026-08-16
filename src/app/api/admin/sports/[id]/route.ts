import { NextResponse } from "next/server";

import { prisma } from "@/lib/prisma";
import { getCurrentUser } from "@/lib/auth";

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
    const body = await request.json();

    if (typeof body.isActive !== "boolean") {
      return NextResponse.json(
        { error: "isActive must be true or false" },
        { status: 400 },
      );
    }

    const sport = await prisma.sport.update({
      where: {
        id,
      },
      data: {
        isActive: body.isActive,
      },
    });

    return NextResponse.json({
      success: true,
      sport,
    });
  } catch (error) {
    console.error("Update sport error:", error);

    return NextResponse.json(
      { error: "Failed to update sport" },
      { status: 500 },
    );
  }
}
