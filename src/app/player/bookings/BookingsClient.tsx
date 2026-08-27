"use client";

import { useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import { getSportIcon } from "@/lib/sport-icons";

type Facility = {
  id: string;
  name: string;
  price: string;
  sports: { name: string }[];
  location: { name: string; address: string; city: string; latitude: number | null; longitude: number | null };
};

type Booking = {
  id: string;
  startAt: string;
  endAt: string;
  totalPrice: string;
  status: string;
  paymentStatus: string;
  paymentMethod: string | null;
  orderId: string | null;
  createdAt: string;
  facility: Facility;
};

type BookingsClientProps = {
  initialBookings: Booking[];
};

type FilterTab = "all" | "upcoming" | "past" | "cancelled";

const FILTER_TABS: { id: FilterTab; label: string }[] = [
  { id: "all", label: "All" },
  { id: "upcoming", label: "Upcoming" },
  { id: "past", label: "Past" },
  { id: "cancelled", label: "Cancelled" },
];

const STATUS_BADGE: Record<string, { label: string; className: string }> = {
  PENDING: {
    label: "Awaiting payment",
    className: "bg-amber-50 text-amber-700 border-amber-200",
  },
  CONFIRMED: {
    label: "Confirmed",
    className: "bg-emerald-50 text-emerald-700 border-emerald-200",
  },
  CANCELLED: {
    label: "Cancelled",
    className: "bg-slate-50 text-slate-500 border-slate-200",
  },
  COMPLETED: {
    label: "Completed",
    className: "bg-blue-50 text-blue-700 border-blue-200",
  },
};

const PAYMENT_BADGE: Record<string, { label: string; className: string }> = {
  PENDING: { label: "Payment pending", className: "bg-amber-50 text-amber-700 border-amber-200" },
  PAID: { label: "Paid", className: "bg-emerald-50 text-emerald-700 border-emerald-200" },
  FAILED: { label: "Payment failed", className: "bg-red-50 text-red-600 border-red-200" },
  CANCELLED: { label: "Payment cancelled", className: "bg-slate-50 text-slate-500 border-slate-200" },
  CHARGEBACK: { label: "Chargeback", className: "bg-red-50 text-red-600 border-red-200" },
};

function formatCurrency(value: string | number) {
  const num = typeof value === "string" ? Number(value) : value;
  return `Rs. ${num.toLocaleString("en-LK")}`;
}

function formatDateTime(date: Date) {
  return new Intl.DateTimeFormat("en-LK", {
    dateStyle: "medium",
    timeStyle: "short",
    timeZone: "Asia/Colombo",
  }).format(date);
}

function isUpcoming(booking: Booking, now: Date): boolean {
  return (
    (booking.status === "PENDING" || booking.status === "CONFIRMED") &&
    new Date(booking.startAt) > now
  );
}

function isPast(booking: Booking, now: Date): boolean {
  return new Date(booking.endAt) < now;
}

export default function BookingsClient({
  initialBookings,
}: BookingsClientProps) {
  const router = useRouter();

  const [activeFilter, setActiveFilter] = useState<FilterTab>("upcoming");
  const [cancellingId, setCancellingId] = useState<string | null>(null);
  const [cancelError, setCancelError] = useState("");
  const [cancelConfirmId, setCancelConfirmId] = useState<string | null>(null);

  const CANCEL_WINDOW_HOURS = 8;

  function canCancelBooking(booking: Booking, now: Date): boolean {
    if (booking.status !== "PENDING" && booking.status !== "CONFIRMED") {
      return false;
    }
    const hoursUntilStart =
      (new Date(booking.startAt).getTime() - now.getTime()) / (1000 * 60 * 60);
    return hoursUntilStart >= CANCEL_WINDOW_HOURS;
  }

  const now = useMemo(() => new Date(), []);

  const filteredBookings = useMemo(() => {
    if (activeFilter === "all") return initialBookings;
    if (activeFilter === "upcoming") return initialBookings.filter((b) => isUpcoming(b, now));
    if (activeFilter === "past") return initialBookings.filter((b) => isPast(b, now));
    if (activeFilter === "cancelled")
      return initialBookings.filter((b) => b.status === "CANCELLED");
    return initialBookings;
  }, [activeFilter, initialBookings, now]);

  const tabCounts = useMemo(() => ({
    all: initialBookings.length,
    upcoming: initialBookings.filter((b) => isUpcoming(b, now)).length,
    past: initialBookings.filter((b) => isPast(b, now)).length,
    cancelled: initialBookings.filter((b) => b.status === "CANCELLED").length,
  }), [initialBookings, now]);

  const [cancelSuccess, setCancelSuccess] = useState("");

  async function handleCancel(bookingId: string) {
    setCancellingId(bookingId);
    setCancelError("");
    setCancelSuccess("");

    try {
      const response = await fetch("/api/bookings/cancel", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ bookingId }),
      });

      const data = await response.json();

      if (!response.ok) {
        setCancelError(data.error || "Failed to cancel booking.");
        return;
      }

      if (data.walletCredited) {
        setCancelSuccess(`Rs. ${data.refundAmount} has been credited to your wallet.`);
      } else {
        setCancelSuccess("Booking cancelled successfully.");
      }

      router.refresh();
    } catch {
      setCancelError("Network error. Please try again.");
    } finally {
      setCancellingId(null);
      setCancelConfirmId(null);
    }
  }

  return (
    <div>
      {/* Filter tabs */}
      <div className="flex gap-2 border-b border-gray-200">
        {FILTER_TABS.map((tab) => (
          <button
            key={tab.id}
            type="button"
            onClick={() => setActiveFilter(tab.id)}
            className={`px-4 py-2 text-sm font-medium transition ${
              activeFilter === tab.id
                ? "border-b-2 border-black text-black"
                : "text-gray-500 hover:text-gray-700"
            }`}
          >
            {tab.label}
            <span className="ml-1.5 text-xs text-gray-400">
              ({tabCounts[tab.id]})
            </span>
          </button>
        ))}
      </div>

      {cancelError && (
        <div className="mt-6 rounded-xl bg-red-50 p-4 text-sm text-red-700">
          {cancelError}
        </div>
      )}

      {cancelSuccess && (
        <div className="mt-6 rounded-xl bg-green-50 p-4 text-sm text-green-700">
          {cancelSuccess}
        </div>
      )}              {filteredBookings.length === 0 ? (
        <div className="mt-8 rounded-2xl border border-slate-200 bg-white p-8 text-center shadow-sm">
          <p className="text-slate-500">No bookings found for this filter.</p>
          <a
            href="/player/find-booking"
            className="mt-4 inline-block rounded-lg bg-black px-5 py-3 text-sm font-medium text-white"
          >
            Find a Booking
          </a>
        </div>
      ) : (
        <div className="mt-6 space-y-4">
          {filteredBookings.map((booking) => {
            const statusBadge = STATUS_BADGE[booking.status] || STATUS_BADGE.PENDING;
            const paymentBadge = PAYMENT_BADGE[booking.paymentStatus] || PAYMENT_BADGE.PENDING;
            const canCancel = canCancelBooking(booking, now) && cancellingId !== booking.id;
            const showConfirm = cancelConfirmId === booking.id;
            const isPaidBooking = booking.paymentStatus === "PAID";

            return (
              <div
                key={booking.id}
                className="rounded-2xl bg-white p-6 shadow-sm"
              >
                <div className="flex flex-col gap-4 sm:flex-row sm:items-start sm:justify-between">
                  <div className="flex-1">
                    <div className="flex flex-wrap items-center gap-2">
                      <h3 className="text-lg font-semibold">
                        {booking.facility.name}
                      </h3>

                      <span
                        className={`rounded-full border px-2.5 py-0.5 text-xs font-medium ${statusBadge.className}`}
                      >
                        {statusBadge.label}
                      </span>

                      <span
                        className={`rounded-full border px-2.5 py-0.5 text-xs font-medium ${paymentBadge.className}`}
                      >
                        {paymentBadge.label}
                      </span>
                    </div>

                    <div className="mt-2 text-sm text-gray-600">
                      <p>{booking.facility.sports.map((s) => `${getSportIcon(s.name)} ${s.name}`).join(", ")}</p>
                      <p>{booking.facility.location.name}</p>
                      <p className="text-gray-500">
                        {booking.facility.location.address}, {booking.facility.location.city}
                      </p>

                      {booking.facility.location.latitude !== null && booking.facility.location.longitude !== null && (
                        <a
                          href={`https://www.google.com/maps/search/?api=1&query=${booking.facility.location.latitude},${booking.facility.location.longitude}`}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="mt-2 inline-flex items-center gap-1.5 rounded-full border border-slate-200 px-3 py-1 text-xs font-medium text-indigo-600 transition hover:border-indigo-300 hover:bg-indigo-50"
                        >
                          <svg className="h-3.5 w-3.5" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                            <path d="M21 10c0 7-9 13-9 13s-9-6-9-13a9 9 0 0118 0z" />
                            <circle cx="12" cy="10" r="3" />
                          </svg>
                          Open in Maps
                        </a>
                      )}
                    </div>

                    <div className="mt-3 text-sm">
                      <p className="font-medium">
                        {formatDateTime(new Date(booking.startAt))}
                      </p>
                      <p className="text-gray-500">
                        to {formatDateTime(new Date(booking.endAt))}
                      </p>
                    </div>

                    {booking.orderId && (
                      <p className="mt-2 text-xs text-gray-400">
                        Order: {booking.orderId}
                      </p>
                    )}
                  </div>

                  <div className="flex flex-col items-start gap-3 sm:items-end">
                    <p className="text-2xl font-bold">
                      {formatCurrency(booking.totalPrice)}
                    </p>

                    {canCancel && (
                      <button
                        type="button"
                        onClick={() => setCancelConfirmId(booking.id)}
                        className="rounded-lg border border-red-300 px-4 py-2 text-sm font-medium text-red-600 hover:bg-red-50"
                      >
                        Cancel booking
                      </button>
                    )}

                    {!canCancel && isUpcoming(booking, now) && booking.status !== "CANCELLED" && (
                      <p className="text-xs text-gray-400">
                        Cannot cancel within {CANCEL_WINDOW_HOURS} hours of start
                      </p>
                    )}

                    {showConfirm && (
                      <div className="rounded-xl border border-red-200 bg-red-50 p-4">
                        <p className="text-sm text-red-800">
                          Are you sure you want to cancel this booking?
                        </p>
                        {isPaidBooking && (
                          <p className="mt-1 text-xs text-gray-600">
                            Rs. {formatCurrency(booking.totalPrice).replace("Rs. ", "")} will be credited to your wallet for future bookings.
                          </p>
                        )}
                        <div className="mt-3 flex gap-2">
                          <button
                            type="button"
                            disabled={cancellingId === booking.id}
                            onClick={() => handleCancel(booking.id)}
                            className="rounded-lg bg-red-600 px-4 py-2 text-sm font-medium text-white disabled:opacity-50"
                          >
                            {cancellingId === booking.id ? "Cancelling..." : "Yes, cancel"}
                          </button>
                          <button
                            type="button"
                            disabled={cancellingId === booking.id}
                            onClick={() => setCancelConfirmId(null)}
                            className="rounded-lg border border-gray-300 px-4 py-2 text-sm font-medium"
                          >
                            Keep booking
                          </button>
                        </div>
                      </div>
                    )}
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}
