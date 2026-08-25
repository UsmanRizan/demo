"use client";

import { useEffect, useState } from "react";

type BlockedDate = {
  id: string;
  date: string;
  reason: string | null;
};

type BlockedDatesEditorProps = {
  locationId: string;
};

function formatDate(dateStr: string): string {
  // Handle both YYYY-MM-DD and ISO datetime strings
  const d = new Date(dateStr.includes("T") ? dateStr : dateStr + "T00:00:00");
  return d.toLocaleDateString("en-US", {
    weekday: "short",
    year: "numeric",
    month: "short",
    day: "numeric",
  });
}

export default function BlockedDatesEditor({
  locationId,
}: BlockedDatesEditorProps) {
  const [blockedDates, setBlockedDates] = useState<BlockedDate[]>([]);
  const [loading, setLoading] = useState(true);
  const [adding, setAdding] = useState(false);
  const [selectedDate, setSelectedDate] = useState("");
  const [reason, setReason] = useState("");
  const [error, setError] = useState("");
  const [message, setMessage] = useState("");

  useEffect(() => {
    loadBlockedDates();
  }, [locationId]);

  async function loadBlockedDates() {
    try {
      const response = await fetch(
        `/api/owner/locations/${locationId}/blocked-dates`,
      );
      const data = await response.json();

      if (!response.ok) {
        setError(data.error || "Failed to load blocked dates");
        return;
      }

      setBlockedDates(data.blockedDates);
    } catch {
      setError("Failed to load blocked dates");
    } finally {
      setLoading(false);
    }
  }

  async function handleBlockDate() {
    if (!selectedDate) {
      setError("Please select a date.");
      return;
    }

    setError("");
    setMessage("");
    setAdding(true);

    try {
      const response = await fetch(
        `/api/owner/locations/${locationId}/blocked-dates`,
        {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ date: selectedDate, reason: reason || null }),
        },
      );

      const data = await response.json();

      if (!response.ok) {
        setError(data.error || "Failed to block date");
        return;
      }

      setMessage("Date blocked successfully.");
      setSelectedDate("");
      setReason("");
      loadBlockedDates();
    } catch {
      setError("Failed to block date");
    } finally {
      setAdding(false);
    }
  }

  async function handleUnblockDate(blockedDateId: string) {
    setError("");
    setMessage("");

    try {
      const response = await fetch(
        `/api/owner/locations/${locationId}/blocked-dates?id=${blockedDateId}`,
        {
          method: "DELETE",
        },
      );

      const data = await response.json();

      if (!response.ok) {
        setError(data.error || "Failed to unblock date");
        return;
      }

      setMessage("Date unblocked.");
      loadBlockedDates();
    } catch {
      setError("Failed to unblock date");
    }
  }

  if (loading) {
    return (
      <div className="rounded-xl bg-white p-6 shadow-sm">
        Loading blocked dates...
      </div>
    );
  }

  // Minimum date is today
  const today = new Date();
  const minDate = `${today.getFullYear()}-${String(today.getMonth() + 1).padStart(2, "0")}-${String(today.getDate()).padStart(2, "0")}`;

  return (
    <div className="rounded-xl bg-white p-6 shadow-sm">
      <h2 className="text-xl font-semibold">Block Dates</h2>

      <p className="mt-2 text-sm text-gray-600">
        Block specific dates for maintenance or closures. Players won&apos;t be
        able to book on these days.
      </p>

      <div className="mt-4 flex flex-col gap-3 sm:flex-row sm:items-end">
        <div>
          <label className="mb-1 block text-sm font-medium text-gray-700">
            Date
          </label>
          <input
            type="date"
            min={minDate}
            value={selectedDate}
            onChange={(e) => setSelectedDate(e.target.value)}
            className="rounded-lg border border-gray-300 px-3 py-2.5 text-sm"
          />
        </div>

        <div className="flex-1">
          <label className="mb-1 block text-sm font-medium text-gray-700">
            Reason (optional)
          </label>
          <input
            type="text"
            value={reason}
            onChange={(e) => setReason(e.target.value)}
            placeholder="e.g. Maintenance, Holiday"
            className="w-full rounded-lg border border-gray-300 px-3 py-2.5 text-sm"
          />
        </div>

        <button
          type="button"
          onClick={handleBlockDate}
          disabled={adding || !selectedDate}
          className="rounded-lg bg-red-600 px-4 py-2.5 text-sm font-medium text-white disabled:opacity-50"
        >
          {adding ? "Blocking..." : "Block Date"}
        </button>
      </div>

      {error && (
        <p className="mt-3 text-sm text-red-600">{error}</p>
      )}

      {message && (
        <p className="mt-3 text-sm text-green-600">{message}</p>
      )}

      {blockedDates.length > 0 && (
        <div className="mt-6">
          <h3 className="text-sm font-medium text-gray-500">
            Blocked dates ({blockedDates.length})
          </h3>

          <div className="mt-3 space-y-2">
            {blockedDates.map((bd) => (
              <div
                key={bd.id}
                className="flex items-center justify-between rounded-lg border border-red-100 bg-red-50 px-4 py-3"
              >
                <div>
                  <p className="text-sm font-medium text-red-800">
                    🚫 {formatDate(bd.date)}
                  </p>
                  {bd.reason && (
                    <p className="mt-0.5 text-xs text-red-600">{bd.reason}</p>
                  )}
                </div>

                <button
                  type="button"
                  onClick={() => handleUnblockDate(bd.id)}
                  className="rounded-lg border border-gray-300 px-3 py-1.5 text-xs font-medium text-gray-600 hover:bg-white"
                >
                  Unblock
                </button>
              </div>
            ))}
          </div>
        </div>
      )}

      {!loading && blockedDates.length === 0 && (
        <p className="mt-4 text-sm text-gray-400">
          No dates are currently blocked.
        </p>
      )}
    </div>
  );
}
