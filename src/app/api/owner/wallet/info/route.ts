import { NextResponse } from "next/server";

import { getCurrentUser } from "@/lib/auth";
import { prisma } from "@/lib/prisma";

export async function GET() {
  try {
    const currentUser = await getCurrentUser();

    if (!currentUser) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    if (currentUser.role !== "OWNER") {
      return NextResponse.json({ error: "Forbidden" }, { status: 403 });
    }

    const wallet = await prisma.wallet.findUnique({
      where: { userId: currentUser.id },
      include: {
        transactions: {
          orderBy: { createdAt: "desc" },
          take: 50,
        },
      },
    });

    if (!wallet) {
      return NextResponse.json({
        balance: "0.00",
        transactions: [],
      });
    }

    return NextResponse.json({
      balance: wallet.balance.toString(),
      transactions: wallet.transactions.map((t) => ({
        id: t.id,
        amount: t.amount.toString(),
        type: t.type,
        bookingId: t.bookingId,
        note: t.note,
        createdAt: t.createdAt.toISOString(),
      })),
    });
  } catch (error) {
    console.error("Owner wallet fetch error:", error);

    return NextResponse.json(
      { error: "Failed to fetch wallet info." },
      { status: 500 },
    );
  }
}
