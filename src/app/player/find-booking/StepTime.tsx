"use client";

import type { Period, Sport } from "./types";
import { periods } from "./types";
import { getTodayString } from "./utils";
import { getSportIcon } from "@/lib/sport-icons";

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
      <h2 className="text-3xl font-bold text-slate-900 sm:text-4xl">When do you want to play?</h2>

      <p className="mt-2 text-slate-500">
        Sport: <span className="font-semibold text-slate-900">{getSportIcon(selectedSport.name)} {selectedSport.name}</span>
      </p>

      <div className="mt-8 max-w-sm">
        <label className="mb-1.5 block text-sm font-medium text-slate-700">
          Select date
        </label>

        <input
          type="date"
          min={getTodayString()}
          value={selectedDate}
          onChange={(event) => onDateChange(event.target.value)}
          className="w-full rounded-xl border border-slate-300 bg-white px-4 py-3 text-sm outline-none transition-colors focus:border-indigo-500 focus:ring-2 focus:ring-indigo-500/20"
        />
      </div>

      <div className="mt-8 grid gap-4">
        {periods.map((period) => (
          <button
            key={period.id}
            type="button"
            disabled={!selectedDate}
            onClick={() => onSearch(period.id)}
            className="card-hover rounded-2xl border border-slate-200 bg-white p-6 text-left transition hover:border-indigo-300 hover:shadow-sm disabled:cursor-not-allowed disabled:opacity-50"
          >
            <div className="flex items-center justify-between">
              <div>
                <h3 className="text-xl font-semibold text-slate-900">{period.title}</h3>
                <p className="mt-1 text-sm font-medium text-slate-500">
                  {period.time}
                </p>
              </div>

              <svg className="h-5 w-5 text-slate-400" fill="none" stroke="currentColor" strokeWidth="2" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" d="M13.5 4.5L21 12m0 0l-7.5 7.5M21 12H3" />
              </svg>
            </div>

            <p className="mt-3 text-sm text-slate-500">
              {period.description}
            </p>
          </button>
        ))}
      </div>
    </section>
  );
}
