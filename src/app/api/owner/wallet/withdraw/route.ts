import { NextResponse } from "next/server";

import { audit } from "@/lib/audit";
import { getCurrentUser } from "@/lib/auth";
import { encryptSecret, lastFour } from "@/lib/crypto";
import { debitWallet, InsufficientFundsError } from "@/lib/ledger";
import { logError } from "@/lib/monitoring";
import { prisma } from "@/lib/prisma";
import { enforceRateLimits } from "@/lib/rate-limit";
import { parseJson, withdrawalRequestSchema } from "@/lib/validation";

class WithdrawalError extends Error {}

export async function POST(request: Request) {
  try {
    const currentUser = await getCurrentUser();

    if (!currentUser) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    if (currentUser.role !== "OWNER") {
      return NextResponse.json({ error: "Forbidden" }, { status: 403 });
    }

    const limited = await enforceRateLimits([
      { key: `withdraw:user:${currentUser.id}`, limit: 10, windowSeconds: 3600 },
    ]);

    if (limited) {
      return limited;
    }

    const parsed = await parseJson(request, withdrawalRequestSchema);

    if (parsed.response) {
      return parsed.response;
    }

    const { amount, bankName, accountNumber, accountHolderName } = parsed.data;

    // The amount is held (debited) immediately so the owner cannot spend or
    // request it twice while the admin reviews it. Rejection returns it.
    const withdrawalRequest = await prisma.$transaction(async (tx) => {
      // Serialise concurrent requests from the same owner.
      await tx.$queryRaw`SELECT id FROM "Wallet" WHERE "userId" = ${currentUser.id} FOR UPDATE`;

      const pending = await tx.withdrawalRequest.findFirst({
        where: { ownerId: currentUser.id, status: "PENDING" },
        select: { id: true },
      });

      if (pending) {
        throw new WithdrawalError(
          "You already have a pending withdrawal request. Please wait for it to be processed.",
        );
      }

      const created = await tx.withdrawalRequest.create({
        data: {
          ownerId: currentUser.id,
          amount,
          bankName,
          accountNumber: encryptSecret(accountNumber),
          accountLast4: lastFour(accountNumber),
          accountHolderName,
          walletDebited: true,
        },
      });

      const debit = await debitWallet(tx, {
        userId: currentUser.id,
        amount,
        category: "WITHDRAWAL",
        withdrawalRequestId: created.id,
        note: `Withdrawal to ${bankName} (•••• ${lastFour(accountNumber)}) - pending approval`,
      });

      return { ...created, newBalance: Number(debit.balanceAfter ?? 0) };
    });

    await audit({
      actorId: currentUser.id,
      action: "withdrawal.request",
      entityType: "WithdrawalRequest",
      entityId: withdrawalRequest.id,
      metadata: { amount },
      request,
    });

    return NextResponse.json({
      success: true,
      message: `Withdrawal request for Rs. ${amount.toFixed(2)} submitted. The amount is on hold until an admin processes it.`,
      requestId: withdrawalRequest.id,
      newBalance: withdrawalRequest.newBalance.toFixed(2),
    });
  } catch (error) {
    if (error instanceof WithdrawalError) {
      return NextResponse.json({ error: error.message }, { status: 400 });
    }

    if (error instanceof InsufficientFundsError) {
      return NextResponse.json(
        { error: `Insufficient balance. Available: Rs. ${error.available.toFixed(2)}` },
        { status: 400 },
      );
    }

    logError("Withdrawal error:", error);

    return NextResponse.json(
      { error: "Failed to process withdrawal." },
      { status: 500 },
    );
  }
}
