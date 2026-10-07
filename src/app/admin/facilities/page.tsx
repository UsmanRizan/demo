"use client";

import { useEffect, useState } from "react";

import { getSportIcon } from "@/lib/sport-icons";

type OwnerInfo = {
  id: string;
  phone: string;
  firstName: string | null;
  lastName: string | null;
};

type LocationInfo = {
  id: string;
  name: string;
  address: string;
  city: string;
  owner: OwnerInfo;
};

type Facility = {
  id: string;
  name: string;
  description: string | null;
  imageUrl: string | null;
  price: string;
  isActive: boolean;
  approvalStatus: "PENDING" | "APPROVED" | "REJECTED";
  approvedAt: string | null;
  rejectionReason: string | null;
  createdAt: string;
  sports: { id: string; name: string }[];
  location: LocationInfo;
};

type Counts = { PENDING: number; APPROVED: number; REJECTED: number };

const STATUS_TABS = [
  { id: "all", label: "All" },
  { id: "PENDING", label: "Pending" },
  { id: "APPROVED", label: "Approved" },
  { id: "REJECTED", label: "Rejected" },
] as const;

const STATUS_BADGE: Record<Facility["approvalStatus"], string> = {
  PENDING: "bg-amber-100 text-amber-700",
  APPROVED: "bg-emerald-100 text-emerald-700",
  REJECTED: "bg-red-100 text-red-700",
};

function formatDate(date: string) {
  return new Intl.DateTimeFormat("en-LK", {
    dateStyle: "medium",
    timeStyle: "short",
    timeZone: "Asia/Colombo",
  }).format(new Date(date));
}

function ownerName(owner: OwnerInfo) {
  const name = [owner.firstName, owner.lastName].filter(Boolean).join(" ");
  return name || owner.phone;
}

export default function AdminFacilitiesPage() {
  const [facilities, setFacilities] = useState<Facility[]>([]);
  const [counts, setCounts] = useState<Counts>({
    PENDING: 0,
    APPROVED: 0,
    REJECTED: 0,
  });
  const [loading, setLoading] = useState(true);
  const [activeStatus, setActiveStatus] = useState<string>("PENDING");
  const [message, setMessage] = useState("");
  const [successMessage, setSuccessMessage] = useState("");
  const [processingId, setProcessingId] = useState<string | null>(null);
  const [rejectModalId, setRejectModalId] = useState<string | null>(null);
  const [rejectReason, setRejectReason] = useState("");

  async function loadFacilities(status?: string) {
    try {
      const url =
        status && status !== "all"
          ? `/api/admin/facilities?status=${status}`
          : "/api/admin/facilities";

      const response = await fetch(url);
      const data = await response.json();

      if (!response.ok) {
        setMessage(data.error || "Failed to load facilities");
        return;
      }

      setFacilities(data.facilities);
      setCounts(data.counts);
    } catch {
      setMessage("Failed to load facilities");
    } finally {
      setLoading(false);
    }
  }

  async function handleApprove(facility: Facility) {
    setMessage("");
    setSuccessMessage("");
    setProcessingId(facility.id);

    try {
      const response = await fetch(`/api/admin/facilities/${facility.id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ action: "approve" }),
      });

      const data = await response.json();

      if (!response.ok) {
        setMessage(data.error || "Failed to approve facility");
        return;
      }

      setFacilities((prev) => prev.filter((f) => f.id !== facility.id));
      setCounts((c) => ({
        ...c,
        PENDING: Math.max(0, c.PENDING - 1),
        APPROVED: c.APPROVED + 1,
      }));
      setSuccessMessage(data.message);
    } catch {
      setMessage("Failed to approve facility");
    } finally {
      setProcessingId(null);
    }
  }

  async function handleReject() {
    if (!rejectModalId) return;

    const id = rejectModalId;
    const reason = rejectReason.trim();

    if (!reason) {
      setMessage("Please give a reason so the owner knows what to fix.");
      return;
    }

    setMessage("");
    setSuccessMessage("");
    setProcessingId(id);

    try {
      const response = await fetch(`/api/admin/facilities/${id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ action: "reject", reason }),
      });

      const data = await response.json();

      if (!response.ok) {
        setMessage(data.error || "Failed to reject facility");
        return;
      }

      setFacilities((prev) => prev.filter((f) => f.id !== id));
      setCounts((c) => ({
        ...c,
        PENDING: Math.max(0, c.PENDING - 1),
        REJECTED: c.REJECTED + 1,
      }));
      setSuccessMessage(data.message);
      setRejectModalId(null);
      setRejectReason("");
    } catch {
      setMessage("Failed to reject facility");
    } finally {
      setProcessingId(null);
    }
  }

  useEffect(() => {
    // Initial data fetch; state is only set after the request resolves.
    // eslint-disable-next-line react-hooks/set-state-in-effect
    loadFacilities(activeStatus);
  }, [activeStatus]);

  return (
    <main className="min-h-screen bg-slate-50 px-4 py-10 sm:px-6">
      <div className="mx-auto max-w-7xl">
        <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
          <div>
            <h1 className="text-2xl font-bold text-slate-900 sm:text-3xl">
              Facility Approvals
            </h1>
            <p className="mt-1 text-slate-500">
              New courts and facilities stay hidden from players until approved.
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
            <p className="text-sm text-slate-500">Pending review</p>
            <p className="mt-1 text-2xl font-bold text-slate-900">
              {counts.PENDING}
            </p>
          </div>
          <div className="rounded-2xl border border-slate-200 bg-white p-5">
            <p className="text-sm text-slate-500">Approved</p>
            <p className="mt-1 text-2xl font-bold text-slate-900">
              {counts.APPROVED}
            </p>
          </div>
          <div className="rounded-2xl border border-slate-200 bg-white p-5">
            <p className="text-sm text-slate-500">Rejected</p>
            <p className="mt-1 text-2xl font-bold text-slate-900">
              {counts.REJECTED}
            </p>
          </div>
        </div>

        {/* Status filter */}
        <div className="flex gap-2 border-b border-gray-200">
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
              {tab.id === "PENDING" && counts.PENDING > 0 && (
                <span className="ml-1.5 inline-flex h-5 w-5 items-center justify-center rounded-full bg-amber-100 text-[10px] font-bold text-amber-700">
                  {counts.PENDING}
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

        {/* Facilities list */}
        <div className="mt-6 overflow-hidden rounded-2xl border border-slate-200 bg-white">
          {loading ? (
            <div className="p-6 text-center text-sm text-slate-500">
              Loading facilities...
            </div>
          ) : facilities.length === 0 ? (
            <div className="p-8 text-center">
              <h3 className="text-lg font-semibold text-slate-900">
                Nothing to review
              </h3>
              <p className="mt-2 text-sm text-slate-500">
                {activeStatus === "PENDING"
                  ? "Every facility has been reviewed. New submissions will appear here."
                  : `No ${activeStatus.toLowerCase()} facilities.`}
              </p>
            </div>
          ) : (
            <ul className="divide-y divide-slate-100">
              {facilities.map((facility) => (
                <li key={facility.id} className="p-6">
                  <div className="flex flex-col gap-4 lg:flex-row lg:items-start lg:justify-between">
                    <div className="min-w-0 flex-1">
                      <div className="flex flex-wrap items-center gap-2">
                        <h3 className="text-base font-semibold text-slate-900">
                          {facility.name}
                        </h3>

                        <span
                          className={`inline-flex rounded-full px-2.5 py-0.5 text-xs font-medium ${
                            STATUS_BADGE[facility.approvalStatus]
                          }`}
                        >
                          {facility.approvalStatus}
                        </span>

                        {!facility.isActive && (
                          <span className="inline-flex rounded-full bg-slate-100 px-2.5 py-0.5 text-xs font-medium text-slate-600">
                            Deactivated by owner
                          </span>
                        )}
                      </div>

                      <p className="mt-1 text-sm text-slate-500">
                        {facility.sports
                          .map((s) => `${getSportIcon(s.name)} ${s.name}`)
                          .join(", ") || "No sports"}
                      </p>

                      <p className="mt-1 text-sm text-slate-600">
                        {facility.location.name} · {facility.location.address},{" "}
                        {facility.location.city}
                      </p>

                      <p className="mt-1 text-xs text-slate-500">
                        Owner: {ownerName(facility.location.owner)} ·{" "}
                        {facility.location.owner.phone} · added{" "}
                        {formatDate(facility.createdAt)}
                      </p>

                      {facility.description && (
                        <p className="mt-2 text-sm text-slate-700">
                          {facility.description}
                        </p>
                      )}

                      {facility.rejectionReason && (
                        <p className="mt-2 rounded-lg bg-red-50 p-2 text-xs text-red-700">
                          Reason: {facility.rejectionReason}
                        </p>
                      )}
                    </div>

                    <div className="flex shrink-0 items-center gap-3 lg:flex-col lg:items-end">
                      <p className="text-sm font-semibold text-slate-900">
                        Rs. {Number(facility.price).toLocaleString("en-LK")}
                      </p>

                      {facility.approvalStatus === "PENDING" && (
                        <div className="flex gap-2">
                          <button
                            type="button"
                            onClick={() => handleApprove(facility)}
                            disabled={processingId === facility.id}
                            className="rounded-lg bg-emerald-600 px-3 py-1.5 text-xs font-semibold text-white transition hover:bg-emerald-700 disabled:opacity-50"
                          >
                            {processingId === facility.id
                              ? "..."
                              : "Approve"}
                          </button>
                          <button
                            type="button"
                            onClick={() => {
                              setRejectModalId(facility.id);
                              setRejectReason("");
                            }}
                            disabled={processingId === facility.id}
                            className="rounded-lg border border-red-200 bg-white px-3 py-1.5 text-xs font-semibold text-red-600 transition hover:bg-red-50 disabled:opacity-50"
                          >
                            Reject
                          </button>
                        </div>
                      )}
                    </div>
                  </div>
                </li>
              ))}
            </ul>
          )}
        </div>
      </div>

      {/* Reject modal */}
      {rejectModalId && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4">
          <div className="w-full max-w-md rounded-2xl bg-white p-6 shadow-xl">
            <div className="mb-4 flex items-center justify-between">
              <h2 className="text-lg font-semibold text-slate-900">
                Reject facility
              </h2>
              <button
                type="button"
                onClick={() => {
                  setRejectModalId(null);
                  setRejectReason("");
                }}
                className="rounded-lg p-1 text-slate-400 hover:text-slate-600"
              >
                <svg
                  className="h-5 w-5"
                  fill="none"
                  viewBox="0 0 24 24"
                  strokeWidth="2"
                  stroke="currentColor"
                >
                  <path
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    d="M6 18L18 6M6 6l12 12"
                  />
                </svg>
              </button>
            </div>

            <p className="mb-4 text-sm text-slate-500">
              The owner is emailed/SMSed this reason and can fix the facility and
              resubmit it.
            </p>

            <textarea
              value={rejectReason}
              onChange={(e) => setRejectReason(e.target.value)}
              placeholder="e.g. Photos don't show the court clearly, please add a clearer image"
              rows={4}
              className="w-full rounded-xl border border-slate-200 px-4 py-2.5 text-sm outline-none transition focus:border-red-500 focus:ring-2 focus:ring-red-500/20"
            />

            <div className="mt-5 flex gap-3">
              <button
                type="button"
                onClick={() => {
                  setRejectModalId(null);
                  setRejectReason("");
                }}
                className="flex-1 rounded-xl border border-slate-200 px-4 py-2.5 text-sm font-medium text-slate-700 transition hover:bg-slate-50"
              >
                Cancel
              </button>
              <button
                type="button"
                onClick={handleReject}
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
