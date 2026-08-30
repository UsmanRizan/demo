import { NextResponse } from "next/server";
import { eq, desc } from "drizzle-orm";

import { getCurrentUser } from "@/lib/auth";
import { db } from "@/lib/prisma";
import { wallets, walletTransactions } from "@/db/schema";

export async function GET() {
  try {
    const currentUser = await getCurrentUser();

    if (!currentUser) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    if (currentUser.role !== "PLAYER") {
      return NextResponse.json({ error: "Forbidden" }, { status: 403 });
    }

    const [wallet] = await db
      .select()
      .from(wallets)
      .where(eq(wallets.userId, currentUser.id))
      .limit(1);

    if (!wallet) {
      return NextResponse.json({
        balance: "0.00",
        transactions: [],
      });
    }

    const transactions = await db
      .select()
      .from(walletTransactions)
      .where(eq(walletTransactions.walletId, wallet.id))
      .orderBy(desc(walletTransactions.createdAt))
      .limit(20);

    return NextResponse.json({
      balance: wallet.balance.toString(),
      transactions: transactions.map((t) => ({
        id: t.id,
        amount: t.amount.toString(),
        type: t.type,
        bookingId: t.bookingId,
        note: t.note,
        createdAt: t.createdAt.toISOString(),
      })),
    });
  } catch (error) {
    console.error("Wallet fetch error:", error);

    return NextResponse.json(
      { error: "Failed to fetch wallet." },
      { status: 500 },
    );
  }
}
