import { NextResponse } from "next/server";

import { audit } from "@/lib/audit";
import { getCurrentUser, revokeAllSessions, setSessionCookie } from "@/lib/auth";
import { logError } from "@/lib/monitoring";
import { comparePassword, hashPassword } from "@/lib/password";
import { prisma } from "@/lib/prisma";
import { enforceRateLimits } from "@/lib/rate-limit";
import { changePasswordSchema, parseJson } from "@/lib/validation";

export async function POST(request: Request) {
  try {
    const currentUser = await getCurrentUser();

    if (!currentUser) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const limited = await enforceRateLimits([
      { key: `change-password:user:${currentUser.id}`, limit: 10, windowSeconds: 900 },
    ]);

    if (limited) {
      return limited;
    }

    const parsed = await parseJson(request, changePasswordSchema);

    if (parsed.response) {
      return parsed.response;
    }

    const user = await prisma.user.findUnique({
      where: { id: currentUser.id },
    });

    if (!user || !user.passwordHash) {
      return NextResponse.json(
        { error: "No password set. Use OTP to sign in first." },
        { status: 400 },
      );
    }

    const isValid = await comparePassword(
      parsed.data.currentPassword.trim(),
      user.passwordHash,
    );

    if (!isValid) {
      return NextResponse.json(
        { error: "Current password is incorrect" },
        { status: 401 },
      );
    }

    await prisma.user.update({
      where: { id: currentUser.id },
      data: { passwordHash: await hashPassword(parsed.data.newPassword) },
    });

    // Sign out every other device, then keep this one signed in.
    const sessionVersion = await revokeAllSessions(currentUser.id);

    await audit({
      actorId: currentUser.id,
      action: "auth.change_password",
      entityType: "User",
      entityId: currentUser.id,
      request,
    });

    const response = NextResponse.json({ success: true });

    await setSessionCookie(response, {
      ...currentUser,
      hasPassword: true,
      sessionVersion,
    });

    return response;
  } catch (error) {
    logError("Change password error:", error);

    return NextResponse.json({ error: "Something went wrong" }, { status: 500 });
  }
}
