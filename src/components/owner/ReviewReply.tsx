"use client";

import { useState } from "react";

export default function ReviewReply({
  reviewId,
  initialReply,
}: {
  reviewId: string;
  initialReply: string | null;
}) {
  const [reply, setReply] = useState(initialReply ?? "");
  const [saved, setSaved] = useState(initialReply ?? "");
  const [editing, setEditing] = useState(false);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState("");

  async function save() {
    setSaving(true);
    setError("");

    try {
      const response = await fetch(`/api/owner/reviews/${reviewId}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ reply: reply.trim() }),
      });

      if (!response.ok) {
        const data = await response.json().catch(() => ({}));
        setError(data.error || "Couldn't save reply.");
        return;
      }

      setSaved(reply.trim());
      setEditing(false);
    } catch {
      setError("Network error.");
    } finally {
      setSaving(false);
    }
  }

  if (!editing) {
    return (
      <div className="mt-2">
        {saved && (
          <p className="border-l-2 border-gray-300 pl-3 text-sm text-gray-600">
            <span className="font-medium">Your reply: </span>
            {saved}
          </p>
        )}
        <button
          type="button"
          onClick={() => setEditing(true)}
          className="mt-1 text-xs font-medium text-indigo-600 hover:underline"
        >
          {saved ? "Edit reply" : "Reply publicly"}
        </button>
      </div>
    );
  }

  return (
    <div className="mt-2">
      <textarea
        value={reply}
        onChange={(e) => setReply(e.target.value)}
        maxLength={1000}
        rows={2}
        className="w-full rounded-lg border border-gray-300 p-2 text-sm"
        placeholder="Thank the player or respond to their feedback"
      />
      {error && <p className="text-xs text-red-600">{error}</p>}
      <div className="mt-1 flex gap-2">
        <button
          type="button"
          onClick={save}
          disabled={saving}
          className="rounded-lg bg-black px-3 py-1.5 text-xs font-medium text-white disabled:opacity-50"
        >
          {saving ? "Saving…" : "Save reply"}
        </button>
        <button
          type="button"
          onClick={() => {
            setReply(saved);
            setEditing(false);
          }}
          className="rounded-lg border border-gray-300 px-3 py-1.5 text-xs font-medium"
        >
          Cancel
        </button>
      </div>
    </div>
  );
}
