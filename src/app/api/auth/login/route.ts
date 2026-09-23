import { NextResponse } from "next/server";

import { setSessionCookie } from "@/lib/auth";
import { logError } from "@/lib/monitoring";
import { comparePassword } from "@/lib/password";
import { prisma } from "@/lib/prisma";
import { clearRateLimit, enforceRateLimits } from "@/lib/rate-limit";
import { getClientIp } from "@/lib/request";
import { loginSchema, parseJson } from "@/lib/validation";

const INVALID = "Invalid phone or password";

export async function POST(request: Request) {
  try {
    const ipLimited = await enforceRateLimits(
      [{ key: `login:ip:${getClientIp(request)}`, limit: 30, windowSeconds: 900 }],
      "Too many login attempts. Please try again later.",
    );

    if (ipLimited) {
      return ipLimited;
    }

    const parsed = await parseJson(request, loginSchema);

    if (parsed.response) {
      return parsed.response;
    }

    const { phone, password } = parsed.data;
    const phoneKey = `login:phone:${phone}`;

    // Brute-force protection per account, independent of IP.
    const phoneLimited = await enforceRateLimits(
      [{ key: phoneKey, limit: 10, windowSeconds: 900 }],
      "Too many login attempts for this number. Try again later or sign in with OTP.",
    );

    if (phoneLimited) {
      return phoneLimited;
    }

    const user = await prisma.user.findUnique({ where: { phone } });

    if (!user || !user.passwordHash || user.deletedAt) {
      return NextResponse.json({ error: INVALID }, { status: 401 });
    }

    const isValid = await comparePassword(password, user.passwordHash);

    if (!isValid) {
      return NextResponse.json({ error: INVALID }, { status: 401 });
    }

    await clearRateLimit(phoneKey);

    const response = NextResponse.json({
      success: true,
      user: {
        id: user.id,
        phone: user.phone,
        role: user.role,
        hasPassword: true,
      },
    });

    await setSessionCookie(response, user);

    return response;
  } catch (error) {
    logError("Login error:", error);

    return NextResponse.json({ error: "Something went wrong" }, { status: 500 });
  }
}
