import { NextResponse } from "next/server";

import { audit } from "@/lib/audit";
import { getCurrentUser, revokeAllSessions, setSessionCookie } from "@/lib/auth";
import { logError } from "@/lib/monitoring";
import { hashPassword } from "@/lib/password";
import { prisma } from "@/lib/prisma";
import { parseJson, setPasswordSchema } from "@/lib/validation";

export async function POST(request: Request) {
  try {
    const currentUser = await getCurrentUser();

    if (!currentUser) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const parsed = await parseJson(request, setPasswordSchema);

    if (parsed.response) {
      return parsed.response;
    }

    await prisma.user.update({
      where: { id: currentUser.id },
      data: { passwordHash: await hashPassword(parsed.data.password) },
    });

    const sessionVersion = await revokeAllSessions(currentUser.id);

    await audit({
      actorId: currentUser.id,
      action: "auth.set_password",
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
    logError("Set password error:", error);

    return NextResponse.json({ error: "Something went wrong" }, { status: 500 });
  }
}
