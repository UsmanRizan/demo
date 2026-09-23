import { NextResponse } from "next/server";

import { audit } from "@/lib/audit";
import { clearSessionCookie, getCurrentUser, revokeAllSessions } from "@/lib/auth";

/** Sign out of every device by invalidating all issued session tokens. */
export async function POST(request: Request) {
  const currentUser = await getCurrentUser();

  if (!currentUser) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  await revokeAllSessions(currentUser.id);

  await audit({
    actorId: currentUser.id,
    action: "auth.logout_all",
    entityType: "User",
    entityId: currentUser.id,
    request,
  });

  const response = NextResponse.json({ success: true });

  clearSessionCookie(response);

  return response;
}
