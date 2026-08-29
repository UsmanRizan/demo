"use client";

import { useEffect, useState } from "react";

type Availability = {
  dayOfWeek: number;
  startTime: string;
  endTime: string;
  isActive: boolean;
};

type AvailabilityEditorProps = {
  locationId: string;
};

const days = [
  { value: 1, label: "Monday" },
  { value: 2, label: "Tuesday" },
  { value: 3, label: "Wednesday" },
  { value: 4, label: "Thursday" },
  { value: 5, label: "Friday" },
  { value: 6, label: "Saturday" },
  { value: 0, label: "Sunday" },
];

const defaultAvailability: Availability[] = days.map((day) => ({
  dayOfWeek: day.value,
  startTime: "08:00",
  endTime: "22:00",
  isActive: false,
}));

export default function AvailabilityEditor({
  locationId,
}: AvailabilityEditorProps) {
  const [availability, setAvailability] =
    useState<Availability[]>(defaultAvailability);

  const [use24Hour, setUse24Hour] = useState(true);

  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [message, setMessage] = useState("");

  useEffect(() => {
    async function loadAvailability() {
      try {
        const response = await fetch(
          `/api/owner/locations/${locationId}/availability`,
        );

        const data = await response.json();

        if (!response.ok) {
          setMessage(data.error || "Failed to load availability");
          return;
        }

        const existing = data.availability as Availability[];

        const merged = defaultAvailability.map((day) => {
          const found = existing.find(
            (item) => item.dayOfWeek === day.dayOfWeek,
          );

          if (!found) {
            return { ...day };
          }

          return {
            dayOfWeek: found.dayOfWeek,
            startTime: found.startTime,
            endTime: found.endTime,
            isActive: found.isActive,
          };
        });

        setAvailability(merged);
      } catch {
        setMessage("Failed to load availability");
      } finally {
        setLoading(false);
      }
    }

    loadAvailability();
  }, [locationId]);

  function updateDay(dayOfWeek: number, changes: Partial<Availability>) {
    setAvailability((current) =>
      current.map((day) =>
        day.dayOfWeek === dayOfWeek ? { ...day, ...changes } : day,
      ),
    );
  }

  async function saveAvailability() {
    setSaving(true);
    setMessage("");

    try {
      const response = await fetch(
        `/api/owner/locations/${locationId}/availability`,
        {
          method: "PUT",
          headers: {
            "Content-Type": "application/json",
          },
          body: JSON.stringify({
            availability: availability.filter((day) => day.isActive),
          }),
        },
      );

      const data = await response.json();

      if (!response.ok) {
        setMessage(data.error || "Failed to save availability");
        return;
      }

      setMessage("Availability saved successfully.");
    } catch {
      setMessage("Failed to save availability");
    } finally {
      setSaving(false);
    }
  }

  if (loading) {
    return (
      <div className="rounded-xl bg-white p-6 shadow-sm">
        Loading availability...
      </div>
    );
  }

  // lang attribute switches native <input type="time"> between 12h and 24h display
  const timeLang = use24Hour ? "sv-SE" : "en-US";

  return (
    <div className="rounded-xl bg-white p-6 shadow-sm">
      <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <h2 className="text-xl font-semibold">Opening Hours</h2>

        <button
          type="button"
          onClick={() => setUse24Hour((v) => !v)}
          className="self-start rounded-lg border border-gray-300 px-3 py-1.5 text-xs font-medium text-gray-600 hover:bg-gray-50"
        >
          {use24Hour ? "24h format" : "12h format"}
        </button>
      </div>

      <p className="mt-2 text-sm text-gray-600">
        Set the hours when this location is available for bookings.
      </p>

      <div className="mt-6 space-y-4">
        {availability.map((day) => {
          const label = days.find(
            (item) => item.value === day.dayOfWeek,
          )?.label;

          return (
            <div
              key={day.dayOfWeek}
              className="rounded-lg border border-gray-200 p-4"
            >
              <div className="flex flex-col gap-4 md:flex-row md:items-center md:justify-between">
                <label className="flex items-center gap-3">
                  <input
                    type="checkbox"
                    checked={day.isActive}
                    onChange={(event) =>
                      updateDay(day.dayOfWeek, {
                        isActive: event.target.checked,
                      })
                    }
                    className="h-4 w-4"
                  />

                  <span className="w-24 font-medium">{label}</span>
                </label>

                <div className="flex items-center gap-3">
                  <input
                    type="time"
                    value={day.startTime}
                    disabled={!day.isActive}
                    lang={timeLang}
                    onChange={(event) =>
                      updateDay(day.dayOfWeek, {
                        startTime: event.target.value,
                      })
                    }
                    className="rounded-lg border border-gray-300 px-3 py-2.5 disabled:bg-gray-100"
                  />

                  <span className="text-gray-500">to</span>

                  <input
                    type="time"
                    value={day.endTime}
                    disabled={!day.isActive}
                    lang={timeLang}
                    onChange={(event) =>
                      updateDay(day.dayOfWeek, {
                        endTime: event.target.value,
                      })
                    }
                    className="rounded-lg border border-gray-300 px-3 py-2.5 disabled:bg-gray-100"
                  />
                </div>
              </div>
            </div>
          );
        })}
      </div>

      {message && (
        <div className="mt-5 rounded-lg bg-gray-100 p-3 text-sm text-gray-700">
          {message}
        </div>
      )}

      <button
        type="button"
        onClick={saveAvailability}
        disabled={saving}
        className="mt-6 rounded-lg bg-black px-5 py-3 text-sm font-medium text-white disabled:opacity-50"
      >
        {saving ? "Saving..." : "Save Opening Hours"}
      </button>
    </div>
  );
}
