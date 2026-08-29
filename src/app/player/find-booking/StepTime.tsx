"use client";

import type { Sport } from "./types";
import { getTodayString } from "./utils";
import { getSportIcon } from "@/lib/sport-icons";

type StepTimeProps = {
  selectedSport: Sport;
  selectedDate: string;
  onDateChange: (date: string) => void;
  onSearch: () => void;
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

      <button
        type="button"
        disabled={!selectedDate}
        onClick={onSearch}
        className="mt-8 border-[2px] border-black bg-black px-8 py-5 text-lg font-bold uppercase text-white transition-all hover:bg-gray-800 disabled:cursor-not-allowed disabled:opacity-50"
      >
        Continue
      </button>
    </section>
  );
}
