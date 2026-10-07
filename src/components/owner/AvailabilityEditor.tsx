"use client";

import { useEffect, useMemo, useState } from "react";

import { expandHourRanges, mergeHourlySelection } from "@/lib/opening-hours";

const DAYS = [
  { value: 1, label: "Monday" },
  { value: 2, label: "Tuesday" },
  { value: 3, label: "Wednesday" },
  { value: 4, label: "Thursday" },
  { value: 5, label: "Friday" },
  { value: 6, label: "Saturday" },
  { value: 0, label: "Sunday" },
];

const ALL_HOURS = Array.from({ length: 24 }, (_, i) => i);

type AvailabilityRow = {
  dayOfWeek: number;
  startTime: string;
  endTime: string;
  isActive: boolean;
  isTwentyFourHour: boolean;
  hours: { start: string; end: string }[] | null;
};

function hourLabel(hour: number) {
  return `${String(hour).padStart(2, "0")}:00`;
}

function hourRangeLabel(hours: number[]) {
  return mergeHourlySelection(hours)
    .map((range) => `${range.start} – ${range.end}`)
    .join(", ");
}

export default function AvailabilityEditor({ locationId }: { locationId: string }) {
  const [selected, setSelected] = useState<number[]>([]);
  // dayOfWeek -> set of selected hour indexes
  const [hoursByDay, setHoursByDay] = useState<Record<number, number[]>>({});
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState("");
  const [success, setSuccess] = useState("");

  useEffect(() => {
    async function load() {
      try {
        const response = await fetch(`/api/owner/locations/${locationId}/availability`);
        const data = await response.json();

        if (!response.ok) {
          setError(data.error || "Failed to load availability");
          return;
        }

        const nextHours: Record<number, number[]> = {};
        const days: number[] = [];

        for (const row of (data.availability ?? []) as AvailabilityRow[]) {
          if (!row.isActive) continue;

          days.push(row.dayOfWeek);

          const stored = row.hours ?? [];
          // Rows saved before hourly selection only have the envelope; expand
          // it so the owner sees their actual hours ticked.
          nextHours[row.dayOfWeek] =
            stored.length > 0
              ? expandHourRanges(stored)
              : expandHourRanges([
                  { start: row.startTime, end: row.endTime },
                ]);
        }

        setSelected(days.sort((a, b) => a - b));
        setHoursByDay(nextHours);
      } catch {
        setError("Failed to load availability");
      } finally {
        setLoading(false);
      }
    }

    load();
  }, [locationId]);

  const totalHours = useMemo(
    () =>
      Object.entries(hoursByDay).reduce(
        (sum, [, hours]) => sum + hours.length,
        0,
      ),
    [hoursByDay],
  );

  const incompleteDays = selected.filter((day) => (hoursByDay[day] ?? []).length === 0);

  function toggleDay(day: number) {
    setError("");
    setSuccess("");
    setSelected((prev) =>
      prev.includes(day) ? prev.filter((d) => d !== day) : [...prev, day].sort((a, b) => a - b),
    );
  }

  function toggleHour(day: number, hour: number) {
    setError("");
    setSuccess("");
    setHoursByDay((prev) => {
      const current = prev[day] ?? [];
      const next = current.includes(hour)
        ? current.filter((h) => h !== hour)
        : [...current, hour].sort((a, b) => a - b);

      return { ...prev, [day]: next };
    });
  }

  function setDayHours(day: number, hours: number[]) {
    setError("");
    setSuccess("");
    setHoursByDay((prev) => ({ ...prev, [day]: hours }));
  }

  async function save() {
    setSaving(true);
    setError("");
    setSuccess("");

    try {
      const response = await fetch(`/api/owner/locations/${locationId}/availability`, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          availability: selected.map((day) => ({
            dayOfWeek: day,
            hours: hoursByDay[day] ?? [],
            isActive: true,
          })),
        }),
      });

      const data = await response.json();

      if (!response.ok) {
        setError(data.error || "Failed to save availability");
        return;
      }

      setSuccess("Opening hours saved.");
    } catch {
      setError("Failed to save availability");
    } finally {
      setSaving(false);
    }
  }

  if (loading) {
    return (
      <div className="rounded-xl bg-white p-6 shadow-sm">
        <h2 className="text-lg font-bold uppercase">Opening Hours</h2>
        <p className="mt-4 text-sm text-gray-500">Loading availability...</p>
      </div>
    );
  }

  return (
    <div className="rounded-xl bg-white p-6 shadow-sm">
      <h2 className="text-lg font-bold uppercase">Opening Hours</h2>

      <p className="mt-1 text-sm text-gray-600">
        Pick the days you&apos;re open, then tap the hours you&apos;re open on
        each day. Players can only book the hours you tick.
      </p>

      {/* Step 1: choose days */}
      <div className="mt-5">
        <p className="text-xs font-bold uppercase tracking-wide text-gray-500">
          1. Which days are you open?
        </p>

        <div className="mt-2 flex flex-wrap gap-2">
          {DAYS.map((day) => {
            const on = selected.includes(day.value);
            const count = (hoursByDay[day.value] ?? []).length;

            return (
              <button
                key={day.value}
                type="button"
                onClick={() => toggleDay(day.value)}
                aria-pressed={on}
                className={`flex items-center gap-2 rounded-lg border px-3 py-2 text-sm font-medium transition ${
                  on
                    ? "border-black bg-black text-white"
                    : "border-gray-300 bg-white text-gray-600 hover:border-gray-400"
                }`}
              >
                {day.label}
                {on && (
                  <span className="text-xs opacity-80">
                    {count}h
                  </span>
                )}
              </button>
            );
          })}
        </div>

        <div className="mt-2 flex gap-2">
          <button
            type="button"
            onClick={() => {
              setError("");
              setSelected(DAYS.map((d) => d.value).sort((a, b) => a - b));
            }}
            className="text-xs font-medium text-gray-600 underline hover:text-black"
          >
            Every day
          </button>
          <button
            type="button"
            onClick={() => {
              setError("");
              setSuccess("");
              setSelected([]);
              setHoursByDay({});
            }}
            className="text-xs font-medium text-gray-600 underline hover:text-black"
          >
            Clear
          </button>
        </div>
      </div>

      {/* Step 2: pick hours for each chosen day */}
      {selected.length > 0 && (
        <div className="mt-6">
          <p className="text-xs font-bold uppercase tracking-wide text-gray-500">
            2. Which hours on each day?
          </p>

          <div className="mt-3 space-y-4">
            {DAYS.filter((day) => selected.includes(day.value)).map((day) => {
              const hours = hoursByDay[day.value] ?? [];

              return (
                <div key={day.value} className="rounded-lg border border-gray-200 p-4">
                  <div className="flex flex-wrap items-center justify-between gap-2">
                    <p className="text-sm font-semibold">{day.label}</p>

                    <div className="flex gap-3 text-xs">
                      <button
                        type="button"
                        onClick={() => setDayHours(day.value, ALL_HOURS)}
                        className="font-medium text-gray-600 underline hover:text-black"
                      >
                        All 24 hours
                      </button>
                      <button
                        type="button"
                        onClick={() => setDayHours(day.value, [])}
                        className="font-medium text-gray-600 underline hover:text-black"
                      >
                        Clear
                      </button>
                    </div>
                  </div>

                  <div className="mt-3 grid grid-cols-4 gap-1.5 sm:grid-cols-6 md:grid-cols-8">
                    {ALL_HOURS.map((hour) => {
                      const on = hours.includes(hour);

                      return (
                        <button
                          key={hour}
                          type="button"
                          onClick={() => toggleHour(day.value, hour)}
                          aria-pressed={on}
                          aria-label={`${hour}:00 to ${hour + 1}:00`}
                          className={`rounded-md border px-1 py-2 text-xs font-medium tabular-nums transition ${
                            on
                              ? "border-black bg-black text-white"
                              : "border-gray-200 bg-white text-gray-500 hover:border-gray-400"
                          }`}
                        >
                          {hourLabel(hour)}
                        </button>
                      );
                    })}
                  </div>

                  <p className="mt-2 text-xs text-gray-500">
                    {hours.length === 0
                      ? "No hours selected yet."
                      : `${hours.length}h open · ${hourRangeLabel(hours)}`}
                  </p>
                </div>
              );
            })}
          </div>
        </div>
      )}

      {selected.length === 0 && (
        <p className="mt-5 rounded-lg bg-yellow-50 p-3 text-sm text-yellow-800">
          No days selected — this venue won&apos;t show any bookable hours.
        </p>
      )}

      {error && (
        <div className="mt-4 rounded-lg bg-red-50 p-3 text-sm text-red-700">
          {error}
        </div>
      )}

      {success && (
        <div className="mt-4 rounded-lg bg-emerald-50 p-3 text-sm text-emerald-800">
          {success}
        </div>
      )}

      <div className="mt-5 flex items-center gap-4">
        <button
          type="button"
          onClick={save}
          disabled={saving || incompleteDays.length > 0}
          className="rounded-lg bg-black px-5 py-3 font-medium text-white disabled:opacity-50"
        >
          {saving ? "Saving..." : "Save Opening Hours"}
        </button>

        {selected.length > 0 && (
          <p className="text-xs text-gray-500">
            {selected.length} day{selected.length === 1 ? "" : "s"} ·{" "}
            {totalHours}h per week
          </p>
        )}
      </div>

      {incompleteDays.length > 0 && (
        <p className="mt-2 text-xs text-red-600">
          Pick at least one hour for{" "}
          {incompleteDays
            .map((d) => DAYS.find((day) => day.value === d)?.label)
            .join(", ")}
          .
        </p>
      )}
    </div>
  );
}
