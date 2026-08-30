import { NextResponse } from "next/server";
import { eq, and } from "drizzle-orm";

import { getCurrentUser } from "@/lib/auth";
import { db } from "@/lib/prisma";
import {
  withdrawalRequests,
  wallets,
  walletTransactions,
} from "@/db/schema";

export async function PATCH(
  request: Request,
  { params }: { params: Promise<{ id: string }> },
) {
  try {
    const currentUser = await getCurrentUser();

    if (!currentUser || currentUser.role !== "ADMIN") {
      return NextResponse.json({ error: "Unauthorized" }, { status: 403 });
    }

    const { id } = await params;
    const body = await request.json();
    const { action, adminNote } = body;

    if (!action || !["approve", "reject"].includes(action)) {
      return NextResponse.json(
        { error: "Action must be 'approve' or 'reject'." },
        { status: 400 },
      );
    }

    const [withdrawalRequest] = await db
      .select()
      .from(withdrawalRequests)
      .where(eq(withdrawalRequests.id, id))
      .limit(1);

    if (!withdrawalRequest) {
      return NextResponse.json(
        { error: "Withdrawal request not found." },
        { status: 404 },
      );
    }

    if (withdrawalRequest.status !== "PENDING") {
      return NextResponse.json(
        { error: "This request has already been processed." },
        { status: 400 },
      );
    }

    if (action === "approve") {
      // Process approval: debit wallet and record transaction
      const [wallet] = await db
        .select()
        .from(wallets)
        .where(eq(wallets.userId, withdrawalRequest.ownerId))
        .limit(1);

      if (!wallet) {
        return NextResponse.json(
          { error: "Owner wallet not found." },
          { status: 400 },
        );
      }

      const amount = Number(withdrawalRequest.amount);
      const walletBalance = Number(wallet.balance);

      if (walletBalance < amount) {
        return NextResponse.json(
          {
            error: `Insufficient wallet balance. Available: Rs. ${walletBalance.toFixed(2)}, Requested: Rs. ${amount.toFixed(2)}`,
          },
          { status: 400 },
        );
      }

      await db.transaction(async (tx) => {
        // Deduct from wallet
        const newBalance = walletBalance - amount;
        await tx
          .update(wallets)
          .set({ balance: String(newBalance) })
          .where(eq(wallets.id, wallet.id));

        // Record withdrawal transaction
        await tx.insert(walletTransactions).values({
          walletId: wallet.id,
          amount: String(amount),
          type: "DEBIT",
          note: `Withdrawal to ${withdrawalRequest.bankName} (${withdrawalRequest.accountNumber}) - ${withdrawalRequest.accountHolderName}`,
        });

        // Update withdrawal request status
        await tx
          .update(withdrawalRequests)
          .set({
            status: "APPROVED",
            adminNote: adminNote || null,
          })
          .where(eq(withdrawalRequests.id, id));
      });

      return NextResponse.json({
        success: true,
        message: "Withdrawal approved and wallet debited.",
      });
    }

    // Reject
    await db
      .update(withdrawalRequests)
      .set({
        status: "REJECTED",
        adminNote: adminNote || null,
      })
      .where(eq(withdrawalRequests.id, id));

    return NextResponse.json({
      success: true,
      message: "Withdrawal request rejected.",
    });
  } catch (error) {
    console.error("Admin withdrawal action error:", error);
    return NextResponse.json(
      { error: "Failed to process withdrawal request." },
      { status: 500 },
    );
  }
}
