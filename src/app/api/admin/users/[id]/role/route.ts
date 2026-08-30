import { NextResponse } from "next/server";
import { eq } from "drizzle-orm";

import { db } from "@/lib/prisma";
import { users } from "@/db/schema";
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
      { status: 403 },
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
        { status: 400 },
      );
    }

    if (id === currentUser.id) {
      return NextResponse.json(
        {
          error: "You cannot change your own role",
        },
        { status: 400 },
      );
    }

    const [user] = await db
      .update(users)
      .set({ role: body.role })
      .where(eq(users.id, id))
      .returning();

    if (!user) {
      return NextResponse.json(
        { error: "User not found" },
        { status: 404 },
      );
    }

    return NextResponse.json({
      success: true,
      user: {
        id: user.id,
        phone: user.phone,
        firstName: user.firstName,
        lastName: user.lastName,
        email: user.email,
        role: user.role,
      },
    });
  } catch (error) {
    console.error("Role update error:", error);

    return NextResponse.json(
      {
        error: "Failed to update user role",
      },
      { status: 500 },
    );
  }
}
