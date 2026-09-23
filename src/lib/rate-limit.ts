import { NextResponse } from "next/server";

import { logError } from "@/lib/monitoring";
import { prisma } from "@/lib/prisma";

export type RateLimitRule = {
  key: string;
  limit: number;
  windowSeconds: number;
};

export type RateLimitResult = {
  allowed: boolean;
  count: number;
  retryAfterSeconds: number;
};

/**
 * Fixed-window counter stored in Postgres, so limits hold across serverless
 * instances without extra infrastructure. A single upsert both increments and
 * resets expired windows atomically.
 */
export async function hitRateLimit(rule: RateLimitRule): Promise<RateLimitResult> {
  const rows = await prisma.$queryRaw<{ count: number; resetAt: Date }[]>`
    INSERT INTO "RateLimit" ("key", "count", "resetAt")
    VALUES (
      ${rule.key},
      1,
      (now() AT TIME ZONE 'UTC') + make_interval(secs => ${rule.windowSeconds}::double precision)
    )
    ON CONFLICT ("key") DO UPDATE SET
      "count" = CASE
        WHEN "RateLimit"."resetAt" <= (now() AT TIME ZONE 'UTC') THEN 1
        ELSE "RateLimit"."count" + 1
      END,
      "resetAt" = CASE
        WHEN "RateLimit"."resetAt" <= (now() AT TIME ZONE 'UTC')
          THEN (now() AT TIME ZONE 'UTC') + make_interval(secs => ${rule.windowSeconds}::double precision)
        ELSE "RateLimit"."resetAt"
      END
    RETURNING "count", "resetAt"
  `;

  const row = rows[0];
  const count = Number(row.count);
  // resetAt is a UTC timestamp without time zone; Prisma returns it as UTC.
  const retryAfterSeconds = Math.max(
    1,
    Math.ceil((new Date(row.resetAt).getTime() - Date.now()) / 1000),
  );

  return { allowed: count <= rule.limit, count, retryAfterSeconds };
}

/**
 * Apply several limits; returns a 429 response for the first one exceeded, or
 * null if the request may proceed. Fails open if the limiter itself errors so a
 * database hiccup does not lock everyone out.
 */
export async function enforceRateLimits(
  rules: RateLimitRule[],
  message = "Too many requests. Please try again later.",
): Promise<NextResponse | null> {
  for (const rule of rules) {
    try {
      const result = await hitRateLimit(rule);

      if (!result.allowed) {
        return NextResponse.json(
          { error: message, retryAfterSeconds: result.retryAfterSeconds },
          {
            status: 429,
            headers: { "Retry-After": String(result.retryAfterSeconds) },
          },
        );
      }
    } catch (error) {
      logError("Rate limiter error (failing open):", error);
    }
  }

  return null;
}

export async function clearRateLimit(key: string) {
  await prisma.rateLimit.deleteMany({ where: { key } });
}
