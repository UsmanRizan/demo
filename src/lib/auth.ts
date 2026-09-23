import { cookies } from "next/headers";
import type { NextResponse } from "next/server";

import { prisma } from "@/lib/prisma";
import {
  createSession,
  SESSION_COOKIE,
  SESSION_MAX_AGE_SECONDS,
  verifySession,
} from "@/lib/session";

// Never select passwordHash here: the result is passed to client components.
const safeUserSelect = {
  id: true,
  phone: true,
  firstName: true,
  lastName: true,
  email: true,
  role: true,
  sessionVersion: true,
  deletedAt: true,
  createdAt: true,
  updatedAt: true,
  passwordHash: true,
} as const;

export type CurrentUser = Awaited<ReturnType<typeof getCurrentUser>>;

export async function getCurrentUser() {
  const cookieStore = await cookies();

  const sessionToken = cookieStore.get(SESSION_COOKIE)?.value;

  if (!sessionToken) {
    return null;
  }

  const session = await verifySession(sessionToken);

  if (!session) {
    return null;
  }

  const user = await prisma.user.findUnique({
    where: {
      id: session.userId,
    },
    select: safeUserSelect,
  });

  if (
    !user ||
    user.deletedAt ||
    user.sessionVersion !== session.sessionVersion
  ) {
    return null;
  }

  const { passwordHash, ...rest } = user;

  return { ...rest, hasPassword: !!passwordHash };
}

type SessionUser = {
  id: string;
  phone: string;
  role: "PLAYER" | "OWNER" | "ADMIN" | "STAFF";
  passwordHash?: string | null;
  hasPassword?: boolean;
  sessionVersion: number;
};

/**
 * Issue a fresh session cookie for the user on the given response.
 */
export async function setSessionCookie(
  response: NextResponse,
  user: SessionUser,
) {
  const hasPassword = user.hasPassword ?? !!user.passwordHash;

  const token = await createSession({
    userId: user.id,
    phone: user.phone,
    role: user.role,
    hasPassword,
    sessionVersion: user.sessionVersion,
  });

  response.cookies.set(SESSION_COOKIE, token, {
    httpOnly: true,
    secure: process.env.NODE_ENV === "production",
    sameSite: "lax",
    path: "/",
    maxAge: SESSION_MAX_AGE_SECONDS,
  });
}

export function clearSessionCookie(response: NextResponse) {
  response.cookies.set(SESSION_COOKIE, "", {
    httpOnly: true,
    secure: process.env.NODE_ENV === "production",
    sameSite: "lax",
    path: "/",
    maxAge: 0,
  });
}

/**
 * Revoke every outstanding session for a user. Returns the new version so the
 * caller can re-issue a cookie for the current device if desired.
 */
export async function revokeAllSessions(userId: string): Promise<number> {
  const user = await prisma.user.update({
    where: { id: userId },
    data: { sessionVersion: { increment: 1 } },
    select: { sessionVersion: true },
  });

  return user.sessionVersion;
}
