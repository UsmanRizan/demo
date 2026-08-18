"use client";

import { Suspense, useEffect, useRef, useState } from "react";
import { useRouter, useSearchParams } from "next/navigation";

type BookingInfo = {
  facilityId: string;
  date: string;
  startTime: string;
  endTime: string;
};

type Step = "phone" | "otp" | "profile" | "payment";

function CheckoutContent() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const requestStarted = useRef(false);

  const [step, setStep] = useState<Step>("phone");

  const [phone, setPhone] = useState("");
  const [otp, setOtp] = useState("");
  const [otpMessage, setOtpMessage] = useState("");
  const [otpLoading, setOtpLoading] = useState(false);

  const [profile, setProfile] = useState({
    firstName: "",
    lastName: "",
    email: "",
    addressLine1: "",
    addressLine2: "",
    city: "",
    country: "Sri Lanka",
  });
  const [profileLoading, setProfileLoading] = useState(false);
  const [profileSaving, setProfileSaving] = useState(false);
  const [profileMessage, setProfileMessage] = useState("");

  const [payment, setPayment] = useState<{
    action: string;
    fields: Record<string, string>;
  } | null>(null);

  const [bookingId, setBookingId] = useState<string | null>(null);

  const [error, setError] = useState("");

  const [loading, setLoading] = useState(true);

  function updateProfile(field: string, value: string) {
    setProfile((prev) => ({ ...prev, [field]: value }));
  }

  async function tryPayment() {
    const booking: BookingInfo = {
      facilityId: searchParams.get("facilityId") || "",
      date: searchParams.get("date") || "",
      startTime: searchParams.get("startTime") || "",
      endTime: searchParams.get("endTime") || "",
    };

    if (
      !booking.facilityId ||
      !booking.date ||
      !booking.startTime ||
      !booking.endTime
    ) {
      setError("Invalid booking information");
      setLoading(false);
      return;
    }

    try {
      const response = await fetch("/api/payments/payhere/create", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify(booking),
      });

      const data = await response.json();

      if (!response.ok) {
        if (response.status === 401) {
          setStep("phone");
          setLoading(false);
          return;
        }

        if (response.status === 400 && data.code === "PROFILE_INCOMPLETE") {
          setStep("profile");
          loadProfile();
          setLoading(false);
          return;
        }

        setError(data.error || "Unable to start payment");
        setLoading(false);
        return;
      }

      setBookingId(data.bookingId || null);
      setPayment(data.payment);
      setStep("payment");
    } catch {
      setError("Unable to start payment");
    } finally {
      setLoading(false);
    }
  }

  async function loadProfile() {
    setProfileLoading(true);
    setProfileMessage("");

    try {
      const response = await fetch("/api/player/profile");

      const data = await response.json();

      if (!response.ok) {
        setProfileMessage(data.error || "Failed to load profile");
        return;
      }

      const p = data.profile;

      setProfile({
        firstName: p.firstName || "",
        lastName: p.lastName || "",
        email: p.email || "",
        addressLine1: p.address?.addressLine1 || "",
        addressLine2: p.address?.addressLine2 || "",
        city: p.address?.city || "",
        country: p.address?.country || "Sri Lanka",
      });
    } catch {
      setProfileMessage("Failed to load profile");
    } finally {
      setProfileLoading(false);
    }
  }

  async function sendOtp(event: React.FormEvent) {
    event.preventDefault();

    setOtpLoading(true);
    setOtpMessage("");
    setError("");

    try {
      const response = await fetch("/api/auth/send-otp", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({ phone }),
      });

      const data = await response.json();

      if (!response.ok) {
        setOtpMessage(data.error || "Failed to send OTP");
        return;
      }

      setOtpMessage("OTP sent. Enter the code below.");
      setStep("otp");
    } catch {
      setOtpMessage("Something went wrong.");
    } finally {
      setOtpLoading(false);
    }
  }

  async function verifyOtp(event: React.FormEvent) {
    event.preventDefault();

    setOtpLoading(true);
    setOtpMessage("");
    setError("");

    try {
      const response = await fetch("/api/auth/verify-otp", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({ phone, code: otp }),
      });

      const data = await response.json();

      if (!response.ok) {
        setOtpMessage(data.error || "Invalid OTP");
        return;
      }

      // Session cookie is set by the API. Try payment.
      tryPayment();
    } catch {
      setOtpMessage("Something went wrong.");
    } finally {
      setOtpLoading(false);
    }
  }

  async function saveProfile(event: React.FormEvent) {
    event.preventDefault();

    setProfileSaving(true);
    setProfileMessage("");
    setError("");

    try {
      const response = await fetch("/api/player/profile", {
        method: "PUT",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify(profile),
      });

      const data = await response.json();

      if (!response.ok) {
        setProfileMessage(data.error || "Failed to save profile");
        return;
      }

      setProfileMessage("Profile saved.");
      tryPayment();
    } catch {
      setProfileMessage("Failed to save profile");
    } finally {
      setProfileSaving(false);
    }
  }

  useEffect(() => {
    if (requestStarted.current) {
      return;
    }

    requestStarted.current = true;
    tryPayment();
  }, [searchParams]);

  function submitPayHere() {
    if (!payment) {
      return;
    }

    const form = document.createElement("form");

    form.method = "POST";

    form.action = payment.action;

    Object.entries(payment.fields).forEach(([name, value]) => {
      const input = document.createElement("input");

      input.type = "hidden";
      input.name = name;
      input.value = value;

      form.appendChild(input);
    });

    document.body.appendChild(form);

    form.submit();
  }

  async function cancelBooking() {
    setError("");

    if (bookingId) {
      try {
        const response = await fetch("/api/bookings/cancel", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ bookingId }),
        });

        if (!response.ok) {
          const data = await response.json();
          setError(data.error || "Failed to cancel booking.");
          return;
        }
      } catch {
        setError("Network error. Please try again.");
        return;
      }
    }

    router.push("/player/find-booking");
  }

  if (loading) {
    return (
      <main className="flex min-h-screen items-center justify-center bg-gray-50 px-6">
        <div className="rounded-2xl bg-white p-8 text-center shadow-sm">
          <h1 className="text-xl font-semibold">Preparing payment...</h1>
          <p className="mt-2 text-sm text-gray-500">
            Checking availability and creating your booking.
          </p>
        </div>
      </main>
    );
  }

  if (step === "phone") {
    return (
      <main className="flex min-h-screen items-center justify-center bg-gray-50 px-6">
        <div className="w-full max-w-md rounded-2xl bg-white p-8 shadow-sm">
          <h1 className="text-2xl font-bold">Sign in to continue</h1>

          <p className="mt-2 text-gray-600">
            Enter your phone number to verify and proceed with payment.
          </p>

          <form onSubmit={sendOtp} className="mt-6 space-y-4">
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

          {error && (
            <p className="mt-4 rounded-lg bg-red-50 p-3 text-sm text-red-700">
              {error}
            </p>
          )}

          <a
            href="/player/find-booking"
            className="mt-4 block text-center text-sm text-gray-500"
          >
            Cancel
          </a>
        </div>
      </main>
    );
  }

  if (step === "otp") {
    return (
      <main className="flex min-h-screen items-center justify-center bg-gray-50 px-6">
        <div className="w-full max-w-md rounded-2xl bg-white p-8 shadow-sm">
          <h1 className="text-2xl font-bold">Verify OTP</h1>

          <p className="mt-2 text-gray-600">
            Enter the 6-digit code sent to {phone}.
          </p>

          <form onSubmit={verifyOtp} className="mt-6 space-y-4">
            <div>
              <label className="mb-2 block text-sm font-medium">OTP</label>

              <input
                type="text"
                inputMode="numeric"
                maxLength={6}
                value={otp}
                onChange={(event) => setOtp(event.target.value)}
                placeholder="123456"
                className="w-full rounded-lg border border-gray-300 px-4 py-3 text-center text-xl tracking-[0.5em] outline-none focus:border-black"
                required
              />
            </div>

            <button
              type="submit"
              disabled={otpLoading}
              className="w-full rounded-lg bg-black px-5 py-3 font-medium text-white disabled:opacity-50"
            >
              {otpLoading ? "Verifying..." : "Verify OTP"}
            </button>
          </form>

          {otpMessage && (
            <p className="mt-4 rounded-lg bg-gray-100 p-3 text-sm text-gray-700">
              {otpMessage}
            </p>
          )}

          {error && (
            <p className="mt-4 rounded-lg bg-red-50 p-3 text-sm text-red-700">
              {error}
            </p>
          )}

          <button
            type="button"
            onClick={() => {
              setStep("phone");
              setOtp("");
              setOtpMessage("");
              setError("");
            }}
            className="mt-4 block w-full text-center text-sm text-gray-600"
          >
            Change phone number
          </button>
        </div>
      </main>
    );
  }

  if (step === "profile") {
    return (
      <main className="flex min-h-screen items-center justify-center bg-gray-50 px-6">
        <div className="w-full max-w-md rounded-2xl bg-white p-8 shadow-sm">
          <h1 className="text-2xl font-bold">Complete your profile</h1>

          <p className="mt-2 text-gray-600">
            These details will be used for your booking and payment.
          </p>

          {profileLoading && (
            <p className="mt-4 text-sm text-gray-500">Loading profile...</p>
          )}

          <form onSubmit={saveProfile} className="mt-6 space-y-4">
            <div className="grid gap-4 sm:grid-cols-2">
              <div>
                <label className="mb-2 block text-sm font-medium">
                  First name
                </label>

                <input
                  type="text"
                  value={profile.firstName}
                  onChange={(event) =>
                    updateProfile("firstName", event.target.value)
                  }
                  className="w-full rounded-lg border border-gray-300 px-4 py-3 outline-none focus:border-black"
                  required
                />
              </div>

              <div>
                <label className="mb-2 block text-sm font-medium">
                  Last name
                </label>

                <input
                  type="text"
                  value={profile.lastName}
                  onChange={(event) =>
                    updateProfile("lastName", event.target.value)
                  }
                  className="w-full rounded-lg border border-gray-300 px-4 py-3 outline-none focus:border-black"
                  required
                />
              </div>
            </div>

            <div>
              <label className="mb-2 block text-sm font-medium">Email</label>

              <input
                type="email"
                value={profile.email}
                onChange={(event) =>
                  updateProfile("email", event.target.value)
                }
                className="w-full rounded-lg border border-gray-300 px-4 py-3 outline-none focus:border-black"
                required
              />
            </div>

            <div>
              <label className="mb-2 block text-sm font-medium">
                Address line 1
              </label>

              <input
                type="text"
                value={profile.addressLine1}
                onChange={(event) =>
                  updateProfile("addressLine1", event.target.value)
                }
                className="w-full rounded-lg border border-gray-300 px-4 py-3 outline-none focus:border-black"
                required
              />
            </div>

            <div>
              <label className="mb-2 block text-sm font-medium">
                Address line 2
              </label>

              <input
                type="text"
                value={profile.addressLine2}
                onChange={(event) =>
                  updateProfile("addressLine2", event.target.value)
                }
                className="w-full rounded-lg border border-gray-300 px-4 py-3 outline-none focus:border-black"
              />
            </div>

            <div className="grid gap-4 sm:grid-cols-2">
              <div>
                <label className="mb-2 block text-sm font-medium">City</label>

                <input
                  type="text"
                  value={profile.city}
                  onChange={(event) =>
                    updateProfile("city", event.target.value)
                  }
                  className="w-full rounded-lg border border-gray-300 px-4 py-3 outline-none focus:border-black"
                  required
                />
              </div>

              <div>
                <label className="mb-2 block text-sm font-medium">
                  Country
                </label>

                <input
                  type="text"
                  value={profile.country}
                  onChange={(event) =>
                    updateProfile("country", event.target.value)
                  }
                  className="w-full rounded-lg border border-gray-300 px-4 py-3 outline-none focus:border-black"
                  required
                />
              </div>
            </div>

            {profileMessage && (
              <div
                className={`rounded-lg p-3 text-sm ${
                  profileMessage.includes("saved")
                    ? "bg-green-50 text-green-700"
                    : "bg-red-50 text-red-700"
                }`}
              >
                {profileMessage}
              </div>
            )}

            <button
              type="submit"
              disabled={profileSaving}
              className="w-full rounded-lg bg-black px-5 py-3 font-medium text-white disabled:opacity-50"
            >
              {profileSaving ? "Saving..." : "Save & Continue"}
            </button>
          </form>

          {error && (
            <p className="mt-4 rounded-lg bg-red-50 p-3 text-sm text-red-700">
              {error}
            </p>
          )}

          <button
            type="button"
            onClick={cancelBooking}
            className="mt-4 block w-full text-center text-sm text-gray-500"
          >
            Cancel
          </button>
        </div>
      </main>
    );
  }

  // Payment step
  return (
    <main className="flex min-h-screen items-center justify-center bg-gray-50 px-6">
      <div className="w-full max-w-md rounded-2xl bg-white p-8 shadow-sm">
        <h1 className="text-2xl font-bold">Ready for payment</h1>

        <p className="mt-2 text-gray-600">
          Your selected booking is reserved while we prepare PayHere.
        </p>

        <button
          type="button"
          onClick={submitPayHere}
          className="mt-8 w-full rounded-lg bg-black px-5 py-3 font-medium text-white"
        >
          Continue to PayHere
        </button>

        <button
          type="button"
          onClick={cancelBooking}
          className="mt-4 block w-full text-center text-sm text-gray-500"
        >
          Cancel
        </button>

        {error && (
          <p className="mt-3 text-sm text-red-600">{error}</p>
        )}
      </div>
    </main>
  );
}

export default function CheckoutPage() {
  return (
    <Suspense
      fallback={
        <main className="flex min-h-screen items-center justify-center bg-gray-50 px-6">
          <div className="rounded-2xl bg-white p-8 text-center shadow-sm">
            <h1 className="text-xl font-semibold">Preparing payment...</h1>
            <p className="mt-2 text-sm text-gray-500">
              Checking availability and creating your booking.
            </p>
          </div>
        </main>
      }
    >
      <CheckoutContent />
    </Suspense>
  );
}
