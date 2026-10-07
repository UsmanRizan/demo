import { redirect } from "next/navigation";

import PayoutProfileForm from "@/components/owner/PayoutProfileForm";
import Footer from "@/components/Footer";
import { getCurrentUser } from "@/lib/auth";
import { formatPeriod, hasPayoutProfile, startOfWeek } from "@/lib/invoices";
import { prisma } from "@/lib/prisma";

const STATUS_STYLES: Record<string, string> = {
  ISSUED: "bg-amber-100 text-amber-700",
  PAID: "bg-emerald-100 text-emerald-700",
  VOID: "bg-gray-100 text-gray-500",
};

const STATUS_LABELS: Record<string, string> = {
  ISSUED: "Awaiting payout",
  PAID: "Paid",
  VOID: "Void",
};

function formatDate(date: Date) {
  return new Intl.DateTimeFormat("en-LK", {
    dateStyle: "medium",
    timeStyle: "short",
    timeZone: "Asia/Colombo",
  }).format(date);
}

export default async function OwnerInvoicesPage() {
  const user = await getCurrentUser();

  if (!user) {
    redirect("/login");
  }

  if (user.role !== "OWNER") {
    redirect("/");
  }

  const [invoices, owner] = await Promise.all([
    prisma.weeklyInvoice.findMany({
      where: { ownerId: user.id },
      orderBy: [{ periodStart: "desc" }],
      take: 26,
    }),
    prisma.user.findUnique({
      where: { id: user.id },
      select: {
        payoutBankName: true,
        payoutAccountNumber: true,
        payoutAccountLast4: true,
        payoutAccountHolder: true,
        payoutUpdatedAt: true,
      },
    }),
  ]);

  const outstanding = invoices
    .filter((i) => i.status === "ISSUED")
    .reduce((sum, i) => sum + Number(i.amount), 0);

  const lifetimePaid = invoices
    .filter((i) => i.status === "PAID")
    .reduce((sum, i) => sum + Number(i.amount), 0);

  const profileComplete = owner ? hasPayoutProfile({ id: user.id, ...owner }) : false;
  const thisWeekStart = startOfWeek(new Date());

  return (
    <main className="min-h-screen bg-gray-50 px-4 py-10 sm:px-6">
      <div className="mx-auto max-w-5xl">
        <a href="/owner" className="text-sm text-gray-600">
          ← Back to Owner Dashboard
        </a>

        <div className="mt-6 rounded-xl bg-white p-6 shadow-sm sm:p-8">
          <h1 className="text-2xl font-bold sm:text-3xl">Weekly invoices</h1>

          <p className="mt-2 text-gray-600">
            Every Sunday we total your earnings from the previous Sunday to
            Saturday and create an invoice. An admin pays it out on Sunday — you
            don&apos;t need to request anything.
          </p>

          <div className="mt-6 grid gap-4 sm:grid-cols-3">
            <div className="rounded-lg border border-gray-200 p-4">
              <p className="text-xs uppercase text-gray-500">Awaiting payout</p>
              <p className="mt-1 text-xl font-bold">
                Rs. {outstanding.toLocaleString("en-LK", { minimumFractionDigits: 2 })}
              </p>
            </div>
            <div className="rounded-lg border border-gray-200 p-4">
              <p className="text-xs uppercase text-gray-500">Total paid out</p>
              <p className="mt-1 text-xl font-bold">
                Rs. {lifetimePaid.toLocaleString("en-LK", { minimumFractionDigits: 2 })}
              </p>
            </div>
            <div className="rounded-lg border border-gray-200 p-4">
              <p className="text-xs uppercase text-gray-500">Current week started</p>
              <p className="mt-1 text-xl font-bold">
                {new Intl.DateTimeFormat("en-GB", {
                  day: "2-digit",
                  month: "short",
                  timeZone: "Asia/Colombo",
                }).format(thisWeekStart)}
              </p>
            </div>
          </div>

          {!profileComplete && (
            <div className="mt-6 rounded-lg border border-amber-300 bg-amber-50 p-4 text-sm text-amber-900">
              <p className="font-medium">Your payout account isn&apos;t set up.</p>
              <p className="mt-1">
                Add your bank details below. Until then no invoices can be paid
                out to you.
              </p>
            </div>
          )}
        </div>

        <div className="mt-6 rounded-xl bg-white p-6 shadow-sm sm:p-8">
          <PayoutProfileForm />
        </div>

        <div className="mt-6 rounded-xl bg-white p-6 shadow-sm sm:p-8">
          <h2 className="text-lg font-bold uppercase">Invoice history</h2>

          {invoices.length === 0 ? (
            <p className="mt-4 text-gray-600">
              No invoices yet. Your first one is created after the current week
              (ending Saturday) finishes.
            </p>
          ) : (
            <div className="mt-4 overflow-x-auto">
              <table className="w-full">
                <thead className="border-b border-gray-200">
                  <tr>
                    <th className="px-3 py-2 text-left text-xs uppercase text-gray-500">
                      Week
                    </th>
                    <th className="px-3 py-2 text-left text-xs uppercase text-gray-500">
                      Bookings
                    </th>
                    <th className="px-3 py-2 text-right text-xs uppercase text-gray-500">
                      Amount
                    </th>
                    <th className="px-3 py-2 text-left text-xs uppercase text-gray-500">
                      Status
                    </th>
                    <th className="px-3 py-2 text-left text-xs uppercase text-gray-500">
                      Paid on
                    </th>
                  </tr>
                </thead>
                <tbody>
                  {invoices.map((invoice) => (
                    <tr key={invoice.id} className="border-b border-gray-100">
                      <td className="px-3 py-3 text-sm">
                        {formatPeriod(invoice.periodStart, invoice.periodEnd)}
                      </td>
                      <td className="px-3 py-3 text-sm text-gray-600">
                        {invoice.bookingCount}
                      </td>
                      <td className="px-3 py-3 text-right text-sm font-semibold">
                        Rs.{" "}
                        {Number(invoice.amount).toLocaleString("en-LK", {
                          minimumFractionDigits: 2,
                        })}
                      </td>
                      <td className="px-3 py-3">
                        <span
                          className={`inline-flex rounded-full px-2.5 py-0.5 text-xs font-medium ${
                            STATUS_STYLES[invoice.status]
                          }`}
                        >
                          {STATUS_LABELS[invoice.status]}
                        </span>
                        {invoice.status === "ISSUED" && (
                          <p className="mt-1 text-xs text-gray-500">
                            {invoice.accountLast4
                              ? `${invoice.bankName} ····${invoice.accountLast4}`
                              : invoice.bankName}
                          </p>
                        )}
                      </td>
                      <td className="px-3 py-3 text-sm text-gray-600">
                        {invoice.paidAt ? formatDate(invoice.paidAt) : "—"}
                        {invoice.paymentRef && (
                          <p className="text-xs text-gray-400">
                            Ref {invoice.paymentRef}
                          </p>
                        )}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>
      </div>

      <Footer />
    </main>
  );
}
