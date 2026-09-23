import { NextResponse } from "next/server";

import { getCurrentUser } from "@/lib/auth";
import { maskAccountNumber } from "@/lib/crypto";
import { prisma } from "@/lib/prisma";
import { logError } from "@/lib/monitoring";

export async function GET() {
  try {
    const currentUser = await getCurrentUser();

    if (!currentUser) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    if (currentUser.role !== "OWNER") {
      return NextResponse.json({ error: "Forbidden" }, { status: 403 });
    }

    const requests = await prisma.withdrawalRequest.findMany({
      where: { ownerId: currentUser.id },
      orderBy: { createdAt: "desc" },
    });

    return NextResponse.json({
      requests: requests.map((r) => ({
        id: r.id,
        amount: r.amount.toString(),
        bankName: r.bankName,
        accountNumber: maskAccountNumber(r.accountLast4),
        accountHolderName: r.accountHolderName,
        status: r.status,
        adminNote: r.adminNote,
        createdAt: r.createdAt.toISOString(),
        updatedAt: r.updatedAt.toISOString(),
      })),
    });
  } catch (error) {
    logError("Owner withdrawals fetch error:", error);

    return NextResponse.json(
      { error: "Failed to fetch withdrawal requests." },
      { status: 500 },
    );
  }
}
