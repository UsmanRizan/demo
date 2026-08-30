import { NextResponse } from "next/server";
import { eq, and } from "drizzle-orm";

import { getCurrentUser } from "@/lib/auth";
import { db } from "@/lib/prisma";
import { wallets, withdrawalRequests } from "@/db/schema";

export async function POST(request: Request) {
  try {
    const currentUser = await getCurrentUser();

    if (!currentUser) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    if (currentUser.role !== "OWNER") {
      return NextResponse.json({ error: "Forbidden" }, { status: 403 });
    }

    const body = await request.json();
    const { amount, bankName, accountNumber, accountHolderName } = body;

    // Validate required fields
    if (!amount || typeof amount !== "number" || amount <= 0) {
      return NextResponse.json(
        { error: "A valid withdrawal amount is required." },
        { status: 400 },
      );
    }

    if (!bankName || typeof bankName !== "string" || !bankName.trim()) {
      return NextResponse.json(
        { error: "Bank name is required." },
        { status: 400 },
      );
    }

    if (
      !accountNumber ||
      typeof accountNumber !== "string" ||
      !accountNumber.trim()
    ) {
      return NextResponse.json(
        { error: "Account number is required." },
        { status: 400 },
      );
    }

    if (
      !accountHolderName ||
      typeof accountHolderName !== "string" ||
      !accountHolderName.trim()
    ) {
      return NextResponse.json(
        { error: "Account holder name is required." },
        { status: 400 },
      );
    }

    // Minimum withdrawal amount
    if (amount < 100) {
      return NextResponse.json(
        { error: "Minimum withdrawal amount is Rs. 100.00." },
        { status: 400 },
      );
    }

    // Get wallet
    const [wallet] = await db
      .select()
      .from(wallets)
      .where(eq(wallets.userId, currentUser.id))
      .limit(1);

    if (!wallet) {
      return NextResponse.json(
        { error: "No wallet found. You have no balance to withdraw." },
        { status: 400 },
      );
    }

    const walletBalance = Number(wallet.balance);

    // Check if wallet has enough balance
    if (walletBalance < amount) {
      return NextResponse.json(
        {
          error: `Insufficient balance. Available: Rs. ${walletBalance.toFixed(2)}`,
        },
        { status: 400 },
      );
    }

    // Check for any pending withdrawal requests
    const [pendingRequest] = await db
      .select()
      .from(withdrawalRequests)
      .where(
        and(
          eq(withdrawalRequests.ownerId, currentUser.id),
          eq(withdrawalRequests.status, "PENDING"),
        ),
      )
      .limit(1);

    if (pendingRequest) {
      return NextResponse.json(
        {
          error: "You already have a pending withdrawal request. Please wait for it to be processed.",
        },
        { status: 400 },
      );
    }

    const trimmedBankName = bankName.trim();
    const trimmedAccountNumber = accountNumber.trim();
    const trimmedAccountHolderName = accountHolderName.trim();

    // Create withdrawal request (pending admin approval)
    const [withdrawalRequest] = await db
      .insert(withdrawalRequests)
      .values({
        ownerId: currentUser.id,
        amount: String(amount),
        bankName: trimmedBankName,
        accountNumber: trimmedAccountNumber,
        accountHolderName: trimmedAccountHolderName,
      })
      .returning();

    return NextResponse.json({
      success: true,
      message: `Withdrawal request for Rs. ${amount.toFixed(2)} submitted. It will be processed after admin approval.`,
      requestId: withdrawalRequest.id,
    });
  } catch (error) {
    console.error("Withdrawal error:", error);

    return NextResponse.json(
      { error: "Failed to process withdrawal." },
      { status: 500 },
    );
  }
}
