"use client";

import { FormEvent, useEffect, useState } from "react";

type Profile = {
  bankName: string | null;
  accountLast4: string | null;
  accountHolderName: string | null;
  updatedAt: string | null;
  complete: boolean;
};

export default function PayoutProfileForm() {
  const [profile, setProfile] = useState<Profile | null>(null);
  const [bankName, setBankName] = useState("");
  const [accountNumber, setAccountNumber] = useState("");
  const [accountHolderName, setAccountHolderName] = useState("");
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState("");
  const [success, setSuccess] = useState("");

  useEffect(() => {
    async function load() {
      try {
        const response = await fetch("/api/owner/payout");
        const data = await response.json();

        if (!response.ok) {
          setError(data.error || "Failed to load payout details");
          return;
        }

        setProfile(data);
        setBankName(data.bankName ?? "");
        setAccountHolderName(data.accountHolderName ?? "");
      } catch {
        setError("Failed to load payout details");
      } finally {
        setLoading(false);
      }
    }

    load();
  }, []);

  async function save(event: FormEvent) {
    event.preventDefault();
    setSaving(true);
    setError("");
    setSuccess("");

    try {
      const response = await fetch("/api/owner/payout", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ bankName, accountNumber, accountHolderName }),
      });

      const data = await response.json();

      if (!response.ok) {
        setError(data.error || "Failed to save payout details");
        return;
      }

      setProfile((p) => ({
        bankName: data.bankName,
        accountLast4: data.accountLast4,
        accountHolderName: data.accountHolderName,
        updatedAt: data.updatedAt,
        complete: true,
      }));
      setAccountNumber("");
      setSuccess(data.message);
    } catch {
      setError("Failed to save payout details");
    } finally {
      setSaving(false);
    }
  }

  if (loading) {
    return <p className="text-sm text-gray-500">Loading payout details...</p>;
  }

  return (
    <div>
      <h2 className="text-lg font-bold uppercase">Payout account</h2>

      <p className="mt-1 text-sm text-gray-600">
        Your weekly invoice is paid to this account every Sunday. Nothing is
        transferred until an admin settles it.
      </p>

      {profile?.complete && (
        <div className="mt-4 rounded-lg border border-emerald-200 bg-emerald-50 p-3 text-sm text-emerald-900">
          <p className="font-medium">
            {profile.bankName} ····{profile.accountLast4}
          </p>
          <p className="mt-0.5 text-xs">
            {profile.accountHolderName}
          </p>
          <p className="mt-1 text-xs">
            Re-enter the account number below to change these details.
          </p>
        </div>
      )}

      {!profile?.complete && (
        <div className="mt-4 rounded-lg border border-amber-200 bg-amber-50 p-3 text-sm text-amber-900">
          Add your bank details, otherwise your weekly invoices cannot be paid.
        </div>
      )}

      <form onSubmit={save} className="mt-4 space-y-4">
        <div>
          <label className="mb-1 block text-sm font-medium">Bank name</label>
          <input
            value={bankName}
            onChange={(e) => setBankName(e.target.value)}
            placeholder="e.g. Commercial Bank"
            required
            className="w-full rounded-lg border border-gray-300 px-4 py-3 outline-none focus:border-black"
          />
        </div>

        <div>
          <label className="mb-1 block text-sm font-medium">
            Account number
          </label>
          <input
            value={accountNumber}
            onChange={(e) => setAccountNumber(e.target.value)}
            placeholder={profile?.accountLast4 ? "Enter to change" : "Digits only"}
            inputMode="numeric"
            required
            className="w-full rounded-lg border border-gray-300 px-4 py-3 outline-none focus:border-black"
          />
        </div>

        <div>
          <label className="mb-1 block text-sm font-medium">
            Account holder name
          </label>
          <input
            value={accountHolderName}
            onChange={(e) => setAccountHolderName(e.target.value)}
            placeholder="As it appears at your bank"
            required
            className="w-full rounded-lg border border-gray-300 px-4 py-3 outline-none focus:border-black"
          />
        </div>

        {error && (
          <div className="rounded-lg bg-red-50 p-3 text-sm text-red-700">
            {error}
          </div>
        )}

        {success && (
          <div className="rounded-lg bg-emerald-50 p-3 text-sm text-emerald-800">
            {success}
          </div>
        )}

        <button
          type="submit"
          disabled={saving}
          className="rounded-lg bg-black px-5 py-3 font-medium text-white disabled:opacity-50"
        >
          {saving ? "Saving..." : "Save payout details"}
        </button>
      </form>
    </div>
  );
}
