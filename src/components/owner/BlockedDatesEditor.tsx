"use client";

import { useEffect, useState } from "react";

import { requestWithClosureConfirm } from "@/lib/client/closure-request";
import { getSportIcon } from "@/lib/sport-icons";

type Facility = {
  id: string;
  name: string;
  imageUrl: string | null;
  sports: { id: string; name: string }[];
};

type BlockedDate = {
  id: string;
  facilityId: string;
  date: string;
  reason: string | null;
  facility: { id: string; name: string; imageUrl: string | null };
};

type BlockedDatesEditorProps = {
  locationId: string;
  facilities: Facility[];
};

function formatDate(dateStr: string): string {
  const d = new Date(`${dateStr}T00:00:00`);

  return d.toLocaleDateString("en-US", {
    weekday: "short",
    year: "numeric",
    month: "short",
    day: "numeric",
  });
}

/** Group rows so one entry per date lists the courts that are blocked. */
function groupByDate(rows: BlockedDate[]) {
  const byDate = new Map<string, BlockedDate[]>();

  for (const row of rows) {
    const list = byDate.get(row.date) ?? [];
    list.push(row);
    byDate.set(row.date, list);
  }

  return [...byDate.entries()].sort((a, b) => a[0].localeCompare(b[0]));
}

export default function BlockedDatesEditor({
  locationId,
  facilities,
}: BlockedDatesEditorProps) {
  const [blockedDates, setBlockedDates] = useState<BlockedDate[]>([]);
  const [loading, setLoading] = useState(true);
  const [busy, setBusy] = useState(false);
  const [fromDate, setFromDate] = useState("");
  const [toDate, setToDate] = useState("");
  const [selected, setSelected] = useState<string[]>([]);
  const [reason, setReason] = useState("");
  const [error, setError] = useState("");
  const [message, setMessage] = useState("");

  const today = new Intl.DateTimeFormat("en-CA", {
    timeZone: "Asia/Colombo",
  }).format(new Date());

  async function loadBlockedDates() {
    try {
      const response = await fetch(
        `/api/owner/locations/${locationId}/blocked-dates`,
      );
      const data = await response.json();

      if (response.ok) {
        setBlockedDates(data.blockedDates);
      } else {
        setError(data.error || "Failed to load blocked dates");
      }
    } catch {
      setError("Failed to load blocked dates");
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    // Initial data fetch; state is only set after the request resolves.
    // eslint-disable-next-line react-hooks/set-state-in-effect
    loadBlockedDates();
  }, [locationId]);

  function toggleFacility(id: string) {
    setError("");
    setMessage("");
    setSelected((prev) =>
      prev.includes(id) ? prev.filter((f) => f !== id) : [...prev, id],
    );
  }

  function allSelected() {
    return facilities.length > 0 && selected.length === facilities.length;
  }

  function toggleAll() {
    setError("");
    setMessage("");
    setSelected(allSelected() ? [] : facilities.map((f) => f.id));
  }

  const dayCount = (() => {
    if (!fromDate) return 0;
    if (!toDate) return 1;

    const start = new Date(`${fromDate}T00:00:00`).getTime();
    const end = new Date(`${toDate}T00:00:00`).getTime();

    if (end < start) return 0;

    return Math.round((end - start) / 86_400_000) + 1;
  })();

  const rangeInvalid = Boolean(fromDate && toDate && toDate < fromDate);

  async function handleSubmit(event: React.FormEvent) {
    event.preventDefault();
    setError("");
    setMessage("");

    if (!fromDate) {
      setError("Pick at least one date.");
      return;
    }

    if (rangeInvalid) {
      setError("The end date cannot be before the start date.");
      return;
    }

    if (selected.length === 0) {
      setError("Choose which facilities should be unavailable.");
      return;
    }

    setBusy(true);

    const body: Record<string, unknown> = {
      from: fromDate,
      facilityIds: selected,
      reason: reason.trim() || null,
    };

    // Only send `to` when a range is actually chosen.
    if (toDate && toDate !== fromDate) {
      body.to = toDate;
    }

    const result = await requestWithClosureConfirm(
      `/api/owner/locations/${locationId}/blocked-dates`,
      "POST",
      body,
    );

    if (!result.ok) {
      setError(
        result.aborted
          ? "Cancelled. No dates were blocked."
          : String(result.data.error ?? "Failed to block dates"),
      );
      setBusy(false);
      return;
    }

    const data = result.data;
    const days = (data.dates as number) ?? 1;
    const courts = (data.facilities as unknown[])?.length ?? selected.length;

    setMessage(
      `Blocked ${courts} ${courts === 1 ? "facility" : "facilities"} across ${days} ${days === 1 ? "day" : "days"}.` +
        ((data.cancelledBookings as number) > 0
          ? ` ${data.cancelledBookings} booking(s) cancelled and refunded.`
          : ""),
    );

    setFromDate("");
    setToDate("");
    setSelected([]);
    setReason("");
    setBusy(false);

    await loadBlockedDates();
  }

  async function unblock(id: string) {
    setError("");
    setMessage("");

    const response = await fetch(
      `/api/owner/locations/${locationId}/blocked-dates?id=${id}`,
      { method: "DELETE" },
    );

    if (response.ok) {
      setMessage("Date unblocked.");
      await loadBlockedDates();
    } else {
      const data = await response.json();
      setError(data.error || "Failed to unblock date");
    }
  }

  const grouped = groupByDate(blockedDates);

  return (
    <div>
      <h2 className="text-lg font-bold uppercase">Block Dates</h2>

      <p className="mt-1 text-gray-600">
        Block specific courts for maintenance or closures. Players won&apos;t be
        able to book them on those days.
      </p>

      <form onSubmit={handleSubmit} className="mt-5 rounded-lg border border-gray-200 p-4">
        <p className="text-xs font-bold uppercase tracking-wide text-gray-500">
          1. Which dates?
        </p>

        <div className="mt-2 grid gap-3 sm:grid-cols-2">
          <div>
            <label className="mb-1 block text-sm font-medium">
              From <span className="text-red-500">*</span>
            </label>
            <input
              type="date"
              value={fromDate}
              min={today}
              onChange={(e) => {
                setFromDate(e.target.value);
                setError("");
              }}
              required
              className="w-full rounded-lg border border-gray-300 px-4 py-2.5 outline-none focus:border-black"
            />
          </div>

          <div>
            <label className="mb-1 block text-sm font-medium">To (optional)</label>
            <input
              type="date"
              value={toDate}
              min={fromDate || today}
              onChange={(e) => {
                setToDate(e.target.value);
                setError("");
              }}
              className="w-full rounded-lg border border-gray-300 px-4 py-2.5 outline-none focus:border-black"
            />
            <p className="mt-1 text-xs text-gray-500">
              Leave empty for a single day.
            </p>
          </div>
        </div>

        {rangeInvalid && (
          <p className="mt-2 text-xs text-red-600">
            The end date is before the start date.
          </p>
        )}

        <p className="mt-5 text-xs font-bold uppercase tracking-wide text-gray-500">
          2. Which facilities should be blocked?
        </p>

        {facilities.length === 0 ? (
          <p className="mt-2 rounded-lg bg-yellow-50 p-3 text-sm text-yellow-800">
            Add a facility to this venue first.
          </p>
        ) : (
          <>
            <div className="mt-2 flex gap-2">
              <button
                type="button"
                onClick={toggleAll}
                className="text-xs font-medium text-gray-600 underline hover:text-black"
              >
                {allSelected() ? "Clear all" : "Select all"}
              </button>
            </div>

            <div className="mt-2 grid gap-2 sm:grid-cols-2">
              {facilities.map((facility) => {
                const on = selected.includes(facility.id);

                return (
                  <button
                    key={facility.id}
                    type="button"
                    onClick={() => toggleFacility(facility.id)}
                    aria-pressed={on}
                    className={`flex items-center gap-3 rounded-lg border px-3 py-2.5 text-left text-sm font-medium transition ${
                      on
                        ? "border-black bg-black text-white"
                        : "border-gray-300 bg-white text-gray-700 hover:border-gray-400"
                    }`}
                  >
                    <span className="flex-1 truncate">{facility.name}</span>
                    <span
                      className={`shrink-0 text-xs ${on ? "opacity-80" : "text-gray-400"}`}
                    >
                      {facility.sports
                        .slice(0, 2)
                        .map((s) => getSportIcon(s.name))
                        .join("")}
                    </span>
                  </button>
                );
              })}
            </div>
          </>
        )}

        <div className="mt-4">
          <label className="mb-1 block text-sm font-medium">Reason (optional)</label>
          <input
            value={reason}
            onChange={(e) => setReason(e.target.value)}
            placeholder="e.g. Resurfacing, Holiday"
            className="w-full rounded-lg border border-gray-300 px-4 py-2.5 outline-none focus:border-black"
          />
        </div>

        {error && (
          <div className="mt-4 rounded-lg bg-red-50 p-3 text-sm text-red-700">
            {error}
          </div>
        )}

        {message && (
          <div className="mt-4 rounded-lg bg-emerald-50 p-3 text-sm text-emerald-800">
            {message}
          </div>
        )}

        <div className="mt-4 flex items-center gap-3">
          <button
            type="submit"
            disabled={busy || facilities.length === 0 || rangeInvalid}
            className="rounded-lg bg-black px-5 py-3 font-medium text-white disabled:opacity-50"
          >
            {busy ? "Blocking..." : "Block Dates"}
          </button>

          {dayCount > 0 && selected.length > 0 && (
            <p className="text-xs text-gray-500">
              {selected.length} {selected.length === 1 ? "facility" : "facilities"} ·{" "}
              {dayCount} {dayCount === 1 ? "day" : "days"}
            </p>
          )}
        </div>
      </form>

      {loading ? (
        <p className="mt-6 text-sm text-gray-500">Loading blocked dates...</p>
      ) : grouped.length > 0 ? (
        <div className="mt-6">
          <p className="text-xs font-bold uppercase tracking-wide text-gray-500">
            Blocked ({blockedDates.length})
          </p>

          <ul className="mt-2 space-y-2">
            {grouped.map(([date, rows]) => (
              <li
                key={date}
                className="rounded-lg border border-gray-200 p-3 text-sm"
              >
                <div className="flex flex-wrap items-center justify-between gap-2">
                  <span className="font-medium">{formatDate(date)}</span>
                  <span className="text-xs text-gray-500">
                    {rows.length === facilities.length && facilities.length > 0
                      ? "All facilities"
                      : `${rows.length} of ${facilities.length}`}
                  </span>
                </div>

                <p className="mt-1 text-xs text-gray-600">
                  {rows.map((r) => r.facility.name).join(", ")}
                </p>

                {rows[0].reason && (
                  <p className="mt-1 text-xs text-gray-500">{rows[0].reason}</p>
                )}

                <div className="mt-2 flex flex-wrap gap-2">
                  {rows.map((row) => (
                    <button
                      key={row.id}
                      type="button"
                      onClick={() => unblock(row.id)}
                      className="rounded border border-red-200 px-2 py-1 text-xs font-medium text-red-600 transition hover:bg-red-50"
                    >
                      Unblock {row.facility.name}
                    </button>
                  ))}
                </div>
              </li>
            ))}
          </ul>
        </div>
      ) : (
        <p className="mt-6 text-sm text-gray-500">No dates are currently blocked.</p>
      )}
    </div>
  );
}