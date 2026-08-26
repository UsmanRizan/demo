"use client";

import { useEffect, useState } from "react";

type OwnerInfo = {
  id: string;
  phone: string;
  firstName: string | null;
  lastName: string | null;
  email: string | null;
};

type WithdrawalRequest = {
  id: string;
  amount: string;
  bankName: string;
  accountNumber: string;
  accountHolderName: string;
  status: "PENDING" | "APPROVED" | "REJECTED";
  adminNote: string | null;
  createdAt: string;
  updatedAt: string;
  owner: OwnerInfo;
};

function formatCurrency(value: string | number) {
  const num = typeof value === "string" ? Number(value) : value;
  return `Rs. ${num.toLocaleString("en-LK", { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;
}

function formatDate(date: Date) {
  return new Intl.DateTimeFormat("en-LK", {
    dateStyle: "medium",
    timeStyle: "short",
    timeZone: "Asia/Colombo",
  }).format(date);
}

const STATUS_TABS = [
  { id: "all", label: "All" },
  { id: "PENDING", label: "Pending" },
  { id: "APPROVED", label: "Approved" },
  { id: "REJECTED", label: "Rejected" },
] as const;

export default function AdminWithdrawalsPage() {
  const [requests, setRequests] = useState<WithdrawalRequest[]>([]);
  const [loading, setLoading] = useState(true);
  const [activeStatus, setActiveStatus] = useState<string>("all");
  const [message, setMessage] = useState("");
  const [successMessage, setSuccessMessage] = useState("");
  const [processingId, setProcessingId] = useState<string | null>(null);
  const [rejectModalId, setRejectModalId] = useState<string | null>(null);
  const [rejectNote, setRejectNote] = useState("");

  async function loadRequests(status?: string) {
    setLoading(true);
    setMessage("");

    try {
      const url = status && status !== "all"
        ? `/api/admin/withdrawals?status=${status}`
        : "/api/admin/withdrawals";

      const response = await fetch(url);
      const data = await response.json();

      if (!response.ok) {
        setMessage(data.error || "Failed to load withdrawal requests");
        return;
      }

      setRequests(data.requests);
    } catch {
      setMessage("Failed to load withdrawal requests");
    } finally {
      setLoading(false);
    }
  }

  async function handleApprove(id: string) {
    setMessage("");
    setSuccessMessage("");
    setProcessingId(id);

    try {
      const response = await fetch(`/api/admin/withdrawals/${id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ action: "approve" }),
      });

      const data = await response.json();

      if (!response.ok) {
        setMessage(data.error || "Failed to approve withdrawal");
        return;
      }

      setRequests((prev) =>
        prev.map((r) =>
          r.id === id ? { ...r, status: "APPROVED" as const } : r,
        ),
      );
      setSuccessMessage("Withdrawal approved and wallet debited.");
    } catch {
      setMessage("Failed to approve withdrawal");
    } finally {
      setProcessingId(null);
    }
  }

  async function handleReject(id: string) {
    setMessage("");
    setSuccessMessage("");
    setProcessingId(id);

    try {
      const response = await fetch(`/api/admin/withdrawals/${id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ action: "reject", adminNote: rejectNote.trim() || undefined }),
      });

      const data = await response.json();

      if (!response.ok) {
        setMessage(data.error || "Failed to reject withdrawal");
        return;
      }

      setRequests((prev) =>
        prev.map((r) =>
          r.id === id
            ? { ...r, status: "REJECTED" as const, adminNote: rejectNote.trim() || null }
            : r,
        ),
      );
      setSuccessMessage("Withdrawal request rejected.");
      setRejectModalId(null);
      setRejectNote("");
    } catch {
      setMessage("Failed to reject withdrawal");
    } finally {
      setProcessingId(null);
    }
  }

  useEffect(() => {
    loadRequests(activeStatus);
  }, [activeStatus]);

  const pendingCount = requests.filter((r) => r.status === "PENDING").length;

  return (
    <main className="min-h-screen bg-slate-50 px-4 py-10 sm:px-6">
      <div className="mx-auto max-w-7xl">
        <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
          <div>
            <h1 className="text-2xl font-bold text-slate-900 sm:text-3xl">
              Withdrawal Requests
            </h1>
            <p className="mt-1 text-slate-500">
              Review and manage owner withdrawal requests.
            </p>
          </div>

          <a
            href="/admin"
            className="w-full rounded-xl border border-slate-200 bg-white px-4 py-2 text-center text-sm font-medium text-slate-700 transition-all hover:border-slate-300 hover:bg-slate-50 sm:w-auto"
          >
            Back to Dashboard
          </a>
        </div>

        {/* Stats */}
        <div className="mt-6 mb-6 grid gap-4 sm:grid-cols-3">
          <div className="rounded-2xl border border-slate-200 bg-white p-5">
            <div className="flex items-center gap-3">
              <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-amber-50 text-amber-600">
                <svg className="h-5 w-5" fill="none" stroke="currentColor" strokeWidth="1.5" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" d="M12 6v6h4.5m4.5 0a9 9 0 11-18 0 9 9 0 0118 0z" />
                </svg>
              </div>
              <div>
                <p className="text-sm text-slate-500">Pending</p>
                <p className="text-2xl font-bold text-slate-900">
                  {requests.filter((r) => r.status === "PENDING").length}
                </p>
              </div>
            </div>
          </div>

          <div className="rounded-2xl border border-slate-200 bg-white p-5">
            <div className="flex items-center gap-3">
              <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-emerald-50 text-emerald-600">
                <svg className="h-5 w-5" fill="none" stroke="currentColor" strokeWidth="1.5" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" d="M9 12.75L11.25 15 15 9.75M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
                </svg>
              </div>
              <div>
                <p className="text-sm text-slate-500">Approved</p>
                <p className="text-2xl font-bold text-slate-900">
                  {requests.filter((r) => r.status === "APPROVED").length}
                </p>
              </div>
            </div>
          </div>

          <div className="rounded-2xl border border-slate-200 bg-white p-5">
            <div className="flex items-center gap-3">
              <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-red-50 text-red-600">
                <svg className="h-5 w-5" fill="none" stroke="currentColor" strokeWidth="1.5" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" d="M9.75 9.75l4.5 4.5m0-4.5l-4.5 4.5M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
                </svg>
              </div>
              <div>
                <p className="text-sm text-slate-500">Rejected</p>
                <p className="text-2xl font-bold text-slate-900">
                  {requests.filter((r) => r.status === "REJECTED").length}
                </p>
              </div>
            </div>
          </div>
        </div>

        {/* Status filter */}
        <div className="flex gap-2 border-b border-gray-200">
          {STATUS_TABS.map((tab) => (
            <button
              key={tab.id}
              type="button"
              onClick={() => setActiveStatus(tab.id)}
              className={`px-4 py-2 text-sm font-medium transition ${
                activeStatus === tab.id
                  ? "border-b-2 border-black text-black"
                  : "text-gray-500 hover:text-gray-700"
              }`}
            >
              {tab.label}
              {tab.id === "PENDING" && pendingCount > 0 && (
                <span className="ml-1.5 inline-flex h-5 w-5 items-center justify-center rounded-full bg-amber-100 text-[10px] font-bold text-amber-700">
                  {pendingCount}
                </span>
              )}
            </button>
          ))}
        </div>

        {/* Messages */}
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

        {/* Requests table */}
        <div className="mt-6 overflow-hidden rounded-2xl border border-slate-200 bg-white">
          {loading ? (
            <div className="p-6 text-center text-sm text-slate-500">
              Loading withdrawal requests...
            </div>
          ) : requests.length === 0 ? (
            <div className="p-8 text-center">
              <div className="mx-auto flex h-14 w-14 items-center justify-center rounded-2xl bg-slate-50 text-slate-400">
                <svg className="h-7 w-7" fill="none" stroke="currentColor" strokeWidth="1.5" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" d="M2.25 18.75a60.07 60.07 0 0115.797 2.101c.727.198 1.453-.342 1.453-1.096V18.75M3.75 4.5v.75A.75.75 0 013 6h-.75m0 0v-.375c0-.621.504-1.125 1.125-1.125H20.25M2.25 6v9m18-10.5v.75c0 .414.336.75.75.75h.75m-1.5-1.5h.375c.621 0 1.125.504 1.125 1.125v9.75c0 .621-.504 1.125-1.125 1.125h-.375m1.5-1.5H21a.75.75 0 00-.75.75v.75m0 0H3.75m0 0h-.375a1.125 1.125 0 01-1.125-1.125V15m1.5 1.5v-.75A.75.75 0 003 15h-.75M15 10.5a3 3 0 11-6 0 3 3 0 016 0zm3 0h.008v.008H18V10.5zm-12 0h.008v.008H6V10.5z" />
                </svg>
              </div>
              <h3 className="mt-4 text-lg font-semibold text-slate-900">No requests found</h3>
              <p className="mt-2 text-sm text-slate-500">
                {activeStatus === "all"
                  ? "No withdrawal requests have been submitted yet."
                  : `No ${activeStatus.toLowerCase()} withdrawal requests.`}
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
                      Amount
                    </th>
                    <th className="px-4 py-3 text-left text-xs font-semibold text-slate-500 sm:px-6">
                      Bank Details
                    </th>
                    <th className="px-4 py-3 text-left text-xs font-semibold text-slate-500 sm:px-6">
                      Status
                    </th>
                    <th className="px-4 py-3 text-left text-xs font-semibold text-slate-500 sm:px-6">
                      Date
                    </th>
                    <th className="px-4 py-3 text-left text-xs font-semibold text-slate-500 sm:px-6">
                      Actions
                    </th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100">
                  {requests.map((req) => (
                    <tr key={req.id} className="transition-colors hover:bg-slate-50">
                      <td className="px-4 py-4 sm:px-6">
                        <div>
                          <p className="text-sm font-medium text-slate-900">
                            {req.owner.firstName || req.owner.lastName
                              ? `${req.owner.firstName ?? ""} ${req.owner.lastName ?? ""}`.trim()
                              : req.owner.phone}
                          </p>
                          <p className="text-xs text-slate-500">{req.owner.phone}</p>
                        </div>
                      </td>
                      <td className="px-4 py-4 sm:px-6">
                        <p className="text-sm font-semibold text-slate-900">
                          {formatCurrency(req.amount)}
                        </p>
                      </td>
                      <td className="px-4 py-4 sm:px-6">
                        <div>
                          <p className="text-sm text-slate-900">{req.bankName}</p>
                          <p className="text-xs text-slate-500">
                            {req.accountNumber} · {req.accountHolderName}
                          </p>
                        </div>
                      </td>
                      <td className="px-4 py-4 sm:px-6">
                        <span
                          className={`inline-flex rounded-full px-2.5 py-0.5 text-xs font-medium ${
                            req.status === "PENDING"
                              ? "bg-amber-100 text-amber-700"
                              : req.status === "APPROVED"
                                ? "bg-emerald-100 text-emerald-700"
                                : "bg-red-100 text-red-700"
                          }`}
                        >
                          {req.status}
                        </span>
                        {req.adminNote && (
                          <p className="mt-1 text-xs text-slate-500">
                            Note: {req.adminNote}
                          </p>
                        )}
                      </td>
                      <td className="px-4 py-4 text-sm text-slate-500 sm:px-6">
                        {formatDate(new Date(req.createdAt))}
                      </td>
                      <td className="px-4 py-4 sm:px-6">
                        {req.status === "PENDING" && (
                          <div className="flex gap-2">
                            <button
                              type="button"
                              onClick={() => handleApprove(req.id)}
                              disabled={processingId === req.id}
                              className="rounded-lg bg-emerald-600 px-3 py-1.5 text-xs font-semibold text-white transition hover:bg-emerald-700 disabled:opacity-50"
                            >
                              {processingId === req.id ? "..." : "Approve"}
                            </button>
                            <button
                              type="button"
                              onClick={() => {
                                setRejectModalId(req.id);
                                setRejectNote("");
                              }}
                              disabled={processingId === req.id}
                              className="rounded-lg border border-red-200 bg-white px-3 py-1.5 text-xs font-semibold text-red-600 transition hover:bg-red-50 disabled:opacity-50"
                            >
                              Reject
                            </button>
                          </div>
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

      {/* Reject Modal */}
      {rejectModalId && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4">
          <div className="w-full max-w-md rounded-2xl bg-white p-6 shadow-xl">
            <div className="mb-4 flex items-center justify-between">
              <h2 className="text-lg font-semibold text-slate-900">Reject Withdrawal</h2>
              <button
                type="button"
                onClick={() => {
                  setRejectModalId(null);
                  setRejectNote("");
                }}
                className="rounded-lg p-1 text-slate-400 hover:text-slate-600"
              >
                <svg className="h-5 w-5" fill="none" stroke="currentColor" strokeWidth="2" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6l12 12" />
                </svg>
              </button>
            </div>

            <p className="mb-4 text-sm text-slate-500">
              Optionally provide a reason for rejecting this withdrawal request.
            </p>

            <textarea
              value={rejectNote}
              onChange={(e) => setRejectNote(e.target.value)}
              placeholder="Reason for rejection (optional)"
              rows={3}
              className="w-full rounded-xl border border-slate-200 px-4 py-2.5 text-sm outline-none transition focus:border-red-500 focus:ring-2 focus:ring-red-500/20"
            />

            <div className="mt-5 flex gap-3">
              <button
                type="button"
                onClick={() => {
                  setRejectModalId(null);
                  setRejectNote("");
                }}
                className="flex-1 rounded-xl border border-slate-200 px-4 py-2.5 text-sm font-medium text-slate-700 transition hover:bg-slate-50"
              >
                Cancel
              </button>
              <button
                type="button"
                onClick={() => handleReject(rejectModalId)}
                disabled={processingId === rejectModalId}
                className="flex-1 rounded-xl bg-red-600 px-4 py-2.5 text-sm font-semibold text-white transition hover:bg-red-700 disabled:opacity-50"
              >
                {processingId === rejectModalId ? "Rejecting..." : "Reject"}
              </button>
            </div>
          </div>
        </div>
      )}
    </main>
  );
}
