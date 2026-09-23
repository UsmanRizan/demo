import { after, NextResponse } from "next/server";

import { audit } from "@/lib/audit";
import { getCurrentUser } from "@/lib/auth";
import { decryptSecret } from "@/lib/crypto";
import { creditWallet, debitWallet, InsufficientFundsError } from "@/lib/ledger";
import { logError } from "@/lib/monitoring";
import { notifyWithdrawalProcessed } from "@/lib/notifications";
import { prisma } from "@/lib/prisma";
import { parseJson, withdrawalActionSchema } from "@/lib/validation";

class WithdrawalActionError extends Error {
  constructor(message: string, public status = 400) {
    super(message);
  }
}

type RouteContext = { params: Promise<{ id: string }> };

/**
 * Reveal the full bank account number so the admin can make the transfer.
 * Every reveal is audit-logged.
 */
export async function GET(request: Request, { params }: RouteContext) {
  const currentUser = await getCurrentUser();

  if (!currentUser || currentUser.role !== "ADMIN") {
    return NextResponse.json({ error: "Unauthorized" }, { status: 403 });
  }

  const { id } = await params;

  const withdrawal = await prisma.withdrawalRequest.findUnique({
    where: { id },
    select: { id: true, accountNumber: true },
  });

  if (!withdrawal) {
    return NextResponse.json({ error: "Withdrawal request not found." }, { status: 404 });
  }

  await audit({
    actorId: currentUser.id,
    action: "withdrawal.reveal_account",
    entityType: "WithdrawalRequest",
    entityId: id,
    request,
  });

  return NextResponse.json({ accountNumber: decryptSecret(withdrawal.accountNumber) });
}

export async function PATCH(request: Request, { params }: RouteContext) {
  try {
    const currentUser = await getCurrentUser();

    if (!currentUser || currentUser.role !== "ADMIN") {
      return NextResponse.json({ error: "Unauthorized" }, { status: 403 });
    }

    const { id } = await params;

    const parsed = await parseJson(request, withdrawalActionSchema);

    if (parsed.response) {
      return parsed.response;
    }

    const { action, adminNote } = parsed.data;

    const processed = await prisma.$transaction(async (tx) => {
      await tx.$queryRaw`SELECT id FROM "WithdrawalRequest" WHERE id = ${id} FOR UPDATE`;

      const withdrawal = await tx.withdrawalRequest.findUnique({ where: { id } });

      if (!withdrawal) {
        throw new WithdrawalActionError("Withdrawal request not found.", 404);
      }

      if (withdrawal.status !== "PENDING") {
        throw new WithdrawalActionError("This request has already been processed.");
      }

      const amount = Number(withdrawal.amount);

      if (action === "approve" && !withdrawal.walletDebited) {
        // Legacy request created before holds existed: debit now.
        await debitWallet(tx, {
          userId: withdrawal.ownerId,
          amount,
          category: "WITHDRAWAL",
          withdrawalRequestId: withdrawal.id,
          note: `Withdrawal to ${withdrawal.bankName}`,
        });
      }

      if (action === "reject" && withdrawal.walletDebited) {
        await creditWallet(tx, {
          userId: withdrawal.ownerId,
          amount,
          category: "WITHDRAWAL_REVERSAL",
          withdrawalRequestId: withdrawal.id,
          note: "Withdrawal rejected - amount returned",
        });
      }

      const updated = await tx.withdrawalRequest.update({
        where: { id },
        data: {
          status: action === "approve" ? "APPROVED" : "REJECTED",
          adminNote: adminNote || null,
          walletDebited: action === "approve",
          processedById: currentUser.id,
          processedAt: new Date(),
        },
      });

      await audit(
        {
          actorId: currentUser.id,
          action: `withdrawal.${action}`,
          entityType: "WithdrawalRequest",
          entityId: id,
          metadata: { amount, ownerId: withdrawal.ownerId, adminNote: adminNote ?? null },
          request,
        },
        tx,
      );

      return updated;
    });

    after(() =>
      notifyWithdrawalProcessed(
        processed.ownerId,
        Number(processed.amount),
        processed.status as "APPROVED" | "REJECTED",
        processed.adminNote,
      ),
    );

    return NextResponse.json({
      success: true,
      message:
        action === "approve"
          ? "Withdrawal approved."
          : "Withdrawal request rejected and the amount returned to the owner's wallet.",
    });
  } catch (error) {
    if (error instanceof WithdrawalActionError) {
      return NextResponse.json({ error: error.message }, { status: error.status });
    }

    if (error instanceof InsufficientFundsError) {
      return NextResponse.json(
        { error: `Insufficient wallet balance. Available: Rs. ${error.available.toFixed(2)}` },
        { status: 400 },
      );
    }

    logError("Admin withdrawal action error:", error);

    return NextResponse.json(
      { error: "Failed to process withdrawal request." },
      { status: 500 },
    );
  }
}
