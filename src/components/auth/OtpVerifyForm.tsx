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
    <main className="flex min-h-screen items-center justify-center bg-white px-4 sm:px-6">
      <div className="w-full max-w-md">
        <div className="mb-8 text-center">
          <a href="/" className="inline-flex items-center gap-2">
            <div className="flex h-10 w-10 items-center justify-center bg-black text-lg font-bold text-white">
              B
            </div>
            <span className="text-2xl font-bold uppercase tracking-tight">BookMyPlay</span>
          </a>
        </div>

        <div className="border-[3px] border-black bg-white p-6 sm:p-8">
          <h1 className="text-xl font-bold uppercase">Verify OTP</h1>

          <p className="mt-1 text-sm text-gray-500">
            Enter the 6-digit code sent to {phone}.
          </p>

          <form onSubmit={handleSubmit} className="mt-5 space-y-4">
            <div>
              <label className="mb-1.5 block text-sm font-bold uppercase">OTP</label>
              <input
                type="text"
                inputMode="numeric"
                maxLength={6}
                value={code}
                onChange={(event) => setCode(event.target.value)}
                placeholder="123456"
                className="w-full border-[2px] border-black bg-white px-4 py-3 text-center text-lg font-bold tracking-[0.5em] outline-none transition-colors focus:bg-gray-100"
                required
              />
            </div>

            <button
              type="submit"
              disabled={loading}
              className="w-full border-[3px] border-black bg-black px-5 py-3 text-sm font-bold uppercase text-white transition-colors hover:bg-white hover:text-black disabled:opacity-50"
            >
              {loading ? "Verifying..." : "Verify OTP"}
            </button>
          </form>

          {message && (
            <p className="mt-4 border-[2px] border-black bg-white p-3 text-sm text-black">
              {message}
            </p>
          )}

          {error && (
            <p className="mt-4 border-[2px] border-red-600 bg-white p-3 text-sm text-red-600">
              {error}
            </p>
          )}

          <button
            type="button"
            onClick={onChangePhone}
            className="mt-4 block w-full text-center text-sm text-gray-500 hover:text-black"
          >
            Change phone number
          </button>
        </div>
      </div>
    </main>
  );
}
