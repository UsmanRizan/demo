"use client";

import type { Sport } from "./types";

type StepSportProps = {
  sports: Sport[];
  loading: boolean;
  onSelect: (sport: Sport) => void;
};

export default function StepSport({ sports, loading, onSelect }: StepSportProps) {
  return (
    <section className="mt-8">
      <h2 className="text-3xl font-bold">What do you want to play?</h2>

      <p className="mt-2 text-gray-600">
        Choose a sport to find nearby courts.
      </p>

      {loading ? (
        <div className="mt-8 rounded-xl bg-white p-8">
          Loading sports...
        </div>
      ) : (
        <div className="mt-8 grid gap-4 sm:grid-cols-2">
          {sports.map((sport) => (
            <button
              key={sport.id}
              type="button"
              onClick={() => onSelect(sport)}
              className="rounded-2xl border border-gray-200 bg-white p-6 text-left transition hover:border-black hover:shadow-sm"
            >
              <h3 className="text-xl font-semibold">{sport.name}</h3>

              <p className="mt-2 text-sm text-gray-500">
                Find {sport.name.toLowerCase()} courts near you.
              </p>
            </button>
          ))}
        </div>
      )}

      {!loading && sports.length === 0 && (
        <div className="mt-8 rounded-xl bg-white p-8 text-gray-500">
          No sports are currently available.
        </div>
      )}
    </section>
  );
}
