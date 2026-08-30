import { NextResponse } from "next/server";
import { eq, and, desc } from "drizzle-orm";

import { db } from "@/lib/prisma";
import { otpCodes, users } from "@/db/schema";
import { verifyOtpHash } from "@/lib/otp";
import { createSession } from "@/lib/session";
import { normalizePhone } from "@/lib/utils";

export async function POST(request: Request) {
  try {
    const body = await request.json();

    if (
      !body.phone ||
      typeof body.phone !== "string" ||
      !body.code ||
      typeof body.code !== "string"
    ) {
      return NextResponse.json(
        { error: "Phone number and OTP are required" },
        { status: 400 },
      );
    }

    const phone = normalizePhone(body.phone);
    const code = body.code.trim();

    const [otpRecord] = await db
      .select()
      .from(otpCodes)
      .where(and(eq(otpCodes.phone, phone), eq(otpCodes.verified, false)))
      .orderBy(desc(otpCodes.createdAt))
      .limit(1);

    if (!otpRecord) {
      return NextResponse.json(
        { error: "OTP not found. Request a new OTP." },
        { status: 400 },
      );
    }

    if (otpRecord.expiresAt < new Date()) {
      await db.delete(otpCodes).where(eq(otpCodes.id, otpRecord.id));

      return NextResponse.json(
        { error: "OTP has expired. Request a new OTP." },
        { status: 400 },
      );
    }

    if (otpRecord.attempts >= 5) {
      return NextResponse.json(
        { error: "Too many attempts. Request a new OTP." },
        { status: 429 },
      );
    }

    const isValid = verifyOtpHash(code, otpRecord.codeHash);

    if (!isValid) {
      await db
        .update(otpCodes)
        .set({ attempts: otpRecord.attempts + 1 })
        .where(eq(otpCodes.id, otpRecord.id));

      return NextResponse.json({ error: "Invalid OTP" }, { status: 401 });
    }

    await db
      .update(otpCodes)
      .set({ verified: true })
      .where(eq(otpCodes.id, otpRecord.id));

    // Upsert user: try to find existing, otherwise create
    const [existingUser] = await db
      .select()
      .from(users)
      .where(eq(users.phone, phone))
      .limit(1);

    let user;
    if (existingUser) {
      [user] = await db
        .update(users)
        .set({ updatedAt: new Date() })
        .where(eq(users.phone, phone))
        .returning();
    } else {
      [user] = await db
        .insert(users)
        .values({ phone, role: "PLAYER" })
        .returning();
    }

    const hasPassword = !!user.passwordHash;

    const sessionToken = await createSession({
      userId: user.id,
      phone: user.phone,
      role: user.role,
      hasPassword,
    });

    const response = NextResponse.json({
      success: true,
      user: {
        id: user.id,
        phone: user.phone,
        role: user.role,
        hasPassword,
      },
    });

    response.cookies.set("session", sessionToken, {
      httpOnly: true,
      secure: process.env.NODE_ENV === "production",
      sameSite: "lax",
      path: "/",
      maxAge: 60 * 60 * 24 * 7,
    });

    return response;
  } catch (error) {
    console.error("Verify OTP error:", error);

    return NextResponse.json(
      { error: "Something went wrong" },
      { status: 500 },
    );
  }
}
