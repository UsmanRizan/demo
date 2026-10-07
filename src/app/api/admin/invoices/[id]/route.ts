import { after, NextResponse } from "next/server";

import { audit } from "@/lib/audit";
import { getCurrentUser } from "@/lib/auth";
import { InsufficientFundsError } from "@/lib/ledger";
import {
  InvoiceError,
  payInvoice,
  revealInvoiceAccount,
} from "@/lib/invoices";
import { logError } from "@/lib/monitoring";
import { notifyInvoicePaid } from "@/lib/notifications";
import { prisma } from "@/lib/prisma";
import { invoicePaySchema, parseJson } from "@/lib/validation";

type RouteContext = { params: Promise<{ id: string }> };

/** Reveal the full account number for an invoice so the admin can transfer. */
export async function GET(_request: Request, { params }: RouteContext) {
  try {
    const currentUser = await getCurrentUser();

    if (!currentUser || currentUser.role !== "ADMIN") {
      return NextResponse.json({ error: "Unauthorized" }, { status: 403 });
    }

    const { id } = await params;

    const invoice = await prisma.weeklyInvoice.findUnique({
      where: { id },
      select: { id: true, accountNumber: true, accountLast4: true },
    });

    if (!invoice) {
      return NextResponse.json({ error: "Invoice not found." }, { status: 404 });
    }

    await audit({
      actorId: currentUser.id,
      action: "invoice.reveal_account",
      entityType: "WeeklyInvoice",
      entityId: id,
      request: _request,
    });

    return NextResponse.json({
      accountNumber: revealInvoiceAccount(invoice),
      accountLast4: invoice.accountLast4,
    });
  } catch (error) {
    logError("Invoice reveal error:", error);

    return NextResponse.json(
      { error: "Failed to reveal account number." },
      { status: 500 },
    );
  }
}

/** Settle one invoice. */
export async function PATCH(request: Request, { params }: RouteContext) {
  try {
    const currentUser = await getCurrentUser();

    if (!currentUser || currentUser.role !== "ADMIN") {
      return NextResponse.json({ error: "Unauthorized" }, { status: 403 });
    }

    const { id } = await params;

    const parsed = await parseJson(request, invoicePaySchema);

    if (parsed.response) {
      return parsed.response;
    }

    const paid = await payInvoice(id, currentUser, {
      paymentRef: parsed.data.paymentRef,
      note: parsed.data.note,
      request,
    });

    after(() =>
      notifyInvoicePaid(
        paid.ownerId,
        paid.amount,
        paid.periodStart.toISOString(),
      ),
    );

    return NextResponse.json({
      success: true,
      message: "Invoice paid and the owner's wallet has been debited.",
      invoice: { id: paid.id, amount: paid.amount, status: "PAID" },
    });
  } catch (error) {
    if (error instanceof InvoiceError) {
      return NextResponse.json({ error: error.message }, { status: error.status });
    }

    if (error instanceof InsufficientFundsError) {
      return NextResponse.json(
        {
          error: `Owner's wallet holds only Rs. ${error.available.toFixed(2)}, which is less than this invoice. Ask them to stop spending their balance, or pay a lower amount manually.`,
        },
        { status: 400 },
      );
    }

    logError("Pay invoice error:", error);

    return NextResponse.json(
      { error: "Failed to pay invoice." },
      { status: 500 },
    );
  }
}
