import { NextResponse } from "next/server";

import { audit } from "@/lib/audit";
import { getCurrentUser } from "@/lib/auth";
import { hasPayoutProfile } from "@/lib/invoices";
import { logError } from "@/lib/monitoring";
import { prisma } from "@/lib/prisma";
import { payoutProfileSchema, parseJson } from "@/lib/validation";

/** Read the owner's saved payout details (account number stays masked). */
export async function GET() {
  try {
    const currentUser = await getCurrentUser();

    if (!currentUser || currentUser.role !== "OWNER") {
      return NextResponse.json({ error: "Unauthorized" }, { status: 403 });
    }

    const owner = await prisma.user.findUnique({
      where: { id: currentUser.id },
      select: {
        payoutBankName: true,
        payoutAccountNumber: true,
        payoutAccountLast4: true,
        payoutAccountHolder: true,
        payoutUpdatedAt: true,
      },
    });

    if (!owner) {
      return NextResponse.json({ error: "Account not found." }, { status: 404 });
    }

    return NextResponse.json({
      bankName: owner.payoutBankName,
      accountLast4: owner.payoutAccountLast4,
      accountHolderName: owner.payoutAccountHolder,
      updatedAt: owner.payoutUpdatedAt?.toISOString() ?? null,
      complete: hasPayoutProfile({ id: currentUser.id, ...owner }),
    });
  } catch (error) {
    logError("Fetch payout profile error:", error);

    return NextResponse.json(
      { error: "Failed to load payout details." },
      { status: 500 },
    );
  }
}

/** Save the payout details used for weekly invoice payments. */
export async function POST(request: Request) {
  try {
    const currentUser = await getCurrentUser();

    if (!currentUser || currentUser.role !== "OWNER") {
      return NextResponse.json({ error: "Unauthorized" }, { status: 403 });
    }

    const parsed = await parseJson(request, payoutProfileSchema);

    if (parsed.response) {
      return parsed.response;
    }

    const { bankName, accountNumber, accountHolderName } = parsed.data;

    // Strip separators before storing so the masked last4 always matches.
    const digits = accountNumber.replace(/\D/g, "");
    const accountLast4 = digits.slice(-4);

    const { encryptSecret } = await import("@/lib/crypto");

    const updated = await prisma.user.update({
      where: { id: currentUser.id },
      data: {
        payoutBankName: bankName,
        payoutAccountNumber: encryptSecret(digits),
        payoutAccountLast4: accountLast4,
        payoutAccountHolder: accountHolderName,
        payoutUpdatedAt: new Date(),
      },
      select: {
        payoutBankName: true,
        payoutAccountLast4: true,
        payoutAccountHolder: true,
        payoutUpdatedAt: true,
      },
    });

    // The account number is deliberately not logged.
    await audit({
      actorId: currentUser.id,
      action: "payout_profile.update",
      entityType: "User",
      entityId: currentUser.id,
      metadata: { bankName, accountLast4 },
      request,
    });

    return NextResponse.json({
      success: true,
      message: "Payout details saved. Weekly invoices will be paid to this account.",
      bankName: updated.payoutBankName,
      accountLast4: updated.payoutAccountLast4,
      accountHolderName: updated.payoutAccountHolder,
      updatedAt: updated.payoutUpdatedAt?.toISOString() ?? null,
    });
  } catch (error) {
    logError("Save payout profile error:", error);

    return NextResponse.json(
      { error: "Failed to save payout details." },
      { status: 500 },
    );
  }
}
