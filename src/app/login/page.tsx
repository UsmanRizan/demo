"use client";

import { FormEvent, useState } from "react";
import { useRouter } from "next/navigation";

export default function LoginPage() {
  const [phone, setPhone] = useState("");
  const [code, setCode] = useState("");
  const [step, setStep] = useState<"phone" | "otp">("phone");
  const [message, setMessage] = useState("");
  const [loading, setLoading] = useState(false);

  const router = useRouter();

  async function sendOtp(event: FormEvent) {
    event.preventDefault();

    setLoading(true);
    setMessage("");

    try {
      const response = await fetch("/api/auth/send-otp", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          phone,
        }),
      });

      const data = await response.json();

      if (!response.ok) {
        setMessage(data.error || "Failed to send OTP");
        return;
      }

      setStep("otp");
      setMessage("OTP sent successfully.");
    } catch {
      setMessage("Something went wrong.");
    } finally {
      setLoading(false);
    }
  }

  async function verifyOtp(event: FormEvent) {
    event.preventDefault();

    setLoading(true);
    setMessage("");

    try {
      const response = await fetch("/api/auth/verify-otp", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          phone,
          code,
        }),
      });

      const data = await response.json();

      if (!response.ok) {
        setMessage(data.error || "Invalid OTP");
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
      setMessage("Something went wrong.");
    } finally {
      setLoading(false);
    }
  }

  return (
    <main className="flex min-h-screen items-center justify-center bg-gray-50 px-6">
      <div className="w-full max-w-md rounded-2xl bg-white p-8 shadow-sm">
        <h1 className="text-2xl font-bold">BookMyPlay</h1>

        <p className="mt-2 text-gray-600">
          {step === "phone"
            ? "Enter your phone number to continue."
            : "Enter the OTP sent to your phone."}
        </p>

        {step === "phone" ? (
          <form onSubmit={sendOtp} className="mt-8 space-y-4">
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
              disabled={loading}
              className="w-full rounded-lg bg-black px-4 py-3 font-medium text-white disabled:opacity-50"
            >
              {loading ? "Sending..." : "Send OTP"}
            </button>
          </form>
        ) : (
          <form onSubmit={verifyOtp} className="mt-8 space-y-4">
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
              className="w-full rounded-lg bg-black px-4 py-3 font-medium text-white disabled:opacity-50"
            >
              {loading ? "Verifying..." : "Verify OTP"}
            </button>

            <button
              type="button"
              onClick={() => setStep("phone")}
              className="w-full text-sm text-gray-600"
            >
              Change phone number
            </button>
          </form>
        )}

        {message && (
          <p className="mt-6 rounded-lg bg-gray-100 p-3 text-sm text-gray-700">
            {message}
          </p>
        )}
      </div>
    </main>
  );
}
