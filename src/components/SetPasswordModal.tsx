"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";

type Props = {
  open: boolean;
  onClose: () => void;
};

export default function SetPasswordModal({ open, onClose }: Props) {
  const [password, setPassword] = useState("");
  const [confirm, setConfirm] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const router = useRouter();

  if (!open) return null;

  async function handleSubmit(event: React.FormEvent) {
    event.preventDefault();
    setLoading(true);
    setError("");

    if (password.length < 8) {
      setError("Password must be at least 8 characters");
      setLoading(false);
      return;
    }

    if (password !== confirm) {
      setError("Passwords do not match");
      setLoading(false);
      return;
    }

    try {
      const response = await fetch("/api/auth/set-password", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ password }),
      });

      const data = await response.json();

      if (!response.ok) {
        setError(data.error || "Failed to set password");
        setLoading(false);
        return;
      }

      onClose();
      router.refresh();
    } catch {
      setError("Something went wrong");
      setLoading(false);
    }
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/80 p-4">
      <div className="w-full max-w-md border-[3px] border-black bg-white p-8">
        <div className="flex h-12 w-12 items-center justify-center border-[3px] border-black bg-black">
          <svg className="h-6 w-6 text-white" fill="none" stroke="currentColor" strokeWidth="2" viewBox="0 0 24 24">
            <path strokeLinecap="square" strokeLinejoin="miter" d="M16.5 10.5V6.75a4.5 4.5 0 10-9 0v3.75m-.75 11.25h10.5a2.25 2.25 0 002.25-2.25v-6.75a2.25 2.25 0 00-2.25-2.25H6.75a2.25 2.25 0 00-2.25 2.25v6.75a2.25 2.25 0 002.25 2.25z" />
          </svg>
        </div>

        <h2 className="mt-4 text-xl font-bold uppercase">Set a password</h2>

        <p className="mt-1 text-sm text-gray-500">
          Set a password so you can sign in faster next time.
        </p>

        {error && (
          <p className="mt-4 border-[2px] border-red-600 bg-white p-3 text-sm text-red-600">
            {error}
          </p>
        )}

        <form onSubmit={handleSubmit} className="mt-5 space-y-4">
          <div>
            <label className="mb-1.5 block text-sm font-bold uppercase">Password</label>
            <input
              type="password"
              value={password}
              onChange={(event) => setPassword(event.target.value)}
              placeholder="At least 8 characters"
              className="w-full border-[2px] border-black bg-white px-4 py-3 text-sm outline-none transition-colors focus:bg-gray-100"
              required
            />
          </div>

          <div>
            <label className="mb-1.5 block text-sm font-bold uppercase">
              Confirm password
            </label>
            <input
              type="password"
              value={confirm}
              onChange={(event) => setConfirm(event.target.value)}
              placeholder="Re-enter password"
              className="w-full border-[2px] border-black bg-white px-4 py-3 text-sm outline-none transition-colors focus:bg-gray-100"
              required
            />
          </div>

          <button
            type="submit"
            disabled={loading}
            className="w-full border-[3px] border-black bg-black px-4 py-3 text-sm font-bold uppercase text-white transition-colors hover:bg-white hover:text-black disabled:opacity-50"
          >
            {loading ? "Saving..." : "Save password"}
          </button>

          <button
            type="button"
            onClick={onClose}
            className="w-full text-sm text-gray-500 hover:text-black"
          >
            Skip for now
          </button>
        </form>
      </div>
    </div>
  );
}
