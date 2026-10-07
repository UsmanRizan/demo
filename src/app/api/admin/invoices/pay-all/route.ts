import { after, NextResponse } from "next/server";

import { getCurrentUser } from "@/lib/auth";
import { payAllInvoices } from "@/lib/invoices";
import { logError } from "@/lib/monitoring";
import { notifyInvoicePaid } from "@/lib/notifications";
import { prisma } from "@/lib/prisma";
import { invoicePaySchema, parseJson } from "@/lib/validation";

/**
 * Settle every issued invoice in one go — the Sunday payout run.
 *
 * Each invoice settles independently, so an owner with an insufficient balance
 * is reported in `failed` without blocking the rest.
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

    const result = await payAllInvoices(currentUser, {
      paymentRef: parsed.data.paymentRef,
      request,
    });

    // Notify each paid owner about their own amount.
    if (result.paid > 0) {
      const paidInvoices = await prisma.weeklyInvoice.findMany({
        where: {
          paidById: currentUser.id,
          status: "PAID",
          paidAt: { gte: new Date(Date.now() - 5 * 60_000) },
        },
        select: { ownerId: true, amount: true, periodStart: true },
      });

      after(async () => {
        for (const invoice of paidInvoices) {
          await notifyInvoicePaid(
            invoice.ownerId,
            Number(invoice.amount),
            invoice.periodStart.toISOString(),
          );
        }
      });
    }

    return NextResponse.json({
      success: result.failed.length === 0,
      paid: result.paid,
      failed: result.failed,
      message:
        result.failed.length === 0
          ? `Paid ${result.paid} invoice(s).`
          : `Paid ${result.paid} invoice(s); ${result.failed.length} could not be paid.`,
    });
  } catch (error) {
    logError("Pay all invoices error:", error);

    return NextResponse.json(
      { error: "Failed to run the payout batch." },
      { status: 500 },
    );
  }
}
