import crypto from "crypto";
import type { Prisma } from "@prisma/client";

import { calculatePlayerPrice } from "@/lib/constants";
import { creditWallet, debitWallet, netForBooking } from "@/lib/ledger";
import { ownerShareFromTotal, roundMoney } from "@/lib/money";
import { calculateDynamicPrice } from "@/lib/pricing";
import { prisma } from "@/lib/prisma";
import { createLocalDateTime } from "@/lib/utils";

type Tx = Prisma.TransactionClient;

export const PAYMENT_HOLD_MINUTES = 10;
export const PLAYER_CANCEL_WINDOW_HOURS = 8;
export const MAX_REPEAT_WEEKS = 12;

export class BookingError extends Error {
  constructor(
    message: string,
    public status = 400,
    public code?: string,
  ) {
    super(message);
    this.name = "BookingError";
  }
}

/**
 * True when an error comes from the Booking_no_overlap exclusion constraint
 * (Postgres SQLSTATE 23P01), however the driver adapter wrapped it.
 */
export function isOverlapViolation(error: unknown): boolean {
  const seen = new Set<unknown>();
  let current: unknown = error;

  while (current && typeof current === "object" && !seen.has(current)) {
    seen.add(current);

    try {
      const text = `${(current as Error).message ?? ""} ${JSON.stringify(current)}`;

      if (text.includes("23P01") || text.includes("Booking_no_overlap")) {
        return true;
      }
    } catch {
      // Circular structures: fall through to cause.
    }

    current = (current as { cause?: unknown }).cause;
  }

  return false;
}

// ---------------------------------------------------------------------------
// Time helpers (all booking times are Asia/Colombo, UTC+05:30, no DST)
// ---------------------------------------------------------------------------

export function timeToMinutes(time: string): number {
  const [hours, minutes] = time.split(":").map(Number);

  return hours * 60 + minutes;
}

export function dayOfWeekForDate(date: string): number {
  const [year, month, day] = date.split("-").map(Number);

  return new Date(Date.UTC(year, month - 1, day)).getUTCDay();
}

export function addDaysToDate(date: string, days: number): string {
  const [year, month, day] = date.split("-").map(Number);
  const d = new Date(Date.UTC(year, month - 1, day + days));

  return d.toISOString().slice(0, 10);
}

/** Instant for a Colombo wall-clock time; "24:00" means the following midnight. */
export function colomboDateTime(date: string, time: string): Date {
  return new Date(
    createLocalDateTime(date, "00:00").getTime() + timeToMinutes(time) * 60_000,
  );
}

// ---------------------------------------------------------------------------
// Quoting
// ---------------------------------------------------------------------------

type FacilityForQuote = Prisma.FacilityGetPayload<{
  include: {
    sports: true;
    location: {
      include: {
        availabilities: true;
        pricingRules: true;
      };
    };
  };
}>;

export type SlotRequest = { date: string; startTime: string; endTime: string };

export type SlotQuote = {
  date: string;
  startAt: Date;
  endAt: Date;
  totalPrice: number;
  ownerAmount: number;
};

/**
 * Validate a slot against opening hours and price it. Pure: does not check
 * conflicts or blocked dates (those need the database).
 */
export function quoteSlot(
  facility: FacilityForQuote,
  slot: SlotRequest,
  now = new Date(),
): SlotQuote {
  const startAt = colomboDateTime(slot.date, slot.startTime);
  const endAt = colomboDateTime(slot.date, slot.endTime);

  if (!Number.isFinite(startAt.getTime()) || !Number.isFinite(endAt.getTime())) {
    throw new BookingError("Invalid booking date or time.");
  }

  if (endAt <= startAt) {
    throw new BookingError("End time must be after start time.");
  }

  if (startAt.getTime() <= now.getTime()) {
    throw new BookingError("You cannot book a time in the past.");
  }

  const dayOfWeek = dayOfWeekForDate(slot.date);

  const availability = facility.location.availabilities.find(
    (item) => item.isActive && item.dayOfWeek === dayOfWeek,
  );

  if (!availability) {
    throw new BookingError("The location is closed on the selected day.");
  }

  if (!availability.isTwentyFourHour) {
    const openingStart = colomboDateTime(slot.date, availability.startTime);
    // "23:59" is used by the UI to mean "until midnight".
    const closing =
      availability.endTime === "23:59" ? "24:00" : availability.endTime;
    const openingEnd = colomboDateTime(slot.date, closing);

    if (startAt < openingStart || endAt > openingEnd) {
      throw new BookingError(
        "The selected time is outside the location opening hours.",
      );
    }
  }

  const durationHours = (endAt.getTime() - startAt.getTime()) / 3_600_000;

  const { adjustedPrice } = calculateDynamicPrice(
    Number(facility.price),
    slot.startTime,
    dayOfWeek,
    facility.location.pricingRules.filter((rule) => rule.isActive),
  );

  const pricePerHour = calculatePlayerPrice(adjustedPrice);

  if (!Number.isFinite(pricePerHour) || pricePerHour <= 0) {
    throw new BookingError("Facility price is invalid.");
  }

  return {
    date: slot.date,
    startAt,
    endAt,
    totalPrice: roundMoney(durationHours * pricePerHour),
    ownerAmount: roundMoney(durationHours * adjustedPrice),
  };
}

/** The weekly dates of a recurring booking, starting with `date`. */
export function weeklySlots(slot: SlotRequest, weeks: number): SlotRequest[] {
  return Array.from({ length: weeks }, (_, i) => ({
    ...slot,
    date: addDaysToDate(slot.date, i * 7),
  }));
}

export function generateOrderId(): string {
  return `BMP-${Date.now()}-${crypto.randomBytes(5).toString("hex").toUpperCase()}`;
}

// ---------------------------------------------------------------------------
// Holds
// ---------------------------------------------------------------------------

/** Cancel unpaid holds whose payment window has passed. */
export async function sweepExpiredHolds(client: Tx | typeof prisma = prisma) {
  const now = new Date();

  const result = await client.booking.updateMany({
    where: {
      status: "PENDING",
      paymentStatus: "PENDING",
      expiresAt: { not: null, lte: now },
    },
    data: {
      status: "CANCELLED",
      paymentStatus: "CANCELLED",
      expiresAt: null,
      cancelledAt: now,
      cancellationReason: "Payment window expired",
    },
  });

  return result.count;
}

export type HoldResult = {
  bookings: { id: string; orderId: string | null; totalPrice: number; startAt: Date }[];
  paymentOrderId: string;
  totalPrice: number;
  expiresAt: Date;
  facility: FacilityForQuote;
  reused: boolean;
};

/**
 * Create temporary PENDING bookings (payment holds) for one slot, or the same
 * slot repeated weekly. A repeated series is paid with one PayHere order: each
 * booking gets its own orderId and shares groupOrderId.
 */
export async function createBookingHolds({
  playerId,
  facilityId,
  slot,
  repeatWeeks = 1,
}: {
  playerId: string;
  facilityId: string;
  slot: SlotRequest;
  repeatWeeks?: number;
}): Promise<HoldResult> {
  if (repeatWeeks < 1 || repeatWeeks > MAX_REPEAT_WEEKS) {
    throw new BookingError(`You can repeat a booking for 1-${MAX_REPEAT_WEEKS} weeks.`);
  }

  await sweepExpiredHolds();

  const facility = await prisma.facility.findFirst({
    where: { id: facilityId, isActive: true, location: { isActive: true } },
    include: {
      sports: true,
      location: {
        include: {
          availabilities: { where: { isActive: true } },
          pricingRules: { where: { isActive: true } },
        },
      },
    },
  });

  if (!facility) {
    throw new BookingError("Facility not found or unavailable.", 404);
  }

  const slots = weeklySlots(slot, repeatWeeks);
  const quotes = slots.map((s) => quoteSlot(facility, s));

  const blocked = await prisma.blockedDate.findMany({
    where: {
      locationId: facility.locationId,
      date: { in: slots.map((s) => createLocalDateTime(s.date, "00:00")) },
    },
    select: { date: true, reason: true },
  });

  if (blocked.length > 0) {
    const reason = blocked[0].reason ? ` (${blocked[0].reason})` : "";
    throw new BookingError(
      `The venue is closed on one of the selected dates${reason}.`,
      409,
      "DATE_BLOCKED",
    );
  }

  const now = new Date();

  // A player retrying checkout for the same single slot reuses their hold.
  if (repeatWeeks === 1) {
    const existing = await prisma.booking.findFirst({
      where: {
        playerId,
        facilityId,
        startAt: quotes[0].startAt,
        endAt: quotes[0].endAt,
        status: "PENDING",
        paymentStatus: "PENDING",
        groupOrderId: null,
        expiresAt: { gt: now },
      },
      orderBy: { createdAt: "desc" },
    });

    if (existing?.orderId && existing.expiresAt) {
      return {
        bookings: [
          {
            id: existing.id,
            orderId: existing.orderId,
            totalPrice: Number(existing.totalPrice),
            startAt: existing.startAt,
          },
        ],
        paymentOrderId: existing.orderId,
        totalPrice: Number(existing.totalPrice),
        expiresAt: existing.expiresAt,
        facility,
        reused: true,
      };
    }
  }

  const paymentOrderId = generateOrderId();
  const expiresAt = new Date(now.getTime() + PAYMENT_HOLD_MINUTES * 60_000);
  const isSeries = quotes.length > 1;

  try {
    const bookings = await prisma.$transaction(async (tx) => {
      const created = [];

      for (const [index, quote] of quotes.entries()) {
        const booking = await tx.booking.create({
          data: {
            playerId,
            facilityId,
            startAt: quote.startAt,
            endAt: quote.endAt,
            totalPrice: quote.totalPrice,
            ownerAmount: quote.ownerAmount,
            status: "PENDING",
            paymentStatus: "PENDING",
            orderId: isSeries ? `${paymentOrderId}-${index + 1}` : paymentOrderId,
            groupOrderId: isSeries ? paymentOrderId : null,
            expiresAt,
          },
          select: { id: true, orderId: true, totalPrice: true, startAt: true },
        });

        created.push({ ...booking, totalPrice: Number(booking.totalPrice) });
      }

      return created;
    });

    return {
      bookings,
      paymentOrderId,
      totalPrice: roundMoney(bookings.reduce((sum, b) => sum + b.totalPrice, 0)),
      expiresAt,
      facility,
      reused: false,
    };
  } catch (error) {
    if (isOverlapViolation(error)) {
      throw new BookingError(
        isSeries
          ? "One of the weekly slots is already booked. Please choose another time."
          : "The selected time is no longer available. Please choose another slot.",
        409,
        "SLOT_UNAVAILABLE",
      );
    }

    throw error;
  }
}

/** Bookings paid together with the given booking (itself, or its whole series). */
export async function findPaymentGroup(tx: Tx, bookingId: string) {
  const booking = await tx.booking.findUnique({
    where: { id: bookingId },
    select: { id: true, groupOrderId: true },
  });

  if (!booking) {
    return [];
  }

  if (!booking.groupOrderId) {
    return tx.booking.findMany({ where: { id: booking.id } });
  }

  return tx.booking.findMany({
    where: { groupOrderId: booking.groupOrderId },
    orderBy: { startAt: "asc" },
  });
}

// ---------------------------------------------------------------------------
// Settlement
// ---------------------------------------------------------------------------

async function ownerIdForBooking(tx: Tx, bookingId: string) {
  const booking = await tx.booking.findUniqueOrThrow({
    where: { id: bookingId },
    select: { facility: { select: { location: { select: { ownerId: true } } } } },
  });

  return booking.facility.location.ownerId;
}

function ownerAmountOf(booking: { ownerAmount: unknown; totalPrice: unknown }) {
  return booking.ownerAmount !== null && booking.ownerAmount !== undefined
    ? Number(booking.ownerAmount)
    : ownerShareFromTotal(Number(booking.totalPrice));
}

/**
 * Credit the owner's share of a paid booking. Idempotent: an earning already
 * recorded for this booking is never credited twice.
 */
export async function creditOwnerEarning(
  tx: Tx,
  booking: { id: string; ownerAmount: unknown; totalPrice: unknown },
) {
  const ownerId = await ownerIdForBooking(tx, booking.id);
  const already = await netForBooking(tx, ownerId, booking.id, ["BOOKING_EARNING"]);

  if (already > 0) {
    return;
  }

  const amount = ownerAmountOf(booking);

  if (amount > 0) {
    await creditWallet(tx, {
      userId: ownerId,
      amount,
      category: "BOOKING_EARNING",
      bookingId: booking.id,
      note: "Booking earning",
    });
  }
}

/**
 * Mark a set of bookings as paid and credit owners. Returns the ids that were
 * newly confirmed (already-paid bookings are skipped, so replays are safe).
 *
 * A booking whose hold expired while the player was paying is revived if its
 * slot is still free; if the slot was taken meanwhile, the player's payment
 * is credited to their wallet instead.
 */
export async function confirmPaidBookings(
  bookingIds: string[],
  payment: { paymentId?: string | null; paymentMethod?: string | null },
): Promise<{ confirmed: string[]; refundedToWallet: string[] }> {
  const confirmed: string[] = [];
  const refundedToWallet: string[] = [];

  for (const id of bookingIds) {
    try {
      await prisma.$transaction(async (tx) => {
        await tx.$queryRaw`SELECT id FROM "Booking" WHERE id = ${id} FOR UPDATE`;

        const booking = await tx.booking.findUniqueOrThrow({ where: { id } });

        if (booking.paymentStatus === "PAID" || booking.paymentStatus === "REFUNDED") {
          return;
        }

        // PENDING holds, or holds that expired/failed before the money arrived.
        if (booking.status !== "PENDING" && booking.status !== "CANCELLED") {
          return;
        }

        await tx.booking.update({
          where: { id },
          data: {
            status: "CONFIRMED",
            paymentStatus: "PAID",
            paymentId: payment.paymentId ?? booking.paymentId,
            paymentMethod: payment.paymentMethod ?? booking.paymentMethod,
            expiresAt: null,
            cancelledAt: null,
            cancelledById: null,
            cancellationReason: null,
          },
        });

        await creditOwnerEarning(tx, booking);
        confirmed.push(id);
      });
    } catch (error) {
      if (!isOverlapViolation(error)) {
        throw error;
      }

      // Slot was re-booked after this hold expired: keep it cancelled and
      // return the money to the player's wallet.
      await prisma.$transaction(async (tx) => {
        const booking = await tx.booking.findUniqueOrThrow({ where: { id } });

        if (booking.paymentStatus === "REFUNDED") {
          return;
        }

        await tx.booking.update({
          where: { id },
          data: {
            status: "CANCELLED",
            paymentStatus: "REFUNDED",
            paymentId: payment.paymentId ?? booking.paymentId,
            paymentMethod: payment.paymentMethod ?? booking.paymentMethod,
            cancellationReason: "Slot was taken after the payment window expired",
          },
        });

        await creditWallet(tx, {
          userId: booking.playerId,
          amount: Number(booking.totalPrice),
          category: "BOOKING_REFUND",
          bookingId: id,
          note: "Late payment for an expired hold",
        });
      });

      refundedToWallet.push(id);
    }
  }

  return { confirmed, refundedToWallet };
}

// ---------------------------------------------------------------------------
// Cancellation
// ---------------------------------------------------------------------------

export type CancelActor =
  | { kind: "player"; userId: string }
  | { kind: "owner"; userId: string }
  | { kind: "admin"; userId: string }
  | { kind: "system"; userId?: null };

export type CancelResult = {
  bookingId: string;
  refundAmount: number;
  walletCredited: boolean;
  cancelledIds: string[];
};

async function cancelOneInTx(
  tx: Tx,
  bookingId: string,
  actor: CancelActor,
  reason: string | null,
) {
  // Row lock serialises concurrent cancels/payments of the same booking.
  await tx.$queryRaw`SELECT id FROM "Booking" WHERE id = ${bookingId} FOR UPDATE`;

  const booking = await tx.booking.findUnique({ where: { id: bookingId } });

  if (!booking || (booking.status !== "PENDING" && booking.status !== "CONFIRMED")) {
    return null;
  }

  const wasPaid = booking.paymentStatus === "PAID";

  await tx.booking.update({
    where: { id: booking.id },
    data: {
      status: "CANCELLED",
      paymentStatus: wasPaid ? "REFUNDED" : "CANCELLED",
      expiresAt: null,
      cancelledAt: new Date(),
      cancelledById: actor.userId ?? null,
      cancellationReason: reason,
    },
  });

  let refundAmount = 0;

  if (wasPaid) {
    refundAmount = Number(booking.totalPrice);

    await creditWallet(tx, {
      userId: booking.playerId,
      amount: refundAmount,
      category: "BOOKING_REFUND",
      bookingId: booking.id,
      note:
        actor.kind === "player"
          ? "Booking cancellation refund"
          : "Booking cancellation refund by venue",
    });

    // Take back whatever the owner earned from this booking.
    const ownerId = await ownerIdForBooking(tx, booking.id);
    const net = await netForBooking(tx, ownerId, booking.id, [
      "BOOKING_EARNING",
      "EARNING_REVERSAL",
    ]);

    if (net > 0) {
      await debitWallet(tx, {
        userId: ownerId,
        amount: net,
        category: "EARNING_REVERSAL",
        bookingId: booking.id,
        note: "Booking cancelled - earning reversed",
        allowNegative: true,
      });
    }
  }

  return { id: booking.id, refundAmount };
}

/**
 * Cancel a booking atomically: status change, player refund and owner earning
 * reversal commit together or not at all. Cancelling an unpaid hold that is
 * part of a weekly series releases the whole series.
 */
export async function cancelBooking({
  bookingId,
  actor,
  reason = null,
}: {
  bookingId: string;
  actor: CancelActor;
  reason?: string | null;
}): Promise<CancelResult> {
  return prisma.$transaction(async (tx) => {
    const target = await tx.booking.findUnique({
      where: { id: bookingId },
      select: { id: true, status: true, paymentStatus: true, groupOrderId: true },
    });

    if (!target) {
      throw new BookingError("Booking not found.", 404);
    }

    if (target.status !== "PENDING" && target.status !== "CONFIRMED") {
      throw new BookingError("This booking cannot be cancelled.");
    }

    const ids =
      target.paymentStatus === "PENDING" && target.groupOrderId
        ? (
            await tx.booking.findMany({
              where: {
                groupOrderId: target.groupOrderId,
                status: "PENDING",
                paymentStatus: "PENDING",
              },
              select: { id: true },
            })
          ).map((b) => b.id)
        : [target.id];

    let refundAmount = 0;
    const cancelledIds: string[] = [];

    for (const id of ids) {
      const result = await cancelOneInTx(tx, id, actor, reason);

      if (result) {
        refundAmount += result.refundAmount;
        cancelledIds.push(result.id);
      }
    }

    if (!cancelledIds.includes(bookingId)) {
      // Lost a race with another cancel/payment.
      throw new BookingError("This booking cannot be cancelled.", 409);
    }

    return {
      bookingId,
      refundAmount: roundMoney(refundAmount),
      walletCredited: refundAmount > 0,
      cancelledIds,
    };
  });
}

/**
 * Active bookings in a time range for a location (optionally one facility),
 * used when a venue closes a date or is deactivated.
 */
export async function findActiveBookings({
  locationId,
  facilityId,
  from,
  to,
}: {
  locationId?: string;
  facilityId?: string;
  from: Date;
  to?: Date;
}) {
  return prisma.booking.findMany({
    where: {
      status: { in: ["PENDING", "CONFIRMED"] },
      ...(facilityId ? { facilityId } : { facility: { locationId } }),
      endAt: { gt: from },
      ...(to ? { startAt: { lt: to } } : {}),
    },
    select: { id: true, startAt: true, paymentStatus: true, status: true },
    orderBy: { startAt: "asc" },
  });
}
