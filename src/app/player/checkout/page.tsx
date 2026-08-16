"use client";

import { useEffect, useRef, useState } from "react";
import { useSearchParams } from "next/navigation";

type BookingInfo = {
  facilityId: string;
  date: string;
  startTime: string;
  endTime: string;
};

export default function CheckoutPage() {
  const searchParams = useSearchParams();
  const requestStarted = useRef(false);

  const [payment, setPayment] = useState<{
    action: string;
    fields: Record<string, string>;
  } | null>(null);

  const [error, setError] = useState("");

  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (requestStarted.current) {
      return;
    }

    requestStarted.current = true;

    async function createPayment() {
      // existing code
    }

    createPayment();
  }, [searchParams]);

  useEffect(() => {
    async function createPayment() {
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
          setError(data.error || "Unable to start payment");
          return;
        }

        setPayment(data.payment);
      } catch {
        setError("Unable to start payment");
      } finally {
        setLoading(false);
      }
    }

    createPayment();
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

  if (error) {
    return (
      <main className="flex min-h-screen items-center justify-center bg-gray-50 px-6">
        <div className="w-full max-w-md rounded-2xl bg-white p-8 shadow-sm">
          <h1 className="text-xl font-semibold text-red-600">
            Payment unavailable
          </h1>

          <p className="mt-3 text-gray-600">{error}</p>

          <a
            href="/player/find-booking"
            className="mt-6 inline-block rounded-lg bg-black px-5 py-3 text-sm font-medium text-white"
          >
            Find another booking
          </a>
        </div>
      </main>
    );
  }

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
