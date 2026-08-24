"use client";

import { Suspense, useEffect, useRef, useState } from "react";
import { useRouter, useSearchParams } from "next/navigation";

import SignInForm from "@/components/auth/SignInForm";
import OtpVerifyForm from "@/components/auth/OtpVerifyForm";
import ProfileForm from "@/components/auth/ProfileForm";
import type { ProfileData } from "@/components/auth/ProfileForm";
import PaymentButton from "@/components/PaymentButton";

type Step = "phone" | "otp" | "profile" | "payment";

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

  const [error, setError] = useState("");

  const [loading, setLoading] = useState(true);

  function updateProfile(field: string, value: string) {
    setProfile((prev) => ({ ...prev, [field]: value }));
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

  if (loading) {
    return (
      <main className="flex min-h-screen items-center justify-center bg-gray-50 px-4 sm:px-6">
        <div className="rounded-2xl bg-white p-6 text-center shadow-sm sm:p-8">
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
    <main className="flex min-h-screen items-center justify-center bg-gray-50 px-4 sm:px-6">
      <div className="rounded-2xl bg-white p-6 text-center shadow-sm sm:p-8">
        <h1 className="text-xl font-semibold">Something went wrong</h1>
        <p className="mt-2 text-sm text-gray-500">
          Please try again.
        </p>
        <a
          href="/player/find-booking"
          className="mt-4 inline-block rounded-lg bg-black px-5 py-3 text-sm font-medium text-white"
        >
          Find a Booking
        </a>
      </div>
    </main>
  );
}

export default function CheckoutPage() {
  return (
    <Suspense
      fallback={
        <main className="flex min-h-screen items-center justify-center bg-gray-50 px-4 sm:px-6">
          <div className="rounded-2xl bg-white p-6 text-center shadow-sm sm:p-8">
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
