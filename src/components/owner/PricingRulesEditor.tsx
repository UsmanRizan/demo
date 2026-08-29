"use client";

import { useEffect, useState } from "react";

type PricingRule = {
  id?: string;
  name: string;
  startTime: string;
  endTime: string;
  percentage: number;
  dayOfWeek: number | null;
  isActive: boolean;
};

type PricingRulesEditorProps = {
  locationId: string;
};

const DAYS = [
  { value: 1, label: "Mon", full: "Monday" },
  { value: 2, label: "Tue", full: "Tuesday" },
  { value: 3, label: "Wed", full: "Wednesday" },
  { value: 4, label: "Thu", full: "Thursday" },
  { value: 5, label: "Fri", full: "Friday" },
  { value: 6, label: "Sat", full: "Saturday" },
  { value: 0, label: "Sun", full: "Sunday" },
];

const DEFAULT_TIME_PERIODS: Omit<PricingRule, "dayOfWeek">[] = [
  { name: "Morning", startTime: "06:00", endTime: "12:00", percentage: 0, isActive: true },
  { name: "Evening", startTime: "12:00", endTime: "18:00", percentage: 0, isActive: true },
  { name: "Night", startTime: "18:00", endTime: "00:00", percentage: 0, isActive: true },
];

export default function PricingRulesEditor({
  locationId,
}: PricingRulesEditorProps) {
  const [rules, setRules] = useState<PricingRule[]>([]);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [message, setMessage] = useState("");
  const [error, setError] = useState("");
  const [expandedPeriod, setExpandedPeriod] = useState<string | null>(null);

  // Grid state: timePeriodIndex -> dayOfWeek -> percentage & enabled
  const [grid, setGrid] = useState<
    Record<string, Record<number, { enabled: boolean; percentage: number }>>
  >({});

  useEffect(() => {
    async function loadRules() {
      try {
        const response = await fetch(
          `/api/owner/locations/${locationId}/pricing-rules`,
        );
        const data = await response.json();

        if (!response.ok) {
          setError(data.error || "Failed to load pricing rules");
          return;
        }

        const existingRules = data.rules as PricingRule[];
        setRules(existingRules);

        // Build grid from existing rules
        const newGrid: typeof grid = {};

        DEFAULT_TIME_PERIODS.forEach((period, idx) => {
          const key = `${period.startTime}-${period.endTime}`;
          newGrid[key] = {};

          DAYS.forEach((day) => {
            const existing = existingRules.find(
              (r) =>
                r.startTime === period.startTime &&
                r.endTime === period.endTime &&
                r.dayOfWeek === day.value,
            );

            newGrid[key][day.value] = {
              enabled: existing?.isActive ?? false,
              percentage: existing?.percentage ?? 0,
            };
          });
        });

        // Also handle any custom time periods from existing rules
        const existingTimeKeys = new Set(
          DEFAULT_TIME_PERIODS.map((p) => `${p.startTime}-${p.endTime}`),
        );

        existingRules.forEach((rule) => {
          const key = `${rule.startTime}-${rule.endTime}`;
          if (!existingTimeKeys.has(key)) {
            existingTimeKeys.add(key);
            if (!newGrid[key]) {
              newGrid[key] = {};
            }
            DAYS.forEach((day) => {
              if (!newGrid[key][day.value]) {
                newGrid[key][day.value] = { enabled: false, percentage: 0 };
              }
              if (rule.dayOfWeek === day.value) {
                newGrid[key][day.value] = {
                  enabled: rule.isActive,
                  percentage: rule.percentage,
                };
              }
            });
          }
        });

        setGrid(newGrid);
      } catch {
        setError("Failed to load pricing rules");
      } finally {
        setLoading(false);
      }
    }

    loadRules();
  }, [locationId]);

  function updateCell(
    timeKey: string,
    dayOfWeek: number,
    changes: Partial<{ enabled: boolean; percentage: number }>,
  ) {
    setGrid((prev) => ({
      ...prev,
      [timeKey]: {
        ...prev[timeKey],
        [dayOfWeek]: {
          ...prev[timeKey]?.[dayOfWeek],
          ...changes,
        },
      },
    }));
    setMessage("");
    setError("");
  }

  function updateAllDaysForPeriod(
    timeKey: string,
    enabled: boolean,
    percentage: number,
  ) {
    setGrid((prev) => {
      const periodData = prev[timeKey] || {};
      const updatedDays: Record<number, { enabled: boolean; percentage: number }> = {};

      DAYS.forEach((day) => {
        updatedDays[day.value] = { enabled, percentage };
      });

      return {
        ...prev,
        [timeKey]: updatedDays,
      };
    });
    setMessage("");
    setError("");
  }

  function addCustomTimePeriod() {
    const newKey = "00:00-06:00";
    if (grid[newKey]) return;

    setGrid((prev) => {
      const newDays: Record<number, { enabled: boolean; percentage: number }> = {};
      DAYS.forEach((day) => {
        newDays[day.value] = { enabled: false, percentage: 0 };
      });
      return { ...prev, [newKey]: newDays };
    });
  }

  async function saveRules() {
    setSaving(true);
    setMessage("");
    setError("");

    try {
      const allRules: PricingRule[] = [];

      Object.entries(grid).forEach(([timeKey, dayMap]) => {
        const [startTime, endTime] = timeKey.split("-");

        DAYS.forEach((day) => {
          const cell = dayMap[day.value];
          if (cell?.enabled) {
            allRules.push({
              name: getTimePeriodName(startTime, endTime),
              startTime,
              endTime,
              percentage: cell.percentage,
              dayOfWeek: day.value,
              isActive: true,
            });
          }
        });
      });

      const response = await fetch(
        `/api/owner/locations/${locationId}/pricing-rules`,
        {
          method: "PUT",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ rules: allRules }),
        },
      );

      const data = await response.json();

      if (!response.ok) {
        setError(data.error || "Failed to save pricing rules");
        return;
      }

      setRules(data.rules);
      setMessage("Dynamic pricing rules saved successfully.");
    } catch {
      setError("Something went wrong.");
    } finally {
      setSaving(false);
    }
  }

  function getTimePeriodName(startTime: string, endTime: string): string {
    const names: Record<string, string> = {
      "06:00-12:00": "Morning",
      "12:00-18:00": "Evening",
      "18:00-00:00": "Night",
    };
    return names[`${startTime}-${endTime}`] || `${startTime} - ${endTime}`;
  }

  function getTimePeriodEmoji(startTime: string): string {
    const hour = parseInt(startTime.split(":")[0]);
    if (hour >= 6 && hour < 12) return "🌅";
    if (hour >= 12 && hour < 18) return "🌆";
    return "🌙";
  }

  function getPercentageColor(pct: number): string {
    if (pct > 0) return "text-green-600";
    if (pct < 0) return "text-red-600";
    return "text-gray-500";
  }

  function getPercentageBg(pct: number, enabled: boolean): string {
    if (!enabled) return "bg-gray-50";
    if (pct > 0) return "bg-green-50 border-green-200";
    if (pct < 0) return "bg-red-50 border-red-200";
    return "bg-white border-gray-200";
  }

  if (loading) {
    return (
      <div className="rounded-xl bg-white p-6 shadow-sm">
        Loading pricing rules...
      </div>
    );
  }

  const timeKeys = Object.keys(grid);

  return (
    <div className="rounded-xl bg-white p-6 shadow-sm">
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-xl font-semibold">Dynamic Pricing</h2>
          <p className="mt-1 text-sm text-gray-600">
            Set percentage adjustments for different times and days. Positive
            values increase the base price, negative values decrease it.
          </p>
        </div>
      </div>

      <div className="mt-6 overflow-x-auto">
        <table className="w-full min-w-[640px] border-collapse">
          <thead>
            <tr>
              <th className="border-b border-gray-200 p-3 text-left text-sm font-medium text-gray-600">
                Time Period
              </th>
              <th className="border-b border-gray-200 p-3 text-left text-sm font-medium text-gray-600">
                Hours
              </th>
              {DAYS.map((day) => (
                <th
                  key={day.value}
                  className="border-b border-gray-200 p-3 text-center text-sm font-medium text-gray-600"
                >
                  {day.label}
                </th>
              ))}
            </tr>
          </thead>
          <tbody>
            {timeKeys.map((timeKey) => {
              const [startTime, endTime] = timeKey.split("-");
              const emoji = getTimePeriodEmoji(startTime);
              const periodName = getTimePeriodName(startTime, endTime);
              const dayData = grid[timeKey] || {};
              const anyEnabled = DAYS.some(
                (day) => dayData[day.value]?.enabled,
              );

              return (
                <tr
                  key={timeKey}
                  className={anyEnabled ? "bg-gray-50/50" : ""}
                >
                  <td className="border-b border-gray-100 p-3">
                    <div className="flex items-center gap-2">
                      <span className="text-lg">{emoji}</span>
                      <div>
                        <p className="font-medium">{periodName}</p>
                        <div className="mt-1 flex items-center gap-2">
                          <button
                            type="button"
                            onClick={() =>
                              updateAllDaysForPeriod(timeKey, !anyEnabled, 0)
                            }
                            className={`rounded-full px-2 py-0.5 text-xs font-medium transition ${
                              anyEnabled
                                ? "bg-black text-white"
                                : "bg-gray-100 text-gray-500 hover:bg-gray-200"
                            }`}
                          >
                            {anyEnabled ? "All On" : "All Off"}
                          </button>
                        </div>
                      </div>
                    </div>
                  </td>
                  <td className="border-b border-gray-100 p-3 text-sm text-gray-500">
                    {startTime} – {endTime}
                  </td>
                  {DAYS.map((day) => {
                    const cell = dayData[day.value] || {
                      enabled: false,
                      percentage: 0,
                    };

                    return (
                      <td
                        key={day.value}
                        className={`border-b border-gray-100 p-2 text-center ${getPercentageBg(cell.percentage, cell.enabled)}`}
                      >
                        <div className="flex flex-col items-center gap-1">
                          <label className="relative inline-flex cursor-pointer items-center">
                            <input
                              type="checkbox"
                              checked={cell.enabled}
                              onChange={(e) =>
                                updateCell(timeKey, day.value, {
                                  enabled: e.target.checked,
                                })
                              }
                              className="peer sr-only"
                            />
                            <div className="h-5 w-9 rounded-full bg-gray-200 after:absolute after:left-[2px] after:top-[2px] after:h-4 after:w-4 after:rounded-full after:border after:border-gray-300 after:bg-white after:transition-all peer-checked:bg-black peer-checked:after:translate-x-full peer-checked:after:border-white" />
                          </label>

                          {cell.enabled && (
                            <div className="flex items-center gap-0.5">
                              <input
                                type="number"
                                value={cell.percentage}
                                onChange={(e) => {
                                  const val = parseFloat(e.target.value) || 0;
                                  updateCell(timeKey, day.value, {
                                    percentage: Math.max(
                                      -50,
                                      Math.min(100, val),
                                    ),
                                  });
                                }}
                                className={`w-14 rounded border px-1 py-0.5 text-center text-xs font-semibold outline-none focus:border-black ${getPercentageColor(cell.percentage)} ${cell.percentage > 0 ? "border-green-300 bg-green-50" : cell.percentage < 0 ? "border-red-300 bg-red-50" : "border-gray-300"}`}
                                min={-50}
                                max={100}
                                step={1}
                              />
                              <span
                                className={`text-xs font-medium ${getPercentageColor(cell.percentage)}`}
                              >
                                %
                              </span>
                            </div>
                          )}
                        </div>
                      </td>
                    );
                  })}
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>

      {/* Summary */}
      <div className="mt-6 rounded-lg bg-gray-50 p-4">
        <h3 className="text-sm font-medium text-gray-700">Preview</h3>
        <div className="mt-2 flex flex-wrap gap-2">
          {timeKeys.map((timeKey) => {
            const [startTime, endTime] = timeKey.split("-");
            const dayData = grid[timeKey] || {};
            const enabledDays = DAYS.filter(
              (day) => dayData[day.value]?.enabled,
            );

            if (enabledDays.length === 0) return null;

            const percentages = enabledDays.map(
              (day) => dayData[day.value].percentage,
            );
            const minPct = Math.min(...percentages);
            const maxPct = Math.max(...percentages);

            return (
              <div
                key={timeKey}
                className="rounded-lg border border-gray-200 bg-white px-3 py-2"
              >
                <p className="text-xs font-medium text-gray-600">
                  {getTimePeriodEmoji(startTime)} {getTimePeriodName(startTime, endTime)}
                </p>
                <p
                  className={`mt-0.5 text-sm font-semibold ${getPercentageColor(minPct === maxPct ? minPct : 0)}`}
                >
                  {minPct === maxPct
                    ? `${minPct >= 0 ? "+" : ""}${minPct}%`
                    : `${minPct >= 0 ? "+" : ""}${minPct}% to ${maxPct >= 0 ? "+" : ""}${maxPct}%`}
                </p>
                <p className="mt-0.5 text-[10px] text-gray-400">
                  {enabledDays.map((d) => d.label).join(", ")}
                </p>
              </div>
            );
          })}

          {timeKeys.every(
            (key) => !DAYS.some((day) => grid[key]?.[day.value]?.enabled),
          ) && (
            <p className="text-sm text-gray-500">
              No pricing rules set. All times use the base price.
            </p>
          )}
        </div>
      </div>

      {message && (
        <p className="mt-4 text-sm text-green-600">{message}</p>
      )}

      {error && <p className="mt-4 text-sm text-red-600">{error}</p>}

      <button
        type="button"
        onClick={saveRules}
        disabled={saving}
        className="mt-6 rounded-lg bg-black px-5 py-3 text-sm font-medium text-white disabled:opacity-50"
      >
        {saving ? "Saving..." : "Save Dynamic Pricing"}
      </button>
    </div>
  );
}
