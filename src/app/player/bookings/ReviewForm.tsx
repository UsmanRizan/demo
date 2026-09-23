"use client";

import { useState } from "react";

type Review = { rating: number; comment: string | null };

export default function ReviewForm({
  bookingId,
  initialReview,
}: {
  bookingId: string;
  initialReview: Review | null;
}) {
  const [review, setReview] = useState<Review | null>(initialReview);
  const [editing, setEditing] = useState(false);
  const [rating, setRating] = useState(initialReview?.rating ?? 0);
  const [comment, setComment] = useState(initialReview?.comment ?? "");
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState("");

  async function submit(event: React.FormEvent) {
    event.preventDefault();

    if (rating < 1) {
      setError("Please choose a rating.");
      return;
    }

    setSaving(true);
    setError("");

    try {
      const response = await fetch("/api/reviews", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ bookingId, rating, comment: comment.trim() || undefined }),
      });
      const data = await response.json();

      if (!response.ok) {
        setError(data.error || "Couldn't save your review.");
        return;
      }

      setReview({ rating, comment: comment.trim() || null });
      setEditing(false);
    } catch {
      setError("Network error. Please try again.");
    } finally {
      setSaving(false);
    }
  }

  if (review && !editing) {
    return (
      <div className="mt-4 border-[2px] border-black p-3 text-sm">
        <div className="flex items-center justify-between gap-2">
          <p>
            <span className="font-bold uppercase">Your review: </span>
            <span aria-label={`${review.rating} out of 5 stars`}>
              {"★".repeat(review.rating)}
              <span className="text-gray-300">{"★".repeat(5 - review.rating)}</span>
            </span>
          </p>
          <button
            type="button"
            onClick={() => setEditing(true)}
            className="text-xs font-bold uppercase underline"
          >
            Edit
          </button>
        </div>
        {review.comment && <p className="mt-1 text-gray-600">{review.comment}</p>}
      </div>
    );
  }

  if (!editing) {
    return (
      <button
        type="button"
        onClick={() => setEditing(true)}
        className="mt-4 border-[2px] border-black bg-black px-3 py-1.5 text-xs font-bold uppercase text-white hover:bg-white hover:text-black"
      >
        Rate this booking
      </button>
    );
  }

  return (
    <form onSubmit={submit} className="mt-4 border-[2px] border-black p-3">
      <fieldset>
        <legend className="text-xs font-bold uppercase">How was it?</legend>
        <div className="mt-1 flex gap-1" role="radiogroup">
          {[1, 2, 3, 4, 5].map((value) => (
            <button
              key={value}
              type="button"
              role="radio"
              aria-checked={rating === value}
              aria-label={`${value} star${value === 1 ? "" : "s"}`}
              onClick={() => setRating(value)}
              className={`text-2xl leading-none ${value <= rating ? "text-black" : "text-gray-300"}`}
            >
              ★
            </button>
          ))}
        </div>
      </fieldset>
      <label className="mt-2 block text-xs font-bold uppercase" htmlFor={`review-${bookingId}`}>
        Comment (optional)
      </label>
      <textarea
        id={`review-${bookingId}`}
        value={comment}
        onChange={(e) => setComment(e.target.value)}
        maxLength={1000}
        rows={3}
        className="mt-1 w-full border-[2px] border-black p-2 text-sm"
        placeholder="Court condition, staff, facilities…"
      />
      {error && <p className="mt-1 text-xs text-red-600">{error}</p>}
      <div className="mt-2 flex gap-2">
        <button
          type="submit"
          disabled={saving}
          className="border-[2px] border-black bg-black px-3 py-1.5 text-xs font-bold uppercase text-white disabled:opacity-50"
        >
          {saving ? "Saving…" : "Submit review"}
        </button>
        <button
          type="button"
          onClick={() => setEditing(false)}
          className="border-[2px] border-black px-3 py-1.5 text-xs font-bold uppercase"
        >
          Cancel
        </button>
      </div>
    </form>
  );
}
