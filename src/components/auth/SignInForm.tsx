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
          <h1 className="text-xl font-bold uppercase">Sign in to continue</h1>

          {/* Tabs */}
          <div className="mt-5 flex border-b-[3px] border-black">
            <button
              type="button"
              onClick={() => setAuthTab("password")}
              className={`flex-1 pb-3 text-sm font-bold uppercase transition ${
                authTab === "password"
                  ? "border-b-[3px] border-black text-black -mb-[3px]"
                  : "text-gray-500 hover:text-black"
              }`}
            >
              Password
            </button>
            <button
              type="button"
              onClick={() => setAuthTab("otp")}
              className={`flex-1 pb-3 text-sm font-bold uppercase transition ${
                authTab === "otp"
                  ? "border-b-[3px] border-black text-black -mb-[3px]"
                  : "text-gray-500 hover:text-black"
              }`}
            >
              OTP
            </button>
          </div>

          {authTab === "password" ? (
            <>
              <p className="mt-5 text-sm text-gray-500">
                Enter your phone number and password to sign in.
              </p>

              <form onSubmit={handlePasswordSubmit} className="mt-5 space-y-4">
                <div>
                  <label className="mb-1.5 block text-sm font-bold uppercase">
                    Phone number
                  </label>
                  <input
                    type="tel"
                    value={phone}
                    onChange={(event) => setPhone(event.target.value)}
                    placeholder="+94 77 123 4567"
                    className="w-full border-[2px] border-black bg-white px-4 py-3 text-sm outline-none transition-colors focus:bg-gray-100"
                    required
                  />
                </div>

                <div>
                  <label className="mb-1.5 block text-sm font-bold uppercase">
                    Password
                  </label>
                  <input
                    type="password"
                    value={password}
                    onChange={(event) => setPassword(event.target.value)}
                    placeholder="Enter your password"
                    className="w-full border-[2px] border-black bg-white px-4 py-3 text-sm outline-none transition-colors focus:bg-gray-100"
                    required
                  />
                </div>

                <button
                  type="submit"
                  disabled={passwordLoading}
                  className="w-full border-[3px] border-black bg-black px-5 py-3 text-sm font-bold uppercase text-white transition-colors hover:bg-white hover:text-black disabled:opacity-50"
                >
                  {passwordLoading ? "Signing in..." : "Sign in"}
                </button>
              </form>

              {passwordMessage && (
                <p className="mt-4 border-[2px] border-red-600 bg-white p-3 text-sm text-red-600">
                  {passwordMessage}
                </p>
              )}
            </>
          ) : (
            <>
              <p className="mt-5 text-sm text-gray-500">
                Enter your phone number to receive a one-time code.
              </p>

              <form onSubmit={handleOtpSubmit} className="mt-5 space-y-4">
                <div>
                  <label className="mb-1.5 block text-sm font-bold uppercase">
                    Phone number
                  </label>
                  <input
                    type="tel"
                    value={phone}
                    onChange={(event) => setPhone(event.target.value)}
                    placeholder="+94 77 123 4567"
                    className="w-full border-[2px] border-black bg-white px-4 py-3 text-sm outline-none transition-colors focus:bg-gray-100"
                    required
                  />
                </div>

                <button
                  type="submit"
                  disabled={otpLoading}
                  className="w-full border-[3px] border-black bg-black px-5 py-3 text-sm font-bold uppercase text-white transition-colors hover:bg-white hover:text-black disabled:opacity-50"
                >
                  {otpLoading ? "Sending..." : "Send OTP"}
                </button>
              </form>

              {otpMessage && (
                <p className="mt-4 border-[2px] border-black bg-white p-3 text-sm text-black">
                  {otpMessage}
                </p>
              )}
            </>
          )}

          {error && (
            <p className="mt-4 border-[2px] border-red-600 bg-white p-3 text-sm text-red-600">
              {error}
            </p>
          )}

          {onCancel && (
            <button
              type="button"
              onClick={onCancel}
              className="mt-4 block w-full text-center text-sm text-gray-500 hover:text-black"
            >
              Cancel
            </button>
          )}
        </div>
      </div>
    </main>
  );
}
