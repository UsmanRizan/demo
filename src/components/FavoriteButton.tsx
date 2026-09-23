"use client";

import { useRouter } from "next/navigation";
import { useState } from "react";

export default function FavoriteButton({
  locationId,
  initialFavorited,
  signedIn,
}: {
  locationId: string;
  initialFavorited: boolean;
  signedIn: boolean;
}) {
  const router = useRouter();
  const [favorited, setFavorited] = useState(initialFavorited);
  const [pending, setPending] = useState(false);
  const [error, setError] = useState("");

  async function toggle() {
    if (!signedIn) {
      router.push("/login");
      return;
    }

    setPending(true);
    setError("");

    try {
      const response = await fetch("/api/player/favorites", {
        method: favorited ? "DELETE" : "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ locationId }),
      });

      if (!response.ok) {
        const data = await response.json().catch(() => ({}));
        setError(data.error || "Couldn't update favourites.");
        return;
      }

      setFavorited(!favorited);
    } catch {
      setError("Network error.");
    } finally {
      setPending(false);
    }
  }

  return (
    <div>
      <button
        type="button"
        onClick={toggle}
        disabled={pending}
        aria-pressed={favorited}
        className={`inline-flex items-center gap-2 border-[3px] border-black px-4 py-2.5 text-sm font-bold uppercase transition-colors disabled:opacity-50 ${
          favorited ? "bg-black text-white hover:bg-white hover:text-black" : "bg-white hover:bg-black hover:text-white"
        }`}
      >
        <svg
          className="h-4 w-4"
          viewBox="0 0 24 24"
          fill={favorited ? "currentColor" : "none"}
          stroke="currentColor"
          strokeWidth="2"
          aria-hidden="true"
        >
          <path d="M12 21s-7.5-4.6-9.5-9.2C1 8.4 3.2 5 6.6 5c2 0 3.4 1.1 4.4 2.5C12 6.1 13.4 5 15.4 5 18.8 5 21 8.4 19.5 11.8 17.5 16.4 12 21 12 21z" />
        </svg>
        {favorited ? "Saved" : "Save"}
      </button>
      {error && <p className="mt-1 text-xs text-red-600">{error}</p>}
    </div>
  );
}
