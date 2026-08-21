import { NextResponse } from "next/server";

import { prisma } from "@/lib/prisma";
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

    const otpRecord = await prisma.otpCode.findFirst({
      where: {
        phone,
        verified: false,
      },
      orderBy: {
        createdAt: "desc",
      },
    });

    if (!otpRecord) {
      return NextResponse.json(
        { error: "OTP not found. Request a new OTP." },
        { status: 400 },
      );
    }

    if (otpRecord.expiresAt < new Date()) {
      await prisma.otpCode.delete({
        where: {
          id: otpRecord.id,
        },
      });

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
      await prisma.otpCode.update({
        where: {
          id: otpRecord.id,
        },
        data: {
          attempts: {
            increment: 1,
          },
        },
      });

      return NextResponse.json({ error: "Invalid OTP" }, { status: 401 });
    }

    await prisma.otpCode.update({
      where: {
        id: otpRecord.id,
      },
      data: {
        verified: true,
      },
    });

    const user = await prisma.user.upsert({
      where: {
        phone,
      },
      update: {},
      create: {
        phone,
        role: "PLAYER",
      },
    });

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
