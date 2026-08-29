"use client";

import { FormEvent, useState } from "react";
import { useRouter } from "next/navigation";

type Tab = "password" | "otp";

export default function LoginPage() {
  const router = useRouter();
  const [tab, setTab] = useState<Tab>("password");

  // Password tab state
  const [phone, setPhone] = useState("");
  const [password, setPassword] = useState("");
  const [passwordMessage, setPasswordMessage] = useState("");
  const [passwordLoading, setPasswordLoading] = useState(false);

  // OTP tab state
  const [otpPhone, setOtpPhone] = useState("");
  const [code, setCode] = useState("");
  const [otpStep, setOtpStep] = useState<"phone" | "otp">("phone");
  const [otpMessage, setOtpMessage] = useState("");
  const [otpLoading, setOtpLoading] = useState(false);

  async function handlePasswordLogin(event: FormEvent) {
    event.preventDefault();
    setPasswordLoading(true);
    setPasswordMessage("");

    try {
      const response = await fetch("/api/auth/login", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ phone, password }),
      });

      const data = await response.json();

      if (!response.ok) {
        setPasswordMessage(data.error || "Login failed");
        setPasswordLoading(false);
        return;
      }

      if (data.user.role === "ADMIN") {
        router.push("/admin");
      } else if (data.user.role === "OWNER") {
        router.push("/owner");
      } else if (data.user.role === "STAFF") {
        router.push("/staff");
      } else {
        router.push("/player");
      }
    } catch {
      setPasswordMessage("Something went wrong.");
      setPasswordLoading(false);
    }
  }

  async function handleSendOtp(event: FormEvent) {
    event.preventDefault();
    setOtpLoading(true);
    setOtpMessage("");

    try {
      const response = await fetch("/api/auth/send-otp", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ phone: otpPhone }),
      });

      const data = await response.json();

      if (!response.ok) {
        setOtpMessage(data.error || "Failed to send OTP");
        setOtpLoading(false);
        return;
      }

      setOtpStep("otp");
      setOtpMessage("OTP sent successfully.");
    } catch {
      setOtpMessage("Something went wrong.");
    } finally {
      setOtpLoading(false);
    }
  }

  async function handleVerifyOtp(event: FormEvent) {
    event.preventDefault();
    setOtpLoading(true);
    setOtpMessage("");

    try {
      const response = await fetch("/api/auth/verify-otp", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ phone: otpPhone, code }),
      });

      const data = await response.json();

      if (!response.ok) {
        setOtpMessage(data.error || "Invalid OTP");
        setOtpLoading(false);
        return;
      }

      if (data.user.role === "ADMIN") {
        router.push("/admin");
      } else if (data.user.role === "OWNER") {
        router.push("/owner");
      } else if (data.user.role === "STAFF") {
        router.push("/staff");
      } else {
        router.push("/player");
      }
    } catch {
      setOtpMessage("Something went wrong.");
    } finally {
      setOtpLoading(false);
    }
  }

  return (
    <main className="flex min-h-screen items-center justify-center bg-white px-4 sm:px-6">
      <div className="w-full max-w-md">
        {/* Brand header */}
        <div className="mb-8 text-center">
          <a href="/" className="inline-flex items-center gap-2">
            <div className="flex h-10 w-10 items-center justify-center bg-black text-lg font-bold text-white">
              B
            </div>
            <span className="text-2xl font-bold uppercase tracking-tight">BookMyPlay</span>
          </a>
        </div>

        <div className="border-[3px] border-black bg-white p-6 sm:p-8">
          <h1 className="text-xl font-bold uppercase">Welcome back</h1>
          <p className="mt-1 text-sm text-gray-500">
            Sign in to access your bookings.
          </p>

          {/* Tabs */}
          <div className="mt-5 flex border-b-[3px] border-black">
            <button
              type="button"
              onClick={() => setTab("password")}
              className={`flex-1 pb-3 text-sm font-bold uppercase transition ${
                tab === "password"
                  ? "border-b-[3px] border-black text-black -mb-[3px]"
                  : "text-gray-500 hover:text-black"
              }`}
            >
              Password
            </button>
            <button
              type="button"
              onClick={() => setTab("otp")}
              className={`flex-1 pb-3 text-sm font-bold uppercase transition ${
                tab === "otp"
                  ? "border-b-[3px] border-black text-black -mb-[3px]"
                  : "text-gray-500 hover:text-black"
              }`}
            >
              OTP
            </button>
          </div>

          {tab === "password" ? (
            <>
              <p className="mt-5 text-sm text-gray-500">
                Enter your phone number and password to sign in.
              </p>

              <form onSubmit={handlePasswordLogin} className="mt-5 space-y-4">
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
                  className="w-full border-[3px] border-black bg-black px-4 py-3 text-sm font-bold uppercase text-white transition-colors hover:bg-white hover:text-black disabled:opacity-50"
                >
                  {passwordLoading ? (
                    <span className="inline-flex items-center gap-2">
                      <svg className="spinner h-4 w-4" viewBox="0 0 24 24" fill="none">
                        <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
                        <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z" />
                      </svg>
                      Signing in...
                    </span>
                  ) : (
                    "Sign in"
                  )}
                </button>
              </form>

              <p className="mt-4 text-center text-sm text-gray-500">
                Don&apos;t have a password yet?{" "}
                <button
                  type="button"
                  onClick={() => setTab("otp")}
                  className="font-bold uppercase text-black hover:text-gray-600"
                >
                  Use OTP
                </button>
              </p>

              {passwordMessage && (
                <p className="mt-4 border-[2px] border-red-600 bg-white p-3 text-sm text-red-600">
                  {passwordMessage}
                </p>
              )}
            </>
          ) : otpStep === "phone" ? (
            <>
              <p className="mt-5 text-sm text-gray-500">
                Enter your phone number to receive a one-time code.
              </p>

              <form onSubmit={handleSendOtp} className="mt-5 space-y-4">
                <div>
                  <label className="mb-1.5 block text-sm font-bold uppercase">
                    Phone number
                  </label>
                  <input
                    type="tel"
                    value={otpPhone}
                    onChange={(event) => setOtpPhone(event.target.value)}
                    placeholder="+94 77 123 4567"
                    className="w-full border-[2px] border-black bg-white px-4 py-3 text-sm outline-none transition-colors focus:bg-gray-100"
                    required
                  />
                </div>

                <button
                  type="submit"
                  disabled={otpLoading}
                  className="w-full border-[3px] border-black bg-black px-4 py-3 text-sm font-bold uppercase text-white transition-colors hover:bg-white hover:text-black disabled:opacity-50"
                >
                  {otpLoading ? "Sending..." : "Send OTP"}
                </button>
              </form>

              <p className="mt-4 text-center text-sm text-gray-500">
                Already have a password?{" "}
                <button
                  type="button"
                  onClick={() => setTab("password")}
                  className="font-bold uppercase text-black hover:text-gray-600"
                >
                  Sign in
                </button>
              </p>
            </>
          ) : (
            <>
              <p className="mt-5 text-sm text-gray-500">
                Enter the 6-digit code sent to your phone.
              </p>

              <form onSubmit={handleVerifyOtp} className="mt-5 space-y-4">
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
                  disabled={otpLoading}
                  className="w-full border-[3px] border-black bg-black px-4 py-3 text-sm font-bold uppercase text-white transition-colors hover:bg-white hover:text-black disabled:opacity-50"
                >
                  {otpLoading ? "Verifying..." : "Verify OTP"}
                </button>

                <button
                  type="button"
                  onClick={() => {
                    setOtpStep("phone");
                    setCode("");
                  }}
                  className="w-full text-sm text-gray-500 hover:text-black"
                >
                  Change phone number
                </button>
              </form>

              {otpMessage && (
                <p className="mt-4 border-[2px] border-black bg-white p-3 text-sm text-black">
                  {otpMessage}
                </p>
              )}
            </>
          )}
        </div>

        <p className="mt-6 text-center text-xs text-gray-400 uppercase tracking-wide">
          By continuing, you agree to BookMyPlay&apos;s Terms of Service.
        </p>
      </div>
    </main>
  );
}
