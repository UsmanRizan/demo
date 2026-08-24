"use client";

import type { Period, Sport } from "./types";
import { periods } from "./types";
import { getTodayString } from "./utils";

type StepTimeProps = {
  selectedSport: Sport;
  selectedDate: string;
  onDateChange: (date: string) => void;
  onSearch: (period: Period) => void;
};

export default function StepTime({
  selectedSport,
  selectedDate,
  onDateChange,
  onSearch,
}: StepTimeProps) {
  return (
    <section className="mt-8">
      <h2 className="text-2xl font-bold sm:text-3xl">When do you want to play?</h2>

      <p className="mt-2 text-gray-600">
        Sport: <strong>{selectedSport.name}</strong>
      </p>

      <div className="mt-8 max-w-sm">
        <label className="mb-2 block text-sm font-medium">
          Select date
        </label>

        <input
          type="date"
          min={getTodayString()}
          value={selectedDate}
          onChange={(event) => onDateChange(event.target.value)}
          className="w-full rounded-lg border border-gray-300 bg-white px-4 py-3 outline-none focus:border-black"
        />
      </div>

      <div className="mt-8 grid gap-4">
        {periods.map((period) => (
          <button
            key={period.id}
            type="button"
            disabled={!selectedDate}
            onClick={() => onSearch(period.id)}
            className="rounded-2xl border border-gray-200 bg-white p-6 text-left transition hover:border-black hover:shadow-sm disabled:cursor-not-allowed disabled:opacity-50"
          >
            <div className="flex items-center justify-between">
              <div>
                <h3 className="text-xl font-semibold">{period.title}</h3>

                <p className="mt-1 text-sm font-medium text-gray-500">
                  {period.time}
                </p>
              </div>

              <span className="text-2xl">→</span>
            </div>

            <p className="mt-4 text-sm text-gray-600">
              {period.description}
            </p>
          </button>
        ))}
      </div>
    </section>
  );
}
