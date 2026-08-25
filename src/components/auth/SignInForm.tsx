"use client";

import { FormEvent, useState } from "react";

type AuthTab = "password" | "otp";

type SignInFormProps = {
  onPasswordLogin: (phone: string, password: string) => Promise<void>;
  onSendOtp: (phone: string) => Promise<void>;
  onCancel?: () => void;
  passwordLoading: boolean;
  otpLoading: boolean;
  passwordMessage: string;
  otpMessage: string;
  error: string;
};

export default function SignInForm({
  onPasswordLogin,
  onSendOtp,
  onCancel,
  passwordLoading,
  otpLoading,
  passwordMessage,
  otpMessage,
  error,
}: SignInFormProps) {
  const [authTab, setAuthTab] = useState<AuthTab>("password");
  const [phone, setPhone] = useState("");
  const [password, setPassword] = useState("");

  async function handlePasswordSubmit(event: FormEvent) {
    event.preventDefault();
    await onPasswordLogin(phone, password);
  }

  async function handleOtpSubmit(event: FormEvent) {
    event.preventDefault();
    await onSendOtp(phone);
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
          <h1 className="text-xl font-semibold text-slate-900">Sign in to continue</h1>

          {/* Tabs */}
          <div className="mt-5 flex border-b border-slate-200">
            <button
              type="button"
              onClick={() => setAuthTab("password")}
              className={`flex-1 pb-3 text-sm font-medium transition ${
                authTab === "password"
                  ? "border-b-2 border-indigo-600 text-indigo-600"
                  : "text-slate-500 hover:text-slate-700"
              }`}
            >
              Password
            </button>
            <button
              type="button"
              onClick={() => setAuthTab("otp")}
              className={`flex-1 pb-3 text-sm font-medium transition ${
                authTab === "otp"
                  ? "border-b-2 border-indigo-600 text-indigo-600"
                  : "text-slate-500 hover:text-slate-700"
              }`}
            >
              OTP
            </button>
          </div>

          {authTab === "password" ? (
            <>
              <p className="mt-5 text-sm text-slate-500">
                Enter your phone number and password to sign in.
              </p>

              <form onSubmit={handlePasswordSubmit} className="mt-5 space-y-4">
                <div>
                  <label className="mb-1.5 block text-sm font-medium text-slate-700">
                    Phone number
                  </label>
                  <input
                    type="tel"
                    value={phone}
                    onChange={(event) => setPhone(event.target.value)}
                    placeholder="+94 77 123 4567"
                    className="w-full rounded-xl border border-slate-300 bg-slate-50 px-4 py-3 text-sm outline-none transition-colors focus:border-indigo-500 focus:bg-white focus:ring-2 focus:ring-indigo-500/20"
                    required
                  />
                </div>

                <div>
                  <label className="mb-1.5 block text-sm font-medium text-slate-700">
                    Password
                  </label>
                  <input
                    type="password"
                    value={password}
                    onChange={(event) => setPassword(event.target.value)}
                    placeholder="Enter your password"
                    className="w-full rounded-xl border border-slate-300 bg-slate-50 px-4 py-3 text-sm outline-none transition-colors focus:border-indigo-500 focus:bg-white focus:ring-2 focus:ring-indigo-500/20"
                    required
                  />
                </div>

                <button
                  type="submit"
                  disabled={passwordLoading}
                  className="w-full rounded-xl bg-indigo-600 px-5 py-3 text-sm font-semibold text-white shadow-lg shadow-indigo-200 transition-all hover:bg-indigo-700 disabled:opacity-50 disabled:shadow-none"
                >
                  {passwordLoading ? "Signing in..." : "Sign in"}
                </button>
              </form>

              {passwordMessage && (
                <p className="mt-4 rounded-xl bg-red-50 p-3 text-sm text-red-600">
                  {passwordMessage}
                </p>
              )}
            </>
          ) : (
            <>
              <p className="mt-5 text-sm text-slate-500">
                Enter your phone number to receive a one-time code.
              </p>

              <form onSubmit={handleOtpSubmit} className="mt-5 space-y-4">
                <div>
                  <label className="mb-1.5 block text-sm font-medium text-slate-700">
                    Phone number
                  </label>
                  <input
                    type="tel"
                    value={phone}
                    onChange={(event) => setPhone(event.target.value)}
                    placeholder="+94 77 123 4567"
                    className="w-full rounded-xl border border-slate-300 bg-slate-50 px-4 py-3 text-sm outline-none transition-colors focus:border-indigo-500 focus:bg-white focus:ring-2 focus:ring-indigo-500/20"
                    required
                  />
                </div>

                <button
                  type="submit"
                  disabled={otpLoading}
                  className="w-full rounded-xl bg-indigo-600 px-5 py-3 text-sm font-semibold text-white shadow-lg shadow-indigo-200 transition-all hover:bg-indigo-700 disabled:opacity-50 disabled:shadow-none"
                >
                  {otpLoading ? "Sending..." : "Send OTP"}
                </button>
              </form>

              {otpMessage && (
                <p className="mt-4 rounded-xl bg-indigo-50 p-3 text-sm text-indigo-700">
                  {otpMessage}
                </p>
              )}
            </>
          )}

          {error && (
            <p className="mt-4 rounded-xl bg-red-50 p-3 text-sm text-red-600">
              {error}
            </p>
          )}

          {onCancel && (
            <button
              type="button"
              onClick={onCancel}
              className="mt-4 block w-full text-center text-sm text-slate-500 hover:text-slate-700"
            >
              Cancel
            </button>
          )}
        </div>
      </div>
    </main>
  );
}
