import type { Prisma, WalletTransactionCategory } from "@prisma/client";

import { roundMoney } from "@/lib/money";

/**
 * Every wallet balance change goes through this module so each one is recorded
 * as a categorised ledger entry with the resulting balance. All functions take
 * a transaction client and must be called inside prisma.$transaction.
 */

type Tx = Prisma.TransactionClient;

export class InsufficientFundsError extends Error {
  constructor(public available: number) {
    super("Insufficient wallet balance");
    this.name = "InsufficientFundsError";
  }
}

type LedgerEntry = {
  userId: string;
  amount: number;
  category: WalletTransactionCategory;
  bookingId?: string | null;
  withdrawalRequestId?: string | null;
  note?: string | null;
};

export async function creditWallet(tx: Tx, entry: LedgerEntry) {
  const amount = roundMoney(entry.amount);

  if (!(amount > 0)) {
    throw new Error(`Credit amount must be positive, got ${entry.amount}`);
  }

  const wallet = await tx.wallet.upsert({
    where: { userId: entry.userId },
    create: { userId: entry.userId, balance: amount },
    update: { balance: { increment: amount } },
  });

  return tx.walletTransaction.create({
    data: {
      walletId: wallet.id,
      amount,
      type: "CREDIT",
      category: entry.category,
      balanceAfter: wallet.balance,
      bookingId: entry.bookingId ?? null,
      withdrawalRequestId: entry.withdrawalRequestId ?? null,
      note: entry.note ?? null,
    },
  });
}

/**
 * Debit a wallet. Unless allowNegative is set, the debit is conditional on the
 * balance covering it (checked atomically in the UPDATE), so concurrent debits
 * cannot overdraw the wallet.
 *
 * allowNegative is used for earning reversals: if an owner has already
 * withdrawn the money, their balance goes negative and future earnings pay it
 * back before anything else can be withdrawn.
 */
export async function debitWallet(
  tx: Tx,
  entry: LedgerEntry & { allowNegative?: boolean },
) {
  const amount = roundMoney(entry.amount);

  if (!(amount > 0)) {
    throw new Error(`Debit amount must be positive, got ${entry.amount}`);
  }

  if (entry.allowNegative) {
    await tx.wallet.upsert({
      where: { userId: entry.userId },
      create: { userId: entry.userId, balance: -amount },
      update: { balance: { decrement: amount } },
    });
  } else {
    const result = await tx.wallet.updateMany({
      where: { userId: entry.userId, balance: { gte: amount } },
      data: { balance: { decrement: amount } },
    });

    if (result.count === 0) {
      const existing = await tx.wallet.findUnique({
        where: { userId: entry.userId },
        select: { balance: true },
      });

      throw new InsufficientFundsError(existing ? Number(existing.balance) : 0);
    }
  }

  const wallet = await tx.wallet.findUniqueOrThrow({
    where: { userId: entry.userId },
  });

  return tx.walletTransaction.create({
    data: {
      walletId: wallet.id,
      amount,
      type: "DEBIT",
      category: entry.category,
      balanceAfter: wallet.balance,
      bookingId: entry.bookingId ?? null,
      withdrawalRequestId: entry.withdrawalRequestId ?? null,
      note: entry.note ?? null,
    },
  });
}

/**
 * Net amount of a category (credits minus debits) already recorded against a
 * booking in a user's wallet. Used to make settlement and reversal idempotent.
 */
export async function netForBooking(
  tx: Tx,
  userId: string,
  bookingId: string,
  categories: WalletTransactionCategory[],
): Promise<number> {
  const rows = await tx.walletTransaction.findMany({
    where: {
      bookingId,
      category: { in: categories },
      wallet: { userId },
    },
    select: { amount: true, type: true },
  });

  return roundMoney(
    rows.reduce(
      (sum, row) =>
        sum + (row.type === "CREDIT" ? Number(row.amount) : -Number(row.amount)),
      0,
    ),
  );
}
