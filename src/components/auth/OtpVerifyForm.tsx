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
    <main className="flex min-h-screen items-center justify-center bg-gray-50 px-4 sm:px-6">
      <div className="w-full max-w-md rounded-2xl bg-white p-6 shadow-sm sm:p-8">
        <h1 className="text-2xl font-bold">Verify OTP</h1>

        <p className="mt-2 text-gray-600">
          Enter the 6-digit code sent to {phone}.
        </p>

        <form onSubmit={handleSubmit} className="mt-6 space-y-4">
          <div>
            <label className="mb-2 block text-sm font-medium">OTP</label>

            <input
              type="text"
              inputMode="numeric"
              maxLength={6}
              value={code}
              onChange={(event) => setCode(event.target.value)}
              placeholder="123456"
              className="w-full rounded-lg border border-gray-300 px-4 py-3 text-center text-xl tracking-[0.5em] outline-none focus:border-black"
              required
            />
          </div>

          <button
            type="submit"
            disabled={loading}
            className="w-full rounded-lg bg-black px-5 py-3 font-medium text-white disabled:opacity-50"
          >
            {loading ? "Verifying..." : "Verify OTP"}
          </button>
        </form>

        {message && (
          <p className="mt-4 rounded-lg bg-gray-100 p-3 text-sm text-gray-700">
            {message}
          </p>
        )}

        {error && (
          <p className="mt-4 rounded-lg bg-red-50 p-3 text-sm text-red-700">
            {error}
          </p>
        )}

        <button
          type="button"
          onClick={onChangePhone}
          className="mt-4 block w-full text-center text-sm text-gray-600"
        >
          Change phone number
        </button>
      </div>
    </main>
  );
}
