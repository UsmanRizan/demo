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
      <h2 className="text-3xl font-bold uppercase sm:text-4xl">When do you want to play?</h2>

      <p className="mt-2 text-gray-500">
        Sport: <span className="font-bold uppercase text-black">{getSportIcon(selectedSport.name)} {selectedSport.name}</span>
      </p>

      <div className="mt-8 max-w-2xl">
        <label className="mb-2 block text-base font-bold uppercase">
          Select date
        </label>

        <input
          type="date"
          min={getTodayString()}
          value={selectedDate}
          onChange={(event) => onDateChange(event.target.value)}
          className="w-full border-[3px] border-black bg-white px-6 py-5 text-lg font-bold uppercase text-black outline-none transition-colors focus:bg-gray-100"
        />
      </div>

      <div className="mt-8 grid gap-4">
        {periods.map((period) => (
          <button
            key={period.id}
            type="button"
            disabled={!selectedDate}
            onClick={() => onSearch(period.id)}
            className="border-[2px] border-black bg-white p-6 text-left transition-all hover:bg-black hover:text-white disabled:cursor-not-allowed disabled:opacity-50"
          >
            <div className="flex items-center justify-between">
              <div>
                <h3 className="text-xl font-bold uppercase">{period.title}</h3>
                <p className="mt-1 text-sm font-bold uppercase text-gray-500">
                  {period.time}
                </p>
              </div>

              <svg className="h-5 w-5 text-gray-400 group-hover:text-white" fill="none" stroke="currentColor" strokeWidth="2.5" viewBox="0 0 24 24">
                <path strokeLinecap="square" strokeLinejoin="miter" d="M13.5 4.5L21 12m0 0l-7.5 7.5M21 12H3" />
              </svg>
            </div>

            <p className="mt-3 text-sm text-gray-500">
              {period.description}
            </p>
          </button>
        ))}
      </div>
    </section>
  );
}
