import { sweepExpiredHolds } from "@/lib/bookings";
import { logError } from "@/lib/monitoring";
import { notifyBookingReminder } from "@/lib/notifications";
import { prisma } from "@/lib/prisma";

/**
 * Periodic maintenance, triggered by /api/cron every few minutes.
 * Each job is idempotent, so overlapping or repeated runs are harmless.
 */

export const REMINDER_HOURS_BEFORE = 3;
// Mark as completed a little after the session ends.
const COMPLETE_AFTER_MINUTES = 30;

export async function completeFinishedBookings(): Promise<number> {
  const cutoff = new Date(Date.now() - COMPLETE_AFTER_MINUTES * 60_000);

  const result = await prisma.booking.updateMany({
    where: { status: "CONFIRMED", paymentStatus: "PAID", endAt: { lte: cutoff } },
    data: { status: "COMPLETED" },
  });

  return result.count;
}

export async function sendBookingReminders(): Promise<number> {
  const now = new Date();
  const horizon = new Date(now.getTime() + REMINDER_HOURS_BEFORE * 3_600_000);

  const due = await prisma.booking.findMany({
    where: {
      status: "CONFIRMED",
      reminderSentAt: null,
      startAt: { gt: now, lte: horizon },
    },
    select: { id: true },
    take: 200,
  });

  let sent = 0;

  for (const { id } of due) {
    // Claim the reminder first so concurrent runs never double-send.
    const claimed = await prisma.booking.updateMany({
      where: { id, reminderSentAt: null },
      data: { reminderSentAt: now },
    });

    if (claimed.count === 0) {
      continue;
    }

    try {
      await notifyBookingReminder(id);
      sent += 1;
    } catch (error) {
      logError("Reminder failed:", error, { bookingId: id });
    }
  }

  return sent;
}

export async function cleanupStaleRecords() {
  const now = new Date();
  const dayAgo = new Date(now.getTime() - 86_400_000);

  const [otps, rateLimits] = await Promise.all([
    prisma.otpCode.deleteMany({ where: { expiresAt: { lt: dayAgo } } }),
    prisma.rateLimit.deleteMany({ where: { resetAt: { lt: now } } }),
  ]);

  return { otps: otps.count, rateLimits: rateLimits.count };
}

export async function runScheduledJobs() {
  const results: Record<string, unknown> = {};

  const jobs: [string, () => Promise<unknown>][] = [
    ["expiredHolds", () => sweepExpiredHolds()],
    ["completed", completeFinishedBookings],
    ["reminders", sendBookingReminders],
    ["cleanup", cleanupStaleRecords],
  ];

  for (const [name, job] of jobs) {
    try {
      results[name] = await job();
    } catch (error) {
      logError(`Scheduled job "${name}" failed:`, error);
      results[name] = { error: error instanceof Error ? error.message : String(error) };
    }
  }

  return results;
}
