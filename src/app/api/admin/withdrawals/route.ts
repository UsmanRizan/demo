import { NextResponse } from "next/server";
import { eq, and, desc } from "drizzle-orm";

import { getCurrentUser } from "@/lib/auth";
import { db } from "@/lib/prisma";
import { withdrawalRequests, users } from "@/db/schema";

export async function GET(request: Request) {
  try {
    const currentUser = await getCurrentUser();

    if (!currentUser || currentUser.role !== "ADMIN") {
      return NextResponse.json({ error: "Unauthorized" }, { status: 403 });
    }

    const { searchParams } = new URL(request.url);
    const status = searchParams.get("status");

    const conditions = [];

    if (status && ["PENDING", "APPROVED", "REJECTED"].includes(status)) {
      conditions.push(
        eq(withdrawalRequests.status, status as "PENDING" | "APPROVED" | "REJECTED"),
      );
    }

    const result = await db
      .select({
        id: withdrawalRequests.id,
        amount: withdrawalRequests.amount,
        bankName: withdrawalRequests.bankName,
        accountNumber: withdrawalRequests.accountNumber,
        accountHolderName: withdrawalRequests.accountHolderName,
        status: withdrawalRequests.status,
        adminNote: withdrawalRequests.adminNote,
        createdAt: withdrawalRequests.createdAt,
        updatedAt: withdrawalRequests.updatedAt,
        ownerId: withdrawalRequests.ownerId,
      })
      .from(withdrawalRequests)
      .where(conditions.length > 0 ? and(...conditions) : undefined)
      .orderBy(desc(withdrawalRequests.createdAt));

    // Enrich with owner data
    const requests = await Promise.all(
      result.map(async (r) => {
        const [owner] = await db
          .select({
            id: users.id,
            phone: users.phone,
            firstName: users.firstName,
            lastName: users.lastName,
            email: users.email,
          })
          .from(users)
          .where(eq(users.id, r.ownerId))
          .limit(1);

        return {
          id: r.id,
          amount: r.amount.toString(),
          bankName: r.bankName,
          accountNumber: r.accountNumber,
          accountHolderName: r.accountHolderName,
          status: r.status,
          adminNote: r.adminNote,
          createdAt: r.createdAt.toISOString(),
          updatedAt: r.updatedAt.toISOString(),
          owner: owner ?? null,
        };
      }),
    );

    return NextResponse.json({ requests });
  } catch (error) {
    console.error("Admin withdrawals fetch error:", error);

    return NextResponse.json(
      { error: "Failed to fetch withdrawal requests." },
      { status: 500 },
    );
  }
}
