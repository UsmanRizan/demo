import { Prisma, type PrismaClient } from "@prisma/client";

import { audit } from "@/lib/audit";
import { decryptSecret, encryptSecret } from "@/lib/crypto";
import { debitWallet, InsufficientFundsError } from "@/lib/ledger";
import { logError } from "@/lib/monitoring";
import { prisma } from "@/lib/prisma";

/**
 * Weekly owner invoicing.
 *
 * Owner earnings accumulate in the wallet from bookings. Rather than the owner
 * requesting a payout, each Sunday -> Saturday period is totalled into a
 * WeeklyInvoice automatically, and an admin settles it from the admin panel.
 *
 * Sri Lanka is UTC+05:30 with no daylight saving, so a week always runs
 * Sunday 00:00:00.000 to Saturday 23:59:59.999 local time.
 */

const MS_PER_DAY = 86_400_000;
/** Offset of Asia/Colombo from UTC, in minutes. */
const COLOMBO_OFFSET_MS = 5.5 * 60 * 60 * 1000;

export class InvoiceError extends Error {
  constructor(message: string, public status = 400) {
    super(message);
  }
}

type Period = { periodStart: Date; periodEnd: Date; label: string };

function colomboParts(date: Date) {
  const shifted = new Date(date.getTime() + COLOMBO_OFFSET_MS);

  return {
    year: shifted.getUTCFullYear(),
    month: shifted.getUTCMonth(),
    day: shifted.getUTCDate(),
    weekday: shifted.getUTCDay(), // 0 = Sunday
  };
}

/** Midnight (Colombo) of the Sunday that starts the week containing `date`. */
export function startOfWeek(date: Date): Date {
  const { year, month, day, weekday } = colomboParts(date);

  // getUTCDay() is 0 for Sunday, which already starts the week.
  return new Date(
    Date.UTC(year, month, day - weekday) - COLOMBO_OFFSET_MS,
  );
}

/** The Sunday -> Saturday period that `date` falls in. */
export function weekContaining(date: Date): Period {
  const periodStart = startOfWeek(date);
  const periodEnd = new Date(periodStart.getTime() + 7 * MS_PER_DAY - 1);

  return {
    periodStart,
    periodEnd,
    label: formatPeriod(periodStart, periodEnd),
  };
}

/** The most recently completed week, i.e. the one an invoice can be issued for. */
export function lastCompletedWeek(now = new Date()): Period {
  const current = startOfWeek(now);

  return {
    periodStart: new Date(current.getTime() - 7 * MS_PER_DAY),
    periodEnd: new Date(current.getTime() - 1),
    label: "",
  };
}

export function formatColomboDate(date: Date): string {
  const { year, month, day } = colomboParts(date);
  const mm = String(month + 1).padStart(2, "0");
  const dd = String(day).padStart(2, "0");

  return `${year}-${mm}-${dd}`;
}

export function formatPeriod(start: Date, end: Date): string {
  const fmt = new Intl.DateTimeFormat("en-GB", {
    day: "2-digit",
    month: "short",
    timeZone: "Asia/Colombo",
  });

  return `${fmt.format(start)} – ${fmt.format(end)}, ${colomboParts(end).year}`;
}

/** True when the given Colombo date string is a Sunday. */
export function isSunday(date: Date): boolean {
  return colomboParts(date).weekday === 0;
}

type OwnerProfile = {
  id: string;
  payoutBankName: string | null;
  payoutAccountNumber: string | null;
  payoutAccountLast4: string | null;
  payoutAccountHolder: string | null;
};

/** True when the owner has a complete payout profile to issue invoices against. */
export function hasPayoutProfile(owner: OwnerProfile): boolean {
  return !!(
    owner.payoutBankName &&
    owner.payoutAccountNumber &&
    owner.payoutAccountHolder
  );
}

function round2(value: Prisma.Decimal | number): Prisma.Decimal {
  return new Prisma.Decimal(
    new Prisma.Decimal(value).toDecimalPlaces(2).toFixed(2),
  );
}

/**
 * Issue invoices for every completed week that has no invoice yet.
 *
 * Only earnings whose BOOKING_EARNING transaction landed inside the period are
 * counted, so weeks never overlap and an amount can never be invoiced twice.
 * Owners without a payout profile are skipped (and reported) rather than issued
 * an invoice nobody can pay.
 *
 * Safe to call repeatedly: (ownerId, periodStart) is unique, so a second run
 * either skips existing weeks or picks up newly completed ones.
 */
export async function generateWeeklyInvoices(
  client: PrismaClient | Prisma.TransactionClient = prisma,
): Promise<{ issued: number; skippedNoPayoutProfile: string[]; periods: number }> {
  const now = new Date();
  const currentWeekStart = startOfWeek(now);

  // Catch up any weeks missed while the job was not running (up to 12 weeks).
  const earliest = new Date(currentWeekStart.getTime() - 12 * 7 * MS_PER_DAY);

  const owners = await client.user.findMany({
    where: { role: "OWNER", deletedAt: null },
    select: {
      id: true,
      payoutBankName: true,
      payoutAccountNumber: true,
      payoutAccountLast4: true,
      payoutAccountHolder: true,
    },
  });

  let issued = 0;
  const skippedNoPayoutProfile: string[] = [];
  const periodsSeen = new Set<number>();

  for (const owner of owners) {
    if (!hasPayoutProfile(owner)) {
      skippedNoPayoutProfile.push(owner.id);
      continue;
    }

    // Earning transactions in the catch-up window, grouped per booking.
    const earnings = await client.walletTransaction.findMany({
      where: {
        wallet: { userId: owner.id },
        category: "BOOKING_EARNING",
        type: "CREDIT",
        bookingId: { not: null },
        createdAt: { gte: earliest, lt: currentWeekStart },
      },
      select: { bookingId: true, amount: true, createdAt: true },
      orderBy: { createdAt: "asc" },
    });

    // A booking can only be earned once, but keying by booking id also keeps a
    // repeated entry from being counted twice.
    const byPeriod = new Map<
      number,
      { bookings: Map<string, Prisma.Decimal> }
    >();

    for (const earning of earnings) {
      const bucket = weekContaining(earning.createdAt).periodStart.getTime();

      const entry = byPeriod.get(bucket) ?? { bookings: new Map() };
      const bookingId = earning.bookingId!;

      entry.bookings.set(
        bookingId,
        (entry.bookings.get(bookingId) ?? new Prisma.Decimal(0)).plus(
          earning.amount,
        ),
      );
      byPeriod.set(bucket, entry);
    }

    for (const [startMs, entry] of byPeriod) {
      periodsSeen.add(startMs);

      const periodStart = new Date(startMs);
      const periodEnd = new Date(startMs + 7 * MS_PER_DAY - 1);

      const lines = [...entry.bookings.entries()].map(([bookingId, value]) => ({
        bookingId,
        amount: round2(value),
      }));
      const amount = round2(
        lines.reduce((sum, line) => sum.plus(line.amount), new Prisma.Decimal(0)),
      );

      if (amount.lte(0)) {
        continue;
      }

      // The unique (ownerId, periodStart) index makes regeneration idempotent:
      // an existing invoice for the week is left untouched.
      const created = await client.weeklyInvoice.upsert({
        where: { ownerId_periodStart: { ownerId: owner.id, periodStart } },
        create: {
          ownerId: owner.id,
          periodStart,
          periodEnd,
          status: "ISSUED",
          bookingCount: lines.length,
          grossAmount: amount,
          amount,
          bankName: owner.payoutBankName!,
          accountNumber: owner.payoutAccountNumber!,
          accountLast4: owner.payoutAccountLast4,
          accountHolder: owner.payoutAccountHolder!,
        },
        update: {},
      });

      if (lines.length > 0) {
        await client.weeklyInvoiceLine.createMany({
          data: lines.map((line) => ({
            invoiceId: created.id,
            bookingId: line.bookingId,
            amount: line.amount,
          })),
          skipDuplicates: true,
        });
      }

      issued += 1;
    }
  }

  return {
    issued,
    skippedNoPayoutProfile,
    periods: periodsSeen.size,
  };
}

/**
 * Settle an invoice: debit the owner's wallet and mark the invoice PAID.
 *
 * The row is locked for update first so two admins paying at once cannot both
 * succeed. The debit is what actually moves the money out of the wallet; if the
 * owner has already spent the balance the payment is refused rather than
 * leaving the invoice marked paid with no money moved.
 */
export async function payInvoice(
  invoiceId: string,
  admin: { id: string; email?: string | null; firstName?: string | null },
  options: { paymentRef?: string | null; note?: string | null; request?: Request } = {},
): Promise<WeeklyInvoicePaid> {
  const paid = await prisma.$transaction(async (tx) => {
    await tx.$queryRaw`SELECT id FROM "WeeklyInvoice" WHERE id = ${invoiceId} FOR UPDATE`;

    const invoice = await tx.weeklyInvoice.findUnique({ where: { id: invoiceId } });

    if (!invoice) {
      throw new InvoiceError("Invoice not found.", 404);
    }

    if (invoice.status === "PAID") {
      throw new InvoiceError("This invoice has already been paid.", 409);
    }

    if (invoice.status === "VOID") {
      throw new InvoiceError("This invoice was voided and cannot be paid.", 409);
    }

    const amount = Number(invoice.amount);

    await debitWallet(tx, {
      userId: invoice.ownerId,
      amount,
      category: "INVOICE_PAYMENT",
      note: `Weekly invoice ${formatColomboDate(invoice.periodStart)} – ${formatColomboDate(invoice.periodEnd)}`,
    });

    const updated = await tx.weeklyInvoice.update({
      where: { id: invoiceId },
      data: {
        status: "PAID",
        paidById: admin.id,
        paidAt: new Date(),
        paymentRef: options.paymentRef || null,
        note: options.note || invoice.note,
      },
    });

    await audit(
      {
        actorId: admin.id,
        action: "invoice.pay",
        entityType: "WeeklyInvoice",
        entityId: invoiceId,
        metadata: {
          ownerId: invoice.ownerId,
          amount,
          periodStart: invoice.periodStart.toISOString(),
          paymentRef: options.paymentRef ?? null,
        },
        request: options.request,
      },
      tx,
    );

    return updated;
  });

  return {
    id: paid.id,
    ownerId: paid.ownerId,
    amount: Number(paid.amount),
    periodStart: paid.periodStart,
    periodEnd: paid.periodEnd,
  };
}

export type WeeklyInvoicePaid = {
  id: string;
  ownerId: string;
  amount: number;
  periodStart: Date;
  periodEnd: Date;
};

/**
 * Settle every issued invoice. Individual failures are collected rather than
 * aborting the batch, so one owner with a spent balance cannot block the rest
 * of the Sunday run.
 */
export async function payAllInvoices(
  admin: { id: string; email?: string | null; firstName?: string | null },
  options: { paymentRef?: string | null; request?: Request } = {},
): Promise<{ paid: number; failed: { id: string; reason: string }[] }> {
  const due = await prisma.weeklyInvoice.findMany({
    where: { status: "ISSUED" },
    select: { id: true },
    orderBy: [{ periodStart: "asc" }, { createdAt: "asc" }],
  });

  let paid = 0;
  const failed: { id: string; reason: string }[] = [];

  for (const invoice of due) {
    try {
      await payInvoice(invoice.id, admin, options);
      paid += 1;
    } catch (error) {
      const reason =
        error instanceof InvoiceError || error instanceof InsufficientFundsError
          ? error.message
          : "Unexpected error";

      failed.push({ id: invoice.id, reason });
      logError("Paying weekly invoice failed:", error, { invoiceId: invoice.id });
    }
  }

  return { paid, failed };
}

/** Decrypt an invoice's account number for display to an admin. */
export function revealInvoiceAccount(invoice: { accountNumber: string }): string {
  return decryptSecret(invoice.accountNumber);
}

/** Encrypt a payout account number for storage. */
export function protectPayoutAccount(accountNumber: string): string {
  return encryptSecret(accountNumber);
}
