import { NextResponse } from "next/server";

import { getCurrentUser } from "@/lib/auth";
import { prisma } from "@/lib/prisma";

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

    const withdrawalRequest = await prisma.withdrawalRequest.findUnique({
      where: { id },
    });

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
      const wallet = await prisma.wallet.findUnique({
        where: { userId: withdrawalRequest.ownerId },
      });

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

      await prisma.$transaction(async (tx) => {
        // Deduct from wallet
        await tx.wallet.update({
          where: { id: wallet.id },
          data: {
            balance: {
              decrement: amount,
            },
          },
        });

        // Record withdrawal transaction
        await tx.walletTransaction.create({
          data: {
            walletId: wallet.id,
            amount,
            type: "DEBIT",
            note: `Withdrawal to ${withdrawalRequest.bankName} (${withdrawalRequest.accountNumber}) - ${withdrawalRequest.accountHolderName}`,
          },
        });

        // Update withdrawal request status
        await tx.withdrawalRequest.update({
          where: { id },
          data: {
            status: "APPROVED",
            adminNote: adminNote || null,
          },
        });
      });

      return NextResponse.json({
        success: true,
        message: "Withdrawal approved and wallet debited.",
      });
    }

    // Reject
    await prisma.withdrawalRequest.update({
      where: { id },
      data: {
        status: "REJECTED",
        adminNote: adminNote || null,
      },
    });

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
