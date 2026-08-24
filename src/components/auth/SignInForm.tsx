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
    <main className="flex min-h-screen items-center justify-center bg-gray-50 px-4 sm:px-6">
      <div className="w-full max-w-md rounded-2xl bg-white p-6 shadow-sm sm:p-8">
        <h1 className="text-2xl font-bold">Sign in to continue</h1>

        {/* Tabs */}
        <div className="mt-4 flex border-b">
          <button
            type="button"
            onClick={() => setAuthTab("password")}
            className={`flex-1 pb-2 text-sm font-medium ${
              authTab === "password"
                ? "border-b-2 border-black text-black"
                : "text-gray-500"
            }`}
          >
            Password
          </button>
          <button
            type="button"
            onClick={() => setAuthTab("otp")}
            className={`flex-1 pb-2 text-sm font-medium ${
              authTab === "otp"
                ? "border-b-2 border-black text-black"
                : "text-gray-500"
            }`}
          >
            OTP
          </button>
        </div>

        {authTab === "password" ? (
          <>
            <p className="mt-4 text-gray-600">
              Enter your phone number and password to sign in.
            </p>

            <form onSubmit={handlePasswordSubmit} className="mt-6 space-y-4">
              <div>
                <label className="mb-2 block text-sm font-medium">
                  Phone number
                </label>

                <input
                  type="tel"
                  value={phone}
                  onChange={(event) => setPhone(event.target.value)}
                  placeholder="+94771234567"
                  className="w-full rounded-lg border border-gray-300 px-4 py-3 outline-none focus:border-black"
                  required
                />
              </div>

              <div>
                <label className="mb-2 block text-sm font-medium">
                  Password
                </label>

                <input
                  type="password"
                  value={password}
                  onChange={(event) => setPassword(event.target.value)}
                  placeholder="Enter your password"
                  className="w-full rounded-lg border border-gray-300 px-4 py-3 outline-none focus:border-black"
                  required
                />
              </div>

              <button
                type="submit"
                disabled={passwordLoading}
                className="w-full rounded-lg bg-black px-5 py-3 font-medium text-white disabled:opacity-50"
              >
                {passwordLoading ? "Signing in..." : "Sign in"}
              </button>
            </form>

            {passwordMessage && (
              <p className="mt-4 rounded-lg bg-red-50 p-3 text-sm text-red-700">
                {passwordMessage}
              </p>
            )}
          </>
        ) : (
          <>
            <p className="mt-4 text-gray-600">
              Enter your phone number to receive an OTP.
            </p>

            <form onSubmit={handleOtpSubmit} className="mt-6 space-y-4">
              <div>
                <label className="mb-2 block text-sm font-medium">
                  Phone number
                </label>

                <input
                  type="tel"
                  value={phone}
                  onChange={(event) => setPhone(event.target.value)}
                  placeholder="+94771234567"
                  className="w-full rounded-lg border border-gray-300 px-4 py-3 outline-none focus:border-black"
                  required
                />
              </div>

              <button
                type="submit"
                disabled={otpLoading}
                className="w-full rounded-lg bg-black px-5 py-3 font-medium text-white disabled:opacity-50"
              >
                {otpLoading ? "Sending..." : "Send OTP"}
              </button>
            </form>

            {otpMessage && (
              <p className="mt-4 rounded-lg bg-gray-100 p-3 text-sm text-gray-700">
                {otpMessage}
              </p>
            )}
          </>
        )}

        {error && (
          <p className="mt-4 rounded-lg bg-red-50 p-3 text-sm text-red-700">
            {error}
          </p>
        )}

        {onCancel && (
          <button
            type="button"
            onClick={onCancel}
            className="mt-4 block w-full text-center text-sm text-gray-500"
          >
            Cancel
          </button>
        )}
      </div>
    </main>
  );
}
