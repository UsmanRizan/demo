"use client";

import { useRouter } from "next/navigation";
import { useState } from "react";

export default function AccountSettings() {
  const router = useRouter();
  const [message, setMessage] = useState("");
  const [error, setError] = useState("");
  const [busy, setBusy] = useState<"" | "logout" | "delete">("");
  const [showDelete, setShowDelete] = useState(false);
  const [confirmText, setConfirmText] = useState("");
  const [needsForfeit, setNeedsForfeit] = useState(false);
  const [forfeit, setForfeit] = useState(false);

  async function logoutEverywhere() {
    setBusy("logout");
    setError("");

    try {
      const response = await fetch("/api/auth/logout-all", { method: "POST" });

      if (!response.ok) {
        setError("Couldn't sign out of other devices.");
        return;
      }

      router.push("/login");
    } catch {
      setError("Network error. Please try again.");
    } finally {
      setBusy("");
    }
  }

  async function deleteAccount(event: React.FormEvent) {
    event.preventDefault();
    setBusy("delete");
    setError("");
    setMessage("");

    try {
      const response = await fetch("/api/account", {
        method: "DELETE",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ confirm: confirmText, forfeitWalletBalance: forfeit }),
      });
      const data = await response.json().catch(() => ({}));

      if (!response.ok) {
        if (data.code === "HAS_BALANCE" && !data.error?.includes("withdraw")) {
          setNeedsForfeit(true);
        }
        setError(data.error || "Couldn't delete your account.");
        return;
      }

      router.push("/");
      router.refresh();
    } catch {
      setError("Network error. Please try again.");
    } finally {
      setBusy("");
    }
  }

  return (
    <div className="mt-8 border-[3px] border-black bg-white p-6">
      <h2 className="text-lg font-bold uppercase">Account &amp; privacy</h2>

      <div className="mt-4 space-y-4">
        <div className="flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
          <div>
            <p className="font-bold">Sign out everywhere</p>
            <p className="text-sm text-gray-500">End every session, including on this device.</p>
          </div>
          <button
            type="button"
            onClick={logoutEverywhere}
            disabled={busy !== ""}
            className="border-[2px] border-black px-4 py-2 text-sm font-bold uppercase hover:bg-black hover:text-white disabled:opacity-50"
          >
            {busy === "logout" ? "Signing out…" : "Sign out all devices"}
          </button>
        </div>

        <div className="flex flex-col gap-2 border-t-[2px] border-black pt-4 sm:flex-row sm:items-center sm:justify-between">
          <div>
            <p className="font-bold">Download your data</p>
            <p className="text-sm text-gray-500">Your profile, bookings, payments and reviews as JSON.</p>
          </div>
          <a
            href="/api/account/export"
            className="border-[2px] border-black px-4 py-2 text-center text-sm font-bold uppercase hover:bg-black hover:text-white"
          >
            Download
          </a>
        </div>

        <div className="border-t-[2px] border-black pt-4">
          <div className="flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
            <div>
              <p className="font-bold text-red-600">Delete account</p>
              <p className="text-sm text-gray-500">
                Removes your personal details permanently. Booking records are kept anonymised for
                accounting.
              </p>
            </div>
            {!showDelete && (
              <button
                type="button"
                onClick={() => setShowDelete(true)}
                className="border-[2px] border-red-600 px-4 py-2 text-sm font-bold uppercase text-red-600 hover:bg-red-600 hover:text-white"
              >
                Delete account
              </button>
            )}
          </div>

          {showDelete && (
            <form onSubmit={deleteAccount} className="mt-4 border-[2px] border-red-600 p-4">
              <label htmlFor="delete-confirm" className="block text-sm">
                Type <strong>DELETE</strong> to confirm. This cannot be undone.
              </label>
              <input
                id="delete-confirm"
                value={confirmText}
                onChange={(e) => setConfirmText(e.target.value)}
                autoComplete="off"
                className="mt-2 w-full border-[2px] border-black px-3 py-2 text-sm"
              />
              {needsForfeit && (
                <label className="mt-3 flex items-start gap-2 text-sm">
                  <input
                    type="checkbox"
                    checked={forfeit}
                    onChange={(e) => setForfeit(e.target.checked)}
                    className="mt-1"
                  />
                  I understand my remaining wallet credit will be lost.
                </label>
              )}
              <div className="mt-3 flex gap-2">
                <button
                  type="submit"
                  disabled={confirmText !== "DELETE" || busy !== "" || (needsForfeit && !forfeit)}
                  className="bg-red-600 px-4 py-2 text-sm font-bold uppercase text-white disabled:opacity-50"
                >
                  {busy === "delete" ? "Deleting…" : "Permanently delete"}
                </button>
                <button
                  type="button"
                  onClick={() => {
                    setShowDelete(false);
                    setConfirmText("");
                    setError("");
                  }}
                  className="border-[2px] border-black px-4 py-2 text-sm font-bold uppercase"
                >
                  Cancel
                </button>
              </div>
            </form>
          )}
        </div>
      </div>

      {error && <p className="mt-4 border-[2px] border-red-600 p-3 text-sm text-red-600">{error}</p>}
      {message && <p className="mt-4 text-sm text-green-700">{message}</p>}
    </div>
  );
}
