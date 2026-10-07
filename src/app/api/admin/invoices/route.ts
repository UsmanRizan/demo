import { NextResponse } from "next/server";

import { getCurrentUser } from "@/lib/auth";
import {
  generateWeeklyInvoices,
  formatPeriod,
  isSunday,
  startOfWeek,
} from "@/lib/invoices";
import { logError } from "@/lib/monitoring";
import { prisma } from "@/lib/prisma";
import { parseJson } from "@/lib/validation";
import { invoicePaySchema } from "@/lib/validation";

export type AdminInvoiceRow = {
  id: string;
  amount: string;
  grossAmount: string;
  bookingCount: number;
  status: "ISSUED" | "PAID" | "VOID";
  bankName: string;
  accountLast4: string | null;
  accountHolder: string;
  periodStart: string;
  periodEnd: string;
  periodLabel: string;
  paidAt: string | null;
  paymentRef: string | null;
  note: string | null;
  owner: {
    id: string;
    phone: string;
    firstName: string | null;
    lastName: string | null;
    hasPayoutProfile: boolean;
  };
};

export async function GET(request: Request) {
  try {
    const currentUser = await getCurrentUser();

    if (!currentUser || currentUser.role !== "ADMIN") {
      return NextResponse.json({ error: "Unauthorized" }, { status: 403 });
    }

    const { searchParams } = new URL(request.url);
    const status = searchParams.get("status");
    const now = new Date();

    const where: Record<string, unknown> = {};

    if (status && ["ISSUED", "PAID", "VOID"].includes(status)) {
      where.status = status;
    }

    const [invoices, counts, ownersWithoutProfile] = await Promise.all([
      prisma.weeklyInvoice.findMany({
        where,
        orderBy: [{ periodStart: "desc" }, { createdAt: "desc" }],
        include: {
          owner: {
            select: {
              id: true,
              phone: true,
              firstName: true,
              lastName: true,
              payoutBankName: true,
              payoutAccountNumber: true,
              payoutAccountHolder: true,
            },
          },
        },
      }),
      prisma.weeklyInvoice.groupBy({
        by: ["status"],
        _count: { _all: true },
      }),
      prisma.user.count({
        where: {
          role: "OWNER",
          deletedAt: null,
          OR: [
            { payoutAccountNumber: null },
            { payoutBankName: null },
            { payoutAccountHolder: null },
          ],
        },
      }),
    ]);

    const countsByStatus: Record<string, number> = {
      ISSUED: 0,
      PAID: 0,
      VOID: 0,
    };

    for (const row of counts) {
      countsByStatus[row.status] = row._count._all;
    }

    const issuedTotal = invoices
      .filter((i) => i.status === "ISSUED")
      .reduce((sum, i) => sum + Number(i.amount), 0);

    return NextResponse.json({
      invoices: invoices.map((invoice) => ({
        id: invoice.id,
        amount: invoice.amount.toString(),
        grossAmount: invoice.grossAmount.toString(),
        bookingCount: invoice.bookingCount,
        status: invoice.status,
        bankName: invoice.bankName,
        accountLast4: invoice.accountLast4,
        accountHolder: invoice.accountHolder,
        periodStart: invoice.periodStart.toISOString(),
        periodEnd: invoice.periodEnd.toISOString(),
        periodLabel: formatPeriod(invoice.periodStart, invoice.periodEnd),
        paidAt: invoice.paidAt?.toISOString() ?? null,
        paymentRef: invoice.paymentRef,
        note: invoice.note,
        owner: {
          id: invoice.owner.id,
          phone: invoice.owner.phone,
          firstName: invoice.owner.firstName,
          lastName: invoice.owner.lastName,
          hasPayoutProfile: !!(
            invoice.owner.payoutBankName &&
            invoice.owner.payoutAccountNumber &&
            invoice.owner.payoutAccountHolder
          ),
        },
      } satisfies AdminInvoiceRow)),
      counts: countsByStatus,
      issuedTotal: issuedTotal.toFixed(2),
      ownersWithoutProfile,
      isSettlementDay: isSunday(now),
      currentWeekStart: startOfWeek(now).toISOString(),
    });
  } catch (error) {
    logError("Admin invoices fetch error:", error);

    return NextResponse.json(
      { error: "Failed to fetch invoices." },
      { status: 500 },
    );
  }
}

/**
 * Generate any outstanding invoices for completed weeks. Normally the cron job
 * does this daily; admins can trigger it too so a missed run is recoverable
 * without waiting.
 */
export async function POST(request: Request) {
  try {
    const currentUser = await getCurrentUser();

    if (!currentUser || currentUser.role !== "ADMIN") {
      return NextResponse.json({ error: "Unauthorized" }, { status: 403 });
    }

    const parsed = await parseJson(request, invoicePaySchema);

    if (parsed.response) {
      return parsed.response;
    }

    const result = await generateWeeklyInvoices();

    return NextResponse.json({
      success: true,
      ...result,
      message:
        result.issued > 0
          ? `Issued ${result.issued} invoice(s) for ${result.periods} period(s).`
          : "No new invoices were due.",
    });
  } catch (error) {
    logError("Generate weekly invoices error:", error);

    return NextResponse.json(
      { error: "Failed to generate invoices." },
      { status: 500 },
    );
  }
}
