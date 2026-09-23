import { sendEmail } from "@/lib/email";
import { formatLkr } from "@/lib/money";
import { logError } from "@/lib/monitoring";
import { prisma } from "@/lib/prisma";
import { sendSms } from "@/lib/textlk";

/**
 * Transactional notifications (SMS via Text.lk, email via Resend when
 * configured). Every attempt is recorded in the Notification table. These
 * functions never throw: a failed notification must not fail the action that
 * triggered it. Call them via `after()` so they don't delay the response.
 *
 * Set NOTIFICATIONS_DRY_RUN=true to record notifications without sending
 * (useful in development and tests, since SMS costs money).
 */

const APP_NAME = "BookMyPlay";

type Message = {
  type: string;
  sms?: string;
  email?: { subject: string; text: string };
  bookingId?: string | null;
};

function isDryRun() {
  return process.env.NOTIFICATIONS_DRY_RUN === "true";
}

function formatSlot(startAt: Date, endAt: Date) {
  const date = new Intl.DateTimeFormat("en-LK", {
    dateStyle: "medium",
    timeZone: "Asia/Colombo",
  }).format(startAt);
  const time = (d: Date) =>
    new Intl.DateTimeFormat("en-LK", {
      timeStyle: "short",
      timeZone: "Asia/Colombo",
    }).format(d);

  return `${date} ${time(startAt)}-${time(endAt)}`;
}

async function deliver(
  channel: "SMS" | "EMAIL",
  userId: string | null,
  recipient: string,
  message: Message,
  send: () => Promise<{ success: boolean; skipped?: boolean; message?: string }>,
) {
  const subject = channel === "EMAIL" ? message.email?.subject ?? null : null;
  const body = channel === "EMAIL" ? message.email?.text ?? "" : message.sms ?? "";

  const record = await prisma.notification.create({
    data: {
      userId,
      channel,
      type: message.type,
      recipient,
      subject,
      body,
      bookingId: message.bookingId ?? null,
    },
  });

  if (isDryRun()) {
    await prisma.notification.update({
      where: { id: record.id },
      data: { status: "SKIPPED", error: "dry run" },
    });
    return;
  }

  try {
    const result = await send();

    await prisma.notification.update({
      where: { id: record.id },
      data: result.success
        ? { status: "SENT", sentAt: new Date() }
        : {
            status: result.skipped ? "SKIPPED" : "FAILED",
            error: result.message ?? "unknown error",
          },
    });
  } catch (error) {
    await prisma.notification.update({
      where: { id: record.id },
      data: {
        status: "FAILED",
        error: error instanceof Error ? error.message : String(error),
      },
    });
  }
}

export async function notifyUser(userId: string, message: Message): Promise<void> {
  try {
    const user = await prisma.user.findUnique({
      where: { id: userId },
      select: { phone: true, email: true, deletedAt: true },
    });

    if (!user || user.deletedAt) {
      return;
    }

    const tasks: Promise<void>[] = [];

    if (message.sms) {
      const sms = message.sms;
      tasks.push(
        deliver("SMS", userId, user.phone, message, () => sendSms(user.phone, sms)),
      );
    }

    if (message.email && user.email) {
      const email = message.email;
      const to = user.email;
      tasks.push(
        deliver("EMAIL", userId, to, message, () =>
          sendEmail({ to, subject: email.subject, text: email.text }),
        ),
      );
    }

    await Promise.all(tasks);
  } catch (error) {
    logError("Notification failed:", error, { userId, type: message.type });
  }
}

export async function notifyAddress(
  recipient: { email: string },
  message: Message & { email: { subject: string; text: string } },
): Promise<void> {
  try {
    await deliver("EMAIL", null, recipient.email, message, () =>
      sendEmail({
        to: recipient.email,
        subject: message.email.subject,
        text: message.email.text,
      }),
    );
  } catch (error) {
    logError("Notification failed:", error, { type: message.type });
  }
}

async function loadBookings(bookingIds: string[]) {
  return prisma.booking.findMany({
    where: { id: { in: bookingIds } },
    orderBy: { startAt: "asc" },
    include: {
      facility: {
        select: {
          name: true,
          location: { select: { name: true, ownerId: true } },
        },
      },
    },
  });
}

export async function notifyBookingConfirmed(bookingIds: string[]): Promise<void> {
  try {
    const bookings = await loadBookings(bookingIds);

    if (bookings.length === 0) {
      return;
    }

    const first = bookings[0];
    const place = `${first.facility.name} @ ${first.facility.location.name}`;
    const total = bookings.reduce((sum, b) => sum + Number(b.totalPrice), 0);
    const when =
      bookings.length === 1
        ? formatSlot(first.startAt, first.endAt)
        : `${bookings.length} weekly sessions from ${formatSlot(first.startAt, first.endAt)}`;
    const appUrl = process.env.APP_URL ?? "";

    await notifyUser(first.playerId, {
      type: "BOOKING_CONFIRMED",
      bookingId: first.id,
      sms: `${APP_NAME}: Booking confirmed - ${place}, ${when}. Paid ${formatLkr(total)}. Ref ${first.orderId ?? first.id}`,
      email: {
        subject: `Booking confirmed: ${place}`,
        text: [
          `Your booking is confirmed.`,
          ``,
          `Where: ${place}`,
          `When: ${when}`,
          `Total paid: ${formatLkr(total)}`,
          `Reference: ${first.orderId ?? first.id}`,
          ``,
          `Receipt: ${appUrl}/player/bookings/${first.id}/receipt`,
        ].join("\n"),
      },
    });

    await notifyUser(first.facility.location.ownerId, {
      type: "OWNER_NEW_BOOKING",
      bookingId: first.id,
      sms: `${APP_NAME}: New booking - ${place}, ${when}.`,
    });
  } catch (error) {
    logError("notifyBookingConfirmed failed:", error, { bookingIds });
  }
}

export async function notifyBookingCancelled(
  bookingId: string,
  cancelledBy: "player" | "owner" | "system",
  refundAmount: number,
  reason?: string | null,
): Promise<void> {
  try {
    const [booking] = await loadBookings([bookingId]);

    if (!booking) {
      return;
    }

    const place = `${booking.facility.name} @ ${booking.facility.location.name}`;
    const when = formatSlot(booking.startAt, booking.endAt);
    const refundText =
      refundAmount > 0 ? ` ${formatLkr(refundAmount)} has been credited to your wallet.` : "";
    const reasonText = reason ? ` Reason: ${reason}.` : "";

    if (cancelledBy !== "player") {
      await notifyUser(booking.playerId, {
        type: "BOOKING_CANCELLED",
        bookingId,
        sms: `${APP_NAME}: Your booking at ${place} on ${when} was cancelled by the venue.${reasonText}${refundText}`,
        email: {
          subject: `Booking cancelled: ${place}`,
          text: `Your booking at ${place} on ${when} was cancelled by the venue.${reasonText}${refundText}`,
        },
      });
    } else if (refundAmount > 0) {
      await notifyUser(booking.playerId, {
        type: "BOOKING_CANCELLED",
        bookingId,
        sms: `${APP_NAME}: Booking at ${place} on ${when} cancelled.${refundText}`,
      });
    }

    if (cancelledBy === "player" && booking.paymentStatus === "REFUNDED") {
      await notifyUser(booking.facility.location.ownerId, {
        type: "OWNER_BOOKING_CANCELLED",
        bookingId,
        sms: `${APP_NAME}: A player cancelled their booking at ${place} on ${when}.`,
      });
    }
  } catch (error) {
    logError("notifyBookingCancelled failed:", error, { bookingId });
  }
}

export async function notifyBookingReminder(bookingId: string): Promise<void> {
  const [booking] = await loadBookings([bookingId]);

  if (!booking) {
    return;
  }

  const place = `${booking.facility.name} @ ${booking.facility.location.name}`;

  await notifyUser(booking.playerId, {
    type: "BOOKING_REMINDER",
    bookingId,
    sms: `${APP_NAME} reminder: ${place}, ${formatSlot(booking.startAt, booking.endAt)}. See you there!`,
  });
}

export async function notifyWithdrawalProcessed(
  ownerId: string,
  amount: number,
  status: "APPROVED" | "REJECTED",
  adminNote?: string | null,
): Promise<void> {
  const note = adminNote ? ` Note: ${adminNote}` : "";

  await notifyUser(ownerId, {
    type: `WITHDRAWAL_${status}`,
    sms:
      status === "APPROVED"
        ? `${APP_NAME}: Your withdrawal of ${formatLkr(amount)} was approved and is being transferred.${note}`
        : `${APP_NAME}: Your withdrawal of ${formatLkr(amount)} was rejected and the amount returned to your wallet.${note}`,
  });
}
