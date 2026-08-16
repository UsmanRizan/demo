"use client";

import { FormEvent, useEffect, useState } from "react";

type Sport = {
  id: string;
  name: string;
  slug: string;
  isActive: boolean;
};

export default function AdminSportsPage() {
  const [sports, setSports] = useState<Sport[]>([]);
  const [name, setName] = useState("");
  const [loading, setLoading] = useState(true);
  const [message, setMessage] = useState("");

  async function loadSports() {
    setLoading(true);

    try {
      const response = await fetch("/api/admin/sports");
      const data = await response.json();

      if (!response.ok) {
        setMessage(data.error || "Failed to load sports");
        return;
      }

      setSports(data.sports);
    } catch {
      setMessage("Failed to load sports");
    } finally {
      setLoading(false);
    }
  }

  async function createSport(event: FormEvent) {
    event.preventDefault();

    if (!name.trim()) {
      return;
    }

    setMessage("");

    try {
      const response = await fetch("/api/admin/sports", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          name,
        }),
      });

      const data = await response.json();

      if (!response.ok) {
        setMessage(data.error || "Failed to create sport");
        return;
      }

      setSports((currentSports) =>
        [...currentSports, data.sport].sort((a, b) =>
          a.name.localeCompare(b.name),
        ),
      );

      setName("");
      setMessage("Sport created.");
    } catch {
      setMessage("Failed to create sport");
    }
  }

  async function toggleSport(sport: Sport) {
    setMessage("");

    try {
      const response = await fetch(`/api/admin/sports/${sport.id}`, {
        method: "PATCH",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          isActive: !sport.isActive,
        }),
      });

      const data = await response.json();

      if (!response.ok) {
        setMessage(data.error || "Failed to update sport");
        return;
      }

      setSports((currentSports) =>
        currentSports.map((item) => (item.id === sport.id ? data.sport : item)),
      );

      setMessage("Sport updated.");
    } catch {
      setMessage("Failed to update sport");
    }
  }

  useEffect(() => {
    loadSports();
  }, []);

  return (
    <main className="min-h-screen bg-gray-50 px-6 py-10">
      <div className="mx-auto max-w-5xl">
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-3xl font-bold">Sports</h1>

            <p className="mt-1 text-gray-600">
              Manage the sports available on BookMyPlay.
            </p>
          </div>

          <a
            href="/admin"
            className="rounded-lg border border-gray-300 bg-white px-4 py-2 text-sm"
          >
            Back to Dashboard
          </a>
        </div>

        <div className="mt-8 rounded-xl bg-white p-6 shadow-sm">
          <h2 className="text-xl font-semibold">Add sport</h2>

          <form onSubmit={createSport} className="mt-4 flex gap-3">
            <input
              type="text"
              value={name}
              onChange={(event) => setName(event.target.value)}
              placeholder="e.g. Table Tennis"
              className="flex-1 rounded-lg border border-gray-300 px-4 py-3 outline-none focus:border-black"
            />

            <button
              type="submit"
              className="rounded-lg bg-black px-5 py-3 font-medium text-white"
            >
              Add Sport
            </button>
          </form>

          {message && <p className="mt-4 text-sm text-gray-600">{message}</p>}
        </div>

        <div className="mt-8 rounded-xl bg-white shadow-sm">
          {loading ? (
            <div className="p-6">Loading sports...</div>
          ) : (
            <div>
              {sports.map((sport) => (
                <div
                  key={sport.id}
                  className="flex items-center justify-between border-b p-6 last:border-0"
                >
                  <div>
                    <p className="font-semibold">{sport.name}</p>

                    <p className="mt-1 text-sm text-gray-500">{sport.slug}</p>
                  </div>

                  <button
                    type="button"
                    onClick={() => toggleSport(sport)}
                    className={`rounded-lg px-4 py-2 text-sm font-medium ${
                      sport.isActive
                        ? "bg-black text-white"
                        : "bg-gray-200 text-gray-700"
                    }`}
                  >
                    {sport.isActive ? "Active" : "Inactive"}
                  </button>
                </div>
              ))}

              {sports.length === 0 && (
                <div className="p-6 text-gray-500">No sports found.</div>
              )}
            </div>
          )}
        </div>
      </div>
    </main>
  );
}
