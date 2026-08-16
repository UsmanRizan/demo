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
    return NextResponse.json(
      {
        error: "Unauthorized",
      },
      {
        status: 403,
      },
    );
  }

  try {
    const { id } = await context.params;

    const body = await request.json();

    if (!["PLAYER", "OWNER"].includes(body.role)) {
      return NextResponse.json(
        {
          error: "Invalid role",
        },
        {
          status: 400,
        },
      );
    }

    if (id === currentUser.id) {
      return NextResponse.json(
        {
          error: "You cannot change your own role",
        },
        {
          status: 400,
        },
      );
    }

    const user = await prisma.user.update({
      where: {
        id,
      },

      data: {
        role: body.role,
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

    return NextResponse.json({
      success: true,
      user,
    });
  } catch (error) {
    console.error("Role update error:", error);

    return NextResponse.json(
      {
        error: "Failed to update user role",
      },
      {
        status: 500,
      },
    );
  }
}
