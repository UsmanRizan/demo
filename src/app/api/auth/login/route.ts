import { NextResponse } from "next/server";

import { prisma } from "@/lib/prisma";
import { comparePassword } from "@/lib/password";
import { createSession } from "@/lib/session";
import { normalizePhone } from "@/lib/utils";

export async function POST(request: Request) {
  try {
    const body = await request.json();

    if (!body.phone || typeof body.phone !== "string") {
      return NextResponse.json(
        { error: "Phone number is required" },
        { status: 400 },
      );
    }

    if (!body.password || typeof body.password !== "string") {
      return NextResponse.json(
        { error: "Password is required" },
        { status: 400 },
      );
    }

    const phone = normalizePhone(body.phone);
    const password = body.password;

    const user = await prisma.user.findUnique({
      where: { phone },
    });

    if (!user || !user.passwordHash) {
      return NextResponse.json(
        { error: "Invalid phone or password" },
        { status: 401 },
      );
    }

    const isValid = await comparePassword(password, user.passwordHash);

    if (!isValid) {
      return NextResponse.json(
        { error: "Invalid phone or password" },
        { status: 401 },
      );
    }

    const sessionToken = await createSession({
      userId: user.id,
      phone: user.phone,
      role: user.role,
      hasPassword: true,
    });

    const response = NextResponse.json({
      success: true,
      user: {
        id: user.id,
        phone: user.phone,
        role: user.role,
        hasPassword: true,
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
    console.error("Login error:", error);

    return NextResponse.json(
      { error: "Something went wrong" },
      { status: 500 },
    );
  }
}
