import crypto from "crypto";
import { NextResponse } from "next/server";

import { runScheduledJobs } from "@/lib/jobs";

export const maxDuration = 60;

function authorized(request: Request): boolean {
  const secret = process.env.CRON_SECRET;

  if (!secret) {
    return false;
  }

  const header = request.headers.get("authorization") ?? "";
  const expected = Buffer.from(`Bearer ${secret}`);
  const received = Buffer.from(header);

  return (
    expected.length === received.length && crypto.timingSafeEqual(expected, received)
  );
}

/**
 * Runs expiry, auto-completion, reminders and cleanup. Call every 5-10 minutes
 * with `Authorization: Bearer $CRON_SECRET` (see .github/workflows/cron.yml;
 * Vercel Cron sends this header automatically when CRON_SECRET is set).
 */
async function handle(request: Request) {
  if (!authorized(request)) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const startedAt = Date.now();
  const results = await runScheduledJobs();

  return NextResponse.json({ ok: true, durationMs: Date.now() - startedAt, results });
}

export const GET = handle;
export const POST = handle;
