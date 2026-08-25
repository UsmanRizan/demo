"use client";

import { Suspense, useEffect, useRef, useState } from "react";
import { useRouter, useSearchParams } from "next/navigation";

import SignInForm from "@/components/auth/SignInForm";
import OtpVerifyForm from "@/components/auth/OtpVerifyForm";
import ProfileForm from "@/components/auth/ProfileForm";
import type { ProfileData } from "@/components/auth/ProfileForm";
import PaymentButton from "@/components/PaymentButton";

type Step = "phone" | "otp" | "profile" | "payment-method" | "payment";

function CheckoutContent() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const requestStarted = useRef(false);

  const [step, setStep] = useState<Step>("phone");

  const [otpPhone, setOtpPhone] = useState("");

  const [otpMessage, setOtpMessage] = useState("");
  const [otpLoading, setOtpLoading] = useState(false);

  const [passwordMessage, setPasswordMessage] = useState("");
  const [passwordLoading, setPasswordLoading] = useState(false);

  const [profile, setProfile] = useState<ProfileData>({
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
  const [bookingTotal, setBookingTotal] = useState<string | null>(null);

  const [walletBalance, setWalletBalance] = useState<string | null>(null);
  const [walletLoading, setWalletLoading] = useState(false);
  const [walletPaymentLoading, setWalletPaymentLoading] = useState(false);
  const [walletError, setWalletError] = useState("");

  const [error, setError] = useState("");

  const [loading, setLoading] = useState(true);

  function updateProfile(field: string, value: string) {
    setProfile((prev) => ({ ...prev, [field]: value }));
  }

  async function loadWalletBalance() {
    setWalletLoading(true);
    try {
      const response = await fetch("/api/player/wallet");
      const data = await response.json();
      if (response.ok) {
        setWalletBalance(data.balance);
      }
    } catch {
      // Silently fail - wallet balance will be null
    } finally {
      setWalletLoading(false);
    }
  }

  async function tryPayment() {
    const booking = {
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
        headers: { "Content-Type": "application/json" },
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
      setBookingTotal(
        data.payment?.fields?.amount || data.totalPrice || null
      );
      setPayment(data.payment);
      setStep("payment-method");
      loadWalletBalance();
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

  async function handlePasswordLogin(phone: string, password: string) {
    setPasswordLoading(true);
    setPasswordMessage("");
    setError("");

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

      tryPayment();
    } catch {
      setPasswordMessage("Something went wrong.");
    } finally {
      setPasswordLoading(false);
    }
  }

  async function handleSendOtp(phone: string) {
    setOtpPhone(phone);
    setOtpLoading(true);
    setOtpMessage("");
    setError("");

    try {
      const response = await fetch("/api/auth/send-otp", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
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

  async function handleVerifyOtp(phone: string, code: string) {
    setOtpLoading(true);
    setOtpMessage("");
    setError("");

    try {
      const response = await fetch("/api/auth/verify-otp", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ phone, code }),
      });

      const data = await response.json();

      if (!response.ok) {
        setOtpMessage(data.error || "Invalid OTP");
        return;
      }

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
        headers: { "Content-Type": "application/json" },
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

  async function handleWalletPayment() {
    if (!bookingId) return;

    setWalletPaymentLoading(true);
    setWalletError("");
    setError("");

    try {
      const response = await fetch("/api/payments/wallet/create", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ bookingId }),
      });

      const data = await response.json();

      if (!response.ok) {
        setWalletError(data.error || "Failed to process wallet payment.");
        setWalletPaymentLoading(false);
        return;
      }

      router.push(`/player/payment/success?bookingId=${bookingId}`);
    } catch {
      setWalletError("Network error. Please try again.");
      setWalletPaymentLoading(false);
    }
  }

  function formatCurrency(value: string | number) {
    const num = typeof value === "string" ? Number(value) : value;
    return `Rs. ${num.toLocaleString("en-LK")}`;
  }

  if (loading) {
    return (
      <main className="flex min-h-screen items-center justify-center bg-gradient-to-br from-slate-50 via-indigo-50/30 to-purple-50/20 px-4 sm:px-6">
        <div className="w-full max-w-md rounded-2xl border border-slate-200 bg-white p-8 text-center shadow-xl shadow-slate-200/50">
          <div className="mx-auto flex h-12 w-12 items-center justify-center">
            <svg className="spinner h-8 w-8 text-indigo-600" viewBox="0 0 24 24" fill="none">
              <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
              <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z" />
            </svg>
          </div>
          <h1 className="mt-4 text-lg font-semibold text-slate-900">Preparing payment...</h1>
          <p className="mt-2 text-sm text-slate-500">
            Checking availability and creating your booking.
          </p>
        </div>
      </main>
    );
  }

  if (step === "phone") {
    return (
      <SignInForm
        onPasswordLogin={handlePasswordLogin}
        onSendOtp={handleSendOtp}
        onCancel={() => router.push("/player/find-booking")}
        passwordLoading={passwordLoading}
        otpLoading={otpLoading}
        passwordMessage={passwordMessage}
        otpMessage={otpMessage}
        error={error}
      />
    );
  }

  if (step === "otp") {
    return (
      <OtpVerifyForm
        phone={otpPhone}
        onVerify={handleVerifyOtp}
        onChangePhone={() => {
          setStep("phone");
          setOtpMessage("");
          setError("");
        }}
        loading={otpLoading}
        message={otpMessage}
        error={error}
      />
    );
  }

  if (step === "profile") {
    return (
      <ProfileForm
        profile={profile}
        onFieldChange={updateProfile}
        onSave={saveProfile}
        onCancel={cancelBooking}
        loading={profileLoading}
        saving={profileSaving}
        message={profileMessage}
        error={error}
      />
    );
  }

  if (step === "payment-method") {
    const balance = walletBalance ? Number(walletBalance) : 0;
    const total = bookingTotal ? Number(bookingTotal) : 0;
    const canPayWithWallet = balance >= total && total > 0;

    return (
      <main className="flex min-h-screen items-center justify-center bg-gradient-to-br from-slate-50 via-indigo-50/30 to-purple-50/20 px-4 sm:px-6">
        <div className="w-full max-w-md">
          {/* Brand */}
          <div className="mb-8 text-center">
            <a href="/" className="inline-flex items-center gap-2.5">
              <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-indigo-600 text-lg font-bold text-white">
                B
              </div>
              <span className="text-2xl font-bold text-slate-900">BookMyPlay</span>
            </a>
          </div>

          <div className="rounded-2xl border border-slate-200 bg-white p-6 shadow-xl shadow-slate-200/50 sm:p-8">
            <h1 className="text-xl font-semibold text-slate-900">Choose payment method</h1>

            <p className="mt-1 text-sm text-slate-500">
              Select how you&apos;d like to pay for your booking.
            </p>

            {bookingTotal && (
              <div className="mt-4 rounded-xl bg-slate-50 p-4">
                <p className="text-xs font-medium text-slate-500">Booking total</p>
                <p className="mt-0.5 text-2xl font-bold text-slate-900">{formatCurrency(bookingTotal)}</p>
              </div>
            )}

            <div className="mt-5 space-y-3">
              {/* Wallet Option */}
              <button
                type="button"
                disabled={!canPayWithWallet || walletPaymentLoading}
                onClick={handleWalletPayment}
                className={`w-full rounded-xl border-2 p-4 text-left transition ${
                  canPayWithWallet
                    ? "border-emerald-200 hover:border-emerald-400 hover:bg-emerald-50/50"
                    : "cursor-not-allowed border-slate-100 bg-slate-50 opacity-60"
                }`}
              >
                <div className="flex items-center justify-between">
                  <div>
                    <p className="font-semibold text-slate-900">Pay with Wallet</p>
                    <p className="mt-0.5 text-sm text-slate-500">
                      {walletLoading
                        ? "Loading balance..."
                        : `Balance: ${walletBalance !== null ? formatCurrency(walletBalance) : "Rs. 0"}`}
                    </p>
                  </div>
                  <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-emerald-50 text-lg">
                    💰
                  </div>
                </div>
                {!canPayWithWallet && !walletLoading && total > 0 && (
                  <p className="mt-2 text-xs text-red-500">
                    Insufficient balance. You need {formatCurrency(total)} but have{" "}
                    {formatCurrency(balance)}.
                  </p>
                )}
              </button>

              {/* Card / PayHere Option */}
              <button
                type="button"
                disabled={walletPaymentLoading}
                onClick={() => setStep("payment")}
                className="w-full rounded-xl border-2 border-slate-200 p-4 text-left transition hover:border-indigo-300 hover:bg-indigo-50/30"
              >
                <div className="flex items-center justify-between">
                  <div>
                    <p className="font-semibold text-slate-900">Pay with Card</p>
                    <p className="mt-0.5 text-sm text-slate-500">
                      Credit/debit card via PayHere
                    </p>
                  </div>
                  <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-indigo-50 text-lg">
                    💳
                  </div>
                </div>
              </button>
            </div>

            {walletError && (
              <p className="mt-3 rounded-lg bg-red-50 p-3 text-sm text-red-600">{walletError}</p>
            )}

            {error && (
              <p className="mt-3 rounded-lg bg-red-50 p-3 text-sm text-red-600">{error}</p>
            )}

            <button
              type="button"
              onClick={cancelBooking}
              className="mt-4 block w-full text-center text-sm text-slate-500 hover:text-slate-700"
            >
              Cancel booking
            </button>
          </div>
        </div>
      </main>
    );
  }

  if (step === "payment" && payment) {
    return (
      <PaymentButton
        action={payment.action}
        fields={payment.fields}
        onCancel={cancelBooking}
        error={error}
      />
    );
  }

  return (
    <main className="flex min-h-screen items-center justify-center bg-gradient-to-br from-slate-50 via-indigo-50/30 to-purple-50/20 px-4 sm:px-6">
      <div className="w-full max-w-md rounded-2xl border border-slate-200 bg-white p-8 text-center shadow-xl shadow-slate-200/50">
        <h1 className="text-lg font-semibold text-slate-900">Something went wrong</h1>
        <p className="mt-2 text-sm text-slate-500">
          Please try again.
        </p>
        <a
          href="/player/find-booking"
          className="mt-4 inline-flex items-center rounded-xl bg-indigo-600 px-5 py-3 text-sm font-semibold text-white transition-all hover:bg-indigo-700"
        >
          Find a Court
        </a>
      </div>
    </main>
  );
}

export default function CheckoutPage() {
  return (
    <Suspense
      fallback={
        <main className="flex min-h-screen items-center justify-center bg-gradient-to-br from-slate-50 via-indigo-50/30 to-purple-50/20 px-4 sm:px-6">
          <div className="w-full max-w-md rounded-2xl border border-slate-200 bg-white p-8 text-center shadow-xl shadow-slate-200/50">
            <div className="mx-auto flex h-12 w-12 items-center justify-center">
              <svg className="spinner h-8 w-8 text-indigo-600" viewBox="0 0 24 24" fill="none">
                <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
                <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z" />
              </svg>
            </div>
            <h1 className="mt-4 text-lg font-semibold text-slate-900">Preparing payment...</h1>
            <p className="mt-2 text-sm text-slate-500">
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
