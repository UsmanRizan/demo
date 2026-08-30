import { NextResponse } from "next/server";
import { eq, desc } from "drizzle-orm";

import { getCurrentUser } from "@/lib/auth";
import { db } from "@/lib/prisma";
import { withdrawalRequests } from "@/db/schema";

export async function GET() {
  try {
    const currentUser = await getCurrentUser();

    if (!currentUser) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    if (currentUser.role !== "OWNER") {
      return NextResponse.json({ error: "Forbidden" }, { status: 403 });
    }

    const requests = await db
      .select()
      .from(withdrawalRequests)
      .where(eq(withdrawalRequests.ownerId, currentUser.id))
      .orderBy(desc(withdrawalRequests.createdAt));

    return NextResponse.json({
      requests: requests.map((r) => ({
        id: r.id,
        amount: r.amount.toString(),
        bankName: r.bankName,
        accountNumber: r.accountNumber,
        accountHolderName: r.accountHolderName,
        status: r.status,
        adminNote: r.adminNote,
        createdAt: r.createdAt.toISOString(),
        updatedAt: r.updatedAt.toISOString(),
      })),
    });
  } catch (error) {
    console.error("Owner withdrawals fetch error:", error);

    return NextResponse.json(
      { error: "Failed to fetch withdrawal requests." },
      { status: 500 },
    );
  }
}
