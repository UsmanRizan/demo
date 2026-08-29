"use client";

import { useMemo } from "react";
import type { Period, Sport } from "./types";
import { periods } from "./types";
import { getTodayString } from "./utils";
import { getSportIcon } from "@/lib/sport-icons";

type StepPeriodProps = {
  selectedSport: Sport;
  selectedDate: string;
  onSelect: (period: Period) => void;
  onBack: () => void;
};

export default function StepPeriod({
  selectedSport,
  selectedDate,
  onSelect,
  onBack,
}: StepPeriodProps) {
  const isToday = selectedDate === getTodayString();

  const now = useMemo(() => new Date(), []);

  const currentMinutes = now.getHours() * 60 + now.getMinutes();

  const availablePeriods = isToday
    ? periods.filter((p) => p.start > currentMinutes)
    : periods;

  return (
    <section className="mt-8">
      <h2 className="text-3xl font-bold uppercase sm:text-4xl">When do you want to play?</h2>

      <p className="mt-2 text-gray-500">
        Sport: <span className="font-bold uppercase text-black">{getSportIcon(selectedSport.name)} {selectedSport.name}</span>
      </p>

      <p className="mt-1 text-sm text-gray-400 uppercase font-bold">
        Date: {selectedDate}
      </p>

      {availablePeriods.length === 0 ? (
        <div className="mt-8 border-[2px] border-black bg-white p-8 text-center">
          <h3 className="text-xl font-bold uppercase">No time slots available today</h3>
          <p className="mt-2 text-gray-500">
            All time periods have already passed. Please go back and select a different date.
          </p>
          <button
            type="button"
            onClick={onBack}
            className="mt-5 border-[2px] border-black bg-black px-6 py-3 text-sm font-bold uppercase text-white transition hover:bg-gray-800"
          >
            Change Date
          </button>
        </div>
      ) : (
        <div className="mt-8 grid gap-4">
          {availablePeriods.map((period) => (
            <button
              key={period.id}
              type="button"
              onClick={() => onSelect(period.id)}
              className="border-[2px] border-black bg-white p-6 text-left transition-all hover:bg-black hover:text-white"
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
      )}
    </section>
  );
}
