import { NextResponse } from "next/server";

import { getCurrentUser } from "@/lib/auth";

/**
 * Owner-initiated withdrawals have been replaced by weekly invoices.
 *
 * Owner earnings are totalled into a WeeklyInvoice for each Sunday -> Saturday
 * period and settled by an admin, so there is nothing for the owner to request.
 * The WithdrawalRequest model and the admin processing route are retained so any
 * requests created before the switch can still be settled.
 */
export async function POST() {
  const currentUser = await getCurrentUser();

  if (!currentUser) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  return NextResponse.json(
    {
      error:
        "Manual withdrawals are no longer available. Your earnings are paid automatically through a weekly invoice, settled every Sunday.",
      invoicesUrl: "/owner/invoices",
    },
    { status: 410 },
  );
}
