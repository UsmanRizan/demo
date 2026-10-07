"use client";

import { useEffect, useState } from "react";

type Invoice = {
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

type Counts = { ISSUED: number; PAID: number; VOID: number };

const STATUS_TABS = [
  { id: "all", label: "All" },
  { id: "ISSUED", label: "Awaiting payout" },
  { id: "PAID", label: "Paid" },
] as const;

const STATUS_BADGE: Record<string, string> = {
  ISSUED: "bg-amber-100 text-amber-700",
  PAID: "bg-emerald-100 text-emerald-700",
  VOID: "bg-gray-100 text-gray-500",
};

function currency(value: string | number) {
  const num = typeof value === "string" ? Number(value) : value;
  return `Rs. ${num.toLocaleString("en-LK", { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;
}

function formatDate(value: string | null) {
  if (!value) return "—";
  return new Intl.DateTimeFormat("en-LK", {
    dateStyle: "medium",
    timeStyle: "short",
    timeZone: "Asia/Colombo",
  }).format(new Date(value));
}

function ownerName(owner: Invoice["owner"]) {
  return [owner.firstName, owner.lastName].filter(Boolean).join(" ") || owner.phone;
}

export default function AdminInvoicesPage() {
  const [invoices, setInvoices] = useState<Invoice[]>([]);
  const [counts, setCounts] = useState<Counts>({ ISSUED: 0, PAID: 0, VOID: 0 });
  const [issuedTotal, setIssuedTotal] = useState("0.00");
  const [ownersWithoutProfile, setOwnersWithoutProfile] = useState(0);
  const [isSettlementDay, setIsSettlementDay] = useState(false);
  const [loading, setLoading] = useState(true);
  const [activeStatus, setActiveStatus] = useState<string>("ISSUED");
  const [message, setMessage] = useState("");
  const [successMessage, setSuccessMessage] = useState("");
  const [busyId, setBusyId] = useState<string | null>(null);
  const [payingAll, setPayingAll] = useState(false);
  const [paymentRef, setPaymentRef] = useState("");
  const [revealed, setRevealed] = useState<Record<string, string>>({});

  async function load(status?: string) {
    try {
      const url =
        status && status !== "all"
          ? `/api/admin/invoices?status=${status}`
          : "/api/admin/invoices";

      const response = await fetch(url);
      const data = await response.json();

      if (!response.ok) {
        setMessage(data.error || "Failed to load invoices");
        return;
      }

      setInvoices(data.invoices);
      setCounts(data.counts);
      setIssuedTotal(data.issuedTotal);
      setOwnersWithoutProfile(data.ownersWithoutProfile);
      setIsSettlementDay(data.isSettlementDay);
    } catch {
      setMessage("Failed to load invoices");
    } finally {
      setLoading(false);
    }
  }

  async function generateInvoices() {
    setMessage("");
    setSuccessMessage("");
    setBusyId("generate");

    try {
      const response = await fetch("/api/admin/invoices", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({}),
      });

      const data = await response.json();

      if (!response.ok) {
        setMessage(data.error || "Failed to generate invoices");
        return;
      }

      setSuccessMessage(data.message);
      await load(activeStatus);
    } catch {
      setMessage("Failed to generate invoices");
    } finally {
      setBusyId(null);
    }
  }

  async function revealAccount(invoice: Invoice) {
    setMessage("");

    try {
      const response = await fetch(`/api/admin/invoices/${invoice.id}`);
      const data = await response.json();

      if (!response.ok) {
        setMessage(data.error || "Couldn't reveal account number");
        return;
      }

      setRevealed((prev) => ({ ...prev, [invoice.id]: data.accountNumber }));
    } catch {
      setMessage("Couldn't reveal account number");
    }
  }

  async function payInvoice(invoice: Invoice) {
    setMessage("");
    setSuccessMessage("");
    setBusyId(invoice.id);

    try {
      const response = await fetch(`/api/admin/invoices/${invoice.id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ paymentRef: paymentRef.trim() || undefined }),
      });

      const data = await response.json();

      if (!response.ok) {
        setMessage(data.error || "Failed to pay invoice");
        return;
      }

      setSuccessMessage(`${data.message} (${currency(invoice.amount)})`);
      setInvoices((prev) => prev.filter((i) => i.id !== invoice.id));
      setCounts((c) => ({
        ...c,
        ISSUED: Math.max(0, c.ISSUED - 1),
        PAID: c.PAID + 1,
      }));
    } catch {
      setMessage("Failed to pay invoice");
    } finally {
      setBusyId(null);
    }
  }

  async function payAll() {
    setMessage("");
    setSuccessMessage("");
    setPayingAll(true);

    try {
      const response = await fetch("/api/admin/invoices/pay-all", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ paymentRef: paymentRef.trim() || undefined }),
      });

      const data = await response.json();

      if (!response.ok) {
        setMessage(data.error || "Failed to run the payout batch");
        return;
      }

      const failures = data.failed as { id: string; reason: string }[];

      setSuccessMessage(data.message);

      if (failures.length > 0) {
        setMessage(
          `Could not pay ${failures.length}: ${failures
            .map((f) => f.reason)
            .join("; ")}`,
        );
      }

      await load(activeStatus);
    } catch {
      setMessage("Failed to run the payout batch");
    } finally {
      setPayingAll(false);
    }
  }

  useEffect(() => {
    // Initial data fetch; state is only set after the request resolves.
    // eslint-disable-next-line react-hooks/set-state-in-effect
    load(activeStatus);
  }, [activeStatus]);

  return (
    <main className="min-h-screen bg-slate-50 px-4 py-10 sm:px-6">
      <div className="mx-auto max-w-7xl">
        <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
          <div>
            <h1 className="text-2xl font-bold text-slate-900 sm:text-3xl">
              Weekly Invoices
            </h1>
            <p className="mt-1 text-slate-500">
              One invoice per owner per Sunday&nbsp;→&nbsp;Saturday week, paid out
              on Sunday.
            </p>
          </div>

          <a
            href="/admin"
            className="w-full rounded-xl border border-slate-200 bg-white px-4 py-2 text-center text-sm font-medium text-slate-700 transition-all hover:bg-slate-50 sm:w-auto"
          >
            Back to Dashboard
          </a>
        </div>

        {/* Sunday banner */}
        <div
          className={`mt-6 rounded-2xl border p-4 text-sm ${
            isSettlementDay
              ? "border-emerald-200 bg-emerald-50 text-emerald-900"
              : "border-slate-200 bg-white text-slate-600"
          }`}
        >
          {isSettlementDay
            ? "Today is Sunday — this is the weekly payout day."
            : "Payout day is Sunday. You can still settle invoices early if you need to."}
        </div>

        {/* Stats */}
        <div className="mt-4 grid gap-4 sm:grid-cols-3">
          <div className="rounded-2xl border border-slate-200 bg-white p-5">
            <p className="text-sm text-slate-500">Awaiting payout</p>
            <p className="mt-1 text-2xl font-bold text-slate-900">{counts.ISSUED}</p>
            <p className="text-xs text-slate-500">{currency(issuedTotal)}</p>
          </div>
          <div className="rounded-2xl border border-slate-200 bg-white p-5">
            <p className="text-sm text-slate-500">Paid</p>
            <p className="mt-1 text-2xl font-bold text-slate-900">{counts.PAID}</p>
          </div>
          <div className="rounded-2xl border border-slate-200 bg-white p-5">
            <p className="text-sm text-slate-500">Owners missing bank details</p>
            <p className="mt-1 text-2xl font-bold text-slate-900">
              {ownersWithoutProfile}
            </p>
            <p className="text-xs text-slate-500">Cannot be paid out</p>
          </div>
        </div>

        {/* Batch controls */}
        <div className="mt-4 flex flex-col gap-3 rounded-2xl border border-slate-200 bg-white p-5 sm:flex-row sm:items-end">
          <div className="flex-1">
            <label className="mb-1 block text-sm font-medium text-slate-700">
              Transfer reference (optional)
            </label>
            <input
              value={paymentRef}
              onChange={(e) => setPaymentRef(e.target.value)}
              placeholder="e.g. batch-2026-10-05"
              className="w-full rounded-xl border border-slate-200 px-4 py-2.5 text-sm outline-none focus:border-black"
            />
            <p className="mt-1 text-xs text-slate-500">
              Recorded against every invoice paid in this batch.
            </p>
          </div>

          <button
            type="button"
            onClick={payAll}
            disabled={payingAll || counts.ISSUED === 0}
            className="rounded-xl bg-emerald-600 px-5 py-2.5 text-sm font-semibold text-white transition hover:bg-emerald-700 disabled:opacity-50"
          >
            {payingAll
              ? "Paying..."
              : `Pay all ${counts.ISSUED} invoice(s)`}
          </button>

          <button
            type="button"
            onClick={generateInvoices}
            disabled={busyId === "generate"}
            className="rounded-xl border border-slate-300 bg-white px-5 py-2.5 text-sm font-medium text-slate-700 transition hover:bg-slate-50 disabled:opacity-50"
          >
            {busyId === "generate" ? "Checking..." : "Check for new invoices"}
          </button>
        </div>

        {/* Tabs */}
        <div className="mt-6 flex gap-2 border-b border-gray-200">
          {STATUS_TABS.map((tab) => (
            <button
              key={tab.id}
              type="button"
              onClick={() => {
                if (tab.id === activeStatus) return;
                setLoading(true);
                setMessage("");
                setSuccessMessage("");
                setActiveStatus(tab.id);
              }}
              className={`px-4 py-2 text-sm font-medium transition ${
                tab.id === activeStatus
                  ? "border-b-2 border-black text-black"
                  : "text-gray-500 hover:text-gray-700"
              }`}
            >
              {tab.label}
              {tab.id === "ISSUED" && counts.ISSUED > 0 && (
                <span className="ml-1.5 inline-flex h-5 w-5 items-center justify-center rounded-full bg-amber-100 text-[10px] font-bold text-amber-700">
                  {counts.ISSUED}
                </span>
              )}
            </button>
          ))}
        </div>

        {message && (
          <div className="mt-4 rounded-xl border border-red-200 bg-red-50 p-3 text-sm text-red-700">
            {message}
          </div>
        )}

        {successMessage && (
          <div className="mt-4 rounded-xl border border-emerald-200 bg-emerald-50 p-3 text-sm text-emerald-700">
            {successMessage}
          </div>
        )}

        {/* Invoices */}
        <div className="mt-6 overflow-hidden rounded-2xl border border-slate-200 bg-white">
          {loading ? (
            <div className="p-6 text-center text-sm text-slate-500">
              Loading invoices...
            </div>
          ) : invoices.length === 0 ? (
            <div className="p-8 text-center">
              <h3 className="text-lg font-semibold text-slate-900">
                Nothing here
              </h3>
              <p className="mt-2 text-sm text-slate-500">
                {activeStatus === "ISSUED"
                  ? "No invoices are awaiting payout. Check for new invoices once a week has finished."
                  : "No invoices with that status."}
              </p>
            </div>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full">
                <thead className="border-b border-slate-100 bg-slate-50">
                  <tr>
                    <th className="px-4 py-3 text-left text-xs font-semibold text-slate-500 sm:px-6">
                      Owner
                    </th>
                    <th className="px-4 py-3 text-left text-xs font-semibold text-slate-500 sm:px-6">
                      Week
                    </th>
                    <th className="px-4 py-3 text-left text-xs font-semibold text-slate-500 sm:px-6">
                      Bank details
                    </th>
                    <th className="px-4 py-3 text-right text-xs font-semibold text-slate-500 sm:px-6">
                      Amount
                    </th>
                    <th className="px-4 py-3 text-left text-xs font-semibold text-slate-500 sm:px-6">
                      Status
                    </th>
                    <th className="px-4 py-3 text-left text-xs font-semibold text-slate-500 sm:px-6">
                      Actions
                    </th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100">
                  {invoices.map((invoice) => (
                    <tr key={invoice.id} className="hover:bg-slate-50">
                      <td className="px-4 py-4 sm:px-6">
                        <p className="text-sm font-medium text-slate-900">
                          {ownerName(invoice.owner)}
                        </p>
                        <p className="text-xs text-slate-500">
                          {invoice.owner.phone}
                        </p>
                      </td>
                      <td className="px-4 py-4 text-sm text-slate-700 sm:px-6">
                        {invoice.periodLabel}
                        <p className="text-xs text-slate-500">
                          {invoice.bookingCount} booking
                          {invoice.bookingCount === 1 ? "" : "s"}
                        </p>
                      </td>
                      <td className="px-4 py-4 sm:px-6">
                        <p className="text-sm text-slate-900">{invoice.bankName}</p>
                        <p className="text-xs text-slate-500">
                          {revealed[invoice.id] ??
                            `····${invoice.accountLast4 ?? "????"}`}{" "}
                          · {invoice.accountHolder}
                        </p>
                        {!revealed[invoice.id] && invoice.status === "ISSUED" && (
                          <button
                            type="button"
                            onClick={() => revealAccount(invoice)}
                            className="mt-0.5 text-xs font-medium text-indigo-600 hover:underline"
                          >
                            Show full number
                          </button>
                        )}
                      </td>
                      <td className="px-4 py-4 text-right sm:px-6">
                        <p className="text-sm font-semibold text-slate-900">
                          {currency(invoice.amount)}
                        </p>
                      </td>
                      <td className="px-4 py-4 sm:px-6">
                        <span
                          className={`inline-flex rounded-full px-2.5 py-0.5 text-xs font-medium ${
                            STATUS_BADGE[invoice.status]
                          }`}
                        >
                          {invoice.status === "ISSUED" ? "Awaiting" : invoice.status}
                        </span>
                        {invoice.paidAt && (
                          <p className="mt-1 text-xs text-slate-500">
                            {formatDate(invoice.paidAt)}
                          </p>
                        )}
                        {invoice.paymentRef && (
                          <p className="text-xs text-slate-400">
                            Ref {invoice.paymentRef}
                          </p>
                        )}
                      </td>
                      <td className="px-4 py-4 sm:px-6">
                        {invoice.status === "ISSUED" && (
                          <button
                            type="button"
                            onClick={() => payInvoice(invoice)}
                            disabled={busyId === invoice.id}
                            className="rounded-lg bg-emerald-600 px-3 py-1.5 text-xs font-semibold text-white transition hover:bg-emerald-700 disabled:opacity-50"
                          >
                            {busyId === invoice.id ? "..." : "Mark paid"}
                          </button>
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
    </main>
  );
}
