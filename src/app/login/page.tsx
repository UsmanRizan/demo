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
    <main className="flex min-h-screen items-center justify-center bg-gray-50 px-6">
      <div className="w-full max-w-md rounded-2xl bg-white p-8 shadow-sm">
        <h1 className="text-2xl font-bold">BookMyPlay</h1>

        {/* Tabs */}
        <div className="mt-4 flex border-b">
          <button
            type="button"
            onClick={() => setTab("password")}
            className={`flex-1 pb-2 text-sm font-medium ${
              tab === "password"
                ? "border-b-2 border-black text-black"
                : "text-gray-500"
            }`}
          >
            Password
          </button>
          <button
            type="button"
            onClick={() => setTab("otp")}
            className={`flex-1 pb-2 text-sm font-medium ${
              tab === "otp"
                ? "border-b-2 border-black text-black"
                : "text-gray-500"
            }`}
          >
            OTP
          </button>
        </div>

        {tab === "password" ? (
          <>
            <p className="mt-4 text-gray-600">
              Enter your phone number and password to sign in.
            </p>

            <form onSubmit={handlePasswordLogin} className="mt-6 space-y-4">
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
                className="w-full rounded-lg bg-black px-4 py-3 font-medium text-white disabled:opacity-50"
              >
                {passwordLoading ? "Signing in..." : "Sign in"}
              </button>
            </form>

            <p className="mt-4 text-center text-sm text-gray-600">
              Don&apos;t have a password yet?{" "}
              <button
                type="button"
                onClick={() => setTab("otp")}
                className="font-medium underline"
              >
                Use OTP
              </button>
            </p>

            {passwordMessage && (
              <p className="mt-4 rounded-lg bg-red-50 p-3 text-sm text-red-700">
                {passwordMessage}
              </p>
            )}
          </>
        ) : otpStep === "phone" ? (
          <>
            <p className="mt-4 text-gray-600">
              Enter your phone number to receive an OTP.
            </p>

            <form onSubmit={handleSendOtp} className="mt-6 space-y-4">
              <div>
                <label className="mb-2 block text-sm font-medium">
                  Phone number
                </label>

                <input
                  type="tel"
                  value={otpPhone}
                  onChange={(event) => setOtpPhone(event.target.value)}
                  placeholder="+94771234567"
                  className="w-full rounded-lg border border-gray-300 px-4 py-3 outline-none focus:border-black"
                  required
                />
              </div>

              <button
                type="submit"
                disabled={otpLoading}
                className="w-full rounded-lg bg-black px-4 py-3 font-medium text-white disabled:opacity-50"
              >
                {otpLoading ? "Sending..." : "Send OTP"}
              </button>
            </form>

            <p className="mt-4 text-center text-sm text-gray-600">
              Already have a password?{" "}
              <button
                type="button"
                onClick={() => setTab("password")}
                className="font-medium underline"
              >
                Sign in
              </button>
            </p>
          </>
        ) : (
          <>
            <p className="mt-4 text-gray-600">
              Enter the OTP sent to your phone.
            </p>

            <form onSubmit={handleVerifyOtp} className="mt-6 space-y-4">
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
                disabled={otpLoading}
                className="w-full rounded-lg bg-black px-4 py-3 font-medium text-white disabled:opacity-50"
              >
                {otpLoading ? "Verifying..." : "Verify OTP"}
              </button>

              <button
                type="button"
                onClick={() => {
                  setOtpStep("phone");
                  setCode("");
                }}
                className="w-full text-sm text-gray-600"
              >
                Change phone number
              </button>
            </form>

            {otpMessage && (
              <p className="mt-4 rounded-lg bg-gray-100 p-3 text-sm text-gray-700">
                {otpMessage}
              </p>
            )}
          </>
        )}
      </div>
    </main>
  );
}
