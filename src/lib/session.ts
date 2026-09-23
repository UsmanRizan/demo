import { SignJWT, jwtVerify } from "jose";

const secret = process.env.SESSION_SECRET;

if (!secret) {
  throw new Error("SESSION_SECRET is not configured");
}

const secretKey = new TextEncoder().encode(secret);

export const SESSION_COOKIE = "session";
export const SESSION_MAX_AGE_SECONDS = 60 * 60 * 24 * 7;

export type SessionPayload = {
  userId: string;
  phone: string;
  role: "PLAYER" | "OWNER" | "ADMIN" | "STAFF";
  hasPassword: boolean;
  // Must match User.sessionVersion, otherwise the session has been revoked.
  sessionVersion: number;
};

export async function createSession(payload: SessionPayload): Promise<string> {
  return new SignJWT(payload)
    .setProtectedHeader({ alg: "HS256" })
    .setIssuedAt()
    .setExpirationTime("7d")
    .sign(secretKey);
}

export async function verifySession(
  token: string,
): Promise<SessionPayload | null> {
  try {
    const { payload } = await jwtVerify(token, secretKey);

    return {
      userId: payload.userId as string,
      phone: payload.phone as string,
      role: payload.role as SessionPayload["role"],
      hasPassword: (payload.hasPassword as boolean) ?? false,
      // Tokens issued before revocation existed carry no version; treat as 0.
      sessionVersion:
        typeof payload.sessionVersion === "number" ? payload.sessionVersion : 0,
    };
  } catch {
    return null;
  }
}
