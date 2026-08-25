"use client";

import { FormEvent, useState } from "react";

type OtpVerifyFormProps = {
  phone: string;
  onVerify: (phone: string, code: string) => Promise<void>;
  onChangePhone: () => void;
  loading: boolean;
  message: string;
  error: string;
};

export default function OtpVerifyForm({
  phone,
  onVerify,
  onChangePhone,
  loading,
  message,
  error,
}: OtpVerifyFormProps) {
  const [code, setCode] = useState("");

  async function handleSubmit(event: FormEvent) {
    event.preventDefault();
    await onVerify(phone, code);
  }

  return (
    <main className="flex min-h-screen items-center justify-center bg-gradient-to-br from-slate-50 via-indigo-50/30 to-purple-50/20 px-4 sm:px-6">
      <div className="w-full max-w-md">
        <div className="mb-8 text-center">
          <a href="/" className="inline-flex items-center gap-2.5">
            <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-indigo-600 text-lg font-bold text-white">
              B
            </div>
            <span className="text-2xl font-bold text-slate-900">BookMyPlay</span>
          </a>
        </div>

        <div className="rounded-2xl border border-slate-200 bg-white p-6 shadow-xl shadow-slate-200/50 sm:p-8">
          <h1 className="text-xl font-semibold text-slate-900">Verify OTP</h1>

          <p className="mt-1 text-sm text-slate-500">
            Enter the 6-digit code sent to {phone}.
          </p>

          <form onSubmit={handleSubmit} className="mt-5 space-y-4">
            <div>
              <label className="mb-1.5 block text-sm font-medium text-slate-700">OTP</label>
              <input
                type="text"
                inputMode="numeric"
                maxLength={6}
                value={code}
                onChange={(event) => setCode(event.target.value)}
                placeholder="123456"
                className="w-full rounded-xl border border-slate-300 bg-slate-50 px-4 py-3 text-center text-lg font-semibold tracking-[0.5em] outline-none transition-colors focus:border-indigo-500 focus:bg-white focus:ring-2 focus:ring-indigo-500/20"
                required
              />
            </div>

            <button
              type="submit"
              disabled={loading}
              className="w-full rounded-xl bg-indigo-600 px-5 py-3 text-sm font-semibold text-white shadow-lg shadow-indigo-200 transition-all hover:bg-indigo-700 disabled:opacity-50 disabled:shadow-none"
            >
              {loading ? "Verifying..." : "Verify OTP"}
            </button>
          </form>

          {message && (
            <p className="mt-4 rounded-xl bg-indigo-50 p-3 text-sm text-indigo-700">
              {message}
            </p>
          )}

          {error && (
            <p className="mt-4 rounded-xl bg-red-50 p-3 text-sm text-red-600">
              {error}
            </p>
          )}

          <button
            type="button"
            onClick={onChangePhone}
            className="mt-4 block w-full text-center text-sm text-slate-500 hover:text-slate-700"
          >
            Change phone number
          </button>
        </div>
      </div>
    </main>
  );
}
