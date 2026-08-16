"use client";

import { FormEvent, useEffect, useState } from "react";
import { useParams, useRouter } from "next/navigation";

type Sport = {
  id: string;
  name: string;
};

export default function NewFacilityPage() {
  const router = useRouter();
  const params = useParams();

  const locationId = params.id as string;

  const [sports, setSports] = useState<Sport[]>([]);
  const [sportId, setSportId] = useState("");
  const [name, setName] = useState("");
  const [description, setDescription] = useState("");
  const [price, setPrice] = useState("");

  const [loadingSports, setLoadingSports] = useState(true);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");

  useEffect(() => {
    async function loadSports() {
      try {
        const response = await fetch("/api/owner/sports");
        const data = await response.json();

        if (!response.ok) {
          setError(data.error || "Failed to load sports");
          return;
        }

        setSports(data.sports);

        if (data.sports.length > 0) {
          setSportId(data.sports[0].id);
        }
      } catch {
        setError("Failed to load sports");
      } finally {
        setLoadingSports(false);
      }
    }

    loadSports();
  }, []);

  async function createFacility(event: FormEvent) {
    event.preventDefault();

    setLoading(true);
    setError("");

    try {
      const response = await fetch("/api/owner/facilities", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          locationId,
          sportId,
          name,
          description,
          price,
        }),
      });

      const data = await response.json();

      if (!response.ok) {
        setError(data.error || "Failed to create facility");
        return;
      }

      router.push(`/owner/locations/${locationId}`);
      router.refresh();
    } catch {
      setError("Something went wrong.");
    } finally {
      setLoading(false);
    }
  }

  return (
    <main className="min-h-screen bg-gray-50 px-6 py-10">
      <div className="mx-auto max-w-2xl">
        <a
          href={`/owner/locations/${locationId}`}
          className="text-sm text-gray-600"
        >
          ← Back to Location
        </a>

        <div className="mt-6 rounded-xl bg-white p-8 shadow-sm">
          <h1 className="text-3xl font-bold">Add Facility</h1>

          <p className="mt-2 text-gray-600">
            Add a court, turf, room, or other bookable facility.
          </p>

          <form onSubmit={createFacility} className="mt-8 space-y-5">
            <div>
              <label className="mb-2 block text-sm font-medium">Sport</label>

              {loadingSports ? (
                <p className="text-sm text-gray-500">Loading sports...</p>
              ) : sports.length === 0 ? (
                <div className="rounded-lg bg-yellow-50 p-4 text-sm text-yellow-800">
                  There are no active sports yet. Ask an administrator to add a
                  sport.
                </div>
              ) : (
                <select
                  value={sportId}
                  onChange={(event) => setSportId(event.target.value)}
                  className="w-full rounded-lg border border-gray-300 px-4 py-3 outline-none focus:border-black"
                  required
                >
                  {sports.map((sport) => (
                    <option key={sport.id} value={sport.id}>
                      {sport.name}
                    </option>
                  ))}
                </select>
              )}
            </div>

            <div>
              <label className="mb-2 block text-sm font-medium">
                Facility name
              </label>

              <input
                value={name}
                onChange={(event) => setName(event.target.value)}
                placeholder="Badminton Court 1"
                className="w-full rounded-lg border border-gray-300 px-4 py-3 outline-none focus:border-black"
                required
              />
            </div>

            <div>
              <label className="mb-2 block text-sm font-medium">
                Price per booking
              </label>

              <input
                type="number"
                min="0"
                step="0.01"
                value={price}
                onChange={(event) => setPrice(event.target.value)}
                placeholder="2500"
                className="w-full rounded-lg border border-gray-300 px-4 py-3 outline-none focus:border-black"
                required
              />

              <p className="mt-1 text-xs text-gray-500">
                We'll make the pricing/slot duration more flexible later.
              </p>
            </div>

            <div>
              <label className="mb-2 block text-sm font-medium">
                Description
              </label>

              <textarea
                value={description}
                onChange={(event) => setDescription(event.target.value)}
                placeholder="Air-conditioned court with changing rooms..."
                rows={4}
                className="w-full rounded-lg border border-gray-300 px-4 py-3 outline-none focus:border-black"
              />
            </div>

            {error && (
              <div className="rounded-lg bg-red-50 p-3 text-sm text-red-700">
                {error}
              </div>
            )}

            <button
              type="submit"
              disabled={loading || loadingSports || sports.length === 0}
              className="w-full rounded-lg bg-black px-5 py-3 font-medium text-white disabled:opacity-50"
            >
              {loading ? "Creating..." : "Create Facility"}
            </button>
          </form>
        </div>
      </div>
    </main>
  );
}
