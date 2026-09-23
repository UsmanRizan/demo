"use client";

import { useRouter } from "next/navigation";
import { useState } from "react";

import { requestWithClosureConfirm } from "@/lib/client/closure-request";

/**
 * Open/close a location or court. Closing one with upcoming bookings asks the
 * owner to confirm cancelling and refunding them.
 */
export default function ActiveToggle({
  endpoint,
  isActive,
  noun,
}: {
  endpoint: string;
  isActive: boolean;
  noun: "location" | "court";
}) {
  const router = useRouter();
  const [active, setActive] = useState(isActive);
  const [pending, setPending] = useState(false);
  const [message, setMessage] = useState("");
  const [error, setError] = useState("");

  async function toggle() {
    const next = !active;

    if (!next && !window.confirm(`Stop taking bookings for this ${noun}?`)) {
      return;
    }

    setPending(true);
    setError("");
    setMessage("");

    try {
      const result = await requestWithClosureConfirm(endpoint, "PATCH", { isActive: next });

      if (result.aborted) {
        return;
      }

      if (!result.ok) {
        setError(String(result.data.error || "Update failed."));
        return;
      }

      setActive(next);
      const cancelled = Number(result.data.cancelledBookings || 0);
      setMessage(
        cancelled > 0
          ? `${cancelled} booking${cancelled === 1 ? "" : "s"} cancelled and refunded.`
          : next
            ? "Now taking bookings."
            : "Bookings paused.",
      );
      router.refresh();
    } catch {
      setError("Network error.");
    } finally {
      setPending(false);
    }
  }

  return (
    <div className="flex flex-col items-start gap-1">
      <button
        type="button"
        onClick={toggle}
        disabled={pending}
        className={`rounded-lg px-4 py-2 text-sm font-medium disabled:opacity-50 ${
          active
            ? "border border-red-300 text-red-600 hover:bg-red-50"
            : "bg-emerald-600 text-white hover:bg-emerald-700"
        }`}
      >
        {pending ? "Saving…" : active ? `Close ${noun}` : `Reopen ${noun}`}
      </button>
      {message && <p className="text-xs text-green-700">{message}</p>}
      {error && <p className="text-xs text-red-600">{error}</p>}
    </div>
  );
}
