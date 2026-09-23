import { NextResponse } from "next/server";

import { setSessionCookie } from "@/lib/auth";
import { logError } from "@/lib/monitoring";
import { verifyOtpHash } from "@/lib/otp";
import { prisma } from "@/lib/prisma";
import { enforceRateLimits } from "@/lib/rate-limit";
import { getClientIp } from "@/lib/request";
import { parseJson, verifyOtpSchema } from "@/lib/validation";

const MAX_ATTEMPTS = 5;

export async function POST(request: Request) {
  try {
    const limited = await enforceRateLimits([
      { key: `verify-otp:ip:${getClientIp(request)}`, limit: 30, windowSeconds: 900 },
    ]);

    if (limited) {
      return limited;
    }

    const parsed = await parseJson(request, verifyOtpSchema);

    if (parsed.response) {
      return parsed.response;
    }

    const { phone, code } = parsed.data;

    const otpRecord = await prisma.otpCode.findFirst({
      where: { phone, verified: false },
      orderBy: { createdAt: "desc" },
    });

    if (!otpRecord) {
      return NextResponse.json(
        { error: "OTP not found. Request a new OTP." },
        { status: 400 },
      );
    }

    if (otpRecord.expiresAt < new Date()) {
      await prisma.otpCode.delete({ where: { id: otpRecord.id } });

      return NextResponse.json(
        { error: "OTP has expired. Request a new OTP." },
        { status: 400 },
      );
    }

    // Count the attempt before checking, atomically, so parallel guesses
    // cannot exceed the limit.
    const attempt = await prisma.otpCode.updateMany({
      where: { id: otpRecord.id, attempts: { lt: MAX_ATTEMPTS } },
      data: { attempts: { increment: 1 } },
    });

    if (attempt.count === 0) {
      return NextResponse.json(
        { error: "Too many attempts. Request a new OTP." },
        { status: 429 },
      );
    }

    if (!verifyOtpHash(code, otpRecord.codeHash)) {
      return NextResponse.json({ error: "Invalid OTP" }, { status: 401 });
    }

    // Single use: only one concurrent request can flip verified.
    const consumed = await prisma.otpCode.updateMany({
      where: { id: otpRecord.id, verified: false },
      data: { verified: true },
    });

    if (consumed.count === 0) {
      return NextResponse.json({ error: "OTP already used." }, { status: 400 });
    }

    const existing = await prisma.user.findUnique({ where: { phone } });

    if (existing?.deletedAt) {
      return NextResponse.json(
        { error: "This account has been deleted." },
        { status: 403 },
      );
    }

    const user =
      existing ??
      (await prisma.user.create({
        data: { phone, role: "PLAYER" },
      }));

    const hasPassword = !!user.passwordHash;

    const response = NextResponse.json({
      success: true,
      user: {
        id: user.id,
        phone: user.phone,
        role: user.role,
        hasPassword,
      },
    });

    await setSessionCookie(response, user);

    return response;
  } catch (error) {
    logError("Verify OTP error:", error);

    return NextResponse.json({ error: "Something went wrong" }, { status: 500 });
  }
}
