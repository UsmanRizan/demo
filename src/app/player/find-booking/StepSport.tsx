"use client";

import type { Sport } from "./types";
import { getSportIcon } from "@/lib/sport-icons";

type StepSportProps = {
  sports: Sport[];
  loading: boolean;
  onSelect: (sport: Sport) => void;
};

export default function StepSport({ sports, loading, onSelect }: StepSportProps) {
  return (
    <section className="mt-8">
      <h2 className="text-3xl font-bold uppercase sm:text-4xl">What do you want to play?</h2>

      <p className="mt-2 text-gray-500">
        Choose a sport to find nearby courts.
      </p>

      {loading ? (
        <div className="mt-8 border-[2px] border-black bg-white p-8">
          <div className="flex items-center gap-3">
            <svg className="spinner h-5 w-5 text-black" viewBox="0 0 24 24" fill="none">
              <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
              <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z" />
            </svg>
            <span className="text-sm text-gray-500">Loading sports...</span>
          </div>
        </div>
      ) : (
        <div className="mt-8 grid gap-4 sm:grid-cols-2">
          {sports.map((sport) => (
            <button
              key={sport.id}
              type="button"
              onClick={() => onSelect(sport)}
              className="border-[2px] border-black bg-white p-6 text-left transition-all hover:bg-black hover:text-white"
            >
              <h3 className="text-xl font-bold uppercase"><span aria-hidden="true" className="mr-2">{getSportIcon(sport.name)}</span>{sport.name}</h3>
              <p className="mt-2 text-sm text-gray-500 group-hover:text-gray-300">
                Find {sport.name.toLowerCase()} courts near you.
              </p>
              <div className="mt-3 text-sm font-bold uppercase text-black group-hover:text-white">
                Select →
              </div>
            </button>
          ))}
        </div>
      )}

      {!loading && sports.length === 0 && (
        <div className="mt-8 border-[2px] border-black bg-white p-8 text-center">
          <p className="text-gray-500">No sports are currently available.</p>
        </div>
      )}
    </section>
  );
}
