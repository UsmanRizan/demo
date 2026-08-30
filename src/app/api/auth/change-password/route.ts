import { NextResponse } from "next/server";
import { eq } from "drizzle-orm";

import { getCurrentUser } from "@/lib/auth";
import { db } from "@/lib/prisma";
import { users } from "@/db/schema";
import { comparePassword, hashPassword } from "@/lib/password";

export async function POST(request: Request) {
  try {
    const currentUser = await getCurrentUser();

    if (!currentUser) {
      return NextResponse.json(
        { error: "Unauthorized" },
        { status: 401 },
      );
    }

    const body = await request.json();

    if (
      !body.currentPassword ||
      typeof body.currentPassword !== "string" ||
      !body.newPassword ||
      typeof body.newPassword !== "string"
    ) {
      return NextResponse.json(
        { error: "Current password and new password are required" },
        { status: 400 },
      );
    }

    const [user] = await db
      .select()
      .from(users)
      .where(eq(users.id, currentUser.id))
      .limit(1);

    if (!user || !user.passwordHash) {
      return NextResponse.json(
        { error: "No password set. Use OTP to sign in first." },
        { status: 400 },
      );
    }

    const isValid = await comparePassword(
      body.currentPassword.trim(),
      user.passwordHash,
    );

    if (!isValid) {
      return NextResponse.json(
        { error: "Current password is incorrect" },
        { status: 401 },
      );
    }

    const newPassword = body.newPassword.trim();

    if (newPassword.length < 8) {
      return NextResponse.json(
        { error: "New password must be at least 8 characters" },
        { status: 400 },
      );
    }

    const passwordHash = await hashPassword(newPassword);

    await db
      .update(users)
      .set({ passwordHash })
      .where(eq(users.id, currentUser.id));

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error("Change password error:", error);

    return NextResponse.json(
      { error: "Something went wrong" },
      { status: 500 },
    );
  }
}
