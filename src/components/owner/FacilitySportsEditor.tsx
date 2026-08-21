"use client";

import { useState } from "react";

type Sport = {
  id: string;
  name: string;
};

type FacilitySportsEditorProps = {
  facilityId: string;
  initialSports: Sport[];
  allSports: Sport[];
};

export default function FacilitySportsEditor({
  facilityId,
  initialSports,
  allSports,
}: FacilitySportsEditorProps) {
  const [editing, setEditing] = useState(false);
  const [selectedIds, setSelectedIds] = useState<string[]>(
    initialSports.map((s) => s.id),
  );
  const [saving, setSaving] = useState(false);
  const [message, setMessage] = useState("");
  const [error, setError] = useState("");

  function toggle(id: string) {
    setSelectedIds((prev) =>
      prev.includes(id) ? prev.filter((i) => i !== id) : [...prev, id],
    );
  }

  async function saveSports() {
    setSaving(true);
    setError("");
    setMessage("");

    try {
      const response = await fetch(`/api/owner/facilities/${facilityId}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ sportIds: selectedIds }),
      });

      const data = await response.json();

      if (!response.ok) {
        setError(data.error || "Failed to update sports");
        setSaving(false);
        return;
      }

      setSelectedIds(data.facility.sports.map((s: Sport) => s.id));
      setMessage("Sports updated.");
      setEditing(false);
    } catch {
      setError("Something went wrong.");
    } finally {
      setSaving(false);
    }
  }

  function cancel() {
    setSelectedIds(initialSports.map((s) => s.id));
    setEditing(false);
    setError("");
    setMessage("");
  }

  const currentNames = allSports
    .filter((s) => selectedIds.includes(s.id))
    .map((s) => s.name);

  return (
    <div className="mt-8 rounded-lg bg-gray-50 p-6">
      <p className="text-sm text-gray-500">Sports</p>

      {editing ? (
        <div className="mt-3 space-y-3">
          <div className="space-y-2">
            {allSports.map((sport) => (
              <label
                key={sport.id}
                className="flex cursor-pointer items-center gap-3 rounded-lg border border-gray-200 bg-white p-3 transition hover:border-black"
              >
                <input
                  type="checkbox"
                  checked={selectedIds.includes(sport.id)}
                  onChange={() => toggle(sport.id)}
                  className="h-4 w-4"
                />
                <span className="text-sm font-medium">{sport.name}</span>
              </label>
            ))}
          </div>

          {selectedIds.length === 0 && (
            <p className="text-xs text-red-500">
              Please select at least one sport.
            </p>
          )}

          <div className="flex gap-3">
            <button
              type="button"
              onClick={saveSports}
              disabled={saving || selectedIds.length === 0}
              className="rounded-lg bg-black px-4 py-2 text-sm font-medium text-white disabled:opacity-50"
            >
              {saving ? "Saving..." : "Save"}
            </button>

            <button
              type="button"
              onClick={cancel}
              disabled={saving}
              className="rounded-lg border border-gray-300 px-4 py-2 text-sm font-medium"
            >
              Cancel
            </button>
          </div>
        </div>
      ) : (
        <div className="mt-3 flex items-center gap-4">
          <p className="text-lg font-medium">
            {currentNames.length > 0 ? currentNames.join(", ") : "None"}
          </p>

          <button
            type="button"
            onClick={() => setEditing(true)}
            className="rounded-lg border border-gray-300 px-4 py-2 text-sm font-medium"
          >
            Edit
          </button>
        </div>
      )}

      {message && (
        <p className="mt-2 text-sm text-green-600">{message}</p>
      )}

      {error && (
        <p className="mt-2 text-sm text-red-600">{error}</p>
      )}
    </div>
  );
}
