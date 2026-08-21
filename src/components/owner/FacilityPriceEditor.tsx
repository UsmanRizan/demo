"use client";

import { useState } from "react";

type FacilityPriceEditorProps = {
  facilityId: string;
  initialPrice: string;
};

export default function FacilityPriceEditor({
  facilityId,
  initialPrice,
}: FacilityPriceEditorProps) {
  const [editing, setEditing] = useState(false);
  const [price, setPrice] = useState(initialPrice);
  const [saving, setSaving] = useState(false);
  const [message, setMessage] = useState("");
  const [error, setError] = useState("");

  async function savePrice() {
    setSaving(true);
    setError("");
    setMessage("");

    try {
      const response = await fetch(`/api/owner/facilities/${facilityId}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ price: Number(price) }),
      });

      const data = await response.json();

      if (!response.ok) {
        setError(data.error || "Failed to update price");
        setSaving(false);
        return;
      }

      setPrice(data.facility.price);
      setMessage("Price updated.");
      setEditing(false);
    } catch {
      setError("Something went wrong.");
    } finally {
      setSaving(false);
    }
  }

  function cancel() {
    setPrice(initialPrice);
    setEditing(false);
    setError("");
    setMessage("");
  }

  return (
    <div className="mt-8 rounded-lg bg-gray-50 p-6">
      <p className="text-sm text-gray-500">Price per hour</p>

      {editing ? (
        <div className="mt-3 flex items-center gap-3">
          <span className="text-lg font-medium">Rs.</span>

          <input
            type="number"
            min="0"
            step="0.01"
            value={price}
            onChange={(event) => setPrice(event.target.value)}
            className="w-32 rounded-lg border border-gray-300 px-3 py-2 text-2xl font-bold outline-none focus:border-black"
            autoFocus
          />

          <button
            type="button"
            onClick={savePrice}
            disabled={saving || Number(price) <= 0}
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
      ) : (
        <div className="mt-3 flex items-center gap-4">
          <p className="text-3xl font-bold">Rs. {price}</p>

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
